import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, isAbsolute, join, relative, resolve } from "node:path";

export const LOCAL_DRILL_APPROVAL_ENV = "LEDGERBYTE_LOCAL_BACKUP_RESTORE_APPROVAL";
export const OWNER_APPROVAL_PHRASE = "I_UNDERSTAND_THIS_MUTATES_A_DISPOSABLE_NON_PRODUCTION_TARGET";
export const STATUS_PLAN_READY = "LOCAL_POSTGRES_DR_PLAN_READY";
export const STATUS_BLOCKED_UNSAFE_TARGET = "LOCAL_POSTGRES_DR_BLOCKED_UNSAFE_TARGET";
export const STATUS_BACKUP_CREATED = "LOCAL_POSTGRES_BACKUP_CREATED";
export const STATUS_RESTORE_COMPLETED = "LOCAL_POSTGRES_RESTORE_COMPLETED";
export const STATUS_RESTORE_VERIFIED = "LOCAL_POSTGRES_RESTORE_VERIFIED";
export const STATUS_FIXTURE_PREPARED = "LOCAL_POSTGRES_DR_FIXTURE_PREPARED";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "0.0.0.0"]);
const HOSTED_MARKERS = /(supabase|neon|rds\.amazonaws|amazonaws|azure|render|railway|fly\.dev|vercel|heroku|digitalocean|planetscale)/i;
const UNSAFE_ENV_MARKERS = /(prod|production|live|beta|staging|stage|user[-_]?testing|customer|hosted)/i;
const DISPOSABLE_DB_MARKERS = /(restore|disposable|drill|tmp|temp|test|local)/i;
const SENSITIVE_EVIDENCE_KEY_PATTERN =
  /password|passphrase|token|secret|authorization|cookie|jwt|api[-_]?key|private[-_]?key|signature|webhook[-_]?secret|access[-_]?token|refresh[-_]?token|database[-_]?url|direct[-_]?url|storage[-_]?(key|secret|credential)|provider[-_]?payload|document[-_]?body|attachment[-_]?body|contentbase64|pdf|xml/i;
const SAFE_EVIDENCE_KEYS = new Set(["noSecretsReturned", "includesSecretValues"]);

export type DrillMode = "plan" | "backup" | "restore" | "verify" | "drill";

export interface DatabaseTargetClassification {
  rawUrlProvided: boolean;
  validUrl: boolean;
  protocol: string | null;
  host: string | null;
  port: string | null;
  databaseName: string | null;
  sanitizedTarget: string | null;
  hostClass: "local" | "hosted-or-remote" | "invalid";
  productionLike: boolean;
  disposable: boolean;
  safeForBackup: boolean;
  safeForRestore: boolean;
  blockers: string[];
  warnings: string[];
}

export interface BackupArtifactSummary {
  filename: string | null;
  absolutePath?: string;
  checksumSha256: string | null;
  sizeBytes: number | null;
}

export interface RestoreVerificationCheck {
  id: string;
  table: string;
  description: string;
  sql: string;
  required: boolean;
  expected: "query-succeeds" | "positive-number" | "true";
  requestIdCoverage?: boolean;
}

export interface RestoreVerificationCheckResult extends RestoreVerificationCheck {
  passed: boolean;
  observedValue?: string | number | boolean | null;
  message?: string;
}

export interface RestoreVerificationSummary {
  passed: boolean;
  checks: RestoreVerificationCheckResult[];
  coveredRequestIdModels: string[];
  invoicePaymentLinkCoverage: boolean;
}

export interface DisasterRecoveryEvidence {
  timestamp: string;
  gitCommit: string;
  mode: DrillMode;
  status: string;
  sourceDbClassification: DatabaseTargetClassification;
  restoreDbClassification: DatabaseTargetClassification;
  backup: BackupArtifactSummary;
  restoreVerification: RestoreVerificationSummary;
  blockedHostedProdMutationStatus: "blocked-by-default";
  hostedProdMutationAttempted: false;
  noSecretsReturned: true;
  productionRecoveryProven: false;
  hostedProductionRecoveryProven: false;
  objectStorageRecoveryProven: false;
  warnings: string[];
  blockers: string[];
}

export interface DrillInput {
  mode: DrillMode;
  sourceDatabaseUrl?: string;
  restoreDatabaseUrl?: string;
  adminDatabaseUrl?: string;
  backupFile?: string;
  backupOutputDir?: string;
  gitCommit?: string;
  env?: NodeJS.ProcessEnv;
  now?: Date;
}

export interface CommandExecutor {
  run(command: string, args: string[], options: { env: NodeJS.ProcessEnv }): { status: number | null; stdout: string; stderr: string };
}

interface ToolResult {
  status: number | null;
  stdout: string | Buffer;
  stderr: string;
}

