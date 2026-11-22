import { Router } from "express";
import { dashboardController, settingsController } from "../../controllers/admin.controller";
import { bookingController } from "../../controllers/booking.controller";
import { camperController } from "../../controllers/camper.controller";
import { campingPlaceController, categoryController, featureController } from "../../controllers/catalog.controller";
import { couponController } from "../../controllers/coupon.controller";
import { inquiryController, reviewController } from "../../controllers/engagement.controller";
import { notificationController } from "../../controllers/notification.controller";
import { paymentController } from "../../controllers/payment.controller";
import { uploadImages, uploadSingleImage } from "../../middleware/upload.middleware";
import { validate } from "../../middleware/validate.middleware";
import { adminBookingListQuerySchema, adminBookingNoteSchema, adminBookingStatusSchema } from "../../validators/booking.validator";
import {
  adminCamperListQuerySchema,
  camperCreateSchema,
  camperStatusSchema,
  camperUpdateSchema,
  campingPlaceCreateSchema,
  campingPlaceListQuerySchema,
  campingPlaceUpdateSchema,
  categoryCreateSchema,
  categoryUpdateSchema,
  featureCreateSchema,
  featureUpdateSchema,
  imageParamsSchema,
  reorderImagesSchema,
} from "../../validators/catalog.validator";
import { idParamSchema } from "../../validators/common.validator";
import { couponCreateSchema, couponListQuerySchema, couponUpdateSchema } from "../../validators/coupon.validator";
import { activityQuerySchema, dashboardRangeQuerySchema } from "../../validators/dashboard.validator";
import {
  adminInquiryListQuerySchema,
  adminReviewListQuerySchema,
  adminSendNotificationSchema,
  inquiryUpdateSchema,
  notificationListQuerySchema,
  reviewModerationSchema,
  settingsUpdateSchema,
} from "../../validators/engagement.validator";
import { adminPaymentListQuerySchema, refundSchema } from "../../validators/payment.validator";

const id = validate({ params: idParamSchema });

export const dashboardRouter = Router();
dashboardRouter.get("/overview", dashboardController.overview);
dashboardRouter.get("/revenue", validate({ query: dashboardRangeQuerySchema }), dashboardController.revenue);
dashboardRouter.get("/bookings", validate({ query: dashboardRangeQuerySchema }), dashboardController.bookings);
dashboardRouter.get("/top-campers", validate({ query: dashboardRangeQuerySchema }), dashboardController.topCampers);
dashboardRouter.get("/kpis", validate({ query: dashboardRangeQuerySchema }), dashboardController.kpis);
dashboardRouter.get("/fleet", validate({ query: dashboardRangeQuerySchema }), dashboardController.fleet);
dashboardRouter.get("/customers", validate({ query: dashboardRangeQuerySchema }), dashboardController.customers);
dashboardRouter.get("/payments", validate({ query: dashboardRangeQuerySchema }), dashboardController.payments);
dashboardRouter.get("/activity", validate({ query: activityQuerySchema }), dashboardController.activity);

export const adminCamperRouter = Router();
adminCamperRouter.get("/", validate({ query: adminCamperListQuerySchema }), camperController.adminList);
adminCamperRouter.post("/", validate({ body: camperCreateSchema }), camperController.create);
adminCamperRouter.get("/:id", id, camperController.adminGet);
adminCamperRouter.patch("/:id", validate({ params: idParamSchema, body: camperUpdateSchema }), camperController.update);
adminCamperRouter.patch("/:id/status", validate({ params: idParamSchema, body: camperStatusSchema }), camperController.setStatus);
adminCamperRouter.delete("/:id", id, camperController.remove);
adminCamperRouter.post("/:id/images", id, ...uploadImages("images"), camperController.addImages);
adminCamperRouter.patch("/:id/images/order", validate({ params: idParamSchema, body: reorderImagesSchema }), camperController.reorderImages);
adminCamperRouter.delete("/:id/images/:imageId", validate({ params: imageParamsSchema }), camperController.removeImage);

export const adminCategoryRouter = Router();
adminCategoryRouter.get("/", categoryController.adminList);
adminCategoryRouter.post("/", validate({ body: categoryCreateSchema }), categoryController.create);
adminCategoryRouter.patch("/:id", validate({ params: idParamSchema, body: categoryUpdateSchema }), categoryController.update);
adminCategoryRouter.put("/:id/image", id, ...uploadSingleImage("image"), categoryController.setImage);
adminCategoryRouter.delete("/:id", id, categoryController.remove);

