import { Body, Controller, Get, Headers, Param, ParseUUIDPipe, Post, Query, Res, UseGuards } from "@nestjs/common";
import type { Response } from "express";
import { PERMISSIONS } from "@ledgerbyte/shared";
import { CurrentOrganizationId } from "../auth/decorators/current-organization.decorator";
import { RequirePermissions } from "../auth/decorators/require-permissions.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "../auth/guards/organization-context.guard";
import { PermissionGuard } from "../auth/guards/permission.guard";
import { AccountingCloseReadinessQueryDto } from "./dto/accounting-close-readiness-query.dto";
import { CreateAccountingCloseCycleDto } from "./dto/create-accounting-close-cycle.dto";
import { CompleteAccountingCloseTaskDto } from "./dto/complete-accounting-close-task.dto";
import { ReopenAccountingCloseTaskDto } from "./dto/reopen-accounting-close-task.dto";
import { RefreshAccountingCloseCycleDto } from "./dto/refresh-accounting-close-cycle.dto";
import { ListAccountingCloseTasksDto } from "./dto/list-accounting-close-tasks.dto";
import { ListAccountingCloseSnapshotsDto } from "./dto/list-accounting-close-snapshots.dto";
import { CompareAccountingCloseSnapshotsDto } from "./dto/compare-accounting-close-snapshots.dto";
import { AssignAccountingCloseTaskDto } from "./dto/assign-accounting-close-task.dto";
import { AddAccountingCloseEvidenceDto } from "./dto/add-accounting-close-evidence.dto";
import { PrepareAccountingCloseCycleDto } from "./dto/prepare-accounting-close-cycle.dto";
import { ReviewAccountingCloseCycleDto } from "./dto/review-accounting-close-cycle.dto";
import { ReturnAccountingCloseCycleToPreparerDto } from "./dto/return-accounting-close-cycle-to-preparer.dto";
import { CloseAccountingCloseCycleDto } from "./dto/close-accounting-close-cycle.dto";
import { LockAccountingCloseCycleDto } from "./dto/lock-accounting-close-cycle.dto";
import { FindAccountingCloseCycleDto } from "./dto/find-accounting-close-cycle.dto";
import { ExportAccountingCloseEvidenceDto } from "./dto/export-accounting-close-evidence.dto";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import type { AuthenticatedUser } from "../auth/auth.types";
import { AccountingCloseService } from "./accounting-close.service";

@Controller("accounting-close")
@UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionGuard)
export class AccountingCloseController {
  constructor(private readonly accountingCloseService: AccountingCloseService) {}

  @Get("readiness")
  @RequirePermissions(PERMISSIONS.accountingClose.read)
  readiness(@CurrentOrganizationId() organizationId: string, @Query() query: AccountingCloseReadinessQueryDto) {
    return this.accountingCloseService.readiness(organizationId, query.fiscalPeriodId);
  }

  @Post("cycles")
  @RequirePermissions(PERMISSIONS.accountingClose.manage)
  createCycle(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Body() dto: CreateAccountingCloseCycleDto) {
    return this.accountingCloseService.createCycle(organizationId, user.id, dto.fiscalPeriodId);
  }

  @Get("cycles")
  @RequirePermissions(PERMISSIONS.accountingClose.read)
  findCycle(@CurrentOrganizationId() organizationId: string, @Query() query: FindAccountingCloseCycleDto) {
    return this.accountingCloseService.findCycleByFiscalPeriod(organizationId, query.fiscalPeriodId);
  }

  @Get("cycles/:id")
  @RequirePermissions(PERMISSIONS.accountingClose.read)
  getCycle(@CurrentOrganizationId() organizationId: string, @Param("id") cycleId: string) {
    return this.accountingCloseService.getCycle(organizationId, cycleId);
  }

  @Get("cycles/:id/export")
  @RequirePermissions(PERMISSIONS.accountingClose.read)
  async exportCycleEvidence(
    @CurrentOrganizationId() organizationId: string,
    @Param("id", new ParseUUIDPipe()) cycleId: string,
    @Query() query: ExportAccountingCloseEvidenceDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const manifest = await this.accountingCloseService.exportCycleEvidence(organizationId, cycleId);
    if (query.format === "csv") {
      const csv = this.accountingCloseService.exportCycleEvidenceCsv(manifest);
      response.setHeader("content-type", "text/csv; charset=utf-8");
      response.setHeader("content-disposition", `attachment; filename="${csv.filename}"`);
      return csv.content;
    }
    return manifest;
  }

  @Get("cycles/:id/tasks")
  @RequirePermissions(PERMISSIONS.accountingClose.read)
  listTasks(@CurrentOrganizationId() organizationId: string, @Param("id") cycleId: string, @Query() query: ListAccountingCloseTasksDto) {
    return this.accountingCloseService.listTasks(organizationId, cycleId, query.page, query.pageSize);
  }