export function classifyDatabaseTarget(databaseUrl: string | undefined | null): DatabaseTargetClassification {
  const raw = databaseUrl?.trim();
  const base: DatabaseTargetClassification = {
    rawUrlProvided: Boolean(raw),
    validUrl: false,
    protocol: null,
    host: null,
    port: null,
    databaseName: null,
    sanitizedTarget: null,
    hostClass: "invalid",
    productionLike: false,
    disposable: false,
    safeForBackup: false,
    safeForRestore: false,
    blockers: [],
    warnings: [],
  };

  if (!raw) {
    base.blockers.push("Database URL is required for execution.");
    return base;
  }

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    base.blockers.push("Database URL must be a valid PostgreSQL connection URL.");
    return base;
  }

  const protocol = parsed.protocol.replace(":", "");
  const host = parsed.hostname.toLowerCase();
  const databaseName = decodeURIComponent(parsed.pathname.replace(/^\//, ""));
  const protocolValid = protocol === "postgresql" || protocol === "postgres";
  const local = LOCAL_HOSTS.has(host);
  const hosted = !local || HOSTED_MARKERS.test(host);
  const productionLike = UNSAFE_ENV_MARKERS.test(`${host} ${databaseName}`);
  const disposable = DISPOSABLE_DB_MARKERS.test(databaseName) && !/^(accounting|ledgerbyte)$/i.test(databaseName);

  base.validUrl = protocolValid;
  base.protocol = protocol;
  base.host = host;
  base.port = parsed.port || null;
  base.databaseName = databaseName || null;
  base.sanitizedTarget = `${protocol}://[REDACTED]@${host}${parsed.port ? `:${parsed.port}` : ""}/${databaseName || "[missing-db]"}`;
  base.hostClass = local ? "local" : "hosted-or-remote";
  base.productionLike = productionLike || hosted;
  base.disposable = disposable;

  if (!protocolValid) {
    base.blockers.push("Only PostgreSQL URLs are supported.");
  }
  if (hosted) {
    base.blockers.push("Hosted or remote database targets are blocked by default.");
  }
  if (productionLike) {
    base.blockers.push("Production, beta, staging, hosted, or customer-looking database targets are blocked.");
  }
  if (!databaseName) {
    base.blockers.push("Database name is required.");
  }

  base.safeForBackup = base.blockers.length === 0 && local;
  base.safeForRestore = base.safeForBackup && disposable;
  if (base.safeForBackup && !base.safeForRestore) {
    base.warnings.push("Target is local-safe for backup classification but is not disposable enough for restore.");
  }

  return base;
}

export function assertBackupAllowed(classification: DatabaseTargetClassification, env: NodeJS.ProcessEnv = process.env): void {
  const blockers = [...classification.blockers];
  if (!classification.safeForBackup) {
    blockers.push("Backup source must be a safe local PostgreSQL target.");
  }
  if (!hasOwnerApproval(env)) {
    blockers.push(`${LOCAL_DRILL_APPROVAL_ENV}=${OWNER_APPROVAL_PHRASE} is required before local backup execution.`);
  }
  if (blockers.length > 0) {
    throw new Error(blockers.join(" "));
  }
}

export function assertRestoreAllowed(classification: DatabaseTargetClassification, env: NodeJS.ProcessEnv = process.env): void {
  const blockers = [...classification.blockers];
  if (!classification.safeForRestore) {
    blockers.push("Restore target must be a disposable local PostgreSQL database name.");
  }
  if (!hasOwnerApproval(env)) {
    blockers.push(`${LOCAL_DRILL_APPROVAL_ENV}=${OWNER_APPROVAL_PHRASE} is required before local restore execution.`);
  }
  if (blockers.length > 0) {
    throw new Error(blockers.join(" "));
  }
}

export function getRestoreVerificationChecks(): RestoreVerificationCheck[] {
  return [
    check("organization-table", "Organization", "Seeded tenant root records restored.", `SELECT COUNT(*) FROM "Organization";`, "positive-number"),
    check("user-table", "User", "Seeded user records restored.", `SELECT COUNT(*) FROM "User";`, "positive-number"),
    check("account-table", "Account", "Seeded chart of accounts records restored.", `SELECT COUNT(*) FROM "Account";`, "positive-number"),
    check("journal-entry-table", "JournalEntry", "Seeded journal entry records restored.", `SELECT COUNT(*) FROM "JournalEntry";`, "positive-number"),
    check("journal-line-table", "JournalLine", "Seeded journal line records restored.", `SELECT COUNT(*) FROM "JournalLine";`, "positive-number"),
    check("sales-invoice-table", "SalesInvoice", "Seeded sales invoice records restored.", `SELECT COUNT(*) FROM "SalesInvoice";`, "positive-number"),
    check("purchase-bill-table", "PurchaseBill", "Seeded purchase bill records restored.", `SELECT COUNT(*) FROM "PurchaseBill";`, "positive-number"),
    check("tenant-scope-sample", "Organization", "Seeded tenant-scoped records include at least two organizations.", `SELECT COUNT(DISTINCT "organizationId") >= 2 FROM "Account";`, "true"),
    check(
      "tenant-scope-no-cross-org-journal-lines",
      "JournalLine",
      "Journal lines remain scoped to accounts in the same organization.",
      `SELECT COUNT(*) = 0 FROM "JournalLine" line JOIN "Account" account ON account.id = line."accountId" WHERE account."organizationId" <> line."organizationId";`,
      "true",
    ),
    check("prisma-migrations", "_prisma_migrations", "Prisma migration history exists after restore.", `SELECT COUNT(*) FROM "_prisma_migrations";`, "positive-number"),
    check(
      "audit-log-request-id",
      "AuditLog",
      "Audit logs preserve nullable and non-null requestId values.",
      `SELECT COUNT(*) FILTER (WHERE "requestId" IS NULL) >= 1 AND COUNT(*) FILTER (WHERE "requestId" IS NOT NULL) >= 1 FROM "AuditLog";`,
      "true",
      true,
    ),
    check(
      "generated-document-request-id",
      "GeneratedDocument",
      "Generated document metadata preserves nullable and non-null requestId values.",
      `SELECT COUNT(*) FILTER (WHERE "requestId" IS NULL) >= 1 AND COUNT(*) FILTER (WHERE "requestId" IS NOT NULL) >= 1 FROM "GeneratedDocument";`,
      "true",
      true,
    ),
    check(
      "document-extraction-request-id",
      "DocumentExtractionResult",
      "Document extraction records preserve nullable and non-null requestId values.",
      `SELECT COUNT(*) FILTER (WHERE "requestId" IS NULL) >= 1 AND COUNT(*) FILTER (WHERE "requestId" IS NOT NULL) >= 1 FROM "DocumentExtractionResult";`,
      "true",
      true,
    ),
    check(
      "document-review-request-id",
      "DocumentReviewDecision",
      "Document review records preserve nullable and non-null requestId values.",
      `SELECT COUNT(*) FILTER (WHERE "requestId" IS NULL) >= 1 AND COUNT(*) FILTER (WHERE "requestId" IS NOT NULL) >= 1 FROM "DocumentReviewDecision";`,
      "true",
      true,
    ),
    check(
      "payment-provider-event-request-id",
      "PaymentProviderEvent",
      "Payment provider events preserve nullable and non-null requestId values.",
      `SELECT COUNT(*) FILTER (WHERE "requestId" IS NULL) >= 1 AND COUNT(*) FILTER (WHERE "requestId" IS NOT NULL) >= 1 FROM "PaymentProviderEvent";`,
      "true",
      true,
    ),
    check("invoice-payment-link", "InvoicePaymentLink", "Seeded invoice payment-link records restore correctly.", `SELECT COUNT(*) FROM "InvoicePaymentLink";`, "positive-number"),
  ];
}

export function formatRestoreVerificationResult(checks: RestoreVerificationCheckResult[]): RestoreVerificationSummary {
  const coveredRequestIdModels = checks.filter((item) => item.requestIdCoverage).map((item) => item.table).sort();
  return {
    passed: checks.every((item) => item.passed || !item.required),
    checks,
    coveredRequestIdModels,
    invoicePaymentLinkCoverage: checks.some((item) => item.table === "InvoicePaymentLink" && item.passed),
  };
}

export function buildPlannedVerificationSummary(): RestoreVerificationSummary {
  return formatRestoreVerificationResult(
    getRestoreVerificationChecks().map((item) => ({
      ...item,
      passed: false,
      observedValue: null,
      message: "Planned check; not executed in plan mode.",
    })),
  );
}

export function buildEvidenceReport(input: DrillInput & { status?: string; blockers?: string[]; warnings?: string[]; backup?: BackupArtifactSummary; verification?: RestoreVerificationSummary }): DisasterRecoveryEvidence {
  const sourceDbClassification = classifyDatabaseTarget(input.sourceDatabaseUrl);
  const restoreDbClassification = classifyDatabaseTarget(input.restoreDatabaseUrl);
  const rawEvidence: DisasterRecoveryEvidence = {
    timestamp: (input.now ?? new Date()).toISOString(),
    gitCommit: input.gitCommit ?? "unknown",
    mode: input.mode,
    status: input.status ?? STATUS_PLAN_READY,
    sourceDbClassification,
    restoreDbClassification,
    backup: sanitizeBackupSummary(
      input.backup ?? {
        filename: input.backupFile ? basename(input.backupFile) : null,
        checksumSha256: input.backupFile && existsSync(input.backupFile) ? sha256File(input.backupFile) : null,
        sizeBytes: input.backupFile && existsSync(input.backupFile) ? statSync(input.backupFile).size : null,
      },
    ),
    restoreVerification: input.verification ?? buildPlannedVerificationSummary(),
    blockedHostedProdMutationStatus: "blocked-by-default",
    hostedProdMutationAttempted: false,
    noSecretsReturned: true,
    productionRecoveryProven: false,
    hostedProductionRecoveryProven: false,
    objectStorageRecoveryProven: false,
    warnings: normalizeEvidenceWarnings(input.warnings),
    blockers: input.blockers ?? [],
  };

  return redactEvidence(rawEvidence) as DisasterRecoveryEvidence;
}

export function renderEvidenceMarkdown(evidence: DisasterRecoveryEvidence): string {
  const checks = evidence.restoreVerification.checks
    .map((item) => `| ${item.id} | ${item.table} | ${item.passed ? "PASS" : "NOT_RUN"} | ${item.message ?? ""} |`)
    .join("\n");

  return [
    "# Local PostgreSQL Backup/Restore Drill Evidence",
    "",
    `- Timestamp: ${evidence.timestamp}`,
    `- Git commit: ${evidence.gitCommit}`,
    `- Mode: ${evidence.mode}`,
    `- Status: ${evidence.status}`,
    `- Source DB classification: ${evidence.sourceDbClassification.hostClass}`,
    `- Restore DB classification: ${evidence.restoreDbClassification.hostClass}`,
    `- Backup filename: ${evidence.backup.filename ?? "not-created"}`,
    `- Backup checksum: ${evidence.backup.checksumSha256 ?? "not-created"}`,
    `- Backup size bytes: ${evidence.backup.sizeBytes ?? "not-created"}`,
    `- Blocked hosted/prod mutation status: ${evidence.blockedHostedProdMutationStatus}`,
    `- Hosted/prod mutation attempted: ${evidence.hostedProdMutationAttempted}`,
    `- Hosted production recovery proven: ${evidence.hostedProductionRecoveryProven}`,
    `- Production recovery proven: ${evidence.productionRecoveryProven}`,
    `- Object storage recovery proven: ${evidence.objectStorageRecoveryProven}`,
    "",
    "## Restore Verification Checks",
    "",
    "| Check | Table | Result | Message |",
    "| --- | --- | --- | --- |",
    checks,
    "",
    "## Blockers",
    "",
    ...(evidence.blockers.length > 0 ? evidence.blockers.map((item) => `- ${item}`) : ["- None recorded for this evidence output."]),
    "",
    "## Warnings",
    "",
    ...evidence.warnings.map((item) => `- ${item}`),
    "",
    "This evidence is local/test-safe groundwork only. It does not prove hosted production backup, hosted restore, object-storage recovery, RPO/RTO approval, or disaster-recovery readiness.",
    "",
  ].join("\n");
}

export function writeEvidenceFiles(evidence: DisasterRecoveryEvidence, evidenceDir: string): { jsonPath: string; markdownPath: string } {
  const root = resolve(evidenceDir);
  mkdirSync(root, { recursive: true });
  const stamp = evidence.timestamp.replace(/[:.]/g, "-");
  const jsonPath = join(root, `local-postgres-drill-${stamp}.json`);
  const markdownPath = join(root, `local-postgres-drill-${stamp}.md`);
  writeFileSync(jsonPath, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
  writeFileSync(markdownPath, renderEvidenceMarkdown(evidence), "utf8");
  return { jsonPath, markdownPath };
}

export function createBackup(input: DrillInput, executor: CommandExecutor = defaultExecutor): BackupArtifactSummary {
  const env = input.env ?? process.env;
  const classification = classifyDatabaseTarget(input.sourceDatabaseUrl);
  assertBackupAllowed(classification, env);
  const parsed = new URL(input.sourceDatabaseUrl as string);
  const outputDir = resolveSafeOutputDir(input.backupOutputDir);
  mkdirSync(outputDir, { recursive: true });
  const filename = `ledgerbyte-local-backup-${new Date().toISOString().replace(/[:.]/g, "-")}.dump`;
  const absolutePath = join(outputDir, filename);
  const dockerMode = usesDockerComposePgTools(env);
  const result = runPgTool("pg_dump", ["--format=custom", "--no-owner", "--no-privileges", ...(dockerMode ? [] : ["--file", absolutePath]), ...connectionArgs(parsed, env)], parsed, env, {
    executor,
    binaryStdout: dockerMode,
  });
  if (result.status !== 0) {
    throw new Error(`pg_dump failed for local backup target: ${redactEvidenceText(toolOutputText(result))}`);
  }
  if (Buffer.isBuffer(result.stdout)) {
    writeFileSync(absolutePath, result.stdout);
  }
  return { filename, absolutePath, checksumSha256: sha256File(absolutePath), sizeBytes: statSync(absolutePath).size };
}

export function restoreBackup(input: DrillInput, executor: CommandExecutor = defaultExecutor): void {
  const env = input.env ?? process.env;
  const classification = classifyDatabaseTarget(input.restoreDatabaseUrl);
  assertRestoreAllowed(classification, env);
  if (!input.backupFile || !existsSync(input.backupFile)) {
    throw new Error("A readable backup file is required for restore execution.");
  }
  const parsed = new URL(input.restoreDatabaseUrl as string);
  const dockerMode = usesDockerComposePgTools(env);
  const args = ["--clean", "--if-exists", "--no-owner", "--no-privileges", ...connectionArgs(parsed, env), ...(dockerMode ? [] : [input.backupFile])];
  const result = runPgTool("pg_restore", args, parsed, env, {
    executor,
    input: dockerMode ? readFileSync(input.backupFile) : undefined,
  });
  if (result.status !== 0) {
    throw new Error(`pg_restore failed for local disposable target: ${redactEvidenceText(toolOutputText(result))}`);
  }
}

export function verifyRestore(input: DrillInput, executor: CommandExecutor = defaultExecutor): RestoreVerificationSummary {
  const env = input.env ?? process.env;
  const classification = classifyDatabaseTarget(input.restoreDatabaseUrl);
  assertRestoreAllowed(classification, env);
  const parsed = new URL(input.restoreDatabaseUrl as string);
  const results = getRestoreVerificationChecks().map((verificationCheck) => {
    const result = runPgTool("psql", ["--tuples-only", "--no-align", "--command", verificationCheck.sql, ...connectionArgs(parsed, env)], parsed, env, {
      executor,
    });
    const output = String(result.stdout || "").trim();
    const passed = result.status === 0 && isExpectedOutput(verificationCheck, output);
    return {
      ...verificationCheck,
      passed,
      observedValue: output || null,
      message:
        result.status === 0
          ? passed
            ? "Verification passed against local disposable restore database."
            : `Verification query returned ${output || "empty output"}.`
          : redactEvidenceText(toolOutputText(result, "query failed")),
    };
  });

  return formatRestoreVerificationResult(results);
}

export function prepareLocalDrillDatabases(input: DrillInput, executor: CommandExecutor = defaultExecutor): void {
  const env = input.env ?? process.env;
  const source = classifyDatabaseTarget(input.sourceDatabaseUrl);
  const restore = classifyDatabaseTarget(input.restoreDatabaseUrl);
  assertRestoreAllowed(source, env);
  assertRestoreAllowed(restore, env);
  if (source.databaseName === restore.databaseName) {
    throw new Error("Source and restore database names must be different disposable local databases.");
  }

  const adminUrl = input.adminDatabaseUrl ?? deriveAdminDatabaseUrl(input.sourceDatabaseUrl);
  const admin = classifyDatabaseTarget(adminUrl);
  assertAdminAllowed(admin, env);
  const adminParsed = new URL(adminUrl as string);
  const sourceName = source.databaseName as string;
  const restoreName = restore.databaseName as string;

  for (const databaseName of [sourceName, restoreName]) {
    runRequiredSql(adminParsed, `DROP DATABASE IF EXISTS ${quoteIdentifier(databaseName)} WITH (FORCE);`, env, executor);
    runRequiredSql(adminParsed, `CREATE DATABASE ${quoteIdentifier(databaseName)};`, env, executor);
  }

  runPrismaMigrateDeploy(input.sourceDatabaseUrl as string, env);
  runRequiredSql(new URL(input.sourceDatabaseUrl as string), buildLocalDrillSeedSql(), env, executor);
}

export function buildLocalDrillSeedSql(): string {
  return `
INSERT INTO "Organization" (id, name, "legalName", "countryCode", "baseCurrency", timezone, "createdAt", "updatedAt") VALUES
  ('11111111-1111-4111-8111-111111111111', 'Local DR Tenant A', 'Local DR Tenant A LLC', 'SA', 'SAR', 'Asia/Riyadh', NOW(), NOW()),
  ('22222222-2222-4222-8222-222222222222', 'Local DR Tenant B', 'Local DR Tenant B LLC', 'SA', 'SAR', 'Asia/Riyadh', NOW(), NOW());

INSERT INTO "User" (id, email, "passwordHash", name, "createdAt", "updatedAt") VALUES
  ('33333333-3333-4333-8333-333333333333', 'drill.user@example.invalid', 'local-drill-not-a-real-password-hash', 'Local DR User', NOW(), NOW());

INSERT INTO "Contact" (id, "organizationId", type, name, "displayName", "countryCode", "createdAt", "updatedAt") VALUES
  ('44444444-4444-4444-8444-444444444441', '11111111-1111-4111-8111-111111111111', 'CUSTOMER', 'Local DR Customer', 'Local DR Customer', 'SA', NOW(), NOW()),
  ('44444444-4444-4444-8444-444444444442', '11111111-1111-4111-8111-111111111111', 'SUPPLIER', 'Local DR Supplier', 'Local DR Supplier', 'SA', NOW(), NOW());

INSERT INTO "Account" (id, "organizationId", code, name, type, "allowPosting", "isSystem", "isActive", "createdAt", "updatedAt") VALUES
  ('55555555-5555-4555-8555-555555555551', '11111111-1111-4111-8111-111111111111', '1010', 'Local DR Cash', 'ASSET', true, false, true, NOW(), NOW()),
  ('55555555-5555-4555-8555-555555555552', '11111111-1111-4111-8111-111111111111', '4000', 'Local DR Revenue', 'REVENUE', true, false, true, NOW(), NOW()),
  ('55555555-5555-4555-8555-555555555553', '11111111-1111-4111-8111-111111111111', '5000', 'Local DR Expense', 'EXPENSE', true, false, true, NOW(), NOW()),
  ('55555555-5555-4555-8555-555555555554', '22222222-2222-4222-8222-222222222222', '1010', 'Local DR Tenant B Cash', 'ASSET', true, false, true, NOW(), NOW());

INSERT INTO "JournalEntry" (id, "organizationId", "entryNumber", status, "entryDate", description, currency, "totalDebit", "totalCredit", "createdById", "createdAt", "updatedAt") VALUES
  ('66666666-6666-4666-8666-666666666661', '11111111-1111-4111-8111-111111111111', 'DR-JE-0001', 'POSTED', DATE '2026-07-08', 'Local DR seeded accounting entry', 'SAR', 100.0000, 100.0000, '33333333-3333-4333-8333-333333333333', NOW(), NOW());

INSERT INTO "JournalLine" (id, "organizationId", "journalEntryId", "accountId", "lineNumber", description, debit, credit, currency, "exchangeRate", "createdAt") VALUES
  ('77777777-7777-4777-8777-777777777771', '11111111-1111-4111-8111-111111111111', '66666666-6666-4666-8666-666666666661', '55555555-5555-4555-8555-555555555551', 1, 'Cash debit', 100.0000, 0.0000, 'SAR', 1.00000000, NOW()),
  ('77777777-7777-4777-8777-777777777772', '11111111-1111-4111-8111-111111111111', '66666666-6666-4666-8666-666666666661', '55555555-5555-4555-8555-555555555552', 2, 'Revenue credit', 0.0000, 100.0000, 'SAR', 1.00000000, NOW());

INSERT INTO "SalesInvoice" (id, "organizationId", "invoiceNumber", "customerId", "issueDate", currency, status, "taxMode", subtotal, "taxableTotal", "taxTotal", total, "balanceDue", "createdById", "createdAt", "updatedAt") VALUES
  ('88888888-8888-4888-8888-888888888881', '11111111-1111-4111-8111-111111111111', 'DR-SI-0001', '44444444-4444-4444-8444-444444444441', DATE '2026-07-08', 'SAR', 'DRAFT', 'TAX_EXCLUSIVE', 100.0000, 100.0000, 0.0000, 100.0000, 100.0000, '33333333-3333-4333-8333-333333333333', NOW(), NOW());

INSERT INTO "SalesInvoiceLine" (id, "organizationId", "invoiceId", description, "accountId", quantity, "unitPrice", "lineGrossAmount", "taxableAmount", "lineSubtotal", "lineTotal", "createdAt", "updatedAt") VALUES
  ('99999999-9999-4999-8999-999999999991', '11111111-1111-4111-8111-111111111111', '88888888-8888-4888-8888-888888888881', 'Local DR service line', '55555555-5555-4555-8555-555555555552', 1.0000, 100.0000, 100.0000, 100.0000, 100.0000, 100.0000, NOW(), NOW());

INSERT INTO "PurchaseBill" (id, "organizationId", "billNumber", "supplierId", "billDate", currency, status, subtotal, "taxableTotal", "taxTotal", total, "balanceDue", "createdById", "createdAt", "updatedAt") VALUES
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', '11111111-1111-4111-8111-111111111111', 'DR-PB-0001', '44444444-4444-4444-8444-444444444442', DATE '2026-07-08', 'SAR', 'DRAFT', 50.0000, 50.0000, 0.0000, 50.0000, 50.0000, '33333333-3333-4333-8333-333333333333', NOW(), NOW());

INSERT INTO "PurchaseBillLine" (id, "organizationId", "billId", description, "accountId", quantity, "unitPrice", "lineGrossAmount", "taxableAmount", "lineTotal", "createdAt", "updatedAt") VALUES
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', '11111111-1111-4111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'Local DR expense line', '55555555-5555-4555-8555-555555555553', 1.0000, 50.0000, 50.0000, 50.0000, 50.0000, NOW(), NOW());

INSERT INTO "AuditLog" (id, "organizationId", "actorUserId", action, "entityType", "entityId", before, after, "requestId", "createdAt") VALUES
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1', '11111111-1111-4111-8111-111111111111', '33333333-3333-4333-8333-333333333333', 'DRILL_SEED', 'Organization', '11111111-1111-4111-8111-111111111111', '{}'::jsonb, '{}'::jsonb, NULL, NOW()),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2', '11111111-1111-4111-8111-111111111111', '33333333-3333-4333-8333-333333333333', 'DRILL_SEED_REQUEST', 'Organization', '11111111-1111-4111-8111-111111111111', '{}'::jsonb, '{}'::jsonb, 'req_local_drill_001', NOW());

INSERT INTO "GeneratedDocument" (id, "organizationId", "documentType", "sourceType", "sourceId", "documentNumber", filename, "mimeType", "storageProvider", "contentHash", "sizeBytes", status, "requestId", "generatedById", "generatedAt", "createdAt") VALUES
  ('cccccccc-cccc-4ccc-8ccc-ccccccccccc1', '11111111-1111-4111-8111-111111111111', 'SALES_INVOICE', 'SalesInvoice', '88888888-8888-4888-8888-888888888881', 'DR-SI-0001', 'dr-local-invoice.pdf', 'application/pdf', 'database', 'sha256-local-drill-placeholder-1', 0, 'GENERATED', NULL, '33333333-3333-4333-8333-333333333333', NOW(), NOW()),
  ('cccccccc-cccc-4ccc-8ccc-ccccccccccc2', '11111111-1111-4111-8111-111111111111', 'PURCHASE_BILL', 'PurchaseBill', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'DR-PB-0001', 'dr-local-bill.pdf', 'application/pdf', 'database', 'sha256-local-drill-placeholder-2', 0, 'GENERATED', 'req_local_drill_002', '33333333-3333-4333-8333-333333333333', NOW(), NOW());

INSERT INTO "Attachment" (id, "organizationId", "linkedEntityType", "linkedEntityId", filename, "originalFilename", "mimeType", "sizeBytes", "storageProvider", "contentHash", status, "uploadedById", "uploadedAt", "createdAt", "updatedAt") VALUES
  ('dddddddd-dddd-4ddd-8ddd-ddddddddddd1', '11111111-1111-4111-8111-111111111111', 'PURCHASE_BILL', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'dr-local-receipt.pdf', 'dr-local-receipt.pdf', 'application/pdf', 0, 'DATABASE', 'sha256-local-drill-attachment', 'ACTIVE', '33333333-3333-4333-8333-333333333333', NOW(), NOW(), NOW());

INSERT INTO "DocumentInboxItem" (id, "organizationId", "attachmentId", "sourceType", status, title, "supplierName", "documentDate", currency, "totalAmount", "taxAmount", "createdById", "reviewedById", "reviewedAt", "createdAt", "updatedAt") VALUES
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1', '11111111-1111-4111-8111-111111111111', 'dddddddd-dddd-4ddd-8ddd-ddddddddddd1', 'BILL', 'REVIEWED', 'Local DR receipt review', 'Local DR Supplier', DATE '2026-07-08', 'SAR', 50.0000, 0.0000, '33333333-3333-4333-8333-333333333333', '33333333-3333-4333-8333-333333333333', NOW(), NOW(), NOW());

INSERT INTO "DocumentExtractionResult" (id, "organizationId", "documentInboxItemId", provider, status, confidence, "extractedJson", "redactedRawJson", blockers, "requestId", "createdById", "createdAt") VALUES
  ('ffffffff-ffff-4fff-8fff-fffffffffff1', '11111111-1111-4111-8111-111111111111', 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1', 'NONE', 'SKIPPED_DISABLED', NULL, '{"totalAmount":50}'::jsonb, '{"redacted":true}'::jsonb, ARRAY[]::text[], NULL, '33333333-3333-4333-8333-333333333333', NOW()),
  ('ffffffff-ffff-4fff-8fff-fffffffffff2', '11111111-1111-4111-8111-111111111111', 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1', 'MOCK', 'EXTRACTED_MOCK', 0.9000, '{"supplierName":"Local DR Supplier"}'::jsonb, '{"redacted":true}'::jsonb, ARRAY[]::text[], 'req_local_drill_003', '33333333-3333-4333-8333-333333333333', NOW());

INSERT INTO "DocumentReviewDecision" (id, "organizationId", "documentInboxItemId", "decisionType", "targetType", "targetId", "reviewerNote", "requestId", "reviewedById", "reviewedAt", "createdAt") VALUES
  ('12121212-1212-4121-8121-121212121211', '11111111-1111-4111-8111-111111111111', 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1', 'MARK_REVIEWED', NULL, NULL, 'Local DR nullable request id decision', NULL, '33333333-3333-4333-8333-333333333333', NOW(), NOW()),
  ('12121212-1212-4121-8121-121212121212', '11111111-1111-4111-8111-111111111111', 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1', 'CREATE_DRAFT_PURCHASE_BILL', 'PurchaseBill', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'Local DR request id decision', 'req_local_drill_004', '33333333-3333-4333-8333-333333333333', NOW(), NOW());

INSERT INTO "PaymentProviderConfig" (id, "organizationId", provider, status, "displayName", "createdById", "updatedById", "createdAt", "updatedAt") VALUES
  ('13131313-1313-4131-8131-131313131311', '11111111-1111-4111-8111-111111111111', 'NONE', 'DISABLED', 'Local DR disabled provider', '33333333-3333-4333-8333-333333333333', '33333333-3333-4333-8333-333333333333', NOW(), NOW());

INSERT INTO "PaymentProviderEvent" (id, "organizationId", provider, status, "eventType", "externalEventId", "redactedPayloadJson", "signatureVerified", "requestId", "receivedAt", "createdAt") VALUES
  ('14141414-1414-4141-8141-141414141411', '11111111-1111-4111-8111-111111111111', 'STRIPE', 'REJECTED_UNVERIFIED', 'payment_intent.created', 'evt_local_drill_null', '{"redacted":true}'::jsonb, false, NULL, NOW(), NOW()),
  ('14141414-1414-4141-8141-141414141412', '11111111-1111-4111-8111-111111111111', 'STRIPE', 'REJECTED_UNVERIFIED', 'payment_intent.succeeded', 'evt_local_drill_request', '{"redacted":true}'::jsonb, false, 'req_local_drill_005', NOW(), NOW());

INSERT INTO "InvoicePaymentLink" (id, "organizationId", "salesInvoiceId", provider, status, "paymentUrl", "externalReference", "redactedMetadataJson", "createdById", "createdAt", "updatedAt") VALUES
  ('15151515-1515-4151-8151-151515151511', '11111111-1111-4111-8111-111111111111', '88888888-8888-4888-8888-888888888881', 'NONE', 'BLOCKED_PROVIDER_DISABLED', NULL, 'local-drill-payment-link', '{"redacted":true}'::jsonb, '33333333-3333-4333-8333-333333333333', NOW(), NOW());
`;
}

function check(
  id: string,
  table: string,
  description: string,
  sql: string,
  expected: RestoreVerificationCheck["expected"],
  requestIdCoverage = false,
): RestoreVerificationCheck {
  return { id, table, description, sql, required: true, expected, requestIdCoverage };
}

function hasOwnerApproval(env: NodeJS.ProcessEnv): boolean {
  return env[LOCAL_DRILL_APPROVAL_ENV] === OWNER_APPROVAL_PHRASE;
}

function assertAdminAllowed(classification: DatabaseTargetClassification, env: NodeJS.ProcessEnv): void {
  const blockers = [...classification.blockers];
  if (!classification.safeForBackup) {
    blockers.push("Fixture admin database must be a safe local PostgreSQL target.");
  }
  if (!hasOwnerApproval(env)) {
    blockers.push(`${LOCAL_DRILL_APPROVAL_ENV}=${OWNER_APPROVAL_PHRASE} is required before local fixture preparation.`);
  }
  if (blockers.length > 0) {
    throw new Error(blockers.join(" "));
  }
}

function redactEvidence(value: unknown): unknown {
  return redactEvidenceValue(value, new WeakSet<object>());
}

function sanitizeBackupSummary(summary: BackupArtifactSummary): BackupArtifactSummary {
  return {
    filename: summary.filename,
    checksumSha256: summary.checksumSha256,
    sizeBytes: summary.sizeBytes,
  };
}

function normalizeEvidenceWarnings(warnings: string[] | undefined): string[] {
  const base =
    warnings ??
    [
      "Plan mode does not execute pg_dump, pg_restore, psql, hosted backup, or hosted restore operations.",
      "Hosted production recovery remains unproven.",
    ];
  const hostedMutationStatement = "Hosted/prod/beta/staging database mutation was blocked/not attempted.";
  return base.includes(hostedMutationStatement) ? base : [...base, hostedMutationStatement];
}

export function redactEvidenceText(value: string): string {
  return String(value ?? "")
    .replace(/\b(postgresql|postgres):\/\/[^\s"'<>]+/gi, "[REDACTED_DATABASE_URL]")
    .replace(/\b(password|token|secret|apiKey|authorization)\s*[:=]\s*[^\s,;]+/gi, "$1=[REDACTED]")
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/g, "Bearer [REDACTED]");
}

function redactEvidenceValue(value: unknown, seen: WeakSet<object>): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => redactEvidenceValue(item, seen));
  }
  if (typeof value === "string") {
    return redactEvidenceText(value);
  }
  if (typeof value !== "object" || value === null) {
    return value;
  }
  if (seen.has(value)) {
    return "[Circular]";
  }
  seen.add(value);
  const output: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    output[key] = SENSITIVE_EVIDENCE_KEY_PATTERN.test(key) && !SAFE_EVIDENCE_KEYS.has(key) ? "[REDACTED]" : redactEvidenceValue(entry, seen);
  }
  return output;
}

