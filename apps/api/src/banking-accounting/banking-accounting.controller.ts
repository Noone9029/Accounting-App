import { Body, Controller, Get, Param, Post, Put, UseGuards } from "@nestjs/common";
import { PERMISSIONS } from "@ledgerbyte/shared";
import { AuthenticatedUser } from "../auth/auth.types";
import { CurrentOrganizationId } from "../auth/decorators/current-organization.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { RequirePermissions } from "../auth/decorators/require-permissions.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "../auth/guards/organization-context.guard";
import { PermissionGuard } from "../auth/guards/permission.guard";
import { BankingAccountingService } from "./banking-accounting.service";
import { UpdateBankingClearingAccountConfigDto } from "./dto/banking-clearing-account-config.dto";

@Controller("banking-accounting")
@UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionGuard)
export class BankingAccountingController {
  constructor(private readonly bankingAccountingService: BankingAccountingService) {}

  @Get("clearing-config")
  @RequirePermissions(PERMISSIONS.accounts.view)
  getConfig(@CurrentOrganizationId() organizationId: string) {
    return this.bankingAccountingService.getConfig(organizationId);
  }

  @Put("clearing-config")
  @RequirePermissions(PERMISSIONS.accounts.manage)
  updateConfig(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateBankingClearingAccountConfigDto,
  ) {
    return this.bankingAccountingService.updateConfig(organizationId, user.id, dto);
  }

  @Post("clearing-config/validate")
  @RequirePermissions(PERMISSIONS.accounts.view)
  validateConfig(@CurrentOrganizationId() organizationId: string, @Body() dto: UpdateBankingClearingAccountConfigDto) {
    return this.bankingAccountingService.validateConfig(organizationId, dto);
  }

  @Get("bank-deposits/:id/preflight")
  @RequirePermissions(PERMISSIONS.bankStatements.view)
  depositPreflight(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.bankingAccountingService.depositPreflight(organizationId, id);
  }

  @Post("bank-deposits/:id/post-journal")
  @RequirePermissions(PERMISSIONS.journals.post)
  postDepositJournal(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.bankingAccountingService.postDepositJournal(organizationId, user.id, id);
  }

  @Get("card-settlements/:id/preflight")
  @RequirePermissions(PERMISSIONS.bankStatements.view)
  cardSettlementPreflight(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.bankingAccountingService.cardSettlementPreflight(organizationId, id);
  }

  @Post("card-settlements/:id/post-journal")
  @RequirePermissions(PERMISSIONS.journals.post)
  postCardSettlementJournal(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.bankingAccountingService.postCardSettlementJournal(organizationId, user.id, id);
  }

  @Get("cheques/:id/preflight")
  @RequirePermissions(PERMISSIONS.bankStatements.view)
  chequePreflight(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.bankingAccountingService.chequePreflight(organizationId, id);
  }

  @Post("cheques/:id/post-journal")
  @RequirePermissions(PERMISSIONS.journals.post)
  postChequeJournal(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.bankingAccountingService.postChequeJournal(organizationId, user.id, id);
  }
}
