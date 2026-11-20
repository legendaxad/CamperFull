import { FilterQuery, Types } from "mongoose";
import { CamperStatus, ImageFolder } from "../constants/enums";
import { Message } from "../constants/messages";
import { Camper } from "../interfaces/catalog.interface";
import { BookingModel, CamperModel, CategoryModel, FavoriteModel } from "../models";
import { AppError } from "../utils/AppError";
import { buildPaginationMeta, getSkip, PaginatedResult } from "../utils/pagination";
import { idOrSlugFilter, uniqueSlug } from "../utils/slug";
import { containsRegex } from "../utils/strings";
import { CamperCreateInput, CamperListQuery, CamperUpdateInput } from "../validators/catalog.validator";
import { availabilityService, BlockedRange } from "./Availability.service";
import { featureService } from "./Feature.service";
import { ImageFile, uploadService } from "./Upload.service";

const MAX_IMAGES_PER_CAMPER = 20;

const SORTS: Record<CamperListQuery["sort"], Record<string, 1 | -1>> = {
  newest: { createdAt: -1, _id: -1 },
  price_asc: { "pricing.dailyRate": 1, _id: 1 },
  price_desc: { "pricing.dailyRate": -1, _id: -1 },
  rating: { ratingAverage: -1, ratingCount: -1, _id: -1 },
  popular: { viewCount: -1, _id: -1 },
};

const CATEGORY_FIELDS = "name slug";
const FEATURE_FIELDS = "name slug group icon";

export interface CamperFilterOptions {
  brands: string[];
  companies: string[];
  regions: string[];
  licenseTypes: string[];
  priceRange: { min: number; max: number };
  maxSeats: number;
}

type ListMode = "public" | "admin";

class CamperService {
  private readonly camperModel = CamperModel;

  public async list(query: CamperListQuery, mode: ListMode): Promise<PaginatedResult<Camper>> {
    const filter = await this.buildFilter(query, mode);
    const [items, total] = await Promise.all([
      this.camperModel
        .find(filter)
        .sort(SORTS[query.sort])
        .skip(getSkip(query))
        .limit(query.limit)
        .populate("category", CATEGORY_FIELDS)
        .populate("features", FEATURE_FIELDS)
        .lean<Camper[]>()
        .exec(),
      this.camperModel.countDocuments(filter).exec(),
    ]);
    return { items, meta: buildPaginationMeta(query, total) };
  }

  /** Public detail page. Archived campers are hidden; each view is counted for "popular" sorting. */
  public async getPublic(idOrSlug: string): Promise<Camper> {
    const camper = await this.camperModel
      .findOneAndUpdate(
        { ...idOrSlugFilter(idOrSlug), status: { $ne: CamperStatus.ARCHIVED } },
        { $inc: { viewCount: 1 } },
        { new: true },
      )
      .populate("category", CATEGORY_FIELDS)
      .populate("features", FEATURE_FIELDS)
      .lean<Camper>()
      .exec();
    if (!camper) throw AppError.notFound(Message.CAMPER_NOT_FOUND);
    return camper;
  }

  public async getForAdmin(id: string): Promise<Camper> {
    const camper = await this.camperModel
      .findById(id)
      .populate("category", CATEGORY_FIELDS)
      .populate("features", FEATURE_FIELDS)
      .lean<Camper>()
      .exec();
    if (!camper) throw AppError.notFound(Message.CAMPER_NOT_FOUND);
    return camper;
  }

  public async create(input: CamperCreateInput, createdBy: Types.ObjectId): Promise<Camper> {
    await this.assertReferencesExist(input.category, input.features);
    const slug = await uniqueSlug(this.camperModel, input.name);
    const camper = await this.camperModel.create({ ...input, slug, createdBy });
    return this.getForAdmin(camper._id.toString());
  }

