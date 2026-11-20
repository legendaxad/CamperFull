import { FilterQuery, Types } from "mongoose";
import { z } from "zod";
import { BookingStatus, CamperStatus, NotificationType, ReviewStatus } from "../constants/enums";
import { Message } from "../constants/messages";
import { Review } from "../interfaces/engagement.interface";
import { BookingModel, CamperModel, ReviewModel } from "../models";
import { AppError } from "../utils/AppError";
import { buildPaginationMeta, getSkip, PaginatedResult } from "../utils/pagination";
import { idOrSlugFilter } from "../utils/slug";
import { containsRegex } from "../utils/strings";
import {
  AdminReviewListQuery,
  ReviewCreateInput,
  reviewListQuerySchema,
  reviewModerationSchema,
  ReviewUpdateInput,
} from "../validators/engagement.validator";
import { notificationService } from "./Notification.service";

type ReviewListQuery = z.infer<typeof reviewListQuerySchema>;
type ModerationInput = z.infer<typeof reviewModerationSchema>;

export interface RatingSummary {
  average: number;
  count: number;
  distribution: Record<"1" | "2" | "3" | "4" | "5", number>;
}

const PUBLIC_SORTS: Record<ReviewListQuery["sort"], Record<string, 1 | -1>> = {
  newest: { createdAt: -1 },
  highest: { rating: -1, createdAt: -1 },
  lowest: { rating: 1, createdAt: -1 },
};

// Public reviews show the reviewer's first name only.
const PUBLIC_REVIEWER_FIELDS = "firstName avatar";

class ReviewService {
  private readonly reviewModel = ReviewModel;

  /** Only the customer who completed the booking can review it, once. */
  public async create(customerId: Types.ObjectId, input: ReviewCreateInput): Promise<Review> {
    const booking = await BookingModel.findOne({ _id: input.bookingId, customer: customerId }).lean().exec();
    if (!booking) throw AppError.notFound(Message.BOOKING_NOT_FOUND);
    if (booking.status !== BookingStatus.COMPLETED) throw AppError.badRequest("You can review a camper only after your trip is completed");
    if (await this.reviewModel.exists({ booking: booking._id })) throw AppError.conflict("You have already reviewed this booking");

    const review = await this.reviewModel.create({
      booking: booking._id,
      camper: booking.camper,
      customer: customerId,
      rating: input.rating,
      comment: input.comment,
    });
    await this.recalculateCamperRating(booking.camper);
    await notificationService.notifyAdmins({
      type: NotificationType.REVIEW_CREATED,
      title: "New review",
      message: `A ${input.rating}-star review was posted for booking ${booking.bookingNumber}.`,
      data: { reviewId: review._id.toString(), camperId: booking.camper.toString() },
    });
    return review.toObject();
  }

  public async update(customerId: Types.ObjectId, reviewId: string, input: ReviewUpdateInput): Promise<Review> {
    const review = await this.reviewModel
      .findOneAndUpdate({ _id: reviewId, customer: customerId }, { $set: input }, { new: true, runValidators: true })
      .lean<Review>()
      .exec();
    if (!review) throw AppError.notFound("Review not found");
    await this.recalculateCamperRating(review.camper);
    return review;
  }

  public async remove(customerId: Types.ObjectId, reviewId: string): Promise<void> {
    const review = await this.reviewModel.findOneAndDelete({ _id: reviewId, customer: customerId }).lean<Review>().exec();
    if (!review) throw AppError.notFound("Review not found");
    await this.recalculateCamperRating(review.camper);
  }

