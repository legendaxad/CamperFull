import { FilterQuery } from "mongoose";
import { z } from "zod";
import { ImageFolder } from "../constants/enums";
import { CampingPlace } from "../interfaces/catalog.interface";
import { CampingPlaceModel } from "../models";
import { AppError } from "../utils/AppError";
import { buildPaginationMeta, getSkip, PaginatedResult } from "../utils/pagination";
import { idOrSlugFilter, uniqueSlug } from "../utils/slug";
import { containsRegex } from "../utils/strings";
import {
  campingPlaceCreateSchema,
  campingPlaceListQuerySchema,
  campingPlaceUpdateSchema,
} from "../validators/catalog.validator";
import { ImageFile, uploadService } from "./Upload.service";

type CreateInput = z.infer<typeof campingPlaceCreateSchema>;
type UpdateInput = z.infer<typeof campingPlaceUpdateSchema>;
type ListQuery = z.infer<typeof campingPlaceListQuerySchema>;

class CampingPlaceService {
  private readonly campingPlaceModel = CampingPlaceModel;

  public async list(query: ListQuery, includeInactive = false): Promise<PaginatedResult<CampingPlace>> {
    const filter: FilterQuery<CampingPlace> = includeInactive ? {} : { isActive: true };
    if (query.region) filter.region = containsRegex(query.region);
    if (query.search) {
      const regex = containsRegex(query.search);
      filter.$or = [{ name: regex }, { city: regex }, { region: regex }];
    }
    const [items, total] = await Promise.all([
      this.campingPlaceModel.find(filter).sort({ name: 1 }).skip(getSkip(query)).limit(query.limit).lean<CampingPlace[]>().exec(),
      this.campingPlaceModel.countDocuments(filter).exec(),
    ]);
    return { items, meta: buildPaginationMeta(query, total) };
  }

  public async get(idOrSlug: string, includeInactive = false): Promise<CampingPlace> {
    const place = await this.campingPlaceModel
      .findOne({ ...idOrSlugFilter(idOrSlug), ...(includeInactive ? {} : { isActive: true }) })
      .lean<CampingPlace>()
      .exec();
    if (!place) throw AppError.notFound("Camping place not found");
    return place;
  }

  public async create(input: CreateInput): Promise<CampingPlace> {
    const slug = await uniqueSlug(this.campingPlaceModel, input.name);
    return (await this.campingPlaceModel.create({ ...input, slug })).toObject();
  }

  public async update(id: string, input: UpdateInput): Promise<CampingPlace> {
    const slug = input.name ? await uniqueSlug(this.campingPlaceModel, input.name, id) : undefined;
    const place = await this.campingPlaceModel
      .findByIdAndUpdate(id, { $set: { ...input, ...(slug ? { slug } : {}) } }, { new: true, runValidators: true })
      .lean<CampingPlace>()
      .exec();
    if (!place) throw AppError.notFound("Camping place not found");
    return place;
  }

  public async addImages(id: string, files: ImageFile[]): Promise<CampingPlace> {
    await this.get(id, true);
    const images = await uploadService.uploadImages(files, ImageFolder.CAMPING_PLACES);
    const place = await this.campingPlaceModel.findByIdAndUpdate(id, { $push: { images: { $each: images } } }, { new: true }).lean<CampingPlace>().exec();
    return place as CampingPlace;
  }

  public async removeImage(id: string, imageId: string): Promise<CampingPlace> {
    const place = await this.get(id, true);
    const image = place.images.find((item) => item._id?.toString() === imageId);
    if (!image) throw AppError.notFound("Image not found");
    const updated = await this.campingPlaceModel.findByIdAndUpdate(id, { $pull: { images: { _id: imageId } } }, { new: true }).lean<CampingPlace>().exec();
    await uploadService.deleteImages([image]);
    return updated as CampingPlace;
  }

  public async remove(id: string): Promise<void> {
    const place = await this.campingPlaceModel.findByIdAndDelete(id).lean<CampingPlace>().exec();
    if (!place) throw AppError.notFound("Camping place not found");
    await uploadService.deleteImages(place.images);
  }
}

export const campingPlaceService = new CampingPlaceService();
