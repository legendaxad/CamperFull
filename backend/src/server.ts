import { createServer } from "node:http";
import { createApp } from "./app";
import { env } from "./config/env";
import { connectDatabase, disconnectDatabase } from "./database/connection";
import { bookingService } from "./services/Booking.service";
import { logger } from "./utils/logger";

const EXPIRED_HOLD_SWEEP_MS = 5 * 60 * 1000;

const start = async (): Promise<void> => {
  await connectDatabase();

  const server = createServer(createApp());
  server.listen(env.PORT, () => logger.info(`FullCamper API listening on port ${env.PORT}`));

  // Unpaid bookings whose hold expired are already ignored by availability
  // checks; this sweep just moves them to CANCELLED and frees coupon usage.
  const sweep = setInterval(() => {
    bookingService.expireStaleBookings().catch((error: unknown) => {
      logger.error({ err: error }, "Expired booking sweep failed");
    });
  }, EXPIRED_HOLD_SWEEP_MS);
  sweep.unref();

  const shutdown = (signal: string) => {
    logger.info(`${signal} received, shutting down`);
    clearInterval(sweep);
    server.close(() => {
      disconnectDatabase()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
    });
    setTimeout(() => process.exit(1), 10000).unref();
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
};

start().catch((error: unknown) => {
  logger.fatal({ err: error }, "Failed to start server");
  process.exit(1);
});
