import type { Request } from "express";

export interface AuthenticatedUser {
  id: string;
  email: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
  authTokenSource?: "bearer" | "cookie";
  authSessionId?: string;
  organizationId?: string;
  membership?: {
    id: string;
    role: {
      id: string;
      name: string;
      permissions: unknown;
    };
  };
}
