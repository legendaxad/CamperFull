import { Router } from "express";
import { bookingController } from "../controllers/booking.controller";
import { couponController } from "../controllers/coupon.controller";
import { favoriteController, inquiryController, reviewController } from "../controllers/engagement.controller";
import { notificationController } from "../controllers/notification.controller";
import { paymentController } from "../controllers/payment.controller";
import { optionalCustomer, requireCustomer } from "../middleware/auth.middleware";
import { authRateLimiter } from "../middleware/security.middleware";
import { validate } from "../middleware/validate.middleware";
import {
  bookingCreateSchema,
  bookingQuoteSchema,
  cancelBookingSchema,
  customerBookingListQuerySchema,
} from "../validators/booking.validator";
import { idParamSchema, paginationSchema } from "../validators/common.validator";
import {
  camperIdParamSchema,
  inquiryCreateSchema,
  notificationListQuerySchema,
  reviewCreateSchema,
  reviewListQuerySchema,
  reviewUpdateSchema,
} from "../validators/engagement.validator";
import { checkoutSchema, paymentConfirmSchema, paymentListQuerySchema, tossWebhookSchema } from "../validators/payment.validator";

/* Bookings */
export const bookingRouter = Router();
// Quotes are public so visitors can see prices before signing in.
bookingRouter.post("/quote", optionalCustomer, validate({ body: bookingQuoteSchema }), bookingController.quote);
bookingRouter.use(requireCustomer);
bookingRouter.post("/", validate({ body: bookingCreateSchema }), bookingController.create);
bookingRouter.get("/", validate({ query: customerBookingListQuerySchema }), bookingController.listMine);
bookingRouter.get("/:id", validate({ params: idParamSchema }), bookingController.getMine);
bookingRouter.post("/:id/cancel", validate({ params: idParamSchema, body: cancelBookingSchema }), bookingController.cancelMine);

/* Payments */
export const paymentRouter = Router();
// Called by the provider's servers; verified by re-fetching the payment, not by session.
paymentRouter.post("/webhooks/toss", validate({ body: tossWebhookSchema }), paymentController.tossWebhook);
paymentRouter.use(requireCustomer);
paymentRouter.post("/checkout", validate({ body: checkoutSchema }), paymentController.checkout);
paymentRouter.post("/confirm", validate({ body: paymentConfirmSchema }), paymentController.confirm);
paymentRouter.get("/", validate({ query: paymentListQuerySchema }), paymentController.listMine);
paymentRouter.get("/:id", validate({ params: idParamSchema }), paymentController.getMine);

/* Reviews (camper review lists are on /campers/:idOrSlug/reviews) */
export const reviewRouter = Router();
reviewRouter.use(requireCustomer);
reviewRouter.get("/me", validate({ query: reviewListQuerySchema }), reviewController.listMine);
reviewRouter.post("/", validate({ body: reviewCreateSchema }), reviewController.create);
reviewRouter.patch("/:id", validate({ params: idParamSchema, body: reviewUpdateSchema }), reviewController.update);
reviewRouter.delete("/:id", validate({ params: idParamSchema }), reviewController.remove);

/* Favorites */
export const favoriteRouter = Router();
favoriteRouter.use(requireCustomer);
favoriteRouter.get("/", validate({ query: paginationSchema }), favoriteController.list);
favoriteRouter.get("/ids", favoriteController.ids);
favoriteRouter.post("/:camperId", validate({ params: camperIdParamSchema }), favoriteController.add);
favoriteRouter.delete("/:camperId", validate({ params: camperIdParamSchema }), favoriteController.remove);

/* Coupons */
export const couponRouter = Router();
couponRouter.post("/validate", optionalCustomer, validate({ body: bookingQuoteSchema }), couponController.validate);

/* Notifications */
export const notificationRouter = Router();
notificationRouter.use(requireCustomer);
notificationRouter.get("/", validate({ query: notificationListQuerySchema }), notificationController.list);
notificationRouter.get("/unread-count", notificationController.unreadCount);
notificationRouter.patch("/read-all", notificationController.markAllRead);
notificationRouter.patch("/:id/read", validate({ params: idParamSchema }), notificationController.markRead);
notificationRouter.delete("/:id", validate({ params: idParamSchema }), notificationController.remove);

/* Contact / Q&A */
export const inquiryRouter = Router();
// The auth limiter also protects this public form against spam bursts.
inquiryRouter.post("/", authRateLimiter, optionalCustomer, validate({ body: inquiryCreateSchema }), inquiryController.create);
