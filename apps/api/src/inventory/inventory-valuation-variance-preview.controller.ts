import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import { PERMISSIONS } from "@ledgerbyte/shared";
import { CurrentOrganizationId } from "../auth/decorators/current-organization.decorator";
import { RequirePermissions } from "../auth/decorators/require-permissions.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "../auth/guards/organization-context.guard";
import { PermissionGuard } from "../auth/guards/permission.guard";
import { InventoryValuationVariancePreviewService } from "./inventory-valuation-variance-preview.service";

@Controller("inventory/valuation-variances")
@UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionGuard)
export class InventoryValuationVariancePreviewController {
  constructor(private readonly valuationVariancePreviewService: InventoryValuationVariancePreviewService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.inventory.view)
  list(@CurrentOrganizationId() organizationId: string, @Query() query: Record<string, string | string[] | undefined>) {
    return this.valuationVariancePreviewService.list(organizationId, query);
  }

  @Get("summary")
  @RequirePermissions(PERMISSIONS.inventory.view)
  summary(@CurrentOrganizationId() organizationId: string, @Query() query: Record<string, string | string[] | undefined>) {
    return this.valuationVariancePreviewService.summary(organizationId, query);
  }

  @Get("purchase-receipts/:id")
  @RequirePermissions(PERMISSIONS.inventory.view)
  purchaseReceipt(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.valuationVariancePreviewService.forPurchaseReceipt(organizationId, id);
  }

  @Get("purchase-bills/:id")
  @RequirePermissions(PERMISSIONS.inventory.view)
  purchaseBill(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.valuationVariancePreviewService.forPurchaseBill(organizationId, id);
  }

  @Get("matching-reviews/:id")
  @RequirePermissions(PERMISSIONS.inventory.view)
  matchingReview(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.valuationVariancePreviewService.forMatchingReview(organizationId, id);
  }
}
