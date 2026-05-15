import type { EmailDeliveryStatus, EmailTemplateType } from "./types";

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

export function inviteAcceptPath(token: string): string {
  return `/invite/accept?token=${encodeURIComponent(token)}`;
}

export function passwordResetConfirmPath(token: string): string {
  return `/password-reset/confirm?token=${encodeURIComponent(token)}`;
}

export function isValidAuthPassword(password: string): boolean {
  return password.length >= 8;
}
