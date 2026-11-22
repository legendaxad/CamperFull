/*
 * Seed: realistic, related demo data for every business collection.
 *
 *   Local development data:
 *     MONGODB_URI="mongodb://127.0.0.1:27018/fullcamper_dev?replicaSet=rs0" npm run seed:dev
 *   Portfolio demo catalog (30 campers) into the database configured in .env:
 *     SEED_PROFILE=portfolio SEED_ALLOW_REMOTE_DB=<database name> npm run seed:dev
 *
 * Safety:
 *  - Refuses to run in production. A non-local database (e.g. Atlas) is only
 *    accepted when SEED_ALLOW_REMOTE_DB equals its database name (checked
 *    before and after connecting). Connection strings are never printed.
 *  - Insert-only: existing accounts, sessions and business settings are never
 *    modified; the run fingerprints them before and after to prove it.
 *  - Never deletes anything. Each record is looked up by a stable key (email,
 *    slug, coupon code, a deterministic _id, or a natural unique pair) and is
 *    only created when missing, so running it twice creates no duplicates and
 *    existing data is left untouched.
 *
 * Records go through the same services and Zod schemas as the API wherever the
 * service allows it. Past and in-progress trips cannot be created through
 * BookingService (it only accepts future dates), so those bookings and their
 * mock payments are written with the Mongoose models (full schema validation)
 * and priced with the same Pricing.service functions.
 */
import bcrypt from "bcrypt";
import crypto from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import mongoose, { Model, Types } from "mongoose";
import { env } from "../config/env";
import { BookingStatus, MemberRole, PaymentProviderName, PaymentStatus } from "../constants/enums";
import { connectDatabase, disconnectDatabase } from "../database/connection";
import { Camper } from "../interfaces/catalog.interface";
import {
  BookingModel,
  BusinessSettingsModel,
  CamperModel,
  CampingPlaceModel,
  CategoryModel,
  ContactInquiryModel,
  CouponModel,
  FavoriteModel,
  FeatureModel,
  MemberModel,
  NotificationModel,
  PaymentModel,
  ReviewModel,
  SessionModel,
} from "../models";
import { authService } from "../services/Auth.service";
import { bookingService } from "../services/Booking.service";
import { camperService } from "../services/Camper.service";
import { campingPlaceService } from "../services/CampingPlace.service";
import { categoryService } from "../services/Category.service";
import { contactInquiryService } from "../services/ContactInquiry.service";
import { couponService } from "../services/Coupon.service";
import { favoriteService } from "../services/Favorite.service";
import { featureService } from "../services/Feature.service";
import { memberService } from "../services/Member.service";
import { paymentService } from "../services/Payment.service";
import { calculateBasePrice, finalizePrice } from "../services/Pricing.service";
import { reviewService } from "../services/Review.service";
import { settingsService } from "../services/Settings.service";
import { addDays, formatDateOnly, todayInBusinessTimezone } from "../utils/dates";
import { slugify } from "../utils/strings";
import { createAdminSchema, registerSchema } from "../validators/auth.validator";
import { bookingCreateSchema } from "../validators/booking.validator";
import { camperCreateSchema, campingPlaceCreateSchema, categoryCreateSchema, featureCreateSchema } from "../validators/catalog.validator";
import { couponCreateSchema } from "../validators/coupon.validator";
import { inquiryCreateSchema, inquiryUpdateSchema, reviewCreateSchema, reviewModerationSchema, settingsUpdateSchema } from "../validators/engagement.validator";
import * as development from "./seed-data/development";
import * as portfolio from "./seed-data/portfolio";

/*
 * Profiles: "development" (default; local test data) and "portfolio" (30-camper
 * demo catalog). A remote database (e.g. Atlas) is only accepted with an explicit
 * opt-in: SEED_ALLOW_REMOTE_DB must equal the target database name.
 */
const PROFILE = process.env.SEED_PROFILE ?? "development";
if (PROFILE !== "development" && PROFILE !== "portfolio") throw new Error(`Unknown SEED_PROFILE "${PROFILE}"`);
const data = PROFILE === "portfolio" ? portfolio : development;
/** Portfolio records get their own stable-id namespace so profiles never collide. */
const KEY_PREFIX = PROFILE === "development" ? "" : `${PROFILE}:`;

const LOCAL_URI = /^mongodb:\/\/(127\.0\.0\.1|localhost)(:\d+)?\//;
const LOCAL_DIR = path.resolve(__dirname, "../../.local");
const REPORT_PATH = path.join(LOCAL_DIR, PROFILE === "development" ? "seed-report.md" : `seed-report-${PROFILE}.md`);
const SECRETS_PATH = path.join(LOCAL_DIR, `seed-secrets-${PROFILE}.json`);

/** Database name from the URI path (works for mongodb:// and mongodb+srv://, multi-host too). */
const uriDatabaseName = (uri: string): string => /^mongodb(?:\+srv)?:\/\/[^/]+\/([^?]*)/.exec(uri)?.[1] ?? "";
/** Host and database only: credentials and options are never printed. */
const maskedTarget = (uri: string): string => {
  const hosts = /^mongodb(?:\+srv)?:\/\/(?:[^@/]*@)?([^/?]+)/.exec(uri)?.[1] ?? "unknown-host";
  return `${hosts}/${uriDatabaseName(uri)}`;
};
const isLocalTarget = () => LOCAL_URI.test(env.MONGODB_URI);

