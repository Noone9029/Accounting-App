import { Controller, Get, Req, UseGuards } from "@nestjs/common";
import { PERMISSIONS } from "@ledgerbyte/shared";
import { RequirePermissions } from "../auth/decorators/require-permissions.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "../auth/guards/organization-context.guard";
import { PermissionGuard } from "../auth/guards/permission.guard";
import type { AuthenticatedRequest } from "../auth/auth.types";
import { ObservabilityReadinessService } from "./observability-readiness.service";

@Controller("diagnostics/observability-readiness")
@UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionGuard)
export class ObservabilityReadinessController {
  constructor(private readonly readiness: ObservabilityReadinessService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.users.manage)
  read(@Req() request: AuthenticatedRequest) {
    return {
      requestId: request.requestId ?? null,
      observability: this.readiness.read(),
    };
  }
}
