import { Request, Response } from "express";
import { HttpCode } from "../constants/http";
import { currentMember } from "../middleware/auth.middleware";
import { uploadedFiles } from "../middleware/upload.middleware";
import { getValidated } from "../middleware/validate.middleware";
import { camperService } from "../services/Camper.service";
import { sendSuccess } from "../utils/response";
import {
  adminCamperListQuerySchema,
  availabilityQuerySchema,
  camperCompareQuerySchema,
  camperCreateSchema,
  camperListQuerySchema,
  camperStatusSchema,
  camperUpdateSchema,
  idOrSlugParamSchema,
  imageParamsSchema,
  reorderImagesSchema,
} from "../validators/catalog.validator";
import { idParamSchema } from "../validators/common.validator";

export const camperController = {
  /* Public catalog */
  list: async (req: Request, res: Response) => {
    const { items, meta } = await camperService.list(getValidated(req, "query", camperListQuerySchema), "public");
    sendSuccess(res, { message: "Campers retrieved", data: items, meta });
  },
  filters: async (_req: Request, res: Response) => {
    sendSuccess(res, { message: "Filter options retrieved", data: await camperService.filterOptions() });
  },
  compare: async (req: Request, res: Response) => {
    const { ids } = getValidated(req, "query", camperCompareQuerySchema);
    sendSuccess(res, { message: "Campers retrieved", data: await camperService.compare(ids) });
  },
  get: async (req: Request, res: Response) => {
    const { idOrSlug } = getValidated(req, "params", idOrSlugParamSchema);
    sendSuccess(res, { message: "Camper retrieved", data: await camperService.getPublic(idOrSlug) });
  },
  availability: async (req: Request, res: Response) => {
    const { idOrSlug } = getValidated(req, "params", idOrSlugParamSchema);
    const { from, to } = getValidated(req, "query", availabilityQuerySchema);
    sendSuccess(res, { message: "Availability retrieved", data: await camperService.availability(idOrSlug, from, to) });
  },

  /* Admin */
  adminList: async (req: Request, res: Response) => {
    const { items, meta } = await camperService.list(getValidated(req, "query", adminCamperListQuerySchema), "admin");
    sendSuccess(res, { message: "Campers retrieved", data: items, meta });
  },
  adminGet: async (req: Request, res: Response) => {
    const { id } = getValidated(req, "params", idParamSchema);
    sendSuccess(res, { message: "Camper retrieved", data: await camperService.getForAdmin(id) });
  },
  create: async (req: Request, res: Response) => {
    const camper = await camperService.create(getValidated(req, "body", camperCreateSchema), currentMember(req)._id);
    sendSuccess(res, { statusCode: HttpCode.CREATED, message: "Camper created", data: camper });
  },
  update: async (req: Request, res: Response) => {
    const { id } = getValidated(req, "params", idParamSchema);
    sendSuccess(res, { message: "Camper updated", data: await camperService.update(id, getValidated(req, "body", camperUpdateSchema)) });
  },
  setStatus: async (req: Request, res: Response) => {
    const { id } = getValidated(req, "params", idParamSchema);
    const { status } = getValidated(req, "body", camperStatusSchema);
    sendSuccess(res, { message: "Camper status updated", data: await camperService.setStatus(id, status) });
  },
  remove: async (req: Request, res: Response) => {
    const { id } = getValidated(req, "params", idParamSchema);
    await camperService.remove(id);
    sendSuccess(res, { message: "Camper deleted" });
  },
  addImages: async (req: Request, res: Response) => {
    const { id } = getValidated(req, "params", idParamSchema);
    sendSuccess(res, { message: "Images uploaded", data: await camperService.addImages(id, uploadedFiles(req)) });
  },
  removeImage: async (req: Request, res: Response) => {
    const { id, imageId } = getValidated(req, "params", imageParamsSchema);
    sendSuccess(res, { message: "Image removed", data: await camperService.removeImage(id, imageId) });
  },
  reorderImages: async (req: Request, res: Response) => {
    const { id } = getValidated(req, "params", idParamSchema);
    const { imageIds } = getValidated(req, "body", reorderImagesSchema);
    sendSuccess(res, { message: "Images reordered", data: await camperService.reorderImages(id, imageIds) });
  },
};
