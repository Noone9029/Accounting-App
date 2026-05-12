import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { PERMISSIONS } from "@ledgerbyte/shared";
import { AuthenticatedUser } from "../auth/auth.types";
import { CurrentOrganizationId } from "../auth/decorators/current-organization.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { RequirePermissions } from "../auth/decorators/require-permissions.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "../auth/guards/organization-context.guard";
import { PermissionGuard } from "../auth/guards/permission.guard";
import { AccountingService } from "./accounting.service";
import { CreateJournalEntryDto } from "./dto/create-journal-entry.dto";
import { UpdateJournalEntryDto } from "./dto/update-journal-entry.dto";

@Controller("journal-entries")
@UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionGuard)
export class AccountingController {
  constructor(private readonly accountingService: AccountingService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.journals.view)
  list(@CurrentOrganizationId() organizationId: string) {
    return this.accountingService.list(organizationId);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.journals.create)
  create(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateJournalEntryDto,
  ) {
    return this.accountingService.create(organizationId, user.id, dto);
  }

  @Get(":id")
  @RequirePermissions(PERMISSIONS.journals.view)
  get(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.accountingService.get(organizationId, id);
  }

  @Patch(":id")
  @RequirePermissions(PERMISSIONS.journals.create)
  update(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: UpdateJournalEntryDto,
  ) {
    return this.accountingService.update(organizationId, user.id, id, dto);
  }

  @Post(":id/post")
  @RequirePermissions(PERMISSIONS.journals.post)
  post(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.accountingService.post(organizationId, user.id, id);
  }

  @Post(":id/reverse")
  @RequirePermissions(PERMISSIONS.journals.reverse)
  reverse(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.accountingService.reverse(organizationId, user.id, id);
  }
}
