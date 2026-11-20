import { ClientSession, FilterQuery, Types } from "mongoose";
import { BookingStatus, DiscountType } from "../constants/enums";
import { Message } from "../constants/messages";
import { Coupon } from "../interfaces/booking.interface";
import { BookingModel, CouponModel } from "../models";
import { AppError } from "../utils/AppError";
import { buildPaginationMeta, getSkip, PaginatedResult } from "../utils/pagination";
import { containsRegex } from "../utils/strings";
import { CouponCreateInput, CouponListQuery, CouponUpdateInput } from "../validators/coupon.validator";
import { calculateCouponDiscount } from "./Pricing.service";

export interface CouponEvaluation {
  coupon: Coupon;
  discount: number;
}

const couponError = (reason: string) => AppError.badRequest(Message.COUPON_INVALID, [{ field: "couponCode", message: reason }]);

class CouponService {
  private readonly couponModel = CouponModel;

  /**
   * Checks every coupon rule against a booking subtotal and returns the
   * discount. Throws a 400 with the specific reason when the coupon does not apply.
   */
  public async evaluate(
    code: string,
    customerId: Types.ObjectId | undefined,
    subtotal: number,
    session?: ClientSession,
  ): Promise<CouponEvaluation> {
    const now = new Date();
    const coupon = await this.couponModel.findOne({ code: code.trim().toUpperCase() }).session(session ?? null).lean<Coupon>().exec();

    if (!coupon || !coupon.isActive) throw couponError("Coupon does not exist or is inactive");
    if (coupon.startsAt && coupon.startsAt > now) throw couponError("Coupon is not active yet");
    if (coupon.expiresAt && coupon.expiresAt <= now) throw couponError("Coupon has expired");
    if (coupon.usageLimit !== undefined && coupon.usageCount >= coupon.usageLimit) throw couponError("Coupon usage limit has been reached");
    if (subtotal < coupon.minBookingAmount) {
      throw couponError(`Minimum booking amount for this coupon is ${coupon.minBookingAmount.toLocaleString("en-US")} KRW`);
    }
    if (coupon.perCustomerLimit !== undefined && customerId) {
      const used = await BookingModel.countDocuments({
        customer: customerId,
        coupon: coupon._id,
        status: { $nin: [BookingStatus.CANCELLED, BookingStatus.REJECTED] },
      })
        .session(session ?? null)
        .exec();
      if (used >= coupon.perCustomerLimit) throw couponError("You have already used this coupon the maximum number of times");
    }

    return { coupon, discount: calculateCouponDiscount(coupon, subtotal) };
  }

  /** Atomically consumes one use. The conditional update cannot exceed usageLimit, even under concurrency. */
  public async reserveUsage(couponId: Types.ObjectId, session: ClientSession): Promise<void> {
    const result = await this.couponModel
      .updateOne(
        { _id: couponId, $or: [{ usageLimit: null }, { $expr: { $lt: ["$usageCount", "$usageLimit"] } }] },
        { $inc: { usageCount: 1 } },
        { session },
      )
      .exec();
    if (result.modifiedCount === 0) throw couponError("Coupon usage limit has been reached");
  }

  /** Gives a use back when a booking is cancelled, rejected or expires. */
  public async releaseUsage(couponId: Types.ObjectId, session?: ClientSession): Promise<void> {
    await this.couponModel
      .updateOne({ _id: couponId, usageCount: { $gt: 0 } }, { $inc: { usageCount: -1 } }, { session })
      .exec();
  }

  /* ---------------- Admin ---------------- */

  public async list(query: CouponListQuery): Promise<PaginatedResult<Coupon>> {
    const filter: FilterQuery<Coupon> = {};
    if (query.search) filter.$or = [{ code: containsRegex(query.search) }, { description: containsRegex(query.search) }];
    if (query.active !== undefined) filter.isActive = query.active;
    const [items, total] = await Promise.all([
      this.couponModel.find(filter).sort({ createdAt: -1 }).skip(getSkip(query)).limit(query.limit).lean<Coupon[]>().exec(),
      this.couponModel.countDocuments(filter).exec(),
    ]);
    return { items, meta: buildPaginationMeta(query, total) };
  }

  public async get(id: string): Promise<Coupon> {
    const coupon = await this.couponModel.findById(id).lean<Coupon>().exec();
    if (!coupon) throw AppError.notFound("Coupon not found");
    return coupon;
  }

  public async create(input: CouponCreateInput): Promise<Coupon> {
    if (await this.couponModel.exists({ code: input.code })) throw AppError.conflict("A coupon with this code already exists");
    return (await this.couponModel.create(input)).toObject();
  }

  public async update(id: string, input: CouponUpdateInput): Promise<Coupon> {
    const existing = await this.get(id);
    // Cross-field rules must hold for the merged result, not just the patch.
    const merged = { ...existing, ...input };
    if (merged.discountType === DiscountType.PERCENTAGE && merged.discountValue > 100) {
      throw AppError.badRequest("A percentage discount cannot exceed 100");
    }
    if (merged.startsAt && merged.expiresAt && merged.expiresAt <= merged.startsAt) {
      throw AppError.badRequest("expiresAt must be after startsAt");
    }
    if (input.code && (await this.couponModel.exists({ code: input.code, _id: { $ne: id } }))) {
      throw AppError.conflict("A coupon with this code already exists");
    }
    const coupon = await this.couponModel.findByIdAndUpdate(id, { $set: input }, { new: true }).lean<Coupon>().exec();
    return coupon as Coupon;
  }

  /** Used coupons are deactivated rather than deleted so past bookings keep their reference. */
  public async remove(id: string): Promise<{ deleted: boolean }> {
    const coupon = await this.get(id);
    if (coupon.usageCount > 0 || (await BookingModel.exists({ coupon: coupon._id }))) {
      await this.couponModel.updateOne({ _id: id }, { $set: { isActive: false } }).exec();
      return { deleted: false };
    }
    await this.couponModel.deleteOne({ _id: id }).exec();
    return { deleted: true };
  }
}

export const couponService = new CouponService();
