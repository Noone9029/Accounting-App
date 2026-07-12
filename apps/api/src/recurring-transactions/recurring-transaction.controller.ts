import { Body, Controller, Get, Headers, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { PERMISSIONS } from "@ledgerbyte/shared";
import type { AuthenticatedUser } from "../auth/auth.types";
import { CurrentOrganizationId } from "../auth/decorators/current-organization.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { RequirePermissions } from "../auth/decorators/require-permissions.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "../auth/guards/organization-context.guard";
import { PermissionGuard } from "../auth/guards/permission.guard";
import { CreateRecurringTransactionDto } from "./dto/create-recurring-transaction.dto";
import { RecurringRunNowDto } from "./dto/recurring-run-now.dto";
import { RecurringRunQueryDto } from "./dto/recurring-run-query.dto";
import { RecurringTransactionQueryDto } from "./dto/recurring-transaction-query.dto";
import { UpdateRecurringTransactionDto } from "./dto/update-recurring-transaction.dto";
import { RecurringExpenseProposalService } from "./recurring-expense-proposal.service";
import { RecurringReadinessService } from "./recurring-readiness.service";
import { RecurringRunService } from "./recurring-run.service";
import { RecurringTemplateService } from "./recurring-template.service";

@Controller("recurring-transactions")
@UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionGuard)
export class RecurringTransactionController {
  constructor(
    private readonly templates: RecurringTemplateService,
    private readonly runsService: RecurringRunService,
    private readonly expenseProposals: RecurringExpenseProposalService,
    private readonly readinessService: RecurringReadinessService,
  ) {}

  @Get()
  @RequirePermissions(PERMISSIONS.recurringTransactions.read)
  list(@CurrentOrganizationId() organizationId: string, @Query() query: RecurringTransactionQueryDto) {
    return this.templates.list(organizationId, query);
  }

  @Get("readiness")
  @RequirePermissions(PERMISSIONS.recurringTransactions.read)
  readiness(@CurrentOrganizationId() organizationId: string) {
    return this.readinessService.get(organizationId);
  }

  @Get("runs/:runId")
  @RequirePermissions(PERMISSIONS.recurringTransactions.read)
  getRun(@CurrentOrganizationId() organizationId: string, @Param("runId") runId: string) {
    return this.runsService.get(organizationId, runId);
  }

  @Post("expense-proposals/:proposalId/review")
  @RequirePermissions(PERMISSIONS.recurringTransactions.review)
  reviewExpenseProposal(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("proposalId") proposalId: string,
    @Headers("idempotency-key") idempotencyKey: string,
  ) {
    return this.expenseProposals.review(organizationId, user.id, proposalId, idempotencyKey);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.recurringTransactions.manage)
  create(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateRecurringTransactionDto,
  ) {
    return this.templates.create(organizationId, user.id, dto);
  }

  @Get(":id")
  @RequirePermissions(PERMISSIONS.recurringTransactions.read)
  get(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.templates.get(organizationId, id);
  }

  @Patch(":id")
  @RequirePermissions(PERMISSIONS.recurringTransactions.manage)
  update(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: UpdateRecurringTransactionDto,
  ) {
    return this.templates.update(organizationId, user.id, id, dto);
  }

  @Post(":id/activate")
  @RequirePermissions(PERMISSIONS.recurringTransactions.manage)
  activate(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.templates.activate(organizationId, user.id, id);
  }

  @Post(":id/pause")
  @RequirePermissions(PERMISSIONS.recurringTransactions.manage)
  pause(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.templates.pause(organizationId, user.id, id);
  }

  @Post(":id/resume")
  @RequirePermissions(PERMISSIONS.recurringTransactions.manage)
  resume(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.templates.resume(organizationId, user.id, id);
  }

  @Post(":id/archive")
  @RequirePermissions(PERMISSIONS.recurringTransactions.manage)
  archive(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.templates.archive(organizationId, user.id, id);
  }

  @Post(":id/run")
  @RequirePermissions(PERMISSIONS.recurringTransactions.run)
  run(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Headers("idempotency-key") idempotencyKey: string,
    @Body() dto: RecurringRunNowDto,
  ) {
    return this.runsService.runNow(organizationId, user.id, id, idempotencyKey, dto.requestId);
  }

  @Get(":id/runs")
  @RequirePermissions(PERMISSIONS.recurringTransactions.read)
  runs(
    @CurrentOrganizationId() organizationId: string,
    @Param("id") id: string,
    @Query() query: RecurringRunQueryDto,
  ) {
    return this.runsService.listForTemplate(organizationId, id, query);
  }
}
