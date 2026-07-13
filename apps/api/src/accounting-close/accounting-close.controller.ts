import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { PERMISSIONS } from "@ledgerbyte/shared";
import { CurrentOrganizationId } from "../auth/decorators/current-organization.decorator";
import { RequirePermissions } from "../auth/decorators/require-permissions.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "../auth/guards/organization-context.guard";
import { PermissionGuard } from "../auth/guards/permission.guard";
import { AccountingCloseReadinessQueryDto } from "./dto/accounting-close-readiness-query.dto";
import { AccountingCloseService } from "./accounting-close.service";

@Controller("accounting-close")
@UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionGuard)
export class AccountingCloseController {
  constructor(private readonly accountingCloseService: AccountingCloseService) {}

  @Get("readiness")
  @RequirePermissions(PERMISSIONS.accountingClose.read)
  readiness(@CurrentOrganizationId() organizationId: string, @Query() query: AccountingCloseReadinessQueryDto) {
    return this.accountingCloseService.readiness(organizationId, query.fiscalPeriodId);
  }
}
