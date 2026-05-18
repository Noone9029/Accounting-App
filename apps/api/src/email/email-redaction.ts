const SENSITIVE_ASSIGNMENT =
  /\b(password|passwd|pwd|secret|token|api[_-]?key|authorization|bearer|smtp[_-]?user|smtp[_-]?password)\b\s*[:=]\s*[^,\s;]+/gi;
const CONNECTION_URL = /\b(smtp|smtps|postgres|postgresql|mysql|redis|amqp|mongodb):\/\/[^\s]+/gi;
const AUTH_HEADER = /\bAuthorization:\s*[^\r\n]+/gi;
const BEARER_TOKEN = /\bBearer\s+[A-Za-z0-9._~+/=-]+/gi;

export const EMAIL_REDACTION_GUARANTEES = [
  "SMTP host, username, password, API key, token, connection URL, authorization header, and provider secret values are not returned.",
  "Readiness and diagnostics responses expose booleans, labels, and redacted summaries only.",
  "Diagnostics does not persist message bodies or delivery records.",
];

export function redactEmailDiagnosticText(value: unknown): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  const text = typeof value === "string" ? value : JSON.stringify(value);
  if (!text) {
    return null;
  }

  return text
    .replace(AUTH_HEADER, "Authorization: [redacted]")
    .replace(BEARER_TOKEN, "Bearer [redacted]")
    .replace(CONNECTION_URL, "$1://[redacted]")
    .replace(SENSITIVE_ASSIGNMENT, "$1=[redacted]");
}

export function maskEmailAddress(email: string): string {
  const [localPart, domain] = email.trim().split("@");
  if (!localPart || !domain) {
    return "[redacted-email]";
  }

  const prefix = localPart.slice(0, 1);
  return `${prefix}***@${domain}`;
}
