const { Router } = require("express");
const { authRouter } = require("./auth/auth.route.js");
const router = Router();

router.use("/auth", authRouter);

module.exports = { router };
