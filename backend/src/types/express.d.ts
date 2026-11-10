import { Role } from "../config/constants.js";

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  tenantId: string;
  mustChangePassword: boolean;
}

declare global {
  namespace Express {
    interface Request {
      user: AuthUser;
    }
  }
}
