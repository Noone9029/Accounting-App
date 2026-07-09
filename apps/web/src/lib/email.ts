import type { EmailDeliveryStatus, EmailProviderName, EmailTemplateType } from "./types";

export function apGeneratedDocumentOutboxPath(generatedDocumentId: string): string {
  return `/email/ap-generated-documents/${encodeURIComponent(generatedDocumentId)}/outbox`;
}

export function emailStatusLabel(status: EmailDeliveryStatus | string): string {
  const labels: Record<EmailDeliveryStatus, string> = {
    QUEUED: "Queued",
    SENT_MOCK: "Sent (mock)",
    SENT_PROVIDER: "Sent",
    FAILED: "Failed",
  };
  return labels[status as EmailDeliveryStatus] ?? status;
}

export function emailStatusClass(status: EmailDeliveryStatus | string): string {
  if (status === "SENT_MOCK" || status === "SENT_PROVIDER") {
    return "bg-emerald-50 text-emerald-700";
  }
  if (status === "FAILED") {
    return "bg-rose-50 text-rose-700";
  }
  return "bg-slate-100 text-slate-700";
}

export function emailTemplateLabel(templateType: EmailTemplateType | string): string {
  const labels: Record<EmailTemplateType, string> = {
    ORGANIZATION_INVITE: "Organization invite",
    PASSWORD_RESET: "Password reset",
    TEST_EMAIL: "Test email",
    AP_GENERATED_DOCUMENT: "AP generated document",
    SALES_INVOICE: "Invoice email",
    INVOICE_PAYMENT_LINK: "Payment link email",
    PAYMENT_RECEIPT: "Receipt/payment confirmation",
    FAILED_DELIVERY_NOTIFICATION: "Failed delivery notification",
  };
  return labels[templateType as EmailTemplateType] ?? templateType;
}

export function invoicePaymentEmailProviderStateLabel(providerState: string): string {
  const labels: Record<string, string> = {
    NONE: "Disabled",
    MOCK_EMAIL: "Local Mock Only",
    DISABLED_PROVIDER_PLACEHOLDER: "Needs Configuration",
    FUTURE_SMTP_OR_PROVIDER: "Future Provider",
  };
  return labels[providerState] ?? providerState;
}

export function emailProviderLabel(provider: EmailProviderName): string {
  const labels: Record<string, string> = {
    mock: "Mock/local",
    "smtp-disabled": "SMTP disabled",
    smtp: "SMTP",
    invalid: "Invalid provider",
  };
  return labels[provider] ?? provider;
}

export function emailReadinessLabel(ready: boolean): string {
  return ready ? "Ready" : "Needs configuration";
}

export function emailReadinessClass(ready: boolean): string {
  return ready ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700";
}

export function emailProductionReadinessLabel(productionReady: boolean): string {
  return productionReady ? "Production email configured" : "Production email not ready";
}

export function emailDiagnosticsStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    SKIPPED_DISABLED: "Diagnostics disabled",
    ATTEMPTED: "Diagnostics attempted",
  };
  return labels[status] ?? status;
}

export function emailRelayDiagnosticsStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    NOT_RUN: "Not run",
    SKIPPED_DISABLED: "Diagnostics disabled",
    READY_FOR_NON_PRODUCTION_TEST: "Ready for non-production relay test",
    ATTEMPTED: "Diagnostics attempted",
    FAILED: "Diagnostics failed",
  };
  return labels[status] ?? status;
}

export function emailRetryProcessorStatusLabel(enabled: boolean): string {
  return enabled ? "Retry processor enabled" : "Retry processor disabled";
}

export function emailRetryWorkerStatusLabel(enabled: boolean, configured: boolean): string {
  if (!enabled) {
    return "Retry worker disabled";
  }
  return configured ? "Retry worker scheduled" : "Retry worker unscheduled";
}

export function emailProviderEventIngestionStatusLabel(ready: boolean): string {
  return ready ? "Provider events ready" : "Mock-only event ingestion";
}

export function emailWebhookVerificationStatusLabel(enabled: boolean, secretConfigured: boolean): string {
  if (!enabled) {
    return "Webhook verification disabled";
  }
  if (!secretConfigured) {
    return "Webhook secret missing";
  }
  return "Webhook verification configured";
}

export function emailSuppressionStatusLabel(configured: boolean, activeCount: number): string {
  if (!configured) {
    return "Suppression list missing";
  }
  return `${activeCount} active suppression${activeCount === 1 ? "" : "s"}`;
}

export function emailMonitoringEvidenceStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    BLOCKED: "Monitoring evidence missing",
    PARTIAL: "Partially reviewed",
    READY_FOR_REVIEW: "Ready for review",
  };
  return labels[status] ?? status;
}

export function emailSenderDomainStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    BLOCKED: "SPF/DKIM/DMARC required",
    PARTIAL: "Partially reviewed",
    READY_FOR_REVIEW: "Ready for review",
  };
  return labels[status] ?? status;
}

export function emailSenderDomainEvidenceStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    DRAFT: "Draft",
    VERIFIED: "Verified",
    REVOKED: "Revoked",
    SUPERSEDED: "Superseded",
  };
  return labels[status] ?? status;
}

export function smtpConfigStateLabel(configured: boolean): string {
  return configured ? "Configured" : "Missing";
}

export function emailProviderWarningText(provider: EmailProviderName, mockMode: boolean, realSendingEnabled: boolean): string {
  if (mockMode || provider === "mock") {
    return "Mock mode records email only; it does not send externally.";
  }
  if (provider === "smtp-disabled") {
    return "SMTP disabled mode records failed no-send attempts only.";
  }
  if (realSendingEnabled) {
    return "Real SMTP sending is enabled for explicitly requested email deliveries.";
  }
  return "SMTP sending is not ready. Review the readiness blockers before testing delivery.";
}

export function isValidTestEmailAddress(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function passwordResetGenericMessage(): string {
  return "If an account exists, password reset instructions have been sent.";
}

export function inviteAcceptPath(token: string): string {
  return `/invite/accept?token=${encodeURIComponent(token)}`;
}

export function passwordResetConfirmPath(token: string): string {
  return `/password-reset/confirm?token=${encodeURIComponent(token)}`;
}

export function isValidAuthPassword(password: string): boolean {
  return password.length >= 8;
}
