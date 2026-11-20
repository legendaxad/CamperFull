/*
 * Every enum stored in MongoDB lives here so models, validators and services
 * share one source of truth. Values are stored as strings for readable data.
 */

export enum MemberRole {
  SUPER_ADMIN = "SUPER_ADMIN",
  ADMIN = "ADMIN",
  CUSTOMER = "CUSTOMER",
}

export const ADMIN_ROLES: readonly MemberRole[] = [MemberRole.SUPER_ADMIN, MemberRole.ADMIN];

export enum MemberStatus {
  ACTIVE = "ACTIVE",
  BLOCKED = "BLOCKED",
  DELETED = "DELETED",
}

/** Which application a token was issued for. Admin and customer sessions never mix. */
export enum AuthAudience {
  CUSTOMER = "customer",
  ADMIN = "admin",
}

export enum CamperStatus {
  AVAILABLE = "AVAILABLE",
  UNAVAILABLE = "UNAVAILABLE",
  MAINTENANCE = "MAINTENANCE",
  ARCHIVED = "ARCHIVED",
}

/** Korean driving licence classes shown on the camper pages (1종 대형, 1종 보통, ...). */
export enum LicenseType {
  CLASS1_LARGE = "CLASS1_LARGE",
  CLASS1_ORDINARY = "CLASS1_ORDINARY",
  CLASS2_ORDINARY = "CLASS2_ORDINARY",
  SPECIAL_TRAILER = "SPECIAL_TRAILER",
}

export enum FuelType {
  DIESEL = "DIESEL",
  GASOLINE = "GASOLINE",
  LPG = "LPG",
  HYBRID = "HYBRID",
  ELECTRIC = "ELECTRIC",
  NONE = "NONE",
}

export enum Transmission {
  MANUAL = "MANUAL",
  AUTOMATIC = "AUTOMATIC",
  NONE = "NONE",
}

export enum ExtraChargeType {
  PER_BOOKING = "PER_BOOKING",
  PER_NIGHT = "PER_NIGHT",
}

export enum BookingStatus {
  PENDING = "PENDING",
  CONFIRMED = "CONFIRMED",
  ACTIVE = "ACTIVE",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
  REJECTED = "REJECTED",
}

/** Statuses that always occupy the camper's calendar. PENDING blocks only while its hold is valid. */
export const CALENDAR_BLOCKING_STATUSES: readonly BookingStatus[] = [
  BookingStatus.CONFIRMED,
  BookingStatus.ACTIVE,
];

export enum PaymentStatus {
  PENDING = "PENDING",
  PAID = "PAID",
  FAILED = "FAILED",
  REFUNDED = "REFUNDED",
  PARTIALLY_REFUNDED = "PARTIALLY_REFUNDED",
}

export enum PaymentProviderName {
  TOSS = "TOSS",
  MOCK = "MOCK",
}

export enum DiscountType {
  PERCENTAGE = "PERCENTAGE",
  FIXED = "FIXED",
}

export enum ReviewStatus {
  PUBLISHED = "PUBLISHED",
  HIDDEN = "HIDDEN",
}

export enum NotificationType {
  BOOKING_CREATED = "BOOKING_CREATED",
  BOOKING_STATUS_CHANGED = "BOOKING_STATUS_CHANGED",
  PAYMENT_SUCCEEDED = "PAYMENT_SUCCEEDED",
  PAYMENT_FAILED = "PAYMENT_FAILED",
  PAYMENT_REFUNDED = "PAYMENT_REFUNDED",
  REVIEW_CREATED = "REVIEW_CREATED",
  INQUIRY_RECEIVED = "INQUIRY_RECEIVED",
  SYSTEM = "SYSTEM",
}

export enum InquiryStatus {
  NEW = "NEW",
  IN_PROGRESS = "IN_PROGRESS",
  RESOLVED = "RESOLVED",
}

export enum ImageFolder {
  CAMPERS = "campers",
  CATEGORIES = "categories",
  AVATARS = "avatars",
  CAMPING_PLACES = "camping-places",
}
