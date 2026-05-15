import type { EmailDeliveryStatus, EmailProviderName, EmailTemplateType } from "./types";

export function emailStatusLabel(status: EmailDeliveryStatus | string): string {
  const labels: Record<EmailDeliveryStatus, string> = {
    QUEUED: "Queued",
    SENT_MOCK: "Sent (mock)",
    FAILED: "Failed",
  };
  return labels[status as EmailDeliveryStatus] ?? status;
}

export function emailStatusClass(status: EmailDeliveryStatus | string): string {
  if (status === "SENT_MOCK") {
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
