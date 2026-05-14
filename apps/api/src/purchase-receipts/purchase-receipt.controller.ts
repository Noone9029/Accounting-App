import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { PERMISSIONS } from "@ledgerbyte/shared";
import { AuthenticatedUser } from "../auth/auth.types";
import { CurrentOrganizationId } from "../auth/decorators/current-organization.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { RequirePermissions } from "../auth/decorators/require-permissions.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "../auth/guards/organization-context.guard";
import { PermissionGuard } from "../auth/guards/permission.guard";
import { CreatePurchaseReceiptDto } from "./dto/create-purchase-receipt.dto";
import { ReversePurchaseReceiptAssetDto } from "./dto/reverse-purchase-receipt-asset.dto";
import { PurchaseReceiptService } from "./purchase-receipt.service";

@Controller("purchase-receipts")
@UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionGuard)
export class PurchaseReceiptController {
  constructor(private readonly purchaseReceiptService: PurchaseReceiptService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.purchaseReceiving.view)
  list(@CurrentOrganizationId() organizationId: string) {
    return this.purchaseReceiptService.list(organizationId);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.purchaseReceiving.create)
  create(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreatePurchaseReceiptDto,
  ) {
    return this.purchaseReceiptService.create(organizationId, user.id, dto);
  }

  @Get(":id")
  @RequirePermissions(PERMISSIONS.purchaseReceiving.view)
  get(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.purchaseReceiptService.get(organizationId, id);
  }

  @Get(":id/accounting-preview")
  @RequirePermissions(PERMISSIONS.inventory.view)
  accountingPreview(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.purchaseReceiptService.accountingPreview(organizationId, id);
  }

  @Post(":id/post-inventory-asset")
  @RequirePermissions(PERMISSIONS.inventory.receiptsPostAsset)
  postInventoryAsset(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.purchaseReceiptService.postInventoryAsset(organizationId, user.id, id);
  }

  @Post(":id/reverse-inventory-asset")
  @RequirePermissions(PERMISSIONS.inventory.receiptsReverseAsset)
  reverseInventoryAsset(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: ReversePurchaseReceiptAssetDto,
  ) {
    return this.purchaseReceiptService.reverseInventoryAsset(organizationId, user.id, id, dto);
  }

  @Post(":id/void")
  @RequirePermissions(PERMISSIONS.purchaseReceiving.create)
  void(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.purchaseReceiptService.void(organizationId, user.id, id);
  }
}
