import { ClientSession, FilterQuery, PopulateOptions, Types } from "mongoose";
import { runInTransaction } from "../database/connection";
import { BookingStatus, CamperStatus, NotificationType, PaymentStatus } from "../constants/enums";
import { Message } from "../constants/messages";
import { Booking, PriceBreakdown } from "../interfaces/booking.interface";
import { Camper } from "../interfaces/catalog.interface";
import { BusinessSettings } from "../interfaces/engagement.interface";
import { BookingModel, CamperModel, MemberModel } from "../models";
import { AppError } from "../utils/AppError";
import { addDays, formatDateOnly, nightsBetween, todayInBusinessTimezone } from "../utils/dates";
import { logger } from "../utils/logger";
import { buildPaginationMeta, getSkip, PaginatedResult } from "../utils/pagination";
import { containsRegex, randomCode } from "../utils/strings";
import {
  AdminBookingListQuery,
  BookingCreateInput,
  BookingQuoteInput,
  CustomerBookingListQuery,
} from "../validators/booking.validator";
import { availabilityService } from "./Availability.service";
import { couponService } from "./Coupon.service";
import { notificationService } from "./Notification.service";
import { calculateBasePrice, finalizePrice } from "./Pricing.service";
import { settingsService } from "./Settings.service";

/*
 * BOOKING LIFECYCLE
 *
 *   PENDING ──pay / admin confirm──▶ CONFIRMED ──pickup──▶ ACTIVE ──return──▶ COMPLETED
 *      │                                 │
 *      ├─ customer/admin cancel ─▶ CANCELLED ◀─ customer (within policy) / admin
 *      ├─ admin reject ─────────▶ REJECTED
 *      └─ hold expires ─────────▶ CANCELLED (automatic)
 *
 * A PENDING booking holds the dates for `bookingHoldMinutes` while the
 * customer pays. COMPLETED, CANCELLED and REJECTED are final.
 */
const ALLOWED_TRANSITIONS: Record<BookingStatus, readonly BookingStatus[]> = {
  [BookingStatus.PENDING]: [BookingStatus.CONFIRMED, BookingStatus.CANCELLED, BookingStatus.REJECTED],
  [BookingStatus.CONFIRMED]: [BookingStatus.ACTIVE, BookingStatus.CANCELLED],
  [BookingStatus.ACTIVE]: [BookingStatus.COMPLETED],
  [BookingStatus.COMPLETED]: [],
  [BookingStatus.CANCELLED]: [],
  [BookingStatus.REJECTED]: [],
};

const RELEASING_STATUSES: readonly BookingStatus[] = [BookingStatus.CANCELLED, BookingStatus.REJECTED];

const CUSTOMER_POPULATE: PopulateOptions[] = [
  { path: "camper", select: "name slug images location capacity licenseType" },
];
const ADMIN_POPULATE: PopulateOptions[] = [
  ...CUSTOMER_POPULATE,
  { path: "customer", select: "firstName lastName email phone" },
];

const ADMIN_SORTS: Record<AdminBookingListQuery["sort"], Record<string, 1 | -1>> = {
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  start_asc: { startDate: 1, _id: 1 },
  start_desc: { startDate: -1, _id: -1 },
  total_desc: { "price.total": -1, _id: -1 },
};

export interface BookingQuote {
  camperId: string;
  startDate: string;
  endDate: string;
  available: boolean;
  price: PriceBreakdown;
}

export interface StatusChange {
  to: BookingStatus;
  actorId?: Types.ObjectId;
  reason?: string;
}

const STATUS_LABELS: Record<BookingStatus, string> = {
  [BookingStatus.PENDING]: "is awaiting payment",
  [BookingStatus.CONFIRMED]: "has been confirmed",
  [BookingStatus.ACTIVE]: "is now active. Enjoy your trip!",
  [BookingStatus.COMPLETED]: "has been completed. Thank you for travelling with us!",
  [BookingStatus.CANCELLED]: "has been cancelled",
  [BookingStatus.REJECTED]: "has been rejected",
};

class BookingService {
  private readonly bookingModel = BookingModel;

