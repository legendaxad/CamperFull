import { connect } from "mongoose";
import { MONGODB_URL } from "../utils/secret.js";

export const connectDB = async () => {
  try {
    await connect(MONGODB_URL);
    console.log("Database connected successfully:");
  } catch (error) {
    console.error("Database connection failed:", error);
  }
};
