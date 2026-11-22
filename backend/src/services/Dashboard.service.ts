import { PipelineStage } from "mongoose";
import {
  BookingStatus,
  CamperStatus,
  InquiryStatus,
  MemberRole,
  MemberStatus,
  PaymentStatus,
} from "../constants/enums";
import { Booking } from "../interfaces/booking.interface";
import { Member } from "../interfaces/member.interface";
import { BookingModel, CamperModel, ContactInquiryModel, MemberModel, PaymentModel } from "../models";
import { addDays, BUSINESS_TIMEZONE, DAY_MS, formatDateOnly, nightsBetween, todayInBusinessTimezone } from "../utils/dates";
import { ACTIVITY_TYPES, ActivityQuery, ActivityType, DashboardRangeQuery } from "../validators/dashboard.validator";

/*
 * All figures are aggregated from live records; nothing is cached or
 * hard-coded. Revenue = captured amount minus refunds. Date ranges are Korean
 * calendar days (Korea has no daylight saving, so the offset is a constant +9h).
 */

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
/** UTC-midnight calendar date -> the real instant that day starts in Korea. */
const startOfKoreanDay = (date: Date): Date => new Date(date.getTime() - KST_OFFSET_MS);

const REVENUE_PAYMENT_STATUSES = [PaymentStatus.PAID, PaymentStatus.PARTIALLY_REFUNDED, PaymentStatus.REFUNDED];
const BOOKED_STATUSES = [BookingStatus.CONFIRMED, BookingStatus.ACTIVE, BookingStatus.COMPLETED];

type Interval = DashboardRangeQuery["interval"];

export interface SeriesPoint {
  period: string;
  [metric: string]: number | string;
}

interface ResolvedRange {
  from: Date;
  to: Date;
  fromInstant: Date;
  toInstant: Date;
}

/** Calendar range as shown to clients: both ends inclusive. */
export interface RangeInfo {
  from: string;
  to: string;
  days: number;
}

/** Figures that depend on the selected period, so they can be compared with the previous one. */
export interface PeriodMetrics {
  /** Net captured revenue (amount - refunds) of payments captured in the period. */
  revenue: number;
  /** Bookings created in the period, by their current status. */
  bookings: { total: number; byStatus: Record<BookingStatus, number> };
  /** Confirmed/active/completed bookings created in the period and their combined booking value (not revenue). */
  bookedCount: number;
  bookedValue: number;
  averageBookingValue: number | null;
  /** Cancelled after being confirmed / ever confirmed. Unpaid holds that expired are counted separately. */
  cancellationRate: number | null;
  cancelledAfterConfirmation: number;
  expiredUnpaid: number;
  rejected: number;
  newCustomers: number;
  /** Booked nights inside the period / (non-archived fleet size x days). */
  occupancyRate: number | null;
  bookedNights: number;
  fleetSize: number;
}

export interface ActivityItem {
  type: ActivityType;
  at: Date;
  actor: { _id: string; firstName: string; lastName: string; role: MemberRole } | null;
  status?: BookingStatus;
  reason?: string;
  amount?: number;
  currency?: string;
  bookingId?: string;
  bookingNumber?: string;
  paymentId?: string;
  orderId?: string;
  customerId?: string;
}

/** Nights of a booking that fall inside [from, to) (both UTC-midnight calendar days). */
const overlapNights = (from: Date, to: Date) => ({
  $divide: [{ $subtract: [{ $min: ["$endDate", to] }, { $max: ["$startDate", from] }] }, DAY_MS],
});

const netAmount = { $subtract: ["$amount", "$refundedAmount"] };