  /** Price preview for the booking form. Does not reserve anything. */
  public async quote(input: BookingQuoteInput, customerId?: Types.ObjectId): Promise<BookingQuote> {
    const settings = await settingsService.get();
    const camper = await this.loadBookableCamper(input.camperId);
    this.assertStayRules(camper, input.startDate, input.endDate, settings);

    const price = await this.priceFor(camper, input, settings, customerId);
    const conflicts = await availabilityService.findConflicts(camper._id, input.startDate, input.endDate);

    return {
      camperId: camper._id.toString(),
      startDate: formatDateOnly(input.startDate),
      endDate: formatDateOnly(input.endDate),
      available: conflicts.length === 0,
      price,
    };
  }

  /**
   * Creates a PENDING booking that holds the dates until payment.
   *
   * Double-booking protection: every booking transaction for a camper first
   * increments that camper's `bookingLockVersion`. Two concurrent
   * transactions for the same camper therefore write the same document, and
   * MongoDB aborts one with a write conflict. `withTransaction` retries it;
   * on retry it sees the committed booking and fails with 409. Checking for
   * overlaps alone would not be enough: both transactions could read "no
   * conflict" from their snapshots and both insert.
   */
  public async create(customerId: Types.ObjectId, input: BookingCreateInput): Promise<Booking> {
    const settings = await settingsService.get();

    const booking = await runInTransaction(async (session) => {
      const camper = await this.lockCamper(input.camperId, session);
      this.assertStayRules(camper, input.startDate, input.endDate, settings);

      const conflicts = await availabilityService.findConflicts(camper._id, input.startDate, input.endDate, { session });
      if (conflicts.length > 0) throw AppError.conflict(Message.DATES_UNAVAILABLE);

      const base = calculateBasePrice({
        pricing: camper.pricing,
        availableExtras: camper.extras,
        selectedExtras: input.extras,
        startDate: input.startDate,
        endDate: input.endDate,
        weekendNights: settings.weekendNights,
        currency: settings.currency,
      });

      let couponId: Types.ObjectId | undefined;
      let discount = 0;
      if (input.couponCode) {
        const evaluation = await couponService.evaluate(input.couponCode, customerId, base.subtotal, session);
        await couponService.reserveUsage(evaluation.coupon._id, session);
        couponId = evaluation.coupon._id;
        discount = evaluation.discount;
      }

      const now = new Date();
      const [created] = await this.bookingModel.create(
        [
          {
            bookingNumber: this.generateBookingNumber(now),
            customer: customerId,
            camper: camper._id,
            startDate: input.startDate,
            endDate: input.endDate,
            nights: base.nights,
            status: BookingStatus.PENDING,
            price: finalizePrice(base, discount, couponId ? input.couponCode : undefined),
            coupon: couponId,
            paymentStatus: PaymentStatus.PENDING,
            holdExpiresAt: new Date(now.getTime() + settings.bookingHoldMinutes * 60 * 1000),
            driver: input.driver,
            customerNote: input.customerNote,
            statusHistory: [{ status: BookingStatus.PENDING, changedBy: customerId, changedAt: now }],
          },
        ],
        { session },
      );
      if (!created) throw new Error("Booking insert returned no document");
      return created.toObject();
    });

    await Promise.all([
      notificationService.notifyMemberSafely(customerId, {
        type: NotificationType.BOOKING_CREATED,
        title: "Booking created",
        message: `Booking ${booking.bookingNumber} was created. Complete payment within ${settings.bookingHoldMinutes} minutes to confirm it.`,
        data: { bookingId: booking._id.toString() },
      }),
      notificationService.notifyAdmins({
        type: NotificationType.BOOKING_CREATED,
        title: "New booking",
        message: `Booking ${booking.bookingNumber} for ${formatDateOnly(booking.startDate)} - ${formatDateOnly(booking.endDate)} is awaiting payment.`,
        data: { bookingId: booking._id.toString() },
      }),
    ]);

    return this.getForCustomer(booking._id.toString(), customerId);
  }

