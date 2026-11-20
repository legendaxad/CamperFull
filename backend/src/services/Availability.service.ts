import { ClientSession, FilterQuery, Types } from "mongoose";
import { BookingStatus, CALENDAR_BLOCKING_STATUSES } from "../constants/enums";
import { Booking } from "../interfaces/booking.interface";
import { BookingModel } from "../models";
import { formatDateOnly } from "../utils/dates";

export interface BlockedRange {
  startDate: string;
  endDate: string;
}

/**
 * Bookings that occupy the calendar at `now`:
 *  - CONFIRMED and ACTIVE always do;
 *  - PENDING only while its payment hold has not expired. An abandoned
 *    checkout therefore releases the dates automatically, even before the
 *    background sweep marks it CANCELLED.
 */
const occupyingStatusFilter = (now: Date): FilterQuery<Booking> => ({
  $or: [
    { status: { $in: CALENDAR_BLOCKING_STATUSES } },
    { status: BookingStatus.PENDING, holdExpiresAt: { $gt: now } },
  ],
});

/** Overlap rule (end dates are exclusive): existing.start < requested.end AND existing.end > requested.start. */
const overlapFilter = (startDate: Date, endDate: Date): FilterQuery<Booking> => ({
  startDate: { $lt: endDate },
  endDate: { $gt: startDate },
});

class AvailabilityService {
  private readonly bookingModel = BookingModel;

  /**
   * Returns bookings that conflict with the requested range. Must be called
   * with the booking transaction's session so it sees a consistent snapshot.
   */
  public findConflicts(
    camperId: Types.ObjectId,
    startDate: Date,
    endDate: Date,
    options: { session?: ClientSession; excludeBookingId?: Types.ObjectId; now?: Date } = {},
  ): Promise<Pick<Booking, "_id" | "startDate" | "endDate" | "status">[]> {
    const filter: FilterQuery<Booking> = {
      camper: camperId,
      ...overlapFilter(startDate, endDate),
      ...occupyingStatusFilter(options.now ?? new Date()),
      ...(options.excludeBookingId ? { _id: { $ne: options.excludeBookingId } } : {}),
    };
    return this.bookingModel
      .find(filter)
      .select("_id startDate endDate status")
      .session(options.session ?? null)
      .lean()
      .exec();
  }

  /** Campers that are NOT free for the whole range; used to filter the catalog by dates. */
  public async busyCamperIds(startDate: Date, endDate: Date): Promise<Types.ObjectId[]> {
    const ids = await this.bookingModel
      .distinct("camper", { ...overlapFilter(startDate, endDate), ...occupyingStatusFilter(new Date()) })
      .exec();
    return ids as Types.ObjectId[];
  }

  /** Occupied ranges for a camper's calendar. No customer data is exposed. */
  public async blockedRanges(camperId: Types.ObjectId, from: Date, to: Date): Promise<BlockedRange[]> {
    const bookings = await this.findConflicts(camperId, from, to);
    return bookings
      .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
      .map((booking) => ({ startDate: formatDateOnly(booking.startDate), endDate: formatDateOnly(booking.endDate) }));
  }
}

export const availabilityService = new AvailabilityService();
