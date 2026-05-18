const SENSITIVE_ASSIGNMENT =
  /\b(password|passwd|pwd|secret|token|api[_-]?key|authorization|bearer|smtp[_-]?user|smtp[_-]?password)\b\s*[:=]\s*[^,\s;]+/gi;
const CONNECTION_URL = /\b(smtp|smtps|postgres|postgresql|mysql|redis|amqp|mongodb):\/\/[^\s]+/gi;
const AUTH_HEADER = /\bAuthorization:\s*[^\r\n]+/gi;
const BEARER_TOKEN = /\bBearer\s+[A-Za-z0-9._~+/=-]+/gi;
const PRIVATE_KEY_BLOCK = /-----BEGIN [A-Z ]*PRIVATE KEY-----/i;
const SENSITIVE_KEY_NAME = /\b(password|passwd|pwd|secret|token|api[_-]?key|authorization|auth[_-]?header|bearer|smtp[_-]?user|smtp[_-]?password|private[_-]?key|dkim[_-]?private[_-]?key)\b/i;
const CUSTOMER_EMAIL_CONTENT_KEY = /\b(body|body[_-]?text|body[_-]?html|html|message[_-]?body|raw[_-]?payload|customer[_-]?content|customer[_-]?email[_-]?content)\b/i;
const EMAIL_ADDRESS = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;

export const EMAIL_REDACTION_GUARANTEES = [
  "SMTP host, username, password, API key, token, connection URL, authorization header, private DKIM key, webhook secret, and provider secret values are not returned.",
  "Readiness and diagnostics responses expose booleans, labels, and redacted summaries only.",
  "Diagnostics does not persist message bodies or delivery records.",
  "Sender-domain evidence stores metadata only and rejects secret-bearing fields.",
  "Provider event capture stores redacted metadata only and rejects secrets, raw payloads, customer recipients in payloads, and customer message bodies.",
  "Suppression records store hashed and masked email metadata only; raw suppression emails are not returned.",
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

export function containsEmailSecret(value: unknown): boolean {
  if (value === undefined || value === null) {
    return false;
  }

  if (typeof value === "string") {
    return hasSecretText(value);
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return false;
  }

  if (Array.isArray(value)) {
    return value.some((entry) => containsEmailSecret(entry));
  }

  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).some(([key, entry]) => SENSITIVE_KEY_NAME.test(key) || containsEmailSecret(entry));
  }

  return hasSecretText(String(value));
}

export function containsCustomerEmailContent(value: unknown): boolean {
  if (value === undefined || value === null) {
    return false;
  }

  if (typeof value === "string") {
    return EMAIL_ADDRESS.test(value);
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return false;
  }

  if (Array.isArray(value)) {
    return value.some((entry) => containsCustomerEmailContent(entry));
  }

  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).some(
      ([key, entry]) => CUSTOMER_EMAIL_CONTENT_KEY.test(key) || containsCustomerEmailContent(entry),
    );
  }

  return EMAIL_ADDRESS.test(String(value));
}

function hasSecretText(value: string): boolean {
  const patterns = [PRIVATE_KEY_BLOCK, AUTH_HEADER, BEARER_TOKEN, CONNECTION_URL, SENSITIVE_ASSIGNMENT];
  return patterns.some((pattern) => {
    pattern.lastIndex = 0;
    return pattern.test(value);
  });
}
