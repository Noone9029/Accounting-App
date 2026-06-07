import { Body, Controller, Get, Param, Patch, Post, Res, StreamableFile, UseGuards } from "@nestjs/common";
import { PERMISSIONS } from "@ledgerbyte/shared";
import type { Response } from "express";
import { AuthenticatedUser } from "../auth/auth.types";
import { CurrentOrganizationId } from "../auth/decorators/current-organization.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { RequirePermissions } from "../auth/decorators/require-permissions.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "../auth/guards/organization-context.guard";
import { PermissionGuard } from "../auth/guards/permission.guard";
import { ApproveZatcaStoragePolicyApprovalDto } from "./dto/approve-zatca-storage-policy-approval.dto";
import { ComplianceCsidRequestDryRunDto } from "./dto/compliance-csid-request-dry-run.dto";
import { CreateComplianceCsidCustodyRecordDto } from "./dto/create-compliance-csid-custody-record.dto";
import { CreateZatcaEgsUnitDto } from "./dto/create-zatca-egs-unit.dto";
import { CreateZatcaStoragePolicyApprovalDto } from "./dto/create-zatca-storage-policy-approval.dto";
import { CreateZatcaStorageControlEvidenceDto } from "./dto/create-zatca-storage-control-evidence.dto";
import { EnableZatcaSdkHashModeDto } from "./dto/enable-zatca-sdk-hash-mode.dto";
import { RequestComplianceCsidDto } from "./dto/request-compliance-csid.dto";
import { RevokeZatcaStoragePolicyApprovalDto } from "./dto/revoke-zatca-storage-policy-approval.dto";
import { RevokeZatcaStorageControlEvidenceDto } from "./dto/revoke-zatca-storage-control-evidence.dto";
import { RevokeComplianceCsidCustodyRecordDto } from "./dto/revoke-compliance-csid-custody-record.dto";
import { UpdateZatcaCsrFieldsDto } from "./dto/update-zatca-csr-fields.dto";
import { UpdateZatcaEgsUnitDto } from "./dto/update-zatca-egs-unit.dto";
import { UpdateZatcaProfileDto } from "./dto/update-zatca-profile.dto";
import { UpdateZatcaCredentialLifecycleDto } from "./dto/update-zatca-credential-lifecycle.dto";
import { VerifyZatcaStorageControlEvidenceDto } from "./dto/verify-zatca-storage-control-evidence.dto";
import { ZatcaCredentialLifecycleActionDto } from "./dto/zatca-credential-lifecycle-action.dto";
import { ZatcaService } from "./zatca.service";

@Controller()
@UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionGuard)
export class ZatcaController {
  constructor(private readonly zatcaService: ZatcaService) {}

  @Get("zatca/profile")
  @RequirePermissions(PERMISSIONS.zatca.view)
  profile(@CurrentOrganizationId() organizationId: string) {
    return this.zatcaService.getProfile(organizationId);
  }

  @Get("zatca/adapter-config")
  @RequirePermissions(PERMISSIONS.zatca.view)
  adapterConfig() {
    return this.zatcaService.getAdapterConfig();
  }

  @Get("zatca/compliance-checklist")
  @RequirePermissions(PERMISSIONS.zatca.view)
  complianceChecklist(@CurrentOrganizationId() organizationId: string) {
    return this.zatcaService.getComplianceChecklist(organizationId);
  }

  @Get("zatca/xml-field-mapping")
  @RequirePermissions(PERMISSIONS.zatca.view)
  xmlFieldMapping(@CurrentOrganizationId() organizationId: string) {
    return this.zatcaService.getXmlFieldMapping(organizationId);
  }

  @Get("zatca/readiness")
  @RequirePermissions(PERMISSIONS.zatca.view)
  readiness(@CurrentOrganizationId() organizationId: string) {
    return this.zatcaService.getZatcaReadinessSummary(organizationId);
  }

  @Get("zatca/hash-chain-reset-plan")
  @RequirePermissions(PERMISSIONS.zatca.manage)
  hashChainResetPlan(@CurrentOrganizationId() organizationId: string) {
    return this.zatcaService.getHashChainResetPlan(organizationId);
  }

  @Patch("zatca/profile")
  @RequirePermissions(PERMISSIONS.zatca.manage)
  updateProfile(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateZatcaProfileDto) {
    return this.zatcaService.updateProfile(organizationId, user.id, dto);
  }

