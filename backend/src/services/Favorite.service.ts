import { Types } from "mongoose";
import { CamperStatus } from "../constants/enums";
import { Message } from "../constants/messages";
import { Camper } from "../interfaces/catalog.interface";
import { CamperModel, FavoriteModel } from "../models";
import { AppError } from "../utils/AppError";
import { buildPaginationMeta, getSkip, PaginatedResult, PaginationInput } from "../utils/pagination";

const isDuplicateKeyError = (error: unknown): boolean =>
  typeof error === "object" && error !== null && (error as { code?: number }).code === 11000;

class FavoriteService {
  private readonly favoriteModel = FavoriteModel;

  /** Idempotent: adding an existing favorite is not an error. Returns whether it was newly created. */
  public async add(memberId: Types.ObjectId, camperId: string): Promise<{ created: boolean }> {
    const camper = await CamperModel.exists({ _id: camperId, status: { $ne: CamperStatus.ARCHIVED } });
    if (!camper) throw AppError.notFound(Message.CAMPER_NOT_FOUND);
    try {
      const result = await this.favoriteModel
        .updateOne({ member: memberId, camper: camperId }, { $setOnInsert: { member: memberId, camper: camperId } }, { upsert: true })
        .exec();
      return { created: result.upsertedCount === 1 };
    } catch (error) {
      // Two simultaneous upserts can race; the unique index guarantees one row either way.
      if (isDuplicateKeyError(error)) return { created: false };
      throw error;
    }
  }

  public async remove(memberId: Types.ObjectId, camperId: string): Promise<void> {
    const result = await this.favoriteModel.deleteOne({ member: memberId, camper: camperId }).exec();
    if (result.deletedCount === 0) throw AppError.notFound("This camper is not in your favorites");
  }

  public async list(memberId: Types.ObjectId, query: PaginationInput): Promise<PaginatedResult<Camper>> {
    const filter = { member: memberId };
    const [favorites, total] = await Promise.all([
      this.favoriteModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(getSkip(query))
        .limit(query.limit)
        .populate<{ camper: Camper | null }>({
          path: "camper",
          match: { status: { $ne: CamperStatus.ARCHIVED } },
          populate: { path: "category", select: "name slug" },
        })
        .lean()
        .exec(),
      this.favoriteModel.countDocuments(filter).exec(),
    ]);
    const items = favorites.map((favorite) => favorite.camper).filter((camper): camper is Camper => camper !== null);
    return { items, meta: buildPaginationMeta(query, total) };
  }

  /** Lightweight list of ids so the frontend can render heart icons on catalog cards. */
  public async ids(memberId: Types.ObjectId): Promise<string[]> {
    const favorites = await this.favoriteModel.find({ member: memberId }).select("camper").lean().exec();
    return favorites.map((favorite) => favorite.camper.toString());
  }
}

export const favoriteService = new FavoriteService();
