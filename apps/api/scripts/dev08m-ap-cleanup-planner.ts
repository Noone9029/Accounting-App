import { PrismaClient } from "@prisma/client";

type CleanupPlannerMode = "plan" | "dry-run";
type TargetKind = "not-provided" | "local";

export const REQUIRED_DEV08M_MARKER = "DEV08M-AP-20260529T000000";

const DEV08_SOURCE_MARKERS = [
  "DEV08-AP-20260525T230000",
  "DEV08B-AP-20260526T060000",
  "DEV08C-AP-20260526T000000",
  "DEV08D-AP-20260526T000000",
  "DEV08E-AP-20260526T000000",
  "DEV08F-AP-20260527T000000",
  "DEV08G-AP-20260527T000000",
  "DEV08H-AP-20260528T000000",
  "DEV08I-AP-20260528T000000",
  "DEV08J-AP-20260528T000000",
  "DEV08K-AP-20260528T000000",
  "DEV08L-AP-20260529T000000",
] as const;

const LOCAL_DATABASE_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "0.0.0.0", "host.docker.internal", "postgres"]);

const FORBIDDEN_TARGET_PATTERNS = [
  /supabase(?:\.co|\.com)?/i,
  /pooler\.supabase/i,
  /vercel(?:\.app)?/i,
  /amazonaws/i,
  /rds\.amazonaws/i,
  /railway(?:\.app)?/i,
  /render(?:\.com|\.internal|\.onrender\.com)?/i,
  /fly\.dev/i,
  /digitalocean(?:\.com|spaces\.com)?/i,
  /neon\.tech/i,
  /(^|[.\-_/])prod(?:uction)?($|[.\-_/])/i,
  /(^|[.\-_/])beta($|[.\-_/])/i,
  /(^|[.\-_/])staging($|[.\-_/])/i,
  /(^|[.\-_/])live($|[.\-_/])/i,
  /user[-_]?testing/i,
];

const DESTRUCTIVE_ARGUMENT_PATTERNS = [
  /(^|[-_:])execute($|[-_:])/i,
  /(^|[-_:])delete($|[-_:])/i,
  /(^|[-_:])purge($|[-_:])/i,
  /(^|[-_:])truncate($|[-_:])/i,
  /(^|[-_:])drop($|[-_:])/i,
  /(^|[-_:])archive($|[-_:])/i,
  /(^|[-_:])revoke($|[-_:])/i,
  /(^|[-_:])apply($|[-_:])/i,
  /allow[-_]?deletion/i,
  /cleanup[-_]?run/i,
];

const DEPENDENCY_ORDER = [
  "report only; no deletion approved",
  "email provider events",
  "email outbox rows",
  "generated document metadata/content rows",
  "audit/auth rows",
  "allocation/reversal rows",
  "journal lines and journal entries",
  "stock movements and receipt lines",
  "AP source document lines",
  "AP source documents",
  "users, roles, memberships",
  "organization-level ZATCA metadata/logs",
];

const PRESERVE_BY_DEFAULT = [
  "AP source documents and lines",
  "journal entries and journal lines",
  "allocations and reversal evidence",
  "purchase receipts, receipt lines, and stock movements",
  "generated documents and PDF archive metadata/content",
  "email outbox rows and provider-event evidence",
  "audit logs, users, roles, and memberships",
  "ZATCA metadata, submission logs, signed-artifact planning rows, and storage policy evidence",
];

const DEFAULT_SKIPPED = [
  "delete/update/archive/revoke execution",
  "login, API mutation, browser flow, export, download, body/base64 output, and customer-data inspection",
  "migrations, seed/reset/delete, full tests, full build, full E2E, full smoke, deploys, environment/provider/schema changes, backup/restore, and production-hosting research",
  "real email, SMTP/provider sends, retry workers, provider webhooks, diagnostics sends, real AP delivery, real ZATCA, signing, clearance/reporting, PDF/A-3, CSID, SDK network paths, signed XML, and QR payload handling",
  "production, beta, hosted/shared, or customer-data targets",
];

type RunnerEnvironment = Partial<Pick<NodeJS.ProcessEnv, "DATABASE_URL" | "LEDGERBYTE_DEV08M_DATABASE_URL">>;

