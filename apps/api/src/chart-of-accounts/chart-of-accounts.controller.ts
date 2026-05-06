import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { AuthenticatedUser } from "../auth/auth.types";
import { CurrentOrganizationId } from "../auth/decorators/current-organization.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "../auth/guards/organization-context.guard";
import { ChartOfAccountsService } from "./chart-of-accounts.service";
import { CreateAccountDto } from "./dto/create-account.dto";
import { UpdateAccountDto } from "./dto/update-account.dto";

@Controller("accounts")
@UseGuards(JwtAuthGuard, OrganizationContextGuard)
export class ChartOfAccountsController {
  constructor(private readonly accountsService: ChartOfAccountsService) {}

  @Get()
  list(@CurrentOrganizationId() organizationId: string) {
    return this.accountsService.list(organizationId);
  }

  @Post()
  create(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Body() dto: CreateAccountDto) {
    return this.accountsService.create(organizationId, user.id, dto);
  }

  @Get(":id")
  get(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.accountsService.get(organizationId, id);
  }

  @Patch(":id")
  update(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: UpdateAccountDto,
  ) {
    return this.accountsService.update(organizationId, user.id, id, dto);
  }

  @Delete(":id")
  remove(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.accountsService.remove(organizationId, user.id, id);
  }
}
