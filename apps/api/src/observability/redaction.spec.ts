import { REDACTED_DIAGNOSTIC_VALUE, redactForDiagnostics, redactHeaders, redactText } from "./redaction";

describe("observability redaction", () => {
  it("redacts sensitive keys recursively while preserving safe fields", () => {
    const redacted = redactForDiagnostics({
      requestId: "req_123",
      action: "payment.provider.received",
      password: "plain",
      nested: {
        apiKey: "sk_test_123",
        customerEmail: "customer@example.com",
        iban: "AE070331234567890123456",
        bankCredential: "wio-secret",
        providerPayload: { id: "evt_1" },
      },
      list: [{ webhookSecret: "whsec_123" }],
    });

    expect(redacted).toEqual({
      requestId: "req_123",
      action: "payment.provider.received",
      password: REDACTED_DIAGNOSTIC_VALUE,
      nested: {
        apiKey: REDACTED_DIAGNOSTIC_VALUE,
        customerEmail: REDACTED_DIAGNOSTIC_VALUE,
        iban: REDACTED_DIAGNOSTIC_VALUE,
        bankCredential: REDACTED_DIAGNOSTIC_VALUE,
        providerPayload: REDACTED_DIAGNOSTIC_VALUE,
      },
      list: [{ webhookSecret: REDACTED_DIAGNOSTIC_VALUE }],
    });
  });

  it("redacts secret-looking string values and request headers", () => {
    expect(redactText("Bearer abc.def.ghi")).toBe(REDACTED_DIAGNOSTIC_VALUE);
    expect(redactText("postgresql://user:pass@localhost:5432/ledgerbyte")).toBe(REDACTED_DIAGNOSTIC_VALUE);
    expect(redactHeaders({ authorization: "Bearer abc", cookie: "session=secret", "x-request-id": "req-1" })).toEqual({
      authorization: REDACTED_DIAGNOSTIC_VALUE,
      cookie: REDACTED_DIAGNOSTIC_VALUE,
      "x-request-id": "req-1",
    });
  });

  it("redacts invoice and payment email provider credential shapes", () => {
    const redacted = redactForDiagnostics({
      requestId: "req_email_1",
      module: "email",
      invoicePaymentProviderState: "MOCK_EMAIL",
      emailProviderCredentials: {
        smtpPassword: "smtp-password-secret",
        mailgunApiKey: "mailgun-secret",
        providerPayload: { messageId: "provider-message-id" },
      },
      delivery: {
        redactedRecipient: "p***@example.test",
        rawEmailBody: "customer@example.com invoice body",
      },
    });

    expect(redacted).toEqual({
      requestId: "req_email_1",
      module: "email",
      invoicePaymentProviderState: "MOCK_EMAIL",
      emailProviderCredentials: REDACTED_DIAGNOSTIC_VALUE,
      delivery: {
        redactedRecipient: "p***@example.test",
        rawEmailBody: REDACTED_DIAGNOSTIC_VALUE,
      },
    });
  });

  it("handles circular structures without throwing", () => {
    const value: Record<string, unknown> = { requestId: "req-1" };
    value.self = value;

    expect(redactForDiagnostics(value)).toEqual({
      requestId: "req-1",
      self: "[Circular]",
    });
  });

  it("redacts bulk import and migration payload bodies", () => {
    expect(redactForDiagnostics({
      requestId: "req-import-1",
      module: "migration-toolkit",
      importCsvContent: "name,email\nAlice,alice@example.test",
      rawJson: { name: "Alice", email: "alice@example.test" },
      normalizedJson: { email: "alice@example.test" },
      migrationPayload: { databaseUrl: "LOCAL_DATABASE_URL_PLACEHOLDER" },
    })).toEqual({
      requestId: "req-import-1",
      module: "migration-toolkit",
      importCsvContent: REDACTED_DIAGNOSTIC_VALUE,
      rawJson: REDACTED_DIAGNOSTIC_VALUE,
      normalizedJson: REDACTED_DIAGNOSTIC_VALUE,
      migrationPayload: REDACTED_DIAGNOSTIC_VALUE,
    });
  });
});
