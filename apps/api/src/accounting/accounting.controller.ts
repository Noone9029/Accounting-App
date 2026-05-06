import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { AuthenticatedUser } from "../auth/auth.types";
import { CurrentOrganizationId } from "../auth/decorators/current-organization.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "../auth/guards/organization-context.guard";
import { AccountingService } from "./accounting.service";
import { CreateJournalEntryDto } from "./dto/create-journal-entry.dto";
import { UpdateJournalEntryDto } from "./dto/update-journal-entry.dto";

@Controller("journal-entries")
@UseGuards(JwtAuthGuard, OrganizationContextGuard)
export class AccountingController {
  constructor(private readonly accountingService: AccountingService) {}

  @Get()
  list(@CurrentOrganizationId() organizationId: string) {
    return this.accountingService.list(organizationId);
  }

  @Post()
  create(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateJournalEntryDto,
  ) {
    return this.accountingService.create(organizationId, user.id, dto);
  }

  @Get(":id")
  get(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.accountingService.get(organizationId, id);
  }

  @Patch(":id")
  update(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: UpdateJournalEntryDto,
  ) {
    return this.accountingService.update(organizationId, user.id, id, dto);
  }

  @Post(":id/post")
  post(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.accountingService.post(organizationId, user.id, id);
  }

  @Post(":id/reverse")
  reverse(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.accountingService.reverse(organizationId, user.id, id);
  }
}
