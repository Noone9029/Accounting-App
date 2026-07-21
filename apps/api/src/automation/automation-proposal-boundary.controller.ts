import { Controller, Get, UseGuards } from "@nestjs/common";
import { PERMISSIONS } from "@ledgerbyte/shared";
import { CurrentOrganizationId } from "../auth/decorators/current-organization.decorator";
import { RequirePermissions } from "../auth/decorators/require-permissions.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "../auth/guards/organization-context.guard";
import { PermissionGuard } from "../auth/guards/permission.guard";
import { AutomationProposalBoundaryService } from "./automation-proposal-boundary.service";

@Controller("automation")
@UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionGuard)
export class AutomationProposalBoundaryController {
  constructor(private readonly automationProposalBoundaryService: AutomationProposalBoundaryService) {}

  @Get("proposal-boundary")
  @RequirePermissions(PERMISSIONS.dashboard.view)
  boundary(@CurrentOrganizationId() organizationId: string) {
    return this.automationProposalBoundaryService.boundary(organizationId);
  }
}
