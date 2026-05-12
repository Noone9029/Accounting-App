import { Body, Controller, Get, Patch, UseGuards } from "@nestjs/common";
import { PERMISSIONS } from "@ledgerbyte/shared";
import { AuthenticatedUser } from "../auth/auth.types";
import { CurrentOrganizationId } from "../auth/decorators/current-organization.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { RequirePermissions } from "../auth/decorators/require-permissions.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "../auth/guards/organization-context.guard";
import { PermissionGuard } from "../auth/guards/permission.guard";
import { UpdateOrganizationDocumentSettingsDto } from "./dto/update-organization-document-settings.dto";
import { OrganizationDocumentSettingsService } from "./organization-document-settings.service";

@Controller("organization-document-settings")
@UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionGuard)
export class OrganizationDocumentSettingsController {
  constructor(private readonly settingsService: OrganizationDocumentSettingsService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.documentSettings.view)
  get(@CurrentOrganizationId() organizationId: string) {
    return this.settingsService.getOrCreate(organizationId);
  }

  @Patch()
  @RequirePermissions(PERMISSIONS.documentSettings.manage)
  update(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateOrganizationDocumentSettingsDto,
  ) {
    return this.settingsService.update(organizationId, user.id, dto);
  }
}
