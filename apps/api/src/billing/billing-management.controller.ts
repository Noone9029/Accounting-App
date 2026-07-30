import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { PERMISSIONS } from "@ledgerbyte/shared";
import { IsIn, IsInt, IsString, IsUUID, Min } from "class-validator";
import { AuthenticatedUser } from "../auth/auth.types";
import { CurrentOrganizationId } from "../auth/decorators/current-organization.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { RequirePermissions } from "../auth/decorators/require-permissions.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "../auth/guards/organization-context.guard";
import { PermissionGuard } from "../auth/guards/permission.guard";
import { BillingManagementService } from "./billing-management.service";

class CheckoutDto { @IsUUID() planVersionId!: string; @IsIn(["billing", "plans"]) returnRouteKey!: "billing" | "plans"; }
class MutationDto { @IsInt() @Min(1) expectedVersion!: number; @IsString() correlationId!: string; }
class PlanChangeDto extends MutationDto { @IsUUID() targetPlanVersionId!: string; @IsString() effectiveAt!: string; }

@Controller("billing")
@UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionGuard)
export class BillingManagementController {
  constructor(private readonly billing: BillingManagementService) {}
  @Get("status") @RequirePermissions(PERMISSIONS.billing.view) status(@CurrentOrganizationId() id: string) { return this.billing.status(id); }
  @Get("entitlements") @RequirePermissions(PERMISSIONS.billing.view) entitlements(@CurrentOrganizationId() id: string) { return this.billing.entitlements(id); }
  @Get("plans") @RequirePermissions(PERMISSIONS.billing.view) plans() { return this.billing.availablePlans(); }
  @Post("checkout") @RequirePermissions(PERMISSIONS.billing.manage) checkout(@CurrentOrganizationId() id: string, @Body() dto: CheckoutDto) { return this.billing.prepareCheckout(id, dto.planVersionId, dto.returnRouteKey); }
  @Post("portal") @RequirePermissions(PERMISSIONS.billing.manage) portal(@CurrentOrganizationId() id: string) { return this.billing.preparePortal(id); }
  @Post("subscriptions/:id/cancel") @RequirePermissions(PERMISSIONS.billing.manage) cancel(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: MutationDto) { return this.billing.cancel(organizationId, id, dto.expectedVersion, dto.correlationId, user.id); }
  @Post("subscriptions/:id/reactivate") @RequirePermissions(PERMISSIONS.billing.manage) reactivate(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: MutationDto) { return this.billing.reactivate(organizationId, id, dto.expectedVersion, dto.correlationId, user.id); }
  @Post("subscriptions/:id/plan-change") @RequirePermissions(PERMISSIONS.billing.manage) planChange(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: PlanChangeDto) { return this.billing.schedulePlanChange(organizationId, id, dto.expectedVersion, dto.targetPlanVersionId, new Date(dto.effectiveAt), dto.correlationId, user.id); }
}
