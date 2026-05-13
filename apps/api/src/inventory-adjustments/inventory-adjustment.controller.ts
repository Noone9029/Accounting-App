import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { PERMISSIONS } from "@ledgerbyte/shared";
import { AuthenticatedUser } from "../auth/auth.types";
import { CurrentOrganizationId } from "../auth/decorators/current-organization.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { RequirePermissions } from "../auth/decorators/require-permissions.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "../auth/guards/organization-context.guard";
import { PermissionGuard } from "../auth/guards/permission.guard";
import { CreateInventoryAdjustmentDto } from "./dto/create-inventory-adjustment.dto";
import { UpdateInventoryAdjustmentDto } from "./dto/update-inventory-adjustment.dto";
import { InventoryAdjustmentService } from "./inventory-adjustment.service";

@Controller("inventory-adjustments")
@UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionGuard)
export class InventoryAdjustmentController {
  constructor(private readonly inventoryAdjustmentService: InventoryAdjustmentService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.inventoryAdjustments.view)
  list(@CurrentOrganizationId() organizationId: string) {
    return this.inventoryAdjustmentService.list(organizationId);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.inventoryAdjustments.create)
  create(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateInventoryAdjustmentDto,
  ) {
    return this.inventoryAdjustmentService.create(organizationId, user.id, dto);
  }

  @Get(":id")
  @RequirePermissions(PERMISSIONS.inventoryAdjustments.view)
  get(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.inventoryAdjustmentService.get(organizationId, id);
  }

  @Patch(":id")
  @RequirePermissions(PERMISSIONS.inventoryAdjustments.create)
  update(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: UpdateInventoryAdjustmentDto,
  ) {
    return this.inventoryAdjustmentService.update(organizationId, user.id, id, dto);
  }

  @Delete(":id")
  @RequirePermissions(PERMISSIONS.inventoryAdjustments.create)
  remove(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.inventoryAdjustmentService.remove(organizationId, user.id, id);
  }

  @Post(":id/approve")
  @RequirePermissions(PERMISSIONS.inventoryAdjustments.approve)
  approve(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.inventoryAdjustmentService.approve(organizationId, user.id, id);
  }

  @Post(":id/void")
  @RequirePermissions(PERMISSIONS.inventoryAdjustments.void)
  void(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.inventoryAdjustmentService.void(organizationId, user.id, id);
  }
}
