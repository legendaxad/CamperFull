import { z } from "zod";
import { Feature } from "../interfaces/catalog.interface";
import { CamperModel, FeatureModel } from "../models";
import { AppError } from "../utils/AppError";
import { uniqueSlug } from "../utils/slug";
import { featureCreateSchema, featureUpdateSchema } from "../validators/catalog.validator";

type FeatureCreateInput = z.infer<typeof featureCreateSchema>;
type FeatureUpdateInput = z.infer<typeof featureUpdateSchema>;

class FeatureService {
  private readonly featureModel = FeatureModel;

  public list(includeInactive = false): Promise<Feature[]> {
    return this.featureModel
      .find(includeInactive ? {} : { isActive: true })
      .sort({ group: 1, name: 1 })
      .lean<Feature[]>()
      .exec();
  }

  public async create(input: FeatureCreateInput): Promise<Feature> {
    const slug = await uniqueSlug(this.featureModel, input.name);
    const feature = await this.featureModel.create({ ...input, slug });
    return feature.toObject();
  }

  public async update(id: string, input: FeatureUpdateInput): Promise<Feature> {
    const slug = input.name ? await uniqueSlug(this.featureModel, input.name, id) : undefined;
    const feature = await this.featureModel
      .findByIdAndUpdate(id, { $set: { ...input, ...(slug ? { slug } : {}) } }, { new: true, runValidators: true })
      .lean<Feature>()
      .exec();
    if (!feature) throw AppError.notFound("Feature not found");
    return feature;
  }

  /** Removing a feature also detaches it from every camper, so no dangling references remain. */
  public async remove(id: string): Promise<void> {
    const feature = await this.featureModel.findByIdAndDelete(id).exec();
    if (!feature) throw AppError.notFound("Feature not found");
    await CamperModel.updateMany({ features: feature._id }, { $pull: { features: feature._id } }).exec();
  }

  /** Throws if any of the ids does not exist; used when campers are created or updated. */
  public async assertExist(ids: string[]): Promise<void> {
    const unique = [...new Set(ids)];
    if (unique.length === 0) return;
    const count = await this.featureModel.countDocuments({ _id: { $in: unique } }).exec();
    if (count !== unique.length) throw AppError.badRequest("One or more features do not exist", [{ field: "features", message: "Unknown feature id" }]);
  }
}

export const featureService = new FeatureService();
