import { Request } from "express";
import { ClientMeta } from "../services/Auth.service";

export const clientMeta = (req: Request): ClientMeta => ({
  userAgent: req.get("user-agent"),
  ip: req.ip,
});
