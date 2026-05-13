import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { PERMISSIONS } from "@ledgerbyte/shared";
import { AuthenticatedUser } from "../auth/auth.types";
import { CurrentOrganizationId } from "../auth/decorators/current-organization.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { RequirePermissions } from "../auth/decorators/require-permissions.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "../auth/guards/organization-context.guard";
import { PermissionGuard } from "../auth/guards/permission.guard";
import { BankStatementService } from "./bank-statement.service";
import { CategorizeBankStatementTransactionDto } from "./dto/categorize-bank-statement-transaction.dto";
import { IgnoreBankStatementTransactionDto } from "./dto/ignore-bank-statement-transaction.dto";
import { MatchBankStatementTransactionDto } from "./dto/match-bank-statement-transaction.dto";

@Controller("bank-statement-transactions")
@UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionGuard)
export class BankStatementTransactionController {
  constructor(private readonly bankStatementService: BankStatementService) {}

  @Get(":id")
  @RequirePermissions(PERMISSIONS.bankStatements.view)
  get(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.bankStatementService.getTransaction(organizationId, id);
  }

  @Get(":id/match-candidates")
  @RequirePermissions(PERMISSIONS.bankStatements.reconcile)
  matchCandidates(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.bankStatementService.matchCandidates(organizationId, id);
  }

  @Post(":id/match")
  @RequirePermissions(PERMISSIONS.bankStatements.reconcile)
  match(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: MatchBankStatementTransactionDto,
  ) {
    return this.bankStatementService.matchTransaction(organizationId, user.id, id, dto);
  }

  @Post(":id/categorize")
  @RequirePermissions(PERMISSIONS.bankStatements.reconcile)
  categorize(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: CategorizeBankStatementTransactionDto,
  ) {
    return this.bankStatementService.categorizeTransaction(organizationId, user.id, id, dto);
  }

  @Post(":id/ignore")
  @RequirePermissions(PERMISSIONS.bankStatements.reconcile)
  ignore(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: IgnoreBankStatementTransactionDto,
  ) {
    return this.bankStatementService.ignoreTransaction(organizationId, user.id, id, dto);
  }
}
