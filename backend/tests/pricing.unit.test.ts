import { DiscountType, ExtraChargeType } from "../src/constants/enums";
import { calculateBasePrice, calculateCouponDiscount } from "../src/services/Pricing.service";
import { nightsBetween, parseDateOnly, rangesOverlap } from "../src/utils/dates";
import { Types } from "mongoose";

const d = (value: string) => parseDateOnly(value) as Date;

describe("date convention", () => {
  it("parses calendar dates as UTC midnight and rejects impossible dates", () => {
    expect(d("2026-06-10").toISOString()).toBe("2026-06-10T00:00:00.000Z");
    expect(parseDateOnly("2026-02-30")).toBeNull();
    expect(parseDateOnly("10/06/2026")).toBeNull();
  });

  it("counts nights with an exclusive return day", () => {
    expect(nightsBetween(d("2026-06-10"), d("2026-06-15"))).toBe(5);
  });

  it("treats overlapping ranges as conflicts and back-to-back ranges as free", () => {
    expect(rangesOverlap(d("2026-06-10"), d("2026-06-15"), d("2026-06-12"), d("2026-06-17"))).toBe(true);
    expect(rangesOverlap(d("2026-06-10"), d("2026-06-15"), d("2026-06-15"), d("2026-06-20"))).toBe(false);
    expect(rangesOverlap(d("2026-06-10"), d("2026-06-15"), d("2026-06-05"), d("2026-06-10"))).toBe(false);
    expect(rangesOverlap(d("2026-06-10"), d("2026-06-15"), d("2026-06-11"), d("2026-06-12"))).toBe(true);
  });
});

describe("price calculation", () => {
  const extraId = new Types.ObjectId();
  const base = {
    pricing: { dailyRate: 100000, weekendDailyRate: 150000, cleaningFee: 30000, securityDeposit: 500000 },
    availableExtras: [
      { _id: extraId, name: "Bike rack", price: 10000, chargeType: ExtraChargeType.PER_NIGHT, maxQuantity: 2 },
    ],
    weekendNights: [5, 6],
    currency: "KRW",
  };

  it("charges weekend nights (Fri, Sat) at the weekend rate", () => {
    // 2026-06-05 is a Friday: Fri + Sat are weekend nights, Sun is a weekday night.
    const price = calculateBasePrice({ ...base, selectedExtras: [], startDate: d("2026-06-05"), endDate: d("2026-06-08") });
    expect(price).toMatchObject({ nights: 3, weekendNights: 2, weekdayNights: 1, rentalSubtotal: 400000, subtotal: 430000 });
  });

  it("multiplies per-night extras by nights and quantity", () => {
    const price = calculateBasePrice({
      ...base,
      selectedExtras: [{ extraId: extraId.toString(), quantity: 2 }],
      startDate: d("2026-06-08"),
      endDate: d("2026-06-11"),
    });
    expect(price.extrasTotal).toBe(10000 * 2 * 3);
    expect(price.subtotal).toBe(300000 + 30000 + 60000);
  });

  it("rejects unknown extras and quantities above the limit", () => {
    const run = (extra: { extraId: string; quantity: number }) => () =>
      calculateBasePrice({ ...base, selectedExtras: [extra], startDate: d("2026-06-08"), endDate: d("2026-06-09") });
    expect(run({ extraId: new Types.ObjectId().toString(), quantity: 1 })).toThrow(/not offered/);
    expect(run({ extraId: extraId.toString(), quantity: 3 })).toThrow(/At most 2/);
  });
});

describe("coupon discount", () => {
  it("rounds percentage discounts down and applies the cap", () => {
    expect(calculateCouponDiscount({ discountType: DiscountType.PERCENTAGE, discountValue: 15 }, 333333)).toBe(49999);
    expect(calculateCouponDiscount({ discountType: DiscountType.PERCENTAGE, discountValue: 50, maxDiscountAmount: 100000 }, 500000)).toBe(100000);
  });

  it("never discounts more than the subtotal", () => {
    expect(calculateCouponDiscount({ discountType: DiscountType.FIXED, discountValue: 80000 }, 50000)).toBe(50000);
    expect(calculateCouponDiscount({ discountType: DiscountType.PERCENTAGE, discountValue: 100 }, 50000)).toBe(50000);
  });
});
