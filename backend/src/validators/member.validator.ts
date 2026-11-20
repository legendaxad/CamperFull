import { z } from "zod";
import { MemberStatus } from "../constants/enums";
import { paginationSchema, searchSchema } from "./common.validator";

export const memberListQuerySchema = paginationSchema.extend({
  search: searchSchema,
  status: z.nativeEnum(MemberStatus).optional(),
  sort: z.enum(["newest", "oldest", "name"]).default("newest"),
});

export const memberStatusSchema = z.object({
  status: z.enum([MemberStatus.ACTIVE, MemberStatus.BLOCKED]),
});
