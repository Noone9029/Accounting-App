import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { PERMISSIONS } from "@ledgerbyte/shared";
import { AuthenticatedUser } from "../auth/auth.types";
import { CurrentOrganizationId } from "../auth/decorators/current-organization.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { RequirePermissions } from "../auth/decorators/require-permissions.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "../auth/guards/organization-context.guard";
import { PermissionGuard } from "../auth/guards/permission.guard";
import { BankReconciliationService } from "./bank-reconciliation.service";
import { CreateBankReconciliationDto } from "./dto/create-bank-reconciliation.dto";

@Controller("bank-accounts/:bankAccountProfileId/reconciliations")
@UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionGuard)
export class BankAccountReconciliationController {
  constructor(private readonly bankReconciliationService: BankReconciliationService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.bankReconciliations.view)
  list(@CurrentOrganizationId() organizationId: string, @Param("bankAccountProfileId") bankAccountProfileId: string) {
    return this.bankReconciliationService.listForBankAccount(organizationId, bankAccountProfileId);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.bankReconciliations.create)
  create(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("bankAccountProfileId") bankAccountProfileId: string,
    @Body() dto: CreateBankReconciliationDto,
  ) {
    return this.bankReconciliationService.create(organizationId, user.id, bankAccountProfileId, dto);
  }
}