  @Get("zatca/egs-units")
  @RequirePermissions(PERMISSIONS.zatca.view)
  listEgsUnits(@CurrentOrganizationId() organizationId: string) {
    return this.zatcaService.listEgsUnits(organizationId);
  }

  @Post("zatca/egs-units")
  @RequirePermissions(PERMISSIONS.zatca.manage)
  createEgsUnit(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Body() dto: CreateZatcaEgsUnitDto) {
    return this.zatcaService.createEgsUnit(organizationId, user.id, dto);
  }

  @Get("zatca/egs-units/:id")
  @RequirePermissions(PERMISSIONS.zatca.view)
  getEgsUnit(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.zatcaService.getEgsUnit(organizationId, id);
  }

  @Patch("zatca/egs-units/:id")
  @RequirePermissions(PERMISSIONS.zatca.manage)
  updateEgsUnit(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: UpdateZatcaEgsUnitDto) {
    return this.zatcaService.updateEgsUnit(organizationId, user.id, id, dto);
  }

  @Patch("zatca/egs-units/:id/csr-fields")
  @RequirePermissions(PERMISSIONS.zatca.manage)
  updateEgsUnitCsrFields(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: UpdateZatcaCsrFieldsDto) {
    return this.zatcaService.updateEgsUnitCsrFields(organizationId, user.id, id, dto);
  }

  @Post("zatca/egs-units/:id/activate-dev")
  @RequirePermissions(PERMISSIONS.zatca.manage)
  activateDevEgsUnit(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.zatcaService.activateDevEgsUnit(organizationId, user.id, id);
  }

  @Post("zatca/egs-units/:id/enable-sdk-hash-mode")
  @RequirePermissions(PERMISSIONS.zatca.manage)
  enableSdkHashMode(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: EnableZatcaSdkHashModeDto,
  ) {
    return this.zatcaService.enableSdkHashMode(organizationId, user.id, id, dto);
  }

  @Post("zatca/egs-units/:id/generate-csr")
  @RequirePermissions(PERMISSIONS.zatca.manage)
  generateEgsCsr(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.zatcaService.generateEgsCsr(organizationId, user.id, id);
  }

  @Get("zatca/egs-units/:id/csr-plan")
  @RequirePermissions(PERMISSIONS.zatca.view)
  getEgsCsrPlan(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.zatcaService.getEgsUnitCsrPlan(organizationId, id);
  }

  @Get("zatca/egs-units/:id/csr-config-preview")
  @RequirePermissions(PERMISSIONS.zatca.view)
  getEgsCsrConfigPreview(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.zatcaService.getEgsUnitCsrConfigPreview(organizationId, id);
  }

  @Get("zatca/egs-units/:id/csr-config-reviews")
  @RequirePermissions(PERMISSIONS.zatca.view)
  listEgsUnitCsrConfigReviews(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.zatcaService.listEgsUnitCsrConfigReviews(organizationId, id);
  }

  @Post("zatca/egs-units/:id/csr-config-reviews")
  @RequirePermissions(PERMISSIONS.zatca.manage)
  createEgsUnitCsrConfigReview(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: { note?: string } = {},
  ) {
    return this.zatcaService.createEgsUnitCsrConfigReview(organizationId, user.id, id, dto);
  }

  @Post("zatca/csr-config-reviews/:reviewId/approve")
  @RequirePermissions(PERMISSIONS.zatca.manage)
  approveCsrConfigReview(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("reviewId") reviewId: string,
    @Body() dto: { note?: string } = {},
  ) {
    return this.zatcaService.approveCsrConfigReview(organizationId, user.id, reviewId, dto);
  }

  @Post("zatca/csr-config-reviews/:reviewId/revoke")
  @RequirePermissions(PERMISSIONS.zatca.manage)
  revokeCsrConfigReview(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("reviewId") reviewId: string,
    @Body() dto: { note?: string } = {},
  ) {
    return this.zatcaService.revokeCsrConfigReview(organizationId, user.id, reviewId, dto);
  }

