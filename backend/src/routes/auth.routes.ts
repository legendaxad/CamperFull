import { Router } from "express";
import { customerAuthController as controller } from "../controllers/auth.controller";
import { requireCustomer } from "../middleware/auth.middleware";
import { authRateLimiter } from "../middleware/security.middleware";
import { validate } from "../middleware/validate.middleware";
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from "../validators/auth.validator";

export const authRouter = Router();

authRouter.post("/register", authRateLimiter, validate({ body: registerSchema }), controller.register);
authRouter.post("/login", authRateLimiter, validate({ body: loginSchema }), controller.login);
authRouter.post("/refresh", controller.refresh);
authRouter.post("/logout", controller.logout);
authRouter.post("/forgot-password", authRateLimiter, validate({ body: forgotPasswordSchema }), controller.forgotPassword);
authRouter.post("/reset-password", authRateLimiter, validate({ body: resetPasswordSchema }), controller.resetPassword);
authRouter.get("/me", requireCustomer, controller.me);
authRouter.patch("/me/password", requireCustomer, validate({ body: changePasswordSchema }), controller.changePassword);
