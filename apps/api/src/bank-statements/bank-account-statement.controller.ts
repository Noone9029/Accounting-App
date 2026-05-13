import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { PERMISSIONS } from "@ledgerbyte/shared";
import { AuthenticatedUser } from "../auth/auth.types";
import { CurrentOrganizationId } from "../auth/decorators/current-organization.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { RequirePermissions } from "../auth/decorators/require-permissions.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "../auth/guards/organization-context.guard";
import { PermissionGuard } from "../auth/guards/permission.guard";
import { BankStatementService } from "./bank-statement.service";
import { BankReconciliationSummaryQueryDto, BankStatementTransactionsQueryDto } from "./dto/bank-statement-query.dto";
import { CreateBankStatementImportDto, PreviewBankStatementImportDto } from "./dto/create-bank-statement-import.dto";

@Controller("bank-accounts/:bankAccountProfileId")
@UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionGuard)
export class BankAccountStatementController {
  constructor(private readonly bankStatementService: BankStatementService) {}

  @Get("statement-imports")
  @RequirePermissions(PERMISSIONS.bankStatements.view)
  listImports(@CurrentOrganizationId() organizationId: string, @Param("bankAccountProfileId") bankAccountProfileId: string) {
    return this.bankStatementService.listImports(organizationId, bankAccountProfileId);
  }

  @Post("statement-imports")
  @RequirePermissions(PERMISSIONS.bankStatements.import)
  importStatement(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("bankAccountProfileId") bankAccountProfileId: string,
    @Body() dto: CreateBankStatementImportDto,
  ) {
    return this.bankStatementService.importStatement(organizationId, user.id, bankAccountProfileId, dto);
  }

  @Post("statement-imports/preview")
  @RequirePermissions(PERMISSIONS.bankStatements.previewImport)
  previewImport(
    @CurrentOrganizationId() organizationId: string,
    @Param("bankAccountProfileId") bankAccountProfileId: string,
    @Body() dto: PreviewBankStatementImportDto,
  ) {
    return this.bankStatementService.previewImport(organizationId, bankAccountProfileId, dto);
  }

  @Get("statement-transactions")
  @RequirePermissions(PERMISSIONS.bankStatements.view)
  listTransactions(
    @CurrentOrganizationId() organizationId: string,
    @Param("bankAccountProfileId") bankAccountProfileId: string,
    @Query() query: BankStatementTransactionsQueryDto,
  ) {
    return this.bankStatementService.listTransactions(organizationId, bankAccountProfileId, query);
  }

  @Get("reconciliation-summary")
  @RequirePermissions(PERMISSIONS.bankStatements.view)
  reconciliationSummary(
    @CurrentOrganizationId() organizationId: string,
    @Param("bankAccountProfileId") bankAccountProfileId: string,
    @Query() query: BankReconciliationSummaryQueryDto,
  ) {
    return this.bankStatementService.reconciliationSummary(organizationId, bankAccountProfileId, query);
  }
}