interface SeedPasswords {
  customer: string;
  admin: string;
}

/**
 * Development keeps its documented local passwords. Other profiles get strong
 * random passwords, generated once and kept in the git-ignored .local folder so
 * re-runs (which never change existing accounts) still report the right ones.
 */
const resolvePasswords = (): SeedPasswords => {
  if (PROFILE === "development") return { customer: development.DEV_CUSTOMER_PASSWORD, admin: development.DEV_ADMIN_PASSWORD };
  if (existsSync(SECRETS_PATH)) return JSON.parse(readFileSync(SECRETS_PATH, "utf8")) as SeedPasswords;
  const generate = (prefix: string) => `${prefix}-${crypto.randomBytes(12).toString("base64url")}-7q`;
  const passwords = { customer: generate("Guest"), admin: generate("Admin") };
  mkdirSync(LOCAL_DIR, { recursive: true });
  writeFileSync(SECRETS_PATH, JSON.stringify(passwords, null, 2), { encoding: "utf8", mode: 0o600 });
  return passwords;
};

/* ---------------- helpers ---------------- */

const log = (message: string) => process.stdout.write(`${message}\n`);

/** Same key -> same ObjectId on every run, so re-runs find the records they created before. */
const stableId = (key: string): Types.ObjectId =>
  new Types.ObjectId(crypto.createHash("sha1").update(`fullcamper-dev-seed:${KEY_PREFIX}${key}`).digest("hex").slice(0, 24));

/** Readable 6-character suffix derived from a key (same alphabet as randomCode). */
const stableCode = (key: string): string => {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from(crypto.createHash("sha1").update(key).digest().subarray(0, 6), (byte) => alphabet[byte % alphabet.length]).join("");
};

const minutesAfter = (date: Date, minutes: number) => new Date(date.getTime() + minutes * 60 * 1000);

/** Backdates timestamps on a record created through a service (Mongoose treats createdAt as immutable). */
const backdate = async (model: Model<any>, id: Types.ObjectId, createdAt: Date, updatedAt: Date = createdAt) => {
  await model.collection.updateOne({ _id: id }, { $set: { createdAt, updatedAt } });
};

interface Counter {
  created: number;
  existing: number;
}
const counters = new Map<string, Counter>();
const tally = (collection: string, created: boolean) => {
  const counter = counters.get(collection) ?? { created: 0, existing: 0 };
  if (created) counter.created += 1;
  else counter.existing += 1;
  counters.set(collection, counter);
};

/* ---------------- safety ---------------- */

const assertSafeTarget = () => {
  if (env.isProduction) throw new Error("Refusing to seed: NODE_ENV is production");
  if (!isLocalTarget()) {
    const dbName = uriDatabaseName(env.MONGODB_URI);
    if (!dbName || process.env.SEED_ALLOW_REMOTE_DB !== dbName) {
      throw new Error(
        `Refusing to seed the non-local database ${maskedTarget(env.MONGODB_URI)}. ` +
          `To seed it on purpose, set SEED_ALLOW_REMOTE_DB=${dbName || "<database name>"} (it must equal the database name). ` +
          'For local data use e.g. MONGODB_URI="mongodb://127.0.0.1:27018/fullcamper_dev?replicaSet=rs0".',
      );
    }
  }
  if (env.PAYMENT_PROVIDER !== "mock") throw new Error("Refusing to seed: PAYMENT_PROVIDER must be mock");
};

/* ---------------- members ---------------- */

const seedAdmins = async (passwords: SeedPasswords) => {
  const ids: Record<string, Types.ObjectId> = {};
  let superAdminId: Types.ObjectId | undefined;

  for (const admin of data.ADMINS) {
    const input = createAdminSchema.parse({
      firstName: admin.firstName,
      lastName: admin.lastName,
      email: admin.email,
      phone: admin.phone,
      password: passwords.admin,
      role: admin.role,
    });
    const existing = await MemberModel.findOne({ email: input.email }).select("_id role").lean().exec();
    if (existing) {
      if (existing.role !== input.role) throw new Error(`${input.email} exists with role ${existing.role}; expected ${input.role}`);
      ids[admin.key] = existing._id;
      tally("members (admins)", false);
    } else if (input.role === MemberRole.SUPER_ADMIN) {
      // Same bootstrap path as `npm run create-admin`: the first super admin has no creator.
      const created = await MemberModel.create({
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        phone: input.phone,
        role: MemberRole.SUPER_ADMIN,
        passwordHash: await authService.hashPassword(input.password),
      });
      ids[admin.key] = created._id;
      await backdate(MemberModel, created._id, addDays(todayInBusinessTimezone(), -500));
      tally("members (admins)", true);
    } else {
      const created = await memberService.createAdmin(input, superAdminId);
      ids[admin.key] = created._id;
      await backdate(MemberModel, created._id, addDays(todayInBusinessTimezone(), -480));
      tally("members (admins)", true);
    }
    if (admin.role === "SUPER_ADMIN") superAdminId = ids[admin.key];
  }
  // Seeded admin actions (confirmations, replies) are performed by the first ADMIN-role account.
  const actor = data.ADMINS.find((admin) => admin.role === "ADMIN");
  if (!actor || !ids[actor.key]) throw new Error("The seed profile needs an ADMIN account");
  return { actorId: ids[actor.key] as Types.ObjectId };
};

