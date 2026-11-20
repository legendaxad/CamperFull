import { InquiryStatus, NotificationType, ReviewStatus } from "../constants/enums";
import { ObjectId, Timestamps } from "./common.interface";

export interface Review extends Timestamps {
  _id: ObjectId;
  booking: ObjectId;
  camper: ObjectId;
  customer: ObjectId;
  rating: number;
  comment: string;
  status: ReviewStatus;
  adminReply?: string;
  moderatedBy?: ObjectId;
}

export interface Favorite extends Timestamps {
  _id: ObjectId;
  member: ObjectId;
  camper: ObjectId;
}

export interface Notification extends Timestamps {
  _id: ObjectId;
  recipient: ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, string>;
  isRead: boolean;
  readAt?: Date;
}

export interface ContactInquiry extends Timestamps {
  _id: ObjectId;
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  camper?: ObjectId;
  member?: ObjectId;
  status: InquiryStatus;
  adminReply?: string;
  handledBy?: ObjectId;
}

export interface BusinessSettings extends Timestamps {
  _id: ObjectId;
  key: string;
  businessName: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  currency: string;
  /** How long an unpaid booking keeps the dates reserved. */
  bookingHoldMinutes: number;
  /** Customers may cancel (with refund) until this many days before pickup. */
  freeCancellationDays: number;
  minLeadDays: number;
  maxAdvanceDays: number;
  pickupTime: string;
  returnTime: string;
  /** Nights (0 = Sunday ... 6 = Saturday) charged at the weekend rate. */
  weekendNights: number[];
}
