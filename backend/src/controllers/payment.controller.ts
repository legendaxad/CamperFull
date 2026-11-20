import { Request, Response } from "express";
import { HttpCode } from "../constants/http";
import { currentMember } from "../middleware/auth.middleware";
import { getValidated } from "../middleware/validate.middleware";
import { paymentService } from "../services/Payment.service";
import { sendSuccess } from "../utils/response";
import { idParamSchema } from "../validators/common.validator";
import {
  adminPaymentListQuerySchema,
  checkoutSchema,
  paymentConfirmSchema,
  paymentListQuerySchema,
  refundSchema,
  tossWebhookSchema,
} from "../validators/payment.validator";

export const paymentController = {
  checkout: async (req: Request, res: Response) => {
    const member = currentMember(req);
    const { bookingId } = getValidated(req, "body", checkoutSchema);
    const session = await paymentService.checkout(member._id, bookingId, {
      name: `${member.firstName} ${member.lastName}`,
      email: member.email,
    });
    sendSuccess(res, { statusCode: HttpCode.CREATED, message: "Checkout created", data: session });
  },
  confirm: async (req: Request, res: Response) => {
    const payment = await paymentService.confirm(currentMember(req)._id, getValidated(req, "body", paymentConfirmSchema));
    sendSuccess(res, { message: "Payment confirmed", data: payment });
  },
  tossWebhook: async (req: Request, res: Response) => {
    const { data } = getValidated(req, "body", tossWebhookSchema);
    await paymentService.handleWebhook(data.paymentKey, data.orderId);
    sendSuccess(res, { message: "Webhook processed" });
  },
  listMine: async (req: Request, res: Response) => {
    const { items, meta } = await paymentService.listForCustomer(currentMember(req)._id, getValidated(req, "query", paymentListQuerySchema));
    sendSuccess(res, { message: "Payments retrieved", data: items, meta });
  },
  getMine: async (req: Request, res: Response) => {
    const { id } = getValidated(req, "params", idParamSchema);
    sendSuccess(res, { message: "Payment retrieved", data: await paymentService.getForCustomer(currentMember(req)._id, id) });
  },

  /* Admin */
  adminList: async (req: Request, res: Response) => {
    const { items, meta } = await paymentService.listForAdmin(getValidated(req, "query", adminPaymentListQuerySchema));
    sendSuccess(res, { message: "Payments retrieved", data: items, meta });
  },
  adminGet: async (req: Request, res: Response) => {
    const { id } = getValidated(req, "params", idParamSchema);
    sendSuccess(res, { message: "Payment retrieved", data: await paymentService.getForAdmin(id) });
  },
  refund: async (req: Request, res: Response) => {
    const { id } = getValidated(req, "params", idParamSchema);
    const payment = await paymentService.refund(id, getValidated(req, "body", refundSchema), currentMember(req)._id);
    sendSuccess(res, { message: "Refund processed", data: payment });
  },
};
