import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { PERMISSIONS } from "@ledgerbyte/shared";
import { AuthenticatedUser } from "../auth/auth.types";
import { CurrentOrganizationId } from "../auth/decorators/current-organization.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { RequirePermissions } from "../auth/decorators/require-permissions.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "../auth/guards/organization-context.guard";
import { PermissionGuard } from "../auth/guards/permission.guard";
import { BankAccountService } from "./bank-account.service";
import { BankAccountTransactionsQueryDto } from "./dto/bank-account-transactions-query.dto";
import { CreateBankAccountProfileDto } from "./dto/create-bank-account-profile.dto";
import { UpdateBankAccountProfileDto } from "./dto/update-bank-account-profile.dto";

@Controller("bank-accounts")
@UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionGuard)
export class BankAccountController {
  constructor(private readonly bankAccountService: BankAccountService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.bankAccounts.view)
  list(@CurrentOrganizationId() organizationId: string) {
    return this.bankAccountService.list(organizationId);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.bankAccounts.manage)
  create(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateBankAccountProfileDto,
  ) {
    return this.bankAccountService.create(organizationId, user.id, dto);
  }

  @Get(":id/transactions")
  @RequirePermissions(PERMISSIONS.bankAccounts.transactionsView)
  transactions(
    @CurrentOrganizationId() organizationId: string,
    @Param("id") id: string,
    @Query() query: BankAccountTransactionsQueryDto,
  ) {
    return this.bankAccountService.transactions(organizationId, id, query);
  }

  @Get(":id")
  @RequirePermissions(PERMISSIONS.bankAccounts.view)
  get(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.bankAccountService.get(organizationId, id);
  }

  @Patch(":id")
  @RequirePermissions(PERMISSIONS.bankAccounts.manage)
  update(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: UpdateBankAccountProfileDto,
  ) {
    return this.bankAccountService.update(organizationId, user.id, id, dto);
  }

  @Post(":id/archive")
  @RequirePermissions(PERMISSIONS.bankAccounts.manage)
  archive(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.bankAccountService.archive(organizationId, user.id, id);
  }

  @Post(":id/reactivate")
  @RequirePermissions(PERMISSIONS.bankAccounts.manage)
  reactivate(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.bankAccountService.reactivate(organizationId, user.id, id);
  }
}