class DashboardService {
  public async overview() {
    const today = todayInBusinessTimezone();
    const last30 = startOfKoreanDay(addDays(today, -29));

    const [
      revenue,
      revenueLast30Days,
      bookingStatusCounts,
      averageBooking,
      totalCustomers,
      newCustomersLast30Days,
      camperStatusCounts,
      openInquiries,
      recentBookings,
      recentCustomers,
      upcomingReservations,
    ] = await Promise.all([
      this.netRevenue({}),
      this.netRevenue({ paidAt: { $gte: last30 } }),
      BookingModel.aggregate<{ _id: BookingStatus; count: number }>([{ $group: { _id: "$status", count: { $sum: 1 } } }]).exec(),
      BookingModel.aggregate<{ average: number }>([
        { $match: { status: { $in: BOOKED_STATUSES } } },
        { $group: { _id: null, average: { $avg: "$price.total" } } },
      ]).exec(),
      MemberModel.countDocuments({ role: MemberRole.CUSTOMER, status: { $ne: MemberStatus.DELETED } }).exec(),
      MemberModel.countDocuments({ role: MemberRole.CUSTOMER, createdAt: { $gte: last30 } }).exec(),
      CamperModel.aggregate<{ _id: CamperStatus; count: number }>([{ $group: { _id: "$status", count: { $sum: 1 } } }]).exec(),
      ContactInquiryModel.countDocuments({ status: { $ne: InquiryStatus.RESOLVED } }).exec(),
      BookingModel.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .populate("camper", "name slug")
        .populate("customer", "firstName lastName email")
        .lean<Booking[]>()
        .exec(),
      MemberModel.find({ role: MemberRole.CUSTOMER }).sort({ createdAt: -1 }).limit(5).lean<Member[]>().exec(),
      BookingModel.find({ status: BookingStatus.CONFIRMED, startDate: { $gte: today } })
        .sort({ startDate: 1 })
        .limit(10)
        .populate("camper", "name slug")
        .populate("customer", "firstName lastName email phone")
        .lean<Booking[]>()
        .exec(),
    ]);

    const bookingsByStatus = this.countsByStatus(Object.values(BookingStatus), bookingStatusCounts);
    const campersByStatus = this.countsByStatus(Object.values(CamperStatus), camperStatusCounts);

    return {
      revenue: { total: revenue, last30Days: revenueLast30Days, currency: "KRW" },
      bookings: {
        total: Object.values(bookingsByStatus).reduce((sum, count) => sum + count, 0),
        byStatus: bookingsByStatus,
        averageValue: Math.round(averageBooking[0]?.average ?? 0),
      },
      customers: { total: totalCustomers, newLast30Days: newCustomersLast30Days },
      campers: {
        total: Object.entries(campersByStatus)
          .filter(([status]) => status !== CamperStatus.ARCHIVED)
          .reduce((sum, [, count]) => sum + count, 0),
        byStatus: campersByStatus,
      },
      openInquiries,
      recentBookings,
      recentCustomers,
      upcomingReservations,
    };
  }

  /** Net revenue per period, bucketed by the day the payment was captured. */
  public async revenueSeries(query: DashboardRangeQuery): Promise<SeriesPoint[]> {
    const range = this.resolveRange(query);
    const rows = await PaymentModel.aggregate<{ _id: string; revenue: number; payments: number; refunded: number }>([
      { $match: { status: { $in: REVENUE_PAYMENT_STATUSES }, paidAt: { $gte: range.fromInstant, $lt: range.toInstant } } },
      {
        $group: {
          _id: this.periodKey("$paidAt", query.interval),
          revenue: { $sum: { $subtract: ["$amount", "$refundedAmount"] } },
          refunded: { $sum: "$refundedAmount" },
          payments: { $sum: 1 },
        },
      },
    ]).exec();
    return this.fillSeries(range, query.interval, rows, { revenue: 0, refunded: 0, payments: 0 });
  }

  /** Bookings created per period, split by how they ended up. */
  public async bookingSeries(query: DashboardRangeQuery): Promise<SeriesPoint[]> {
    const range = this.resolveRange(query);
    const rows = await BookingModel.aggregate<{ _id: string; bookings: number; confirmed: number; cancelled: number; value: number }>([
      { $match: { createdAt: { $gte: range.fromInstant, $lt: range.toInstant } } },
      {
        $group: {
          _id: this.periodKey("$createdAt", query.interval),
          bookings: { $sum: 1 },
          confirmed: { $sum: { $cond: [{ $in: ["$status", BOOKED_STATUSES] }, 1, 0] } },
          cancelled: { $sum: { $cond: [{ $in: ["$status", [BookingStatus.CANCELLED, BookingStatus.REJECTED]] }, 1, 0] } },
          value: { $sum: { $cond: [{ $in: ["$status", BOOKED_STATUSES] }, "$price.total", 0] } },
        },
      },
    ]).exec();
    return this.fillSeries(range, query.interval, rows, { bookings: 0, confirmed: 0, cancelled: 0, value: 0 });
  }

