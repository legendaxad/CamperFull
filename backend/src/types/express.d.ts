import { AuthAudience, MemberRole } from "../constants/enums";
import { ObjectId } from "../interfaces/common.interface";

export interface AuthenticatedMember {
  _id: ObjectId;
  role: MemberRole;
  email: string;
  firstName: string;
  lastName: string;
  audience: AuthAudience;
}

export interface ValidatedRequestParts {
  body?: unknown;
  query?: unknown;
  params?: unknown;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      member?: AuthenticatedMember;
      validated?: ValidatedRequestParts;
    }
  }
}
