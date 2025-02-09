import { Router } from "express";
import { AuthController } from "../../controller/auth/auth.controller.js";
import { authMiddleware } from "../../middleware/authmiddleware.js";

export const authRouter = Router();
authRouter.post("/sign-up", AuthController.signUp);
authRouter.post("/login", AuthController.login);
authRouter.get("/me", authMiddleware, AuthController.me);
