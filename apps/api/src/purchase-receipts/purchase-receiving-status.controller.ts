import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { PERMISSIONS } from "@ledgerbyte/shared";
import { CurrentOrganizationId } from "../auth/decorators/current-organization.decorator";
import { RequirePermissions } from "../auth/decorators/require-permissions.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "../auth/guards/organization-context.guard";
import { PermissionGuard } from "../auth/guards/permission.guard";
import { PurchaseReceiptService } from "./purchase-receipt.service";

@Controller()
@UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionGuard)
export class PurchaseReceivingStatusController {
  constructor(private readonly purchaseReceiptService: PurchaseReceiptService) {}

  @Get("purchase-orders/:id/receiving-status")
  @RequirePermissions(PERMISSIONS.purchaseReceiving.view)
  purchaseOrderReceivingStatus(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.purchaseReceiptService.purchaseOrderReceivingStatus(organizationId, id);
  }

  @Get("purchase-orders/:id/receipt-matching-status")
  @RequirePermissions(PERMISSIONS.purchaseOrders.view)
  purchaseOrderReceiptMatchingStatus(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.purchaseReceiptService.purchaseOrderReceiptMatchingStatus(organizationId, id);
  }

  @Get("purchase-bills/:id/receiving-status")
  @RequirePermissions(PERMISSIONS.purchaseReceiving.view)
  purchaseBillReceivingStatus(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.purchaseReceiptService.purchaseBillReceivingStatus(organizationId, id);
  }

  @Get("purchase-bills/:id/receipt-matching-status")
  @RequirePermissions(PERMISSIONS.purchaseBills.view)
  purchaseBillReceiptMatchingStatus(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.purchaseReceiptService.purchaseBillReceiptMatchingStatus(organizationId, id);
  }
}
