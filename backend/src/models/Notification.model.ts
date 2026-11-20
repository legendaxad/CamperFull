import { model, Schema } from "mongoose";
import { NotificationType } from "../constants/enums";
import { Notification } from "../interfaces/engagement.interface";
import { baseSchemaOptions } from "./shared.schemas";

const notificationSchema = new Schema<Notification>(
  {
    recipient: { type: Schema.Types.ObjectId, ref: "Member", required: true },
    type: { type: String, enum: Object.values(NotificationType), required: true },
    title: { type: String, required: true, maxlength: 150 },
    message: { type: String, required: true, maxlength: 1000 },
    data: { type: Map, of: String },
    isRead: { type: Boolean, default: false },
    readAt: { type: Date },
  },
  baseSchemaOptions,
);

notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

export const NotificationModel = model<Notification>("Notification", notificationSchema);
