import { Request, Response } from "express";
import { HttpCode } from "../constants/http";
import { currentMember } from "../middleware/auth.middleware";
import { getValidated } from "../middleware/validate.middleware";
import { MemberModel } from "../models";
import { notificationService } from "../services/Notification.service";
import { AppError } from "../utils/AppError";
import { sendSuccess } from "../utils/response";
import { idParamSchema } from "../validators/common.validator";
import { adminSendNotificationSchema, notificationListQuerySchema } from "../validators/engagement.validator";

/** Works for both customers and admins: each sees only their own notifications. */
export const notificationController = {
  list: async (req: Request, res: Response) => {
    const { items, meta } = await notificationService.list(currentMember(req)._id, getValidated(req, "query", notificationListQuerySchema));
    sendSuccess(res, { message: "Notifications retrieved", data: items, meta });
  },
  unreadCount: async (req: Request, res: Response) => {
    sendSuccess(res, { message: "Unread count retrieved", data: { count: await notificationService.unreadCount(currentMember(req)._id) } });
  },
  markRead: async (req: Request, res: Response) => {
    const { id } = getValidated(req, "params", idParamSchema);
    sendSuccess(res, { message: "Notification marked as read", data: await notificationService.markRead(currentMember(req)._id, id) });
  },
  markAllRead: async (req: Request, res: Response) => {
    const updated = await notificationService.markAllRead(currentMember(req)._id);
    sendSuccess(res, { message: "All notifications marked as read", data: { updated } });
  },
  remove: async (req: Request, res: Response) => {
    const { id } = getValidated(req, "params", idParamSchema);
    await notificationService.remove(currentMember(req)._id, id);
    sendSuccess(res, { message: "Notification deleted" });
  },

  /** Admin: send a message to a specific member (e.g. about their booking). */
  send: async (req: Request, res: Response) => {
    const { recipientId, ...input } = getValidated(req, "body", adminSendNotificationSchema);
    const recipient = await MemberModel.findById(recipientId).select("_id").lean().exec();
    if (!recipient) throw AppError.notFound("Recipient not found");
    await notificationService.notifyMember(recipient._id, input);
    sendSuccess(res, { statusCode: HttpCode.CREATED, message: "Notification sent" });
  },
};
