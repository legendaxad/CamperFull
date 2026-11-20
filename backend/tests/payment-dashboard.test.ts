import TestAgent from "supertest/lib/agent";
import { BookingStatus, PaymentStatus } from "../src/constants/enums";
import { BookingModel, PaymentModel } from "../src/models";
import { paymentService } from "../src/services/Payment.service";
import { bookingBody, createCamper, day } from "./fixtures";
import { api, loginAdmin, registerCustomer, resetDatabase } from "./helpers";

const createBookingAndCheckout = async (client: TestAgent, camperId: string, start = 10, end = 12) => {
  const booking = await client.post("/api/v1/bookings").send(bookingBody(camperId, start, end)).expect(201);
  const checkout = await client.post("/api/v1/payments/checkout").send({ bookingId: booking.body.data._id }).expect(201);
  return { booking: booking.body.data, checkout: checkout.body.data };
};

let transactionCounter = 0;
const transactionId = (prefix = "tx") => `${prefix}_${Date.now()}_${transactionCounter++}`;

describe("Payments", () => {
  beforeEach(resetDatabase);

  it("confirms a booking only after the provider verifies the payment", async () => {
    const camper = await createCamper();
    const { client } = await registerCustomer();
    const { booking, checkout } = await createBookingAndCheckout(client, camper.id);

    expect(checkout).toMatchObject({ amount: booking.price.total, currency: "KRW", provider: "MOCK" });
    const again = await client.post("/api/v1/payments/checkout").send({ bookingId: booking._id }).expect(201);
    expect(again.body.data.orderId).toBe(checkout.orderId); // reuses the open attempt

    const tx = transactionId();
    const confirmed = await client.post("/api/v1/payments/confirm").send({ transactionId: tx, orderId: checkout.orderId, amount: checkout.amount }).expect(200);
    expect(confirmed.body.data).toMatchObject({ status: PaymentStatus.PAID, transactionId: tx });

    // Repeating the confirm (e.g. redirect page reload) is harmless.
    await client.post("/api/v1/payments/confirm").send({ transactionId: tx, orderId: checkout.orderId, amount: checkout.amount }).expect(200);

    const updated = await client.get(`/api/v1/bookings/${booking._id}`).expect(200);
    expect(updated.body.data).toMatchObject({ status: BookingStatus.CONFIRMED, paymentStatus: PaymentStatus.PAID });
    expect(await PaymentModel.countDocuments({ status: PaymentStatus.PAID })).toBe(1);
  });

  it("rejects a tampered amount without contacting the provider", async () => {
    const camper = await createCamper();
    const { client } = await registerCustomer();
    const { booking, checkout } = await createBookingAndCheckout(client, camper.id);

    await client.post("/api/v1/payments/confirm").send({ transactionId: transactionId(), orderId: checkout.orderId, amount: 100 }).expect(400);
    expect((await PaymentModel.findOne({ orderId: checkout.orderId }).lean())?.status).toBe(PaymentStatus.FAILED);
    expect((await BookingModel.findById(booking._id).lean())?.status).toBe(BookingStatus.PENDING);
  });

  it("records declined payments and keeps the booking pending for a retry", async () => {
    const camper = await createCamper();
    const { client } = await registerCustomer();
    const { booking, checkout } = await createBookingAndCheckout(client, camper.id);

    const declined = await client
      .post("/api/v1/payments/confirm")
      .send({ transactionId: transactionId("fail"), orderId: checkout.orderId, amount: checkout.amount })
      .expect(400);
    expect(declined.body.message).toMatch(/declined/);
    expect((await BookingModel.findById(booking._id).lean())?.status).toBe(BookingStatus.PENDING);

    const retry = await client.post("/api/v1/payments/checkout").send({ bookingId: booking._id }).expect(201);
    expect(retry.body.data.orderId).not.toBe(checkout.orderId);
    await client.post("/api/v1/payments/confirm").send({ transactionId: transactionId(), orderId: retry.body.data.orderId, amount: checkout.amount }).expect(200);
  });

  it("does not let customers pay for someone else's booking or an expired hold", async () => {
    const camper = await createCamper();
    const { client: owner } = await registerCustomer();
    const { client: stranger } = await registerCustomer();
    const booking = await owner.post("/api/v1/bookings").send(bookingBody(camper.id, 10, 12)).expect(201);

    await stranger.post("/api/v1/payments/checkout").send({ bookingId: booking.body.data._id }).expect(404);
    await BookingModel.updateOne({ _id: booking.body.data._id }, { holdExpiresAt: new Date(Date.now() - 1000) });
    await owner.post("/api/v1/payments/checkout").send({ bookingId: booking.body.data._id }).expect(400);
  });

  it("refunds automatically when a paid booking is cancelled within the policy", async () => {
    const camper = await createCamper();
    const { client } = await registerCustomer();
    const { booking, checkout } = await createBookingAndCheckout(client, camper.id, 10, 12);
    await client.post("/api/v1/payments/confirm").send({ transactionId: transactionId(), orderId: checkout.orderId, amount: checkout.amount }).expect(200);

    const cancelled = await client.post(`/api/v1/bookings/${booking._id}/cancel`).send({ reason: "Sick" }).expect(200);
    expect(cancelled.body.data).toMatchObject({ status: BookingStatus.CANCELLED, paymentStatus: PaymentStatus.REFUNDED });
    const payment = await PaymentModel.findOne({ orderId: checkout.orderId }).lean();
    expect(payment).toMatchObject({ status: PaymentStatus.REFUNDED, refundedAmount: checkout.amount });
  });

  it("blocks online cancellation of paid bookings inside the cancellation window", async () => {
    const camper = await createCamper();
    const { client } = await registerCustomer();
    const { booking, checkout } = await createBookingAndCheckout(client, camper.id, 2, 4); // default window is 3 days
    await client.post("/api/v1/payments/confirm").send({ transactionId: transactionId(), orderId: checkout.orderId, amount: checkout.amount }).expect(200);

    await client.post(`/api/v1/bookings/${booking._id}/cancel`).send({}).expect(400);
    expect((await PaymentModel.findOne({ orderId: checkout.orderId }).lean())?.status).toBe(PaymentStatus.PAID);
  });

  it("supports partial and full refunds by admins", async () => {
    const camper = await createCamper();
    const { client } = await registerCustomer();
    const { client: admin } = await loginAdmin();
    const { checkout } = await createBookingAndCheckout(client, camper.id);
    const paid = await client.post("/api/v1/payments/confirm").send({ transactionId: transactionId(), orderId: checkout.orderId, amount: checkout.amount }).expect(200);
    const url = `/api/v1/admin/payments/${paid.body.data._id}/refund`;

    const partial = await admin.post(url).send({ amount: 50000, reason: "Late pickup compensation" }).expect(200);
    expect(partial.body.data).toMatchObject({ status: PaymentStatus.PARTIALLY_REFUNDED, refundedAmount: 50000 });
    await admin.post(url).send({ amount: checkout.amount, reason: "Too much" }).expect(400);
    const full = await admin.post(url).send({ reason: "Remaining balance" }).expect(200);
    expect(full.body.data).toMatchObject({ status: PaymentStatus.REFUNDED, refundedAmount: checkout.amount });
    expect(full.body.data.refunds).toHaveLength(2);
  });

  it("verifies webhooks against the provider instead of trusting the body", async () => {
    const camper = await createCamper();
    const { client } = await registerCustomer();
    const { booking, checkout } = await createBookingAndCheckout(client, camper.id);

    // A forged "paid" webhook for a payment the provider never saw changes nothing.
    await api()
      .post("/api/v1/payments/webhooks/toss")
      .send({ eventType: "PAYMENT_STATUS_CHANGED", data: { paymentKey: "forged", orderId: checkout.orderId, status: "DONE" } })
      .expect(200);
    expect((await BookingModel.findById(booking._id).lean())?.status).toBe(BookingStatus.PENDING);

    await paymentService.handleWebhook("unknown", "does-not-exist");
  });
});

