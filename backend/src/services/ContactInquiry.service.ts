import { FilterQuery, Types } from "mongoose";
import { z } from "zod";
import { CamperStatus, NotificationType } from "../constants/enums";
import { Message } from "../constants/messages";
import { ContactInquiry } from "../interfaces/engagement.interface";
import { CamperModel, ContactInquiryModel } from "../models";
import { AppError } from "../utils/AppError";
import { buildPaginationMeta, getSkip, PaginatedResult } from "../utils/pagination";
import { containsRegex } from "../utils/strings";
import { adminInquiryListQuerySchema, InquiryCreateInput, inquiryUpdateSchema } from "../validators/engagement.validator";
import { notificationService } from "./Notification.service";

type AdminListQuery = z.infer<typeof adminInquiryListQuerySchema>;
type UpdateInput = z.infer<typeof inquiryUpdateSchema>;

class ContactInquiryService {
  private readonly inquiryModel = ContactInquiryModel;

  public async create(input: InquiryCreateInput, memberId?: Types.ObjectId): Promise<ContactInquiry> {
    if (input.camperId && !(await CamperModel.exists({ _id: input.camperId, status: { $ne: CamperStatus.ARCHIVED } }))) {
      throw AppError.notFound(Message.CAMPER_NOT_FOUND);
    }
    const { camperId, ...rest } = input;
    const inquiry = await this.inquiryModel.create({ ...rest, camper: camperId, member: memberId });

    await notificationService.notifyAdmins({
      type: NotificationType.INQUIRY_RECEIVED,
      title: camperId ? "New camper question" : "New contact message",
      message: `${input.name}: ${input.subject}`,
      data: { inquiryId: inquiry._id.toString() },
    });
    return inquiry.toObject();
  }

  public async list(query: AdminListQuery): Promise<PaginatedResult<ContactInquiry>> {
    const filter: FilterQuery<ContactInquiry> = {};
    if (query.status) filter.status = query.status;
    if (query.search) {
      const regex = containsRegex(query.search);
      filter.$or = [{ name: regex }, { email: regex }, { subject: regex }];
    }
    const [items, total] = await Promise.all([
      this.inquiryModel.find(filter).sort({ createdAt: -1 }).skip(getSkip(query)).limit(query.limit).populate("camper", "name slug").lean<ContactInquiry[]>().exec(),
      this.inquiryModel.countDocuments(filter).exec(),
    ]);
    return { items, meta: buildPaginationMeta(query, total) };
  }

  public async get(id: string): Promise<ContactInquiry> {
    const inquiry = await this.inquiryModel
      .findById(id)
      .populate("camper", "name slug")
      .populate("member", "firstName lastName email")
      .populate("handledBy", "firstName lastName")
      .lean<ContactInquiry>()
      .exec();
    if (!inquiry) throw AppError.notFound("Inquiry not found");
    return inquiry;
  }

  public async update(id: string, input: UpdateInput, adminId: Types.ObjectId): Promise<ContactInquiry> {
    const result = await this.inquiryModel.updateOne({ _id: id }, { $set: { ...input, handledBy: adminId } }).exec();
    if (result.matchedCount === 0) throw AppError.notFound("Inquiry not found");
    return this.get(id);
  }
}

export const contactInquiryService = new ContactInquiryService();