  /** Campers ranked by booked revenue (confirmed, active and completed bookings) in the range. */
  public async topCampers(query: DashboardRangeQuery) {
    const range = this.resolveRange(query);
    const pipeline: PipelineStage[] = [
      { $match: { status: { $in: BOOKED_STATUSES }, createdAt: { $gte: range.fromInstant, $lt: range.toInstant } } },
      { $group: { _id: "$camper", revenue: { $sum: "$price.total" }, bookings: { $sum: 1 }, nights: { $sum: "$nights" } } },
      { $sort: { revenue: -1, bookings: -1 } },
      { $limit: query.limit },
      { $lookup: { from: "campers", localField: "_id", foreignField: "_id", as: "camper" } },
      { $unwind: "$camper" },
      {
        $project: {
          _id: 0,
          camperId: "$_id",
          name: "$camper.name",
          slug: "$camper.slug",
          image: { $arrayElemAt: ["$camper.images.url", 0] },
          ratingAverage: "$camper.ratingAverage",
          revenue: 1,
          bookings: 1,
          nights: 1,
        },
      },
    ];
    return BookingModel.aggregate(pipeline).exec();
  }

  /**
   * KPI figures for the selected range, the same figures for the
   * immediately preceding range of equal length, and a snapshot of the
   * current state (which has no history, so no comparison).
   */
  public async kpis(query: DashboardRangeQuery) {
    const range = this.resolveRange(query);
    const previous = this.previousRange(range);
    const [current, previousMetrics, snapshot] = await Promise.all([
      this.periodMetrics(range),
      this.periodMetrics(previous),
      this.snapshot(),
    ]);
    return {
      currency: "KRW",
      range: this.rangeInfo(range),
      previousRange: this.rangeInfo(previous),
      current,
      previous: previousMetrics,
      snapshot,
    };
  }

  /** Per-camper utilisation and collected revenue in the range, plus today's occupancy. */
  public async fleetPerformance(query: DashboardRangeQuery) {
    const range = this.resolveRange(query);
    const days = nightsBetween(range.from, range.to);
    const today = todayInBusinessTimezone();

    const [campers, revenueRows] = await Promise.all([
      CamperModel.aggregate<{
        camperId: string;
        name: string;
        slug: string;
        status: CamperStatus;
        image?: string;
        region?: string;
        dailyRate: number;
        ratingAverage: number;
        bookings: number;
        bookedNights: number;
        occupiedToday: boolean;
      }>([
        { $match: { status: { $ne: CamperStatus.ARCHIVED } } },
        {
          $lookup: {
            from: BookingModel.collection.name,
            localField: "_id",
            foreignField: "camper",
            pipeline: [
              { $match: { status: { $in: BOOKED_STATUSES }, startDate: { $lt: range.to }, endDate: { $gt: range.from } } },
              { $project: { _id: 0, nights: overlapNights(range.from, range.to) } },
            ],
            as: "stays",
          },
        },
        {
          $lookup: {
            from: BookingModel.collection.name,
            localField: "_id",
            foreignField: "camper",
            pipeline: [
              {
                $match: {
                  status: { $in: [BookingStatus.CONFIRMED, BookingStatus.ACTIVE] },
                  startDate: { $lte: today },
                  endDate: { $gt: today },
                },
              },
              { $limit: 1 },
              { $project: { _id: 1 } },
            ],
            as: "current",
          },
        },
        {
          $project: {
            _id: 0,
            camperId: "$_id",
            name: 1,
            slug: 1,
            status: 1,
            image: { $arrayElemAt: ["$images.url", 0] },
            region: "$location.region",
            dailyRate: "$pricing.dailyRate",
            ratingAverage: 1,
            bookings: { $size: "$stays" },
            bookedNights: { $sum: "$stays.nights" },
            occupiedToday: { $gt: [{ $size: "$current" }, 0] },
          },
        },
        { $sort: { bookedNights: -1, name: 1 } },
        { $limit: 200 },
      ]).exec(),
      PaymentModel.aggregate<{ _id: unknown; revenue: number }>([
        { $match: { status: { $in: REVENUE_PAYMENT_STATUSES }, paidAt: { $gte: range.fromInstant, $lt: range.toInstant } } },
        {
          $lookup: {
            from: BookingModel.collection.name,
            localField: "booking",
            foreignField: "_id",
            pipeline: [{ $project: { camper: 1 } }],
            as: "booking",
          },
        },
        { $unwind: "$booking" },
        { $group: { _id: "$booking.camper", revenue: { $sum: netAmount } } },
      ]).exec(),
    ]);

    const revenueByCamper = new Map(revenueRows.map((row) => [String(row._id), row.revenue]));
    return {
      range: this.rangeInfo(range),
      campers: campers.map((camper) => ({
        ...camper,
        revenue: revenueByCamper.get(String(camper.camperId)) ?? 0,
        utilization: days > 0 ? camper.bookedNights / days : 0,
      })),
    };
  }

