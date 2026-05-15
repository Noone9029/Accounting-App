import type { EmailDeliveryStatus, EmailProviderName, EmailTemplateType } from "./types";

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
  };
  return labels[templateType as EmailTemplateType] ?? templateType;
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
