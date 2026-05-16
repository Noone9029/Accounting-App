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
import { CreateZatcaEgsUnitDto } from "./dto/create-zatca-egs-unit.dto";
import { EnableZatcaSdkHashModeDto } from "./dto/enable-zatca-sdk-hash-mode.dto";
import { RequestComplianceCsidDto } from "./dto/request-compliance-csid.dto";
import { UpdateZatcaCsrFieldsDto } from "./dto/update-zatca-csr-fields.dto";
import { UpdateZatcaEgsUnitDto } from "./dto/update-zatca-egs-unit.dto";
import { UpdateZatcaProfileDto } from "./dto/update-zatca-profile.dto";
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

  @Post("zatca/egs-units/:id/csr-dry-run")
  @RequirePermissions(PERMISSIONS.zatca.manage)
  getEgsCsrDryRun(
    @CurrentOrganizationId() organizationId: string,
    @Param("id") id: string,
    @Body() dto: { prepareFiles?: boolean; keepTempFiles?: boolean } = {},
  ) {
    return this.zatcaService.getEgsUnitCsrDryRun(organizationId, id, dto);
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
  @RequirePermissions(PERMISSIONS.zatca.manage)
  requestInvoiceClearance(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.zatcaService.requestInvoiceClearance(organizationId, user.id, id);
  }

  @Post("sales-invoices/:id/zatca/reporting")
  @RequirePermissions(PERMISSIONS.zatca.manage)
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
