import { Body, Controller, Get, Patch, UseGuards } from "@nestjs/common";
import { AuthenticatedUser } from "../auth/auth.types";
import { CurrentOrganizationId } from "../auth/decorators/current-organization.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "../auth/guards/organization-context.guard";
import { UpdateOrganizationDocumentSettingsDto } from "./dto/update-organization-document-settings.dto";
import { OrganizationDocumentSettingsService } from "./organization-document-settings.service";

@Controller("organization-document-settings")
@UseGuards(JwtAuthGuard, OrganizationContextGuard)
export class OrganizationDocumentSettingsController {
  constructor(private readonly settingsService: OrganizationDocumentSettingsService) {}

  @Get()
  get(@CurrentOrganizationId() organizationId: string) {
    return this.settingsService.getOrCreate(organizationId);
  }

  @Patch()
  update(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateOrganizationDocumentSettingsDto,
  ) {
    return this.settingsService.update(organizationId, user.id, dto);
  }
}