type RunnerLogger = {
  log: (message: string) => void;
  error: (message: string) => void;
};

type ParsedCleanupPlannerArgs = {
  mode: CleanupPlannerMode;
  marker?: string;
  databaseUrl?: string;
  jsonSummary: boolean;
};

export type TargetClassification = {
  kind: TargetKind;
  label: string;
  protocol?: string;
  host?: string;
  port?: string;
  database?: string;
};

export type CleanupInventoryCounts = {
  markersDetected: number;
  sourceDocuments: number;
  sourceLines: number;
  journalsAndJournalLines: number;
  allocations: number;
  receiptsAndStockMovements: number;
  generatedDocumentsBySource: number;
  emailOutboxBySourceOrDocument: number;
  providerEventsForGeneratedDocumentEmails: number;
  auditLogsForSourceIds: number;
  zatcaMarkerHits: number;
  usersRolesMembershipsMarkerHits: number;
};

export type CleanupPlannerPlan = {
  mode: CleanupPlannerMode;
  marker: string;
  sourceMarkers: string[];
  databaseTarget: TargetClassification;
  dryRun: true;
  readOnly: true;
  noMutation: true;
  noDeletion: true;
  deletionPathImplemented: false;
  bodyOrSecretOutputPrinted: false;
  jsonSummary: boolean;
  dependencyOrder: string[];
  preserveByDefault: string[];
  skipped: string[];
  databaseUrl?: string;
};

export type CleanupPlannerDryRunSummary = CleanupPlannerPlan & {
  inventory: CleanupInventoryCounts;
  deletionApproved: false;
  cleanupExecuted: false;
};

type InventoryCollector = (plan: CleanupPlannerPlan) => Promise<CleanupInventoryCounts>;

type CountRow = {
  count: number | bigint | string;
};

export function buildCleanupPlannerPlan(argv: string[], env: RunnerEnvironment = {}): CleanupPlannerPlan {
  const parsed = parseCleanupPlannerArgs(argv, env);
  const marker = validateMarker(parsed.marker);
  const databaseTarget = classifyDatabaseUrl(parsed.databaseUrl);

  if (parsed.mode === "dry-run" && databaseTarget.kind !== "local") {
    throw new Error("DEV-08M AP cleanup dry-run requires an explicit local database target via --database-url or LEDGERBYTE_DEV08M_DATABASE_URL.");
  }

  const plan: CleanupPlannerPlan = {
    mode: parsed.mode,
    marker,
    sourceMarkers: [...DEV08_SOURCE_MARKERS],
    databaseTarget,
    dryRun: true,
    readOnly: true,
    noMutation: true,
    noDeletion: true,
    deletionPathImplemented: false,
    bodyOrSecretOutputPrinted: false,
    jsonSummary: parsed.jsonSummary,
    dependencyOrder: [...DEPENDENCY_ORDER],
    preserveByDefault: [...PRESERVE_BY_DEFAULT],
    skipped: [...DEFAULT_SKIPPED],
  };

  if (parsed.databaseUrl) {
    Object.defineProperty(plan, "databaseUrl", {
      value: parsed.databaseUrl,
      enumerable: false,
      configurable: false,
      writable: false,
    });
  }

  return plan;
}

export function renderCleanupPlannerPlan(plan: CleanupPlannerPlan): string {
  return [
    "DEV-08M AP cleanup planner",
    `mode: ${plan.mode}`,
    `marker: ${plan.marker}`,
    `target: ${plan.databaseTarget.label}`,
    "dryRun: true",
    "readOnly: true",
    "noMutation: true",
    "noDeletion: true",
    "deletionPathImplemented: false",
    "bodyOrSecretOutputPrinted: false",
    "NO DELETION PATH IMPLEMENTED",
    "COUNT-ONLY OUTPUT",
    `sourceMarkerCount: ${plan.sourceMarkers.length}`,
    "dependencyOrder:",
    ...plan.dependencyOrder.map((entry, index) => `${index + 1}. ${entry}`),
    "preserveByDefault:",
    ...plan.preserveByDefault.map((entry) => `- ${entry}`),
  ].join("\n");
}