/**
 * Customers are created like the register endpoint does (registerSchema +
 * bcrypt via AuthService) but without issuing tokens: sessions only come
 * from real logins.
 */
const seedCustomers = async (today: Date, passwords: SeedPasswords) => {
  const ids: Types.ObjectId[] = [];
  for (const [index, customer] of data.CUSTOMERS.entries()) {
    const input = registerSchema.parse({ ...customer, password: passwords.customer });
    const existing = await MemberModel.findOne({ email: input.email }).select("_id role").lean().exec();
    if (existing) {
      if (existing.role !== MemberRole.CUSTOMER) throw new Error(`${input.email} exists but is not a customer`);
      ids.push(existing._id);
      tally("members (customers)", false);
      continue;
    }
    await authService.assertUniqueContact(input.email, input.phone);
    const createdAt = addDays(today, -(420 - index * 10));
    const member = new MemberModel({
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      phone: input.phone,
      role: MemberRole.CUSTOMER,
      passwordHash: await authService.hashPassword(input.password),
      createdAt,
      updatedAt: createdAt,
    });
    await member.save({ timestamps: false });
    ids.push(member._id);
    tally("members (customers)", true);
  }
  return ids;
};

/* ---------------- catalog ---------------- */

const seedCategories = async () => {
  const ids: Types.ObjectId[] = [];
  for (const category of data.CATEGORIES) {
    const existing = await CategoryModel.findOne({ slug: slugify(category.name) }).select("_id").lean().exec();
    if (existing) {
      ids.push(existing._id);
      tally("categories", false);
      continue;
    }
    ids.push((await categoryService.create(categoryCreateSchema.parse(category)))._id);
    tally("categories", true);
  }
  return ids;
};

const seedFeatures = async () => {
  const ids: Types.ObjectId[] = [];
  for (const feature of data.FEATURES) {
    const existing = await FeatureModel.findOne({ slug: slugify(feature.name) }).select("_id").lean().exec();
    if (existing) {
      ids.push(existing._id);
      tally("features", false);
      continue;
    }
    ids.push((await featureService.create(featureCreateSchema.parse(feature)))._id);
    tally("features", true);
  }
  return ids;
};

const seedCampers = async (categoryIds: Types.ObjectId[], featureIds: Types.ObjectId[], adminId: Types.ObjectId) => {
  const campers: Camper[] = [];
  for (const fixture of data.CAMPERS) {
    const slug = slugify(fixture.name);
    let camper = await CamperModel.findOne({ slug }).lean<Camper>().exec();
    if (camper) {
      tally("campers", false);
    } else {
      const { images: _images, category, features, ...rest } = fixture;
      const input = camperCreateSchema.parse({
        ...rest,
        category: categoryIds[category]?.toString(),
        features: features.map((index) => featureIds[index]?.toString()),
      });
      const created = await camperService.create(input, adminId);
      // Uploads need Cloudinary, so seeded photos are stored as hosted URLs (no publicId to delete later).
      await CamperModel.updateOne(
        { _id: created._id },
        { $set: { images: fixture.images.map((url, index) => ({ url, alt: `${fixture.name} photo ${index + 1}` })) } },
        { runValidators: true },
      ).exec();
      camper = await CamperModel.findById(created._id).lean<Camper>().exec();
      tally("campers", true);
    }
    if (!camper) throw new Error(`Camper ${fixture.name} could not be loaded`);
    campers.push(camper);
  }
  return campers;
};

const seedCampingPlaces = async () => {
  for (const place of data.CAMPING_PLACES) {
    if (await CampingPlaceModel.exists({ slug: slugify(place.name) })) {
      tally("campingplaces", false);
      continue;
    }
    const { images, ...rest } = place;
    const created = await campingPlaceService.create(campingPlaceCreateSchema.parse(rest));
    await CampingPlaceModel.updateOne(
      { _id: created._id },
      { $set: { images: images.map((url, index) => ({ url, alt: `${place.name} photo ${index + 1}` })) } },
      { runValidators: true },
    ).exec();
    tally("campingplaces", true);
  }
};

const seedCoupons = async (now: Date) => {
  for (const coupon of data.couponFixtures(now)) {
    if (await CouponModel.exists({ code: coupon.code })) {
      tally("coupons", false);
      continue;
    }
    await couponService.create(couponCreateSchema.parse(coupon));
    tally("coupons", true);
  }
};

/* ---------------- bookings & payments ---------------- */

interface TripFixture {
  customer: number;
  camper: number;
  startDaysAgo: number;
  nights: number;
  leadDays: number;
  extras: number[];
}

