import { BookingStatus, CamperStatus, ReviewStatus } from "../src/constants/enums";
import { BookingModel, CamperModel, NotificationModel } from "../src/models";
import { bookingBody, createCamper, createCategory } from "./fixtures";
import { api, loginAdmin, registerCustomer, resetDatabase } from "./helpers";

const camperPayload = (categoryId: string, overrides: Record<string, unknown> = {}) => ({
  name: "르벤투스 S+",
  category: categoryId,
  description: "Renault Master based motorhome with heating while driving.",
  highlights: [{ title: "Heating when driving", description: "Fuel heating warms the cabin on the road." }],
  brand: "Renault",
  company: "다온티앤티",
  baseVehicle: "르노마스터",
  modelYear: 2022,
  licenseType: "CLASS1_ORDINARY",
  capacity: { seats: 4, sleeps: 4 },
  location: { region: "수도권", city: "Seoul" },
  pricing: { dailyRate: 180000, weekendDailyRate: 220000, cleaningFee: 50000, securityDeposit: 500000 },
  extras: [{ name: "Bike rack", price: 15000, chargeType: "PER_BOOKING" }],
  ...overrides,
});

describe("Camper management", () => {
  beforeEach(resetDatabase);

  it("lets admins create, update, archive and inspect campers", async () => {
    const { client: admin } = await loginAdmin();
    const category = await admin.post("/api/v1/admin/categories").send({ name: "Motorhome" }).expect(201);
    const feature = await admin.post("/api/v1/admin/features").send({ name: "Solar panel", group: "Power" }).expect(201);

    const created = await admin
      .post("/api/v1/admin/campers")
      .send(camperPayload(category.body.data._id, { features: [feature.body.data._id] }))
      .expect(201);
    const camper = created.body.data;
    expect(camper.slug).toBe("르벤투스-s");
    expect(camper.category.name).toBe("Motorhome");
    expect(camper.features[0].name).toBe("Solar panel");
    expect(camper.bookingLockVersion).toBeUndefined();

    const updated = await admin
      .patch(`/api/v1/admin/campers/${camper._id}`)
      .send({ pricing: { dailyRate: 190000, cleaningFee: 50000, securityDeposit: 500000 }, isFeatured: true })
      .expect(200);
    expect(updated.body.data).toMatchObject({ isFeatured: true, pricing: { dailyRate: 190000 } });

    await admin.patch(`/api/v1/admin/campers/${camper._id}/status`).send({ status: "ARCHIVED" }).expect(200);
    await api().get(`/api/v1/campers/${camper._id}`).expect(404);
    const archived = await admin.get("/api/v1/admin/campers?status=ARCHIVED").expect(200);
    expect(archived.body.meta.total).toBe(1);
  });

  it("only changes the fields sent in a partial update", async () => {
    const { client: admin } = await loginAdmin();
    const camper = await createCamper({ status: CamperStatus.MAINTENANCE, isFeatured: true, minNights: 3 });

    const updated = await admin.patch(`/api/v1/admin/campers/${camper.id}`).send({ name: "Renamed" }).expect(200);
    expect(updated.body.data).toMatchObject({ name: "Renamed", status: CamperStatus.MAINTENANCE, isFeatured: true, minNights: 3 });
    expect(updated.body.data.extras).toHaveLength(1);

    const coupon = await admin.post("/api/v1/admin/coupons").send({ code: "KEEP", discountType: "FIXED", discountValue: 5000, isActive: false, minBookingAmount: 90000 }).expect(201);
    const patched = await admin.patch(`/api/v1/admin/coupons/${coupon.body.data._id}`).send({ description: "Still inactive" }).expect(200);
    expect(patched.body.data).toMatchObject({ isActive: false, minBookingAmount: 90000 });
  });

  it("validates camper input", async () => {
    const { client: admin } = await loginAdmin();
    const category = await createCategory();
    const response = await admin
      .post("/api/v1/admin/campers")
      .send(camperPayload(category.id, { pricing: { dailyRate: -5 }, licenseType: "BICYCLE", minNights: 5, maxNights: 2 }))
      .expect(400);
    const fields = response.body.errors.map((error: { field: string }) => error.field);
    expect(fields).toEqual(expect.arrayContaining(["body.pricing.dailyRate", "body.licenseType"]));

    await admin.post("/api/v1/admin/campers").send(camperPayload("64b000000000000000000000")).expect(400);
  });

  it("refuses to delete campers with booking history", async () => {
    const { client: admin } = await loginAdmin();
    const camper = await createCamper();
    const { client } = await registerCustomer();
    await client.post("/api/v1/bookings").send(bookingBody(camper.id, 10, 12)).expect(201);

    await admin.delete(`/api/v1/admin/campers/${camper.id}`).expect(409);
    const unused = await createCamper();
    await admin.delete(`/api/v1/admin/campers/${unused.id}`).expect(200);
    expect(await CamperModel.exists({ _id: unused._id })).toBeNull();
  });

  it("returns 503 for image uploads when Cloudinary is not configured", async () => {
    const { client: admin } = await loginAdmin();
    const camper = await createCamper();
    await admin
      .post(`/api/v1/admin/campers/${camper.id}/images`)
      .attach("images", Buffer.from([0xff, 0xd8, 0xff, 0xe0]), "photo.jpg")
      .expect(503);
  });

  it("keeps camper management behind admin authentication", async () => {
    const { client: customer } = await registerCustomer();
    await customer.post("/api/v1/admin/campers").send({}).expect(401);
    await api().get("/api/v1/admin/campers").expect(401);
  });
});

