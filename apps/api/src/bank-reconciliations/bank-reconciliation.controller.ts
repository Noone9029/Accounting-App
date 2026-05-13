import { Controller, ForbiddenException, Get, Param, Post, Req, Res, StreamableFile, UseGuards } from "@nestjs/common";
import { hasAnyPermission, PERMISSIONS } from "@ledgerbyte/shared";
import type { Response } from "express";
import { AuthenticatedRequest, AuthenticatedUser } from "../auth/auth.types";
import { CurrentOrganizationId } from "../auth/decorators/current-organization.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { RequirePermissions } from "../auth/decorators/require-permissions.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "../auth/guards/organization-context.guard";
import { PermissionGuard } from "../auth/guards/permission.guard";
import { BankReconciliationService } from "./bank-reconciliation.service";

@Controller("bank-reconciliations")
@UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionGuard)
export class BankReconciliationController {
  constructor(private readonly bankReconciliationService: BankReconciliationService) {}

  @Get(":id")
  @RequirePermissions(PERMISSIONS.bankReconciliations.view)
  get(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.bankReconciliationService.get(organizationId, id);
  }

  @Post(":id/close")
  @RequirePermissions(PERMISSIONS.bankReconciliations.close)
  close(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.bankReconciliationService.close(organizationId, user.id, id);
  }

  @Post(":id/void")
  @RequirePermissions(PERMISSIONS.bankReconciliations.void)
  void(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.bankReconciliationService.void(organizationId, user.id, id);
  }

  @Get(":id/items")
  @RequirePermissions(PERMISSIONS.bankReconciliations.view)
  items(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.bankReconciliationService.items(organizationId, id);
  }

  @Get(":id/report-data")
  @RequirePermissions(PERMISSIONS.bankReconciliations.view)
  reportData(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.bankReconciliationService.reportData(organizationId, id);
  }

  @Get(":id/report.csv")
  @RequirePermissions(PERMISSIONS.bankReconciliations.view)
  async reportCsv(
    @CurrentOrganizationId() organizationId: string,
    @Param("id") id: string,
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    assertReconciliationExportPermission(request);
    const file = await this.bankReconciliationService.reportCsvFile(organizationId, id);
    const buffer = Buffer.from(file.content, "utf8");
    response.set({
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${file.filename}"`,
      "Content-Length": String(buffer.byteLength),
    });
    return new StreamableFile(buffer);
  }

  @Get(":id/report.pdf")
  @RequirePermissions(PERMISSIONS.bankReconciliations.view)
  async reportPdf(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    assertReconciliationExportPermission(request);
    const { buffer, filename } = await this.bankReconciliationService.reportPdf(organizationId, user.id, id);
    response.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(buffer.byteLength),
    });
    return new StreamableFile(buffer);
  }
}

function assertReconciliationExportPermission(request: AuthenticatedRequest): void {
  if (
    hasAnyPermission(request.membership?.role.permissions, [
      PERMISSIONS.reports.export,
      PERMISSIONS.generatedDocuments.download,
    ])
  ) {
    return;
  }
  throw new ForbiddenException("You do not have permission to export bank reconciliation reports.");
}