export const adminFeatureRouter = Router();
adminFeatureRouter.get("/", featureController.adminList);
adminFeatureRouter.post("/", validate({ body: featureCreateSchema }), featureController.create);
adminFeatureRouter.patch("/:id", validate({ params: idParamSchema, body: featureUpdateSchema }), featureController.update);
adminFeatureRouter.delete("/:id", id, featureController.remove);

export const adminCampingPlaceRouter = Router();
adminCampingPlaceRouter.get("/", validate({ query: campingPlaceListQuerySchema }), campingPlaceController.adminList);
adminCampingPlaceRouter.post("/", validate({ body: campingPlaceCreateSchema }), campingPlaceController.create);
adminCampingPlaceRouter.patch("/:id", validate({ params: idParamSchema, body: campingPlaceUpdateSchema }), campingPlaceController.update);
adminCampingPlaceRouter.delete("/:id", id, campingPlaceController.remove);
adminCampingPlaceRouter.post("/:id/images", id, ...uploadImages("images"), campingPlaceController.addImages);
adminCampingPlaceRouter.delete("/:id/images/:imageId", validate({ params: imageParamsSchema }), campingPlaceController.removeImage);

export const adminBookingRouter = Router();
adminBookingRouter.get("/", validate({ query: adminBookingListQuerySchema }), bookingController.adminList);
adminBookingRouter.get("/:id", id, bookingController.adminGet);
adminBookingRouter.patch("/:id/status", validate({ params: idParamSchema, body: adminBookingStatusSchema }), bookingController.adminUpdateStatus);
adminBookingRouter.patch("/:id/note", validate({ params: idParamSchema, body: adminBookingNoteSchema }), bookingController.adminUpdateNote);

export const adminPaymentRouter = Router();
adminPaymentRouter.get("/", validate({ query: adminPaymentListQuerySchema }), paymentController.adminList);
adminPaymentRouter.get("/:id", id, paymentController.adminGet);
adminPaymentRouter.post("/:id/refund", validate({ params: idParamSchema, body: refundSchema }), paymentController.refund);

export const adminReviewRouter = Router();
adminReviewRouter.get("/", validate({ query: adminReviewListQuerySchema }), reviewController.adminList);
adminReviewRouter.patch("/:id", validate({ params: idParamSchema, body: reviewModerationSchema }), reviewController.moderate);
adminReviewRouter.delete("/:id", id, reviewController.adminRemove);

export const adminCouponRouter = Router();
adminCouponRouter.get("/", validate({ query: couponListQuerySchema }), couponController.list);
adminCouponRouter.post("/", validate({ body: couponCreateSchema }), couponController.create);
adminCouponRouter.get("/:id", id, couponController.get);
adminCouponRouter.patch("/:id", validate({ params: idParamSchema, body: couponUpdateSchema }), couponController.update);
adminCouponRouter.delete("/:id", id, couponController.remove);

export const adminNotificationRouter = Router();
adminNotificationRouter.get("/", validate({ query: notificationListQuerySchema }), notificationController.list);
adminNotificationRouter.get("/unread-count", notificationController.unreadCount);
adminNotificationRouter.post("/", validate({ body: adminSendNotificationSchema }), notificationController.send);
adminNotificationRouter.patch("/read-all", notificationController.markAllRead);
adminNotificationRouter.patch("/:id/read", id, notificationController.markRead);
adminNotificationRouter.delete("/:id", id, notificationController.remove);

export const adminInquiryRouter = Router();
adminInquiryRouter.get("/", validate({ query: adminInquiryListQuerySchema }), inquiryController.adminList);
adminInquiryRouter.get("/:id", id, inquiryController.adminGet);
adminInquiryRouter.patch("/:id", validate({ params: idParamSchema, body: inquiryUpdateSchema }), inquiryController.adminUpdate);

export const adminSettingsRouter = Router();
adminSettingsRouter.get("/", settingsController.get);
adminSettingsRouter.patch("/", validate({ body: settingsUpdateSchema }), settingsController.update);