export function renderCleanupPlannerDryRun(summary: CleanupPlannerDryRunSummary): string {
  return [
    renderCleanupPlannerPlan(summary),
    "inventory:",
    `markersDetected: ${summary.inventory.markersDetected}`,
    `sourceDocuments: ${summary.inventory.sourceDocuments}`,
    `sourceLines: ${summary.inventory.sourceLines}`,
    `journalsAndJournalLines: ${summary.inventory.journalsAndJournalLines}`,
    `allocations: ${summary.inventory.allocations}`,
    `receiptsAndStockMovements: ${summary.inventory.receiptsAndStockMovements}`,
    `generatedDocumentsBySource: ${summary.inventory.generatedDocumentsBySource}`,
    `emailOutboxBySourceOrDocument: ${summary.inventory.emailOutboxBySourceOrDocument}`,
    `providerEventsForGeneratedDocumentEmails: ${summary.inventory.providerEventsForGeneratedDocumentEmails}`,
    `auditLogsForSourceIds: ${summary.inventory.auditLogsForSourceIds}`,
    `zatcaMarkerHits: ${summary.inventory.zatcaMarkerHits}`,
    `usersRolesMembershipsMarkerHits: ${summary.inventory.usersRolesMembershipsMarkerHits}`,
    "cleanupExecuted: false",
    "deletionApproved: false",
  ].join("\n");
}

export async function runCleanupPlanner(
  argv: string[] = process.argv.slice(2),
  env: RunnerEnvironment = process.env,
  logger: RunnerLogger = console,
  collectInventory: InventoryCollector = collectCleanupInventoryFromDatabase,
): Promise<number> {
  try {
    const plan = buildCleanupPlannerPlan(argv, env);
    if (plan.mode === "plan") {
      logger.log(plan.jsonSummary ? JSON.stringify(toJsonSafePlan(plan), null, 2) : renderCleanupPlannerPlan(plan));
      return 0;
    }

    const inventory = await collectInventory(plan);
    const summary: CleanupPlannerDryRunSummary = {
      ...plan,
      inventory,
      deletionApproved: false,
      cleanupExecuted: false,
    };
    logger.log(plan.jsonSummary ? JSON.stringify(toJsonSafeSummary(summary), null, 2) : renderCleanupPlannerDryRun(summary));
    return 0;
  } catch (error) {
    logger.error(sanitizeError(error));
    return 1;
  }
}

export function classifyDatabaseUrl(value: string | undefined): TargetClassification {
  if (!value) {
    return { kind: "not-provided", label: "not provided" };
  }

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error("DEV-08M cleanup planner requires a valid PostgreSQL database URL.");
  }

  const protocol = parsed.protocol.replace(/:$/, "");
  if (protocol !== "postgresql" && protocol !== "postgres") {
    throw new Error("DEV-08M cleanup planner requires a PostgreSQL database URL.");
  }

  const host = parsed.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  const database = decodeURIComponent(parsed.pathname.replace(/^\/+/, "")).split("?")[0] || "unknown";
  const targetText = `${host}/${database}`;

  if (FORBIDDEN_TARGET_PATTERNS.some((pattern) => pattern.test(targetText))) {
    throw new Error("DEV-08M cleanup planner refuses hosted or forbidden database targets.");
  }

  if (!LOCAL_DATABASE_HOSTS.has(host)) {
    throw new Error("DEV-08M cleanup planner refuses non-local database targets.");
  }

  return {
    kind: "local",
    label: `${protocol}://${host}${parsed.port ? `:${parsed.port}` : ""}/${database}`,
    protocol,
    host,
    port: parsed.port || undefined,
    database,
  };
}

