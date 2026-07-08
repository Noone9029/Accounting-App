const REDACTED = "[REDACTED]";

const SENSITIVE_KEY_PATTERN =
  /password|passphrase|token|secret|authorization|cookie|jwt|api[-_]?key|private[-_]?key|signature|stripe[-_]?signature|webhook[-_]?secret|access[-_]?token|refresh[-_]?token|smtp|database[-_]?url|direct[-_]?url|storage[-_]?(key|secret|credential)|provider[-_]?payload|bank[-_]?(credential|secret|token|payload)|customer[-_]?email|email|payment[-_]?method|card|iban|account[-_]?number|routing[-_]?number|beneficiary[-_]?(account|iban)|contentbase64|bodybase64|pdf|xml/i;

const SENSITIVE_VALUE_PATTERN =
  /Bearer\s+[A-Za-z0-9._~+/=-]+|sk_(test|live)_[A-Za-z0-9]+|whsec_[A-Za-z0-9]+|-----BEGIN [A-Z ]+-----|postgres(ql)?:\/\/[^\s]+|AKIA[0-9A-Z]{16}|<\?xml|<Invoice\b|<\w+:Invoice\b/i;

export function redactForDiagnostics(value: unknown): unknown {
  return redactValue(value, new WeakSet<object>());
}

export function redactHeaders(headers: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!headers) {
    return {};
  }

  return redactForDiagnostics(headers) as Record<string, unknown>;
}

export function redactText(value: string): string {
  return SENSITIVE_VALUE_PATTERN.test(value) ? REDACTED : value;
}

export function isSensitiveDiagnosticKey(key: string): boolean {
  return SENSITIVE_KEY_PATTERN.test(key);
}

function redactValue(value: unknown, seen: WeakSet<object>): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => redactValue(item, seen));
  }

  if (typeof value === "string") {
    return redactText(value);
  }

  if (typeof value !== "object" || value === null) {
    return value;
  }

  if (seen.has(value)) {
    return "[Circular]";
  }
  seen.add(value);

  const redacted: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    redacted[key] = isSensitiveDiagnosticKey(key) ? REDACTED : redactValue(entry, seen);
  }
  return redacted;
}

export const REDACTED_DIAGNOSTIC_VALUE = REDACTED;
