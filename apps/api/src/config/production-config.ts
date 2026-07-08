import { redactText } from "../observability/redaction";

export type LedgerByteAppEnvironment = "local" | "test" | "staging" | "beta" | "production";
export type ConfigReadinessStatus = "Ready" | "Blocked" | "Disabled" | "Needs Configuration";
export type DatabaseTargetClass = "missing" | "invalid" | "local" | "remote" | "sqlite-or-file";

export interface RuntimeEnvironmentSummary {
  appEnvironment: LedgerByteAppEnvironment;
  nodeEnvironment: string;
  productionLike: boolean;
}

export interface ConfigReadinessItem {
  status: ConfigReadinessStatus;
  configured: boolean;
  blockers: string[];
  warnings: string[];
}

export interface ConfigReadinessSummary {
  appEnvironment: LedgerByteAppEnvironment;
  nodeEnvironment: string;
  productionLike: boolean;
  database: ConfigReadinessItem & {
    targetClass: DatabaseTargetClass;
  };
  jwt: ConfigReadinessItem;
  cookieSecurity: ConfigReadinessItem;
  cors: ConfigReadinessItem;
  providers: {
    ocr: ConfigReadinessItem & { mode: string };
    payment: ConfigReadinessItem & { mode: string };
    objectStorage: ConfigReadinessItem & { attachmentMode: string; generatedDocumentMode: string };
    bankIntegration: ConfigReadinessItem & { mode: string };
    email: ConfigReadinessItem & {
      mode: string;
      invoicePaymentProviderState: string;
      invoicePaymentStatus: "Disabled" | "Local Mock Only" | "Needs Configuration" | "Future Provider";
      invoicePaymentSendEnabled: false;
    };
    outboundWebhooks: ConfigReadinessItem & { mode: string; publicDeliveryApproved: boolean; externalDeliveryEnabled: boolean };
    telemetry: ConfigReadinessItem & { sentryEnabled: boolean; openTelemetryEnabled: boolean };
  };
  apiDocs: ConfigReadinessItem & { exposed: boolean };
  publicApi: ConfigReadinessItem & {
    enabled: boolean;
    version: "v1";
    accessMode: "Disabled" | "Internal Only";
    rateLimitEnabled: boolean;
    rateLimitStrategy: string;
    apiKeysEnabled: boolean;
    oauthEnabled: boolean;
    publicUnauthenticatedAccess: false;
  };
  diagnostics: ConfigReadinessItem & { adminGuardRequired: true; publicExposureRequested: boolean };
  backupRestoreDrill: ConfigReadinessItem & { destructiveApprovalPresent: boolean };
  noSecretsReturned: true;
  warnings: string[];
  blockers: string[];
}

export interface StartupConfigSummary {
  appEnvironment: LedgerByteAppEnvironment;
  productionLike: boolean;
  status: "READY" | "BLOCKED";
  categories: Record<string, ConfigReadinessStatus>;
  noSecretsReturned: true;
  blockers: string[];
  warnings: string[];
}

type EnvSource = Record<string, string | undefined>;

const PRODUCTION_LIKE_ENVS = new Set<LedgerByteAppEnvironment>(["staging", "beta", "production"]);
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "0.0.0.0"]);
const DEFAULT_SECRET_MARKERS = /(dev-only-secret|local-development-secret-change-me|change-?me|example|sample|placeholder|password|secret|test)/i;
const TRUE_VALUES = new Set(["1", "true", "yes", "on"]);
const FALSE_VALUES = new Set(["0", "false", "no", "off"]);

export function validateLedgerByteConfig(config: EnvSource): EnvSource {
  const readiness = buildConfigReadiness(config);
  if (readiness.blockers.length > 0) {
    throw new Error(`LedgerByte configuration is blocked: ${readiness.blockers.join(" ")}`);
  }
  return config;
}

export function buildStartupConfigSummary(config: EnvSource): StartupConfigSummary {
  const readiness = buildConfigReadiness(config);
  const summary: StartupConfigSummary = {
    appEnvironment: readiness.appEnvironment,
    productionLike: readiness.productionLike,
    status: readiness.blockers.length > 0 ? "BLOCKED" : "READY",
    categories: {
      database: readiness.database.status,
      jwt: readiness.jwt.status,
      cookieSecurity: readiness.cookieSecurity.status,
      cors: readiness.cors.status,
      ocrProvider: readiness.providers.ocr.status,
      paymentProvider: readiness.providers.payment.status,
      objectStorage: readiness.providers.objectStorage.status,
      bankIntegration: readiness.providers.bankIntegration.status,
      emailProvider: readiness.providers.email.status,
      outboundWebhooks: readiness.providers.outboundWebhooks.status,
      telemetry: readiness.providers.telemetry.status,
      apiDocs: readiness.apiDocs.status,
      publicApi: readiness.publicApi.status,
      diagnostics: readiness.diagnostics.status,
      backupRestoreDrill: readiness.backupRestoreDrill.status,
    },
    noSecretsReturned: true,
    blockers: readiness.blockers,
    warnings: readiness.warnings,
  };
  return redactConfigDiagnostics(summary) as StartupConfigSummary;
}

