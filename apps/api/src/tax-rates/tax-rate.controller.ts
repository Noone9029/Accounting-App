import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { PERMISSIONS } from "@ledgerbyte/shared";
import { AuthenticatedUser } from "../auth/auth.types";
import { CurrentOrganizationId } from "../auth/decorators/current-organization.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { RequirePermissions } from "../auth/decorators/require-permissions.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "../auth/guards/organization-context.guard";
import { PermissionGuard } from "../auth/guards/permission.guard";
import { CreateTaxRateDto } from "./dto/create-tax-rate.dto";
import { UpdateTaxRateDto } from "./dto/update-tax-rate.dto";
import { TaxRateService } from "./tax-rate.service";

@Controller("tax-rates")
@UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionGuard)
export class TaxRateController {
  constructor(private readonly taxRateService: TaxRateService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.taxRates.view)
  list(@CurrentOrganizationId() organizationId: string) {
    return this.taxRateService.list(organizationId);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.taxRates.manage)
  create(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Body() dto: CreateTaxRateDto) {
    return this.taxRateService.create(organizationId, user.id, dto);
  }

  @Patch(":id")
  @RequirePermissions(PERMISSIONS.taxRates.manage)
  update(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: UpdateTaxRateDto,
  ) {
    return this.taxRateService.update(organizationId, user.id, id, dto);
  }
}