describe("Admin dashboard", () => {
  beforeEach(resetDatabase);

  it("reports statistics from real records", async () => {
    const { client: admin } = await loginAdmin();
    const empty = await admin.get("/api/v1/admin/dashboard/overview").expect(200);
    expect(empty.body.data.revenue.total).toBe(0);
    expect(empty.body.data.bookings.total).toBe(0);

    const camperA = await createCamper({ name: "Alpha" });
    const camperB = await createCamper({ name: "Bravo" });
    const { client } = await registerCustomer();

    const paidA = await createBookingAndCheckout(client, camperA.id, 10, 12);
    await client.post("/api/v1/payments/confirm").send({ transactionId: transactionId(), orderId: paidA.checkout.orderId, amount: paidA.checkout.amount }).expect(200);
    const paidB = await createBookingAndCheckout(client, camperB.id, 10, 11);
    const paymentB = await client.post("/api/v1/payments/confirm").send({ transactionId: transactionId(), orderId: paidB.checkout.orderId, amount: paidB.checkout.amount }).expect(200);
    await admin.post(`/api/v1/admin/payments/${paymentB.body.data._id}/refund`).send({ amount: 10000, reason: "Goodwill" }).expect(200);
    await client.post("/api/v1/bookings").send(bookingBody(camperA.id, 20, 22)).expect(201); // stays pending

    const overview = await admin.get("/api/v1/admin/dashboard/overview").expect(200);
    const data = overview.body.data;
    const expectedRevenue = paidA.checkout.amount + paidB.checkout.amount - 10000;
    expect(data.revenue.total).toBe(expectedRevenue);
    expect(data.bookings).toMatchObject({ total: 3, byStatus: { PENDING: 1, CONFIRMED: 2, CANCELLED: 0 } });
    expect(data.bookings.averageValue).toBe(Math.round((paidA.booking.price.total + paidB.booking.price.total) / 2));
    expect(data.customers.total).toBe(1);
    expect(data.campers.total).toBe(2);
    expect(data.upcomingReservations).toHaveLength(2);
    expect(data.recentBookings).toHaveLength(3);

    const revenue = await admin.get(`/api/v1/admin/dashboard/revenue?from=${day(-6)}&to=${day(0)}&interval=day`).expect(200);
    expect(revenue.body.data).toHaveLength(7);
    expect(revenue.body.data.at(-1)).toMatchObject({ period: day(0), revenue: expectedRevenue, payments: 2 });

    const bookings = await admin.get("/api/v1/admin/dashboard/bookings?interval=month").expect(200);
    const totalCreated = bookings.body.data.reduce((sum: number, point: { bookings: number }) => sum + point.bookings, 0);
    expect(totalCreated).toBe(3);

    const top = await admin.get("/api/v1/admin/dashboard/top-campers").expect(200);
    expect(top.body.data[0]).toMatchObject({ name: "Alpha", bookings: 1, revenue: paidA.booking.price.total });
  });

  it("is only available to administrators", async () => {
    const { client } = await registerCustomer();
    await client.get("/api/v1/admin/dashboard/overview").expect(401);
  });
});
