import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { AuthenticatedUser } from "../auth/auth.types";
import { CurrentOrganizationId } from "../auth/decorators/current-organization.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "../auth/guards/organization-context.guard";
import { CreateFiscalPeriodDto } from "./dto/create-fiscal-period.dto";
import { UpdateFiscalPeriodDto } from "./dto/update-fiscal-period.dto";
import { FiscalPeriodService } from "./fiscal-period.service";

@Controller("fiscal-periods")
@UseGuards(JwtAuthGuard, OrganizationContextGuard)
export class FiscalPeriodController {
  constructor(private readonly fiscalPeriodService: FiscalPeriodService) {}

  @Get()
  list(@CurrentOrganizationId() organizationId: string) {
    return this.fiscalPeriodService.list(organizationId);
  }

  @Post()
  create(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Body() dto: CreateFiscalPeriodDto) {
    return this.fiscalPeriodService.create(organizationId, user.id, dto);
  }

  @Get(":id")
  get(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.fiscalPeriodService.get(organizationId, id);
  }

  @Patch(":id")
  update(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: UpdateFiscalPeriodDto,
  ) {
    return this.fiscalPeriodService.update(organizationId, user.id, id, dto);
  }

  @Post(":id/close")
  close(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.fiscalPeriodService.close(organizationId, user.id, id);
  }

  @Post(":id/reopen")
  reopen(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.fiscalPeriodService.reopen(organizationId, user.id, id);
  }

  @Post(":id/lock")
  lock(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.fiscalPeriodService.lock(organizationId, user.id, id);
  }
}