export function buildConfigReadiness(config: EnvSource): ConfigReadinessSummary {
  const runtime = resolveRuntimeEnvironment(config);
  const productionLike = runtime.productionLike;
  const database = databaseReadiness(config, productionLike);
  const jwt = jwtReadiness(config, productionLike);
  const cookieSecurity = cookieReadiness(config, productionLike);
  const cors = corsReadiness(config, productionLike);
  const ocr = providerReadiness("ocr", normalizeProvider(config.LEDGERBYTE_DOCUMENT_EXTRACTION_PROVIDER, "NONE"), productionLike);
  const payment = paymentReadiness(config, productionLike);
  const objectStorage = objectStorageReadiness(config, productionLike);
  const bankIntegration = bankIntegrationReadiness(config, productionLike);
  const email = emailReadiness(config, productionLike);
  const outboundWebhooks = outboundWebhookReadiness(config, productionLike);
  const telemetry = telemetryReadiness(config, productionLike);
  const apiDocs = apiDocsReadiness(config, productionLike);
  const publicApi = publicApiReadiness(config, productionLike);
  const diagnostics = diagnosticsReadiness(config, productionLike);
  const backupRestoreDrill = backupRestoreReadiness(config, productionLike);
  const warnings = [
    "Config readiness is metadata-only and never returns raw environment values or secrets.",
    "This does not prove hosted production deployment, hosted PITR, object-storage recovery, live provider processing, live Wio, or ZATCA/UAE compliance.",
  ];
  const blockers = [
    ...database.blockers,
    ...jwt.blockers,
    ...cookieSecurity.blockers,
    ...cors.blockers,
    ...ocr.blockers,
    ...payment.blockers,
    ...objectStorage.blockers,
    ...bankIntegration.blockers,
    ...email.blockers,
    ...outboundWebhooks.blockers,
    ...telemetry.blockers,
    ...apiDocs.blockers,
    ...publicApi.blockers,
    ...diagnostics.blockers,
    ...backupRestoreDrill.blockers,
  ];

  const readiness: ConfigReadinessSummary = {
    appEnvironment: runtime.appEnvironment,
    nodeEnvironment: runtime.nodeEnvironment,
    productionLike,
    database,
    jwt,
    cookieSecurity,
    cors,
    providers: {
      ocr,
      payment,
      objectStorage,
      bankIntegration,
      email,
      outboundWebhooks,
      telemetry,
    },
    apiDocs,
    publicApi,
    diagnostics,
    backupRestoreDrill,
    noSecretsReturned: true,
    warnings,
    blockers,
  };

  return redactConfigDiagnostics(readiness) as ConfigReadinessSummary;
}

export function resolveRuntimeEnvironment(config: EnvSource): RuntimeEnvironmentSummary {
  const appEnvRaw = clean(config.APP_ENV);
  const nodeEnvRaw = clean(config.NODE_ENV);
  if (!appEnvRaw && !nodeEnvRaw) {
    throw new Error("APP_ENV or NODE_ENV must be explicitly set to local, test, staging, beta, or production.");
  }

  const appEnvironment = normalizeAppEnvironment(appEnvRaw ?? nodeEnvRaw);
  const nodeEnvironment = nodeEnvRaw ? normalizeNodeEnvironment(nodeEnvRaw) : appEnvironment === "test" ? "test" : appEnvironment === "local" ? "development" : "production";
  const nodeAsAppEnvironment = nodeEnvRaw ? normalizeAppEnvironment(nodeEnvRaw) : appEnvironment;
  const appProductionLike = PRODUCTION_LIKE_ENVS.has(appEnvironment);
  const nodeProductionLike = PRODUCTION_LIKE_ENVS.has(nodeAsAppEnvironment);
  if (appEnvRaw && nodeEnvRaw && appProductionLike !== nodeProductionLike) {
    throw new Error("APP_ENV and NODE_ENV classify different production-safety modes.");
  }

  return {
    appEnvironment,
    nodeEnvironment,
    productionLike: appProductionLike,
  };
}

