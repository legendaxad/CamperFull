import { Router } from "express";
import { requireAdmin } from "../../middleware/auth.middleware";
import { adminAuthRouter } from "./auth.routes";
import {
  adminBookingRouter,
  adminCamperRouter,
  adminCampingPlaceRouter,
  adminCategoryRouter,
  adminCouponRouter,
  adminFeatureRouter,
  adminInquiryRouter,
  adminNotificationRouter,
  adminPaymentRouter,
  adminReviewRouter,
  adminSettingsRouter,
  dashboardRouter,
} from "./management.routes";
import { adminAdminsRouter, adminCustomerRouter } from "./member.routes";

/*
 * Everything the admin dashboard uses lives under /api/v1/admin. Apart from
 * the login endpoints, every route here requires an admin-audience token.
 */
export const adminRouter = Router();

adminRouter.use("/auth", adminAuthRouter);

adminRouter.use(requireAdmin);
adminRouter.use("/dashboard", dashboardRouter);
adminRouter.use("/campers", adminCamperRouter);
adminRouter.use("/categories", adminCategoryRouter);
adminRouter.use("/features", adminFeatureRouter);
adminRouter.use("/camping-places", adminCampingPlaceRouter);
adminRouter.use("/bookings", adminBookingRouter);
adminRouter.use("/payments", adminPaymentRouter);
adminRouter.use("/customers", adminCustomerRouter);
adminRouter.use("/admins", adminAdminsRouter);
adminRouter.use("/reviews", adminReviewRouter);
adminRouter.use("/coupons", adminCouponRouter);
adminRouter.use("/notifications", adminNotificationRouter);
adminRouter.use("/inquiries", adminInquiryRouter);
adminRouter.use("/settings", adminSettingsRouter);