async function collectCleanupInventoryFromDatabase(plan: CleanupPlannerPlan): Promise<CleanupInventoryCounts> {
  if (!plan.databaseUrl) {
    throw new Error("DEV-08M AP cleanup dry-run requires an explicit local database target.");
  }

  const prisma = new PrismaClient({ datasources: { db: { url: plan.databaseUrl } } });
  try {
    await prisma.$connect();
    return {
      markersDetected: await detectSourceMarkers(prisma),
      sourceDocuments: await countFromSql(prisma, `${SOURCE_CTE} SELECT COUNT(*)::int AS count FROM source_documents`),
      sourceLines: await countFromSql(prisma, `${SOURCE_CTE} ${SOURCE_LINE_COUNT_SQL}`),
      journalsAndJournalLines: await countFromSql(prisma, `${SOURCE_CTE} ${JOURNAL_COUNT_SQL}`),
      allocations: await countFromSql(prisma, `${SOURCE_CTE} ${ALLOCATION_COUNT_SQL}`),
      receiptsAndStockMovements: await countFromSql(prisma, `${SOURCE_CTE} ${RECEIPT_STOCK_COUNT_SQL}`),
      generatedDocumentsBySource: await countFromSql(prisma, `${SOURCE_CTE} ${GENERATED_DOCUMENT_COUNT_SQL}`),
      emailOutboxBySourceOrDocument: await countFromSql(prisma, `${SOURCE_CTE} ${EMAIL_OUTBOX_COUNT_SQL}`),
      providerEventsForGeneratedDocumentEmails: await countFromSql(prisma, `${SOURCE_CTE} ${PROVIDER_EVENT_COUNT_SQL}`),
      auditLogsForSourceIds: await countFromSql(prisma, `${SOURCE_CTE} ${AUDIT_LOG_COUNT_SQL}`),
      zatcaMarkerHits: await countFromSql(prisma, `${SOURCE_CTE} ${ZATCA_MARKER_COUNT_SQL}`),
      usersRolesMembershipsMarkerHits: await countFromSql(prisma, `${SOURCE_CTE} ${USER_ROLE_MEMBER_COUNT_SQL}`),
    };
  } finally {
    await prisma.$disconnect();
  }
}

function parseCleanupPlannerArgs(argv: string[], env: RunnerEnvironment): ParsedCleanupPlannerArgs {
  const parsed: ParsedCleanupPlannerArgs = {
    mode: "dry-run",
    databaseUrl: env.LEDGERBYTE_DEV08M_DATABASE_URL,
    jsonSummary: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg || arg === "--") {
      continue;
    }

    assertNotDestructiveArg(arg);
    const { flag, value } = splitFlag(arg);

    switch (flag) {
      case "--help":
      case "-h":
        throw new Error(helpText());
      case "--plan":
        parsed.mode = "plan";
        break;
      case "--dry-run":
        parsed.mode = "dry-run";
        break;
      case "--marker":
        parsed.marker = readFlagValue(flag, value, argv, () => {
          index += 1;
          return argv[index];
        });
        break;
      case "--database-url":
        parsed.databaseUrl = readFlagValue(flag, value, argv, () => {
          index += 1;
          return argv[index];
        });
        break;
      case "--json-summary":
        parsed.jsonSummary = true;
        break;
      default:
        if (flag.startsWith("-")) {
          throw new Error(`Unknown DEV-08M cleanup planner flag: ${flag}`);
        }
        throw new Error(`Unexpected DEV-08M cleanup planner argument: ${flag}`);
    }
  }

  return parsed;
}

function validateMarker(marker: string | undefined): string {
  if (!marker) {
    throw new Error("DEV-08M cleanup planner marker is required.");
  }
  if (marker !== REQUIRED_DEV08M_MARKER) {
    throw new Error(`DEV-08M cleanup planner requires the exact DEV-08M marker ${REQUIRED_DEV08M_MARKER}.`);
  }
  return marker;
}

function splitFlag(arg: string): { flag: string; value?: string } {
  const equalsIndex = arg.indexOf("=");
  if (equalsIndex === -1) {
    return { flag: arg };
  }
  return { flag: arg.slice(0, equalsIndex), value: arg.slice(equalsIndex + 1) };
}

function readFlagValue(flag: string, inlineValue: string | undefined, argv: string[], next: () => string | undefined): string {
  const value = inlineValue ?? next();
  if (!value || value.startsWith("--")) {
    throw new Error(`DEV-08M cleanup planner flag ${flag} requires a value.`);
  }
  assertNotDestructiveArg(value);
  return value;
}

function assertNotDestructiveArg(value: string): void {
  if (DESTRUCTIVE_ARGUMENT_PATTERNS.some((pattern) => pattern.test(value))) {
    throw new Error("DEV-08M cleanup planner is dry-run only; destructive cleanup arguments are refused.");
  }
}

