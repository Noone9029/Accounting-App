import { Controller, Get, UseGuards } from "@nestjs/common";
import { PERMISSIONS } from "@ledgerbyte/shared";
import { CurrentOrganizationId } from "../auth/decorators/current-organization.decorator";
import { RequirePermissions } from "../auth/decorators/require-permissions.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "../auth/guards/organization-context.guard";
import { PermissionGuard } from "../auth/guards/permission.guard";
import { DashboardService } from "./dashboard.service";

@Controller("dashboard")
@UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get("summary")
  @RequirePermissions(PERMISSIONS.dashboard.view)
  summary(@CurrentOrganizationId() organizationId: string) {
    return this.dashboardService.summary(organizationId);
  }
}