/**
 * Writes a past or in-progress trip with its paid mock payment. The status
 * history follows the real lifecycle: PENDING -> CONFIRMED (payment) ->
 * ACTIVE (pickup) [-> COMPLETED (return)].
 */
const seedHistoricalTrip = async (
  key: string,
  trip: TripFixture,
  finalStatus: BookingStatus.COMPLETED | BookingStatus.ACTIVE,
  ctx: { today: Date; customers: Types.ObjectId[]; campers: Camper[]; adminId: Types.ObjectId; weekendNights: number[]; currency: string },
) => {
  const bookingId = stableId(`booking:${key}`);
  const paymentId = stableId(`payment:${key}`);
  const existing = await BookingModel.exists({ _id: bookingId });
  if (existing) {
    tally("bookings", false);
    tally("payments", (await PaymentModel.exists({ _id: paymentId })) === null);
    return bookingId;
  }

  const customerId = ctx.customers[trip.customer] as Types.ObjectId;
  const camper = ctx.campers[trip.camper] as Camper;
  const customer = data.CUSTOMERS[trip.customer] as (typeof data.CUSTOMERS)[number];
  const startDate = addDays(ctx.today, -trip.startDaysAgo);
  const endDate = addDays(startDate, trip.nights);
  const createdAt = minutesAfter(addDays(startDate, -trip.leadDays), 9 * 60 + 17); // 09:17 KST-ish
  const paidAt = minutesAfter(createdAt, 6);
  const pickupAt = minutesAfter(startDate, 6 * 60); // 15:00 KST
  const returnAt = minutesAfter(endDate, 2 * 60); // 11:00 KST

  const base = calculateBasePrice({
    pricing: camper.pricing,
    availableExtras: camper.extras,
    selectedExtras: trip.extras.map((index) => ({ extraId: (camper.extras[index] as Camper["extras"][number])._id.toString(), quantity: 1 })),
    startDate,
    endDate,
    weekendNights: ctx.weekendNights,
    currency: ctx.currency,
  });
  const price = finalizePrice(base, 0);
  const bookingNumber = `FC-${formatDateOnly(createdAt).slice(2).replace(/-/g, "")}-${stableCode(`booking:${key}`)}`;

  const statusHistory = [
    { status: BookingStatus.PENDING, changedBy: customerId, changedAt: createdAt },
    { status: BookingStatus.CONFIRMED, reason: "Payment received", changedAt: paidAt },
    { status: BookingStatus.ACTIVE, changedBy: ctx.adminId, reason: "Picked up", changedAt: pickupAt },
    ...(finalStatus === BookingStatus.COMPLETED
      ? [{ status: BookingStatus.COMPLETED, changedBy: ctx.adminId, reason: "Returned in good condition", changedAt: returnAt }]
      : []),
  ];
  const updatedAt = statusHistory[statusHistory.length - 1]?.changedAt ?? createdAt;

  await new BookingModel({
    _id: bookingId,
    bookingNumber,
    customer: customerId,
    camper: camper._id,
    startDate,
    endDate,
    nights: trip.nights,
    status: finalStatus,
    price,
    paymentStatus: PaymentStatus.PAID,
    driver: { fullName: `${customer.firstName} ${customer.lastName}`, phone: customer.phone.replace(/-/g, ""), licenseNumber: `11-${20 + trip.customer}-55${String(trip.customer).padStart(4, "0")}-01` },
    statusHistory,
    createdAt,
    updatedAt,
  }).save({ timestamps: false });

  await new PaymentModel({
    _id: paymentId,
    booking: bookingId,
    customer: customerId,
    provider: PaymentProviderName.MOCK,
    orderId: `${bookingNumber}-${stableCode(`order:${key}`)}`,
    amount: price.total,
    currency: price.currency,
    status: PaymentStatus.PAID,
    transactionId: `mock_seed_${stableCode(`txn:${key}`).toLowerCase()}`,
    method: "CARD",
    paidAt,
    createdAt: minutesAfter(createdAt, 3),
    updatedAt: paidAt,
  }).save({ timestamps: false });

  tally("bookings", true);
  tally("payments", true);
  return bookingId;
};

/** Future trips go through BookingService exactly like the checkout page. */
const seedUpcomingTrips = async (ctx: { today: Date; customers: Types.ObjectId[]; campers: Camper[]; adminId: Types.ObjectId }) => {
  for (const trip of data.UPCOMING_TRIPS) {
    const customerId = ctx.customers[trip.customer] as Types.ObjectId;
    const camper = ctx.campers[trip.camper] as Camper;
    // The (customer, camper) pairs are unique within the fixtures, so an existing booking means "already seeded".
    if (await BookingModel.exists({ customer: customerId, camper: camper._id, startDate: { $gt: ctx.today } })) {
      tally("bookings", false);
      continue;
    }
    const customer = data.CUSTOMERS[trip.customer] as (typeof data.CUSTOMERS)[number];
    const startDate = addDays(ctx.today, trip.startInDays);
    const input = bookingCreateSchema.parse({
      camperId: camper._id.toString(),
      startDate: formatDateOnly(startDate),
      endDate: formatDateOnly(addDays(startDate, trip.nights)),
      extras: trip.extras.map((index) => ({ extraId: (camper.extras[index] as Camper["extras"][number])._id.toString(), quantity: 1 })),
      couponCode: trip.couponCode,
      driver: { fullName: `${customer.firstName} ${customer.lastName}`, phone: customer.phone },
      customerNote: trip.note,
    });
    const booking = await bookingService.create(customerId, input);
    if (trip.outcome === "CONFIRMED") {
      await paymentService.adminUpdateBookingStatus(
        booking._id.toString(),
        { status: BookingStatus.CONFIRMED, reason: "Confirmed by phone; customer pays at pickup", refund: false },
        ctx.adminId,
      );
    } else if (trip.outcome === "CANCELLED") {
      await paymentService.cancelBookingAsCustomer(customerId, booking._id.toString(), "Change of travel plans");
    }
    tally("bookings", true);
  }
};

