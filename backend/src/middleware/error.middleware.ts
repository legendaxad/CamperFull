import { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";
import { MulterError } from "multer";
import { ZodError } from "zod";
import { HttpCode } from "../constants/http";
import { Message } from "../constants/messages";
import { AppError, ErrorDetail } from "../utils/AppError";
import { logger } from "../utils/logger";
import { zodIssuesToDetails } from "./validate.middleware";

interface ErrorResponse {
  statusCode: number;
  message: string;
  errors: ErrorDetail[];
}

const isMongoDuplicateKey = (error: unknown): error is { code: number; keyValue?: Record<string, unknown> } =>
  typeof error === "object" && error !== null && "code" in error && (error as { code: unknown }).code === 11000;

const isBodyParserError = (error: unknown): error is { type: string; status: number } =>
  typeof error === "object" && error !== null && "type" in error && "status" in error;

/** Converts any thrown value into a safe client response. Raw database errors never leak out. */
const toErrorResponse = (error: unknown): ErrorResponse => {
  if (error instanceof AppError) {
    return { statusCode: error.statusCode, message: error.message, errors: error.errors };
  }
  if (error instanceof ZodError) {
    return { statusCode: HttpCode.BAD_REQUEST, message: Message.VALIDATION_FAILED, errors: zodIssuesToDetails(error) };
  }
  if (error instanceof mongoose.Error.CastError) {
    return { statusCode: HttpCode.BAD_REQUEST, message: `Invalid value for ${error.path}`, errors: [] };
  }
  if (error instanceof mongoose.Error.ValidationError) {
    const errors = Object.values(error.errors).map((item) => ({ field: item.path, message: item.message }));
    return { statusCode: HttpCode.BAD_REQUEST, message: Message.VALIDATION_FAILED, errors };
  }
  if (isMongoDuplicateKey(error)) {
    const fields = Object.keys(error.keyValue ?? {});
    return {
      statusCode: HttpCode.CONFLICT,
      message: Message.DUPLICATE_VALUE,
      errors: fields.map((field) => ({ field, message: `${field} is already in use` })),
    };
  }
  if (error instanceof MulterError) {
    const statusCode = error.code === "LIMIT_FILE_SIZE" ? HttpCode.PAYLOAD_TOO_LARGE : HttpCode.BAD_REQUEST;
    return { statusCode, message: error.message, errors: error.field ? [{ field: error.field, message: error.message }] : [] };
  }
  if (isBodyParserError(error)) {
    if (error.type === "entity.parse.failed") {
      return { statusCode: HttpCode.BAD_REQUEST, message: "Malformed JSON body", errors: [] };
    }
    if (error.type === "entity.too.large") {
      return { statusCode: HttpCode.PAYLOAD_TOO_LARGE, message: "Request body is too large", errors: [] };
    }
  }
  return { statusCode: HttpCode.INTERNAL_SERVER_ERROR, message: Message.SOMETHING_WENT_WRONG, errors: [] };
};

// Express identifies error handlers by their four parameters, so `_next` must stay.
export const errorHandler = (error: unknown, req: Request, res: Response, _next: NextFunction): void => {
  const { statusCode, message, errors } = toErrorResponse(error);

  if (statusCode >= HttpCode.INTERNAL_SERVER_ERROR) {
    logger.error({ err: error, method: req.method, url: req.originalUrl }, "Unhandled error");
  }

  res.status(statusCode).json({ success: false, message, errors });
};

export const notFoundHandler = (req: Request, _res: Response, next: NextFunction): void => {
  next(new AppError(HttpCode.NOT_FOUND, `${Message.ROUTE_NOT_FOUND}: ${req.method} ${req.path}`));
};
