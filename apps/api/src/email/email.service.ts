import { BadRequestException, Inject, Injectable, NotFoundException, Optional } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { EmailDeliveryStatus, EmailSenderDomainEvidenceStatus, EmailSenderDomainEvidenceType, EmailTemplateType, Prisma } from "@prisma/client";
import { AUDIT_ENTITY_TYPES, AUDIT_EVENTS } from "../audit-log/audit-events";
import { AuditLogService } from "../audit-log/audit-log.service";
import { PrismaService } from "../prisma/prisma.service";
import { CreateEmailSenderDomainEvidenceDto } from "./dto/create-email-sender-domain-evidence.dto";
import { RevokeEmailSenderDomainEvidenceDto } from "./dto/revoke-email-sender-domain-evidence.dto";
import { VerifyEmailSenderDomainEvidenceDto } from "./dto/verify-email-sender-domain-evidence.dto";
import { buildOrganizationInviteEmail, buildPasswordResetEmail, buildTestEmail } from "./email-templates";
import { EMAIL_PROVIDER, type EmailMessage, type EmailProvider } from "./email-provider";
import { EMAIL_REDACTION_GUARANTEES, containsEmailSecret, maskEmailAddress, redactEmailDiagnosticText } from "./email-redaction";

interface SendOrganizationInviteInput {
  organizationId: string;
  toEmail: string;
  organizationName: string;
  roleName: string;
  acceptUrl: string;
}

interface SendPasswordResetInput {
  organizationId?: string | null;
  toEmail: string;
  resetUrl: string;
}

interface SendTestEmailInput {
  organizationId: string;
  toEmail: string;
}

interface RunDiagnosticsInput {
  organizationId: string;
  toEmail?: string;
}

type RelayDiagnosticsStatus = "NOT_RUN" | "SKIPPED_DISABLED" | "READY_FOR_NON_PRODUCTION_TEST" | "ATTEMPTED" | "FAILED";
type SenderDomainEvidenceStatus = "BLOCKED" | "PARTIAL" | "READY_FOR_REVIEW";

const REQUIRED_SENDER_DOMAIN_EVIDENCE_TYPES = [
  EmailSenderDomainEvidenceType.SPF,
  EmailSenderDomainEvidenceType.DKIM,
  EmailSenderDomainEvidenceType.DMARC,
];