/* ---------------- engagement ---------------- */

const seedReviews = async (completedBookingIds: Types.ObjectId[], customers: Types.ObjectId[], adminId: Types.ObjectId) => {
  for (const [index, trip] of data.PAST_TRIPS.entries()) {
    const bookingId = completedBookingIds[index] as Types.ObjectId;
    if (await ReviewModel.exists({ booking: bookingId })) {
      tally("reviews", false);
      continue;
    }
    const customerId = customers[trip.customer] as Types.ObjectId;
    const review = await reviewService.create(
      customerId,
      reviewCreateSchema.parse({ bookingId: bookingId.toString(), rating: trip.rating, comment: trip.comment }),
    );
    const booking = await BookingModel.findById(bookingId).select("endDate").lean().exec();
    const postedAt = minutesAfter(addDays(booking?.endDate ?? new Date(), 1 + (index % 3)), 11 * 60);
    const reply = data.REVIEW_REPLIES[index];
    if (reply) await reviewService.moderate(review._id.toString(), reviewModerationSchema.parse({ adminReply: reply }), adminId);
    await backdate(ReviewModel, review._id, postedAt, reply ? minutesAfter(postedAt, 26 * 60) : postedAt);
    tally("reviews", true);
  }
};

const seedFavorites = async (customers: Types.ObjectId[], campers: Camper[]) => {
  for (const [customerIndex, camperIndex] of data.FAVORITES) {
    const { created } = await favoriteService.add(customers[customerIndex] as Types.ObjectId, (campers[camperIndex] as Camper)._id.toString());
    tally("favorites", created);
  }
};

const seedInquiries = async (customers: Types.ObjectId[], campers: Camper[], adminId: Types.ObjectId) => {
  for (const inquiry of data.INQUIRIES) {
    const customer = inquiry.customer !== undefined ? data.CUSTOMERS[inquiry.customer] : undefined;
    const contact = customer
      ? { name: `${customer.firstName} ${customer.lastName}`, email: customer.email, phone: customer.phone }
      : (inquiry as { guest: { name: string; email: string; phone?: string } }).guest;
    if (await ContactInquiryModel.exists({ email: contact.email.toLowerCase(), subject: inquiry.subject })) {
      tally("contactinquiries", false);
      continue;
    }
    const input = inquiryCreateSchema.parse({
      ...contact,
      subject: inquiry.subject,
      message: inquiry.message,
      camperId: inquiry.camper !== undefined ? (campers[inquiry.camper] as Camper)._id.toString() : undefined,
    });
    const created = await contactInquiryService.create(input, inquiry.customer !== undefined ? customers[inquiry.customer] : undefined);
    if (inquiry.reply) {
      await contactInquiryService.update(created._id.toString(), inquiryUpdateSchema.parse({ status: inquiry.reply.status, adminReply: inquiry.reply.text }), adminId);
    }
    tally("contactinquiries", true);
  }
};

/* ---------------- verification ---------------- */

interface VerificationRow {
  collection: string;
  expected: string;
  total: number;
  seeded: number;
  valid: boolean;
  notes: string;
}

/** Every reference path in the schemas: [model, path, referenced model]. */
const REFERENCES: [Model<any>, string, Model<any>][] = [
  [MemberModel, "createdBy", MemberModel],
  [SessionModel, "member", MemberModel],
  [CamperModel, "category", CategoryModel],
  [CamperModel, "features", FeatureModel],
  [CamperModel, "createdBy", MemberModel],
  [BookingModel, "customer", MemberModel],
  [BookingModel, "camper", CamperModel],
  [BookingModel, "coupon", CouponModel],
  [BookingModel, "statusHistory.changedBy", MemberModel],
  [PaymentModel, "booking", BookingModel],
  [PaymentModel, "customer", MemberModel],
  [ReviewModel, "booking", BookingModel],
  [ReviewModel, "camper", CamperModel],
  [ReviewModel, "customer", MemberModel],
  [ReviewModel, "moderatedBy", MemberModel],
  [FavoriteModel, "member", MemberModel],
  [FavoriteModel, "camper", CamperModel],
  [NotificationModel, "recipient", MemberModel],
  [ContactInquiryModel, "camper", CamperModel],
  [ContactInquiryModel, "member", MemberModel],
  [ContactInquiryModel, "handledBy", MemberModel],
];

