import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { EmailDeliveryStatus, EmailTemplateType, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { buildOrganizationInviteEmail, buildPasswordResetEmail, buildTestEmail } from "./email-templates";
import { EMAIL_PROVIDER, type EmailMessage, type EmailProvider } from "./email-provider";
import { EMAIL_REDACTION_GUARANTEES, maskEmailAddress, redactEmailDiagnosticText } from "./email-redaction";

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

@Injectable()
export class EmailService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @Inject(EMAIL_PROVIDER)
    private readonly provider: EmailProvider,
  ) {}

  get isMockProvider(): boolean {
    return this.provider.isMock;
  }

  readiness() {
    const providerReadiness = this.provider.readiness();
    const fromAddressConfigured = Boolean(this.configuredFromEmail);
    const replyToConfigured = Boolean(this.config.get<string>("EMAIL_REPLY_TO")?.trim());
    const smtpHostConfigured = providerReadiness.smtp.hostConfigured;
    const smtpPortConfigured = providerReadiness.smtp.portConfigured;
    const smtpSecureModeConfigured = providerReadiness.smtp.secureModeConfigured;
    const credentialsConfigured = providerReadiness.smtp.userConfigured && providerReadiness.smtp.passwordConfigured;
    const providerConfigured = providerReadiness.provider !== "invalid";
    const productionBlockers = this.productionReadinessBlockers({
      provider: providerReadiness.provider,
      fromAddressConfigured,
      replyToConfigured,
      smtpHostConfigured,
      smtpPortConfigured,
      smtpSecureModeConfigured,
      credentialsConfigured,
      providerReady: providerReadiness.ready,
    });

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
      diagnostics: {
        executionEnabled: this.diagnosticsExecutionEnabled,
        allowedRecipientsConfigured: this.configuredList("LEDGERBYTE_EMAIL_DIAGNOSTICS_ALLOWED_RECIPIENTS").length > 0,
        allowedDomainsConfigured: this.allowedDiagnosticDomains.length > 0,
        noCustomerEmailSentByDefault: true,
      },
    };
  }

  async runDiagnostics(input: RunDiagnosticsInput) {
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

function isEmailAddress(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
