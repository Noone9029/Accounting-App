interface OrganizationInviteTemplateInput {
  organizationName: string;
  roleName: string;
  acceptUrl: string;
  expiresInText: string;
}

interface PasswordResetTemplateInput {
  resetUrl: string;
  expiresInText: string;
}

export function buildOrganizationInviteEmail(input: OrganizationInviteTemplateInput) {
  const subject = `You're invited to ${input.organizationName} on LedgerByte`;
  const bodyText = [
    `You've been invited to join ${input.organizationName} on LedgerByte as ${input.roleName}.`,
    "",
    `Accept invitation: ${input.acceptUrl}`,
    "",
    `This invitation expires in ${input.expiresInText}.`,
    "",
    "LedgerByte",
  ].join("\n");

  return {
    subject,
    bodyText,
    bodyHtml: `<p>You've been invited to join <strong>${escapeHtml(input.organizationName)}</strong> on LedgerByte as ${escapeHtml(input.roleName)}.</p><p><a href="${escapeHtml(input.acceptUrl)}">Accept invitation</a></p><p>This invitation expires in ${escapeHtml(input.expiresInText)}.</p><p>LedgerByte</p>`,
  };
}

export function buildPasswordResetEmail(input: PasswordResetTemplateInput) {
  const subject = "Reset your LedgerByte password";
  const bodyText = [
    "A password reset was requested for your LedgerByte account.",
    "",
    `Reset password: ${input.resetUrl}`,
    "",
    `This link expires in ${input.expiresInText}.`,
    "",
    "If you did not request this, you can ignore this email.",
    "",
    "LedgerByte",
  ].join("\n");

  return {
    subject,
    bodyText,
    bodyHtml: `<p>A password reset was requested for your LedgerByte account.</p><p><a href="${escapeHtml(input.resetUrl)}">Reset password</a></p><p>This link expires in ${escapeHtml(input.expiresInText)}.</p><p>If you did not request this, you can ignore this email.</p><p>LedgerByte</p>`,
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
