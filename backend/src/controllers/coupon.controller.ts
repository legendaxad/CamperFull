import { Request, Response } from "express";
import { HttpCode } from "../constants/http";
import { getValidated } from "../middleware/validate.middleware";
import { bookingService } from "../services/Booking.service";
import { couponService } from "../services/Coupon.service";
import { AppError } from "../utils/AppError";
import { sendSuccess } from "../utils/response";
import { bookingQuoteSchema } from "../validators/booking.validator";
import { idParamSchema } from "../validators/common.validator";
import { couponCreateSchema, couponListQuerySchema, couponUpdateSchema } from "../validators/coupon.validator";

export const couponController = {
  /** Checks a coupon against a concrete stay and returns the resulting price. */
  validate: async (req: Request, res: Response) => {
    const input = getValidated(req, "body", bookingQuoteSchema);
    if (!input.couponCode) throw AppError.badRequest("couponCode is required", [{ field: "body.couponCode", message: "Required" }]);
    const quote = await bookingService.quote(input, req.member?._id);
    sendSuccess(res, { message: "Coupon applied", data: { couponCode: input.couponCode, discount: quote.price.discount, price: quote.price } });
  },

  /* Admin */
  list: async (req: Request, res: Response) => {
    const { items, meta } = await couponService.list(getValidated(req, "query", couponListQuerySchema));
    sendSuccess(res, { message: "Coupons retrieved", data: items, meta });
  },
  get: async (req: Request, res: Response) => {
    const { id } = getValidated(req, "params", idParamSchema);
    sendSuccess(res, { message: "Coupon retrieved", data: await couponService.get(id) });
  },
  create: async (req: Request, res: Response) => {
    const coupon = await couponService.create(getValidated(req, "body", couponCreateSchema));
    sendSuccess(res, { statusCode: HttpCode.CREATED, message: "Coupon created", data: coupon });
  },
  update: async (req: Request, res: Response) => {
    const { id } = getValidated(req, "params", idParamSchema);
    sendSuccess(res, { message: "Coupon updated", data: await couponService.update(id, getValidated(req, "body", couponUpdateSchema)) });
  },
  remove: async (req: Request, res: Response) => {
    const { id } = getValidated(req, "params", idParamSchema);
    const { deleted } = await couponService.remove(id);
    sendSuccess(res, { message: deleted ? "Coupon deleted" : "Coupon has been used, so it was deactivated instead", data: { deleted } });
  },
};