  /** Registrations over time, repeat-booking behaviour and the top spenders of the range. */
  public async customerAnalytics(query: DashboardRangeQuery) {
    const range = this.resolveRange(query);
    const [registrationRows, registeredBefore, repeatRows, topCustomers] = await Promise.all([
      MemberModel.aggregate<{ _id: string; registrations: number }>([
        { $match: { role: MemberRole.CUSTOMER, createdAt: { $gte: range.fromInstant, $lt: range.toInstant } } },
        { $group: { _id: this.periodKey("$createdAt", query.interval), registrations: { $sum: 1 } } },
      ]).exec(),
      MemberModel.countDocuments({ role: MemberRole.CUSTOMER, createdAt: { $lt: range.fromInstant } }).exec(),
      BookingModel.aggregate<{
        customersWithBookings: number;
        repeatCustomers: number;
        bookingCustomersInRange: number;
        returningInRange: number;
      }>([
        { $match: { status: { $in: BOOKED_STATUSES }, createdAt: { $lt: range.toInstant } } },
        {
          $group: {
            _id: "$customer",
            bookings: { $sum: 1 },
            firstBookedAt: { $min: "$createdAt" },
            inRange: { $sum: { $cond: [{ $gte: ["$createdAt", range.fromInstant] }, 1, 0] } },
          },
        },
        {
          $group: {
            _id: null,
            customersWithBookings: { $sum: 1 },
            repeatCustomers: { $sum: { $cond: [{ $gte: ["$bookings", 2] }, 1, 0] } },
            bookingCustomersInRange: { $sum: { $cond: [{ $gt: ["$inRange", 0] }, 1, 0] } },
            returningInRange: {
              $sum: { $cond: [{ $and: [{ $gt: ["$inRange", 0] }, { $lt: ["$firstBookedAt", range.fromInstant] }] }, 1, 0] },
            },
          },
        },
      ]).exec(),
      this.topCustomers(range, query.limit),
    ]);

    let runningTotal = registeredBefore;
    const series = this.fillSeries(range, query.interval, registrationRows, { registrations: 0 }).map((point) => {
      runningTotal += Number(point.registrations);
      return { ...point, totalCustomers: runningTotal };
    });

    const repeat = repeatRows[0];
    return {
      range: this.rangeInfo(range),
      series,
      /** As of the end of the range: customers with at least one / at least two confirmed bookings. */
      customersWithBookings: repeat?.customersWithBookings ?? 0,
      repeatCustomers: repeat?.repeatCustomers ?? 0,
      /** Customers who made a confirmed booking in the range, and how many of them had booked before it. */
      bookingCustomersInRange: repeat?.bookingCustomersInRange ?? 0,
      returningInRange: repeat?.returningInRange ?? 0,
      topCustomers,
    };
  }

