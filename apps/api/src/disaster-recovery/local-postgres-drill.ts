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
  backupFile?: string;
  backupOutputDir?: string;
  gitCommit?: string;
  env?: NodeJS.ProcessEnv;
  now?: Date;
}

export interface CommandExecutor {
  run(command: string, args: string[], options: { env: NodeJS.ProcessEnv }): { status: number | null; stdout: string; stderr: string };
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
    check("organization-table", "Organization", "Tenant root table exists and can be counted.", `SELECT COUNT(*) FROM "Organization";`),
    check("user-table", "User", "User table exists and can be counted.", `SELECT COUNT(*) FROM "User";`),
    check("account-table", "Account", "Chart of accounts table exists and can be counted.", `SELECT COUNT(*) FROM "Account";`),
    check("journal-entry-table", "JournalEntry", "Journal entry table exists and can be counted.", `SELECT COUNT(*) FROM "JournalEntry";`),
    check("journal-line-table", "JournalLine", "Journal line table exists and can be counted.", `SELECT COUNT(*) FROM "JournalLine";`),
    check("sales-invoice-table", "SalesInvoice", "Sales invoice table exists and can be counted.", `SELECT COUNT(*) FROM "SalesInvoice";`),
    check("purchase-bill-table", "PurchaseBill", "Purchase bill table exists and can be counted.", `SELECT COUNT(*) FROM "PurchaseBill";`),
    check("tenant-scope-sample", "Organization", "Organization-scoped records remain countable without cross-tenant export.", `SELECT COUNT(DISTINCT "organizationId") FROM "Account";`),
    check("prisma-migrations", "_prisma_migrations", "Prisma migration history exists after restore.", `SELECT COUNT(*) FROM "_prisma_migrations";`),
    check("audit-log-request-id", "AuditLog", "Audit logs preserve nullable requestId.", `SELECT COUNT(*) FROM "AuditLog" WHERE "requestId" IS NOT NULL;`, true),
    check("generated-document-request-id", "GeneratedDocument", "Generated document metadata preserves nullable requestId.", `SELECT COUNT(*) FROM "GeneratedDocument" WHERE "requestId" IS NOT NULL;`, true),
    check("document-extraction-request-id", "DocumentExtractionResult", "Document extraction records preserve nullable requestId.", `SELECT COUNT(*) FROM "DocumentExtractionResult" WHERE "requestId" IS NOT NULL;`, true),
    check("document-review-request-id", "DocumentReviewDecision", "Document review records preserve nullable requestId.", `SELECT COUNT(*) FROM "DocumentReviewDecision" WHERE "requestId" IS NOT NULL;`, true),
    check("payment-provider-event-request-id", "PaymentProviderEvent", "Payment provider events preserve nullable requestId.", `SELECT COUNT(*) FROM "PaymentProviderEvent" WHERE "requestId" IS NOT NULL;`, true),
    check("invoice-payment-link", "InvoicePaymentLink", "Invoice payment-link records restore correctly if present.", `SELECT COUNT(*) FROM "InvoicePaymentLink";`),
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
    backup: input.backup ?? {
      filename: input.backupFile ? basename(input.backupFile) : null,
      checksumSha256: input.backupFile && existsSync(input.backupFile) ? sha256File(input.backupFile) : null,
      sizeBytes: input.backupFile && existsSync(input.backupFile) ? statSync(input.backupFile).size : null,
    },
    restoreVerification: input.verification ?? buildPlannedVerificationSummary(),
    blockedHostedProdMutationStatus: "blocked-by-default",
    noSecretsReturned: true,
    productionRecoveryProven: false,
    hostedProductionRecoveryProven: false,
    objectStorageRecoveryProven: false,
    warnings: input.warnings ?? [
      "Plan mode does not execute pg_dump, pg_restore, psql, hosted backup, or hosted restore operations.",
      "Hosted production recovery remains unproven.",
    ],
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
    ...(evidence.blockers.length > 0 ? evidence.blockers.map((item) => `- ${item}`) : ["- None recorded for this plan output."]),
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
  const args = ["--format=custom", "--no-owner", "--no-privileges", "--file", absolutePath, ...connectionArgs(parsed)];
  const result = executor.run("pg_dump", args, { env: buildPgEnv(parsed, env) });
  if (result.status !== 0) {
    throw new Error(`pg_dump failed for local backup target: ${redactEvidenceText(result.stderr || result.stdout || "unknown error")}`);
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
  const args = ["--clean", "--if-exists", "--no-owner", "--no-privileges", ...connectionArgs(parsed), input.backupFile];
  const result = executor.run("pg_restore", args, { env: buildPgEnv(parsed, env) });
  if (result.status !== 0) {
    throw new Error(`pg_restore failed for local disposable target: ${redactEvidenceText(result.stderr || result.stdout || "unknown error")}`);
  }
}

export function verifyRestore(input: DrillInput, executor: CommandExecutor = defaultExecutor): RestoreVerificationSummary {
  const env = input.env ?? process.env;
  const classification = classifyDatabaseTarget(input.restoreDatabaseUrl);
  assertRestoreAllowed(classification, env);
  const parsed = new URL(input.restoreDatabaseUrl as string);
  const results = getRestoreVerificationChecks().map((verificationCheck) => {
    const result = executor.run("psql", ["--tuples-only", "--no-align", "--command", verificationCheck.sql, ...connectionArgs(parsed)], {
      env: buildPgEnv(parsed, env),
    });
    const output = (result.stdout || "").trim();
    return {
      ...verificationCheck,
      passed: result.status === 0,
      observedValue: output || null,
      message: result.status === 0 ? "Query completed against local disposable restore database." : redactEvidenceText(result.stderr || result.stdout || "query failed"),
    };
  });

  return formatRestoreVerificationResult(results);
}

function check(id: string, table: string, description: string, sql: string, requestIdCoverage = false): RestoreVerificationCheck {
  return { id, table, description, sql, required: true, requestIdCoverage };
}

function hasOwnerApproval(env: NodeJS.ProcessEnv): boolean {
  return env[LOCAL_DRILL_APPROVAL_ENV] === OWNER_APPROVAL_PHRASE;
}

function redactEvidence(value: unknown): unknown {
  return redactEvidenceValue(value, new WeakSet<object>());
}

export function redactEvidenceText(value: string): string {
  return String(value ?? "")
    .replace(/\b(postgresql|postgres):\/\/[^\s"'<>]+/gi, "$1://[REDACTED]")
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

function connectionArgs(parsed: URL): string[] {
  return [
    "--host",
    parsed.hostname,
    "--port",
    parsed.port || "5432",
    "--username",
    decodeURIComponent(parsed.username || "postgres"),
    "--dbname",
    decodeURIComponent(parsed.pathname.replace(/^\//, "")),
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

function sha256File(filePath: string): string {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

function isWithinDirectory(parentDir: string, candidatePath: string): boolean {
  const absoluteParent = resolve(parentDir);
  const absoluteCandidate = resolve(candidatePath);
  const pathRelative = relative(absoluteParent, absoluteCandidate);
  return pathRelative !== "" && !pathRelative.startsWith("..") && !isAbsolute(pathRelative);
}
