import { Router } from "express";
import { adminAuthController as controller } from "../../controllers/auth.controller";
import { memberController } from "../../controllers/member.controller";
import { requireAdmin } from "../../middleware/auth.middleware";
import { authRateLimiter } from "../../middleware/security.middleware";
import { validate } from "../../middleware/validate.middleware";
import { changePasswordSchema, loginSchema, updateProfileSchema } from "../../validators/auth.validator";

/** Admin sessions. There is intentionally no public admin registration. */
export const adminAuthRouter = Router();

adminAuthRouter.post("/login", authRateLimiter, validate({ body: loginSchema }), controller.login);
adminAuthRouter.post("/refresh", controller.refresh);
adminAuthRouter.post("/logout", controller.logout);
adminAuthRouter.get("/me", requireAdmin, controller.me);
adminAuthRouter.patch("/me", requireAdmin, validate({ body: updateProfileSchema }), memberController.updateProfile);
adminAuthRouter.patch("/me/password", requireAdmin, validate({ body: changePasswordSchema }), controller.changePassword);