async function detectSourceMarkers(prisma: PrismaClient): Promise<number> {
  let detected = 0;
  for (const marker of DEV08_SOURCE_MARKERS) {
    const count = await countFromSql(prisma, `${sourceCteForMarker()} ${MARKER_DETECTION_COUNT_SQL}`, [`%${marker}%`]);
    if (count > 0) {
      detected += 1;
    }
  }
  return detected;
}

async function countFromSql(prisma: PrismaClient, sql: string, params: string[] = markerPatterns()): Promise<number> {
  const rows = await prisma.$queryRawUnsafe<CountRow[]>(sql, ...params);
  return Number(rows[0]?.count ?? 0);
}

function markerPatterns(): string[] {
  return DEV08_SOURCE_MARKERS.map((marker) => `%${marker}%`);
}

function markerAnySql(column: string): string {
  return `${column} ILIKE ANY (ARRAY[${markerPlaceholders()}])`;
}

function markerPlaceholders(): string {
  return DEV08_SOURCE_MARKERS.map((_, index) => `$${index + 1}`).join(", ");
}

function sourceCteForMarker(): string {
  return SOURCE_CTE.replaceAll(markerPlaceholders(), "$1");
}

function toJsonSafePlan(plan: CleanupPlannerPlan): Omit<CleanupPlannerPlan, "databaseUrl"> {
  const { databaseUrl: _databaseUrl, ...safePlan } = plan;
  return safePlan;
}

function toJsonSafeSummary(summary: CleanupPlannerDryRunSummary): Omit<CleanupPlannerDryRunSummary, "databaseUrl"> {
  const { databaseUrl: _databaseUrl, ...safeSummary } = summary;
  return safeSummary;
}

