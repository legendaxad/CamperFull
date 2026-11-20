import { HttpCode } from "../constants/http";
import { Message } from "../constants/messages";

export interface ErrorDetail {
  field?: string;
  message: string;
}

/**
 * The only error type services throw on purpose. The error middleware turns it
 * into the standard `{ success: false, message, errors }` response; anything
 * else is treated as an unexpected 500 and its details are hidden.
 */
export class AppError extends Error {
  public readonly statusCode: HttpCode;
  public readonly errors: ErrorDetail[];

  constructor(statusCode: HttpCode, message: string, errors: ErrorDetail[] = []) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.errors = errors;
  }

  static badRequest(message: string, errors?: ErrorDetail[]): AppError {
    return new AppError(HttpCode.BAD_REQUEST, message, errors);
  }

  static unauthorized(message: string = Message.NOT_AUTHENTICATED): AppError {
    return new AppError(HttpCode.UNAUTHORIZED, message);
  }

  static forbidden(message: string = Message.FORBIDDEN): AppError {
    return new AppError(HttpCode.FORBIDDEN, message);
  }

  static notFound(message: string = Message.NOT_FOUND): AppError {
    return new AppError(HttpCode.NOT_FOUND, message);
  }

  static conflict(message: string): AppError {
    return new AppError(HttpCode.CONFLICT, message);
  }

  static unprocessable(message: string, errors?: ErrorDetail[]): AppError {
    return new AppError(HttpCode.UNPROCESSABLE_ENTITY, message, errors);
  }

  static serviceUnavailable(message: string): AppError {
    return new AppError(HttpCode.SERVICE_UNAVAILABLE, message);
  }
}
