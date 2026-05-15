import { Body, Controller, Get, Param, Patch, Post, Query, Res, UseGuards } from "@nestjs/common";
import { PERMISSIONS } from "@ledgerbyte/shared";
import type { Response } from "express";
import { CurrentOrganizationId } from "../auth/decorators/current-organization.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { RequirePermissions } from "../auth/decorators/require-permissions.decorator";
import type { AuthenticatedUser } from "../auth/auth.types";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "../auth/guards/organization-context.guard";
import { PermissionGuard } from "../auth/guards/permission.guard";
import { AuditLogService, type AuditLogRetentionSettingsPatch } from "./audit-log.service";

@Controller("audit-logs")
@UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionGuard)
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.auditLogs.view)
  list(@CurrentOrganizationId() organizationId: string, @Query() query: Record<string, string>) {
    return this.auditLogService.list(organizationId, query);
  }

  @Get("export.csv")
  @RequirePermissions(PERMISSIONS.auditLogs.export)
  async exportCsv(@CurrentOrganizationId() organizationId: string, @Query() query: Record<string, string>, @Res({ passthrough: true }) response: Response) {
    const exportResult = await this.auditLogService.exportCsv(organizationId, query);
    response.setHeader("content-type", "text/csv; charset=utf-8");
    response.setHeader("content-disposition", `attachment; filename="${exportResult.filename}"`);
    return exportResult.csv;
  }

  @Get("retention-settings")
  @RequirePermissions(PERMISSIONS.auditLogs.view)
  getRetentionSettings(@CurrentOrganizationId() organizationId: string) {
    return this.auditLogService.getRetentionSettings(organizationId);
  }

  @Patch("retention-settings")
  @RequirePermissions(PERMISSIONS.auditLogs.manageRetention)
  updateRetentionSettings(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: AuditLogRetentionSettingsPatch,
  ) {
    return this.auditLogService.updateRetentionSettings(organizationId, user.id, body);
  }

  @Get("retention-preview")
  @RequirePermissions(PERMISSIONS.auditLogs.manageRetention)
  retentionPreview(@CurrentOrganizationId() organizationId: string) {
    return this.auditLogService.retentionPreview(organizationId);
  }

  @Post("retention-dry-run")
  @RequirePermissions(PERMISSIONS.auditLogs.manageRetention)
  retentionDryRun(@CurrentOrganizationId() organizationId: string) {
    return this.auditLogService.retentionPreview(organizationId);
  }

  @Get(":id")
  @RequirePermissions(PERMISSIONS.auditLogs.view)
  get(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.auditLogService.get(organizationId, id);
  }
}