  /**
   * Payment figures. "Captured" uses the capture date (and is what revenue is
   * based on); status counts use the date the payment attempt was created;
   * "refunds issued" uses the date each refund was processed.
   */
  public async paymentSummary(query: DashboardRangeQuery) {
    const range = this.resolveRange(query);
    const created = { $gte: range.fromInstant, $lt: range.toInstant };
    const [statusRows, capturedRows, refundRows, methodRows] = await Promise.all([
      PaymentModel.aggregate<{ _id: PaymentStatus; count: number; amount: number }>([
        { $match: { createdAt: created } },
        { $group: { _id: "$status", count: { $sum: 1 }, amount: { $sum: "$amount" } } },
      ]).exec(),
      PaymentModel.aggregate<{ gross: number; refunded: number; count: number }>([
        { $match: { status: { $in: REVENUE_PAYMENT_STATUSES }, paidAt: created } },
        { $group: { _id: null, gross: { $sum: "$amount" }, refunded: { $sum: "$refundedAmount" }, count: { $sum: 1 } } },
      ]).exec(),
      PaymentModel.aggregate<{ amount: number; count: number }>([
        { $match: { "refunds.refundedAt": created } },
        { $unwind: "$refunds" },
        { $match: { "refunds.refundedAt": created } },
        { $group: { _id: null, amount: { $sum: "$refunds.amount" }, count: { $sum: 1 } } },
      ]).exec(),
      PaymentModel.aggregate<{ _id: string | null; count: number; amount: number }>([
        { $match: { status: { $in: REVENUE_PAYMENT_STATUSES }, paidAt: created } },
        { $group: { _id: "$method", count: { $sum: 1 }, amount: { $sum: netAmount } } },
        { $sort: { amount: -1 } },
      ]).exec(),
    ]);

    const byStatus = Object.fromEntries(
      Object.values(PaymentStatus).map((status) => {
        const row = statusRows.find((entry) => entry._id === status);
        return [status, { count: row?.count ?? 0, amount: row?.amount ?? 0 }];
      }),
    ) as Record<PaymentStatus, { count: number; amount: number }>;
    const captured = capturedRows[0];

    return {
      currency: "KRW",
      range: this.rangeInfo(range),
      byStatus,
      captured: {
        count: captured?.count ?? 0,
        gross: captured?.gross ?? 0,
        refunded: captured?.refunded ?? 0,
        net: (captured?.gross ?? 0) - (captured?.refunded ?? 0),
      },
      refundsIssued: { count: refundRows[0]?.count ?? 0, amount: refundRows[0]?.amount ?? 0 },
      methods: methodRows.map((row) => ({ method: row._id ?? "Unknown", count: row.count, amount: row.amount })),
    };
  }

