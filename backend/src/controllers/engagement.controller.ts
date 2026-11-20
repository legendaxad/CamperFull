import { Request, Response } from "express";
import { HttpCode } from "../constants/http";
import { currentMember } from "../middleware/auth.middleware";
import { getValidated } from "../middleware/validate.middleware";
import { contactInquiryService } from "../services/ContactInquiry.service";
import { favoriteService } from "../services/Favorite.service";
import { reviewService } from "../services/Review.service";
import { sendSuccess } from "../utils/response";
import { idOrSlugParamSchema } from "../validators/catalog.validator";
import { idParamSchema, paginationSchema } from "../validators/common.validator";
import {
  adminInquiryListQuerySchema,
  adminReviewListQuerySchema,
  camperIdParamSchema,
  inquiryCreateSchema,
  inquiryUpdateSchema,
  reviewCreateSchema,
  reviewListQuerySchema,
  reviewModerationSchema,
  reviewUpdateSchema,
} from "../validators/engagement.validator";

export const reviewController = {
  listForCamper: async (req: Request, res: Response) => {
    const { idOrSlug } = getValidated(req, "params", idOrSlugParamSchema);
    const { items, meta, summary } = await reviewService.listForCamper(idOrSlug, getValidated(req, "query", reviewListQuerySchema));
    res.status(HttpCode.OK).json({ success: true, message: "Reviews retrieved", data: items, meta, summary });
  },
  listMine: async (req: Request, res: Response) => {
    const { items, meta } = await reviewService.listMine(currentMember(req)._id, getValidated(req, "query", reviewListQuerySchema));
    sendSuccess(res, { message: "Reviews retrieved", data: items, meta });
  },
  create: async (req: Request, res: Response) => {
    const review = await reviewService.create(currentMember(req)._id, getValidated(req, "body", reviewCreateSchema));
    sendSuccess(res, { statusCode: HttpCode.CREATED, message: "Review posted", data: review });
  },
  update: async (req: Request, res: Response) => {
    const { id } = getValidated(req, "params", idParamSchema);
    sendSuccess(res, { message: "Review updated", data: await reviewService.update(currentMember(req)._id, id, getValidated(req, "body", reviewUpdateSchema)) });
  },
  remove: async (req: Request, res: Response) => {
    const { id } = getValidated(req, "params", idParamSchema);
    await reviewService.remove(currentMember(req)._id, id);
    sendSuccess(res, { message: "Review deleted" });
  },

  /* Admin moderation */
  adminList: async (req: Request, res: Response) => {
    const { items, meta } = await reviewService.listForAdmin(getValidated(req, "query", adminReviewListQuerySchema));
    sendSuccess(res, { message: "Reviews retrieved", data: items, meta });
  },
  moderate: async (req: Request, res: Response) => {
    const { id } = getValidated(req, "params", idParamSchema);
    const review = await reviewService.moderate(id, getValidated(req, "body", reviewModerationSchema), currentMember(req)._id);
    sendSuccess(res, { message: "Review updated", data: review });
  },
  adminRemove: async (req: Request, res: Response) => {
    const { id } = getValidated(req, "params", idParamSchema);
    await reviewService.removeAsAdmin(id);
    sendSuccess(res, { message: "Review deleted" });
  },
};

export const favoriteController = {
  list: async (req: Request, res: Response) => {
    const { items, meta } = await favoriteService.list(currentMember(req)._id, getValidated(req, "query", paginationSchema));
    sendSuccess(res, { message: "Favorites retrieved", data: items, meta });
  },
  ids: async (req: Request, res: Response) => {
    sendSuccess(res, { message: "Favorite ids retrieved", data: await favoriteService.ids(currentMember(req)._id) });
  },
  add: async (req: Request, res: Response) => {
    const { camperId } = getValidated(req, "params", camperIdParamSchema);
    const { created } = await favoriteService.add(currentMember(req)._id, camperId);
    sendSuccess(res, {
      statusCode: created ? HttpCode.CREATED : HttpCode.OK,
      message: created ? "Added to favorites" : "Already in favorites",
    });
  },
  remove: async (req: Request, res: Response) => {
    const { camperId } = getValidated(req, "params", camperIdParamSchema);
    await favoriteService.remove(currentMember(req)._id, camperId);
    sendSuccess(res, { message: "Removed from favorites" });
  },
};

export const inquiryController = {
  create: async (req: Request, res: Response) => {
    const inquiry = await contactInquiryService.create(getValidated(req, "body", inquiryCreateSchema), req.member?._id);
    sendSuccess(res, { statusCode: HttpCode.CREATED, message: "Thank you! We will get back to you soon.", data: { _id: inquiry._id } });
  },
  adminList: async (req: Request, res: Response) => {
    const { items, meta } = await contactInquiryService.list(getValidated(req, "query", adminInquiryListQuerySchema));
    sendSuccess(res, { message: "Inquiries retrieved", data: items, meta });
  },
  adminGet: async (req: Request, res: Response) => {
    const { id } = getValidated(req, "params", idParamSchema);
    sendSuccess(res, { message: "Inquiry retrieved", data: await contactInquiryService.get(id) });
  },
  adminUpdate: async (req: Request, res: Response) => {
    const { id } = getValidated(req, "params", idParamSchema);
    const inquiry = await contactInquiryService.update(id, getValidated(req, "body", inquiryUpdateSchema), currentMember(req)._id);
    sendSuccess(res, { message: "Inquiry updated", data: inquiry });
  },
};
