import { DiscountType, ExtraChargeType } from "../constants/enums";
import { BookedExtra, Coupon, PriceBreakdown } from "../interfaces/booking.interface";
import { CamperExtra, CamperPricing } from "../interfaces/catalog.interface";
import { AppError } from "../utils/AppError";
import { eachNight } from "../utils/dates";

/*
 * Pure price calculation: no database access, so it is easy to unit-test and
 * gives identical results for quotes, booking creation and coupon checks.
 * Amounts are whole KRW; percentage discounts round down in the customer's favour.
 */

export interface ExtraSelection {
  extraId: string;
  quantity: number;
}

export interface PriceInput {
  pricing: CamperPricing;
  availableExtras: CamperExtra[];
  selectedExtras: ExtraSelection[];
  startDate: Date;
  endDate: Date;
  weekendNights: number[];
  currency: string;
}

export type BasePrice = Omit<PriceBreakdown, "discount" | "couponCode" | "total">;

export const calculateBasePrice = (input: PriceInput): BasePrice => {
  const nights = eachNight(input.startDate, input.endDate);
  const weekendRate = input.pricing.weekendDailyRate ?? input.pricing.dailyRate;
  const weekendNights = nights.filter((night) => input.weekendNights.includes(night.getUTCDay())).length;
  const weekdayNights = nights.length - weekendNights;
  const rentalSubtotal = weekdayNights * input.pricing.dailyRate + weekendNights * weekendRate;

  const extras = resolveExtras(input.availableExtras, input.selectedExtras, nights.length);
  const extrasTotal = extras.reduce((sum, extra) => sum + extra.total, 0);

  return {
    currency: input.currency,
    nights: nights.length,
    weekdayNights,
    weekendNights,
    dailyRate: input.pricing.dailyRate,
    weekendDailyRate: weekendRate,
    rentalSubtotal,
    cleaningFee: input.pricing.cleaningFee,
    extras,
    extrasTotal,
    subtotal: rentalSubtotal + input.pricing.cleaningFee + extrasTotal,
    securityDeposit: input.pricing.securityDeposit,
  };
};

const resolveExtras = (available: CamperExtra[], selected: ExtraSelection[], nights: number): BookedExtra[] => {
  const seen = new Set<string>();
  return selected.map((selection) => {
    if (seen.has(selection.extraId)) throw AppError.badRequest("Each extra can only be selected once");
    seen.add(selection.extraId);

    const extra = available.find((item) => item._id.toString() === selection.extraId);
    if (!extra) throw AppError.badRequest("Selected extra is not offered for this camper", [{ field: "extras", message: selection.extraId }]);
    if (selection.quantity > extra.maxQuantity) {
      throw AppError.badRequest(`At most ${extra.maxQuantity} of "${extra.name}" can be selected`);
    }

    const units = extra.chargeType === ExtraChargeType.PER_NIGHT ? nights : 1;
    return {
      extraId: extra._id,
      name: extra.name,
      price: extra.price,
      chargeType: extra.chargeType,
      quantity: selection.quantity,
      total: extra.price * selection.quantity * units,
    };
  });
};

/** Discount for a subtotal. Never negative and never more than the subtotal itself. */
export const calculateCouponDiscount = (
  coupon: Pick<Coupon, "discountType" | "discountValue" | "maxDiscountAmount">,
  subtotal: number,
): number => {
  const raw =
    coupon.discountType === DiscountType.PERCENTAGE
      ? Math.floor((subtotal * coupon.discountValue) / 100)
      : coupon.discountValue;
  const capped = coupon.maxDiscountAmount ? Math.min(raw, coupon.maxDiscountAmount) : raw;
  return Math.max(0, Math.min(capped, subtotal));
};

export const finalizePrice = (base: BasePrice, discount: number, couponCode?: string): PriceBreakdown => ({
  ...base,
  discount,
  couponCode,
  total: base.subtotal - discount,
});
