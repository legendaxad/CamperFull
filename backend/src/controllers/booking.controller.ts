import { Request, Response } from "express";
import { HttpCode } from "../constants/http";
import { currentMember } from "../middleware/auth.middleware";
import { getValidated } from "../middleware/validate.middleware";
import { bookingService } from "../services/Booking.service";
import { paymentService } from "../services/Payment.service";
import { sendSuccess } from "../utils/response";
import {
  adminBookingListQuerySchema,
  adminBookingNoteSchema,
  adminBookingStatusSchema,
  bookingCreateSchema,
  bookingQuoteSchema,
  cancelBookingSchema,
  customerBookingListQuerySchema,
} from "../validators/booking.validator";
import { idParamSchema } from "../validators/common.validator";

export const bookingController = {
  /* Customer */
  quote: async (req: Request, res: Response) => {
    const quote = await bookingService.quote(getValidated(req, "body", bookingQuoteSchema), req.member?._id);
    sendSuccess(res, { message: "Quote calculated", data: quote });
  },
  create: async (req: Request, res: Response) => {
    const booking = await bookingService.create(currentMember(req)._id, getValidated(req, "body", bookingCreateSchema));
    sendSuccess(res, { statusCode: HttpCode.CREATED, message: "Booking created. Complete payment to confirm it.", data: booking });
  },
  listMine: async (req: Request, res: Response) => {
    const { items, meta } = await bookingService.listForCustomer(currentMember(req)._id, getValidated(req, "query", customerBookingListQuerySchema));
    sendSuccess(res, { message: "Bookings retrieved", data: items, meta });
  },
  getMine: async (req: Request, res: Response) => {
    const { id } = getValidated(req, "params", idParamSchema);
    sendSuccess(res, { message: "Booking retrieved", data: await bookingService.getForCustomer(id, currentMember(req)._id) });
  },
  cancelMine: async (req: Request, res: Response) => {
    const { id } = getValidated(req, "params", idParamSchema);
    const { reason } = getValidated(req, "body", cancelBookingSchema);
    const booking = await paymentService.cancelBookingAsCustomer(currentMember(req)._id, id, reason);
    sendSuccess(res, { message: "Booking cancelled", data: booking });
  },

  /* Admin */
  adminList: async (req: Request, res: Response) => {
    const { items, meta } = await bookingService.listForAdmin(getValidated(req, "query", adminBookingListQuerySchema));
    sendSuccess(res, { message: "Bookings retrieved", data: items, meta });
  },
  adminGet: async (req: Request, res: Response) => {
    const { id } = getValidated(req, "params", idParamSchema);
    sendSuccess(res, { message: "Booking retrieved", data: await bookingService.getForAdmin(id) });
  },
  adminUpdateStatus: async (req: Request, res: Response) => {
    const { id } = getValidated(req, "params", idParamSchema);
    const input = getValidated(req, "body", adminBookingStatusSchema);
    const booking = await paymentService.adminUpdateBookingStatus(id, input, currentMember(req)._id);
    sendSuccess(res, { message: `Booking is now ${booking.status}`, data: booking });
  },
  adminUpdateNote: async (req: Request, res: Response) => {
    const { id } = getValidated(req, "params", idParamSchema);
    const { adminNote } = getValidated(req, "body", adminBookingNoteSchema);
    sendSuccess(res, { message: "Booking note saved", data: await bookingService.setAdminNote(id, adminNote) });
  },
};
