import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { PERMISSIONS } from "@ledgerbyte/shared";
import { AuthenticatedUser } from "../auth/auth.types";
import { CurrentOrganizationId } from "../auth/decorators/current-organization.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { RequirePermissions } from "../auth/decorators/require-permissions.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "../auth/guards/organization-context.guard";
import { PermissionGuard } from "../auth/guards/permission.guard";
import { CreateWarehouseTransferDto } from "./dto/create-warehouse-transfer.dto";
import { WarehouseTransferService } from "./warehouse-transfer.service";

@Controller("warehouse-transfers")
@UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionGuard)
export class WarehouseTransferController {
  constructor(private readonly warehouseTransferService: WarehouseTransferService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.warehouseTransfers.view)
  list(@CurrentOrganizationId() organizationId: string) {
    return this.warehouseTransferService.list(organizationId);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.warehouseTransfers.create)
  create(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateWarehouseTransferDto,
  ) {
    return this.warehouseTransferService.create(organizationId, user.id, dto);
  }

  @Get(":id")
  @RequirePermissions(PERMISSIONS.warehouseTransfers.view)
  get(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.warehouseTransferService.get(organizationId, id);
  }

  @Post(":id/void")
  @RequirePermissions(PERMISSIONS.warehouseTransfers.void)
  void(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.warehouseTransferService.void(organizationId, user.id, id);
  }
}
