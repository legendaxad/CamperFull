import { BookingStatus, CamperStatus, DiscountType } from "../src/constants/enums";
import { BookingModel, CouponModel } from "../src/models";
import { bookingService } from "../src/services/Booking.service";
import { bookingBody, createCamper, day, nextWeekdayOffset } from "./fixtures";
import { api, loginAdmin, registerCustomer, resetDatabase } from "./helpers";

describe("Booking system", () => {
  beforeEach(resetDatabase);

  it("creates a pending booking with a server-calculated price", async () => {
    const camper = await createCamper();
    const { client } = await registerCustomer();
    const monday = nextWeekdayOffset(1);

    const response = await client
      .post("/api/v1/bookings")
      .send(bookingBody(camper.id, monday, monday + 4, { extras: [{ extraId: camper.extras[0]!._id.toString(), quantity: 2 }] }))
      .expect(201);

    const booking = response.body.data;
    expect(booking.status).toBe(BookingStatus.PENDING);
    expect(booking.bookingNumber).toMatch(/^FC-\d{6}-[A-Z2-9]{6}$/);
    // Mon-Thu nights are weekday nights: 4 x 100,000 + cleaning 30,000 + 2 bedding kits 40,000.
    expect(booking.price).toMatchObject({ nights: 4, weekdayNights: 4, rentalSubtotal: 400000, extrasTotal: 40000, total: 470000 });
    expect(booking.holdExpiresAt).toBeTruthy();
  });

  it("ignores client-supplied prices", async () => {
    const camper = await createCamper();
    const { client } = await registerCustomer();
    await client
      .post("/api/v1/bookings")
      .send({ ...bookingBody(camper.id, 10, 12), price: { total: 1 } })
      .expect(400);
  });

  it("prevents overlapping bookings but allows back-to-back stays", async () => {
    const camper = await createCamper();
    const { client: first } = await registerCustomer();
    const { client: second } = await registerCustomer();

    // Mirrors "June 10-15" vs "June 12-17" vs "June 15-20".
    await first.post("/api/v1/bookings").send(bookingBody(camper.id, 10, 15)).expect(201);
    const overlap = await second.post("/api/v1/bookings").send(bookingBody(camper.id, 12, 17)).expect(409);
    expect(overlap.body.message).toMatch(/already booked/);
    await second.post("/api/v1/bookings").send(bookingBody(camper.id, 15, 20)).expect(201);
    await second.post("/api/v1/bookings").send(bookingBody(camper.id, 8, 10)).expect(201);
    await second.post("/api/v1/bookings").send(bookingBody(camper.id, 9, 11)).expect(409);
    await second.post("/api/v1/bookings").send(bookingBody(camper.id, 11, 12)).expect(409);
  });

  it("lets exactly one of many concurrent requests reserve the same dates", async () => {
    const camper = await createCamper();
    const customers = await Promise.all(Array.from({ length: 8 }, () => registerCustomer()));

    const responses = await Promise.all(
      customers.map(({ client }, index) =>
        // Different but overlapping ranges, all sent at the same moment.
        client.post("/api/v1/bookings").send(bookingBody(camper.id, 20 + (index % 3), 25 + (index % 3))),
      ),
    );

    const statuses = responses.map((response) => response.status).sort();
    expect(statuses.filter((status) => status === 201)).toHaveLength(1);
    expect(statuses.filter((status) => status === 409)).toHaveLength(7);
    expect(await BookingModel.countDocuments({ camper: camper._id })).toBe(1);
  });

  it("validates dates and stay rules", async () => {
    const camper = await createCamper({ minNights: 2, maxNights: 5 });
    const { client } = await registerCustomer();

    await client.post("/api/v1/bookings").send(bookingBody(camper.id, -2, 2)).expect(400); // in the past
    await client.post("/api/v1/bookings").send(bookingBody(camper.id, 0, 3)).expect(400); // lead time (1 day)
    await client.post("/api/v1/bookings").send(bookingBody(camper.id, 10, 10)).expect(400); // zero nights
    await client.post("/api/v1/bookings").send(bookingBody(camper.id, 10, 8)).expect(400); // reversed
    await client.post("/api/v1/bookings").send(bookingBody(camper.id, 10, 11)).expect(400); // below minNights
    await client.post("/api/v1/bookings").send(bookingBody(camper.id, 10, 16)).expect(400); // above maxNights
    await client.post("/api/v1/bookings").send({ ...bookingBody(camper.id, 10, 12), startDate: "2026-13-01" }).expect(400);
    await client.post("/api/v1/bookings").send(bookingBody(camper.id, 10, 12)).expect(201);
  });

  it("does not book campers that are not available", async () => {
    const camper = await createCamper({ status: CamperStatus.MAINTENANCE });
    const { client } = await registerCustomer();
    await client.post("/api/v1/bookings").send(bookingBody(camper.id, 10, 12)).expect(400);
  });

  it("releases dates when the payment hold expires", async () => {
    const camper = await createCamper();
    const { client: first } = await registerCustomer();
    const { client: second } = await registerCustomer();

    const created = await first.post("/api/v1/bookings").send(bookingBody(camper.id, 10, 13)).expect(201);
    await BookingModel.updateOne({ _id: created.body.data._id }, { holdExpiresAt: new Date(Date.now() - 1000) });

    // The expired hold no longer blocks, even before the sweep runs.
    await second.post("/api/v1/bookings").send(bookingBody(camper.id, 11, 12)).expect(201);

    expect(await bookingService.expireStaleBookings()).toBe(1);
    const expired = await BookingModel.findById(created.body.data._id).lean();
    expect(expired?.status).toBe(BookingStatus.CANCELLED);
  });

  it("returns availability ranges without customer data", async () => {
    const camper = await createCamper();
    const { client } = await registerCustomer();
    await client.post("/api/v1/bookings").send(bookingBody(camper.id, 10, 13)).expect(201);

    const response = await api().get(`/api/v1/campers/${camper.slug}/availability?from=${day(1)}&to=${day(30)}`).expect(200);
    expect(response.body.data.blocked).toEqual([{ startDate: day(10), endDate: day(13) }]);
    expect(JSON.stringify(response.body)).not.toMatch(/customer|driver/);
  });

  it("keeps bookings private to their owner", async () => {
    const camper = await createCamper();
    const { client: owner } = await registerCustomer();
    const { client: stranger } = await registerCustomer();
    const created = await owner.post("/api/v1/bookings").send(bookingBody(camper.id, 10, 12)).expect(201);

    await owner.get(`/api/v1/bookings/${created.body.data._id}`).expect(200);
    await stranger.get(`/api/v1/bookings/${created.body.data._id}`).expect(404);
    const history = await owner.get("/api/v1/bookings").expect(200);
    expect(history.body.meta.total).toBe(1);
    await api().get("/api/v1/bookings").expect(401);
  });

  it("lets a customer cancel a pending booking, freeing the dates", async () => {
    const camper = await createCamper();
    const { client } = await registerCustomer();
    const created = await client.post("/api/v1/bookings").send(bookingBody(camper.id, 10, 12)).expect(201);

    const cancelled = await client.post(`/api/v1/bookings/${created.body.data._id}/cancel`).send({ reason: "Plans changed" }).expect(200);
    expect(cancelled.body.data.status).toBe(BookingStatus.CANCELLED);
    await client.post("/api/v1/bookings").send(bookingBody(camper.id, 10, 12)).expect(201);
  });

  it("enforces the booking lifecycle for admins", async () => {
    const camper = await createCamper();
    const { client: customer } = await registerCustomer();
    const { client: admin } = await loginAdmin();
    const created = await customer.post("/api/v1/bookings").send(bookingBody(camper.id, 10, 12)).expect(201);
    const url = `/api/v1/admin/bookings/${created.body.data._id}/status`;

    await admin.patch(url).send({ status: BookingStatus.COMPLETED }).expect(400); // PENDING -> COMPLETED not allowed
    await admin.patch(url).send({ status: BookingStatus.CONFIRMED }).expect(200);
    await admin.patch(url).send({ status: BookingStatus.ACTIVE }).expect(400); // before pickup date

    const detail = await admin.get(`/api/v1/admin/bookings/${created.body.data._id}`).expect(200);
    expect(detail.body.data.statusHistory.map((entry: { status: string }) => entry.status)).toEqual([
      BookingStatus.PENDING,
      BookingStatus.CONFIRMED,
    ]);
    expect(detail.body.data.customer.email).toBeDefined();
  });

  it("re-checks availability when an admin confirms an expired booking", async () => {
    const camper = await createCamper();
    const { client: first } = await registerCustomer();
    const { client: second } = await registerCustomer();
    const { client: admin } = await loginAdmin();

    const stale = await first.post("/api/v1/bookings").send(bookingBody(camper.id, 10, 13)).expect(201);
    await BookingModel.updateOne({ _id: stale.body.data._id }, { holdExpiresAt: new Date(Date.now() - 1000) });
    const fresh = await second.post("/api/v1/bookings").send(bookingBody(camper.id, 10, 13)).expect(201);
    await admin.patch(`/api/v1/admin/bookings/${fresh.body.data._id}/status`).send({ status: BookingStatus.CONFIRMED }).expect(200);

    await admin.patch(`/api/v1/admin/bookings/${stale.body.data._id}/status`).send({ status: BookingStatus.CONFIRMED }).expect(409);
  });

  it("filters the catalog by availability", async () => {
    const busy = await createCamper({ name: "Busy" });
    await createCamper({ name: "Free" });
    const { client } = await registerCustomer();
    await client.post("/api/v1/bookings").send(bookingBody(busy.id, 10, 13)).expect(201);

    const response = await api().get(`/api/v1/campers?startDate=${day(11)}&endDate=${day(12)}`).expect(200);
    expect(response.body.data.map((camper: { name: string }) => camper.name)).toEqual(["Free"]);
  });
});

