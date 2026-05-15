import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { EmailDeliveryStatus } from "@prisma/client";
import type { EmailMessage, EmailProvider, EmailProviderReadiness, EmailProviderResult, SmtpConfigReadiness } from "./email-provider";

type EmailProviderMode = "smtp-disabled" | "smtp" | "invalid";

@Injectable()
export class SmtpEmailProvider implements EmailProvider {
  constructor(private readonly config: ConfigService) {}

  get provider(): string {
    return this.providerMode;
  }

  readonly isMock = false;

  async send(_message: EmailMessage): Promise<EmailProviderResult> {
    return {
      provider: this.provider,
      status: EmailDeliveryStatus.FAILED,
      providerMessageId: null,
      errorMessage:
        this.providerMode === "smtp-disabled"
          ? "SMTP delivery is disabled by configuration."
          : "SMTP provider is not implemented yet. No real email was sent.",
      sentAt: null,
    };
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
      blockingReasons.push("SMTP sending is not implemented yet. Keep EMAIL_PROVIDER=mock or smtp-disabled.");
    }

    return {
      provider,
      ready: provider === "smtp-disabled" && blockingReasons.length === 0,
      blockingReasons,
      warnings,
      smtp,
      mockMode: false,
      realSendingEnabled: false,
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
    return {
      hostConfigured: Boolean(this.config.get<string>("SMTP_HOST")?.trim()),
      portConfigured: Boolean(this.config.get<string>("SMTP_PORT")?.trim()),
      userConfigured: Boolean(this.config.get<string>("SMTP_USER")?.trim()),
      passwordConfigured: Boolean(this.config.get<string>("SMTP_PASSWORD")?.trim()),
      secure: (this.config.get<string>("SMTP_SECURE")?.trim().toLowerCase() ?? "false") === "true",
    };
  }
}
