import { Router } from "express";
import { customerAuthController } from "../controllers/auth.controller";
import { memberController } from "../controllers/member.controller";
import { requireCustomer } from "../middleware/auth.middleware";
import { uploadSingleImage } from "../middleware/upload.middleware";
import { validate } from "../middleware/validate.middleware";
import { updateProfileSchema } from "../validators/auth.validator";

/** The signed-in customer's own profile. */
export const memberRouter = Router();

memberRouter.use(requireCustomer);
memberRouter.get("/me", customerAuthController.me);
memberRouter.patch("/me", validate({ body: updateProfileSchema }), memberController.updateProfile);
memberRouter.put("/me/avatar", ...uploadSingleImage("avatar"), memberController.updateAvatar);