  @Post("zatca/egs-units/:id/csr-dry-run")
  @RequirePermissions(PERMISSIONS.zatca.manage)
  getEgsCsrDryRun(
    @CurrentOrganizationId() organizationId: string,
    @Param("id") id: string,
    @Body() dto: { prepareFiles?: boolean; keepTempFiles?: boolean } = {},
  ) {
    return this.zatcaService.getEgsUnitCsrDryRun(organizationId, id, dto);
  }

  @Post("zatca/egs-units/:id/csr-local-generate")
  @RequirePermissions(PERMISSIONS.zatca.manage)
  getEgsCsrLocalGenerate(
    @CurrentOrganizationId() organizationId: string,
    @Param("id") id: string,
    @Body() dto: { keepTempFiles?: boolean } = {},
  ) {
    return this.zatcaService.getEgsUnitCsrLocalGenerate(organizationId, id, dto);
  }

  @Get("zatca/egs-units/:id/compliance-csid-request-plan")
  @RequirePermissions(PERMISSIONS.zatca.view)
  getEgsComplianceCsidRequestPlan(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.zatcaService.getEgsUnitComplianceCsidRequestPlan(organizationId, id);
  }

  @Get("zatca/egs-units/:id/sandbox-csid-request-schema-plan")
  @RequirePermissions(PERMISSIONS.zatca.view)
  getEgsSandboxCsidRequestSchemaPlan(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.zatcaService.getEgsUnitSandboxCsidRequestSchemaPlan(organizationId, id);
  }

  @Get("zatca/egs-units/:id/sandbox-csid-response-custody-dry-run-plan")
  @RequirePermissions(PERMISSIONS.zatca.view)
  getEgsSandboxCsidResponseCustodyDryRunPlan(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.zatcaService.getEgsUnitSandboxCsidResponseCustodyDryRunPlan(organizationId, id);
  }

  @Get("zatca/egs-units/:id/sandbox-csid-execution-approval-plan")
  @RequirePermissions(PERMISSIONS.zatca.view)
  getEgsSandboxCsidExecutionApprovalPlan(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.zatcaService.getEgsUnitSandboxCsidExecutionApprovalPlan(organizationId, id);
  }

  @Get("zatca/egs-units/:id/compliance-csid-custody-plan")
  @RequirePermissions(PERMISSIONS.zatca.view)
  getEgsComplianceCsidCustodyPlan(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.zatcaService.getEgsUnitComplianceCsidCustodyPlan(organizationId, id);
  }

  @Get("zatca/compliance-csid-custody/provider-readiness")
  @RequirePermissions(PERMISSIONS.zatca.view)
  getComplianceCsidCustodyProviderReadiness() {
    return this.zatcaService.getComplianceCsidCustodyProviderReadiness();
  }

  @Get("zatca/compliance-csid-custody/provider-configuration-plan")
  @RequirePermissions(PERMISSIONS.zatca.view)
  getComplianceCsidCustodyProviderConfigurationPlan() {
    return this.zatcaService.getComplianceCsidCustodyProviderConfigurationPlan();
  }

  @Get("zatca/key-custody-lifecycle")
  @RequirePermissions(PERMISSIONS.zatca.view)
  getCredentialLifecycleFoundation(@CurrentOrganizationId() organizationId: string) {
    return this.zatcaService.getZatcaCredentialLifecycleFoundation(organizationId);
  }

  @Get("zatca/egs-units/:id/key-custody-lifecycle")
  @RequirePermissions(PERMISSIONS.zatca.view)
  getEgsCredentialLifecycle(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.zatcaService.getEgsUnitCredentialLifecycleMetadata(organizationId, id);
  }

  @Patch("zatca/egs-units/:id/key-custody-lifecycle")
  @RequirePermissions(PERMISSIONS.zatca.manage)
  updateEgsCredentialLifecycle(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: UpdateZatcaCredentialLifecycleDto,
  ) {
    return this.zatcaService.upsertEgsUnitCredentialLifecycleMetadata(organizationId, user.id, id, dto);
  }

  @Post("zatca/key-custody-lifecycle/:id/disable")
  @RequirePermissions(PERMISSIONS.zatca.manage)
  disableCredentialLifecycle(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: ZatcaCredentialLifecycleActionDto,
  ) {
    return this.zatcaService.disableCredentialLifecycleMetadata(organizationId, user.id, id, dto);
  }

