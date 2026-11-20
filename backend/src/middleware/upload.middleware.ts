import { NextFunction, Request, Response } from "express";
import multer from "multer";
import { env } from "../config/env";
import { Message } from "../constants/messages";
import { AppError } from "../utils/AppError";

export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
export const MAX_IMAGES_PER_REQUEST = 10;

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);

// Files are kept in memory only long enough to stream them to Cloudinary;
// nothing user-supplied is ever written to the server's disk.
const multerInstance = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_SIZE_BYTES, files: MAX_IMAGES_PER_REQUEST, fields: 20 },
  fileFilter: (_req, file, callback) => {
    if (ALLOWED_MIME_TYPES.has(file.mimetype)) return callback(null, true);
    callback(AppError.badRequest("Only JPEG, PNG, WEBP and AVIF images are allowed", [
      { field: file.fieldname, message: `Unsupported file type: ${file.mimetype}` },
    ]));
  },
});

/** Checks the file's real content, because the client-declared MIME type can be forged. */
const hasImageSignature = (buffer: Buffer): boolean => {
  const startsWith = (bytes: number[], offset = 0) => bytes.every((byte, index) => buffer[offset + index] === byte);
  const ascii = (start: number, end: number) => buffer.subarray(start, end).toString("ascii");
  return (
    startsWith([0xff, 0xd8, 0xff]) || // JPEG
    startsWith([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]) || // PNG
    (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") ||
    (ascii(4, 8) === "ftyp" && ["avif", "avis"].includes(ascii(8, 12)))
  );
};

const verifyImageContent = (req: Request, _res: Response, next: NextFunction): void => {
  const files = Array.isArray(req.files) ? req.files : req.file ? [req.file] : [];
  const invalid = files.find((file) => !hasImageSignature(file.buffer));
  if (invalid) {
    return next(AppError.badRequest("Uploaded file is not a valid image", [
      { field: invalid.fieldname, message: `${invalid.originalname} is not a valid image` },
    ]));
  }
  next();
};

const requireUploadsConfigured = (_req: Request, _res: Response, next: NextFunction): void => {
  if (!env.isCloudinaryConfigured) return next(AppError.serviceUnavailable(Message.UPLOADS_NOT_CONFIGURED));
  next();
};

export const uploadImages = (field: string, maxCount = MAX_IMAGES_PER_REQUEST) => [
  requireUploadsConfigured,
  multerInstance.array(field, maxCount),
  verifyImageContent,
];

export const uploadSingleImage = (field: string) => [
  requireUploadsConfigured,
  multerInstance.single(field),
  verifyImageContent,
];

export const uploadedFiles = (req: Request): Express.Multer.File[] => {
  const files = Array.isArray(req.files) ? req.files : req.file ? [req.file] : [];
  if (files.length === 0) throw AppError.badRequest("At least one image file is required");
  return files;
};
