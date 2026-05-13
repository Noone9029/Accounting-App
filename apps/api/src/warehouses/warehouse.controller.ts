import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { PERMISSIONS } from "@ledgerbyte/shared";
import { AuthenticatedUser } from "../auth/auth.types";
import { CurrentOrganizationId } from "../auth/decorators/current-organization.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { RequirePermissions } from "../auth/decorators/require-permissions.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "../auth/guards/organization-context.guard";
import { PermissionGuard } from "../auth/guards/permission.guard";
import { CreateWarehouseDto } from "./dto/create-warehouse.dto";
import { UpdateWarehouseDto } from "./dto/update-warehouse.dto";
import { WarehouseService } from "./warehouse.service";

@Controller("warehouses")
@UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionGuard)
export class WarehouseController {
  constructor(private readonly warehouseService: WarehouseService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.warehouses.view)
  list(@CurrentOrganizationId() organizationId: string) {
    return this.warehouseService.list(organizationId);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.warehouses.manage)
  create(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Body() dto: CreateWarehouseDto) {
    return this.warehouseService.create(organizationId, user.id, dto);
  }

  @Get(":id")
  @RequirePermissions(PERMISSIONS.warehouses.view)
  get(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.warehouseService.get(organizationId, id);
  }

  @Patch(":id")
  @RequirePermissions(PERMISSIONS.warehouses.manage)
  update(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: UpdateWarehouseDto,
  ) {
    return this.warehouseService.update(organizationId, user.id, id, dto);
  }

  @Post(":id/archive")
  @RequirePermissions(PERMISSIONS.warehouses.manage)
  archive(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.warehouseService.archive(organizationId, user.id, id);
  }

  @Post(":id/reactivate")
  @RequirePermissions(PERMISSIONS.warehouses.manage)
  reactivate(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.warehouseService.reactivate(organizationId, user.id, id);
  }
}