function resolveSafeOutputDir(outputDir: string | undefined): string {
  const root = resolve(outputDir ?? join(process.cwd(), "artifacts", "backup-restore-drill"));
  const tempRoot = resolve(tmpdir());
  const repoArtifactRoot = resolve(process.cwd(), "artifacts");
  if (!isWithinDirectory(repoArtifactRoot, root) && !isWithinDirectory(tempRoot, root)) {
    throw new Error("Backup output directory must be inside repo artifacts/ or the OS temp directory.");
  }
  return root;
}

function connectionArgs(parsed: URL, env: NodeJS.ProcessEnv): string[] {
  const dockerComposeMode = usesDockerComposePgTools(env);
  const args = [
    "--username",
    decodeURIComponent(parsed.username || "postgres"),
    "--dbname",
    decodeURIComponent(parsed.pathname.replace(/^\//, "")),
  ];
  if (dockerComposeMode) {
    return args;
  }
  return [
    "--host",
    parsed.hostname,
    "--port",
    parsed.port || "5432",
    ...args,
  ];
}

function buildPgEnv(parsed: URL, env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  return {
    ...env,
    PGPASSWORD: decodeURIComponent(parsed.password || ""),
  };
}

const defaultExecutor: CommandExecutor = {
  run(command, args, options) {
    const result = spawnSync(command, args, {
      encoding: "utf8",
      env: options.env,
      shell: process.platform === "win32",
    });
    return { status: result.status, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
  },
};

function runPgTool(
  command: "pg_dump" | "pg_restore" | "psql",
  args: string[],
  parsed: URL,
  env: NodeJS.ProcessEnv,
  options: { executor: CommandExecutor; binaryStdout?: boolean; input?: Buffer },
): ToolResult {
  if (!usesDockerComposePgTools(env)) {
    return options.executor.run(command, args, { env: buildPgEnv(parsed, env) });
  }

  const composeFile = env.LEDGERBYTE_DR_PG_DOCKER_COMPOSE_FILE ?? resolve(process.cwd(), "..", "..", "infra", "docker-compose.yml");
  const service = env.LEDGERBYTE_DR_PG_DOCKER_SERVICE ?? "postgres";
  const result = spawnSync("docker", ["compose", "-f", composeFile, "exec", "-T", service, command, ...args], {
    encoding: options.binaryStdout ? "buffer" : "utf8",
    input: options.input,
    env,
    maxBuffer: 1024 * 1024 * 100,
  });
  return {
    status: result.status,
    stdout: result.stdout ?? (options.binaryStdout ? Buffer.alloc(0) : ""),
    stderr: String(result.stderr ?? ""),
  };
}

function usesDockerComposePgTools(env: NodeJS.ProcessEnv): boolean {
  return env.LEDGERBYTE_DR_PG_TOOLS === "docker-compose" || Boolean(env.LEDGERBYTE_DR_PG_DOCKER_COMPOSE_FILE);
}

function toolOutputText(result: ToolResult, fallback = "unknown error"): string {
  if (result.stderr) {
    return result.stderr;
  }
  if (typeof result.stdout === "string" && result.stdout) {
    return result.stdout;
  }
  if (Buffer.isBuffer(result.stdout) && result.stdout.length > 0) {
    return "[binary output redacted]";
  }
  return fallback;
}

function runRequiredSql(parsed: URL, sql: string, env: NodeJS.ProcessEnv, executor: CommandExecutor): void {
  const result = runPgTool("psql", ["--set", "ON_ERROR_STOP=1", "--command", sql, ...connectionArgs(parsed, env)], parsed, env, { executor });
  if (result.status !== 0) {
    throw new Error(`psql failed during local drill database preparation: ${redactEvidenceText(toolOutputText(result))}`);
  }
}

function runPrismaMigrateDeploy(sourceDatabaseUrl: string, env: NodeJS.ProcessEnv): void {
  const result = spawnSync("prisma", ["migrate", "deploy"], {
    encoding: "utf8",
    env: {
      ...env,
      DATABASE_URL: sourceDatabaseUrl,
      DIRECT_URL: sourceDatabaseUrl,
    },
    shell: process.platform === "win32",
    cwd: process.cwd(),
  });
  if (result.status !== 0) {
    throw new Error(`Prisma migrate deploy failed for disposable local source database: ${redactEvidenceText(result.stderr || result.stdout || "unknown error")}`);
  }
}

function deriveAdminDatabaseUrl(sourceDatabaseUrl: string | undefined): string | undefined {
  if (!sourceDatabaseUrl) {
    return undefined;
  }
  const parsed = new URL(sourceDatabaseUrl);
  parsed.pathname = "/postgres";
  return parsed.toString();
}

function quoteIdentifier(value: string): string {
  if (!DISPOSABLE_DB_MARKERS.test(value)) {
    throw new Error("Database identifier must be disposable-looking before it can be used in fixture preparation.");
  }
  return `"${value.replace(/"/g, '""')}"`;
}

function isExpectedOutput(check: RestoreVerificationCheck, output: string): boolean {
  if (check.expected === "query-succeeds") {
    return true;
  }
  if (check.expected === "positive-number") {
    return Number(output) > 0;
  }
  return /^(t|true|1)$/i.test(output.trim());
}

function sha256File(filePath: string): string {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

function isWithinDirectory(parentDir: string, candidatePath: string): boolean {
  const absoluteParent = resolve(parentDir);
  const absoluteCandidate = resolve(candidatePath);
  const pathRelative = relative(absoluteParent, absoluteCandidate);
  return pathRelative !== "" && !pathRelative.startsWith("..") && !isAbsolute(pathRelative);
}
