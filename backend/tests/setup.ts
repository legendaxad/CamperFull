/*
 * Runs before every test file. Each file gets its own throwaway in-memory
 * MongoDB replica set (a replica set is required for booking transactions),
 * so tests never touch a real database and can run in parallel.
 */
import { MongoMemoryReplSet } from "mongodb-memory-server";
import mongoose from "mongoose";

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-access-secret-test-access-secret-0001";
process.env.REFRESH_TOKEN_SECRET = "test-refresh-secret-test-refresh-secret-01";
process.env.BCRYPT_ROUNDS = "4";
process.env.AUTH_RATE_LIMIT_MAX = "1000";
process.env.API_RATE_LIMIT_MAX = "100000";
process.env.PAYMENT_PROVIDER = "mock";
process.env.CLIENT_URL = "http://localhost:3000";
process.env.ADMIN_URL = "http://localhost:5173";
process.env.MONGODB_URI = "mongodb://127.0.0.1:1/placeholder";

let replSet: MongoMemoryReplSet;

beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: "wiredTiger" },
    binary: { version: process.env.MONGOMS_VERSION ?? "6.0.14" },
  });
  const { connectDatabase } = await import("../src/database/connection");
  await connectDatabase(replSet.getUri("fullcamper-test"));
  // Build indexes up-front: unique indexes are part of what is under test.
  await Promise.all(Object.values(mongoose.models).map((model) => model.syncIndexes()));
});

afterAll(async () => {
  await mongoose.disconnect();
  await replSet?.stop();
});
