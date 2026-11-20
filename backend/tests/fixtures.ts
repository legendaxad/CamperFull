import { CamperStatus, ExtraChargeType, LicenseType } from "../src/constants/enums";
import { CamperModel, CategoryModel } from "../src/models";
import { addDays, formatDateOnly, todayInBusinessTimezone } from "../src/utils/dates";

/** "YYYY-MM-DD" n days after today (Korean calendar), matching the API's date convention. */
export const day = (offset: number): string => formatDateOnly(addDays(todayInBusinessTimezone(), offset));

/** Offset (>= minDays) of the next given weekday (0 = Sunday ... 6 = Saturday). */
export const nextWeekdayOffset = (weekday: number, minDays = 7): number => {
  const today = todayInBusinessTimezone();
  for (let offset = minDays; ; offset += 1) {
    if (addDays(today, offset).getUTCDay() === weekday) return offset;
  }
};

let sequence = 0;

export const createCategory = async (name = `Motorhome ${sequence++}`) =>
  CategoryModel.create({ name, slug: `cat-${Date.now()}-${sequence++}` });

export const createCamper = async (overrides: Record<string, unknown> = {}) => {
  const category = await createCategory();
  return CamperModel.create({
    name: "Test Camper",
    slug: `camper-${Date.now()}-${sequence++}`,
    category: category._id,
    description: "A comfortable camper for testing",
    licenseType: LicenseType.CLASS1_ORDINARY,
    capacity: { seats: 4, sleeps: 4 },
    location: { region: "Seoul" },
    pricing: { dailyRate: 100000, weekendDailyRate: 150000, cleaningFee: 30000, securityDeposit: 500000 },
    extras: [{ name: "Bedding kit", price: 20000, chargeType: ExtraChargeType.PER_BOOKING, maxQuantity: 4 }],
    minNights: 1,
    maxNights: 14,
    status: CamperStatus.AVAILABLE,
    ...overrides,
  });
};

export const bookingBody = (camperId: string, startOffset: number, endOffset: number, extra: Record<string, unknown> = {}) => ({
  camperId,
  startDate: day(startOffset),
  endDate: day(endOffset),
  driver: { fullName: "Jin Park", phone: "010-1234-5678" },
  ...extra,
});
