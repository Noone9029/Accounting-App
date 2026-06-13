import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { PERMISSIONS } from "@ledgerbyte/shared";
import { AuthenticatedUser } from "../auth/auth.types";
import { CurrentOrganizationId } from "../auth/decorators/current-organization.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { RequirePermissions } from "../auth/decorators/require-permissions.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "../auth/guards/organization-context.guard";
import { PermissionGuard } from "../auth/guards/permission.guard";
import { BankRulesService } from "./bank-rules.service";
import { ApplyBankRuleSuggestionDto, BankRulesQueryDto, CreateBankRuleDto, DryRunBankRuleDto, UpdateBankRuleDto } from "./dto/bank-rule.dto";

@Controller("bank-rules")
@UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionGuard)
export class BankRulesController {
  constructor(private readonly bankRulesService: BankRulesService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.bankStatements.view)
  list(@CurrentOrganizationId() organizationId: string, @Query() query: BankRulesQueryDto) {
    return this.bankRulesService.listRules(organizationId, query.bankAccountProfileId);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.bankStatements.manage)
  create(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Body() dto: CreateBankRuleDto) {
    return this.bankRulesService.createRule(organizationId, user.id, dto);
  }

  @Patch(":id")
  @RequirePermissions(PERMISSIONS.bankStatements.manage)
  update(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: UpdateBankRuleDto,
  ) {
    return this.bankRulesService.updateRule(organizationId, user.id, id, dto);
  }

  @Delete(":id")
  @RequirePermissions(PERMISSIONS.bankStatements.manage)
  disable(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.bankRulesService.disableRule(organizationId, user.id, id);
  }

  @Post(":id/dry-run")
  @RequirePermissions(PERMISSIONS.bankStatements.view)
  dryRun(@CurrentOrganizationId() organizationId: string, @Param("id") id: string, @Body() dto: DryRunBankRuleDto) {
    return this.bankRulesService.dryRunRule(organizationId, id, dto);
  }
}

@Controller("bank-statement-transactions")
@UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionGuard)
export class BankRuleStatementTransactionController {
  constructor(private readonly bankRulesService: BankRulesService) {}

  @Post(":id/rule-suggestions")
  @RequirePermissions(PERMISSIONS.bankStatements.view)
  suggestions(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.bankRulesService.suggestionsForTransaction(organizationId, id);
  }

  @Post(":id/apply-rule-suggestion")
  @RequirePermissions(PERMISSIONS.bankStatements.reconcile)
  apply(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: ApplyBankRuleSuggestionDto,
  ) {
    return this.bankRulesService.applySuggestion(organizationId, user.id, id, dto);
  }
}