function databaseReadiness(config: EnvSource, productionLike: boolean): ConfigReadinessSummary["database"] {
  const raw = clean(config.DATABASE_URL);
  const targetClass = classifyDatabaseTarget(raw);
  const blockers: string[] = [];
  if (productionLike) {
    if (!raw) blockers.push("DATABASE_URL is required in production-like modes.");
    if (targetClass === "local") blockers.push("DATABASE_URL must not point at localhost in production-like modes.");
    if (targetClass === "sqlite-or-file") blockers.push("SQLite or local file databases are not supported in production-like modes.");
    if (targetClass === "invalid") blockers.push("DATABASE_URL must be a valid database URL in production-like modes.");
  }
  return readiness(Boolean(raw), blockers, targetClass === "remote" ? "Ready" : raw ? "Needs Configuration" : "Disabled", [], { targetClass });
}

function jwtReadiness(config: EnvSource, productionLike: boolean): ConfigReadinessItem {
  const secret = clean(config.JWT_SECRET);
  const blockers: string[] = [];
  if (productionLike) {
    if (!secret) blockers.push("JWT_SECRET is required in production-like modes.");
    if (secret && isWeakOrDefaultSecret(secret)) blockers.push("JWT_SECRET must be strong and must not use default/example values in production-like modes.");
  }
  return readiness(Boolean(secret), blockers, secret ? "Ready" : "Needs Configuration");
}

function cookieReadiness(config: EnvSource, productionLike: boolean): ConfigReadinessItem {
  const secure = readBoolean(config.AUTH_COOKIE_SECURE);
  const sameSite = clean(config.AUTH_COOKIE_SAME_SITE).toLowerCase();
  const blockers: string[] = [];
  if (productionLike && secure === false) {
    blockers.push("AUTH_COOKIE_SECURE=false is not allowed in production-like modes.");
  }
  if (productionLike && sameSite === "none" && secure !== true) {
    blockers.push("AUTH_COOKIE_SAME_SITE=none requires AUTH_COOKIE_SECURE=true in production-like modes.");
  }
  return readiness(secure !== undefined || Boolean(sameSite), blockers, productionLike ? "Ready" : "Ready");
}

function corsReadiness(config: EnvSource, productionLike: boolean): ConfigReadinessItem {
  const origins = configuredList(config.CORS_ORIGIN);
  const blockers: string[] = [];
  if (productionLike && (origins.length === 0 || origins.includes("*") || origins.some((origin) => origin.includes("*")))) {
    blockers.push("CORS_ORIGIN must be explicit and must not include wildcards in production-like modes.");
  }
  return readiness(origins.length > 0, blockers, origins.length > 0 ? "Ready" : "Needs Configuration");
}

function providerReadiness(kind: "ocr", mode: string, productionLike: boolean): ConfigReadinessItem & { mode: string } {
  const blockers: string[] = [];
  if (productionLike && isMockMode(mode)) {
    blockers.push(`${kind.toUpperCase()} mock provider mode is not allowed in production-like modes.`);
  }
  return readiness(mode !== "NONE" && mode !== "DISABLED", blockers, mode === "NONE" || mode === "DISABLED" ? "Disabled" : "Needs Configuration", [], { mode });
}

function paymentReadiness(config: EnvSource, productionLike: boolean): ConfigReadinessItem & { mode: string } {
  const mockLinksEnabled = readBoolean(config.LEDGERBYTE_STRIPE_MOCK_LINKS_ENABLED) === true;
  const paymentLinksEnabled = readBoolean(config.LEDGERBYTE_STRIPE_PAYMENT_LINKS_ENABLED) === true;
  const secretConfigured = Boolean(clean(config.LEDGERBYTE_STRIPE_SECRET_KEY));
  const webhookConfigured = Boolean(clean(config.LEDGERBYTE_STRIPE_WEBHOOK_SECRET));
  const blockers: string[] = [];
  if (productionLike && mockLinksEnabled) blockers.push("Stripe mock payment links are not allowed in production-like modes.");
  if (productionLike && paymentLinksEnabled && (!secretConfigured || !webhookConfigured)) {
    blockers.push("Stripe payment links cannot be enabled in production-like modes without secret key and webhook secret configuration.");
  }
  const configured = paymentLinksEnabled || mockLinksEnabled || secretConfigured || webhookConfigured;
  return readiness(configured, blockers, configured ? "Needs Configuration" : "Disabled", [], { mode: mockLinksEnabled ? "MOCK" : paymentLinksEnabled ? "STRIPE" : "DISABLED" });
}