  public async getForCustomer(bookingId: string, customerId: Types.ObjectId): Promise<Booking> {
    // Filtering by owner (not just id) means another customer's booking is simply "not found".
    const booking = await this.bookingModel
      .findOne({ _id: bookingId, customer: customerId })
      .populate(CUSTOMER_POPULATE)
      .lean<Booking>()
      .exec();
    if (!booking) throw AppError.notFound(Message.BOOKING_NOT_FOUND);
    return booking;
  }

  public async listForCustomer(customerId: Types.ObjectId, query: CustomerBookingListQuery): Promise<PaginatedResult<Booking>> {
    const filter: FilterQuery<Booking> = { customer: customerId };
    if (query.status?.length) filter.status = { $in: query.status };
    const today = todayInBusinessTimezone();
    if (query.scope === "upcoming") filter.endDate = { $gt: today };
    if (query.scope === "past") filter.endDate = { $lte: today };

    const sort: Record<string, 1 | -1> = query.scope === "upcoming" ? { startDate: 1 } : { createdAt: -1 };
    const [items, total] = await Promise.all([
      this.bookingModel.find(filter).sort(sort).skip(getSkip(query)).limit(query.limit).populate(CUSTOMER_POPULATE).lean<Booking[]>().exec(),
      this.bookingModel.countDocuments(filter).exec(),
    ]);
    return { items, meta: buildPaginationMeta(query, total) };
  }

  public async listForAdmin(query: AdminBookingListQuery): Promise<PaginatedResult<Booking>> {
    const filter: FilterQuery<Booking> = {};
    if (query.status?.length) filter.status = { $in: query.status };
    if (query.camperId) filter.camper = query.camperId;
    if (query.customerId) filter.customer = query.customerId;
    if (query.from || query.to) {
      // Bookings that touch the [from, to) window.
      if (query.to) filter.startDate = { $lt: query.to };
      if (query.from) filter.endDate = { $gt: query.from };
    }
    if (query.search) {
      const regex = containsRegex(query.search);
      const customers = await MemberModel.find({ $or: [{ email: regex }, { firstName: regex }, { lastName: regex }, { phone: regex }] })
        .select("_id")
        .limit(100)
        .lean()
        .exec();
      filter.$or = [{ bookingNumber: regex }, { "driver.fullName": regex }, { customer: { $in: customers.map((c) => c._id) } }];
    }

    const [items, total] = await Promise.all([
      this.bookingModel.find(filter).sort(ADMIN_SORTS[query.sort]).skip(getSkip(query)).limit(query.limit).populate(ADMIN_POPULATE).lean<Booking[]>().exec(),
      this.bookingModel.countDocuments(filter).exec(),
    ]);
    return { items, meta: buildPaginationMeta(query, total) };
  }

  public async getForAdmin(bookingId: string): Promise<Booking> {
    const booking = await this.bookingModel.findById(bookingId).populate(ADMIN_POPULATE).lean<Booking>().exec();
    if (!booking) throw AppError.notFound(Message.BOOKING_NOT_FOUND);
    return booking;
  }

  public async findById(bookingId: string | Types.ObjectId, session?: ClientSession): Promise<Booking> {
    const booking = await this.bookingModel.findById(bookingId).session(session ?? null).lean<Booking>().exec();
    if (!booking) throw AppError.notFound(Message.BOOKING_NOT_FOUND);
    return booking;
  }

  public async setAdminNote(bookingId: string, adminNote: string): Promise<Booking> {
    const result = await this.bookingModel.updateOne({ _id: bookingId }, { $set: { adminNote } }).exec();
    if (result.matchedCount === 0) throw AppError.notFound(Message.BOOKING_NOT_FOUND);
    return this.getForAdmin(bookingId);
  }

  /** Cancellation policy for customers: unpaid bookings any time, paid ones until N days before pickup. */
  public async assertCustomerCanCancel(booking: Booking): Promise<void> {
    if (booking.status === BookingStatus.PENDING) return;
    if (booking.status !== BookingStatus.CONFIRMED) {
      throw AppError.badRequest(`A ${booking.status.toLowerCase()} booking cannot be cancelled`);
    }
    const { freeCancellationDays } = await settingsService.get();
    const daysUntilPickup = nightsBetween(todayInBusinessTimezone(), booking.startDate);
    if (daysUntilPickup < freeCancellationDays) {
      throw AppError.badRequest(
        `Bookings can be cancelled online up to ${freeCancellationDays} days before pickup. Please contact us to change this booking.`,
      );
    }
  }

