import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { PERMISSIONS } from "@ledgerbyte/shared";
import { AuthenticatedUser } from "../auth/auth.types";
import { CurrentOrganizationId } from "../auth/decorators/current-organization.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { RequirePermissions } from "../auth/decorators/require-permissions.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "../auth/guards/organization-context.guard";
import { PermissionGuard } from "../auth/guards/permission.guard";
import { CreateItemDto } from "./dto/create-item.dto";
import { UpdateItemDto } from "./dto/update-item.dto";
import { ItemService } from "./item.service";

@Controller("items")
@UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionGuard)
export class ItemController {
  constructor(private readonly itemService: ItemService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.items.view)
  list(@CurrentOrganizationId() organizationId: string) {
    return this.itemService.list(organizationId);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.items.manage)
  create(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Body() dto: CreateItemDto) {
    return this.itemService.create(organizationId, user.id, dto);
  }

  @Get(":id")
  @RequirePermissions(PERMISSIONS.items.view)
  get(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.itemService.get(organizationId, id);
  }

  @Patch(":id")
  @RequirePermissions(PERMISSIONS.items.manage)
  update(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: UpdateItemDto,
  ) {
    return this.itemService.update(organizationId, user.id, id, dto);
  }

  @Delete(":id")
  @RequirePermissions(PERMISSIONS.items.manage)
  remove(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.itemService.remove(organizationId, user.id, id);
  }
}