  /**
   * Activity feed derived from records that already carry who/when:
   * booking status history, payment captures/failures, refunds and
   * customer registrations. Newest first, "load more" pagination.
   */
  public async activity(query: ActivityQuery): Promise<{ items: ActivityItem[]; hasMore: boolean; page: number; limit: number }> {
    const selected = ACTIVITY_TYPES.filter((type) => !query.type?.length || query.type.includes(type));
    const sources: Record<ActivityType, { collection: string; pipeline: PipelineStage[] }> = {
      BOOKING_STATUS: {
        collection: BookingModel.collection.name,
        pipeline: [
          { $unwind: "$statusHistory" },
          {
            $project: {
              _id: 0,
              type: { $literal: "BOOKING_STATUS" },
              at: "$statusHistory.changedAt",
              actorId: "$statusHistory.changedBy",
              status: "$statusHistory.status",
              reason: "$statusHistory.reason",
              bookingId: "$_id",
              bookingNumber: "$bookingNumber",
              customerId: "$customer",
            },
          },
        ],
      },
      PAYMENT_CAPTURED: {
        collection: PaymentModel.collection.name,
        pipeline: [
          { $match: { paidAt: { $type: "date" } } },
          {
            $project: {
              _id: 0,
              type: { $literal: "PAYMENT_CAPTURED" },
              at: "$paidAt",
              actorId: "$customer",
              amount: "$amount",
              currency: "$currency",
              paymentId: "$_id",
              orderId: "$orderId",
              bookingId: "$booking",
              customerId: "$customer",
            },
          },
        ],
      },
      PAYMENT_FAILED: {
        collection: PaymentModel.collection.name,
        pipeline: [
          { $match: { status: PaymentStatus.FAILED } },
          {
            $project: {
              _id: 0,
              type: { $literal: "PAYMENT_FAILED" },
              at: "$updatedAt",
              actorId: "$customer",
              amount: "$amount",
              currency: "$currency",
              reason: "$failureReason",
              paymentId: "$_id",
              orderId: "$orderId",
              bookingId: "$booking",
              customerId: "$customer",
            },
          },
        ],
      },
      REFUND: {
        collection: PaymentModel.collection.name,
        pipeline: [
          { $unwind: "$refunds" },
          {
            $project: {
              _id: 0,
              type: { $literal: "REFUND" },
              at: "$refunds.refundedAt",
              actorId: "$refunds.processedBy",
              amount: "$refunds.amount",
              currency: "$currency",
              reason: "$refunds.reason",
              paymentId: "$_id",
              orderId: "$orderId",
              bookingId: "$booking",
              customerId: "$customer",
            },
          },
        ],
      },
      CUSTOMER_REGISTERED: {
        collection: MemberModel.collection.name,
        pipeline: [
          { $match: { role: MemberRole.CUSTOMER } },
          { $project: { _id: 0, type: { $literal: "CUSTOMER_REGISTERED" }, at: "$createdAt", actorId: "$_id", customerId: "$_id" } },
        ],
      },
    };

    const [first, ...rest] = selected.map((type) => sources[type]);
    if (!first) return { items: [], hasMore: false, page: query.page, limit: query.limit };

    const models = { [BookingModel.collection.name]: BookingModel, [PaymentModel.collection.name]: PaymentModel, [MemberModel.collection.name]: MemberModel };
    const baseModel = models[first.collection] as typeof BookingModel;
    const rows = await baseModel
      .aggregate<ActivityItem & { actorId?: unknown }>([
        ...first.pipeline,
        ...rest.map((source) => ({ $unionWith: { coll: source.collection, pipeline: source.pipeline } }) as PipelineStage),
        { $sort: { at: -1 } },
        { $skip: (query.page - 1) * query.limit },
        { $limit: query.limit + 1 },
        {
          $lookup: {
            from: MemberModel.collection.name,
            localField: "actorId",
            foreignField: "_id",
            pipeline: [{ $project: { firstName: 1, lastName: 1, role: 1 } }],
            as: "actor",
          },
        },
        {
          $lookup: {
            from: BookingModel.collection.name,
            localField: "bookingId",
            foreignField: "_id",
            pipeline: [{ $project: { bookingNumber: 1 } }],
            as: "bookingRef",
          },
        },
        {
          $addFields: {
            actor: { $ifNull: [{ $arrayElemAt: ["$actor", 0] }, null] },
            bookingNumber: { $ifNull: ["$bookingNumber", { $arrayElemAt: ["$bookingRef.bookingNumber", 0] }] },
          },
        },
        { $project: { actorId: 0, bookingRef: 0 } },
      ])
      .exec();

    return { items: rows.slice(0, query.limit), hasMore: rows.length > query.limit, page: query.page, limit: query.limit };
  }

  /* ---------------- internals ---------------- */

