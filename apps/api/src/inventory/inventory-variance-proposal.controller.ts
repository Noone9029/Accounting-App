import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { PERMISSIONS } from "@ledgerbyte/shared";
import { CurrentOrganizationId } from "../auth/decorators/current-organization.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { RequirePermissions } from "../auth/decorators/require-permissions.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "../auth/guards/organization-context.guard";
import { PermissionGuard } from "../auth/guards/permission.guard";
import type { AuthenticatedUser } from "../auth/auth.types";
import {
  CreateInventoryVarianceProposalFromClearingVarianceDto,
  CreateManualInventoryVarianceProposalDto,
} from "./dto/create-inventory-variance-proposal.dto";
import { InventoryVarianceProposalQueryDto } from "./dto/inventory-variance-proposal-query.dto";
import {
  ApproveInventoryVarianceProposalDto,
  ReverseInventoryVarianceProposalDto,
  SubmitInventoryVarianceProposalDto,
  VoidInventoryVarianceProposalDto,
} from "./dto/inventory-variance-proposal-workflow.dto";
import { InventoryVarianceProposalService } from "./inventory-variance-proposal.service";

@Controller("inventory/variance-proposals")
@UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionGuard)
export class InventoryVarianceProposalController {
  constructor(private readonly inventoryVarianceProposalService: InventoryVarianceProposalService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.inventory.varianceProposalsView)
  list(@CurrentOrganizationId() organizationId: string, @Query() query: InventoryVarianceProposalQueryDto) {
    return this.inventoryVarianceProposalService.list(organizationId, query);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.inventory.varianceProposalsCreate)
  createManual(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateManualInventoryVarianceProposalDto,
  ) {
    return this.inventoryVarianceProposalService.createManual(organizationId, user.id, dto);
  }

  @Post("from-clearing-variance")
  @RequirePermissions(PERMISSIONS.inventory.varianceProposalsCreate)
  createFromClearingVariance(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateInventoryVarianceProposalFromClearingVarianceDto,
  ) {
    return this.inventoryVarianceProposalService.createFromClearingVariance(organizationId, user.id, dto);
  }

  @Get(":id")
  @RequirePermissions(PERMISSIONS.inventory.varianceProposalsView)
  get(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.inventoryVarianceProposalService.get(organizationId, id);
  }

  @Get(":id/events")
  @RequirePermissions(PERMISSIONS.inventory.varianceProposalsView)
  events(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.inventoryVarianceProposalService.events(organizationId, id);
  }

  @Get(":id/accounting-preview")
  @RequirePermissions(PERMISSIONS.inventory.varianceProposalsView)
  accountingPreview(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.inventoryVarianceProposalService.accountingPreview(organizationId, id);
  }

  @Post(":id/submit")
  @RequirePermissions(PERMISSIONS.inventory.varianceProposalsCreate)
  submit(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: SubmitInventoryVarianceProposalDto,
  ) {
    return this.inventoryVarianceProposalService.submit(organizationId, user.id, id, dto);
  }

  @Post(":id/approve")
  @RequirePermissions(PERMISSIONS.inventory.varianceProposalsApprove)
  approve(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: ApproveInventoryVarianceProposalDto,
  ) {
    return this.inventoryVarianceProposalService.approve(organizationId, user.id, id, dto);
  }

  @Post(":id/post")
  @RequirePermissions(PERMISSIONS.inventory.varianceProposalsPost)
  post(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.inventoryVarianceProposalService.post(organizationId, user.id, id);
  }

  @Post(":id/reverse")
  @RequirePermissions(PERMISSIONS.inventory.varianceProposalsReverse)
  reverse(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: ReverseInventoryVarianceProposalDto,
  ) {
    return this.inventoryVarianceProposalService.reverse(organizationId, user.id, id, dto);
  }

  @Post(":id/void")
  @RequirePermissions(PERMISSIONS.inventory.varianceProposalsVoid)
  void(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: VoidInventoryVarianceProposalDto,
  ) {
    return this.inventoryVarianceProposalService.void(organizationId, user.id, id, dto);
  }
}
