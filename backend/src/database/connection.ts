import mongoose, { ClientSession } from "mongoose";
import { env } from "../config/env";
import { logger } from "../utils/logger";

mongoose.set("strictQuery", true);

/**
 * Connects to MongoDB. Bookings use multi-document transactions, so the
 * deployment must be a replica set (MongoDB Atlas always is; a local server
 * must be started with --replSet).
 */
export const connectDatabase = async (uri: string = env.MONGODB_URI): Promise<typeof mongoose> => {
  if (env.isTest && !/^mongodb:\/\/(127\.0\.0\.1|localhost)[:/]/.test(uri)) {
    // Hard stop: tests may only ever run against a local throwaway database.
    throw new Error("Refusing to run tests against a non-local MongoDB instance");
  }

  const connection = await mongoose.connect(uri, {
    // Indexes are built automatically in development and tests. In production
    // run `npm run sync-indexes` during deployment instead.
    autoIndex: !env.isProduction,
    serverSelectionTimeoutMS: 10000,
  });
  logger.info({ db: connection.connection.name }, "MongoDB connected");
  return connection;
};

export const disconnectDatabase = async (): Promise<void> => {
  await mongoose.disconnect();
};

/**
 * Runs `work` inside a transaction. `withTransaction` automatically retries on
 * transient errors such as write conflicts, which is exactly what happens
 * when two customers try to book the same camper at the same moment.
 */
export const runInTransaction = async <T>(work: (session: ClientSession) => Promise<T>): Promise<T> => {
  const session = await mongoose.startSession();
  try {
    let result: T | undefined;
    await session.withTransaction(async () => {
      result = await work(session);
    });
    return result as T;
  } finally {
    await session.endSession();
  }
};