@Injectable()
export class EmailService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @Inject(EMAIL_PROVIDER)
    private readonly provider: EmailProvider,
    @Optional()
    private readonly auditLogService?: AuditLogService,
  ) {}

  get isMockProvider(): boolean {
    return this.provider.isMock;
  }

  async readiness(organizationId: string) {
    const providerReadiness = this.provider.readiness();
    const fromAddressConfigured = Boolean(this.configuredFromEmail);
    const replyToConfigured = Boolean(this.config.get<string>("EMAIL_REPLY_TO")?.trim());
    const smtpHostConfigured = providerReadiness.smtp.hostConfigured;
    const smtpPortConfigured = providerReadiness.smtp.portConfigured;
    const smtpSecureModeConfigured = providerReadiness.smtp.secureModeConfigured;
    const credentialsConfigured = providerReadiness.smtp.userConfigured && providerReadiness.smtp.passwordConfigured;
    const providerConfigured = providerReadiness.provider !== "invalid";
    const senderDomain = await this.senderDomainReadiness(organizationId);
    const relayDiagnosticsStatus = this.currentRelayDiagnosticsStatus(providerReadiness.realSendingEnabled);
    const operationalBlockers = this.operationalReadinessBlockers({
      senderDomainReady: senderDomain.productionReadyContribution,
      relayDiagnosticsStatus,
    });
    const productionBlockers = [
      ...this.productionReadinessBlockers({
      provider: providerReadiness.provider,
      fromAddressConfigured,
      replyToConfigured,
      smtpHostConfigured,
      smtpPortConfigured,
      smtpSecureModeConfigured,
      credentialsConfigured,
      providerReady: providerReadiness.ready,
      }),
      ...operationalBlockers,
    ];

    return {
      ...providerReadiness,
      fromEmail: this.fromEmail,
      localOnly: !providerReadiness.realSendingEnabled,
      noCustomerEmailSent: true,
      readOnly: true,
      noMutation: true,
      providerConfigured,
      fromAddressConfigured,
      replyToConfigured,
      smtpHostConfigured,
      smtpPortConfigured,
      smtpSecureModeConfigured,
      credentialsConfigured,
      productionReady: productionBlockers.length === 0,
      blockers: [...new Set([...providerReadiness.blockingReasons, ...productionBlockers])],
      redactionGuarantees: EMAIL_REDACTION_GUARANTEES,
      diagnostics: this.diagnosticsPlan(),
      senderDomain,
      relayDiagnosticsStatus,
      relayDiagnosticsRequired: true,
      bounceWebhookConfigured: false,
      retryPolicyConfigured: false,
      monitoringConfigured: false,
    };
  }

  diagnosticsPlan(toEmail?: string) {
    const providerReadiness = this.provider.readiness();
    return {
      executionEnabled: this.diagnosticsExecutionEnabled,
      allowedRecipientsConfigured: this.configuredList("LEDGERBYTE_EMAIL_DIAGNOSTICS_ALLOWED_RECIPIENTS").length > 0,
      allowedDomainsConfigured: this.allowedDiagnosticDomains.length > 0,
      provider: this.provider.provider,
      smtpConfigured: providerReadiness.provider === "smtp" && providerReadiness.ready,
      wouldSendToRedactedRecipient: toEmail ? maskEmailAddress(toEmail.trim().toLowerCase()) : null,
      noCustomerEmailSentByDefault: true,
      noMutationByDefault: true,
      productionReady: false,
    };
  }

  async runDiagnostics(input: RunDiagnosticsInput) {
    const plan = this.diagnosticsPlan(input.toEmail);
    if (!this.diagnosticsExecutionEnabled) {
      return {
        status: "SKIPPED_DISABLED",
        executionEnabled: false,
        executionAttempted: false,
        noEmailSent: true,
        noCustomerEmailSent: true,
        noMutation: true,
        provider: this.provider.provider,
        message: "Email diagnostics sending is disabled by default.",
        redactionGuarantees: EMAIL_REDACTION_GUARANTEES,
        plan,
      };
    }

    const toEmail = input.toEmail?.trim().toLowerCase();
    if (!toEmail) {
      throw new BadRequestException("Diagnostic recipient is required when diagnostics sending is enabled.");
    }
    if (!isEmailAddress(toEmail)) {
      throw new BadRequestException("Diagnostic recipient must be a valid email address.");
    }
    if (!this.isAllowedDiagnosticRecipient(toEmail)) {
      throw new BadRequestException("Diagnostic recipient is not allowed.");
    }

    const result = await this.provider.send({
      organizationId: input.organizationId,
      toEmail,
      fromEmail: this.fromEmail,
      subject: "LedgerByte diagnostic test email",
      templateType: EmailTemplateType.TEST_EMAIL,
      bodyText:
        "This LedgerByte diagnostic message checks email provider delivery. It contains no tenant records, invoice details, contact details, or business data.",
      bodyHtml:
        "<p>This LedgerByte diagnostic message checks email provider delivery. It contains no tenant records, invoice details, contact details, or business data.</p>",
    });

    return {
      status: "ATTEMPTED",
      executionEnabled: true,
      executionAttempted: true,
      noEmailSent: result.status !== EmailDeliveryStatus.SENT_PROVIDER,
      noCustomerEmailSent: true,
      noMutation: true,
      provider: result.provider,
      recipient: maskEmailAddress(toEmail),
      delivery: {
        provider: result.provider,
        status: result.status,
        providerMessageId: result.providerMessageId ? "present" : null,
        errorMessage: redactEmailDiagnosticText(result.errorMessage),
        sentAt: result.sentAt?.toISOString() ?? null,
      },
      redactionGuarantees: EMAIL_REDACTION_GUARANTEES,
      plan,
    };
  }

  async sendOrganizationInvite(input: SendOrganizationInviteInput) {
    const template = buildOrganizationInviteEmail({
      organizationName: input.organizationName,
      roleName: input.roleName,
      acceptUrl: input.acceptUrl,
      expiresInText: "7 days",
    });

    return this.send({
      organizationId: input.organizationId,
      toEmail: input.toEmail,
      fromEmail: this.fromEmail,
      subject: template.subject,
      templateType: EmailTemplateType.ORGANIZATION_INVITE,
      bodyText: template.bodyText,
      bodyHtml: template.bodyHtml,
    });
  }

  async sendPasswordReset(input: SendPasswordResetInput) {
    const template = buildPasswordResetEmail({
      resetUrl: input.resetUrl,
      expiresInText: "1 hour",
    });

    return this.send({
      organizationId: input.organizationId ?? null,
      toEmail: input.toEmail,
      fromEmail: this.fromEmail,
      subject: template.subject,
      templateType: EmailTemplateType.PASSWORD_RESET,
      bodyText: template.bodyText,
      bodyHtml: template.bodyHtml,
    });
  }

  async sendTestEmail(input: SendTestEmailInput) {
    const template = buildTestEmail({ provider: this.provider.provider });

    return this.send({
      organizationId: input.organizationId,
      toEmail: input.toEmail,
      fromEmail: this.fromEmail,
      subject: template.subject,
      templateType: EmailTemplateType.TEST_EMAIL,
      bodyText: template.bodyText,
      bodyHtml: template.bodyHtml,
    });
  }

  async listSenderDomainEvidence(organizationId: string) {
    return {
      metadataOnly: true,
      noCustomerEmail: true,
      noEmailSent: true,
      noOutboxRecord: true,
      redactionGuarantees: EMAIL_REDACTION_GUARANTEES,
      evidence: await this.prisma.emailSenderDomainEvidence.findMany({
        where: { organizationId },
        orderBy: [{ domain: "asc" }, { evidenceType: "asc" }, { createdAt: "desc" }],
        select: EMAIL_SENDER_DOMAIN_EVIDENCE_SELECT,
      }),
    };
  }

  async createSenderDomainEvidence(organizationId: string, actorUserId: string, dto: CreateEmailSenderDomainEvidenceDto) {
    this.assertEvidenceContainsNoSecrets(dto);
    const domain = normalizeDomain(dto.domain);
    const provider = normalizeOptionalText(dto.provider);
    const note = normalizeOptionalText(dto.note);

    await this.prisma.emailSenderDomainEvidence.updateMany({
      where: {
        organizationId,
        domain,
        evidenceType: dto.evidenceType,
        status: { in: [EmailSenderDomainEvidenceStatus.DRAFT, EmailSenderDomainEvidenceStatus.VERIFIED] },
      },
      data: { status: EmailSenderDomainEvidenceStatus.SUPERSEDED, productionReadyContribution: false },
    });

    const evidence = await this.prisma.emailSenderDomainEvidence.create({
      data: {
        organizationId,
        createdById: actorUserId,
        domain,
        evidenceType: dto.evidenceType,
        provider,
        evidenceSummaryJson: sanitizeEvidenceSummary(dto.evidenceSummaryJson),
        note,
        status: EmailSenderDomainEvidenceStatus.DRAFT,
        productionReadyContribution: false,
      },
      select: EMAIL_SENDER_DOMAIN_EVIDENCE_SELECT,
    });

    await this.auditLogService?.log({
      organizationId,
      actorUserId,
      action: AUDIT_EVENTS.EMAIL_SENDER_DOMAIN_EVIDENCE_CREATED,
      entityType: AUDIT_ENTITY_TYPES.EMAIL_SENDER_DOMAIN_EVIDENCE,
      entityId: evidence.id,
      after: evidence,
    });

    return this.senderDomainEvidenceResponse(evidence);
  }

  async verifySenderDomainEvidence(organizationId: string, actorUserId: string, id: string, dto: VerifyEmailSenderDomainEvidenceDto = {}) {
    const existing = await this.prisma.emailSenderDomainEvidence.findFirst({
      where: { id, organizationId },
      select: EMAIL_SENDER_DOMAIN_EVIDENCE_SELECT,
    });

    if (!existing) {
      throw new NotFoundException("Email sender-domain evidence not found.");
    }
    if (existing.status !== EmailSenderDomainEvidenceStatus.DRAFT) {
      throw new BadRequestException("Only draft sender-domain evidence can be verified.");
    }
    this.assertEvidenceContainsNoSecrets(existing);
    this.assertEvidenceContainsNoSecrets(dto);

    const contributionRequested = dto.productionReadyContribution ?? isProductionReadyEvidenceType(existing.evidenceType);
    const productionReadyContribution = contributionRequested && isProductionReadyEvidenceType(existing.evidenceType);
    const verified = await this.prisma.emailSenderDomainEvidence.update({
      where: { id },
      data: {
        status: EmailSenderDomainEvidenceStatus.VERIFIED,
        verifiedById: actorUserId,
        verifiedAt: new Date(),
        note: normalizeOptionalText(dto.note) ?? existing.note,
        productionReadyContribution,
      },
      select: EMAIL_SENDER_DOMAIN_EVIDENCE_SELECT,
    });

    await this.auditLogService?.log({
      organizationId,
      actorUserId,
      action: AUDIT_EVENTS.EMAIL_SENDER_DOMAIN_EVIDENCE_VERIFIED,
      entityType: AUDIT_ENTITY_TYPES.EMAIL_SENDER_DOMAIN_EVIDENCE,
      entityId: verified.id,
      before: existing,
      after: verified,
    });

    return this.senderDomainEvidenceResponse(verified);
  }

  async revokeSenderDomainEvidence(organizationId: string, actorUserId: string, id: string, dto: RevokeEmailSenderDomainEvidenceDto = {}) {
    const existing = await this.prisma.emailSenderDomainEvidence.findFirst({
      where: { id, organizationId },
      select: EMAIL_SENDER_DOMAIN_EVIDENCE_SELECT,
    });

    if (!existing) {
      throw new NotFoundException("Email sender-domain evidence not found.");
    }
    if (existing.status === EmailSenderDomainEvidenceStatus.REVOKED) {
      throw new BadRequestException("Email sender-domain evidence is already revoked.");
    }
    this.assertEvidenceContainsNoSecrets(dto);

    const revoked = await this.prisma.emailSenderDomainEvidence.update({
      where: { id },
      data: {
        status: EmailSenderDomainEvidenceStatus.REVOKED,
        revokedById: actorUserId,
        revokedAt: new Date(),
        note: normalizeOptionalText(dto.note) ?? existing.note,
        productionReadyContribution: false,
      },
      select: EMAIL_SENDER_DOMAIN_EVIDENCE_SELECT,
    });

    await this.auditLogService?.log({
      organizationId,
      actorUserId,
      action: AUDIT_EVENTS.EMAIL_SENDER_DOMAIN_EVIDENCE_REVOKED,
      entityType: AUDIT_ENTITY_TYPES.EMAIL_SENDER_DOMAIN_EVIDENCE,
      entityId: revoked.id,
      before: existing,
      after: revoked,
    });

    return this.senderDomainEvidenceResponse(revoked);
  }

  list(organizationId: string) {
    return this.prisma.emailOutbox.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      select: EMAIL_OUTBOX_LIST_SELECT,
    });
  }

  async get(organizationId: string, id: string) {
    const email = await this.prisma.emailOutbox.findFirst({
      where: { id, organizationId },
      select: EMAIL_OUTBOX_DETAIL_SELECT,
    });

    if (!email) {
      throw new NotFoundException("Email outbox record not found.");
    }

    return email;
  }

  private async send(message: EmailMessage) {
    const result = await this.provider.send(message);
    return this.prisma.emailOutbox.create({
      data: {
        organizationId: message.organizationId ?? null,
        toEmail: message.toEmail,
        fromEmail: message.fromEmail,
        subject: message.subject,
        templateType: message.templateType,
        bodyText: message.bodyText,
        bodyHtml: message.bodyHtml ?? null,
        status: result.status,
        provider: result.provider,
        providerMessageId: result.providerMessageId ?? null,
        errorMessage: result.errorMessage ?? null,
        sentAt: result.sentAt ?? null,
      },
      select: EMAIL_OUTBOX_DETAIL_SELECT,
    });
  }

  private get fromEmail(): string {
    return this.configuredFromEmail || "no-reply@ledgerbyte.local";
  }

  private get configuredFromEmail(): string {
    return this.config.get<string>("EMAIL_FROM")?.trim() ?? "";
  }

  private get diagnosticsExecutionEnabled(): boolean {
    return this.config.get<string>("LEDGERBYTE_EMAIL_DIAGNOSTICS_SEND_ENABLED")?.trim().toLowerCase() === "true";
  }

  private get allowedDiagnosticDomains(): string[] {
    return [...this.configuredList("LEDGERBYTE_EMAIL_DIAGNOSTICS_ALLOWED_DOMAINS"), "example.test", "ledgerbyte.local"];
  }

  private configuredList(key: string): string[] {
    return (
      this.config
        .get<string>(key)
        ?.split(",")
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean) ?? []
    );
  }

  private isAllowedDiagnosticRecipient(email: string): boolean {
    const allowedRecipients = new Set(this.configuredList("LEDGERBYTE_EMAIL_DIAGNOSTICS_ALLOWED_RECIPIENTS"));
    if (allowedRecipients.has(email)) {
      return true;
    }

    const domain = email.split("@")[1]?.toLowerCase();
    return Boolean(domain && this.allowedDiagnosticDomains.includes(domain));
  }

  private async senderDomainReadiness(organizationId: string) {
    const fromDomain = emailDomain(this.fromEmail);
    const replyToDomain = emailDomain(this.config.get<string>("EMAIL_REPLY_TO")?.trim() ?? "");
    const evidence = await this.prisma.emailSenderDomainEvidence.findMany({
      where: { organizationId },
      select: EMAIL_SENDER_DOMAIN_EVIDENCE_SELECT,
    });
    const verifiedEvidenceTypes = REQUIRED_SENDER_DOMAIN_EVIDENCE_TYPES.filter((evidenceType) =>
      evidence.some(
        (entry) =>
          entry.domain === fromDomain &&
          entry.evidenceType === evidenceType &&
          entry.status === EmailSenderDomainEvidenceStatus.VERIFIED &&
          entry.productionReadyContribution,
      ),
    );
    const missingEvidenceTypes = REQUIRED_SENDER_DOMAIN_EVIDENCE_TYPES.filter((evidenceType) => !verifiedEvidenceTypes.includes(evidenceType));
    const evidenceStatus: SenderDomainEvidenceStatus =
      missingEvidenceTypes.length === 0 && fromDomain ? "READY_FOR_REVIEW" : verifiedEvidenceTypes.length > 0 ? "PARTIAL" : "BLOCKED";
    const blockers: string[] = [];
    const warnings = [
      "Sender-domain evidence is manual metadata capture only. No live DNS lookup is performed.",
      "DNS provider secrets, SMTP credentials, API keys, tokens, authorization headers, connection URLs, and private DKIM keys must not be stored.",
    ];

    if (!fromDomain) {
      blockers.push("Email from domain is required before sender-domain evidence can be reviewed.");
    }
    if (missingEvidenceTypes.length > 0) {
      blockers.push("SPF, DKIM, and DMARC evidence must be captured before production email readiness review.");
    }
    if (replyToDomain && fromDomain && replyToDomain !== fromDomain) {
      warnings.push("Reply-to domain differs from the sender domain and should be separately reviewed before production rollout.");
    }

    return {
      fromDomain,
      replyToDomain,
      evidenceRequired: true,
      requiredEvidenceTypes: REQUIRED_SENDER_DOMAIN_EVIDENCE_TYPES,
      verifiedEvidenceTypes,
      missingEvidenceTypes,
      evidenceStatus,
      productionReadyContribution: evidenceStatus === "READY_FOR_REVIEW",
      blockers,
      warnings,
    };
  }

  private currentRelayDiagnosticsStatus(realSendingEnabled: boolean): RelayDiagnosticsStatus {
    if (!this.diagnosticsExecutionEnabled) {
      return "SKIPPED_DISABLED";
    }
    if (realSendingEnabled && (this.configuredList("LEDGERBYTE_EMAIL_DIAGNOSTICS_ALLOWED_RECIPIENTS").length > 0 || this.allowedDiagnosticDomains.length > 0)) {
      return "READY_FOR_NON_PRODUCTION_TEST";
    }
    return "NOT_RUN";
  }

  private operationalReadinessBlockers(input: { senderDomainReady: boolean; relayDiagnosticsStatus: RelayDiagnosticsStatus }): string[] {
    const blockers: string[] = [];

    if (!input.senderDomainReady) {
      blockers.push("Sender domain SPF/DKIM/DMARC evidence is required before production email delivery.");
    }
    if (input.relayDiagnosticsStatus !== "ATTEMPTED") {
      blockers.push("Non-production relay diagnostics must be completed before production email delivery is considered ready.");
    }
    blockers.push("Bounce webhook handling is not configured.");
    blockers.push("Email retry policy is not configured.");
    blockers.push("Email monitoring is not configured.");

    return blockers;
  }

  private senderDomainEvidenceResponse(evidence: unknown) {
    return {
      metadataOnly: true,
      noCustomerEmail: true,
      noEmailSent: true,
      noOutboxRecord: true,
      redactionGuarantees: EMAIL_REDACTION_GUARANTEES,
      evidence,
    };
  }

  private assertEvidenceContainsNoSecrets(value: unknown) {
    if (containsEmailSecret(value)) {
      throw new BadRequestException("Email sender-domain evidence must not contain secrets.");
    }
  }

  private productionReadinessBlockers(input: {
    provider: string;
    fromAddressConfigured: boolean;
    replyToConfigured: boolean;
    smtpHostConfigured: boolean;
    smtpPortConfigured: boolean;
    smtpSecureModeConfigured: boolean;
    credentialsConfigured: boolean;
    providerReady: boolean;
  }): string[] {
    const blockers: string[] = [];

    if (input.provider !== "smtp") {
      blockers.push("SMTP provider must be enabled before production email delivery is considered ready.");
    }
    if (!input.providerReady) {
      blockers.push("Email provider readiness blockers must be resolved before production delivery.");
    }
    if (!input.fromAddressConfigured) {
      blockers.push("Email from address must be configured for production delivery.");
    }
    if (!input.replyToConfigured) {
      blockers.push("Email reply-to address should be configured for production support workflows.");
    }
    if (input.provider === "smtp" && !input.smtpHostConfigured) {
      blockers.push("SMTP host is required when SMTP delivery is enabled.");
    }
    if (input.provider === "smtp" && !input.smtpPortConfigured) {
      blockers.push("SMTP port is required when SMTP delivery is enabled.");
    }
    if (input.provider === "smtp" && !input.smtpSecureModeConfigured) {
      blockers.push("SMTP secure mode must be explicitly configured as true or false.");
    }
    if (input.provider === "smtp" && !input.credentialsConfigured) {
      blockers.push("SMTP credentials are required when SMTP delivery is enabled.");
    }

    return blockers;
  }
}