function objectStorageReadiness(config: EnvSource, productionLike: boolean): ConfigReadinessSummary["providers"]["objectStorage"] {
  const attachmentMode = normalizeProvider(config.ATTACHMENT_STORAGE_PROVIDER, "database");
  const generatedDocumentMode = normalizeProvider(config.GENERATED_DOCUMENT_STORAGE_PROVIDER, "database");
  const blockers: string[] = [];
  if (productionLike && (isLocalObjectStorageMode(attachmentMode) || isLocalObjectStorageMode(generatedDocumentMode))) {
    blockers.push("Fake local object-storage adapters are not allowed in production-like modes.");
  }
  const s3Configured = Boolean(clean(config.S3_BUCKET)) && Boolean(clean(config.S3_ACCESS_KEY_ID)) && Boolean(clean(config.S3_SECRET_ACCESS_KEY));
  const configured = attachmentMode === "s3" || generatedDocumentMode === "s3" || s3Configured;
  return readiness(configured, blockers, configured && s3Configured ? "Ready" : configured ? "Needs Configuration" : "Disabled", [], {
    attachmentMode,
    generatedDocumentMode,
  });
}

function bankIntegrationReadiness(config: EnvSource, productionLike: boolean): ConfigReadinessItem & { mode: string } {
  const mode = normalizeProvider(config.LEDGERBYTE_BANK_INTEGRATION_PROVIDER, "NONE").toUpperCase();
  const blockers: string[] = [];
  if (productionLike && mode === "MOCK_WIO") {
    blockers.push("MOCK_WIO bank integration provider is not allowed in production-like modes.");
  }
  if (mode === "WIO" || mode === "WIO_DISABLED_PLACEHOLDER") {
    return readiness(true, blockers, "Blocked", ["Real Wio provider remains a disabled placeholder. No live Wio API calls or money movement are implemented."], {
      mode: "WIO_DISABLED_PLACEHOLDER",
    });
  }
  if (mode === "MOCK_WIO") {
    return readiness(true, blockers, "Needs Configuration", ["MOCK_WIO is local/test-only and stores masked fixture metadata only."], { mode });
  }
  return readiness(false, blockers, "Disabled", ["Bank integration remains disabled by default. Manual import and reconciliation are still supported."], {
    mode: "NONE",
  });
}

function emailReadiness(config: EnvSource, productionLike: boolean): ConfigReadinessSummary["providers"]["email"] {
  const mode = normalizeProvider(config.EMAIL_PROVIDER, "smtp-disabled");
  const invoicePaymentProviderState = normalizeProvider(config.LEDGERBYTE_INVOICE_PAYMENT_EMAIL_PROVIDER, "NONE").toUpperCase();
  const blockers: string[] = [];
  if (productionLike && isMockMode(mode)) blockers.push("Mock email provider mode is not allowed in production-like modes.");
  if (productionLike && mode === "smtp" && !clean(config.SMTP_PASSWORD)) blockers.push("SMTP credentials are required when EMAIL_PROVIDER=smtp in production-like modes.");
  if (productionLike && invoicePaymentProviderState === "MOCK_EMAIL") {
    blockers.push("MOCK_EMAIL invoice/payment email provider is not allowed in production-like modes.");
  }
  return readiness(mode !== "smtp-disabled" || invoicePaymentProviderState !== "NONE", blockers, mode === "smtp-disabled" ? "Disabled" : "Needs Configuration", [
    "Invoice/payment email delivery is disabled by default and actual sending remains blocked.",
  ], {
    mode,
    invoicePaymentProviderState,
    invoicePaymentStatus: invoicePaymentProviderStateLabel(invoicePaymentProviderState),
    invoicePaymentSendEnabled: false as const,
  });
}

