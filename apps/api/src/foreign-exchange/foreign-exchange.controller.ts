import { Body, Controller, Get, Post, Put, Query, UseGuards } from "@nestjs/common";
import { PERMISSIONS } from "@ledgerbyte/shared";
import { AuthenticatedUser } from "../auth/auth.types";
import { CurrentOrganizationId } from "../auth/decorators/current-organization.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { RequirePermissions } from "../auth/decorators/require-permissions.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "../auth/guards/organization-context.guard";
import { PermissionGuard } from "../auth/guards/permission.guard";
import { CreateCurrencyRateSnapshotDto } from "./dto/create-currency-rate-snapshot.dto";
import { CurrencyRateQueryDto } from "./dto/currency-rate-query.dto";
import { UpdateFxAccountConfigurationDto } from "./dto/update-fx-account-configuration.dto";
import { ForeignExchangeService } from "./foreign-exchange.service";

@Controller("fx")
@UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionGuard)
export class ForeignExchangeController {
  constructor(private readonly foreignExchangeService: ForeignExchangeService) {}

  @Get("currencies")
  @RequirePermissions(PERMISSIONS.accounts.view)
  currencies(@CurrentOrganizationId() organizationId: string) {
    return this.foreignExchangeService.currencies(organizationId);
  }

  @Get("rates")
  @RequirePermissions(PERMISSIONS.accounts.view)
  listRates(@CurrentOrganizationId() organizationId: string, @Query() query: CurrencyRateQueryDto) {
    return this.foreignExchangeService.listRates(organizationId, query);
  }

  @Post("rates")
  @RequirePermissions(PERMISSIONS.accounts.manage)
  createRate(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCurrencyRateSnapshotDto,
  ) {
    return this.foreignExchangeService.createRate(organizationId, user.id, dto);
  }

  @Get("account-configuration")
  @RequirePermissions(PERMISSIONS.accounts.view)
  getAccountConfiguration(@CurrentOrganizationId() organizationId: string) {
    return this.foreignExchangeService.getAccountConfiguration(organizationId);
  }

  @Put("account-configuration")
  @RequirePermissions(PERMISSIONS.accounts.manage)
  updateAccountConfiguration(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateFxAccountConfigurationDto,
  ) {
    return this.foreignExchangeService.updateAccountConfiguration(organizationId, user.id, dto);
  }

  @Get("readiness")
  @RequirePermissions(PERMISSIONS.accounts.view)
  readiness(@CurrentOrganizationId() organizationId: string) {
    return this.foreignExchangeService.readiness(organizationId);
  }
}
