import { Request, Response } from "express";
import { ADMIN_ROLES, MemberRole } from "../constants/enums";
import { HttpCode } from "../constants/http";
import { currentMember } from "../middleware/auth.middleware";
import { uploadedFiles } from "../middleware/upload.middleware";
import { getValidated } from "../middleware/validate.middleware";
import { memberService } from "../services/Member.service";
import { sendSuccess } from "../utils/response";
import { createAdminSchema, updateAdminSchema, updateProfileSchema } from "../validators/auth.validator";
import { idParamSchema } from "../validators/common.validator";
import { memberListQuerySchema, memberStatusSchema } from "../validators/member.validator";

export const memberController = {
  /* Own profile (customer or admin, depending on the router it is mounted on) */
  updateProfile: async (req: Request, res: Response) => {
    const input = getValidated(req, "body", updateProfileSchema);
    const member = await memberService.updateProfile(currentMember(req)._id, input);
    sendSuccess(res, { message: "Profile updated", data: { member } });
  },

  updateAvatar: async (req: Request, res: Response) => {
    const [file] = uploadedFiles(req);
    const member = await memberService.updateAvatar(currentMember(req)._id, file as Express.Multer.File);
    sendSuccess(res, { message: "Avatar updated", data: { member } });
  },

  /* Admin: customers */
  listCustomers: async (req: Request, res: Response) => {
    const query = getValidated(req, "query", memberListQuerySchema);
    const { items, meta } = await memberService.listMembers([MemberRole.CUSTOMER], query);
    sendSuccess(res, { message: "Customers retrieved", data: items, meta });
  },

  getCustomer: async (req: Request, res: Response) => {
    const { id } = getValidated(req, "params", idParamSchema);
    const data = await memberService.getCustomerDetail(id);
    sendSuccess(res, { message: "Customer retrieved", data });
  },

  updateCustomerStatus: async (req: Request, res: Response) => {
    const { id } = getValidated(req, "params", idParamSchema);
    const { status } = getValidated(req, "body", memberStatusSchema);
    const customer = await memberService.updateCustomerStatus(id, status);
    sendSuccess(res, { message: "Customer status updated", data: { customer } });
  },

  /* Super admin: administrators */
  listAdmins: async (req: Request, res: Response) => {
    const query = getValidated(req, "query", memberListQuerySchema);
    const { items, meta } = await memberService.listMembers(ADMIN_ROLES, query);
    sendSuccess(res, { message: "Administrators retrieved", data: items, meta });
  },

  createAdmin: async (req: Request, res: Response) => {
    const input = getValidated(req, "body", createAdminSchema);
    const admin = await memberService.createAdmin(input, currentMember(req)._id);
    sendSuccess(res, { statusCode: HttpCode.CREATED, message: "Administrator created", data: { admin } });
  },

  updateAdmin: async (req: Request, res: Response) => {
    const { id } = getValidated(req, "params", idParamSchema);
    const input = getValidated(req, "body", updateAdminSchema);
    const admin = await memberService.updateAdmin(id, input, currentMember(req)._id);
    sendSuccess(res, { message: "Administrator updated", data: { admin } });
  },
};
