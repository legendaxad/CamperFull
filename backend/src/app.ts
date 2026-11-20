import cookieParser from "cookie-parser";
import cors from "cors";
import express, { Express } from "express";
import helmet from "helmet";
import pinoHttp from "pino-http";
import { env } from "./config/env";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware";
import { apiRateLimiter, verifyOrigin } from "./middleware/security.middleware";
import { apiRouter } from "./routes";
import { logger } from "./utils/logger";

/** Builds the Express app without starting a server, so tests can mount it directly. */
export const createApp = (): Express => {
  const app = express();

  app.disable("x-powered-by");
  if (env.TRUST_PROXY > 0) app.set("trust proxy", env.TRUST_PROXY);

  app.use(helmet());
  app.use(
    cors({
      origin: (origin, callback) => {
        // No Origin: same-origin, curl, server-to-server. Otherwise allow-list only.
        if (!origin || env.corsOrigins.includes(origin.replace(/\/$/, ""))) return callback(null, true);
        callback(null, false);
      },
      credentials: true,
    }),
  );
  app.use(pinoHttp({ logger, autoLogging: { ignore: (req) => req.url === "/api/v1/health" } }));
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: false, limit: "1mb" }));
  app.use(cookieParser());

  app.use("/api/v1", apiRateLimiter, verifyOrigin, apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
