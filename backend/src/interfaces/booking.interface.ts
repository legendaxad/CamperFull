import {
  BookingStatus,
  DiscountType,
  ExtraChargeType,
  PaymentProviderName,
  PaymentStatus,
} from "../constants/enums";
import { ObjectId, Timestamps } from "./common.interface";

export interface BookedExtra {
  extraId: ObjectId;
  name: string;
  price: number;
  chargeType: ExtraChargeType;
  quantity: number;
  total: number;
}

/** A frozen copy of the price at booking time; later camper price changes never affect it. */
export interface PriceBreakdown {
  currency: string;
  nights: number;
  weekdayNights: number;
  weekendNights: number;
  dailyRate: number;
  weekendDailyRate: number;
  rentalSubtotal: number;
  cleaningFee: number;
  extras: BookedExtra[];
  extrasTotal: number;
  subtotal: number;
  discount: number;
  couponCode?: string;
  total: number;
  securityDeposit: number;
}

export interface StatusHistoryEntry {
  status: BookingStatus;
  changedBy?: ObjectId;
  reason?: string;
  changedAt: Date;
}

export interface Booking extends Timestamps {
  _id: ObjectId;
  bookingNumber: string;
  customer: ObjectId;
  camper: ObjectId;
  startDate: Date;
  endDate: Date;
  nights: number;
  status: BookingStatus;
  price: PriceBreakdown;
  coupon?: ObjectId;
  paymentStatus: PaymentStatus;
  holdExpiresAt?: Date;
  driver: { fullName: string; phone: string; licenseNumber?: string };
  customerNote?: string;
  adminNote?: string;
  statusHistory: StatusHistoryEntry[];
  cancelledAt?: Date;
  cancellationReason?: string;
}

export interface Refund {
  _id?: ObjectId;
  amount: number;
  reason: string;
  transactionKey?: string;
  processedBy?: ObjectId;
  refundedAt: Date;
}

export interface Payment extends Timestamps {
  _id: ObjectId;
  booking: ObjectId;
  customer: ObjectId;
  provider: PaymentProviderName;
  orderId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  transactionId?: string;
  method?: string;
  receiptUrl?: string;
  paidAt?: Date;
  failureReason?: string;
  refundedAmount: number;
  refunds: Refund[];
}

export interface Coupon extends Timestamps {
  _id: ObjectId;
  code: string;
  description?: string;
  discountType: DiscountType;
  discountValue: number;
  maxDiscountAmount?: number;
  minBookingAmount: number;
  startsAt?: Date;
  expiresAt?: Date;
  usageLimit?: number;
  usageCount: number;
  perCustomerLimit?: number;
  isActive: boolean;
}
