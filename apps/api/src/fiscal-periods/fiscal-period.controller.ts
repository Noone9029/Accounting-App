import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { PERMISSIONS } from "@ledgerbyte/shared";
import { AuthenticatedUser } from "../auth/auth.types";
import { CurrentOrganizationId } from "../auth/decorators/current-organization.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { RequirePermissions } from "../auth/decorators/require-permissions.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "../auth/guards/organization-context.guard";
import { PermissionGuard } from "../auth/guards/permission.guard";
import { CreateFiscalPeriodDto } from "./dto/create-fiscal-period.dto";
import { UpdateFiscalPeriodDto } from "./dto/update-fiscal-period.dto";
import { FiscalPeriodService } from "./fiscal-period.service";

@Controller("fiscal-periods")
@UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionGuard)
export class FiscalPeriodController {
  constructor(private readonly fiscalPeriodService: FiscalPeriodService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.fiscalPeriods.view)
  list(@CurrentOrganizationId() organizationId: string) {
    return this.fiscalPeriodService.list(organizationId);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.fiscalPeriods.manage)
  create(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Body() dto: CreateFiscalPeriodDto) {
    return this.fiscalPeriodService.create(organizationId, user.id, dto);
  }

  @Get(":id")
  @RequirePermissions(PERMISSIONS.fiscalPeriods.view)
  get(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.fiscalPeriodService.get(organizationId, id);
  }

  @Patch(":id")
  @RequirePermissions(PERMISSIONS.fiscalPeriods.manage)
  update(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: UpdateFiscalPeriodDto,
  ) {
    return this.fiscalPeriodService.update(organizationId, user.id, id, dto);
  }

  @Post(":id/close")
  @RequirePermissions(PERMISSIONS.fiscalPeriods.manage)
  close(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.fiscalPeriodService.close(organizationId, user.id, id);
  }

  @Post(":id/reopen")
  @RequirePermissions(PERMISSIONS.fiscalPeriods.manage)
  reopen(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.fiscalPeriodService.reopen(organizationId, user.id, id);
  }

  @Post(":id/lock")
  @RequirePermissions(PERMISSIONS.fiscalPeriods.lock, PERMISSIONS.fiscalPeriods.manage)
  lock(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.fiscalPeriodService.lock(organizationId, user.id, id);
  }
}
