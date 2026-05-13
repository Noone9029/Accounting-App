import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { PERMISSIONS } from "@ledgerbyte/shared";
import type { AuthenticatedUser } from "../auth/auth.types";
import { CurrentOrganizationId } from "../auth/decorators/current-organization.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { RequirePermissions } from "../auth/decorators/require-permissions.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "../auth/guards/organization-context.guard";
import { PermissionGuard } from "../auth/guards/permission.guard";
import { InviteOrganizationMemberDto } from "./dto/invite-organization-member.dto";
import { UpdateOrganizationMemberRoleDto } from "./dto/update-organization-member-role.dto";
import { UpdateOrganizationMemberStatusDto } from "./dto/update-organization-member-status.dto";
import { OrganizationMemberService } from "./organization-member.service";

@Controller("organization-members")
@UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionGuard)
export class OrganizationMemberController {
  constructor(private readonly organizationMemberService: OrganizationMemberService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.users.view)
  list(@CurrentOrganizationId() organizationId: string) {
    return this.organizationMemberService.list(organizationId);
  }

  @Get(":id")
  @RequirePermissions(PERMISSIONS.users.view)
  get(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.organizationMemberService.get(organizationId, id);
  }

  @Patch(":id/role")
  @RequirePermissions(PERMISSIONS.users.manage)
  updateRole(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: UpdateOrganizationMemberRoleDto,
  ) {
    return this.organizationMemberService.updateRole(organizationId, user.id, id, dto);
  }

  @Patch(":id/status")
  @RequirePermissions(PERMISSIONS.users.manage)
  updateStatus(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: UpdateOrganizationMemberStatusDto,
  ) {
    return this.organizationMemberService.updateStatus(organizationId, user.id, id, dto);
  }

  @Post("invite")
  @RequirePermissions(PERMISSIONS.users.invite)
  invite(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Body() dto: InviteOrganizationMemberDto) {
    return this.organizationMemberService.invite(organizationId, user.id, dto);
  }
}
