import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { PERMISSIONS } from "@ledgerbyte/shared";
import { AuthenticatedUser } from "../auth/auth.types";
import { CurrentOrganizationId } from "../auth/decorators/current-organization.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { RequirePermissions } from "../auth/decorators/require-permissions.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "../auth/guards/organization-context.guard";
import { PermissionGuard } from "../auth/guards/permission.guard";
import {
  CreateInventoryBatchDto,
  CreateInventoryBinLocationDto,
  CreateInventorySerialNumberDto,
  InventoryBatchQueryDto,
  InventoryBinLocationQueryDto,
  InventorySerialNumberQueryDto,
  UpdateInventoryBatchDto,
  UpdateInventoryBinLocationDto,
  UpdateInventorySerialNumberDto,
} from "./dto/inventory-traceability.dto";
import { InventoryTraceabilityService } from "./inventory-traceability.service";

@Controller("inventory")
@UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionGuard)
export class InventoryTraceabilityController {
  constructor(private readonly traceabilityService: InventoryTraceabilityService) {}

  @Get("traceability/items/:itemId")
  @RequirePermissions(PERMISSIONS.inventory.view)
  itemTraceability(@CurrentOrganizationId() organizationId: string, @Param("itemId") itemId: string) {
    return this.traceabilityService.itemTraceability(organizationId, itemId);
  }

  @Get("bin-locations")
  @RequirePermissions(PERMISSIONS.inventory.view)
  listBinLocations(@CurrentOrganizationId() organizationId: string, @Query() query: InventoryBinLocationQueryDto) {
    return this.traceabilityService.listBinLocations(organizationId, query);
  }

  @Post("bin-locations")
  @RequirePermissions(PERMISSIONS.inventory.manage)
  createBinLocation(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Body() dto: CreateInventoryBinLocationDto) {
    return this.traceabilityService.createBinLocation(organizationId, user.id, dto);
  }

  @Get("bin-locations/:id")
  @RequirePermissions(PERMISSIONS.inventory.view)
  getBinLocation(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.traceabilityService.getBinLocation(organizationId, id);
  }

  @Patch("bin-locations/:id")
  @RequirePermissions(PERMISSIONS.inventory.manage)
  updateBinLocation(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: UpdateInventoryBinLocationDto,
  ) {
    return this.traceabilityService.updateBinLocation(organizationId, user.id, id, dto);
  }

  @Get("batches")
  @RequirePermissions(PERMISSIONS.inventory.view)
  listBatches(@CurrentOrganizationId() organizationId: string, @Query() query: InventoryBatchQueryDto) {
    return this.traceabilityService.listBatches(organizationId, query);
  }

  @Post("batches")
  @RequirePermissions(PERMISSIONS.inventory.manage)
  createBatch(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Body() dto: CreateInventoryBatchDto) {
    return this.traceabilityService.createBatch(organizationId, user.id, dto);
  }

  @Get("batches/:id")
  @RequirePermissions(PERMISSIONS.inventory.view)
  getBatch(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.traceabilityService.getBatch(organizationId, id);
  }

  @Patch("batches/:id")
  @RequirePermissions(PERMISSIONS.inventory.manage)
  updateBatch(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: UpdateInventoryBatchDto) {
    return this.traceabilityService.updateBatch(organizationId, user.id, id, dto);
  }

  @Get("serial-numbers")
  @RequirePermissions(PERMISSIONS.inventory.view)
  listSerialNumbers(@CurrentOrganizationId() organizationId: string, @Query() query: InventorySerialNumberQueryDto) {
    return this.traceabilityService.listSerialNumbers(organizationId, query);
  }

  @Post("serial-numbers")
  @RequirePermissions(PERMISSIONS.inventory.manage)
  createSerialNumber(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Body() dto: CreateInventorySerialNumberDto) {
    return this.traceabilityService.createSerialNumber(organizationId, user.id, dto);
  }

  @Get("serial-numbers/:id")
  @RequirePermissions(PERMISSIONS.inventory.view)
  getSerialNumber(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.traceabilityService.getSerialNumber(organizationId, id);
  }

  @Patch("serial-numbers/:id")
  @RequirePermissions(PERMISSIONS.inventory.manage)
  updateSerialNumber(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: UpdateInventorySerialNumberDto,
  ) {
    return this.traceabilityService.updateSerialNumber(organizationId, user.id, id, dto);
  }
}