  public async update(id: string, input: CamperUpdateInput): Promise<Camper> {
    const existing = await this.camperModel.findById(id).select("minNights maxNights").lean().exec();
    if (!existing) throw AppError.notFound(Message.CAMPER_NOT_FOUND);

    const minNights = input.minNights ?? existing.minNights;
    const maxNights = input.maxNights ?? existing.maxNights;
    if (minNights > maxNights) throw AppError.badRequest("maxNights must be greater than or equal to minNights");

    await this.assertReferencesExist(input.category, input.features);
    const slug = input.name ? await uniqueSlug(this.camperModel, input.name, id) : undefined;

    await this.camperModel
      .updateOne({ _id: id }, { $set: { ...input, ...(slug ? { slug } : {}) } }, { runValidators: true })
      .exec();
    return this.getForAdmin(id);
  }

  public async setStatus(id: string, status: CamperStatus): Promise<Camper> {
    const result = await this.camperModel.updateOne({ _id: id }, { $set: { status } }).exec();
    if (result.matchedCount === 0) throw AppError.notFound(Message.CAMPER_NOT_FOUND);
    return this.getForAdmin(id);
  }

  /**
   * Permanent deletion is only allowed for campers that were never booked;
   * otherwise booking history and revenue reports would lose their camper.
   * Campers with history should be archived instead.
   */
  public async remove(id: string): Promise<void> {
    const hasBookings = await BookingModel.exists({ camper: id });
    if (hasBookings) throw AppError.conflict("This camper has bookings and cannot be deleted. Archive it instead.");

    const camper = await this.camperModel.findByIdAndDelete(id).lean<Camper>().exec();
    if (!camper) throw AppError.notFound(Message.CAMPER_NOT_FOUND);
    await FavoriteModel.deleteMany({ camper: camper._id }).exec();
    await uploadService.deleteImages(camper.images);
  }

  public async addImages(id: string, files: ImageFile[]): Promise<Camper> {
    const camper = await this.getForAdmin(id);
    if (camper.images.length + files.length > MAX_IMAGES_PER_CAMPER) {
      throw AppError.badRequest(`A camper can have at most ${MAX_IMAGES_PER_CAMPER} images`);
    }
    const images = await uploadService.uploadImages(files, ImageFolder.CAMPERS);
    const alt = camper.name;
    await this.camperModel
      .updateOne({ _id: id }, { $push: { images: { $each: images.map((image) => ({ ...image, alt })) } } })
      .exec();
    return this.getForAdmin(id);
  }

  public async removeImage(id: string, imageId: string): Promise<Camper> {
    const camper = await this.getForAdmin(id);
    const image = camper.images.find((item) => item._id?.toString() === imageId);
    if (!image) throw AppError.notFound("Image not found");
    await this.camperModel.updateOne({ _id: id }, { $pull: { images: { _id: image._id } } }).exec();
    await uploadService.deleteImages([image]);
    return this.getForAdmin(id);
  }

  /** The first image is the cover photo, so ordering matters to the frontend. */
  public async reorderImages(id: string, imageIds: string[]): Promise<Camper> {
    const camper = await this.getForAdmin(id);
    const current = camper.images.map((image) => image._id?.toString());
    const sameSet = imageIds.length === current.length && imageIds.every((imageId) => current.includes(imageId));
    if (!sameSet) throw AppError.badRequest("imageIds must contain every image of the camper exactly once");

    const reordered = imageIds.map((imageId) => camper.images.find((image) => image._id?.toString() === imageId));
    await this.camperModel.updateOne({ _id: id }, { $set: { images: reordered } }).exec();
    return this.getForAdmin(id);
  }

  /** Values for the catalog's filter sidebar, computed from bookable campers only. */
  public async filterOptions(): Promise<CamperFilterOptions> {
    const [result] = await this.camperModel
      .aggregate<{
        brands: (string | null)[];
        companies: (string | null)[];
        regions: string[];
        licenseTypes: string[];
        minPrice: number;
        maxPrice: number;
        maxSeats: number;
      }>([
        { $match: { status: CamperStatus.AVAILABLE } },
        {
          $group: {
            _id: null,
            brands: { $addToSet: "$brand" },
            companies: { $addToSet: "$company" },
            regions: { $addToSet: "$location.region" },
            licenseTypes: { $addToSet: "$licenseType" },
            minPrice: { $min: "$pricing.dailyRate" },
            maxPrice: { $max: "$pricing.dailyRate" },
            maxSeats: { $max: "$capacity.seats" },
          },
        },
      ])
      .exec();

    const clean = (values: (string | null)[] = []) =>
      values.filter((value): value is string => Boolean(value)).sort((a, b) => a.localeCompare(b));
    return {
      brands: clean(result?.brands),
      companies: clean(result?.companies),
      regions: clean(result?.regions),
      licenseTypes: clean(result?.licenseTypes),
      priceRange: { min: result?.minPrice ?? 0, max: result?.maxPrice ?? 0 },
      maxSeats: result?.maxSeats ?? 0,
    };
  }

