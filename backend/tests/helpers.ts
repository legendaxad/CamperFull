import mongoose from "mongoose";
import request from "supertest";
import TestAgent from "supertest/lib/agent";
import { createApp } from "../src/app";
import { MemberRole } from "../src/constants/enums";
import { MemberModel } from "../src/models";
import { authService } from "../src/services/Auth.service";

export const app = createApp();

export const api = () => request(app);
export const agent = (): TestAgent => request.agent(app);

export const DEFAULT_PASSWORD = "Password123";

/** Clears every collection but keeps indexes, so unique constraints still apply. */
export const resetDatabase = async (): Promise<void> => {
  const collections = await mongoose.connection.db!.collections();
  await Promise.all(collections.map((collection) => collection.deleteMany({})));
};

let counter = 0;
const uniqueEmail = (prefix: string) => `${prefix}${Date.now()}${counter++}@example.com`;

export const registerCustomer = async (overrides: Record<string, string> = {}) => {
  const client = agent();
  const body = {
    firstName: "Jin",
    lastName: "Park",
    email: uniqueEmail("customer"),
    password: DEFAULT_PASSWORD,
    ...overrides,
  };
  const response = await client.post("/api/v1/auth/register").send(body).expect(201);
  return { client, member: response.body.data.member as { _id: string; email: string }, email: body.email };
};

export const createAdminAccount = async (role: MemberRole = MemberRole.ADMIN) => {
  const email = uniqueEmail("admin");
  const admin = await MemberModel.create({
    firstName: "Admin",
    lastName: "User",
    email,
    role,
    passwordHash: await authService.hashPassword(DEFAULT_PASSWORD),
  });
  return { admin, email };
};

export const loginAdmin = async (role: MemberRole = MemberRole.ADMIN) => {
  const { admin, email } = await createAdminAccount(role);
  const client = agent();
  await client.post("/api/v1/admin/auth/login").send({ email, password: DEFAULT_PASSWORD }).expect(200);
  return { client, admin };
};
