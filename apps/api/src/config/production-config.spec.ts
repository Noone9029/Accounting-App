import { REQUIRED_PERMISSIONS_KEY } from "../auth/decorators/require-permissions.decorator";
import { ObservabilityReadinessController } from "../observability/observability-readiness.controller";
import { SystemController } from "../system/system.controller";
import {
  buildConfigReadiness,
  buildStartupConfigSummary,
  resolveRuntimeEnvironment,
  validateLedgerByteConfig,
} from "./production-config";
import { PERMISSIONS } from "@ledgerbyte/shared";

const STRONG_SECRET = "a".repeat(40);
const STRIPE_PRIVATE_FIXTURE = "stripe-private-fixture-value";
const WEBHOOK_PRIVATE_FIXTURE = "webhook-private-fixture-value";
const SMTP_PRIVATE_FIXTURE = "smtp-private-fixture-value";
const S3_PRIVATE_FIXTURE = "s3-private-fixture-value";

describe("production configuration hardening", () => {
  it("accepts valid local config while keeping providers disabled or local-safe", () => {
    const readiness = buildConfigReadiness({
      APP_ENV: "local",
      NODE_ENV: "development",
      DATABASE_URL: "postgresql://accounting:accounting@localhost:5432/accounting",
      CORS_ORIGIN: "http://localhost:3000",
      AUTH_COOKIE_SECURE: "false",
    });

    expect(readiness.productionLike).toBe(false);
    expect(readiness.database.targetClass).toBe("local");
    expect(readiness.providers.ocr.status).toBe("Disabled");
    expect(readiness.providers.payment.status).toBe("Disabled");
    expect(readiness.providers.bankIntegration).toMatchObject({ status: "Disabled", mode: "NONE" });
    expect(readiness.providers.outboundWebhooks).toMatchObject({ status: "Disabled", mode: "DISABLED", externalDeliveryEnabled: false });
    expect(readiness.publicApi).toMatchObject({
      status: "Disabled",
      enabled: false,
      accessMode: "Disabled",
      publicUnauthenticatedAccess: false,
    });
    expect(readiness.blockers).toEqual([]);
    expect(() =>
      validateLedgerByteConfig({
        APP_ENV: "local",
        NODE_ENV: "development",
        DATABASE_URL: "postgresql://accounting:accounting@localhost:5432/accounting",
      }),
    ).not.toThrow();
  });

  it("accepts valid production-like config without returning raw secret values", () => {
    const readiness = buildConfigReadiness(validProductionConfig());
    const serialized = JSON.stringify(readiness);

    expect(readiness.productionLike).toBe(true);
    expect(readiness.database).toMatchObject({ targetClass: "remote", status: "Ready" });
    expect(readiness.cookieSecurity.status).toBe("Ready");
    expect(readiness.cors.status).toBe("Ready");
    expect(readiness.blockers).toEqual([]);
    expect(serialized).not.toContain(STRONG_SECRET);
    expect(serialized).not.toContain("postgresql://");
    expect(serialized).not.toContain(STRIPE_PRIVATE_FIXTURE);
    expect(serialized).not.toContain(SMTP_PRIVATE_FIXTURE);
  });

  it("rejects ambiguous or missing runtime environment values", () => {
    expect(() => resolveRuntimeEnvironment({})).toThrow("APP_ENV or NODE_ENV must be explicitly set");
    expect(() => resolveRuntimeEnvironment({ APP_ENV: "local", NODE_ENV: "production" })).toThrow("classify different production-safety modes");
    expect(() => resolveRuntimeEnvironment({ APP_ENV: "demo", NODE_ENV: "development" })).toThrow("must be one of");
  });

  it("rejects weak or default secrets in production-like modes", () => {
    expect(() =>
      validateLedgerByteConfig({
        ...validProductionConfig(),
        JWT_SECRET: "local-development-secret-change-me",
      }),
    ).toThrow("JWT_SECRET must be strong");
  });

  it("rejects localhost, SQLite, or local-file database targets in production-like modes", () => {
    expect(() =>
      validateLedgerByteConfig({
        ...validProductionConfig(),
        DATABASE_URL: "postgresql://accounting:accounting@localhost:5432/accounting",
      }),
    ).toThrow("localhost");
    expect(() =>
      validateLedgerByteConfig({
        ...validProductionConfig(),
        DATABASE_URL: "file:./dev.db",
      }),
    ).toThrow("SQLite");
  });

  it("rejects mock providers and local fake storage in production-like modes", () => {
    expect(() =>
      validateLedgerByteConfig({
        ...validProductionConfig(),
        LEDGERBYTE_DOCUMENT_EXTRACTION_PROVIDER: "MOCK",
      }),
    ).toThrow("OCR mock provider");
    expect(() =>
      validateLedgerByteConfig({
        ...validProductionConfig(),
        LEDGERBYTE_STRIPE_MOCK_LINKS_ENABLED: "true",
      }),
    ).toThrow("mock payment links");
    expect(() =>
      validateLedgerByteConfig({
        ...validProductionConfig(),
        LEDGERBYTE_BANK_INTEGRATION_PROVIDER: "MOCK_WIO",
      }),
    ).toThrow("MOCK_WIO bank integration provider");
    expect(() =>
      validateLedgerByteConfig({
        ...validProductionConfig(),
        EMAIL_PROVIDER: "mock",
      }),
    ).toThrow("Mock email provider");
    expect(() =>
      validateLedgerByteConfig({
        ...validProductionConfig(),
        LEDGERBYTE_INVOICE_PAYMENT_EMAIL_PROVIDER: "MOCK_EMAIL",
      }),
    ).toThrow("MOCK_EMAIL invoice/payment email provider");
    expect(() =>
      validateLedgerByteConfig({
        ...validProductionConfig(),
        ATTACHMENT_STORAGE_PROVIDER: "local-placeholder",
      }),
    ).toThrow("Fake local object-storage");
  });

  it("rejects disabled or partially configured providers marked ready in production-like modes", () => {
    expect(() =>
      validateLedgerByteConfig({
        ...validProductionConfig(),
        LEDGERBYTE_STRIPE_PAYMENT_LINKS_ENABLED: "true",
        LEDGERBYTE_STRIPE_SECRET_KEY: "",
      }),
    ).toThrow("Stripe payment links cannot be enabled");
    expect(() =>
      validateLedgerByteConfig({
        ...validProductionConfig(),
        LEDGERBYTE_SENTRY_ENABLED: "true",
        SENTRY_DSN: "",
      }),
    ).toThrow("Sentry cannot be enabled");
  });

  it("rejects insecure cookie and CORS wildcard settings in production-like modes", () => {
    expect(() =>
      validateLedgerByteConfig({
        ...validProductionConfig(),
        AUTH_COOKIE_SECURE: "false",
      }),
    ).toThrow("AUTH_COOKIE_SECURE=false");
    expect(() =>
      validateLedgerByteConfig({
        ...validProductionConfig(),
        CORS_ORIGIN: "*",
      }),
    ).toThrow("CORS_ORIGIN");
  });

  it("rejects public API docs, public diagnostics, and DR destructive approval in production-like modes", () => {
    expect(() =>
      validateLedgerByteConfig({
        ...validProductionConfig(),
        LEDGERBYTE_API_DOCS_ENABLED: "true",
      }),
    ).toThrow("API docs cannot be publicly exposed");
    expect(() =>
      validateLedgerByteConfig({
        ...validProductionConfig(),
        LEDGERBYTE_OBSERVABILITY_DIAGNOSTICS_PUBLIC: "true",
      }),
    ).toThrow("Observability diagnostics");
    expect(() =>
      validateLedgerByteConfig({
        ...validProductionConfig(),
        LEDGERBYTE_LOCAL_BACKUP_RESTORE_APPROVAL: "I_UNDERSTAND_THIS_MUTATES_A_DISPOSABLE_NON_PRODUCTION_TARGET",
      }),
    ).toThrow("destructive drill approval");
  });

  it("rejects mock or unapproved outbound webhook delivery in production-like modes", () => {
    expect(() =>
      validateLedgerByteConfig({
        ...validProductionConfig(),
        LEDGERBYTE_OUTBOUND_WEBHOOKS_MODE: "MOCK_LOCAL",
      }),
    ).toThrow("MOCK_LOCAL outbound webhook delivery");

    expect(() =>
      validateLedgerByteConfig({
        ...validProductionConfig(),
        LEDGERBYTE_OUTBOUND_WEBHOOKS_MODE: "PROVIDER_PLACEHOLDER",
      }),
    ).toThrow("Outbound webhook delivery cannot be enabled");

    const readiness = buildConfigReadiness({
      ...validProductionConfig(),
      LEDGERBYTE_OUTBOUND_WEBHOOKS_MODE: "PROVIDER_PLACEHOLDER",
      LEDGERBYTE_OUTBOUND_WEBHOOKS_PUBLIC_APPROVED: "true",
    });

    expect(readiness.providers.outboundWebhooks).toMatchObject({
      status: "Needs Configuration",
      mode: "PROVIDER_PLACEHOLDER",
      publicDeliveryApproved: true,
      externalDeliveryEnabled: false,
    });
    expect(readiness.blockers).toEqual([]);
  });

  it("fails closed when public API v1 is enabled without production rate-limit strategy", () => {
    expect(() =>
      validateLedgerByteConfig({
        ...validProductionConfig(),
        LEDGERBYTE_PUBLIC_API_ENABLED: "true",
      }),
    ).toThrow("Public API v1 cannot be enabled");

    const readiness = buildConfigReadiness({
      ...validProductionConfig(),
      LEDGERBYTE_PUBLIC_API_ENABLED: "true",
      LEDGERBYTE_PUBLIC_API_RATE_LIMIT_ENABLED: "true",
      LEDGERBYTE_PUBLIC_API_RATE_LIMIT_STRATEGY: "edge-gateway",
    });

    expect(readiness.publicApi).toMatchObject({
      status: "Needs Configuration",
      enabled: true,
      accessMode: "Internal Only",
      rateLimitEnabled: true,
      rateLimitStrategy: "edge-gateway",
      publicUnauthenticatedAccess: false,
    });
    expect(readiness.blockers).toEqual([]);
  });

  it("keeps API keys and OAuth placeholder-only in production-like modes", () => {
    expect(() =>
      validateLedgerByteConfig({
        ...validProductionConfig(),
        LEDGERBYTE_PUBLIC_API_KEYS_ENABLED: "true",
      }),
    ).toThrow("Public API keys are placeholder-only");
    expect(() =>
      validateLedgerByteConfig({
        ...validProductionConfig(),
        LEDGERBYTE_PUBLIC_API_OAUTH_ENABLED: "true",
      }),
    ).toThrow("Public API OAuth is placeholder-only");
  });

  it("reports invoice/payment email provider readiness without enabling sends", () => {
    const readiness = buildConfigReadiness({
      ...validProductionConfig(),
      LEDGERBYTE_INVOICE_PAYMENT_EMAIL_PROVIDER: "FUTURE_SMTP_OR_PROVIDER",
    });

    expect(readiness.providers.email).toMatchObject({
      invoicePaymentProviderState: "FUTURE_SMTP_OR_PROVIDER",
      invoicePaymentStatus: "Future Provider",
      invoicePaymentSendEnabled: false,
    });
    expect(readiness.providers.email.warnings).toEqual(expect.arrayContaining(["Invoice/payment email delivery is disabled by default and actual sending remains blocked."]));
  });

  it("redacts startup summaries and readiness payloads", () => {
    const config = validProductionConfig();
    const readiness = buildConfigReadiness(config);
    const startup = buildStartupConfigSummary(config);
    const serialized = `${JSON.stringify(readiness)} ${JSON.stringify(startup)}`;

    expect(startup.status).toBe("READY");
    expect(serialized).not.toContain(STRONG_SECRET);
    expect(serialized).not.toContain("postgresql://");
    expect(serialized).not.toContain(WEBHOOK_PRIVATE_FIXTURE);
    expect(serialized).not.toContain(SMTP_PRIVATE_FIXTURE);
    expect(serialized).not.toContain(S3_PRIVATE_FIXTURE);
    expect(readiness.noSecretsReturned).toBe(true);
    expect(startup.noSecretsReturned).toBe(true);
  });

  it("keeps config readiness and observability diagnostics admin-gated", () => {
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, SystemController.prototype.configReadiness)).toEqual([
      PERMISSIONS.auditLogs.manageRetention,
    ]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, ObservabilityReadinessController.prototype.read)).toEqual([
      PERMISSIONS.users.manage,
    ]);
  });
});

