import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import type { AspProviderConfig, AspProviderOperationInput } from "@ledgerbyte/uae-peppol-pint-ae";
import { PERMISSIONS } from "@ledgerbyte/shared";
import { AuthenticatedUser } from "../auth/auth.types";
import { CurrentOrganizationId } from "../auth/decorators/current-organization.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { RequirePermissions } from "../auth/decorators/require-permissions.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "../auth/guards/organization-context.guard";
import { PermissionGuard } from "../auth/guards/permission.guard";
import { ComplianceCoreService } from "./compliance-core.service";

@Controller("compliance")
@UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionGuard)
export class ComplianceCoreController {
  constructor(private readonly complianceCoreService: ComplianceCoreService) {}

  @Get("readiness")
  @RequirePermissions(PERMISSIONS.compliance.view)
  readiness(@CurrentOrganizationId() organizationId: string) {
    return this.complianceCoreService.getReadiness(organizationId);
  }

  @Get("documents")
  @RequirePermissions(PERMISSIONS.compliance.view)
  documents(@CurrentOrganizationId() organizationId: string) {
    return this.complianceCoreService.listDocuments(organizationId);
  }

  @Get("documents/:id/timeline")
  @RequirePermissions(PERMISSIONS.compliance.view)
  timeline(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.complianceCoreService.getTimeline(organizationId, id);
  }

  @Get("asp-provider/readiness")
  @RequirePermissions(PERMISSIONS.compliance.view)
  aspProviderReadiness(@CurrentOrganizationId() organizationId: string) {
    return this.complianceCoreService.getAspProviderSummary(organizationId);
  }

  @Post("asp-provider/test-config")
  @RequirePermissions(PERMISSIONS.compliance.manage)
  testAspProviderConfig(@CurrentOrganizationId() organizationId: string, @Body() body: AspProviderConfig) {
    return this.complianceCoreService.testAspProviderConfig(organizationId, body);
  }

  @Post("documents/:id/asp-transmission-preview")
  @RequirePermissions(PERMISSIONS.compliance.validate)
  aspTransmissionPreview(@CurrentOrganizationId() organizationId: string, @Param("id") id: string, @Body() body: AspProviderRequestBody) {
    return this.complianceCoreService.createAspTransmissionPreview(organizationId, id, body);
  }

  @Post("documents/:id/submit-mock-provider")
  @RequirePermissions(PERMISSIONS.compliance.validate)
  submitMockProvider(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() body: AspProviderRequestBody) {
    return this.complianceCoreService.submitMockProvider(organizationId, user.id, id, body);
  }

  @Get("documents/:id/provider-status-timeline")
  @RequirePermissions(PERMISSIONS.compliance.view)
  providerStatusTimeline(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.complianceCoreService.getAspProviderStatusTimeline(organizationId, id);
  }

  @Get("sales-invoices/:invoiceId/readiness")
  @RequirePermissions(PERMISSIONS.compliance.view)
  salesInvoiceReadiness(@CurrentOrganizationId() organizationId: string, @Param("invoiceId") invoiceId: string) {
    return this.complianceCoreService.getSalesInvoiceReadiness(organizationId, invoiceId);
  }

  @Get("credit-notes/:creditNoteId/readiness")
  @RequirePermissions(PERMISSIONS.compliance.view)
  creditNoteReadiness(@CurrentOrganizationId() organizationId: string, @Param("creditNoteId") creditNoteId: string) {
    return this.complianceCoreService.getCreditNoteReadiness(organizationId, creditNoteId);
  }

  @Post("sales-invoices/:invoiceId/prepare")
  @RequirePermissions(PERMISSIONS.compliance.manage)
  prepareSalesInvoice(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("invoiceId") invoiceId: string) {
    return this.complianceCoreService.prepareSalesInvoice(organizationId, user.id, invoiceId);
  }

  @Post("credit-notes/:creditNoteId/prepare")
  @RequirePermissions(PERMISSIONS.compliance.manage)
  prepareCreditNote(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("creditNoteId") creditNoteId: string) {
    return this.complianceCoreService.prepareCreditNote(organizationId, user.id, creditNoteId);
  }

  @Post("documents/:id/validate")
  @RequirePermissions(PERMISSIONS.compliance.validate)
  validate(@CurrentOrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.complianceCoreService.validateDocument(organizationId, user.id, id);
  }
}

interface AspProviderRequestBody extends Partial<AspProviderOperationInput> {
  config?: AspProviderConfig | null;
}
