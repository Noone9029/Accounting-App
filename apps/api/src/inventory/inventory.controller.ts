import { Body, Controller, Get, Patch, Query, Res, StreamableFile, UseGuards } from "@nestjs/common";
import { PERMISSIONS } from "@ledgerbyte/shared";
import type { Response } from "express";
import { CurrentOrganizationId } from "../auth/decorators/current-organization.decorator";
import { RequirePermissions } from "../auth/decorators/require-permissions.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "../auth/guards/organization-context.guard";
import { PermissionGuard } from "../auth/guards/permission.guard";
import { InventoryBalanceQueryDto } from "./dto/inventory-balance-query.dto";
import { InventoryReportQueryDto } from "./dto/inventory-report-query.dto";
import { UpdateInventoryAccountingSettingsDto } from "./dto/update-inventory-accounting-settings.dto";
import { UpdateInventorySettingsDto } from "./dto/update-inventory-settings.dto";
import { InventoryAccountingService } from "./inventory-accounting.service";
import { InventoryService } from "./inventory.service";

@Controller("inventory")
@UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionGuard)
export class InventoryController {
  constructor(
    private readonly inventoryService: InventoryService,
    private readonly inventoryAccountingService: InventoryAccountingService,
  ) {}

  @Get("settings")
  @RequirePermissions(PERMISSIONS.inventory.view)
  settings(@CurrentOrganizationId() organizationId: string) {
    return this.inventoryService.settings(organizationId);
  }

  @Patch("settings")
  @RequirePermissions(PERMISSIONS.inventory.manage)
  updateSettings(@CurrentOrganizationId() organizationId: string, @Body() dto: UpdateInventorySettingsDto) {
    return this.inventoryService.updateSettings(organizationId, dto);
  }

  @Get("accounting-settings")
  @RequirePermissions(PERMISSIONS.inventory.view)
  accountingSettings(@CurrentOrganizationId() organizationId: string) {
    return this.inventoryAccountingService.settings(organizationId);
  }

  @Patch("accounting-settings")
  @RequirePermissions(PERMISSIONS.inventory.manage)
  updateAccountingSettings(@CurrentOrganizationId() organizationId: string, @Body() dto: UpdateInventoryAccountingSettingsDto) {
    return this.inventoryAccountingService.updateSettings(organizationId, dto);
  }

  @Get("balances")
  @RequirePermissions(PERMISSIONS.inventory.view)
  balances(@CurrentOrganizationId() organizationId: string, @Query() query: InventoryBalanceQueryDto) {
    return this.inventoryService.balances(organizationId, query);
  }

  @Get("reports/stock-valuation")
  @RequirePermissions(PERMISSIONS.inventory.view)
  async stockValuationReport(
    @CurrentOrganizationId() organizationId: string,
    @Query() query: InventoryReportQueryDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    if (query.format === "csv") {
      const file = await this.inventoryService.stockValuationCsvFile(organizationId, query);
      return csvResponse(response, file.filename, file.content);
    }
    return this.inventoryService.stockValuationReport(organizationId, query);
  }

  @Get("reports/movement-summary")
  @RequirePermissions(PERMISSIONS.inventory.view)
  async movementSummaryReport(
    @CurrentOrganizationId() organizationId: string,
    @Query() query: InventoryReportQueryDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    if (query.format === "csv") {
      const file = await this.inventoryService.movementSummaryCsvFile(organizationId, query);
      return csvResponse(response, file.filename, file.content);
    }
    return this.inventoryService.movementSummaryReport(organizationId, query);
  }

  @Get("reports/low-stock")
  @RequirePermissions(PERMISSIONS.inventory.view)
  async lowStockReport(
    @CurrentOrganizationId() organizationId: string,
    @Query() query: InventoryReportQueryDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    if (query.format === "csv") {
      const file = await this.inventoryService.lowStockCsvFile(organizationId);
      return csvResponse(response, file.filename, file.content);
    }
    return this.inventoryService.lowStockReport(organizationId);
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
