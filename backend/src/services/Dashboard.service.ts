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
import { addDays, BUSINESS_TIMEZONE, formatDateOnly, todayInBusinessTimezone } from "../utils/dates";
import { DashboardRangeQuery } from "../validators/dashboard.validator";

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

  /* ---------------- internals ---------------- */

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
    if (interval === "month") return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
    if (interval === "week") return addDays(date, -((date.getUTCDay() + 6) % 7));
    return date;
  }

  private nextPeriod(date: Date, interval: Interval): Date {
    if (interval === "month") return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));
    return addDays(date, interval === "week" ? 7 : 1);
  }
}

export const dashboardService = new DashboardService();
