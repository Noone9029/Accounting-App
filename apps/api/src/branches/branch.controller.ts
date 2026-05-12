import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { PERMISSIONS } from "@ledgerbyte/shared";
import { AuthenticatedUser } from "../auth/auth.types";
import { CurrentOrganizationId } from "../auth/decorators/current-organization.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { RequirePermissions } from "../auth/decorators/require-permissions.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "../auth/guards/organization-context.guard";
import { PermissionGuard } from "../auth/guards/permission.guard";
import { BranchService } from "./branch.service";
import { CreateBranchDto } from "./dto/create-branch.dto";
import { UpdateBranchDto } from "./dto/update-branch.dto";

@Controller("branches")
@UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionGuard)
export class BranchController {
  constructor(private readonly branchService: BranchService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.organization.view)
  list(@CurrentOrganizationId() organizationId: string) {
    return this.branchService.list(organizationId);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.organization.update)
  create(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Body() dto: CreateBranchDto) {
    return this.branchService.create(organizationId, user.id, dto);
  }

  @Patch(":id")
  @RequirePermissions(PERMISSIONS.organization.update)
  update(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: UpdateBranchDto,
  ) {
    return this.branchService.update(organizationId, user.id, id, dto);
  }
}
