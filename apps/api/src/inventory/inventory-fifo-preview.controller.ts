import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import { PERMISSIONS } from "@ledgerbyte/shared";
import { CurrentOrganizationId } from "../auth/decorators/current-organization.decorator";
import { RequirePermissions } from "../auth/decorators/require-permissions.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "../auth/guards/organization-context.guard";
import { PermissionGuard } from "../auth/guards/permission.guard";
import { InventoryFifoPreviewQueryDto } from "./dto/inventory-fifo-preview-query.dto";
import { InventoryFifoPreviewService } from "./inventory-fifo-preview.service";

@Controller("inventory/fifo-preview")
@UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionGuard)
export class InventoryFifoPreviewController {
  constructor(private readonly fifoPreviewService: InventoryFifoPreviewService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.inventory.view)
  list(@CurrentOrganizationId() organizationId: string, @Query() query: InventoryFifoPreviewQueryDto) {
    return this.fifoPreviewService.preview(organizationId, query);
  }

  @Get("items/:itemId")
  @RequirePermissions(PERMISSIONS.inventory.view)
  item(@CurrentOrganizationId() organizationId: string, @Param("itemId") itemId: string, @Query() query: InventoryFifoPreviewQueryDto) {
    return this.fifoPreviewService.preview(organizationId, { ...query, itemId });
  }

  @Get("warehouses/:warehouseId")
  @RequirePermissions(PERMISSIONS.inventory.view)
  warehouse(
    @CurrentOrganizationId() organizationId: string,
    @Param("warehouseId") warehouseId: string,
    @Query() query: InventoryFifoPreviewQueryDto,
  ) {
    return this.fifoPreviewService.preview(organizationId, { ...query, warehouseId });
  }

  @Get("items/:itemId/warehouses/:warehouseId")
  @RequirePermissions(PERMISSIONS.inventory.view)
  itemWarehouse(
    @CurrentOrganizationId() organizationId: string,
    @Param("itemId") itemId: string,
    @Param("warehouseId") warehouseId: string,
    @Query() query: InventoryFifoPreviewQueryDto,
  ) {
    return this.fifoPreviewService.preview(organizationId, { ...query, itemId, warehouseId });
  }
}
