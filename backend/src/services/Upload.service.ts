import crypto from "node:crypto";
import { v2 as cloudinary, UploadApiResponse } from "cloudinary";
import { env } from "../config/env";
import { ImageFolder } from "../constants/enums";
import { Message } from "../constants/messages";
import { Image } from "../interfaces/common.interface";
import { AppError } from "../utils/AppError";
import { logger } from "../utils/logger";

if (env.isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

export interface ImageFile {
  buffer: Buffer;
}

/** Wraps Cloudinary so the rest of the app only deals with `Image` objects. */
class UploadService {
  public async uploadImage(file: ImageFile, folder: ImageFolder): Promise<Image> {
    if (!env.isCloudinaryConfigured) throw AppError.serviceUnavailable(Message.UPLOADS_NOT_CONFIGURED);

    const result = await new Promise<UploadApiResponse>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: `${env.CLOUDINARY_FOLDER}/${folder}`,
          // Random names: original filenames are never trusted or exposed.
          public_id: crypto.randomUUID(),
          resource_type: "image",
          overwrite: false,
        },
        (error, response) => {
          if (error || !response) reject(error ?? new Error("Empty Cloudinary response"));
          else resolve(response);
        },
      );
      stream.end(file.buffer);
    }).catch((error: unknown) => {
      logger.error({ err: error }, "Cloudinary upload failed");
      throw new AppError(502, "Image upload failed. Please try again.");
    });

    return { url: result.secure_url, publicId: result.public_id };
  }

  public async uploadImages(files: ImageFile[], folder: ImageFolder): Promise<Image[]> {
    const uploaded: Image[] = [];
    try {
      for (const file of files) uploaded.push(await this.uploadImage(file, folder));
      return uploaded;
    } catch (error) {
      // Do not leave orphaned images behind when a batch fails part-way.
      await this.deleteImages(uploaded);
      throw error;
    }
  }

  /** Best-effort deletion: a failed cleanup is logged but never fails the user's request. */
  public async deleteImages(images: Image[]): Promise<void> {
    if (!env.isCloudinaryConfigured) return;
    const publicIds = images.map((image) => image.publicId).filter((id): id is string => Boolean(id));
    await Promise.all(
      publicIds.map((publicId) =>
        cloudinary.uploader.destroy(publicId).catch((error: unknown) => {
          logger.warn({ err: error, publicId }, "Failed to delete image from Cloudinary");
        }),
      ),
    );
  }
}

export const uploadService = new UploadService();
