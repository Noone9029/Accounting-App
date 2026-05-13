import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { PERMISSIONS } from "@ledgerbyte/shared";
import type { AuthenticatedUser } from "../auth/auth.types";
import { CurrentOrganizationId } from "../auth/decorators/current-organization.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { RequirePermissions } from "../auth/decorators/require-permissions.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "../auth/guards/organization-context.guard";
import { PermissionGuard } from "../auth/guards/permission.guard";
import { CreateRoleDto } from "./dto/create-role.dto";
import { UpdateRoleDto } from "./dto/update-role.dto";
import { RoleService } from "./role.service";

@Controller("roles")
@UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionGuard)
@RequirePermissions(PERMISSIONS.roles.view)
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Get()
  list(@CurrentOrganizationId() organizationId: string) {
    return this.roleService.list(organizationId);
  }

  @Get(":id")
  get(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.roleService.get(organizationId, id);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.roles.manage)
  create(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Body() dto: CreateRoleDto) {
    return this.roleService.create(organizationId, user.id, dto);
  }

  @Patch(":id")
  @RequirePermissions(PERMISSIONS.roles.manage)
  update(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: UpdateRoleDto,
  ) {
    return this.roleService.update(organizationId, user.id, id, dto);
  }

  @Delete(":id")
  @RequirePermissions(PERMISSIONS.roles.manage)
  remove(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.roleService.remove(organizationId, user.id, id);
  }
}