const findDanglingReferences = async (): Promise<string[]> => {
  const problems: string[] = [];
  for (const [model, refPath, target] of REFERENCES) {
    const ids = (await model.distinct(refPath)) as unknown[];
    const objectIds = ids.filter((id): id is Types.ObjectId => id instanceof Types.ObjectId);
    if (objectIds.length === 0) continue;
    const found = await target.countDocuments({ _id: { $in: objectIds } });
    if (found !== objectIds.length) problems.push(`${model.collection.name}.${refPath}: ${objectIds.length - found} missing ${target.collection.name}`);
  }
  return problems;
};

/** Re-validates every stored document against its Mongoose schema. */
const invalidDocuments = async (model: Model<any>): Promise<number> => {
  let invalid = 0;
  for await (const raw of model.collection.find({})) {
    const error = new model(raw).validateSync();
    if (error) {
      invalid += 1;
      log(`  invalid ${model.collection.name} ${String(raw._id)}: ${error.message}`);
    }
  }
  return invalid;
};

const verify = async (
  seedKeys: { customerEmails: string[]; adminEmails: string[]; historicalBookingIds: Types.ObjectId[]; customerIds: Types.ObjectId[] },
  passwords: SeedPasswords,
) => {
  const rows: VerificationRow[] = [];
  const add = async (model: Model<any>, label: string, expected: string, seededFilter: Record<string, unknown>, notes = "") => {
    rows.push({
      collection: label,
      expected,
      total: await model.countDocuments({}),
      seeded: await model.countDocuments(seededFilter),
      valid: (await invalidDocuments(model)) === 0,
      notes,
    });
  };
  const count = (n: number) => String(n);
  const adminRoleList = data.ADMINS.map((a) => a.role).join(" + ");
  const camperStatuses = data.CAMPERS.reduce<Record<string, number>>((acc, c) => {
    const status = (c as { status?: string }).status ?? "AVAILABLE";
    acc[status] = (acc[status] ?? 0) + 1;
    return acc;
  }, {});
  const tripCount = data.PAST_TRIPS.length + data.ACTIVE_TRIPS.length;

  await add(MemberModel, "members (customers)", count(data.CUSTOMERS.length), { email: { $in: seedKeys.customerEmails }, role: MemberRole.CUSTOMER }, "total includes any pre-existing members");
  await add(MemberModel, "members (admins)", count(data.ADMINS.length), { email: { $in: seedKeys.adminEmails }, role: { $in: [MemberRole.SUPER_ADMIN, MemberRole.ADMIN] } }, adminRoleList);
  await add(CategoryModel, "categories", count(data.CATEGORIES.length), { slug: { $in: data.CATEGORIES.map((c) => slugify(c.name)) } });
  await add(FeatureModel, "features", count(data.FEATURES.length), { slug: { $in: data.FEATURES.map((f) => slugify(f.name)) } });
  await add(CamperModel, "campers", count(data.CAMPERS.length), { slug: { $in: data.CAMPERS.map((c) => slugify(c.name)) } }, Object.entries(camperStatuses).map(([k, v]) => `${v} ${k}`).join(" + "));
  await add(CampingPlaceModel, "campingplaces", count(data.CAMPING_PLACES.length), { slug: { $in: data.CAMPING_PLACES.map((p) => slugify(p.name)) } });
  await add(CouponModel, "coupons", count(data.couponFixtures(new Date()).length), { code: { $in: data.couponFixtures(new Date()).map((c) => c.code) } });
  await add(BookingModel, "bookings", count(tripCount + data.UPCOMING_TRIPS.length), { customer: { $in: seedKeys.customerIds } }, `${data.PAST_TRIPS.length} completed + ${data.ACTIVE_TRIPS.length} active + ${data.UPCOMING_TRIPS.length} upcoming`);
  await add(PaymentModel, "payments", count(tripCount), { booking: { $in: seedKeys.historicalBookingIds } }, "paid mock payments for past/active trips");
  await add(ReviewModel, "reviews", count(data.PAST_TRIPS.length), { booking: { $in: seedKeys.historicalBookingIds } });
  await add(FavoriteModel, "favorites", count(data.FAVORITES.length), { member: { $in: seedKeys.customerIds } });
  await add(ContactInquiryModel, "contactinquiries", count(data.INQUIRIES.length), { subject: { $in: data.INQUIRIES.map((i) => i.subject) } });
  await add(NotificationModel, "notifications", "side effects", {}, "created by the services, not inserted directly");
  await add(SessionModel, "sessions", "not seeded", {}, "created only by real logins");
  await add(BusinessSettingsModel, "businesssettings", "1 (singleton)", { key: "business" }, "never overwritten by the seeder");

  // Seeded accounts: hashed passwords that verify, customers never admins.
  const customers = await MemberModel.find({ email: { $in: seedKeys.customerEmails } }).select("+passwordHash role").lean().exec();
  const admins = await MemberModel.find({ email: { $in: seedKeys.adminEmails } }).select("+passwordHash role email").lean().exec();
  const hashChecks = await Promise.all([
    ...customers.map((m) => bcrypt.compare(passwords.customer, m.passwordHash)),
    ...admins.map((m) => bcrypt.compare(passwords.admin, m.passwordHash)),
  ]);
  const passwordsHashed = [...customers, ...admins].every((m) => /^\$2[aby]\$\d{2}\$/.test(m.passwordHash)) && hashChecks.every(Boolean);
  const customersAreCustomers = customers.length === data.CUSTOMERS.length && customers.every((m) => m.role === MemberRole.CUSTOMER);
  const adminRoles = admins.map((m) => `${m.email}=${m.role}`).join(", ");

  // Duplicates: the unique indexes must exist (they are what prevents duplicates).
  const uniqueIndexChecks: [Model<any>, string][] = [
    [MemberModel, "email"], [CategoryModel, "slug"], [FeatureModel, "slug"], [CamperModel, "slug"], [CampingPlaceModel, "slug"],
    [CouponModel, "code"], [BookingModel, "bookingNumber"], [PaymentModel, "orderId"], [ReviewModel, "booking"],
  ];
  const missingUniqueIndexes: string[] = [];
  for (const [model, field] of uniqueIndexChecks) {
    const indexes = await model.collection.indexes();
    if (!indexes.some((index) => index.unique && Object.keys(index.key)[0] === field)) missingUniqueIndexes.push(`${model.collection.name}.${field}`);
  }

  const paidHistoricalBookings = await BookingModel.countDocuments({ _id: { $in: seedKeys.historicalBookingIds }, paymentStatus: PaymentStatus.PAID });
  const ratedCampers = await CamperModel.countDocuments({ ratingCount: { $gt: 0 } });

  return { rows, dangling: await findDanglingReferences(), passwordsHashed, customersAreCustomers, adminRoles, missingUniqueIndexes, paidHistoricalBookings, tripCount, ratedCampers };
};

