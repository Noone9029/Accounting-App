const REDACTED = "[REDACTED]";

const riskyKeyFragments = [
  "password",
  "passwordhash",
  "token",
  "tokenhash",
  "secret",
  "apikey",
  "accesskey",
  "privatekey",
  "authorization",
  "base64",
  "contentbase64",
  "database_url",
  "direct_url",
  "smtp_password",
  "jwt_secret",
];

export function sanitizeAuditMetadata(value: unknown): unknown {
  return sanitizeValue(value, new WeakSet<object>());
}

function sanitizeValue(value: unknown, seen: WeakSet<object>): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item, seen));
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (!isRecord(value)) {
    return value;
  }

  if (seen.has(value)) {
    return "[Circular]";
  }
  seen.add(value);

  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [key, shouldRedactKey(key) ? REDACTED : sanitizeValue(entry, seen)]),
  );
}

function shouldRedactKey(key: string): boolean {
  const normalized = key.toLowerCase();
  return riskyKeyFragments.some((fragment) => normalized.includes(fragment));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
