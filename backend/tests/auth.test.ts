import { MemberRole, MemberStatus } from "../src/constants/enums";
import { MemberModel } from "../src/models";
import { agent, api, DEFAULT_PASSWORD, loginAdmin, registerCustomer, resetDatabase } from "./helpers";

const cookieNames = (setCookie: string | string[] | undefined): string[] =>
  (Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : []).map((cookie) => cookie.split("=")[0] as string);

describe("Customer authentication", () => {
  beforeEach(resetDatabase);

  it("registers a customer, sets HTTP-only cookies and never returns the password hash", async () => {
    const response = await api()
      .post("/api/v1/auth/register")
      .send({ firstName: "Jin", lastName: "Park", email: "JIN@Example.com", phone: "010-1234-5678", password: DEFAULT_PASSWORD })
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.member).toMatchObject({ email: "jin@example.com", phone: "01012345678", role: MemberRole.CUSTOMER });
    expect(response.body.data.member.passwordHash).toBeUndefined();
    expect(JSON.stringify(response.body)).not.toMatch(/accessToken|refreshToken/);

    const setCookie = response.headers["set-cookie"] as unknown as string[];
    expect(cookieNames(setCookie)).toEqual(expect.arrayContaining(["fc_access", "fc_refresh"]));
    expect(setCookie.every((cookie) => /HttpOnly/i.test(cookie))).toBe(true);
  });

  it("rejects invalid registration input with field errors", async () => {
    const response = await api()
      .post("/api/v1/auth/register")
      .send({ firstName: "", lastName: "Park", email: "not-an-email", password: "short" })
      .expect(400);

    expect(response.body.success).toBe(false);
    const fields = response.body.errors.map((error: { field: string }) => error.field);
    expect(fields).toEqual(expect.arrayContaining(["body.firstName", "body.email", "body.password"]));
  });

  it("does not allow registering as an administrator", async () => {
    await api()
      .post("/api/v1/auth/register")
      .send({ firstName: "Eve", lastName: "Hacker", email: "eve@example.com", password: DEFAULT_PASSWORD, role: "SUPER_ADMIN" })
      .expect(400);
    expect(await MemberModel.countDocuments({ email: "eve@example.com" })).toBe(0);
  });

  it("rejects a duplicate email with 409", async () => {
    const { email } = await registerCustomer();
    const response = await api()
      .post("/api/v1/auth/register")
      .send({ firstName: "A", lastName: "B", email, password: DEFAULT_PASSWORD })
      .expect(409);
    expect(response.body.errors[0].field).toBe("email");
  });

  it("logs in, reads the profile, and logs out", async () => {
    const { email } = await registerCustomer();
    const client = agent();

    await client.post("/api/v1/auth/login").send({ email, password: "WrongPass123" }).expect(401);
    await client.post("/api/v1/auth/login").send({ email, password: DEFAULT_PASSWORD }).expect(200);

    const me = await client.get("/api/v1/auth/me").expect(200);
    expect(me.body.data.member.email).toBe(email);

    await client.post("/api/v1/auth/logout").expect(200);
    await client.get("/api/v1/auth/me").expect(401);
  });

  it("rotates refresh tokens and revokes all sessions when an old token is replayed", async () => {
    const { client } = await registerCustomer();
    const login = await client.post("/api/v1/auth/refresh").expect(200);
    expect(cookieNames(login.headers["set-cookie"] as unknown as string[])).toContain("fc_refresh");

    // Capture the current refresh token, rotate it, then replay the old one.
    const sessionCookies = await client.post("/api/v1/auth/refresh").expect(200);
    const refreshCookie = (sessionCookies.headers["set-cookie"] as unknown as string[]).find((c) => c.startsWith("fc_refresh="))!;
    const oldToken = refreshCookie.split(";")[0]!;
    await client.post("/api/v1/auth/refresh").expect(200);

    await api().post("/api/v1/auth/refresh").set("Cookie", oldToken).expect(401);
    // Reuse detection revoked the legitimate client's session too.
    await client.post("/api/v1/auth/refresh").expect(401);
  });

  it("changes the password and invalidates other sessions", async () => {
    const { client, email } = await registerCustomer();
    const otherDevice = agent();
    await otherDevice.post("/api/v1/auth/login").send({ email, password: DEFAULT_PASSWORD }).expect(200);

    await client
      .patch("/api/v1/auth/me/password")
      .send({ currentPassword: DEFAULT_PASSWORD, newPassword: "NewPassword456" })
      .expect(200);

    await client.get("/api/v1/auth/me").expect(200);
    await otherDevice.get("/api/v1/auth/me").expect(401);
    await api().post("/api/v1/auth/login").send({ email, password: "NewPassword456" }).expect(200);
  });

  it("resets a forgotten password with a single-use token", async () => {
    const { email } = await registerCustomer();
    await api().post("/api/v1/auth/forgot-password").send({ email }).expect(200);
    // Unknown emails get the same response.
    await api().post("/api/v1/auth/forgot-password").send({ email: "nobody@example.com" }).expect(200);

    // The raw token only exists in the email; simulate it by setting a known token hash.
    const { sha256 } = await import("../src/utils/strings");
    const token = "a".repeat(64);
    await MemberModel.updateOne({ email }, { passwordResetTokenHash: sha256(token), passwordResetExpiresAt: new Date(Date.now() + 60000) });

    await api().post("/api/v1/auth/reset-password").send({ token, password: "Reset12345" }).expect(200);
    await api().post("/api/v1/auth/reset-password").send({ token, password: "Reset12345" }).expect(400);
    await api().post("/api/v1/auth/login").send({ email, password: "Reset12345" }).expect(200);
  });

  it("blocks a blocked customer immediately", async () => {
    const { client, member } = await registerCustomer();
    await MemberModel.updateOne({ _id: member._id }, { status: MemberStatus.BLOCKED });
    await client.get("/api/v1/auth/me").expect(401);
  });

  it("updates the profile through /members/me", async () => {
    const { client } = await registerCustomer();
    const response = await client.patch("/api/v1/members/me").send({ firstName: "Minji", phone: "010 9999 8888" }).expect(200);
    expect(response.body.data.member).toMatchObject({ firstName: "Minji", phone: "01099998888" });
  });

  it("rejects state-changing requests from unknown browser origins", async () => {
    await api().post("/api/v1/auth/login").set("Origin", "https://evil.example").send({ email: "a@b.co", password: "x" }).expect(403);
  });
});

