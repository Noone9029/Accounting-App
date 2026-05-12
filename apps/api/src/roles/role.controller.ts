import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { PERMISSIONS } from "@ledgerbyte/shared";
import { CurrentOrganizationId } from "../auth/decorators/current-organization.decorator";
import { RequirePermissions } from "../auth/decorators/require-permissions.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "../auth/guards/organization-context.guard";
import { PermissionGuard } from "../auth/guards/permission.guard";
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
}