function sanitizeError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message
    .replace(/postgres(?:ql)?:\/\/[^@\s]+@/gi, "postgresql://[REDACTED]@")
    .replace(/password["']?\s*:\s*["'][^"']+["']/gi, "password:[REDACTED]")
    .replace(/token["']?\s*:\s*["'][^"']+["']/gi, "token:[REDACTED]")
    .replace(/secret["']?\s*:\s*["'][^"']+["']/gi, "secret:[REDACTED]");
}

function helpText(): string {
  return [
    "DEV-08M AP cleanup dry-run planner",
    "",
    "Usage:",
    `  tsx scripts/dev08m-ap-cleanup-planner.ts --plan --marker ${REQUIRED_DEV08M_MARKER}`,
    `  tsx scripts/dev08m-ap-cleanup-planner.ts --dry-run --marker ${REQUIRED_DEV08M_MARKER} --database-url postgresql://...localhost.../accounting`,
    "",
    "This script is dry-run only. It refuses execute/delete/archive/revoke/purge/truncate/drop arguments.",
  ].join("\n");
}

const SOURCE_CTE = `
WITH
purchase_orders AS (
  SELECT id, "organizationId", "createdById"
  FROM "PurchaseOrder"
  WHERE ${markerAnySql('"purchaseOrderNumber"')} OR ${markerAnySql('COALESCE("notes", \'\')')} OR ${markerAnySql('COALESCE("terms", \'\')')}
),
purchase_bills AS (
  SELECT id, "organizationId", "createdById", "journalEntryId", "reversalJournalEntryId"
  FROM "PurchaseBill"
  WHERE ${markerAnySql('"billNumber"')} OR ${markerAnySql('COALESCE("notes", \'\')')} OR ${markerAnySql('COALESCE("terms", \'\')')}
    OR "purchaseOrderId" IN (SELECT id FROM purchase_orders)
),
supplier_payments AS (
  SELECT id, "organizationId", "createdById", "journalEntryId", "voidReversalJournalEntryId"
  FROM "SupplierPayment"
  WHERE ${markerAnySql('"paymentNumber"')} OR ${markerAnySql('COALESCE("description", \'\')')}
),
purchase_debit_notes AS (
  SELECT id, "organizationId", "createdById", "journalEntryId", "reversalJournalEntryId"
  FROM "PurchaseDebitNote"
  WHERE ${markerAnySql('"debitNoteNumber"')} OR ${markerAnySql('COALESCE("notes", \'\')')} OR ${markerAnySql('COALESCE("reason", \'\')')}
    OR "originalBillId" IN (SELECT id FROM purchase_bills)
),
supplier_refunds AS (
  SELECT id, "organizationId", "createdById", "journalEntryId", "voidReversalJournalEntryId"
  FROM "SupplierRefund"
  WHERE ${markerAnySql('"refundNumber"')} OR ${markerAnySql('COALESCE("description", \'\')')}
    OR "sourcePaymentId" IN (SELECT id FROM supplier_payments)
    OR "sourceDebitNoteId" IN (SELECT id FROM purchase_debit_notes)
),
cash_expenses AS (
  SELECT id, "organizationId", "createdById", "journalEntryId", "voidReversalJournalEntryId"
  FROM "CashExpense"
  WHERE ${markerAnySql('"expenseNumber"')} OR ${markerAnySql('COALESCE("description", \'\')')} OR ${markerAnySql('COALESCE("notes", \'\')')}
),
purchase_receipts AS (
  SELECT id, "organizationId", "createdById", "inventoryAssetJournalEntryId", "inventoryAssetReversalJournalEntryId"
  FROM "PurchaseReceipt"
  WHERE ${markerAnySql('"receiptNumber"')} OR ${markerAnySql('COALESCE("notes", \'\')')}
    OR "purchaseOrderId" IN (SELECT id FROM purchase_orders)
    OR "purchaseBillId" IN (SELECT id FROM purchase_bills)
),
source_documents AS (
  SELECT 'PurchaseOrder'::text AS source_type, id, "organizationId", "createdById" FROM purchase_orders
  UNION ALL SELECT 'PurchaseBill'::text, id, "organizationId", "createdById" FROM purchase_bills
  UNION ALL SELECT 'SupplierPayment'::text, id, "organizationId", "createdById" FROM supplier_payments
  UNION ALL SELECT 'SupplierRefund'::text, id, "organizationId", "createdById" FROM supplier_refunds
  UNION ALL SELECT 'PurchaseDebitNote'::text, id, "organizationId", "createdById" FROM purchase_debit_notes
  UNION ALL SELECT 'CashExpense'::text, id, "organizationId", "createdById" FROM cash_expenses
  UNION ALL SELECT 'PurchaseReceipt'::text, id, "organizationId", "createdById" FROM purchase_receipts
),
source_organizations AS (
  SELECT DISTINCT "organizationId" FROM source_documents
),
generated_documents AS (
  SELECT gd.id, gd."organizationId"
  FROM "GeneratedDocument" gd
  WHERE EXISTS (
      SELECT 1 FROM source_documents source
      WHERE source.source_type = gd."sourceType" AND source.id::text = gd."sourceId"
    )
    OR ${markerAnySql('gd."documentNumber"')}
    OR ${markerAnySql('gd."filename"')}
),
email_outbox AS (
  SELECT eo.id, eo."organizationId"
  FROM "EmailOutbox" eo
  WHERE eo."generatedDocumentId" IN (SELECT id FROM generated_documents)
    OR EXISTS (
      SELECT 1 FROM source_documents source
      WHERE source.source_type = eo."sourceType" AND source.id::text = eo."sourceId"
    )
    OR ${markerAnySql('eo."subject"')}
    OR ${markerAnySql('eo."bodyText"')}
    OR ${markerAnySql('COALESCE(eo."bodyHtml", \'\')')}
    OR ${markerAnySql('COALESCE(eo."attachmentFilename", \'\')')}
),
journal_entries AS (
  SELECT id, "organizationId"
  FROM "JournalEntry"
  WHERE id IN (
      SELECT "journalEntryId" FROM purchase_bills WHERE "journalEntryId" IS NOT NULL
      UNION SELECT "reversalJournalEntryId" FROM purchase_bills WHERE "reversalJournalEntryId" IS NOT NULL
      UNION SELECT "journalEntryId" FROM supplier_payments WHERE "journalEntryId" IS NOT NULL
      UNION SELECT "voidReversalJournalEntryId" FROM supplier_payments WHERE "voidReversalJournalEntryId" IS NOT NULL
      UNION SELECT "journalEntryId" FROM supplier_refunds WHERE "journalEntryId" IS NOT NULL
      UNION SELECT "voidReversalJournalEntryId" FROM supplier_refunds WHERE "voidReversalJournalEntryId" IS NOT NULL
      UNION SELECT "journalEntryId" FROM purchase_debit_notes WHERE "journalEntryId" IS NOT NULL
      UNION SELECT "reversalJournalEntryId" FROM purchase_debit_notes WHERE "reversalJournalEntryId" IS NOT NULL
      UNION SELECT "journalEntryId" FROM cash_expenses WHERE "journalEntryId" IS NOT NULL
      UNION SELECT "voidReversalJournalEntryId" FROM cash_expenses WHERE "voidReversalJournalEntryId" IS NOT NULL
      UNION SELECT "inventoryAssetJournalEntryId" FROM purchase_receipts WHERE "inventoryAssetJournalEntryId" IS NOT NULL
      UNION SELECT "inventoryAssetReversalJournalEntryId" FROM purchase_receipts WHERE "inventoryAssetReversalJournalEntryId" IS NOT NULL
    )
    OR ${markerAnySql('"entryNumber"')}
    OR ${markerAnySql('COALESCE("description", \'\')')}
    OR ${markerAnySql('COALESCE("reference", \'\')')}
)
`;

const SOURCE_LINE_COUNT_SQL = `
SELECT (
  (SELECT COUNT(*) FROM "PurchaseOrderLine" WHERE "purchaseOrderId" IN (SELECT id FROM purchase_orders)) +
  (SELECT COUNT(*) FROM "PurchaseBillLine" WHERE "billId" IN (SELECT id FROM purchase_bills)) +
  (SELECT COUNT(*) FROM "PurchaseDebitNoteLine" WHERE "debitNoteId" IN (SELECT id FROM purchase_debit_notes)) +
  (SELECT COUNT(*) FROM "CashExpenseLine" WHERE "cashExpenseId" IN (SELECT id FROM cash_expenses)) +
  (SELECT COUNT(*) FROM "PurchaseReceiptLine" WHERE "receiptId" IN (SELECT id FROM purchase_receipts))
)::int AS count
`;

const JOURNAL_COUNT_SQL = `
SELECT (
  (SELECT COUNT(*) FROM journal_entries) +
  (SELECT COUNT(*) FROM "JournalLine" WHERE "journalEntryId" IN (SELECT id FROM journal_entries))
)::int AS count
`;

const ALLOCATION_COUNT_SQL = `
SELECT (
  (SELECT COUNT(*) FROM "SupplierPaymentAllocation" WHERE "paymentId" IN (SELECT id FROM supplier_payments) OR "billId" IN (SELECT id FROM purchase_bills)) +
  (SELECT COUNT(*) FROM "SupplierPaymentUnappliedAllocation" WHERE "paymentId" IN (SELECT id FROM supplier_payments) OR "billId" IN (SELECT id FROM purchase_bills)) +
  (SELECT COUNT(*) FROM "PurchaseDebitNoteAllocation" WHERE "debitNoteId" IN (SELECT id FROM purchase_debit_notes) OR "billId" IN (SELECT id FROM purchase_bills))
)::int AS count
`;

const RECEIPT_STOCK_COUNT_SQL = `
SELECT (
  (SELECT COUNT(*) FROM purchase_receipts) +
  (SELECT COUNT(*) FROM "PurchaseReceiptLine" WHERE "receiptId" IN (SELECT id FROM purchase_receipts)) +
  (SELECT COUNT(*)
   FROM "StockMovement" sm
   WHERE ${markerAnySql('COALESCE(sm."description", \'\')')}
      OR sm."referenceId" IN (SELECT id::text FROM source_documents)
      OR sm.id IN (
        SELECT "stockMovementId" FROM "PurchaseReceiptLine" WHERE "receiptId" IN (SELECT id FROM purchase_receipts) AND "stockMovementId" IS NOT NULL
        UNION SELECT "voidStockMovementId" FROM "PurchaseReceiptLine" WHERE "receiptId" IN (SELECT id FROM purchase_receipts) AND "voidStockMovementId" IS NOT NULL
      ))
)::int AS count
`;

const GENERATED_DOCUMENT_COUNT_SQL = `
SELECT COUNT(*)::int AS count FROM generated_documents
`;

const EMAIL_OUTBOX_COUNT_SQL = `
SELECT COUNT(*)::int AS count FROM email_outbox
`;

const PROVIDER_EVENT_COUNT_SQL = `
SELECT COUNT(*)::int AS count FROM "EmailProviderEvent" WHERE "emailOutboxId" IN (SELECT id FROM email_outbox)
`;

const AUDIT_LOG_COUNT_SQL = `
SELECT COUNT(*)::int AS count
FROM "AuditLog"
WHERE "entityId" IN (SELECT id::text FROM source_documents)
`;

const ZATCA_MARKER_COUNT_SQL = `
SELECT (
  (SELECT COUNT(*) FROM "ZatcaOrganizationProfile" WHERE "organizationId" IN (SELECT "organizationId" FROM source_organizations) AND (${markerAnySql('COALESCE("sellerName", \'\')')} OR ${markerAnySql('COALESCE("vatNumber", \'\')')})) +
  (SELECT COUNT(*) FROM "ZatcaEgsUnit" WHERE "organizationId" IN (SELECT "organizationId" FROM source_organizations) AND (${markerAnySql('"name"')} OR ${markerAnySql('"deviceSerialNumber"')})) +
  (SELECT COUNT(*) FROM "ZatcaSubmissionLog" WHERE "organizationId" IN (SELECT "organizationId" FROM source_organizations) AND (${markerAnySql('COALESCE("responseCode", \'\')')} OR ${markerAnySql('COALESCE("errorCode", \'\')')} OR ${markerAnySql('COALESCE("errorMessage", \'\')')}))
)::int AS count
`;

const USER_ROLE_MEMBER_COUNT_SQL = `
SELECT (
  (SELECT COUNT(*) FROM "User" WHERE ${markerAnySql('"email"')} OR ${markerAnySql('"name"')}) +
  (SELECT COUNT(*) FROM "Role" WHERE "organizationId" IN (SELECT "organizationId" FROM source_organizations) AND ${markerAnySql('"name"')}) +
  (SELECT COUNT(*)
   FROM "OrganizationMember" om
   WHERE om."organizationId" IN (SELECT "organizationId" FROM source_organizations)
     AND (
       om."userId" IN (SELECT id FROM "User" WHERE ${markerAnySql('"email"')} OR ${markerAnySql('"name"')})
       OR om."roleId" IN (SELECT id FROM "Role" WHERE ${markerAnySql('"name"')})
     ))
)::int AS count
`;

const MARKER_DETECTION_COUNT_SQL = `
SELECT (
  (SELECT COUNT(*) FROM source_documents) +
  (SELECT COUNT(*) FROM "PurchaseOrderLine" WHERE "description" ILIKE $1) +
  (SELECT COUNT(*) FROM "PurchaseBillLine" WHERE "description" ILIKE $1) +
  (SELECT COUNT(*) FROM "PurchaseDebitNoteLine" WHERE "description" ILIKE $1) +
  (SELECT COUNT(*) FROM "CashExpenseLine" WHERE "description" ILIKE $1) +
  (SELECT COUNT(*) FROM "StockMovement" WHERE COALESCE("description", '') ILIKE $1) +
  (SELECT COUNT(*) FROM "JournalLine" WHERE COALESCE("description", '') ILIKE $1) +
  (SELECT COUNT(*) FROM generated_documents) +
  (SELECT COUNT(*) FROM email_outbox) +
  (SELECT COUNT(*) FROM "AuditLog" WHERE "entityId" IN (SELECT id::text FROM source_documents)) +
  (SELECT COUNT(*) FROM "User" WHERE "email" ILIKE $1 OR "name" ILIKE $1) +
  (SELECT COUNT(*) FROM "Role" WHERE "name" ILIKE $1) +
  (SELECT COUNT(*)
   FROM "OrganizationMember" om
   WHERE om."userId" IN (SELECT id FROM "User" WHERE "email" ILIKE $1 OR "name" ILIKE $1)
      OR om."roleId" IN (SELECT id FROM "Role" WHERE "name" ILIKE $1)) +
  (SELECT COUNT(*) FROM "Organization" WHERE "name" ILIKE $1 OR COALESCE("legalName", '') ILIKE $1)
)::int AS count
`;

if (require.main === module) {
  runCleanupPlanner().then((exitCode) => {
    process.exitCode = exitCode;
  });
}
