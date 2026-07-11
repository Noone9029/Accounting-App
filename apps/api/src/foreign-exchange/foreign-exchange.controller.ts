import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Put, Query, UseGuards } from "@nestjs/common";
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
import { FxRevaluationMutationDto } from "./dto/fx-revaluation-mutation.dto";
import { FxRevaluationQueryDto } from "./dto/fx-revaluation-query.dto";
import { PreviewFxRevaluationDto } from "./dto/preview-fx-revaluation.dto";
import { UpdateFxAccountConfigurationDto } from "./dto/update-fx-account-configuration.dto";
import { ForeignExchangeService } from "./foreign-exchange.service";
import { FxRevaluationService } from "./fx-revaluation.service";
import { FxCloseReadinessService } from "./fx-close-readiness.service";

@Controller("fx")
@UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionGuard)
export class ForeignExchangeController {
  constructor(
    private readonly foreignExchangeService: ForeignExchangeService,
    private readonly fxRevaluationService: FxRevaluationService,
    private readonly fxCloseReadinessService: FxCloseReadinessService,
  ) {}

  @Get("currencies")
  @RequirePermissions(PERMISSIONS.currencies.read)
  currencies(@CurrentOrganizationId() organizationId: string) {
    return this.foreignExchangeService.currencies(organizationId);
  }

  @Get("rates")
  @RequirePermissions(PERMISSIONS.fxRates.read)
  listRates(@CurrentOrganizationId() organizationId: string, @Query() query: CurrencyRateQueryDto) {
    return this.foreignExchangeService.listRates(organizationId, query);
  }

  @Get("rates/:id")
  @RequirePermissions(PERMISSIONS.fxRates.read)
  getRate(
    @CurrentOrganizationId() organizationId: string,
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
  ) {
    return this.foreignExchangeService.getRate(organizationId, id);
  }

  @Post("rates")
  @RequirePermissions(PERMISSIONS.fxRates.manage)
  createRate(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCurrencyRateSnapshotDto,
  ) {
    return this.foreignExchangeService.createRate(organizationId, user.id, dto);
  }

  @Get("account-configuration")
  @RequirePermissions(PERMISSIONS.currencies.read)
  getAccountConfiguration(@CurrentOrganizationId() organizationId: string) {
    return this.foreignExchangeService.getAccountConfiguration(organizationId);
  }

  @Put("account-configuration")
  @RequirePermissions(PERMISSIONS.currencies.manage)
  updateAccountConfiguration(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateFxAccountConfigurationDto,
  ) {
    return this.foreignExchangeService.updateAccountConfiguration(organizationId, user.id, dto);
  }

  @Get("readiness")
  @RequirePermissions(PERMISSIONS.currencies.read)
  readiness(@CurrentOrganizationId() organizationId: string) {
    return this.foreignExchangeService.readiness(organizationId);
  }

  @Get("close-readiness")
  @RequirePermissions(PERMISSIONS.reports.view)
  closeReadiness(@CurrentOrganizationId() organizationId: string, @Query() query: { asOf?: string }) {
    return this.fxCloseReadinessService.readiness(organizationId, query.asOf);
  }

  @Get("revaluations")
  @RequirePermissions(PERMISSIONS.fxRevaluation.read)
  listRevaluations(@CurrentOrganizationId() organizationId: string, @Query() query: FxRevaluationQueryDto) {
    return this.fxRevaluationService.list(organizationId, query);
  }

  @Get("revaluations/context")
  @RequirePermissions(PERMISSIONS.fxRevaluation.read)
  async revaluationContext(@CurrentOrganizationId() organizationId: string) {
    const [catalog, readiness] = await Promise.all([
      this.foreignExchangeService.currencies(organizationId),
      this.foreignExchangeService.readiness(organizationId),
    ]);
    return { catalog, readiness };
  }

  @Get("revaluations/:id")
  @RequirePermissions(PERMISSIONS.fxRevaluation.read)
  getRevaluation(
    @CurrentOrganizationId() organizationId: string,
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
  ) {
    return this.fxRevaluationService.get(organizationId, id);
  }

  @Post("revaluations/preview")
  @RequirePermissions(PERMISSIONS.fxRevaluation.run)
  previewRevaluation(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: PreviewFxRevaluationDto,
  ) {
    return this.fxRevaluationService.preview(organizationId, user.id, dto);
  }

  @Post("revaluations/:id/review")
  @RequirePermissions(PERMISSIONS.fxRevaluation.run)
  reviewRevaluation(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Body() dto: FxRevaluationMutationDto,
  ) {
    return this.fxRevaluationService.review(organizationId, user.id, id, dto);
  }

  @Post("revaluations/:id/post")
  @RequirePermissions(PERMISSIONS.fxRevaluation.run)
  postRevaluation(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Body() dto: FxRevaluationMutationDto,
  ) {
    return this.fxRevaluationService.post(organizationId, user.id, id, dto);
  }

  @Post("revaluations/:id/reverse")
  @RequirePermissions(PERMISSIONS.fxRevaluation.reverse)
  reverseRevaluation(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Body() dto: FxRevaluationMutationDto,
  ) {
    return this.fxRevaluationService.reverse(organizationId, user.id, id, dto);
  }
}
