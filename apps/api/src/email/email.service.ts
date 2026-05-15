import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { EmailTemplateType, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { buildOrganizationInviteEmail, buildPasswordResetEmail, buildTestEmail } from "./email-templates";
import { EMAIL_PROVIDER, type EmailMessage, type EmailProvider } from "./email-provider";

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
    return {
      ...this.provider.readiness(),
      fromEmail: this.fromEmail,
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
    return this.config.get<string>("EMAIL_FROM")?.trim() || "no-reply@ledgerbyte.local";
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
