/*
 * Builds/updates MongoDB indexes. Production disables automatic index builds,
 * so run this once per deployment: `npm run sync-indexes`.
 */
import mongoose from "mongoose";
import { connectDatabase, disconnectDatabase } from "../database/connection";
import "../models";

const run = async (): Promise<void> => {
  await connectDatabase();
  try {
    for (const model of Object.values(mongoose.models)) {
      await model.syncIndexes();
      process.stdout.write(`Indexes synced: ${model.modelName}\n`);
    }
  } finally {
    await disconnectDatabase();
  }
};

run().catch((error: unknown) => {
  process.stderr.write(`Index sync failed: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
