import { Request, Response } from "express";
import { HttpCode } from "../constants/http";
import { uploadedFiles } from "../middleware/upload.middleware";
import { getValidated } from "../middleware/validate.middleware";
import { campingPlaceService } from "../services/CampingPlace.service";
import { categoryService } from "../services/Category.service";
import { featureService } from "../services/Feature.service";
import { sendSuccess } from "../utils/response";
import {
  campingPlaceCreateSchema,
  campingPlaceListQuerySchema,
  campingPlaceUpdateSchema,
  categoryCreateSchema,
  categoryUpdateSchema,
  featureCreateSchema,
  featureUpdateSchema,
  idOrSlugParamSchema,
  imageParamsSchema,
} from "../validators/catalog.validator";
import { idParamSchema } from "../validators/common.validator";

/** Categories, features and camping places: small reference data managed by admins. */
export const categoryController = {
  list: async (_req: Request, res: Response) => {
    sendSuccess(res, { message: "Categories retrieved", data: await categoryService.list() });
  },
  get: async (req: Request, res: Response) => {
    const { idOrSlug } = getValidated(req, "params", idOrSlugParamSchema);
    sendSuccess(res, { message: "Category retrieved", data: await categoryService.get(idOrSlug) });
  },
  adminList: async (_req: Request, res: Response) => {
    sendSuccess(res, { message: "Categories retrieved", data: await categoryService.list(true) });
  },
  create: async (req: Request, res: Response) => {
    const category = await categoryService.create(getValidated(req, "body", categoryCreateSchema));
    sendSuccess(res, { statusCode: HttpCode.CREATED, message: "Category created", data: category });
  },
  update: async (req: Request, res: Response) => {
    const { id } = getValidated(req, "params", idParamSchema);
    const category = await categoryService.update(id, getValidated(req, "body", categoryUpdateSchema));
    sendSuccess(res, { message: "Category updated", data: category });
  },
  setImage: async (req: Request, res: Response) => {
    const { id } = getValidated(req, "params", idParamSchema);
    const [file] = uploadedFiles(req);
    sendSuccess(res, { message: "Category image updated", data: await categoryService.setImage(id, file as Express.Multer.File) });
  },
  remove: async (req: Request, res: Response) => {
    const { id } = getValidated(req, "params", idParamSchema);
    await categoryService.remove(id);
    sendSuccess(res, { message: "Category deleted" });
  },
};

export const featureController = {
  list: async (_req: Request, res: Response) => {
    sendSuccess(res, { message: "Features retrieved", data: await featureService.list() });
  },
  adminList: async (_req: Request, res: Response) => {
    sendSuccess(res, { message: "Features retrieved", data: await featureService.list(true) });
  },
  create: async (req: Request, res: Response) => {
    const feature = await featureService.create(getValidated(req, "body", featureCreateSchema));
    sendSuccess(res, { statusCode: HttpCode.CREATED, message: "Feature created", data: feature });
  },
  update: async (req: Request, res: Response) => {
    const { id } = getValidated(req, "params", idParamSchema);
    sendSuccess(res, { message: "Feature updated", data: await featureService.update(id, getValidated(req, "body", featureUpdateSchema)) });
  },
  remove: async (req: Request, res: Response) => {
    const { id } = getValidated(req, "params", idParamSchema);
    await featureService.remove(id);
    sendSuccess(res, { message: "Feature deleted" });
  },
};

export const campingPlaceController = {
  list: async (req: Request, res: Response) => {
    const { items, meta } = await campingPlaceService.list(getValidated(req, "query", campingPlaceListQuerySchema));
    sendSuccess(res, { message: "Camping places retrieved", data: items, meta });
  },
  get: async (req: Request, res: Response) => {
    const { idOrSlug } = getValidated(req, "params", idOrSlugParamSchema);
    sendSuccess(res, { message: "Camping place retrieved", data: await campingPlaceService.get(idOrSlug) });
  },
  adminList: async (req: Request, res: Response) => {
    const { items, meta } = await campingPlaceService.list(getValidated(req, "query", campingPlaceListQuerySchema), true);
    sendSuccess(res, { message: "Camping places retrieved", data: items, meta });
  },
  create: async (req: Request, res: Response) => {
    const place = await campingPlaceService.create(getValidated(req, "body", campingPlaceCreateSchema));
    sendSuccess(res, { statusCode: HttpCode.CREATED, message: "Camping place created", data: place });
  },
  update: async (req: Request, res: Response) => {
    const { id } = getValidated(req, "params", idParamSchema);
    sendSuccess(res, { message: "Camping place updated", data: await campingPlaceService.update(id, getValidated(req, "body", campingPlaceUpdateSchema)) });
  },
  addImages: async (req: Request, res: Response) => {
    const { id } = getValidated(req, "params", idParamSchema);
    sendSuccess(res, { message: "Images uploaded", data: await campingPlaceService.addImages(id, uploadedFiles(req)) });
  },
  removeImage: async (req: Request, res: Response) => {
    const { id, imageId } = getValidated(req, "params", imageParamsSchema);
    sendSuccess(res, { message: "Image removed", data: await campingPlaceService.removeImage(id, imageId) });
  },
  remove: async (req: Request, res: Response) => {
    const { id } = getValidated(req, "params", idParamSchema);
    await campingPlaceService.remove(id);
    sendSuccess(res, { message: "Camping place deleted" });
  },
};
