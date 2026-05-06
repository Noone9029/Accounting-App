import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { AuthenticatedUser } from "../auth/auth.types";
import { CurrentOrganizationId } from "../auth/decorators/current-organization.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "../auth/guards/organization-context.guard";
import { ContactService } from "./contact.service";
import { CreateContactDto } from "./dto/create-contact.dto";
import { UpdateContactDto } from "./dto/update-contact.dto";

@Controller("contacts")
@UseGuards(JwtAuthGuard, OrganizationContextGuard)
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Get()
  list(@CurrentOrganizationId() organizationId: string) {
    return this.contactService.list(organizationId);
  }

  @Post()
  create(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Body() dto: CreateContactDto) {
    return this.contactService.create(organizationId, user.id, dto);
  }

  @Get(":id")
  get(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.contactService.get(organizationId, id);
  }

  @Patch(":id")
  update(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: UpdateContactDto,
  ) {
    return this.contactService.update(organizationId, user.id, id, dto);
  }
}
