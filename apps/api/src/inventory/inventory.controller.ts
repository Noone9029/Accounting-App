import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { PERMISSIONS } from "@ledgerbyte/shared";
import { CurrentOrganizationId } from "../auth/decorators/current-organization.decorator";
import { RequirePermissions } from "../auth/decorators/require-permissions.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "../auth/guards/organization-context.guard";
import { PermissionGuard } from "../auth/guards/permission.guard";
import { InventoryBalanceQueryDto } from "./dto/inventory-balance-query.dto";
import { InventoryService } from "./inventory.service";

@Controller("inventory")
@UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get("balances")
  @RequirePermissions(PERMISSIONS.inventory.view)
  balances(@CurrentOrganizationId() organizationId: string, @Query() query: InventoryBalanceQueryDto) {
    return this.inventoryService.balances(organizationId, query);
  }
}
