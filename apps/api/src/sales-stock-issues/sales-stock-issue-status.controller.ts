import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { PERMISSIONS } from "@ledgerbyte/shared";
import { CurrentOrganizationId } from "../auth/decorators/current-organization.decorator";
import { RequirePermissions } from "../auth/decorators/require-permissions.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "../auth/guards/organization-context.guard";
import { PermissionGuard } from "../auth/guards/permission.guard";
import { SalesStockIssueService } from "./sales-stock-issue.service";

@Controller()
@UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionGuard)
export class SalesStockIssueStatusController {
  constructor(private readonly salesStockIssueService: SalesStockIssueService) {}

  @Get("sales-invoices/:id/stock-issue-status")
  @RequirePermissions(PERMISSIONS.salesStockIssue.view)
  salesInvoiceIssueStatus(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.salesStockIssueService.salesInvoiceIssueStatus(organizationId, id);
  }
}
