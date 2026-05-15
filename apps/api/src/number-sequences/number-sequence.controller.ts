import { Body, Controller, Get, Param, Patch, UseGuards } from "@nestjs/common";
import { PERMISSIONS } from "@ledgerbyte/shared";
import { AuthenticatedUser } from "../auth/auth.types";
import { CurrentOrganizationId } from "../auth/decorators/current-organization.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { RequirePermissions } from "../auth/decorators/require-permissions.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "../auth/guards/organization-context.guard";
import { PermissionGuard } from "../auth/guards/permission.guard";
import { NumberSequenceService, type NumberSequenceUpdateInput } from "./number-sequence.service";

@Controller("number-sequences")
@UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionGuard)
export class NumberSequenceController {
  constructor(private readonly numberSequenceService: NumberSequenceService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.numberSequences.view)
  list(@CurrentOrganizationId() organizationId: string) {
    return this.numberSequenceService.list(organizationId);
  }

  @Get(":id")
  @RequirePermissions(PERMISSIONS.numberSequences.view)
  get(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.numberSequenceService.get(organizationId, id);
  }

  @Patch(":id")
  @RequirePermissions(PERMISSIONS.numberSequences.manage)
  update(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() body: NumberSequenceUpdateInput,
  ) {
    return this.numberSequenceService.update(organizationId, user.id, id, body);
  }
}
