import { model, Schema } from "mongoose";
import { InquiryStatus } from "../constants/enums";
import { ContactInquiry } from "../interfaces/engagement.interface";
import { baseSchemaOptions } from "./shared.schemas";

/** Contact form messages and camper Q&A questions from the detail page. */
const contactInquirySchema = new Schema<ContactInquiry>(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
    phone: { type: String, trim: true, maxlength: 30 },
    subject: { type: String, required: true, trim: true, maxlength: 200 },
    message: { type: String, required: true, trim: true, maxlength: 5000 },
    camper: { type: Schema.Types.ObjectId, ref: "Camper" },
    member: { type: Schema.Types.ObjectId, ref: "Member" },
    status: { type: String, enum: Object.values(InquiryStatus), default: InquiryStatus.NEW },
    adminReply: { type: String, trim: true, maxlength: 5000 },
    handledBy: { type: Schema.Types.ObjectId, ref: "Member" },
  },
  baseSchemaOptions,
);

contactInquirySchema.index({ status: 1, createdAt: -1 });

export const ContactInquiryModel = model<ContactInquiry>("ContactInquiry", contactInquirySchema);
