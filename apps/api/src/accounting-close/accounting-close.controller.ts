import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
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
}