  /**
   * Applies a lifecycle transition. Moving into CONFIRMED re-checks
   * availability under the camper lock, because an expired PENDING booking
   * may have lost its dates to someone else in the meantime.
   */
  public async changeStatus(bookingId: string | Types.ObjectId, change: StatusChange, session?: ClientSession): Promise<Booking> {
    const apply = async (txSession: ClientSession): Promise<Booking> => {
      const booking = await this.findById(bookingId, txSession);
      this.assertTransitionAllowed(booking, change.to);

      if (change.to === BookingStatus.CONFIRMED) {
        await this.lockCamper(booking.camper.toString(), txSession, { allowAnyStatus: true });
        const conflicts = await availabilityService.findConflicts(booking.camper, booking.startDate, booking.endDate, {
          session: txSession,
          excludeBookingId: booking._id,
        });
        if (conflicts.length > 0) throw AppError.conflict(Message.DATES_UNAVAILABLE);
      }

      const now = new Date();
      const update = {
        $set: {
          status: change.to,
          ...(change.to === BookingStatus.CANCELLED ? { cancelledAt: now, cancellationReason: change.reason } : {}),
          ...(change.to === BookingStatus.REJECTED ? { cancellationReason: change.reason } : {}),
        },
        // The payment hold only matters while PENDING, and no transition leads back to PENDING.
        $unset: { holdExpiresAt: 1 },
        $push: { statusHistory: { status: change.to, changedBy: change.actorId, reason: change.reason, changedAt: now } },
      };
      // Conditional on the current status so two simultaneous transitions cannot both apply.
      const updated = await this.bookingModel
        .findOneAndUpdate({ _id: booking._id, status: booking.status }, update, { new: true, session: txSession })
        .lean<Booking>()
        .exec();
      if (!updated) throw AppError.conflict("The booking was modified by another request. Please retry.");

      if (RELEASING_STATUSES.includes(change.to) && booking.coupon) {
        await couponService.releaseUsage(booking.coupon, txSession);
      }
      return updated;
    };

    const updated = session ? await apply(session) : await runInTransaction(apply);
    if (!session) await this.notifyStatusChange(updated);
    return updated;
  }

  /** Mirrors the latest payment status onto the booking for quick filtering. Used by the payment service. */
  public async setPaymentStatus(bookingId: Types.ObjectId, paymentStatus: PaymentStatus, session?: ClientSession): Promise<void> {
    await this.bookingModel.updateOne({ _id: bookingId }, { $set: { paymentStatus } }, { session }).exec();
  }

  public async notifyStatusChange(booking: Booking): Promise<void> {
    await notificationService.notifyMemberSafely(booking.customer, {
      type: NotificationType.BOOKING_STATUS_CHANGED,
      title: "Booking update",
      message: `Booking ${booking.bookingNumber} ${STATUS_LABELS[booking.status]}.`,
      data: { bookingId: booking._id.toString(), status: booking.status },
    });
  }

  /** Cancels PENDING bookings whose payment hold ran out and returns their coupon uses. */
  public async expireStaleBookings(now: Date = new Date()): Promise<number> {
    const stale = await this.bookingModel
      .find({ status: BookingStatus.PENDING, holdExpiresAt: { $lte: now } })
      .select("_id")
      .limit(200)
      .lean()
      .exec();

    let expired = 0;
    for (const { _id } of stale) {
      try {
        await this.changeStatus(_id, { to: BookingStatus.CANCELLED, reason: "Payment was not completed in time" });
        expired += 1;
      } catch (error) {
        // Most likely paid or cancelled concurrently; it will be skipped next time.
        logger.debug({ err: error, bookingId: _id.toString() }, "Skipped expiring booking");
      }
    }
    if (expired > 0) logger.info({ expired }, "Expired unpaid bookings");
    return expired;
  }

  /* ---------------- internals ---------------- */

