import { model, Schema } from "mongoose";
import { Favorite } from "../interfaces/engagement.interface";
import { baseSchemaOptions } from "./shared.schemas";

const favoriteSchema = new Schema<Favorite>(
  {
    member: { type: Schema.Types.ObjectId, ref: "Member", required: true },
    camper: { type: Schema.Types.ObjectId, ref: "Camper", required: true },
  },
  baseSchemaOptions,
);

// The unique pair is what prevents duplicate favorites, even under concurrent clicks.
favoriteSchema.index({ member: 1, camper: 1 }, { unique: true });
favoriteSchema.index({ member: 1, createdAt: -1 });

export const FavoriteModel = model<Favorite>("Favorite", favoriteSchema);
