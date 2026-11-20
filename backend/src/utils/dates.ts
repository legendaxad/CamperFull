/*
 * BOOKING DATE CONVENTION
 * -----------------------
 * Rentals are booked by calendar day, not by timestamp.
 *
 *  - `startDate` is the pickup day (inclusive).
 *  - `endDate` is the return day (exclusive): the camper is free again that day.
 *  - Both are stored as midnight UTC of the calendar date, so "2026-06-10"
 *    is always 2026-06-10T00:00:00.000Z regardless of server timezone.
 *  - nights = endDate - startDate in days. June 10 -> June 15 is 5 nights.
 *
 * Two ranges overlap when   a.start < b.end  AND  b.start < a.end.
 *   June 10-15 vs June 12-17 -> overlap (12 < 15 and 10 < 17)
 *   June 10-15 vs June 15-20 -> no overlap (15 < 15 is false): back-to-back is allowed.
 *
 * "Today" is evaluated in the business timezone (Korea), not the server's.
 */

export const DAY_MS = 24 * 60 * 60 * 1000;
export const BUSINESS_TIMEZONE = "Asia/Seoul";

const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Parses "YYYY-MM-DD" into a UTC-midnight Date. Returns null for malformed or impossible dates. */
export const parseDateOnly = (value: string): Date | null => {
  const match = DATE_ONLY_PATTERN.exec(value);
  if (!match) return null;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  // Rejects values such as 2026-02-30 that Date would silently roll over.
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return null;
  }
  return date;
};

export const formatDateOnly = (date: Date): string => date.toISOString().slice(0, 10);

export const addDays = (date: Date, days: number): Date => new Date(date.getTime() + days * DAY_MS);

export const nightsBetween = (start: Date, end: Date): number =>
  Math.round((end.getTime() - start.getTime()) / DAY_MS);

/** Today's calendar date in the business timezone, as UTC midnight. */
export const todayInBusinessTimezone = (now: Date = new Date()): Date => {
  const formatted = new Intl.DateTimeFormat("en-CA", {
    timeZone: BUSINESS_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  return parseDateOnly(formatted) as Date;
};

export const rangesOverlap = (aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean =>
  aStart.getTime() < bEnd.getTime() && bStart.getTime() < aEnd.getTime();

/** Each night of a stay, identified by the date it starts on. */
export const eachNight = (start: Date, end: Date): Date[] => {
  const nights: Date[] = [];
  for (let cursor = start; cursor.getTime() < end.getTime(); cursor = addDays(cursor, 1)) {
    nights.push(cursor);
  }
  return nights;
};