  @Post("zatca/key-custody-lifecycle/:id/revoke")
  @RequirePermissions(PERMISSIONS.zatca.manage)
  revokeCredentialLifecycle(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: ZatcaCredentialLifecycleActionDto,
  ) {
    return this.zatcaService.revokeCredentialLifecycleMetadata(organizationId, user.id, id, dto);
  }

  @Get("zatca/egs-units/:id/compliance-csid-custody-records")
  @RequirePermissions(PERMISSIONS.zatca.view)
  listComplianceCsidCustodyRecords(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.zatcaService.listComplianceCsidCustodyRecords(organizationId, id);
  }

  @Post("zatca/egs-units/:id/compliance-csid-custody-records")
  @RequirePermissions(PERMISSIONS.zatca.manage)
  createComplianceCsidCustodyRecord(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: CreateComplianceCsidCustodyRecordDto,
  ) {
    return this.zatcaService.createComplianceCsidCustodyRecord(organizationId, user.id, id, dto);
  }

  @Post("zatca/compliance-csid-custody-records/:id/revoke")
  @RequirePermissions(PERMISSIONS.zatca.manage)
  revokeComplianceCsidCustodyRecord(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: RevokeComplianceCsidCustodyRecordDto,
  ) {
    return this.zatcaService.revokeComplianceCsidCustodyRecord(organizationId, user.id, id, dto);
  }

  @Post("zatca/egs-units/:id/compliance-csid-request-dry-run")
  @RequirePermissions(PERMISSIONS.zatca.manage)
  getEgsComplianceCsidRequestDryRun(@CurrentOrganizationId() organizationId: string, @Param("id") id: string, @Body() dto: ComplianceCsidRequestDryRunDto) {
    return this.zatcaService.getEgsUnitComplianceCsidRequestDryRun(organizationId, id, dto);
  }

  @Get("zatca/egs-units/:id/csr")
  @RequirePermissions(PERMISSIONS.zatca.view)
  async getEgsCsr(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return { csrPem: await this.zatcaService.getEgsCsr(organizationId, id) };
  }

  @Get("zatca/egs-units/:id/csr/download")
  @RequirePermissions(PERMISSIONS.zatca.view)
  async downloadEgsCsr(@CurrentOrganizationId() organizationId: string, @Param("id") id: string, @Res({ passthrough: true }) response: Response) {
    const egsUnit = await this.zatcaService.getEgsUnit(organizationId, id);
    const csrPem = await this.zatcaService.getEgsCsr(organizationId, id);
    const buffer = Buffer.from(csrPem, "utf8");
    const filename = `zatca-egs-${safeFilename(egsUnit.name)}-csr.pem`;
    response.set({
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(buffer.byteLength),
    });
    return new StreamableFile(buffer);
  }

  @Post("zatca/egs-units/:id/request-compliance-csid")
  @RequirePermissions(PERMISSIONS.zatca.manage)
  requestComplianceCsid(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: RequestComplianceCsidDto,
  ) {
    return this.zatcaService.requestComplianceCsid(organizationId, user.id, id, dto);
  }

  @Post("zatca/egs-units/:id/request-production-csid")
  @RequirePermissions(PERMISSIONS.zatca.manage)
  requestProductionCsid(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.zatcaService.requestProductionCsid(organizationId, user.id, id);
  }

  @Get("zatca/signed-artifact-storage/probe-plan")
  @RequirePermissions(PERMISSIONS.zatca.view)
  signedArtifactStorageProbePlan(@CurrentOrganizationId() organizationId: string) {
    return this.zatcaService.getSignedArtifactStorageProbePlan(organizationId);
  }

  @Post("zatca/signed-artifact-storage/probe")
  @RequirePermissions(PERMISSIONS.zatca.manage)
  runSignedArtifactStorageProbe(@CurrentOrganizationId() organizationId: string) {
    return this.zatcaService.runSignedArtifactStorageProbe(organizationId);
  }

  @Get("zatca/signed-artifact-storage/immutable-policy-plan")
  @RequirePermissions(PERMISSIONS.zatca.view)
  signedArtifactImmutableStoragePolicyPlan(@CurrentOrganizationId() organizationId: string) {
    return this.zatcaService.getSignedArtifactImmutableStoragePolicyPlan(organizationId);
  }

