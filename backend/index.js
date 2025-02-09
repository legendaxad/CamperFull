import cors from "cors";
import express from "express";
const server = express();

import { router } from "./route/index.js";
import { connectDB } from "./config/database.config.js";
import { errorMiddleware } from "./middleware/error.middleware.js";

void connectDB();

server.use(cors({ credentials: true, origin: "*" }));
server.use(express.json());
server.use("/", router);
server.use(errorMiddleware);

server.listen(8080, () => {
  console.log("server running 8000");
});