describe("Admin authentication and authorization", () => {
  beforeEach(resetDatabase);

  it("does not let customers log into the admin dashboard", async () => {
    const { email } = await registerCustomer();
    await api().post("/api/v1/admin/auth/login").send({ email, password: DEFAULT_PASSWORD }).expect(401);
  });

  it("does not let admins use the customer login", async () => {
    const { client } = await loginAdmin();
    const me = await client.get("/api/v1/admin/auth/me").expect(200);
    await api().post("/api/v1/auth/login").send({ email: me.body.data.member.email, password: DEFAULT_PASSWORD }).expect(403);
  });

  it("keeps customer tokens out of admin routes", async () => {
    const { client } = await registerCustomer();
    await client.get("/api/v1/admin/customers").expect(401);
  });

  it("allows only SUPER_ADMIN to create administrators", async () => {
    const { client: admin } = await loginAdmin(MemberRole.ADMIN);
    const newAdmin = { firstName: "New", lastName: "Admin", email: "new.admin@example.com", password: DEFAULT_PASSWORD };
    await admin.post("/api/v1/admin/admins").send(newAdmin).expect(403);

    const { client: superAdmin } = await loginAdmin(MemberRole.SUPER_ADMIN);
    const created = await superAdmin.post("/api/v1/admin/admins").send(newAdmin).expect(201);
    expect(created.body.data.admin.role).toBe(MemberRole.ADMIN);

    await api().post("/api/v1/admin/auth/login").send({ email: newAdmin.email, password: DEFAULT_PASSWORD }).expect(200);
  });

  it("lets admins list, search and block customers", async () => {
    const { client: admin } = await loginAdmin();
    const { client: customer } = await registerCustomer({ firstName: "Searchable" });
    await registerCustomer({ firstName: "Other" });

    const list = await admin.get("/api/v1/admin/customers?search=searchable").expect(200);
    expect(list.body.meta.total).toBe(1);
    const customerId = list.body.data[0]._id;

    await admin.patch(`/api/v1/admin/customers/${customerId}/status`).send({ status: "BLOCKED" }).expect(200);
    await customer.get("/api/v1/auth/me").expect(401);

    const detail = await admin.get(`/api/v1/admin/customers/${customerId}`).expect(200);
    expect(detail.body.data.stats.totalBookings).toBe(0);
  });

  it("returns 404 JSON for unknown routes and 400 for malformed ids", async () => {
    const { client: admin } = await loginAdmin();
    const missing = await api().get("/api/v1/does-not-exist").expect(404);
    expect(missing.body).toMatchObject({ success: false });
    await admin.get("/api/v1/admin/customers/not-an-id").expect(400);
  });
});
