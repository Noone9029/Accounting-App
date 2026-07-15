import { Controller, Get, Query, Res, StreamableFile, UseGuards } from "@nestjs/common";
import type { Response } from "express";
import { PERMISSIONS } from "@ledgerbyte/shared";
import { CurrentOrganizationId } from "../auth/decorators/current-organization.decorator";
import { RequirePermissions } from "../auth/decorators/require-permissions.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "../auth/guards/organization-context.guard";
import { PermissionGuard } from "../auth/guards/permission.guard";
import { FixedAssetReportsService } from "./fixed-asset-reports.service";

@Controller("reports/fixed-assets")
@UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionGuard)
@RequirePermissions(PERMISSIONS.fixedAssets.reports)
export class FixedAssetReportsController {
  constructor(private readonly reports: FixedAssetReportsService) {}

  @Get("register") register(@CurrentOrganizationId() organizationId: string, @Query("categoryId") categoryId?: string) { return this.reports.register(organizationId, categoryId); }
  @Get("depreciation") depreciation(@CurrentOrganizationId() organizationId: string, @Query("from") from?: string, @Query("to") to?: string) { return this.reports.depreciation(organizationId, from, to); }
  @Get("disposals") disposals(@CurrentOrganizationId() organizationId: string) { return this.reports.disposals(organizationId); }
  @Get("reconciliation") reconciliation(@CurrentOrganizationId() organizationId: string) { return this.reports.reconciliation(organizationId); }
  @Get("register.csv") async registerCsv(@CurrentOrganizationId() organizationId: string, @Query("categoryId") categoryId: string | undefined, @Res({ passthrough: true }) response: Response) { return this.csv("fixed-asset-register.csv", await this.reports.register(organizationId, categoryId), response); }
  @Get("depreciation.csv") async depreciationCsv(@CurrentOrganizationId() organizationId: string, @Query("from") from: string | undefined, @Query("to") to: string | undefined, @Res({ passthrough: true }) response: Response) { return this.csv("fixed-asset-depreciation.csv", await this.reports.depreciation(organizationId, from, to), response); }
  @Get("disposals.csv") async disposalsCsv(@CurrentOrganizationId() organizationId: string, @Res({ passthrough: true }) response: Response) { return this.csv("fixed-asset-disposals.csv", await this.reports.disposals(organizationId), response); }
  @Get("reconciliation.csv") async reconciliationCsv(@CurrentOrganizationId() organizationId: string, @Res({ passthrough: true }) response: Response) { const report = await this.reports.reconciliation(organizationId); return this.csv("fixed-asset-reconciliation.csv", [{ ...report.register, ...report.generalLedger, ...report.differences, reconciled: report.reconciled }], response); }

  private csv(filename: string, rows: Array<Record<string, unknown>>, response: Response) { response.setHeader("content-type", "text/csv; charset=utf-8"); response.setHeader("content-disposition", `attachment; filename="${filename}"`); return new StreamableFile(Buffer.from(this.reports.toCsv(rows), "utf8")); }
}