  private assertTransitionAllowed(booking: Booking, to: BookingStatus): void {
    if (!ALLOWED_TRANSITIONS[booking.status].includes(to)) {
      throw AppError.badRequest(`Cannot change booking status from ${booking.status} to ${to}`);
    }
    if (to === BookingStatus.ACTIVE && todayInBusinessTimezone().getTime() < booking.startDate.getTime()) {
      throw AppError.badRequest("A booking cannot become active before its pickup date");
    }
  }

  /** Enforces the business rules on the requested stay (lead time, advance window, min/max nights). */
  private assertStayRules(camper: Camper, startDate: Date, endDate: Date, settings: BusinessSettings): void {
    const today = todayInBusinessTimezone();
    const earliest = addDays(today, settings.minLeadDays);
    const latest = addDays(today, settings.maxAdvanceDays);
    const nights = nightsBetween(startDate, endDate);

    if (nights < 1) throw AppError.badRequest("The return day must be after the pickup day");
    if (startDate.getTime() < earliest.getTime()) {
      throw AppError.badRequest(
        settings.minLeadDays === 0 ? "Pickup date cannot be in the past" : `Pickup must be at least ${settings.minLeadDays} day(s) from today`,
        [{ field: "startDate", message: `Earliest pickup date is ${formatDateOnly(earliest)}` }],
      );
    }
    if (startDate.getTime() > latest.getTime()) {
      throw AppError.badRequest(`Bookings can be made at most ${settings.maxAdvanceDays} days in advance`);
    }
    if (nights < camper.minNights || nights > camper.maxNights) {
      throw AppError.badRequest(`This camper can be rented for ${camper.minNights} to ${camper.maxNights} nights`, [
        { field: "endDate", message: `Requested ${nights} nights` },
      ]);
    }
  }

  private async priceFor(
    camper: Camper,
    input: BookingQuoteInput,
    settings: BusinessSettings,
    customerId?: Types.ObjectId,
  ): Promise<PriceBreakdown> {
    const base = calculateBasePrice({
      pricing: camper.pricing,
      availableExtras: camper.extras,
      selectedExtras: input.extras,
      startDate: input.startDate,
      endDate: input.endDate,
      weekendNights: settings.weekendNights,
      currency: settings.currency,
    });
    if (!input.couponCode) return finalizePrice(base, 0);
    const { discount } = await couponService.evaluate(input.couponCode, customerId, base.subtotal);
    return finalizePrice(base, discount, input.couponCode);
  }

  private async loadBookableCamper(camperId: string): Promise<Camper> {
    const camper = await CamperModel.findById(camperId).lean<Camper>().exec();
    if (!camper || camper.status === CamperStatus.ARCHIVED) throw AppError.notFound(Message.CAMPER_NOT_FOUND);
    if (camper.status !== CamperStatus.AVAILABLE) throw AppError.badRequest(Message.CAMPER_NOT_BOOKABLE);
    return camper;
  }

  /** Takes the per-camper booking lock inside the transaction (see `create`). */
  private async lockCamper(camperId: string, session: ClientSession, options: { allowAnyStatus?: boolean } = {}): Promise<Camper> {
    const camper = await CamperModel.findOneAndUpdate(
      { _id: camperId, ...(options.allowAnyStatus ? {} : { status: CamperStatus.AVAILABLE }) },
      { $inc: { bookingLockVersion: 1 } },
      { new: true, session },
    )
      .lean<Camper>()
      .exec();
    if (!camper) {
      const exists = await CamperModel.exists({ _id: camperId, status: { $ne: CamperStatus.ARCHIVED } }).session(session);
      throw exists ? AppError.badRequest(Message.CAMPER_NOT_BOOKABLE) : AppError.notFound(Message.CAMPER_NOT_FOUND);
    }
    return camper;
  }

  /** e.g. FC-261120-7KQ2MX: date for humans, random suffix for uniqueness. */
  private generateBookingNumber(now: Date): string {
    const date = formatDateOnly(todayInBusinessTimezone(now)).slice(2).replace(/-/g, "");
    return `FC-${date}-${randomCode(6)}`;
  }
}

export const bookingService = new BookingService();
