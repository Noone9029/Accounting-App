import { Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { PERMISSIONS } from "@ledgerbyte/shared";
import { AuthenticatedUser } from "../auth/auth.types";
import { CurrentOrganizationId } from "../auth/decorators/current-organization.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { RequirePermissions } from "../auth/decorators/require-permissions.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "../auth/guards/organization-context.guard";
import { PermissionGuard } from "../auth/guards/permission.guard";
import { BankStatementService } from "./bank-statement.service";

@Controller("bank-statement-imports")
@UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionGuard)
export class BankStatementImportController {
  constructor(private readonly bankStatementService: BankStatementService) {}

  @Get(":id")
  @RequirePermissions(PERMISSIONS.bankStatements.view)
  get(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.bankStatementService.getImport(organizationId, id);
  }

  @Post(":id/void")
  @RequirePermissions(PERMISSIONS.bankStatements.manage)
  void(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.bankStatementService.voidImport(organizationId, user.id, id);
  }
}
