import { Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { PERMISSIONS } from "@ledgerbyte/shared";
import { AuthenticatedUser } from "../auth/auth.types";
import { CurrentOrganizationId } from "../auth/decorators/current-organization.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { RequirePermissions } from "../auth/decorators/require-permissions.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "../auth/guards/organization-context.guard";
import { PermissionGuard } from "../auth/guards/permission.guard";
import { BankReconciliationService } from "./bank-reconciliation.service";

@Controller("bank-reconciliations")
@UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionGuard)
export class BankReconciliationController {
  constructor(private readonly bankReconciliationService: BankReconciliationService) {}

  @Get(":id")
  @RequirePermissions(PERMISSIONS.bankReconciliations.view)
  get(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.bankReconciliationService.get(organizationId, id);
  }

  @Post(":id/close")
  @RequirePermissions(PERMISSIONS.bankReconciliations.close)
  close(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.bankReconciliationService.close(organizationId, user.id, id);
  }

  @Post(":id/void")
  @RequirePermissions(PERMISSIONS.bankReconciliations.void)
  void(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.bankReconciliationService.void(organizationId, user.id, id);
  }

  @Get(":id/items")
  @RequirePermissions(PERMISSIONS.bankReconciliations.view)
  items(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.bankReconciliationService.items(organizationId, id);
  }
}