  @Get("zatca/signed-artifact-storage/policy-approvals")
  @RequirePermissions(PERMISSIONS.zatca.view)
  listSignedArtifactStoragePolicyApprovals(@CurrentOrganizationId() organizationId: string) {
    return this.zatcaService.listSignedArtifactStoragePolicyApprovals(organizationId);
  }

  @Post("zatca/signed-artifact-storage/policy-approvals")
  @RequirePermissions(PERMISSIONS.zatca.manage)
  createSignedArtifactStoragePolicyApproval(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateZatcaStoragePolicyApprovalDto,
  ) {
    return this.zatcaService.createSignedArtifactStoragePolicyApproval(organizationId, user.id, dto);
  }

  @Post("zatca/signed-artifact-storage/policy-approvals/:id/approve")
  @RequirePermissions(PERMISSIONS.zatca.manage)
  approveSignedArtifactStoragePolicyApproval(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: ApproveZatcaStoragePolicyApprovalDto,
  ) {
    return this.zatcaService.approveSignedArtifactStoragePolicyApproval(organizationId, user.id, id, dto);
  }

  @Post("zatca/signed-artifact-storage/policy-approvals/:id/revoke")
  @RequirePermissions(PERMISSIONS.zatca.manage)
  revokeSignedArtifactStoragePolicyApproval(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: RevokeZatcaStoragePolicyApprovalDto,
  ) {
    return this.zatcaService.revokeSignedArtifactStoragePolicyApproval(organizationId, user.id, id, dto);
  }

  @Get("zatca/signed-artifact-storage/control-evidence")
  @RequirePermissions(PERMISSIONS.zatca.view)
  listSignedArtifactStorageControlEvidence(@CurrentOrganizationId() organizationId: string) {
    return this.zatcaService.listSignedArtifactStorageControlEvidence(organizationId);
  }

  @Get("zatca/signed-artifact-storage/evidence-completeness")
  @RequirePermissions(PERMISSIONS.zatca.view)
  signedArtifactStorageEvidenceCompleteness(@CurrentOrganizationId() organizationId: string) {
    return this.zatcaService.getSignedArtifactStorageEvidenceCompleteness(organizationId);
  }

  @Post("zatca/signed-artifact-storage/control-evidence")
  @RequirePermissions(PERMISSIONS.zatca.manage)
  createSignedArtifactStorageControlEvidence(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateZatcaStorageControlEvidenceDto,
  ) {
    return this.zatcaService.createSignedArtifactStorageControlEvidence(organizationId, user.id, dto);
  }

  @Post("zatca/signed-artifact-storage/control-evidence/:id/verify")
  @RequirePermissions(PERMISSIONS.zatca.manage)
  verifySignedArtifactStorageControlEvidence(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: VerifyZatcaStorageControlEvidenceDto,
  ) {
    return this.zatcaService.verifySignedArtifactStorageControlEvidence(organizationId, user.id, id, dto);
  }

  @Post("zatca/signed-artifact-storage/control-evidence/:id/revoke")
  @RequirePermissions(PERMISSIONS.zatca.manage)
  revokeSignedArtifactStorageControlEvidence(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: RevokeZatcaStorageControlEvidenceDto,
  ) {
    return this.zatcaService.revokeSignedArtifactStorageControlEvidence(organizationId, user.id, id, dto);
  }

  @Get("sales-invoices/:id/zatca")
  @RequirePermissions(PERMISSIONS.zatca.view)
  invoiceCompliance(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.zatcaService.getInvoiceCompliance(organizationId, id);
  }

  @Get("sales-invoices/:id/zatca/readiness")
  @RequirePermissions(PERMISSIONS.zatca.view)
  invoiceReadiness(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.zatcaService.getInvoiceZatcaReadiness(organizationId, id);
  }

  @Get("sales-invoices/:id/zatca/signing-plan")
  @RequirePermissions(PERMISSIONS.zatca.view)
  invoiceSigningPlan(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.zatcaService.getInvoiceZatcaSigningPlan(organizationId, id);
  }

  @Get("sales-invoices/:id/zatca/signed-xml-promotion-plan")
  @RequirePermissions(PERMISSIONS.zatca.view)
  invoiceSignedXmlPromotionPlan(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.zatcaService.getInvoiceZatcaSignedXmlPromotionPlan(organizationId, id);
  }

