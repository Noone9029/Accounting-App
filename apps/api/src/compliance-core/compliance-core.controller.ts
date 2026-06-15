import { Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
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
