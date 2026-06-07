import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { PERMISSIONS } from "@ledgerbyte/shared";
import type { AuthenticatedUser } from "../auth/auth.types";
import { CurrentOrganizationId } from "../auth/decorators/current-organization.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { RequirePermissions } from "../auth/decorators/require-permissions.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "../auth/guards/organization-context.guard";
import { PermissionGuard } from "../auth/guards/permission.guard";
import { CreatePurchaseReturnDto } from "./dto/create-purchase-return.dto";
import { UpdatePurchaseReturnDto } from "./dto/update-purchase-return.dto";
import { PurchaseReturnService } from "./purchase-return.service";

const VIEW_RETURN_PERMISSIONS = [PERMISSIONS.purchaseBills.view, PERMISSIONS.purchaseOrders.view, PERMISSIONS.purchaseReceiving.view];
const MANAGE_RETURN_PERMISSIONS = [PERMISSIONS.purchaseBills.create, PERMISSIONS.purchaseBills.update, PERMISSIONS.purchaseReceiving.create];

@Controller("purchase-returns")
@UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionGuard)
export class PurchaseReturnController {
  constructor(private readonly purchaseReturnService: PurchaseReturnService) {}

  @Get()
  @RequirePermissions(...VIEW_RETURN_PERMISSIONS)
  list(@CurrentOrganizationId() organizationId: string, @Query() query: Record<string, string | string[] | undefined>) {
    return this.purchaseReturnService.list(organizationId, query);
  }

  @Get("next-number")
  @RequirePermissions(...MANAGE_RETURN_PERMISSIONS)
  nextNumber(@CurrentOrganizationId() organizationId: string) {
    return this.purchaseReturnService.nextNumber(organizationId);
  }

  @Post()
  @RequirePermissions(...MANAGE_RETURN_PERMISSIONS)
  create(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreatePurchaseReturnDto,
  ) {
    return this.purchaseReturnService.create(organizationId, user.id, dto);
  }

  @Get(":id")
  @RequirePermissions(...VIEW_RETURN_PERMISSIONS)
  get(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.purchaseReturnService.get(organizationId, id);
  }

  @Get(":id/inventory-return-preview")
  @RequirePermissions(PERMISSIONS.inventory.view)
  inventoryReturnPreview(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.purchaseReturnService.inventoryReturnPreview(organizationId, id);
  }

  @Patch(":id")
  @RequirePermissions(...MANAGE_RETURN_PERMISSIONS)
  update(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: UpdatePurchaseReturnDto,
  ) {
    return this.purchaseReturnService.update(organizationId, user.id, id, dto);
  }

  @Post(":id/submit")
  @RequirePermissions(...MANAGE_RETURN_PERMISSIONS)
  submit(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.purchaseReturnService.submit(organizationId, user.id, id);
  }

  @Post(":id/approve")
  @RequirePermissions(...MANAGE_RETURN_PERMISSIONS)
  approve(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.purchaseReturnService.approve(organizationId, user.id, id);
  }

  @Post(":id/complete")
  @RequirePermissions(...MANAGE_RETURN_PERMISSIONS)
  complete(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.purchaseReturnService.complete(organizationId, user.id, id);
  }

  @Post(":id/cancel")
  @RequirePermissions(...MANAGE_RETURN_PERMISSIONS)
  cancel(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.purchaseReturnService.cancel(organizationId, user.id, id);
  }

  @Post(":id/void")
  @RequirePermissions(...MANAGE_RETURN_PERMISSIONS)
  void(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.purchaseReturnService.void(organizationId, user.id, id);
  }

  @Post(":id/post-inventory-return")
  @RequirePermissions(PERMISSIONS.stockMovements.create)
  postInventoryReturnMovement(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.purchaseReturnService.postInventoryReturnMovement(organizationId, user.id, id);
  }
}
