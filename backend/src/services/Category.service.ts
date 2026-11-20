import { z } from "zod";
import { ImageFolder } from "../constants/enums";
import { Category } from "../interfaces/catalog.interface";
import { CamperModel, CategoryModel } from "../models";
import { AppError } from "../utils/AppError";
import { idOrSlugFilter, uniqueSlug } from "../utils/slug";
import { categoryCreateSchema, categoryUpdateSchema } from "../validators/catalog.validator";
import { ImageFile, uploadService } from "./Upload.service";

type CategoryCreateInput = z.infer<typeof categoryCreateSchema>;
type CategoryUpdateInput = z.infer<typeof categoryUpdateSchema>;

class CategoryService {
  private readonly categoryModel = CategoryModel;

  /** Public list includes only active categories, each with its count of bookable campers. */
  public async list(includeInactive = false): Promise<(Category & { camperCount: number })[]> {
    const categories = await this.categoryModel
      .find(includeInactive ? {} : { isActive: true })
      .sort({ sortOrder: 1, name: 1 })
      .lean<Category[]>()
      .exec();
    const counts = await CamperModel.aggregate<{ _id: unknown; count: number }>([
      { $match: { status: "AVAILABLE" } },
      { $group: { _id: "$category", count: { $sum: 1 } } },
    ]).exec();
    return categories.map((category) => ({
      ...category,
      camperCount: counts.find((row) => String(row._id) === category._id.toString())?.count ?? 0,
    }));
  }

  public async get(idOrSlug: string, includeInactive = false): Promise<Category> {
    const category = await this.categoryModel
      .findOne({ ...idOrSlugFilter(idOrSlug), ...(includeInactive ? {} : { isActive: true }) })
      .lean<Category>()
      .exec();
    if (!category) throw AppError.notFound("Category not found");
    return category;
  }

  public async create(input: CategoryCreateInput): Promise<Category> {
    const slug = await uniqueSlug(this.categoryModel, input.name);
    const category = await this.categoryModel.create({ ...input, slug });
    return category.toObject();
  }

  public async update(id: string, input: CategoryUpdateInput): Promise<Category> {
    const slug = input.name ? await uniqueSlug(this.categoryModel, input.name, id) : undefined;
    const category = await this.categoryModel
      .findByIdAndUpdate(id, { $set: { ...input, ...(slug ? { slug } : {}) } }, { new: true, runValidators: true })
      .lean<Category>()
      .exec();
    if (!category) throw AppError.notFound("Category not found");
    return category;
  }

  public async setImage(id: string, file: ImageFile): Promise<Category> {
    const existing = await this.get(id, true);
    const image = await uploadService.uploadImage(file, ImageFolder.CATEGORIES);
    const category = await this.categoryModel.findByIdAndUpdate(id, { $set: { image } }, { new: true }).lean<Category>().exec();
    if (existing.image) await uploadService.deleteImages([existing.image]);
    return category as Category;
  }

  /** A category in use cannot be deleted; deactivate it instead so existing campers stay valid. */
  public async remove(id: string): Promise<void> {
    const inUse = await CamperModel.exists({ category: id });
    if (inUse) throw AppError.conflict("This category is used by campers. Deactivate it or move the campers first.");
    const category = await this.categoryModel.findByIdAndDelete(id).lean<Category>().exec();
    if (!category) throw AppError.notFound("Category not found");
    if (category.image) await uploadService.deleteImages([category.image]);
  }
}

export const categoryService = new CategoryService();
