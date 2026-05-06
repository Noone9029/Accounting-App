import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { AuthenticatedRequest } from "../auth.types";

export const CurrentOrganizationId = createParamDecorator((_data: unknown, context: ExecutionContext): string => {
  const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
  if (!request.organizationId) {
    throw new Error("CurrentOrganizationId decorator used without OrganizationContextGuard.");
  }

  return request.organizationId;
});
