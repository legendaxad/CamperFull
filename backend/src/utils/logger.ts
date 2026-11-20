import pino from "pino";
import { env } from "../config/env";

export const logger = pino({
  level: env.isTest ? "silent" : env.LOG_LEVEL,
  // Never let credentials reach the logs, even if a payload is logged by mistake.
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      'res.headers["set-cookie"]',
      "*.password",
      "*.passwordHash",
      "*.token",
    ],
    censor: "[REDACTED]",
  },
  ...(env.NODE_ENV === "development"
    ? { transport: { target: "pino-pretty", options: { colorize: true, translateTime: "SYS:HH:MM:ss" } } }
    : {}),
});
