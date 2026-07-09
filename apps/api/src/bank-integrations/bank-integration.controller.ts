import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { PERMISSIONS } from "@ledgerbyte/shared";
import type { AuthenticatedUser } from "../auth/auth.types";
import { CurrentOrganizationId } from "../auth/decorators/current-organization.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { RequirePermissions } from "../auth/decorators/require-permissions.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "../auth/guards/organization-context.guard";
import { PermissionGuard } from "../auth/guards/permission.guard";
import { BankIntegrationService } from "./bank-integration.service";
import {
  CreateBankConnectionDto,
  CreateBankPaymentRequestDto,
  ListBankPaymentRequestsDto,
  ManualExternalReleaseDto,
  ReconcileBankPaymentRequestDto,
  RecordMockFeedSyncDto,
  UpsertBankBeneficiaryMappingDto,
} from "./dto/bank-integration.dto";

@Controller("bank-integrations")
@UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionGuard)
@ApiTags("Bank integrations")
@ApiBearerAuth()
export class BankIntegrationController {
  constructor(private readonly bankIntegrationService: BankIntegrationService) {}

  @Get("readiness")
  @RequirePermissions(PERMISSIONS.bankIntegrations.connectionManage, PERMISSIONS.bankIntegrations.feedRead)
  @ApiOperation({ summary: "Check Wio-shaped bank integration readiness without returning secrets" })
  readiness(@CurrentOrganizationId() organizationId: string) {
    return this.bankIntegrationService.readiness(organizationId);
  }

  @Get("connections/readiness")
  @RequirePermissions(PERMISSIONS.bankIntegrations.connectionManage)
  connectionReadiness(@CurrentOrganizationId() organizationId: string) {
    return this.bankIntegrationService.connectionReadiness(organizationId);
  }

  @Get("feeds/readiness")
  @RequirePermissions(PERMISSIONS.bankIntegrations.feedRead)
  feedReadiness(@CurrentOrganizationId() organizationId: string) {
    return this.bankIntegrationService.feedReadiness(organizationId);
  }

  @Get("beneficiaries/readiness")
  @RequirePermissions(PERMISSIONS.bankIntegrations.beneficiaryManage)
  beneficiaryReadiness(@CurrentOrganizationId() organizationId: string) {
    return this.bankIntegrationService.beneficiaryReadiness(organizationId);
  }

  @Get("vendor-payments/readiness")
  @RequirePermissions(PERMISSIONS.bankIntegrations.vendorPaymentCreate, PERMISSIONS.bankIntegrations.vendorPaymentApprove)
  vendorPaymentReadiness(@CurrentOrganizationId() organizationId: string) {
    return this.bankIntegrationService.vendorPaymentReadiness(organizationId);
  }

  @Get("connections")
  @RequirePermissions(PERMISSIONS.bankIntegrations.connectionManage)
  listConnections(@CurrentOrganizationId() organizationId: string) {
    return this.bankIntegrationService.listConnections(organizationId);
  }

  @Post("connections")
  @RequirePermissions(PERMISSIONS.bankIntegrations.connectionManage)
  createConnection(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateBankConnectionDto,
  ) {
    return this.bankIntegrationService.createConnection(organizationId, user.id, dto);
  }

  @Post("connections/:id/disable")
  @RequirePermissions(PERMISSIONS.bankIntegrations.connectionManage)
  disableConnection(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.bankIntegrationService.disableConnection(organizationId, user.id, id);
  }

  @Get("feed-accounts")
  @RequirePermissions(PERMISSIONS.bankIntegrations.feedRead)
  listFeedAccounts(@CurrentOrganizationId() organizationId: string) {
    return this.bankIntegrationService.listFeedAccounts(organizationId);
  }

  @Post("connections/:id/mock-sync")
  @RequirePermissions(PERMISSIONS.bankIntegrations.connectionManage)
  recordMockFeedSync(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: RecordMockFeedSyncDto,
  ) {
    return this.bankIntegrationService.recordMockFeedSync(organizationId, user.id, id, dto);
  }

  @Post("beneficiary-mappings")
  @RequirePermissions(PERMISSIONS.bankIntegrations.beneficiaryManage)
  upsertBeneficiaryMapping(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpsertBankBeneficiaryMappingDto,
  ) {
    return this.bankIntegrationService.upsertBeneficiaryMapping(organizationId, user.id, dto);
  }

  @Get("vendor-payment-requests")
  @RequirePermissions(PERMISSIONS.bankIntegrations.vendorPaymentCreate, PERMISSIONS.bankIntegrations.vendorPaymentApprove)
  listPaymentRequests(@CurrentOrganizationId() organizationId: string, @Query() query: ListBankPaymentRequestsDto) {
    return this.bankIntegrationService.listPaymentRequests(organizationId, query);
  }

  @Get("vendor-payment-requests/:id")
  @RequirePermissions(PERMISSIONS.bankIntegrations.vendorPaymentCreate, PERMISSIONS.bankIntegrations.vendorPaymentApprove, PERMISSIONS.bankIntegrations.vendorPaymentReconcile)
  getPaymentRequest(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.bankIntegrationService.getPaymentRequest(organizationId, id);
  }

  @Post("vendor-payment-requests")
  @RequirePermissions(PERMISSIONS.bankIntegrations.vendorPaymentCreate)
  createPaymentRequest(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateBankPaymentRequestDto,
  ) {
    return this.bankIntegrationService.createPaymentRequest(organizationId, user.id, dto);
  }

  @Post("vendor-payment-requests/:id/approve")
  @RequirePermissions(PERMISSIONS.bankIntegrations.vendorPaymentApprove)
  approvePaymentRequest(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.bankIntegrationService.approvePaymentRequest(organizationId, user.id, id);
  }

  @Post("vendor-payment-requests/:id/cancel")
  @RequirePermissions(PERMISSIONS.bankIntegrations.vendorPaymentCreate)
  cancelPaymentRequest(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.bankIntegrationService.cancelPaymentRequest(organizationId, user.id, id);
  }

  @Post("vendor-payment-requests/:id/release")
  @RequirePermissions(PERMISSIONS.bankIntegrations.vendorPaymentApprove)
  blockRelease(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.bankIntegrationService.blockRelease(organizationId, user.id, id);
  }

  @Post("vendor-payment-requests/:id/manual-external-release")
  @RequirePermissions(PERMISSIONS.bankIntegrations.vendorPaymentApprove)
  markExternallyReleased(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: ManualExternalReleaseDto,
  ) {
    return this.bankIntegrationService.markExternallyReleased(organizationId, user.id, id, dto);
  }

  @Post("vendor-payment-requests/:id/reconcile")
  @RequirePermissions(PERMISSIONS.bankIntegrations.vendorPaymentReconcile)
  reconcilePaymentRequest(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: ReconcileBankPaymentRequestDto,
  ) {
    return this.bankIntegrationService.reconcilePaymentRequest(organizationId, user.id, id, dto);
  }
}