describe("Public catalog", () => {
  beforeEach(resetDatabase);

  it("searches, filters, sorts and paginates bookable campers", async () => {
    const motorhome = await createCategory("Motorhome");
    await createCamper({ name: "Luxury Glide", category: motorhome._id, brand: "Hymer", pricing: { dailyRate: 300000 }, capacity: { seats: 6, sleeps: 6 } });
    await createCamper({ name: "Eco Traveler", brand: "Knaus", pricing: { dailyRate: 120000 }, location: { region: "Busan" } });
    await createCamper({ name: "Hidden One", status: CamperStatus.MAINTENANCE });

    const all = await api().get("/api/v1/campers?sort=price_asc").expect(200);
    expect(all.body.data.map((camper: { name: string }) => camper.name)).toEqual(["Eco Traveler", "Luxury Glide"]);
    expect(all.body.meta).toMatchObject({ page: 1, total: 2, totalPages: 1 });

    const search = await api().get("/api/v1/campers?search=luxu").expect(200);
    expect(search.body.data).toHaveLength(1);

    const filtered = await api().get(`/api/v1/campers?category=${motorhome.slug}&minSeats=5&maxPrice=350000`).expect(200);
    expect(filtered.body.data.map((camper: { name: string }) => camper.name)).toEqual(["Luxury Glide"]);

    const byBrand = await api().get("/api/v1/campers?brand=Knaus,Unknown&region=Busan").expect(200);
    expect(byBrand.body.data).toHaveLength(1);

    const paged = await api().get("/api/v1/campers?limit=1&page=2&sort=price_asc").expect(200);
    expect(paged.body.data[0].name).toBe("Luxury Glide");
    expect(paged.body.meta).toMatchObject({ hasPrevPage: true, hasNextPage: false });

    await api().get("/api/v1/campers?limit=1000").expect(400);
    await api().get("/api/v1/campers?search=(((((a*)*)*)*)").expect(200);
  });

  it("returns filter options and comparisons, and counts views", async () => {
    const first = await createCamper({ brand: "Hymer", company: "Green Campers", pricing: { dailyRate: 100000 } });
    const second = await createCamper({ brand: "Knaus", pricing: { dailyRate: 250000 } });

    const filters = await api().get("/api/v1/campers/filters").expect(200);
    expect(filters.body.data).toMatchObject({ brands: ["Hymer", "Knaus"], priceRange: { min: 100000, max: 250000 } });

    const compare = await api().get(`/api/v1/campers/compare?ids=${second.id},${first.id}`).expect(200);
    expect(compare.body.data.map((camper: { _id: string }) => camper._id)).toEqual([second.id, first.id]);

    await api().get(`/api/v1/campers/${first.slug}`).expect(200);
    const viewed = await api().get(`/api/v1/campers/${first.id}`).expect(200);
    expect(viewed.body.data.viewCount).toBe(2);
  });

  it("lists categories with camper counts and camping places", async () => {
    const { client: admin } = await loginAdmin();
    const category = await createCategory("Caravan");
    await createCamper({ category: category._id });
    await admin
      .post("/api/v1/admin/camping-places")
      .send({ name: "Nami Island Camping Grounds", region: "Gangwon-do", facilities: ["Electricity"], coordinates: { latitude: 37.791, longitude: 127.525 } })
      .expect(201);

    const categories = await api().get("/api/v1/categories").expect(200);
    expect(categories.body.data.find((item: { name: string }) => item.name === "Caravan").camperCount).toBe(1);

    const places = await api().get("/api/v1/camping-places?region=gangwon").expect(200);
    expect(places.body.data[0].slug).toBe("nami-island-camping-grounds");
    await api().get(`/api/v1/camping-places/${places.body.data[0].slug}`).expect(200);
  });
});