  public async listForCamper(idOrSlug: string, query: ReviewListQuery): Promise<PaginatedResult<Review> & { summary: RatingSummary }> {
    const camper = await CamperModel.findOne({ ...idOrSlugFilter(idOrSlug), status: { $ne: CamperStatus.ARCHIVED } }).select("_id").lean().exec();
    if (!camper) throw AppError.notFound(Message.CAMPER_NOT_FOUND);

    const filter = { camper: camper._id, status: ReviewStatus.PUBLISHED };
    const [items, total, summary] = await Promise.all([
      this.reviewModel
        .find(filter)
        .sort(PUBLIC_SORTS[query.sort])
        .skip(getSkip(query))
        .limit(query.limit)
        .select("-booking -moderatedBy")
        .populate("customer", PUBLIC_REVIEWER_FIELDS)
        .lean<Review[]>()
        .exec(),
      this.reviewModel.countDocuments(filter).exec(),
      this.ratingSummary(camper._id),
    ]);
    return { items, meta: buildPaginationMeta(query, total), summary };
  }

  public async listMine(customerId: Types.ObjectId, query: ReviewListQuery): Promise<PaginatedResult<Review>> {
    const filter = { customer: customerId };
    const [items, total] = await Promise.all([
      this.reviewModel.find(filter).sort({ createdAt: -1 }).skip(getSkip(query)).limit(query.limit).populate("camper", "name slug images").lean<Review[]>().exec(),
      this.reviewModel.countDocuments(filter).exec(),
    ]);
    return { items, meta: buildPaginationMeta(query, total) };
  }

  /* ---------------- Admin moderation ---------------- */

  public async listForAdmin(query: AdminReviewListQuery): Promise<PaginatedResult<Review>> {
    const filter: FilterQuery<Review> = {};
    if (query.status) filter.status = query.status;
    if (query.camperId) filter.camper = query.camperId;
    if (query.rating) filter.rating = query.rating;
    if (query.search) filter.comment = containsRegex(query.search);
    const [items, total] = await Promise.all([
      this.reviewModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(getSkip(query))
        .limit(query.limit)
        .populate("camper", "name slug")
        .populate("customer", "firstName lastName email")
        .lean<Review[]>()
        .exec(),
      this.reviewModel.countDocuments(filter).exec(),
    ]);
    return { items, meta: buildPaginationMeta(query, total) };
  }

  public async moderate(reviewId: string, input: ModerationInput, adminId: Types.ObjectId): Promise<Review> {
    const review = await this.reviewModel
      .findByIdAndUpdate(reviewId, { $set: { ...input, moderatedBy: adminId } }, { new: true })
      .lean<Review>()
      .exec();
    if (!review) throw AppError.notFound("Review not found");
    if (input.status) await this.recalculateCamperRating(review.camper);
    return review;
  }

  public async removeAsAdmin(reviewId: string): Promise<void> {
    const review = await this.reviewModel.findByIdAndDelete(reviewId).lean<Review>().exec();
    if (!review) throw AppError.notFound("Review not found");
    await this.recalculateCamperRating(review.camper);
  }

  /** Stores the rating on the camper so catalog listing and sorting need no join. Hidden reviews do not count. */
  public async recalculateCamperRating(camperId: Types.ObjectId): Promise<void> {
    const [result] = await this.reviewModel
      .aggregate<{ average: number; count: number }>([
        { $match: { camper: camperId, status: ReviewStatus.PUBLISHED } },
        { $group: { _id: null, average: { $avg: "$rating" }, count: { $sum: 1 } } },
      ])
      .exec();
    await CamperModel.updateOne(
      { _id: camperId },
      { $set: { ratingAverage: result ? Math.round(result.average * 10) / 10 : 0, ratingCount: result?.count ?? 0 } },
    ).exec();
  }

  private async ratingSummary(camperId: Types.ObjectId): Promise<RatingSummary> {
    const rows = await this.reviewModel
      .aggregate<{ _id: number; count: number }>([
        { $match: { camper: camperId, status: ReviewStatus.PUBLISHED } },
        { $group: { _id: "$rating", count: { $sum: 1 } } },
      ])
      .exec();
    const distribution = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 };
    let count = 0;
    let sum = 0;
    for (const row of rows) {
      distribution[String(row._id) as keyof typeof distribution] = row.count;
      count += row.count;
      sum += row._id * row.count;
    }
    return { average: count ? Math.round((sum / count) * 10) / 10 : 0, count, distribution };
  }
}

export const reviewService = new ReviewService();
