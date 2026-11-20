import { Types } from "mongoose";

export type ObjectId = Types.ObjectId;

export interface Timestamps {
  createdAt: Date;
  updatedAt: Date;
}

/** An uploaded image. `publicId` is the Cloudinary id needed to delete it later. */
export interface Image {
  _id?: ObjectId;
  url: string;
  publicId?: string;
  alt?: string;
}
