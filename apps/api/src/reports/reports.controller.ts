import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { PERMISSIONS } from "@ledgerbyte/shared";
import { CurrentOrganizationId } from "../auth/decorators/current-organization.decorator";
import { RequirePermissions } from "../auth/decorators/require-permissions.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "../auth/guards/organization-context.guard";
import { PermissionGuard } from "../auth/guards/permission.guard";
import { ReportDateQuery, ReportsService } from "./reports.service";

@Controller("reports")
@UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionGuard)
@RequirePermissions(PERMISSIONS.reports.view)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get("general-ledger")
  generalLedger(@CurrentOrganizationId() organizationId: string, @Query() query: ReportDateQuery) {
    return this.reportsService.generalLedger(organizationId, query);
  }

  @Get("trial-balance")
  trialBalance(@CurrentOrganizationId() organizationId: string, @Query() query: ReportDateQuery) {
    return this.reportsService.trialBalance(organizationId, query);
  }

  @Get("profit-and-loss")
  profitAndLoss(@CurrentOrganizationId() organizationId: string, @Query() query: ReportDateQuery) {
    return this.reportsService.profitAndLoss(organizationId, query);
  }

  @Get("balance-sheet")
  balanceSheet(@CurrentOrganizationId() organizationId: string, @Query() query: ReportDateQuery) {
    return this.reportsService.balanceSheet(organizationId, query);
  }

  @Get("vat-summary")
  vatSummary(@CurrentOrganizationId() organizationId: string, @Query() query: ReportDateQuery) {
    return this.reportsService.vatSummary(organizationId, query);
  }

  @Get("aged-receivables")
  agedReceivables(@CurrentOrganizationId() organizationId: string, @Query() query: ReportDateQuery) {
    return this.reportsService.agedReceivables(organizationId, query);
  }

  @Get("aged-payables")
  agedPayables(@CurrentOrganizationId() organizationId: string, @Query() query: ReportDateQuery) {
    return this.reportsService.agedPayables(organizationId, query);
  }
}
