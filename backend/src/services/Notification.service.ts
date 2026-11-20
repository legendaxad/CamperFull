import { ClientSession, Types } from "mongoose";
import { ADMIN_ROLES, MemberStatus, NotificationType } from "../constants/enums";
import { Notification } from "../interfaces/engagement.interface";
import { MemberModel, NotificationModel } from "../models";
import { AppError } from "../utils/AppError";
import { logger } from "../utils/logger";
import { buildPaginationMeta, getSkip, PaginatedResult, PaginationInput } from "../utils/pagination";

export interface NotificationInput {
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, string>;
}

export interface NotificationListQuery extends PaginationInput {
  unread?: boolean;
}

/*
 * Notifications are stored per recipient; clients poll the unread count.
 * Real-time push (Socket.IO) was left out on purpose: the dashboard does not
 * need sub-second updates, and polling avoids sticky sessions and extra
 * infrastructure. It can be added later on top of this service.
 */
class NotificationService {
  private readonly notificationModel = NotificationModel;

  public async notifyMember(recipient: Types.ObjectId, input: NotificationInput, session?: ClientSession): Promise<void> {
    await this.notificationModel.create([{ recipient, ...input }], { session });
  }

  /** Fans out one notification per active administrator, so each admin has their own read state. */
  public async notifyAdmins(input: NotificationInput): Promise<void> {
    try {
      const admins = await MemberModel.find({ role: { $in: ADMIN_ROLES }, status: MemberStatus.ACTIVE }).select("_id").lean().exec();
      if (admins.length === 0) return;
      await this.notificationModel.insertMany(admins.map((admin) => ({ recipient: admin._id, ...input })));
    } catch (error) {
      // A notification failure must never undo the business action that caused it.
      logger.error({ err: error, type: input.type }, "Failed to notify admins");
    }
  }

  /** Same as notifyMember but never throws; used after the main operation has committed. */
  public async notifyMemberSafely(recipient: Types.ObjectId, input: NotificationInput): Promise<void> {
    try {
      await this.notifyMember(recipient, input);
    } catch (error) {
      logger.error({ err: error, type: input.type }, "Failed to notify member");
    }
  }

  public async list(recipient: Types.ObjectId, query: NotificationListQuery): Promise<PaginatedResult<Notification>> {
    const filter = { recipient, ...(query.unread !== undefined ? { isRead: !query.unread } : {}) };
    const [items, total] = await Promise.all([
      this.notificationModel.find(filter).sort({ createdAt: -1 }).skip(getSkip(query)).limit(query.limit).lean<Notification[]>().exec(),
      this.notificationModel.countDocuments(filter).exec(),
    ]);
    return { items, meta: buildPaginationMeta(query, total) };
  }

  public unreadCount(recipient: Types.ObjectId): Promise<number> {
    return this.notificationModel.countDocuments({ recipient, isRead: false }).exec();
  }

  public async markRead(recipient: Types.ObjectId, notificationId: string): Promise<Notification> {
    const notification = await this.notificationModel
      .findOneAndUpdate({ _id: notificationId, recipient }, { $set: { isRead: true, readAt: new Date() } }, { new: true })
      .lean<Notification>()
      .exec();
    if (!notification) throw AppError.notFound("Notification not found");
    return notification;
  }

  public async markAllRead(recipient: Types.ObjectId): Promise<number> {
    const result = await this.notificationModel.updateMany({ recipient, isRead: false }, { $set: { isRead: true, readAt: new Date() } }).exec();
    return result.modifiedCount;
  }

  public async remove(recipient: Types.ObjectId, notificationId: string): Promise<void> {
    const result = await this.notificationModel.deleteOne({ _id: notificationId, recipient }).exec();
    if (result.deletedCount === 0) throw AppError.notFound("Notification not found");
  }
}

export const notificationService = new NotificationService();
