import { Controller, Get, Req, UseGuards } from "@nestjs/common";
import { hasAnyPermission, PERMISSIONS } from "@ledgerbyte/shared";
import type { AuthenticatedRequest } from "../auth/auth.types";
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
  summary(@CurrentOrganizationId() organizationId: string, @Req() request: AuthenticatedRequest) {
    return this.dashboardService.summary(organizationId, {
      canViewSalesAttention: hasAnyPermission(request.membership?.role.permissions, [PERMISSIONS.salesInvoices.view]),
    });
  }

  @Get("onboarding-checklist")
  @RequirePermissions(PERMISSIONS.dashboard.view)
  onboardingChecklist(@CurrentOrganizationId() organizationId: string) {
    return this.dashboardService.onboardingChecklist(organizationId);
  }
}