function outboundWebhookReadiness(config: EnvSource, productionLike: boolean): ConfigReadinessSummary["providers"]["outboundWebhooks"] {
  const mode = normalizeProvider(config.LEDGERBYTE_OUTBOUND_WEBHOOKS_MODE, "DISABLED").toUpperCase();
  const publicDeliveryApproved = readBoolean(config.LEDGERBYTE_OUTBOUND_WEBHOOKS_PUBLIC_APPROVED) === true;
  const blockers: string[] = [];
  if (productionLike && mode === "MOCK_LOCAL") {
    blockers.push("MOCK_LOCAL outbound webhook delivery is not allowed in production-like modes.");
  }
  if (productionLike && mode !== "DISABLED" && !publicDeliveryApproved) {
    blockers.push("Outbound webhook delivery cannot be enabled in production-like modes without explicit public delivery approval.");
  }
  return readiness(mode !== "DISABLED", blockers, mode === "DISABLED" ? "Disabled" : "Needs Configuration", [
    "Outbound webhooks are disabled by default and do not call external URLs unless a future production provider is approved.",
  ], {
    mode,
    publicDeliveryApproved,
    externalDeliveryEnabled: false,
  });
}

function telemetryReadiness(config: EnvSource, productionLike: boolean): ConfigReadinessSummary["providers"]["telemetry"] {
  const sentryEnabled = readBoolean(config.LEDGERBYTE_SENTRY_ENABLED) === true;
  const openTelemetryEnabled = readBoolean(config.LEDGERBYTE_OTEL_ENABLED) === true;
  const blockers: string[] = [];
  if (productionLike && sentryEnabled && !clean(config.SENTRY_DSN)) blockers.push("Sentry cannot be enabled without SENTRY_DSN in production-like modes.");
  if (productionLike && openTelemetryEnabled && !clean(config.OTEL_EXPORTER_OTLP_ENDPOINT)) blockers.push("OpenTelemetry cannot be enabled without OTEL_EXPORTER_OTLP_ENDPOINT in production-like modes.");
  return readiness(sentryEnabled || openTelemetryEnabled, blockers, sentryEnabled || openTelemetryEnabled ? "Needs Configuration" : "Disabled", [], {
    sentryEnabled,
    openTelemetryEnabled,
  });
}

function apiDocsReadiness(config: EnvSource, productionLike: boolean): ConfigReadinessSummary["apiDocs"] {
  const exposed = readBoolean(config.LEDGERBYTE_API_DOCS_ENABLED) === true;
  const approved = readBoolean(config.LEDGERBYTE_API_DOCS_PUBLIC_APPROVED) === true;
  const blockers: string[] = [];
  if (productionLike && exposed && !approved) {
    blockers.push("API docs cannot be publicly exposed in production-like modes without explicit approval.");
  }
  return readiness(exposed, blockers, exposed ? "Needs Configuration" : "Disabled", [], { exposed });
}

function publicApiReadiness(config: EnvSource, productionLike: boolean): ConfigReadinessSummary["publicApi"] {
  const enabled = readBoolean(config.LEDGERBYTE_PUBLIC_API_ENABLED) === true;
  const rateLimitEnabled = readBoolean(config.LEDGERBYTE_PUBLIC_API_RATE_LIMIT_ENABLED) === true;
  const rateLimitStrategy = clean(config.LEDGERBYTE_PUBLIC_API_RATE_LIMIT_STRATEGY) || "DISABLED";
  const apiKeysEnabled = readBoolean(config.LEDGERBYTE_PUBLIC_API_KEYS_ENABLED) === true;
  const oauthEnabled = readBoolean(config.LEDGERBYTE_PUBLIC_API_OAUTH_ENABLED) === true;
  const blockers: string[] = [];
  const warnings: string[] = [
    "Public API v1 remains authenticated/internal by default and does not issue production API keys or OAuth clients.",
  ];

  if (productionLike && enabled && (!rateLimitEnabled || rateLimitStrategy === "DISABLED")) {
    blockers.push("Public API v1 cannot be enabled in production-like modes without an explicit rate-limit strategy.");
  }
  if (productionLike && apiKeysEnabled) {
    blockers.push("Public API keys are placeholder-only and cannot be enabled in production-like modes.");
  }
  if (productionLike && oauthEnabled) {
    blockers.push("Public API OAuth is placeholder-only and cannot be enabled in production-like modes.");
  }

  return readiness(enabled || rateLimitEnabled || apiKeysEnabled || oauthEnabled, blockers, enabled ? "Needs Configuration" : "Disabled", warnings, {
    enabled,
    version: "v1" as const,
    accessMode: enabled ? ("Internal Only" as const) : ("Disabled" as const),
    rateLimitEnabled,
    rateLimitStrategy,
    apiKeysEnabled,
    oauthEnabled,
    publicUnauthenticatedAccess: false as const,
  });
}