describe("Coupons", () => {
  beforeEach(resetDatabase);

  it("applies percentage coupons with a cap, and rejects ones below the minimum amount", async () => {
    const camper = await createCamper();
    const monday = nextWeekdayOffset(1);
    await CouponModel.create({ code: "SUMMER20", discountType: DiscountType.PERCENTAGE, discountValue: 20, maxDiscountAmount: 50000 });
    await CouponModel.create({ code: "BIGTRIP", discountType: DiscountType.FIXED, discountValue: 30000, minBookingAmount: 1000000 });

    const quote = await api()
      .post("/api/v1/coupons/validate")
      .send({ camperId: camper.id, startDate: day(monday), endDate: day(monday + 2), couponCode: "summer20" })
      .expect(200);
    // subtotal = 2 x 100,000 + 30,000 = 230,000; 20% = 46,000 (under the 50,000 cap)
    expect(quote.body.data.price).toMatchObject({ subtotal: 230000, discount: 46000, total: 184000 });

    const rejected = await api()
      .post("/api/v1/coupons/validate")
      .send({ camperId: camper.id, startDate: day(monday), endDate: day(monday + 2), couponCode: "BIGTRIP" })
      .expect(400);
    expect(rejected.body.errors[0].message).toMatch(/Minimum booking amount/);
  });

  it("rejects expired and inactive coupons", async () => {
    const camper = await createCamper();
    await CouponModel.create({ code: "OLD", discountType: DiscountType.FIXED, discountValue: 1000, expiresAt: new Date(Date.now() - 1000) });
    await CouponModel.create({ code: "OFF", discountType: DiscountType.FIXED, discountValue: 1000, isActive: false });
    for (const couponCode of ["OLD", "OFF", "NOPE"]) {
      await api().post("/api/v1/coupons/validate").send({ camperId: camper.id, startDate: day(10), endDate: day(12), couponCode }).expect(400);
    }
  });

  it("never exceeds the usage limit under concurrency and returns uses on cancellation", async () => {
    const campers = await Promise.all([createCamper(), createCamper(), createCamper()]);
    await CouponModel.create({ code: "ONCE", discountType: DiscountType.FIXED, discountValue: 10000, usageLimit: 1 });
    const customers = await Promise.all(campers.map(() => registerCustomer()));

    const responses = await Promise.all(
      customers.map(({ client }, index) =>
        client.post("/api/v1/bookings").send(bookingBody(campers[index]!.id, 10, 12, { couponCode: "ONCE" })),
      ),
    );
    expect(responses.filter((response) => response.status === 201)).toHaveLength(1);
    expect((await CouponModel.findOne({ code: "ONCE" }).lean())?.usageCount).toBe(1);

    const winner = responses.find((response) => response.status === 201)!;
    const winnerClient = customers[responses.indexOf(winner)]!.client;
    await winnerClient.post(`/api/v1/bookings/${winner.body.data._id}/cancel`).send({}).expect(200);
    expect((await CouponModel.findOne({ code: "ONCE" }).lean())?.usageCount).toBe(0);
  });

  it("lets admins manage coupons and validates percentage limits", async () => {
    const { client: admin } = await loginAdmin();
    await admin.post("/api/v1/admin/coupons").send({ code: "BAD", discountType: "PERCENTAGE", discountValue: 150 }).expect(400);
    const created = await admin.post("/api/v1/admin/coupons").send({ code: "welcome10", discountType: "PERCENTAGE", discountValue: 10 }).expect(201);
    expect(created.body.data.code).toBe("WELCOME10");
    await admin.post("/api/v1/admin/coupons").send({ code: "WELCOME10", discountType: "FIXED", discountValue: 5 }).expect(409);
    await admin.patch(`/api/v1/admin/coupons/${created.body.data._id}`).send({ discountValue: 120 }).expect(400);
    const removed = await admin.delete(`/api/v1/admin/coupons/${created.body.data._id}`).expect(200);
    expect(removed.body.data.deleted).toBe(true);
  });
});
