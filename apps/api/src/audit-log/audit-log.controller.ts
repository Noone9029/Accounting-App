import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import { PERMISSIONS } from "@ledgerbyte/shared";
import { CurrentOrganizationId } from "../auth/decorators/current-organization.decorator";
import { RequirePermissions } from "../auth/decorators/require-permissions.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "../auth/guards/organization-context.guard";
import { PermissionGuard } from "../auth/guards/permission.guard";
import { AuditLogService } from "./audit-log.service";

@Controller("audit-logs")
@UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionGuard)
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.auditLogs.view)
  list(@CurrentOrganizationId() organizationId: string, @Query() query: Record<string, string>) {
    return this.auditLogService.list(organizationId, query);
  }

  @Get(":id")
  @RequirePermissions(PERMISSIONS.auditLogs.view)
  get(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.auditLogService.get(organizationId, id);
  }
}