function diagnosticsReadiness(config: EnvSource, productionLike: boolean): ConfigReadinessSummary["diagnostics"] {
  const publicExposureRequested = readBoolean(config.LEDGERBYTE_OBSERVABILITY_DIAGNOSTICS_PUBLIC) === true;
  const blockers: string[] = [];
  if (productionLike && publicExposureRequested) {
    blockers.push("Observability diagnostics must remain authenticated and admin-gated in production-like modes.");
  }
  return readiness(true, blockers, "Ready", [], { adminGuardRequired: true as const, publicExposureRequested });
}

function backupRestoreReadiness(config: EnvSource, productionLike: boolean): ConfigReadinessSummary["backupRestoreDrill"] {
  const destructiveApprovalPresent = clean(config.LEDGERBYTE_LOCAL_BACKUP_RESTORE_APPROVAL).length > 0;
  const blockers: string[] = [];
  if (productionLike && destructiveApprovalPresent) {
    blockers.push("Local backup/restore destructive drill approval must not be present in production-like modes.");
  }
  return readiness(destructiveApprovalPresent, blockers, destructiveApprovalPresent ? "Needs Configuration" : "Disabled", [], { destructiveApprovalPresent });
}

function readiness<T extends object = object>(
  configured: boolean,
  blockers: string[],
  fallbackStatus: ConfigReadinessStatus,
  warnings: string[] = [],
  extra?: T,
): ConfigReadinessItem & T {
  return {
    ...(extra ?? ({} as T)),
    status: blockers.length > 0 ? "Blocked" : fallbackStatus,
    configured,
    blockers,
    warnings,
  };
}

function classifyDatabaseTarget(raw: string): DatabaseTargetClass {
  if (!raw) return "missing";
  if (/^(file:|sqlite:)/i.test(raw)) return "sqlite-or-file";
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return "invalid";
  }
  if (!["postgres:", "postgresql:"].includes(parsed.protocol)) return "invalid";
  return LOCAL_HOSTS.has(parsed.hostname.toLowerCase()) ? "local" : "remote";
}

function normalizeAppEnvironment(value: string | undefined): LedgerByteAppEnvironment {
  const normalized = clean(value).toLowerCase();
  if (["local", "development", "dev"].includes(normalized)) return "local";
  if (normalized === "test") return "test";
  if (["staging", "stage"].includes(normalized)) return "staging";
  if (["beta", "user-testing", "usertesting"].includes(normalized)) return "beta";
  if (["production", "prod", "live"].includes(normalized)) return "production";
  throw new Error("APP_ENV or NODE_ENV must be one of local, test, staging, beta, or production.");
}

function normalizeNodeEnvironment(value: string): string {
  const normalized = clean(value).toLowerCase();
  if (["development", "test", "production"].includes(normalized)) return normalized;
  if (["local", "dev"].includes(normalized)) return "development";
  if (["staging", "stage", "beta", "prod", "live"].includes(normalized)) return "production";
  throw new Error("NODE_ENV must be development, test, or production-compatible.");
}

function isWeakOrDefaultSecret(secret: string): boolean {
  return secret.length < 32 || DEFAULT_SECRET_MARKERS.test(secret);
}

function isMockMode(mode: string): boolean {
  return ["MOCK", "mock", "mock-no-send", "MOCK_EMAIL"].includes(mode);
}

function invoicePaymentProviderStateLabel(value: string): "Disabled" | "Local Mock Only" | "Needs Configuration" | "Future Provider" {
  if (value === "MOCK_EMAIL") return "Local Mock Only";
  if (value === "DISABLED_PROVIDER_PLACEHOLDER") return "Needs Configuration";
  if (value === "FUTURE_SMTP_OR_PROVIDER") return "Future Provider";
  return "Disabled";
}

function isLocalObjectStorageMode(mode: string): boolean {
  return ["local", "local-placeholder", "local_placeholder", "database-local", "fake"].includes(mode);
}

function normalizeProvider(value: string | undefined, fallback: string): string {
  return clean(value || fallback);
}

function configuredList(value: string | undefined): string[] {
  return clean(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function readBoolean(value: string | undefined): boolean | undefined {
  const normalized = clean(value).toLowerCase();
  if (TRUE_VALUES.has(normalized)) return true;
  if (FALSE_VALUES.has(normalized)) return false;
  return undefined;
}

function clean(value: string | undefined): string {
  return value?.trim() ?? "";
}

function redactConfigDiagnostics(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => redactConfigDiagnostics(item));
  }
  if (typeof value === "string") {
    return redactText(value);
  }
  if (typeof value !== "object" || value === null) {
    return value;
  }

  const output: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    output[key] = redactConfigDiagnostics(entry);
  }
  return output;
}