/* ---------------- pre-existing data protection ---------------- */

/** Fingerprint of every record the seeder does not own, so the run can prove it left them untouched. */
const snapshotExisting = async (seedEmails: string[]) => {
  const members = await MemberModel.collection.find({ email: { $nin: seedEmails } }).sort({ _id: 1 }).toArray();
  // updatedAt is excluded: the app's own settingsService.get() (used by every booking) refreshes it.
  const settings = (await BusinessSettingsModel.collection.find({}).sort({ _id: 1 }).toArray()).map(({ updatedAt: _updatedAt, ...rest }) => rest);
  const sessionIds = (await SessionModel.collection.find({}, { projection: { _id: 1 } }).toArray()).map((s) => String(s._id));
  const hash = (value: unknown) => crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
  return { memberCount: members.length, members: hash(members), settings: hash(settings), sessionIds };
};

/* ---------------- report ---------------- */

const writeReport = (result: Awaited<ReturnType<typeof verify>>, passwords: SeedPasswords, protection: string) => {
  const table = [
    "| Collection | Expected | Total in DB | Seeded | Valid | Notes |",
    "|---|---:|---:|---:|---|---|",
    ...result.rows.map((r) => `| ${r.collection} | ${r.expected} | ${r.total} | ${r.seeded} | ${r.valid ? "Yes" : "**No**"} | ${r.notes} |`),
  ].join("\n");
  const accounts = [
    "| Role | Name | Email | Password |",
    "|---|---|---|---|",
    ...data.ADMINS.map((a) => `| ${a.role} | ${a.firstName} ${a.lastName} | ${a.email} | \`${passwords.admin}\` |`),
    ...data.CUSTOMERS.map((c) => `| CUSTOMER | ${c.firstName} ${c.lastName} | ${c.email} | \`${passwords.customer}\` |`),
  ].join("\n");
  const report = `# FullCamper seed report (${PROFILE} profile)

Generated ${new Date().toISOString()} against \`${maskedTarget(env.MONGODB_URI)}\`.
**This file is git-ignored. The passwords below are for demo/development accounts only; never reuse them.**

## Accounts

Customers sign in at the customer site, admins at the admin dashboard (separate sessions).

${accounts}

## Collections

${table}

## Integrity

- Dangling references: ${result.dangling.length === 0 ? "none" : result.dangling.join("; ")}
- Passwords bcrypt-hashed and verifiable: ${result.passwordsHashed ? "yes" : "NO"}
- Seeded customers all have role CUSTOMER: ${result.customersAreCustomers ? "yes" : "NO"}
- Seeded admin roles: ${result.adminRoles}
- Unique indexes present: ${result.missingUniqueIndexes.length === 0 ? "yes" : `missing ${result.missingUniqueIndexes.join(", ")}`}
- Past/active bookings marked PAID: ${result.paidHistoricalBookings}/${result.tripCount}
- Campers with a rating from reviews: ${result.ratedCampers}
- Pre-existing records: ${protection}
`;
  mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  writeFileSync(REPORT_PATH, report, "utf8");
};

/* ---------------- main ---------------- */

