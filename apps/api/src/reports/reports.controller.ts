import { Controller, ForbiddenException, Get, Query, Req, Res, StreamableFile, UseGuards } from "@nestjs/common";
import { hasAnyPermission, PERMISSIONS } from "@ledgerbyte/shared";
import type { Response } from "express";
import type { AuthenticatedRequest, AuthenticatedUser } from "../auth/auth.types";
import { CurrentOrganizationId } from "../auth/decorators/current-organization.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { RequirePermissions } from "../auth/decorators/require-permissions.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "../auth/guards/organization-context.guard";
import { PermissionGuard } from "../auth/guards/permission.guard";
import type { CoreReportKind } from "./report-csv";
import { ReportDateQuery, ReportsService } from "./reports.service";

@Controller("reports")
@UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionGuard)
@RequirePermissions(PERMISSIONS.reports.view)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get("general-ledger")
  generalLedger(
    @CurrentOrganizationId() organizationId: string,
    @Query() query: ReportDateQuery,
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.reportResponse(organizationId, "general-ledger", query, request, response);
  }

  @Get("general-ledger/pdf")
  generalLedgerPdf(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ReportDateQuery,
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.pdfResponse(organizationId, user.id, "general-ledger", query, request, response);
  }

  @Get("trial-balance")
  trialBalance(
    @CurrentOrganizationId() organizationId: string,
    @Query() query: ReportDateQuery,
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.reportResponse(organizationId, "trial-balance", query, request, response);
  }

  @Get("trial-balance/pdf")
  trialBalancePdf(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ReportDateQuery,
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.pdfResponse(organizationId, user.id, "trial-balance", query, request, response);
  }

  @Get("profit-and-loss")
  profitAndLoss(
    @CurrentOrganizationId() organizationId: string,
    @Query() query: ReportDateQuery,
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.reportResponse(organizationId, "profit-and-loss", query, request, response);
  }

  @Get("profit-and-loss/pdf")
  profitAndLossPdf(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ReportDateQuery,
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.pdfResponse(organizationId, user.id, "profit-and-loss", query, request, response);
  }

  @Get("balance-sheet")
  balanceSheet(
    @CurrentOrganizationId() organizationId: string,
    @Query() query: ReportDateQuery,
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.reportResponse(organizationId, "balance-sheet", query, request, response);
  }

  @Get("balance-sheet/pdf")
  balanceSheetPdf(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ReportDateQuery,
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.pdfResponse(organizationId, user.id, "balance-sheet", query, request, response);
  }

  @Get("vat-summary")
  vatSummary(
    @CurrentOrganizationId() organizationId: string,
    @Query() query: ReportDateQuery,
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.reportResponse(organizationId, "vat-summary", query, request, response);
  }

  @Get("vat-summary/pdf")
  vatSummaryPdf(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ReportDateQuery,
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.pdfResponse(organizationId, user.id, "vat-summary", query, request, response);
  }

  @Get("aged-receivables")
  agedReceivables(
    @CurrentOrganizationId() organizationId: string,
    @Query() query: ReportDateQuery,
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.reportResponse(organizationId, "aged-receivables", query, request, response);
  }

  @Get("aged-receivables/pdf")
  agedReceivablesPdf(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ReportDateQuery,
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.pdfResponse(organizationId, user.id, "aged-receivables", query, request, response);
  }

  @Get("aged-payables")
  agedPayables(
    @CurrentOrganizationId() organizationId: string,
    @Query() query: ReportDateQuery,
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.reportResponse(organizationId, "aged-payables", query, request, response);
  }

  @Get("aged-payables/pdf")
  agedPayablesPdf(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ReportDateQuery,
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.pdfResponse(organizationId, user.id, "aged-payables", query, request, response);
  }

  private async reportResponse(
    organizationId: string,
    kind: CoreReportKind,
    query: ReportDateQuery,
    request: AuthenticatedRequest,
    response: Response,
  ) {
    if (query.format === "csv") {
      assertExportPermission(request);
      const file = await this.reportsService.coreReportCsvFile(organizationId, kind, query);
      return csvResponse(response, file.filename, file.content);
    }
    return this.reportsService.coreReport(organizationId, kind, query);
  }

  private async pdfResponse(
    organizationId: string,
    actorUserId: string,
    kind: CoreReportKind,
    query: ReportDateQuery,
    request: AuthenticatedRequest,
    response: Response,
  ) {
    assertExportPermission(request);
    const { buffer, filename } = await this.reportsService.coreReportPdf(organizationId, actorUserId, kind, query);
    response.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(buffer.byteLength),
    });
    return new StreamableFile(buffer);
  }
}

function csvResponse(response: Response, filename: string, content: string) {
  const buffer = Buffer.from(content, "utf8");
  response.set({
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": `attachment; filename="${filename}"`,
    "Content-Length": String(buffer.byteLength),
  });
  return new StreamableFile(buffer);
}

function assertExportPermission(request: AuthenticatedRequest): void {
  if (
    hasAnyPermission(request.membership?.role.permissions, [
      PERMISSIONS.reports.export,
      PERMISSIONS.generatedDocuments.download,
    ])
  ) {
    return;
  }
  throw new ForbiddenException("You do not have permission to export reports.");
}
