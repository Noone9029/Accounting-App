import type { EmailDeliveryStatus, EmailTemplateType } from "@prisma/client";

export const EMAIL_PROVIDER = Symbol("EMAIL_PROVIDER");

export interface EmailAttachment {
  filename: string;
  mimeType: string;
  content: Buffer;
  contentHash: string;
}

export interface EmailMessage {
  organizationId?: string | null;
  toEmail: string;
  fromEmail: string;
  subject: string;
  templateType: EmailTemplateType;
  bodyText: string;
  bodyHtml?: string | null;
  attachments?: EmailAttachment[];
}

export interface EmailProviderResult {
  provider: string;
  status: EmailDeliveryStatus;
  providerMessageId?: string | null;
  errorMessage?: string | null;
  sentAt?: Date | null;
}

export interface SmtpConfigReadiness {
  hostConfigured: boolean;
  portConfigured: boolean;
  userConfigured: boolean;
  passwordConfigured: boolean;
  secureModeConfigured: boolean;
  secure: boolean;
}

export interface EmailProviderReadiness {
  provider: string;
  ready: boolean;
  blockingReasons: string[];
  warnings: string[];
  smtp: SmtpConfigReadiness;
  mockMode: boolean;
  realSendingEnabled: boolean;
}

export interface EmailProvider {
  readonly provider: string;
  readonly isMock: boolean;
  send(message: EmailMessage): Promise<EmailProviderResult>;
  readiness(): EmailProviderReadiness;
}