const EMAIL_OUTBOX_LIST_SELECT = {
  id: true,
  organizationId: true,
  toEmail: true,
  fromEmail: true,
  subject: true,
  templateType: true,
  status: true,
  provider: true,
  providerMessageId: true,
  errorMessage: true,
  sentAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.EmailOutboxSelect;

const EMAIL_OUTBOX_DETAIL_SELECT = {
  ...EMAIL_OUTBOX_LIST_SELECT,
  bodyText: true,
  bodyHtml: true,
} satisfies Prisma.EmailOutboxSelect;

const EMAIL_SENDER_DOMAIN_EVIDENCE_SELECT = {
  id: true,
  organizationId: true,
  domain: true,
  status: true,
  evidenceType: true,
  provider: true,
  evidenceSummaryJson: true,
  verifiedById: true,
  verifiedAt: true,
  revokedById: true,
  revokedAt: true,
  note: true,
  productionReadyContribution: true,
  createdById: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.EmailSenderDomainEvidenceSelect;

function isEmailAddress(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function emailDomain(email: string): string | null {
  const domain = email.trim().toLowerCase().split("@")[1];
  return domain && isDomainName(domain) ? domain : null;
}

function normalizeDomain(value: string): string {
  const trimmed = value.trim().toLowerCase().replace(/^@/, "");
  const domain = trimmed.includes("@") ? trimmed.split("@").pop() ?? "" : trimmed;
  if (!isDomainName(domain)) {
    throw new BadRequestException("Sender-domain evidence requires a valid domain.");
  }
  return domain;
}

function isDomainName(value: string): boolean {
  if (value.length === 0 || value.length > 253 || !value.includes(".")) {
    return false;
  }
  return value.split(".").every((label) => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label));
}

function normalizeOptionalText(value?: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function sanitizeEvidenceSummary(value: Record<string, unknown>): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? {})) as Prisma.InputJsonValue;
}

function isProductionReadyEvidenceType(evidenceType: EmailSenderDomainEvidenceType): boolean {
  return evidenceType !== EmailSenderDomainEvidenceType.OTHER;
}