  @Get("cycles/:id/snapshots")
  @RequirePermissions(PERMISSIONS.accountingClose.read)
  listSnapshots(@CurrentOrganizationId() organizationId: string, @Param("id") cycleId: string, @Query() query: ListAccountingCloseSnapshotsDto) {
    return this.accountingCloseService.listSnapshots(organizationId, cycleId, query.page, query.pageSize);
  }

  @Get("cycles/:id/snapshots/:snapshotId")
  @RequirePermissions(PERMISSIONS.accountingClose.read)
  getSnapshot(@CurrentOrganizationId() organizationId: string, @Param("id") cycleId: string, @Param("snapshotId") snapshotId: string) {
    return this.accountingCloseService.getSnapshot(organizationId, cycleId, snapshotId);
  }

  @Get("cycles/:id/snapshots/:snapshotId/compare")
  @RequirePermissions(PERMISSIONS.accountingClose.read)
  compareSnapshots(@CurrentOrganizationId() organizationId: string, @Param("id") cycleId: string, @Param("snapshotId", new ParseUUIDPipe()) comparisonSnapshotId: string, @Query() query: CompareAccountingCloseSnapshotsDto) {
    return this.accountingCloseService.compareSnapshots(organizationId, cycleId, query.baselineSnapshotId, comparisonSnapshotId);
  }

  @Post("cycles/:id/tasks/:taskId/assign")
  @RequirePermissions(PERMISSIONS.accountingClose.manage)
  assignTask(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") cycleId: string,
    @Param("taskId") taskId: string,
    @Body() dto: AssignAccountingCloseTaskDto,
  ) {
    return this.accountingCloseService.assignTask(organizationId, user.id, cycleId, taskId, dto.expectedVersion, dto.assignedToUserId);
  }

  @Post("cycles/:id/evidence")
  @RequirePermissions(PERMISSIONS.accountingClose.manage)
  addEvidence(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") cycleId: string, @Body() dto: AddAccountingCloseEvidenceDto) {
    return this.accountingCloseService.addEvidence(organizationId, user.id, cycleId, dto.expectedVersion, dto);
  }

  @Post("cycles/:id/prepare")
  @RequirePermissions(PERMISSIONS.accountingClose.prepare)
  prepareCycle(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") cycleId: string, @Body() dto: PrepareAccountingCloseCycleDto) {
    return this.accountingCloseService.prepareCycle(organizationId, user.id, cycleId, dto.expectedVersion);
  }

  @Post("cycles/:id/review")
  @RequirePermissions(PERMISSIONS.accountingClose.review)
  reviewCycle(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") cycleId: string, @Body() dto: ReviewAccountingCloseCycleDto) {
    return this.accountingCloseService.reviewCycle(organizationId, user.id, cycleId, dto.expectedVersion);
  }

  @Post("cycles/:id/return-to-preparer")
  @RequirePermissions(PERMISSIONS.accountingClose.review)
  returnCycleToPreparer(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") cycleId: string, @Body() dto: ReturnAccountingCloseCycleToPreparerDto) {
    return this.accountingCloseService.returnCycleToPreparer(organizationId, user.id, cycleId, dto.expectedVersion, dto.returnReason);
  }

  @Post("cycles/:id/close")
  @RequirePermissions(PERMISSIONS.accountingClose.close)
  closeCycle(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") cycleId: string, @Headers("idempotency-key") idempotencyKey: string | undefined, @Body() dto: CloseAccountingCloseCycleDto) {
    return this.accountingCloseService.closeCycle(organizationId, user.id, cycleId, dto.expectedVersion, idempotencyKey);
  }

  @Post("cycles/:id/lock")
  @RequirePermissions(PERMISSIONS.accountingClose.lock)
  lockCycle(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") cycleId: string, @Headers("idempotency-key") idempotencyKey: string | undefined, @Body() dto: LockAccountingCloseCycleDto) {
    return this.accountingCloseService.lockCycle(organizationId, user.id, cycleId, dto.expectedVersion, idempotencyKey);
  }

  @Post("cycles/:id/tasks/:taskId/complete")
  @RequirePermissions(PERMISSIONS.accountingClose.manage)
  completeTask(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") cycleId: string,
    @Param("taskId") taskId: string,
    @Body() dto: CompleteAccountingCloseTaskDto,
  ) {
    return this.accountingCloseService.completeTask(organizationId, user.id, cycleId, taskId, dto.expectedVersion, dto.completionNote);
  }

  @Post("cycles/:id/tasks/:taskId/reopen")
  @RequirePermissions(PERMISSIONS.accountingClose.manage)
  reopenTask(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") cycleId: string,
    @Param("taskId") taskId: string,
    @Body() dto: ReopenAccountingCloseTaskDto,
  ) {
    return this.accountingCloseService.reopenTask(organizationId, user.id, cycleId, taskId, dto.expectedVersion, dto.reopenReason);
  }

  @Post("cycles/:id/refresh")
  @RequirePermissions(PERMISSIONS.accountingClose.manage)
  refreshCycle(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") cycleId: string,
    @Body() dto: RefreshAccountingCloseCycleDto,
  ) {
    return this.accountingCloseService.refreshCycle(organizationId, user.id, cycleId, dto.expectedVersion);
  }
}
