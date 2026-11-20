/*
 * Creates the first SUPER_ADMIN. Admins cannot register publicly, so this is
 * the bootstrap step; afterwards the super admin creates other admins from
 * the dashboard.
 *
 *   SUPER_ADMIN_EMAIL=owner@example.com SUPER_ADMIN_PASSWORD='...' npm run create-admin
 */
import { env } from "../config/env";
import { MemberRole } from "../constants/enums";
import { connectDatabase, disconnectDatabase } from "../database/connection";
import { MemberModel } from "../models";
import { authService } from "../services/Auth.service";
import { createAdminSchema } from "../validators/auth.validator";

const run = async (): Promise<void> => {
  const input = createAdminSchema.parse({
    firstName: process.env.SUPER_ADMIN_FIRST_NAME ?? "Super",
    lastName: process.env.SUPER_ADMIN_LAST_NAME ?? "Admin",
    email: process.env.SUPER_ADMIN_EMAIL,
    password: process.env.SUPER_ADMIN_PASSWORD,
    role: MemberRole.SUPER_ADMIN,
  });

  await connectDatabase(env.MONGODB_URI);
  try {
    if (await MemberModel.exists({ email: input.email })) {
      process.stdout.write(`A member with email ${input.email} already exists. Nothing changed.\n`);
      return;
    }
    await MemberModel.create({
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      role: MemberRole.SUPER_ADMIN,
      passwordHash: await authService.hashPassword(input.password),
    });
    process.stdout.write(`Super admin ${input.email} created.\n`);
  } finally {
    await disconnectDatabase();
  }
};

run().catch((error: unknown) => {
  process.stderr.write(`Failed to create super admin: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
