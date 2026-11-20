import { Router } from "express";
import { memberController } from "../../controllers/member.controller";
import { MemberRole } from "../../constants/enums";
import { allowRoles } from "../../middleware/auth.middleware";
import { validate } from "../../middleware/validate.middleware";
import { createAdminSchema, updateAdminSchema } from "../../validators/auth.validator";
import { idParamSchema } from "../../validators/common.validator";
import { memberListQuerySchema, memberStatusSchema } from "../../validators/member.validator";

export const adminCustomerRouter = Router();

adminCustomerRouter.get("/", validate({ query: memberListQuerySchema }), memberController.listCustomers);
adminCustomerRouter.get("/:id", validate({ params: idParamSchema }), memberController.getCustomer);
adminCustomerRouter.patch("/:id/status", validate({ params: idParamSchema, body: memberStatusSchema }), memberController.updateCustomerStatus);

/** Only a SUPER_ADMIN can create or manage administrator accounts. */
export const adminAdminsRouter = Router();

adminAdminsRouter.use(allowRoles(MemberRole.SUPER_ADMIN));
adminAdminsRouter.get("/", validate({ query: memberListQuerySchema }), memberController.listAdmins);
adminAdminsRouter.post("/", validate({ body: createAdminSchema }), memberController.createAdmin);
adminAdminsRouter.patch("/:id", validate({ params: idParamSchema, body: updateAdminSchema }), memberController.updateAdmin);
