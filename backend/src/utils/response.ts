import { Response } from "express";
import { HttpCode } from "../constants/http";
import { PaginationMeta } from "./pagination";

interface SuccessOptions<T> {
  statusCode?: HttpCode;
  message?: string;
  data?: T;
  meta?: PaginationMeta;
}

/** Every successful response uses the same envelope so both clients can share one API helper. */
export const sendSuccess = <T>(res: Response, options: SuccessOptions<T> = {}): Response => {
  const { statusCode = HttpCode.OK, message = "Operation completed successfully", data, meta } = options;
  return res.status(statusCode).json({
    success: true,
    message,
    data: data ?? null,
    ...(meta ? { meta } : {}),
  });
};