  private async periodMetrics(range: ResolvedRange): Promise<PeriodMetrics> {
    const days = nightsBetween(range.from, range.to);
    const created = { $gte: range.fromInstant, $lt: range.toInstant };
    const [revenue, bookingRows, newCustomers, occupiedRows, fleetSize] = await Promise.all([
      this.netRevenue({ paidAt: created }),
      BookingModel.aggregate<{ _id: BookingStatus; count: number; value: number; confirmed: number }>([
        { $match: { createdAt: created } },
        { $addFields: { wasConfirmed: { $in: [BookingStatus.CONFIRMED, { $ifNull: ["$statusHistory.status", []] }] } } },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
            value: { $sum: "$price.total" },
            confirmed: { $sum: { $cond: ["$wasConfirmed", 1, 0] } },
          },
        },
      ]).exec(),
      MemberModel.countDocuments({ role: MemberRole.CUSTOMER, createdAt: created }).exec(),
      BookingModel.aggregate<{ nights: number }>([
        { $match: { status: { $in: BOOKED_STATUSES }, startDate: { $lt: range.to }, endDate: { $gt: range.from } } },
        { $group: { _id: null, nights: { $sum: overlapNights(range.from, range.to) } } },
      ]).exec(),
      // Camper status history is not recorded, so the fleet is today's non-archived campers that existed by the range end.
      CamperModel.countDocuments({ status: { $ne: CamperStatus.ARCHIVED }, createdAt: { $lt: range.toInstant } }).exec(),
    ]);

    const byStatus = this.countsByStatus(Object.values(BookingStatus), bookingRows);
    const booked = bookingRows.filter((row) => BOOKED_STATUSES.includes(row._id));
    const bookedCount = booked.reduce((sum, row) => sum + row.count, 0);
    const bookedValue = booked.reduce((sum, row) => sum + row.value, 0);
    const everConfirmed = bookingRows.reduce((sum, row) => sum + row.confirmed, 0);
    const cancelledRow = bookingRows.find((row) => row._id === BookingStatus.CANCELLED);
    const cancelledAfterConfirmation = cancelledRow?.confirmed ?? 0;
    const bookedNights = Math.round(occupiedRows[0]?.nights ?? 0);
    const capacityNights = fleetSize * days;

    return {
      revenue,
      bookings: { total: Object.values(byStatus).reduce((sum, count) => sum + count, 0), byStatus },
      bookedCount,
      bookedValue,
      averageBookingValue: bookedCount > 0 ? Math.round(bookedValue / bookedCount) : null,
      cancellationRate: everConfirmed > 0 ? cancelledAfterConfirmation / everConfirmed : null,
      cancelledAfterConfirmation,
      expiredUnpaid: (cancelledRow?.count ?? 0) - cancelledAfterConfirmation,
      rejected: byStatus[BookingStatus.REJECTED],
      newCustomers,
      occupancyRate: capacityNights > 0 ? bookedNights / capacityNights : null,
      bookedNights,
      fleetSize,
    };
  }

  /** Current state of the business. There is no history for these, so they are never compared. */
  private async snapshot() {
    const today = todayInBusinessTimezone();
    const inAWeek = addDays(today, 7);
    const [camperRows, totalCustomers, pendingBookings, openInquiries, pickupsNext7Days, returnsNext7Days, overduePickups, overdueReturns] =
      await Promise.all([
        CamperModel.aggregate<{ _id: CamperStatus; count: number }>([{ $group: { _id: "$status", count: { $sum: 1 } } }]).exec(),
        MemberModel.countDocuments({ role: MemberRole.CUSTOMER, status: { $ne: MemberStatus.DELETED } }).exec(),
        BookingModel.countDocuments({ status: BookingStatus.PENDING }).exec(),
        ContactInquiryModel.countDocuments({ status: { $ne: InquiryStatus.RESOLVED } }).exec(),
        BookingModel.countDocuments({ status: BookingStatus.CONFIRMED, startDate: { $gte: today, $lt: inAWeek } }).exec(),
        BookingModel.countDocuments({ status: BookingStatus.ACTIVE, endDate: { $gte: today, $lt: inAWeek } }).exec(),
        BookingModel.countDocuments({ status: BookingStatus.CONFIRMED, startDate: { $lt: today } }).exec(),
        BookingModel.countDocuments({ status: BookingStatus.ACTIVE, endDate: { $lt: today } }).exec(),
      ]);
    const campersByStatus = this.countsByStatus(Object.values(CamperStatus), camperRows);
    return {
      campersByStatus,
      activeCampers: campersByStatus[CamperStatus.AVAILABLE],
      fleetSize: Object.entries(campersByStatus)
        .filter(([status]) => status !== CamperStatus.ARCHIVED)
        .reduce((sum, [, count]) => sum + count, 0),
      totalCustomers,
      pendingBookings,
      openInquiries,
      pickupsNext7Days,
      returnsNext7Days,
      overduePickups,
      overdueReturns,
    };
  }

  private topCustomers(range: ResolvedRange, limit: number) {
    return PaymentModel.aggregate<{
      customerId: string;
      firstName: string;
      lastName: string;
      email: string;
      avatar?: string;
      spent: number;
      payments: number;
    }>([
      { $match: { status: { $in: REVENUE_PAYMENT_STATUSES }, paidAt: { $gte: range.fromInstant, $lt: range.toInstant } } },
      { $group: { _id: "$customer", spent: { $sum: netAmount }, payments: { $sum: 1 } } },
      { $match: { spent: { $gt: 0 } } },
      { $sort: { spent: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: MemberModel.collection.name,
          localField: "_id",
          foreignField: "_id",
          pipeline: [{ $project: { firstName: 1, lastName: 1, email: 1, avatar: 1 } }],
          as: "member",
        },
      },
      { $unwind: "$member" },
      {
        $project: {
          _id: 0,
          customerId: "$_id",
          firstName: "$member.firstName",
          lastName: "$member.lastName",
          email: "$member.email",
          avatar: "$member.avatar.url",
          spent: 1,
          payments: 1,
        },
      },
    ]).exec();
  }

  /** The range of equal length that ends where `range` starts. */
  private previousRange(range: ResolvedRange): ResolvedRange {
    const days = nightsBetween(range.from, range.to);
    const from = addDays(range.from, -days);
    return { from, to: range.from, fromInstant: startOfKoreanDay(from), toInstant: range.fromInstant };
  }

  private rangeInfo(range: ResolvedRange): RangeInfo {
    return { from: formatDateOnly(range.from), to: formatDateOnly(addDays(range.to, -1)), days: nightsBetween(range.from, range.to) };
  }

  private async netRevenue(extraMatch: Record<string, unknown>): Promise<number> {
    const [result] = await PaymentModel.aggregate<{ total: number }>([
      { $match: { status: { $in: REVENUE_PAYMENT_STATUSES }, ...extraMatch } },
      { $group: { _id: null, total: { $sum: { $subtract: ["$amount", "$refundedAmount"] } } } },
    ]).exec();
    return result?.total ?? 0;
  }

  private countsByStatus<S extends string>(statuses: S[], rows: { _id: S; count: number }[]): Record<S, number> {
    return Object.fromEntries(statuses.map((status) => [status, rows.find((row) => row._id === status)?.count ?? 0])) as Record<S, number>;
  }

  /** Defaults to the last 30 days. `to` is inclusive for callers and made exclusive here. */
  private resolveRange(query: DashboardRangeQuery): ResolvedRange {
    const to = query.to ? addDays(query.to, 1) : addDays(todayInBusinessTimezone(), 1);
    const from = query.from ?? addDays(to, -30);
    return { from, to, fromInstant: startOfKoreanDay(from), toInstant: startOfKoreanDay(to) };
  }

  /** "YYYY-MM-DD" of the period's first day, in Korean time. Weeks start on Monday. */
  private periodKey(field: string, interval: Interval) {
    return {
      $dateToString: {
        format: "%Y-%m-%d",
        timezone: BUSINESS_TIMEZONE,
        date: { $dateTrunc: { date: field, unit: interval, timezone: BUSINESS_TIMEZONE, startOfWeek: "monday" } },
      },
    };
  }

  /** Charts need continuous axes, so empty periods are returned as zeros. */
  private fillSeries<T extends { _id: string }>(
    range: ResolvedRange,
    interval: Interval,
    rows: T[],
    zero: Record<string, number>,
  ): SeriesPoint[] {
    const byPeriod = new Map(rows.map((row) => [row._id, row]));
    const points: SeriesPoint[] = [];
    for (let cursor = this.truncate(range.from, interval); cursor < range.to; cursor = this.nextPeriod(cursor, interval)) {
      const period = formatDateOnly(cursor);
      const row = byPeriod.get(period);
      const values = Object.fromEntries(Object.keys(zero).map((key) => [key, Number((row as Record<string, unknown> | undefined)?.[key] ?? 0)]));
      points.push({ period, ...values });
    }
    return points;
  }

  private truncate(date: Date, interval: Interval): Date {
    if (interval === "year") return new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    if (interval === "month") return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
    if (interval === "week") return addDays(date, -((date.getUTCDay() + 6) % 7));
    return date;
  }

  private nextPeriod(date: Date, interval: Interval): Date {
    if (interval === "year") return new Date(Date.UTC(date.getUTCFullYear() + 1, 0, 1));
    if (interval === "month") return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));
    return addDays(date, interval === "week" ? 7 : 1);
  }
}

export const dashboardService = new DashboardService();
