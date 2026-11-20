import { Router } from "express";
import mongoose from "mongoose";
import { settingsController } from "../controllers/admin.controller";
import { sendSuccess } from "../utils/response";
import { adminRouter } from "./admin";
import { authRouter } from "./auth.routes";
import { camperRouter, campingPlaceRouter, categoryRouter, featureRouter } from "./catalog.routes";
import {
  bookingRouter,
  couponRouter,
  favoriteRouter,
  inquiryRouter,
  notificationRouter,
  paymentRouter,
  reviewRouter,
} from "./customer.routes";
import { memberRouter } from "./member.routes";

export const apiRouter = Router();

apiRouter.get("/health", (_req, res) => {
  sendSuccess(res, {
    message: "OK",
    data: { status: "ok", database: mongoose.connection.readyState === 1 ? "connected" : "disconnected" },
  });
});

/* Customer site */
apiRouter.use("/auth", authRouter);
apiRouter.use("/members", memberRouter);
apiRouter.use("/campers", camperRouter);
apiRouter.use("/categories", categoryRouter);
apiRouter.use("/features", featureRouter);
apiRouter.use("/camping-places", campingPlaceRouter);
apiRouter.use("/bookings", bookingRouter);
apiRouter.use("/payments", paymentRouter);
apiRouter.use("/reviews", reviewRouter);
apiRouter.use("/favorites", favoriteRouter);
apiRouter.use("/coupons", couponRouter);
apiRouter.use("/notifications", notificationRouter);
apiRouter.use("/inquiries", inquiryRouter);
apiRouter.get("/settings", settingsController.getPublic);

/* Admin dashboard */
apiRouter.use("/admin", adminRouter);