  @Get("sales-invoices/:id/zatca/signed-artifact-storage-plan")
  @RequirePermissions(PERMISSIONS.zatca.view)
  invoiceSignedArtifactStoragePlan(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.zatcaService.getInvoiceZatcaSignedArtifactStoragePlan(organizationId, id);
  }

  @Get("sales-invoices/:id/zatca/signed-artifact-drafts")
  @RequirePermissions(PERMISSIONS.zatca.view)
  listInvoiceZatcaSignedArtifactDrafts(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.zatcaService.listInvoiceZatcaSignedArtifactDrafts(organizationId, id);
  }

  @Post("sales-invoices/:id/zatca/signed-artifact-drafts")
  @RequirePermissions(PERMISSIONS.zatca.manage)
  createInvoiceZatcaSignedArtifactDraft(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
  ) {
    return this.zatcaService.createInvoiceZatcaSignedArtifactDraft(organizationId, user.id, id);
  }

  @Post("sales-invoices/:id/zatca/local-signing-dry-run")
  @RequirePermissions(PERMISSIONS.zatca.signingDryRun)
  invoiceLocalSigningDryRun(
    @CurrentOrganizationId() organizationId: string,
    @Param("id") id: string,
    @Body() dto: { keepTempFiles?: boolean } = {},
  ) {
    return this.zatcaService.getInvoiceZatcaLocalSigningDryRun(organizationId, id, dto);
  }

  @Post("sales-invoices/:id/zatca/local-signed-xml-validation-dry-run")
  @RequirePermissions(PERMISSIONS.zatca.signingDryRun)
  invoiceLocalSignedXmlValidationDryRun(
    @CurrentOrganizationId() organizationId: string,
    @Param("id") id: string,
    @Body() dto: { keepTempFiles?: boolean } = {},
  ) {
    return this.zatcaService.getInvoiceZatcaLocalSignedXmlValidationDryRun(organizationId, id, dto);
  }

  @Post("sales-invoices/:id/zatca/generate")
  @RequirePermissions(PERMISSIONS.zatca.generateXml)
  generateInvoiceCompliance(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.zatcaService.generateInvoiceCompliance(organizationId, user.id, id);
  }

  @Post("sales-invoices/:id/zatca/compliance-check")
  @RequirePermissions(PERMISSIONS.zatca.runChecks)
  submitInvoiceComplianceCheck(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.zatcaService.submitInvoiceComplianceCheck(organizationId, user.id, id);
  }

  @Post("sales-invoices/:id/zatca/clearance")
  @RequirePermissions(PERMISSIONS.zatca.submit)
  requestInvoiceClearance(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.zatcaService.requestInvoiceClearance(organizationId, user.id, id);
  }

  @Post("sales-invoices/:id/zatca/reporting")
  @RequirePermissions(PERMISSIONS.zatca.submit)
  requestInvoiceReporting(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.zatcaService.requestInvoiceReporting(organizationId, user.id, id);
  }

  @Get("sales-invoices/:id/zatca/xml")
  @RequirePermissions(PERMISSIONS.zatca.view)
  async invoiceXml(@CurrentOrganizationId() organizationId: string, @Param("id") id: string, @Res({ passthrough: true }) response: Response) {
    const buffer = await this.zatcaService.getInvoiceXml(organizationId, id);
    response.set({
      "Content-Type": "application/xml",
      "Content-Disposition": `attachment; filename="zatca-${id}.xml"`,
      "Content-Length": String(buffer.byteLength),
    });
    return new StreamableFile(buffer);
  }

  @Get("sales-invoices/:id/zatca/xml-validation")
  @RequirePermissions(PERMISSIONS.zatca.view)
  invoiceXmlValidation(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.zatcaService.getInvoiceXmlValidation(organizationId, id);
  }

  @Get("sales-invoices/:id/zatca/qr")
  @RequirePermissions(PERMISSIONS.zatca.view)
  invoiceQr(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.zatcaService.getInvoiceQr(organizationId, id);
  }

  @Get("zatca/submissions")
  @RequirePermissions(PERMISSIONS.zatca.view)
  submissions(@CurrentOrganizationId() organizationId: string) {
    return this.zatcaService.listSubmissions(organizationId);
  }
}

function safeFilename(value: string): string {
  return value
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "unit";
}
