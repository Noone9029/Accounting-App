import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { PERMISSIONS } from "@ledgerbyte/shared";
import { AuthenticatedUser } from "../auth/auth.types";
import { CurrentOrganizationId } from "../auth/decorators/current-organization.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { RequirePermissions } from "../auth/decorators/require-permissions.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "../auth/guards/organization-context.guard";
import { PermissionGuard } from "../auth/guards/permission.guard";
import { CostCenterService } from "./cost-center.service";
import { CostCenterQueryDto } from "./dto/cost-center-query.dto";
import { CreateCostCenterDto } from "./dto/create-cost-center.dto";
import { UpdateCostCenterDto } from "./dto/update-cost-center.dto";

@Controller("cost-centers")
@UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionGuard)
export class CostCenterController {
  constructor(private readonly costCenterService: CostCenterService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.accounts.view)
  list(@CurrentOrganizationId() organizationId: string, @Query() query: CostCenterQueryDto) {
    return this.costCenterService.list(organizationId, query.status);
  }

  @Get(":id")
  @RequirePermissions(PERMISSIONS.accounts.view)
  get(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.costCenterService.get(organizationId, id);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.accounts.manage)
  create(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Body() dto: CreateCostCenterDto) {
    return this.costCenterService.create(organizationId, user.id, dto);
  }

  @Patch(":id")
  @RequirePermissions(PERMISSIONS.accounts.manage)
  update(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: UpdateCostCenterDto,
  ) {
    return this.costCenterService.update(organizationId, user.id, id, dto);
  }
}
