import { BadRequestException, Body, Controller, ForbiddenException, Get, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import { PERMISSIONS, hasPermission } from "@ledgerbyte/shared";
import type { AuthenticatedRequest } from "../auth/auth.types";
import { CurrentOrganizationId } from "../auth/decorators/current-organization.decorator";
import { RequirePermissions } from "../auth/decorators/require-permissions.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "../auth/guards/organization-context.guard";
import { PermissionGuard } from "../auth/guards/permission.guard";
import { LANDED_COST_ALLOCATION_METHODS, type LandedCostAllocationMethod, type LandedCostPreviewDto, type LandedCostSourceType } from "./dto/landed-cost-preview.dto";
import { InventoryLandedCostPreviewService } from "./inventory-landed-cost-preview.service";

@Controller("inventory/landed-cost")
@UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionGuard)
export class InventoryLandedCostPreviewController {
  constructor(private readonly landedCostPreviewService: InventoryLandedCostPreviewService) {}

  @Get("preview")
  @RequirePermissions(PERMISSIONS.inventory.view)
  previewFromQuery(
    @CurrentOrganizationId() organizationId: string,
    @Query("sourceType") sourceType: LandedCostSourceType,
    @Query("sourceId") sourceId: string,
    @Query("allocationMethod") allocationMethod: LandedCostAllocationMethod | undefined,
    @Req() request: AuthenticatedRequest,
  ) {
    this.assertSupportedSourceType(sourceType);
    if (!sourceId) {
      throw new BadRequestException("A landed cost sourceId is required.");
    }
    this.assertSourcePermission(request, sourceType);
    return this.landedCostPreviewService.preview(organizationId, {
      sourceType,
      sourceId,
      allocationMethod: this.safeAllocationMethod(allocationMethod),
      costLines: [],
      manualAllocations: [],
    });
  }

  @Post("preview")
  @RequirePermissions(PERMISSIONS.inventory.view)
  preview(@CurrentOrganizationId() organizationId: string, @Body() dto: LandedCostPreviewDto, @Req() request: AuthenticatedRequest) {
    this.assertSourcePermission(request, dto.sourceType);
    return this.landedCostPreviewService.preview(organizationId, dto);
  }

  @Get("purchase-receipts/:id/preview")
  @RequirePermissions(PERMISSIONS.inventory.view)
  purchaseReceiptPreview(
    @CurrentOrganizationId() organizationId: string,
    @Param("id") id: string,
    @Query("allocationMethod") allocationMethod: LandedCostAllocationMethod | undefined,
    @Req() request: AuthenticatedRequest,
  ) {
    this.assertSourcePermission(request, "PURCHASE_RECEIPT");
    return this.landedCostPreviewService.preview(organizationId, {
      sourceType: "PURCHASE_RECEIPT",
      sourceId: id,
      allocationMethod: this.safeAllocationMethod(allocationMethod),
      costLines: [],
      manualAllocations: [],
    });
  }

  @Get("purchase-bills/:id/preview")
  @RequirePermissions(PERMISSIONS.inventory.view)
  purchaseBillPreview(
    @CurrentOrganizationId() organizationId: string,
    @Param("id") id: string,
    @Query("allocationMethod") allocationMethod: LandedCostAllocationMethod | undefined,
    @Req() request: AuthenticatedRequest,
  ) {
    this.assertSourcePermission(request, "PURCHASE_BILL");
    return this.landedCostPreviewService.preview(organizationId, {
      sourceType: "PURCHASE_BILL",
      sourceId: id,
      allocationMethod: this.safeAllocationMethod(allocationMethod),
      costLines: [],
      manualAllocations: [],
    });
  }

  private assertSourcePermission(request: AuthenticatedRequest, sourceType: LandedCostSourceType): void {
    const permissions = request.membership?.role.permissions;
    const requiredPermission = sourceType === "PURCHASE_RECEIPT"
      ? PERMISSIONS.purchaseReceiving.view
      : sourceType === "PURCHASE_BILL"
        ? PERMISSIONS.purchaseBills.view
        : PERMISSIONS.purchaseOrders.view;
    if (!hasPermission(permissions, requiredPermission)) {
      throw new ForbiddenException("You do not have permission to preview landed cost for this source document.");
    }
  }

  private assertSupportedSourceType(sourceType: LandedCostSourceType | undefined): asserts sourceType is LandedCostSourceType {
    if (sourceType !== "PURCHASE_RECEIPT" && sourceType !== "PURCHASE_BILL" && sourceType !== "PURCHASE_ORDER") {
      throw new BadRequestException("A valid landed cost sourceType is required.");
    }
  }

  private safeAllocationMethod(value: LandedCostAllocationMethod | undefined): LandedCostAllocationMethod {
    return value && LANDED_COST_ALLOCATION_METHODS.includes(value) ? value : "BY_VALUE";
  }
}
