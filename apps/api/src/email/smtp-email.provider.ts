import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { EmailDeliveryStatus } from "@prisma/client";
import nodemailer from "nodemailer";
import type { EmailMessage, EmailProvider, EmailProviderReadiness, EmailProviderResult, SmtpConfigReadiness } from "./email-provider";

type EmailProviderMode = "smtp-disabled" | "smtp" | "invalid";

@Injectable()
export class SmtpEmailProvider implements EmailProvider {
  constructor(private readonly config: ConfigService) {}

  get provider(): string {
    return this.providerMode;
  }

  readonly isMock = false;

  async send(message: EmailMessage): Promise<EmailProviderResult> {
    const provider = this.providerMode;
    const readiness = this.readiness();

    if (provider === "smtp-disabled") {
      return this.failed("SMTP delivery is disabled by configuration.");
    }

    if (provider !== "smtp") {
      return this.failed("EMAIL_PROVIDER must be mock, smtp-disabled, or smtp.");
    }

    if (!readiness.ready) {
      return this.failed(`SMTP delivery is not ready: ${readiness.blockingReasons.join(" ")}`);
    }

    try {
      const config = this.smtpConfig();
      const transporter = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth: {
          user: config.user,
          pass: config.password,
        },
      });
      const info = await transporter.sendMail({
        from: message.fromEmail,
        to: message.toEmail,
        subject: message.subject,
        text: message.bodyText,
        html: message.bodyHtml ?? undefined,
      });

      return {
        provider,
        status: EmailDeliveryStatus.SENT_PROVIDER,
        providerMessageId: readProviderMessageId(info),
        errorMessage: null,
        sentAt: new Date(),
      };
    } catch {
      return this.failed("SMTP delivery failed. Check provider credentials and SMTP availability.");
    }
  }

  readiness(): EmailProviderReadiness {
    const smtp = this.smtpConfigReadiness();
    const blockingReasons: string[] = [];
    const warnings: string[] = [];
    const provider = this.providerMode;

    if (provider === "invalid") {
      blockingReasons.push("EMAIL_PROVIDER must be mock, smtp-disabled, or smtp.");
    }

    if (provider === "smtp-disabled") {
      warnings.push("SMTP provider is selected in disabled mode. No real email will be sent.");
    }

    if (provider === "smtp") {
      if (!smtp.hostConfigured) {
        blockingReasons.push("SMTP_HOST is required when EMAIL_PROVIDER=smtp.");
      }
      if (!smtp.portConfigured) {
        blockingReasons.push("SMTP_PORT is required when EMAIL_PROVIDER=smtp.");
      }
      if (!smtp.userConfigured) {
        blockingReasons.push("SMTP_USER is required when EMAIL_PROVIDER=smtp.");
      }
      if (!smtp.passwordConfigured) {
        blockingReasons.push("SMTP_PASSWORD is required when EMAIL_PROVIDER=smtp.");
      }
      if (blockingReasons.length === 0) {
        warnings.push("Real SMTP sending is enabled. Verify provider credentials, DKIM/SPF, and test-domain safety before production use.");
      }
    }

    return {
      provider,
      ready: provider !== "invalid" && blockingReasons.length === 0,
      blockingReasons,
      warnings,
      smtp,
      mockMode: false,
      realSendingEnabled: provider === "smtp" && blockingReasons.length === 0,
    };
  }

  private get providerMode(): EmailProviderMode {
    const configured = this.config.get<string>("EMAIL_PROVIDER")?.trim().toLowerCase();
    if (configured === "smtp-disabled" || configured === "smtp") {
      return configured;
    }
    return "invalid";
  }

  private smtpConfigReadiness(): SmtpConfigReadiness {
    const port = Number(this.config.get<string>("SMTP_PORT")?.trim());
    return {
      hostConfigured: Boolean(this.config.get<string>("SMTP_HOST")?.trim()),
      portConfigured: Number.isInteger(port) && port > 0,
      userConfigured: Boolean(this.config.get<string>("SMTP_USER")?.trim()),
      passwordConfigured: Boolean(this.config.get<string>("SMTP_PASSWORD")?.trim()),
      secure: (this.config.get<string>("SMTP_SECURE")?.trim().toLowerCase() ?? "false") === "true",
    };
  }

  private smtpConfig() {
    return {
      host: this.config.get<string>("SMTP_HOST")?.trim() ?? "",
      port: Number(this.config.get<string>("SMTP_PORT")?.trim()),
      user: this.config.get<string>("SMTP_USER")?.trim() ?? "",
      password: this.config.get<string>("SMTP_PASSWORD")?.trim() ?? "",
      secure: (this.config.get<string>("SMTP_SECURE")?.trim().toLowerCase() ?? "false") === "true",
    };
  }

  private failed(errorMessage: string): EmailProviderResult {
    return {
      provider: this.provider,
      status: EmailDeliveryStatus.FAILED,
      providerMessageId: null,
      errorMessage,
      sentAt: null,
    };
  }
}

function readProviderMessageId(info: unknown): string | null {
  if (typeof info === "object" && info !== null && "messageId" in info) {
    const messageId = (info as { messageId?: unknown }).messageId;
    return typeof messageId === "string" ? messageId : null;
  }
  return null;
}