describe("Reviews and favorites", () => {
  beforeEach(resetDatabase);

  const completedBooking = async () => {
    const camper = await createCamper();
    const { client, member } = await registerCustomer();
    const created = await client.post("/api/v1/bookings").send(bookingBody(camper.id, 10, 12)).expect(201);
    return { camper, client, member, bookingId: created.body.data._id as string };
  };

  it("only allows reviews for the customer's completed bookings, once", async () => {
    const { camper, client, bookingId } = await completedBooking();
    await client.post("/api/v1/reviews").send({ bookingId, rating: 5, comment: "Fantastic trip" }).expect(400);

    await BookingModel.updateOne({ _id: bookingId }, { status: BookingStatus.COMPLETED });
    const { client: stranger } = await registerCustomer();
    await stranger.post("/api/v1/reviews").send({ bookingId, rating: 1, comment: "Not mine" }).expect(404);

    await client.post("/api/v1/reviews").send({ bookingId, rating: 5, comment: "Fantastic trip" }).expect(201);
    await client.post("/api/v1/reviews").send({ bookingId, rating: 4, comment: "Again" }).expect(409);

    const reviews = await api().get(`/api/v1/campers/${camper.id}/reviews`).expect(200);
    expect(reviews.body.summary).toMatchObject({ average: 5, count: 1 });
    expect(reviews.body.data[0].customer.email).toBeUndefined();
    expect((await CamperModel.findById(camper._id).lean())?.ratingAverage).toBe(5);
  });

  it("recalculates ratings on update, moderation and deletion", async () => {
    const { client: admin } = await loginAdmin();
    const first = await completedBooking();
    await BookingModel.updateOne({ _id: first.bookingId }, { status: BookingStatus.COMPLETED });
    const review = await first.client.post("/api/v1/reviews").send({ bookingId: first.bookingId, rating: 2, comment: "Okay trip" }).expect(201);

    await first.client.patch(`/api/v1/reviews/${review.body.data._id}`).send({ rating: 4 }).expect(200);
    expect((await CamperModel.findById(first.camper._id).lean())?.ratingAverage).toBe(4);

    await admin.patch(`/api/v1/admin/reviews/${review.body.data._id}`).send({ status: ReviewStatus.HIDDEN, adminReply: "Thanks" }).expect(200);
    expect((await CamperModel.findById(first.camper._id).lean())?.ratingCount).toBe(0);
    const publicReviews = await api().get(`/api/v1/campers/${first.camper.id}/reviews`).expect(200);
    expect(publicReviews.body.data).toHaveLength(0);
    expect(await NotificationModel.countDocuments({ type: "REVIEW_CREATED" })).toBe(1);
  });

  it("adds favorites idempotently and lists them", async () => {
    const camper = await createCamper();
    const { client } = await registerCustomer();

    await client.post(`/api/v1/favorites/${camper.id}`).expect(201);
    await client.post(`/api/v1/favorites/${camper.id}`).expect(200);
    const results = await Promise.all([1, 2, 3].map(() => client.post(`/api/v1/favorites/${camper.id}`)));
    expect(results.every((response) => response.status === 200)).toBe(true);

    const list = await client.get("/api/v1/favorites").expect(200);
    expect(list.body.meta.total).toBe(1);
    expect(list.body.data[0]._id).toBe(camper.id);
    const ids = await client.get("/api/v1/favorites/ids").expect(200);
    expect(ids.body.data).toEqual([camper.id]);

    await client.delete(`/api/v1/favorites/${camper.id}`).expect(200);
    await client.delete(`/api/v1/favorites/${camper.id}`).expect(404);
  });
});

describe("Inquiries, notifications and settings", () => {
  beforeEach(resetDatabase);

  it("accepts contact messages and notifies admins", async () => {
    const { client: admin } = await loginAdmin();
    await api()
      .post("/api/v1/inquiries")
      .send({ name: "Visitor", email: "visitor@example.com", subject: "Pets allowed?", message: "Can I bring my dog?" })
      .expect(201);

    const unread = await admin.get("/api/v1/admin/notifications/unread-count").expect(200);
    expect(unread.body.data.count).toBe(1);
    const inquiries = await admin.get("/api/v1/admin/inquiries?status=NEW").expect(200);
    await admin.patch(`/api/v1/admin/inquiries/${inquiries.body.data[0]._id}`).send({ status: "RESOLVED", adminReply: "Yes!" }).expect(200);
    await admin.patch("/api/v1/admin/notifications/read-all").expect(200);
    expect((await admin.get("/api/v1/admin/notifications/unread-count")).body.data.count).toBe(0);
  });

  it("notifies customers about their bookings", async () => {
    const camper = await createCamper();
    const { client } = await registerCustomer();
    await client.post("/api/v1/bookings").send(bookingBody(camper.id, 10, 12)).expect(201);

    const notifications = await client.get("/api/v1/notifications?unread=true").expect(200);
    expect(notifications.body.data[0].type).toBe("BOOKING_CREATED");
    await client.patch(`/api/v1/notifications/${notifications.body.data[0]._id}/read`).expect(200);
    expect((await client.get("/api/v1/notifications/unread-count")).body.data.count).toBe(0);
  });

  it("exposes public settings and lets admins update them", async () => {
    const { client: admin } = await loginAdmin();
    await admin.patch("/api/v1/admin/settings").send({ freeCancellationDays: 5, bookingHoldMinutes: 3 }).expect(400);
    await admin.patch("/api/v1/admin/settings").send({ freeCancellationDays: 5, contactPhone: "02-123-4567" }).expect(200);
    const settings = await api().get("/api/v1/settings").expect(200);
    expect(settings.body.data).toMatchObject({ freeCancellationDays: 5, contactPhone: "021234567" });
    expect(settings.body.data.weekendNights).toBeUndefined();
  });
});
