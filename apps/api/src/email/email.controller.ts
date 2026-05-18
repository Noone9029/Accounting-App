import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { PERMISSIONS } from "@ledgerbyte/shared";
import { CurrentOrganizationId } from "../auth/decorators/current-organization.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { RequirePermissions } from "../auth/decorators/require-permissions.decorator";
import type { AuthenticatedUser } from "../auth/auth.types";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "../auth/guards/organization-context.guard";
import { PermissionGuard } from "../auth/guards/permission.guard";
import { CreateEmailSenderDomainEvidenceDto } from "./dto/create-email-sender-domain-evidence.dto";
import { RevokeEmailSenderDomainEvidenceDto } from "./dto/revoke-email-sender-domain-evidence.dto";
import { RunEmailDiagnosticsDto } from "./dto/run-email-diagnostics.dto";
import { SendTestEmailDto } from "./dto/send-test-email.dto";
import { VerifyEmailSenderDomainEvidenceDto } from "./dto/verify-email-sender-domain-evidence.dto";
import { EmailService } from "./email.service";

@Controller("email")
@UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionGuard)
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  @Get("readiness")
  @RequirePermissions(PERMISSIONS.emailOutbox.view, PERMISSIONS.users.manage)
  readiness(@CurrentOrganizationId() organizationId: string) {
    return this.emailService.readiness(organizationId);
  }

  @Get("diagnostics-plan")
  @RequirePermissions(PERMISSIONS.users.manage)
  diagnosticsPlan(@Query("toEmail") toEmail?: string) {
    return this.emailService.diagnosticsPlan(toEmail);
  }

  @Post("diagnostics")
  @RequirePermissions(PERMISSIONS.users.manage)
  runDiagnostics(@CurrentOrganizationId() organizationId: string, @Body() dto: RunEmailDiagnosticsDto) {
    return this.emailService.runDiagnostics({
      organizationId,
      toEmail: dto.toEmail,
    });
  }

  @Get("sender-domain-evidence")
  @RequirePermissions(PERMISSIONS.users.manage)
  listSenderDomainEvidence(@CurrentOrganizationId() organizationId: string) {
    return this.emailService.listSenderDomainEvidence(organizationId);
  }

  @Post("sender-domain-evidence")
  @RequirePermissions(PERMISSIONS.users.manage)
  createSenderDomainEvidence(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateEmailSenderDomainEvidenceDto,
  ) {
    return this.emailService.createSenderDomainEvidence(organizationId, user.id, dto);
  }

  @Post("sender-domain-evidence/:id/verify")
  @RequirePermissions(PERMISSIONS.users.manage)
  verifySenderDomainEvidence(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: VerifyEmailSenderDomainEvidenceDto,
  ) {
    return this.emailService.verifySenderDomainEvidence(organizationId, user.id, id, dto);
  }

  @Post("sender-domain-evidence/:id/revoke")
  @RequirePermissions(PERMISSIONS.users.manage)
  revokeSenderDomainEvidence(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: RevokeEmailSenderDomainEvidenceDto,
  ) {
    return this.emailService.revokeSenderDomainEvidence(organizationId, user.id, id, dto);
  }

  @Post("test-send")
  @RequirePermissions(PERMISSIONS.users.manage)
  sendTestEmail(@CurrentOrganizationId() organizationId: string, @Body() dto: SendTestEmailDto) {
    return this.emailService.sendTestEmail({
      organizationId,
      toEmail: dto.toEmail,
    });
  }

  @Get("outbox")
  @RequirePermissions(PERMISSIONS.emailOutbox.view)
  listOutbox(@CurrentOrganizationId() organizationId: string) {
    return this.emailService.list(organizationId);
  }

  @Get("outbox/:id")
  @RequirePermissions(PERMISSIONS.emailOutbox.view)
  getOutbox(@CurrentOrganizationId() organizationId: string, @Param("id") id: string) {
    return this.emailService.get(organizationId, id);
  }
}
