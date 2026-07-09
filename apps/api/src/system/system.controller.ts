import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { PERMISSIONS } from "@ledgerbyte/shared";
import { CurrentOrganizationId } from "../auth/decorators/current-organization.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { RequirePermissions } from "../auth/decorators/require-permissions.decorator";
import type { AuthenticatedUser } from "../auth/auth.types";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "../auth/guards/organization-context.guard";
import { PermissionGuard } from "../auth/guards/permission.guard";
import { BackupReadinessService } from "./backup-readiness.service";
import { ConfigReadinessService } from "./config-readiness.service";
import { CreateBackupRestoreEvidenceDto } from "./dto/create-backup-restore-evidence.dto";
import { RevokeBackupRestoreEvidenceDto } from "./dto/revoke-backup-restore-evidence.dto";
import { VerifyBackupRestoreEvidenceDto } from "./dto/verify-backup-restore-evidence.dto";

@Controller("system")
@UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionGuard)
export class SystemController {
  constructor(
    private readonly backupReadinessService: BackupReadinessService,
    private readonly configReadinessService: ConfigReadinessService,
  ) {}

  @Get("config-readiness")
  @RequirePermissions(PERMISSIONS.auditLogs.manageRetention)
  configReadiness() {
    return this.configReadinessService.read();
  }

  @Get("backup-readiness")
  @RequirePermissions(PERMISSIONS.auditLogs.manageRetention)
  backupReadiness(@CurrentOrganizationId() organizationId: string) {
    return this.backupReadinessService.backupReadiness(organizationId);
  }

  @Get("restore-drill-plan")
  @RequirePermissions(PERMISSIONS.auditLogs.manageRetention)
  restoreDrillPlan(@CurrentOrganizationId() organizationId: string) {
    return this.backupReadinessService.restoreDrillPlan(organizationId);
  }

  @Get("backup-evidence")
  @RequirePermissions(PERMISSIONS.auditLogs.manageRetention)
  listBackupEvidence(@CurrentOrganizationId() organizationId: string) {
    return this.backupReadinessService.listBackupEvidence(organizationId);
  }

  @Post("backup-evidence")
  @RequirePermissions(PERMISSIONS.auditLogs.manageRetention)
  createBackupEvidence(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateBackupRestoreEvidenceDto,
  ) {
    return this.backupReadinessService.createBackupEvidence(organizationId, user.id, dto);
  }

  @Post("backup-evidence/:id/verify")
  @RequirePermissions(PERMISSIONS.auditLogs.manageRetention)
  verifyBackupEvidence(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: VerifyBackupRestoreEvidenceDto,
  ) {
    return this.backupReadinessService.verifyBackupEvidence(organizationId, user.id, id, dto);
  }

  @Post("backup-evidence/:id/revoke")
  @RequirePermissions(PERMISSIONS.auditLogs.manageRetention)
  revokeBackupEvidence(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: RevokeBackupRestoreEvidenceDto,
  ) {
    return this.backupReadinessService.revokeBackupEvidence(organizationId, user.id, id, dto);
  }
}
