import { NextFunction, Request, Response } from "express";
import { z, ZodTypeAny } from "zod";
import { Message } from "../constants/messages";
import { AppError, ErrorDetail } from "../utils/AppError";

type RequestPart = "body" | "query" | "params";
type RequestSchemas = Partial<Record<RequestPart, ZodTypeAny>>;

const PARTS: RequestPart[] = ["params", "query", "body"];

export const zodIssuesToDetails = (error: z.ZodError, prefix?: string): ErrorDetail[] =>
  error.issues.map((issue) => ({
    field: [prefix, ...issue.path.map(String)].filter((segment) => segment !== undefined && segment !== "").join("."),
    message: issue.message,
  }));

/**
 * Validates and coerces request input with Zod. Parsed values are stored on
 * `req.validated`, so controllers only ever see clean, typed data. All parts
 * are checked before failing so the client receives every error at once.
 */
export const validate =
  (schemas: RequestSchemas) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const validated: Record<RequestPart, unknown> = { body: undefined, query: undefined, params: undefined };
    const errors: ErrorDetail[] = [];

    for (const part of PARTS) {
      const schema = schemas[part];
      if (!schema) continue;
      const result = schema.safeParse(req[part] ?? {});
      if (result.success) validated[part] = result.data;
      else errors.push(...zodIssuesToDetails(result.error, part));
    }

    if (errors.length > 0) return next(AppError.badRequest(Message.VALIDATION_FAILED, errors));
    req.validated = validated;
    next();
  };

/** Reads validated input. The schema argument is only used to infer the return type. */
export const getValidated = <S extends ZodTypeAny>(req: Request, part: RequestPart, _schema: S): z.infer<S> => {
  if (!req.validated) throw new Error(`validate() middleware is missing for request ${part}`);
  return req.validated[part] as z.infer<S>;
};