const run = async (): Promise<void> => {
  assertSafeTarget();
  const passwords = resolvePasswords();
  const connection = await connectDatabase();
  try {
    if (!isLocalTarget() && connection.connection.name !== process.env.SEED_ALLOW_REMOTE_DB) {
      throw new Error(`Connected to "${connection.connection.name}", which does not match SEED_ALLOW_REMOTE_DB`);
    }
    log(`Seeding (${PROFILE} profile) database "${connection.connection.name}" on ${maskedTarget(env.MONGODB_URI)}`);
    // Unique indexes must exist before inserting, or duplicates could slip in. (createIndexes only adds, never drops.)
    await Promise.all(mongoose.modelNames().map((name) => mongoose.model(name).init()));

    const seedEmails = [...data.CUSTOMERS, ...data.ADMINS].map((m) => m.email);
    const before = await snapshotExisting(seedEmails);
    log(`Pre-existing records: ${before.memberCount} members, ${before.sessionIds.length} sessions, settings fingerprinted.`);

    const now = new Date();
    const today = todayInBusinessTimezone(now);

    // Settings are insert-only: an existing business settings record is never changed.
    if (!(await BusinessSettingsModel.exists({ key: "business" }))) {
      await settingsService.update(settingsUpdateSchema.parse(data.SETTINGS));
      log("Business settings created (none existed).");
    } else {
      log("Business settings already exist: left unchanged.");
    }
    const settings = await BusinessSettingsModel.findOne({ key: "business" }).lean().exec();
    if (!settings) throw new Error("Business settings are missing");

    const admins = await seedAdmins(passwords);
    const customers = await seedCustomers(today, passwords);
    const categories = await seedCategories();
    const features = await seedFeatures();
    const campers = await seedCampers(categories, features, admins.actorId);
    await seedCampingPlaces();
    await seedCoupons(now);

    const ctx = { today, customers, campers, adminId: admins.actorId, weekendNights: settings.weekendNights, currency: settings.currency };
    const completed: Types.ObjectId[] = [];
    for (const [index, trip] of data.PAST_TRIPS.entries()) {
      completed.push(await seedHistoricalTrip(`past-${index}`, trip, BookingStatus.COMPLETED, ctx));
    }
    const active: Types.ObjectId[] = [];
    for (const [index, trip] of data.ACTIVE_TRIPS.entries()) {
      active.push(await seedHistoricalTrip(index === 0 ? "active" : `active-${index}`, trip, BookingStatus.ACTIVE, ctx));
    }
    await seedUpcomingTrips(ctx);

    await seedReviews(completed, customers, admins.actorId);
    await seedFavorites(customers, campers);
    await seedInquiries(customers, campers, admins.actorId);

    log("\nThis run:");
    for (const [collection, counter] of counters) log(`  ${collection.padEnd(22)} created ${counter.created}, already present ${counter.existing}`);

    const after = await snapshotExisting(seedEmails);
    const membersUnchanged = before.members === after.members && before.memberCount === after.memberCount;
    const settingsUnchanged = before.settings === after.settings;
    const sessionsKept = before.sessionIds.every((id) => after.sessionIds.includes(id));
    const protection = `members ${membersUnchanged ? "unchanged" : "CHANGED"}, settings ${settingsUnchanged ? "values unchanged" : "CHANGED (only expected when none existed)"}, sessions ${sessionsKept ? "all kept" : "MISSING"}`;

    const result = await verify(
      {
        customerEmails: data.CUSTOMERS.map((c) => c.email),
        adminEmails: data.ADMINS.map((a) => a.email),
        historicalBookingIds: [...completed, ...active],
        customerIds: customers,
      },
      passwords,
    );
    log("\nVerification:");
    for (const row of result.rows) {
      log(`  ${row.collection.padEnd(22)} expected ${row.expected.padEnd(14)} total ${String(row.total).padStart(3)}  seeded ${String(row.seeded).padStart(3)}  valid ${row.valid ? "yes" : "NO"}`);
    }
    log(`  dangling references: ${result.dangling.length === 0 ? "none" : result.dangling.join("; ")}`);
    log(`  passwords hashed: ${result.passwordsHashed ? "yes" : "NO"}; customers are CUSTOMER only: ${result.customersAreCustomers ? "yes" : "NO"}`);
    log(`  admin roles: ${result.adminRoles}`);
    log(`  unique indexes: ${result.missingUniqueIndexes.length === 0 ? "all present" : result.missingUniqueIndexes.join(", ")}`);
    log(`  pre-existing records: ${protection}`);
    writeReport(result, passwords, protection);
    log(`\nCredentials and results written to ${path.relative(process.cwd(), REPORT_PATH)} (git-ignored).`);

    const failed =
      result.dangling.length > 0 || !result.passwordsHashed || !result.customersAreCustomers || result.missingUniqueIndexes.length > 0 ||
      result.rows.some((r) => !r.valid) || !membersUnchanged || !sessionsKept;
    if (failed) process.exitCode = 1;
  } finally {
    await disconnectDatabase();
  }
};

run().catch((error: unknown) => {
  // Never echo a connection string (it can contain credentials).
  const message = (error instanceof Error ? error.stack ?? error.message : String(error)).replace(/mongodb(\+srv)?:\/\/[^\s"']+/g, "<mongodb-uri>");
  process.stderr.write(`Seed failed: ${message}\n`);
  process.exit(1);
});

