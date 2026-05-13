import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { PERMISSIONS } from "@ledgerbyte/shared";
import { AuthenticatedUser } from "../auth/auth.types";
import { CurrentOrganizationId } from "../auth/decorators/current-organization.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { RequirePermissions } from "../auth/decorators/require-permissions.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "../auth/guards/organization-context.guard";
import { PermissionGuard } from "../auth/guards/permission.guard";
import { CreateStockMovementDto } from "./dto/create-stock-movement.dto";
import { StockMovementQueryDto } from "./dto/stock-movement-query.dto";
import { StockMovementService } from "./stock-movement.service";

@Controller("stock-movements")
@UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionGuard)
export class StockMovementController {
  constructor(private readonly stockMovementService: StockMovementService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.stockMovements.view)
  list(@CurrentOrganizationId() organizationId: string, @Query() query: StockMovementQueryDto) {
    return this.stockMovementService.list(organizationId, query);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.stockMovements.create)
  create(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Body() dto: CreateStockMovementDto) {
    return this.stockMovementService.create(organizationId, user.id, dto);
  }

  @Get(":id")
  @RequirePermissions(PERMISSIONS.stockMovements.view)
  get(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.stockMovementService.get(organizationId, id);
  }
}