  /** Side-by-side comparison (the frontend "Compare" button). Order follows the requested ids. */
  public async compare(ids: string[]): Promise<Camper[]> {
    const campers = await this.camperModel
      .find({ _id: { $in: ids }, status: { $ne: CamperStatus.ARCHIVED } })
      .populate("category", CATEGORY_FIELDS)
      .populate("features", FEATURE_FIELDS)
      .lean<Camper[]>()
      .exec();
    return ids
      .map((id) => campers.find((camper) => camper._id.toString() === id))
      .filter((camper): camper is Camper => Boolean(camper));
  }

  public async availability(idOrSlug: string, from: Date, to: Date): Promise<{ camperId: string; blocked: BlockedRange[] }> {
    const camper = await this.camperModel
      .findOne({ ...idOrSlugFilter(idOrSlug), status: { $ne: CamperStatus.ARCHIVED } })
      .select("_id")
      .lean()
      .exec();
    if (!camper) throw AppError.notFound(Message.CAMPER_NOT_FOUND);
    return { camperId: camper._id.toString(), blocked: await availabilityService.blockedRanges(camper._id, from, to) };
  }

  private async buildFilter(query: CamperListQuery, mode: ListMode): Promise<FilterQuery<Camper>> {
    const filter: FilterQuery<Camper> = {};

    if (mode === "public") filter.status = CamperStatus.AVAILABLE;
    else filter.status = query.status?.length ? { $in: query.status } : { $ne: CamperStatus.ARCHIVED };

    if (query.category) {
      const category = await CategoryModel.findOne(idOrSlugFilter(query.category)).select("_id").lean().exec();
      // An unknown category simply yields no results rather than an error.
      filter.category = category?._id ?? new Types.ObjectId();
    }
    if (query.search) {
      const regex = containsRegex(query.search);
      filter.$or = [{ name: regex }, { brand: regex }, { company: regex }, { baseVehicle: regex }, { "location.region": regex }];
    }
    if (query.brand?.length) filter.brand = { $in: query.brand };
    if (query.company?.length) filter.company = { $in: query.company };
    if (query.region?.length) filter["location.region"] = { $in: query.region };
    if (query.licenseType?.length) filter.licenseType = { $in: query.licenseType };
    if (query.features?.length) filter.features = { $all: query.features.map((id) => new Types.ObjectId(id)) };
    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      filter["pricing.dailyRate"] = {
        ...(query.minPrice !== undefined ? { $gte: query.minPrice } : {}),
        ...(query.maxPrice !== undefined ? { $lte: query.maxPrice } : {}),
      };
    }
    if (query.minSeats) filter["capacity.seats"] = { $gte: query.minSeats };
    if (query.minSleeps) filter["capacity.sleeps"] = { $gte: query.minSleeps };
    if (query.featured !== undefined) filter.isFeatured = query.featured;
    if (query.startDate && query.endDate) {
      filter._id = { $nin: await availabilityService.busyCamperIds(query.startDate, query.endDate) };
    }
    return filter;
  }

  private async assertReferencesExist(categoryId?: string, featureIds?: string[]): Promise<void> {
    if (categoryId && !(await CategoryModel.exists({ _id: categoryId }))) {
      throw AppError.badRequest("Category does not exist", [{ field: "category", message: "Unknown category id" }]);
    }
    if (featureIds) await featureService.assertExist(featureIds);
  }
}

export const camperService = new CamperService();
