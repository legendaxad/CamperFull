import TestAgent from "supertest/lib/agent";
import { BookingStatus, CamperStatus } from "../src/constants/enums";
import { bookingBody, createCamper, day } from "./fixtures";
import { loginAdmin, registerCustomer, resetDatabase } from "./helpers";

let transactionCounter = 0;

/** Creates a booking and pays for it through the mock provider. */
const bookAndPay = async (client: TestAgent, camperId: string, start: number, end: number) => {
  const booking = await client.post("/api/v1/bookings").send(bookingBody(camperId, start, end)).expect(201);
  const checkout = await client.post("/api/v1/payments/checkout").send({ bookingId: booking.body.data._id }).expect(201);
  const payment = await client
    .post("/api/v1/payments/confirm")
    .send({ transactionId: `tx_${Date.now()}_${transactionCounter++}`, orderId: checkout.body.data.orderId, amount: checkout.body.data.amount })
    .expect(200);
  return { booking: booking.body.data as { _id: string; price: { total: number } }, payment: payment.body.data as { _id: string; amount: number } };
};

const range = `from=${day(0)}&to=${day(29)}`;

describe("Admin analytics", () => {
  beforeEach(resetDatabase);

  it("computes KPIs, fleet, customer and payment analytics from real records", async () => {
    const { client: admin } = await loginAdmin();
    const alpha = await createCamper({ name: "Alpha" });
    const bravo = await createCamper({ name: "Bravo" });
    await createCamper({ name: "Charlie", status: CamperStatus.MAINTENANCE });

    const { client: jin, member: jinMember } = await registerCustomer();
    const { client: mina } = await registerCustomer({ firstName: "Mina" });

    const a = await bookAndPay(jin, alpha.id, 10, 12); // 2 nights
    const b = await bookAndPay(jin, bravo.id, 10, 11); // 1 night
    await admin.post(`/api/v1/admin/payments/${b.payment._id}/refund`).send({ amount: 10000, reason: "Goodwill" }).expect(200);

    const cancelled = await bookAndPay(mina, bravo.id, 15, 17);
    await admin
      .patch(`/api/v1/admin/bookings/${cancelled.booking._id}/status`)
      .send({ status: BookingStatus.CANCELLED, refund: true, reason: "Vehicle issue" })
      .expect(200);
    await mina.post("/api/v1/bookings").send(bookingBody(alpha.id, 20, 22)).expect(201); // stays PENDING

    const net = a.payment.amount + b.payment.amount - 10000;

    /* KPIs */
    const kpis = (await admin.get(`/api/v1/admin/dashboard/kpis?${range}`).expect(200)).body.data;
    expect(kpis.range).toEqual({ from: day(0), to: day(29), days: 30 });
    expect(kpis.previousRange).toEqual({ from: day(-30), to: day(-1), days: 30 });
    expect(kpis.current).toMatchObject({
      revenue: net,
      bookings: { total: 4, byStatus: { CONFIRMED: 2, PENDING: 1, CANCELLED: 1 } },
      bookedCount: 2,
      bookedValue: a.booking.price.total + b.booking.price.total,
      averageBookingValue: Math.round((a.booking.price.total + b.booking.price.total) / 2),
      cancelledAfterConfirmation: 1,
      expiredUnpaid: 0,
      newCustomers: 2,
      bookedNights: 3,
      fleetSize: 3,
    });
    expect(kpis.current.cancellationRate).toBeCloseTo(1 / 3);
    expect(kpis.current.occupancyRate).toBeCloseTo(3 / 90);
    expect(kpis.previous).toMatchObject({ revenue: 0, bookings: { total: 0 }, cancellationRate: null, averageBookingValue: null });
    expect(kpis.snapshot).toMatchObject({ pendingBookings: 1, activeCampers: 2, fleetSize: 3, totalCustomers: 2 });
    expect(kpis.snapshot.campersByStatus.MAINTENANCE).toBe(1);

    /* Fleet */
    const fleet = (await admin.get(`/api/v1/admin/dashboard/fleet?${range}`).expect(200)).body.data;
    const byName = Object.fromEntries(fleet.campers.map((camper: { name: string }) => [camper.name, camper]));
    expect(byName.Alpha).toMatchObject({ bookings: 1, bookedNights: 2, revenue: a.payment.amount, occupiedToday: false });
    expect(byName.Alpha.utilization).toBeCloseTo(2 / 30);
    expect(byName.Bravo).toMatchObject({ bookings: 1, bookedNights: 1, revenue: b.payment.amount - 10000 });
    expect(byName.Charlie).toMatchObject({ bookings: 0, bookedNights: 0, revenue: 0, status: CamperStatus.MAINTENANCE });

    /* Customers */
    const customers = (await admin.get(`/api/v1/admin/dashboard/customers?${range}&interval=week`).expect(200)).body.data;
    const registrations = customers.series.reduce((sum: number, point: { registrations: number }) => sum + point.registrations, 0);
    expect(registrations).toBe(2);
    expect(customers.series.at(-1).totalCustomers).toBe(2);
    expect(customers).toMatchObject({ customersWithBookings: 1, repeatCustomers: 1, bookingCustomersInRange: 1, returningInRange: 0 });
    expect(customers.topCustomers).toHaveLength(1); // the fully refunded customer spent nothing
    expect(customers.topCustomers[0]).toMatchObject({ customerId: jinMember._id, spent: net, payments: 2 });

    /* Payments */
    const payments = (await admin.get(`/api/v1/admin/dashboard/payments?${range}`).expect(200)).body.data;
    expect(payments.byStatus).toMatchObject({ PAID: { count: 1 }, PARTIALLY_REFUNDED: { count: 1 }, REFUNDED: { count: 1 } });
    expect(payments.captured).toMatchObject({ count: 3, net });
    expect(payments.captured.gross - payments.captured.refunded).toBe(net);
    expect(payments.refundsIssued).toEqual({ count: 2, amount: 10000 + cancelled.payment.amount });

    /* Activity: 2 registrations, 8 booking status entries, 3 captures, 2 refunds */
    const page1 = (await admin.get("/api/v1/admin/dashboard/activity?limit=10").expect(200)).body.data;
    expect(page1.items).toHaveLength(10);
    expect(page1.hasMore).toBe(true);
    const page2 = (await admin.get("/api/v1/admin/dashboard/activity?limit=10&page=2").expect(200)).body.data;
    expect(page2.items).toHaveLength(5);
    expect(page2.hasMore).toBe(false);
    const times = [...page1.items, ...page2.items].map((item: { at: string }) => new Date(item.at).getTime());
    expect(times).toEqual([...times].sort((x, y) => y - x));

    const refunds = (await admin.get("/api/v1/admin/dashboard/activity?type=REFUND").expect(200)).body.data.items;
    expect(refunds).toHaveLength(2);
    expect(refunds.every((item: { actor: { role: string } | null; bookingNumber?: string }) => item.actor?.role === "ADMIN" && item.bookingNumber)).toBe(true);
  });

  it("supports yearly series and validates ranges", async () => {
    const { client: admin } = await loginAdmin();
    const yearly = await admin.get(`/api/v1/admin/dashboard/revenue?from=2024-03-01&to=2026-02-01&interval=year`).expect(200);
    expect(yearly.body.data.map((point: { period: string }) => point.period)).toEqual(["2024-01-01", "2025-01-01", "2026-01-01"]);

    await admin.get("/api/v1/admin/dashboard/kpis?from=2000-01-01&to=2026-01-01").expect(400);
    await admin.get(`/api/v1/admin/dashboard/kpis?from=${day(5)}&to=${day(1)}`).expect(400);
    await admin.get("/api/v1/admin/dashboard/activity?type=NOPE").expect(400);
  });

  it("returns empty figures instead of invented ones when there is no data", async () => {
    const { client: admin } = await loginAdmin();
    const kpis = (await admin.get(`/api/v1/admin/dashboard/kpis?${range}`).expect(200)).body.data;
    expect(kpis.current).toMatchObject({ revenue: 0, averageBookingValue: null, cancellationRate: null, occupancyRate: null, fleetSize: 0 });
    const activity = (await admin.get("/api/v1/admin/dashboard/activity").expect(200)).body.data;
    expect(activity).toMatchObject({ items: [], hasMore: false }); // admin accounts are not customer registrations
  });

  it("is restricted to administrators", async () => {
    const { client } = await registerCustomer();
    for (const path of ["kpis", "fleet", "customers", "payments", "activity"]) {
      await client.get(`/api/v1/admin/dashboard/${path}`).expect(401);
    }
  });
});