function validProductionConfig() {
  return {
    APP_ENV: "production",
    NODE_ENV: "production",
    DATABASE_URL: ["postgresql://", "ledgerbyte", ":credential-fixture@", "db.example.internal", ":5432/", "ledgerbyte"].join(""),
    JWT_SECRET: STRONG_SECRET,
    AUTH_COOKIE_SECURE: "true",
    AUTH_COOKIE_SAME_SITE: "lax",
    CORS_ORIGIN: "https://app.ledgerbyte.example",
    LEDGERBYTE_DOCUMENT_EXTRACTION_PROVIDER: "NONE",
    LEDGERBYTE_STRIPE_PAYMENT_LINKS_ENABLED: "false",
    LEDGERBYTE_STRIPE_MOCK_LINKS_ENABLED: "false",
    LEDGERBYTE_STRIPE_SECRET_KEY: STRIPE_PRIVATE_FIXTURE,
    LEDGERBYTE_STRIPE_WEBHOOK_SECRET: WEBHOOK_PRIVATE_FIXTURE,
    LEDGERBYTE_BANK_INTEGRATION_PROVIDER: "NONE",
    EMAIL_PROVIDER: "smtp",
    SMTP_PASSWORD: SMTP_PRIVATE_FIXTURE,
    ATTACHMENT_STORAGE_PROVIDER: "s3",
    GENERATED_DOCUMENT_STORAGE_PROVIDER: "s3",
    S3_BUCKET: "ledgerbyte-prod-documents",
    S3_ACCESS_KEY_ID: "AKIATESTVALUE00000000",
    S3_SECRET_ACCESS_KEY: S3_PRIVATE_FIXTURE,
    LEDGERBYTE_API_DOCS_ENABLED: "false",
    LEDGERBYTE_SENTRY_ENABLED: "false",
    LEDGERBYTE_OTEL_ENABLED: "false",
  };
}
