import { createHash } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { PERMISSIONS } from "@ledgerbyte/shared";
import * as bcrypt from "bcryptjs";

type FixtureFamily = "ar" | "ap" | "bank" | "inv" | "jrd";
type FixtureFamilySelection = FixtureFamily | "all";
type FixtureRunnerMode = "plan" | "dry-run" | "cleanup-plan" | "execute";
type TargetKind = "not-provided" | "local-plan-only";

type TargetClassification = {
  kind: TargetKind;
  label: string;
  host?: string;
  protocol?: string;
  port?: string;
};

type FixtureProposedRecord = {
  group: string;
  recordType: string;
  marker: string;
  writeBehavior: "planned-only";
  notes: string[];
};

type FixtureWriteStatus = "created" | "reused";

type FixtureWrittenRecordSummary = {
  group: string;
  recordType: string;
  marker: string;
  status: FixtureWriteStatus;
  idHint: string;
};

type FixtureExecutionResult = {
  createdFixtureData: boolean;
  fixtureDataPresent: boolean;
  databaseConnectionOpened: boolean;
  databaseWritesPerformed: boolean;
  loginPerformed: false;
  auditWritingPerformed: false;
  lifecycleMutationsPerformed: false;
  outputActionsPerformed: false;
  records: FixtureWrittenRecordSummary[];
};

type FixtureFamilyPlan = {
  family: FixtureFamily;
  markerPrefix: string;
  purpose: string;
  plannedGroups: string[];
  cleanupInventory: string[];
  proposedRecords?: FixtureProposedRecord[];
};

type ExecuteApprovalGates = {
  allowLocalMutation: boolean;
  localDisposableDbApproved: boolean;
  fixtureCreationApproved: boolean;
  cleanupRetentionApproved: boolean;
  noProductionNoBetaApproved: boolean;
  noCustomerDataApproved: boolean;
};

type FixtureRunnerPlan = {
  mode: FixtureRunnerMode;
  family: FixtureFamilySelection;
  marker: string;
  runId: string;
  databaseTarget: TargetClassification;
  apiTarget: TargetClassification;
  families: FixtureFamilyPlan[];
  cleanupPlanOnly: boolean;
  jsonSummary: boolean;
  executeRequested: boolean;
  executeApprovedForSkeleton: boolean;
  executeRefused: boolean;
  executeRefusalReason?: string;
  approvalGates: ExecuteApprovalGates;
  createdFixtureData: boolean;
  fixtureDataPresent: boolean;
  fixtureCreationEnabled: boolean;
  mutationEnabled: boolean;
  databaseWritesEnabled: boolean;
  writesPerformed: boolean;
  loginEnabled: false;
  executeEnabled: boolean;
  executionResult?: FixtureExecutionResult;
  nextManualApproval: string;
  skipped: string[];
};

type ParsedArgs = {
  mode: FixtureRunnerMode;
  family: FixtureFamilySelection;
  marker?: string;
  databaseUrl?: string;
  apiUrl?: string;
  jsonSummary: boolean;
  executeRequested: boolean;
  approvalGates: ExecuteApprovalGates;
};

type RunnerEnvironment = Partial<Pick<NodeJS.ProcessEnv, "DATABASE_URL" | "LEDGERBYTE_DEV04_DATABASE_URL" | "LEDGERBYTE_DEV04_API_URL">>;

type RunnerLogger = {
  log: (message: string) => void;
  error: (message: string) => void;
};

type FixtureExecutor = (plan: FixtureRunnerPlan, databaseUrl: string) => Promise<FixtureExecutionResult>;

const FAMILY_ORDER = ["ar", "ap", "bank", "inv", "jrd"] as const;

const FAMILY_DEFINITIONS: Record<FixtureFamily, FixtureFamilyPlan> = {
  ar: {
    family: "ar",
    markerPrefix: "DEV03-AR-",
    purpose: "Sales/AR invoices, payments, refunds, credit notes, and AR output labels.",
    plannedGroups: [
      "bootstrap references: fixture org, fixture user, roles, membership, accounts, taxes",
      "business fixtures: customer, service item, draft/finalizable invoice, payment, refund, credit note",
      "future service layer boundary: invoice lifecycle, allocations, refunds, credit-note transitions",
      "output gate labels only: invoice/receipt PDF and archive checks remain unexecuted",
    ],
    cleanupInventory: ["contacts", "items", "sales invoices", "customer payments", "customer refunds", "credit notes", "generated documents"],
  },
  ap: {
    family: "ap",
    markerPrefix: "DEV03-AP-",
    purpose: "Purchases/AP purchase orders, bills, payments, refunds, debit notes, cash expenses, and AP output labels.",
    plannedGroups: [
      "bootstrap references: fixture org, fixture user, roles, membership, accounts, taxes",
      "business fixtures: supplier, purchase order, purchase bill, supplier payment, supplier refund, debit note, cash expense",
      "future service layer boundary: approval, close, finalization, allocation, reversal, and void transitions",
      "output gate labels only: purchase PDFs and archives remain unexecuted",
    ],
    cleanupInventory: ["contacts", "purchase orders", "purchase bills", "supplier payments", "supplier refunds", "debit notes", "cash expenses"],
  },
  bank: {
    family: "bank",
    markerPrefix: "DEV03-BANK-",
    purpose: "Banking/reconciliation bank profiles, transfers, statement imports, transactions, matching, and reconciliations.",
    plannedGroups: [
      "bootstrap references: fixture org, fixture user, roles, membership, cash and bank ledger accounts",
      "business fixtures: bank profiles, transfer candidate, fake statement import label, statement transaction label, reconciliation label",
      "future service layer boundary: transfers, import persistence, match, categorize, ignore, submit, approve, close, void",
      "output gate labels only: reconciliation report CSV/PDF/archive checks remain unexecuted",
    ],
    cleanupInventory: ["bank accounts", "bank transfers", "statement imports", "statement transactions", "reconciliations", "reconciliation events"],
  },
  inv: {
    family: "inv",
    markerPrefix: "DEV03-INV-",
    purpose: "Inventory items, warehouses, stock movements, adjustments, transfers, receipts, issues, valuation, and variance proposals.",
    plannedGroups: [
      "bootstrap references: fixture org, fixture user, roles, membership, inventory accounts, taxes",
      "business fixtures: inventory item, source/destination warehouses, opening movement label, adjustment, transfer, receipt, issue, variance proposal",
      "future service layer boundary: approve, void, receive, issue, post, reverse, valuation, and no-negative-stock checks",
      "output gate labels only: valuation and clearing report exports remain unexecuted",
    ],
    cleanupInventory: ["items", "warehouses", "stock movements", "inventory adjustments", "warehouse transfers", "purchase receipts", "sales stock issues", "variance proposals"],
  },
  jrd: {
    family: "jrd",
    markerPrefix: "DEV03-JRD-",
    purpose: "Journals, fiscal periods, reports, generated documents, audit, and storage/document readiness output gates.",
    plannedGroups: [
      "bootstrap references: fixture org, fixture user, roles, membership, accounts, taxes, fiscal periods",
      "business fixtures: draft journal label, post/reverse journal label, fiscal period labels, report filter label, generated-document label",
      "future service layer boundary: post, reverse, close, reopen, lock, export, download, archive, retention checks",
      "output gate labels only: report/download/PDF/archive generation remains unexecuted",
    ],
    cleanupInventory: ["journal entries", "fiscal periods", "accounts", "tax rates", "report labels", "generated documents", "audit logs"],
  },
};

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "0.0.0.0", "host.docker.internal", "postgres", "api", "web"]);

const FORBIDDEN_TARGET_PATTERNS = [
  /ledgerbyte-api-test/i,
  /ledgerbyte-web-test/i,
  /user[-_]?testing/i,
  /vercel(?:\.app)?/i,
  /supabase(?:\.co|\.com)?/i,
  /pooler\.supabase/i,
  /amazonaws/i,
  /rds\.amazonaws/i,
  /(^|[.\-_/])aws($|[.\-_/])/i,
  /railway(?:\.app)?/i,
  /render(?:\.com|\.internal|\.onrender\.com)?/i,
  /fly\.dev/i,
  /digitalocean(?:\.com|spaces\.com)?/i,
  /neon\.tech/i,
  /(^|[.\-_/])beta($|[.\-_/])/i,
  /(^|[.\-_/])staging($|[.\-_/])/i,
  /(^|[.\-_/])prod(?:uction)?($|[.\-_/])/i,
  /(^|[.\-_/])live($|[.\-_/])/i,
];

const FORBIDDEN_OPERATION_TERMS = [
  "migrate",
  "seed",
  "reset",
  "delete",
  "truncate",
  "drop",
  "purge",
  "e2e",
  "smoke",
  "deploy",
  "zatca",
  "email",
  "backup",
  "restore",
];

const SENSITIVE_KEY_TERMS = [
  "password",
  "token",
  "secret",
  "authorization",
  "cookie",
  "databaseurl",
  "database_url",
  "directurl",
  "direct_url",
  "apikey",
  "api_key",
  "service_role",
  "smtp",
  "privatekey",
  "private_key",
  "csr",
  "certificate",
  "base64",
  "content",
  "xml",
  "qr",
  "attachment",
  "pdf",
  "csv",
  "body",
];

const SKIPPED_DEFAULTS = [
  "fixture data creation",
  "database writes",
  "Prisma writes",
  "login and audit-writing flows",
  "migrations, seed, reset, delete, and destructive cleanup",
  "E2E, smoke, deploy, ZATCA, email, backup/restore, exports, downloads, PDF generation, and archive generation",
  "production, beta, user-testing, deployed API, and hosted database targets",
];

const NEXT_MANUAL_APPROVAL =
  "Explicit local disposable fixture creation approval is required before any execute/write behavior can be implemented.";

const EXECUTE_SKELETON_REFUSAL =
  "DEV-05 execute mode skeleton is present but fixture creation is still disabled until a later approved task.";

const EXECUTE_APPROVAL_ACCEPTED =
  "DEV-05 Part 3B approved local-only Sales/AR base fixture creation path. No lifecycle mutations or output actions are enabled.";

const REQUIRED_EXECUTE_APPROVAL_GATES: Array<{ key: keyof ExecuteApprovalGates; label: string }> = [
  { key: "allowLocalMutation", label: "--allow-local-mutation" },
  { key: "localDisposableDbApproved", label: "--approve-local-disposable-db" },
  { key: "fixtureCreationApproved", label: "--approve-fixture-creation" },
  { key: "cleanupRetentionApproved", label: "--approve-cleanup-retention" },
  { key: "noProductionNoBetaApproved", label: "--approve-no-production-no-beta" },
  { key: "noCustomerDataApproved", label: "--approve-no-customer-data" },
];

function defaultExecuteApprovalGates(): ExecuteApprovalGates {
  return {
    allowLocalMutation: false,
    localDisposableDbApproved: false,
    fixtureCreationApproved: false,
    cleanupRetentionApproved: false,
    noProductionNoBetaApproved: false,
    noCustomerDataApproved: false,
  };
}

function parseFixtureArgs(argv: string[], env: RunnerEnvironment = {}): ParsedArgs {
  const options: ParsedArgs = {
    mode: "plan",
    family: "all",
    databaseUrl: env.LEDGERBYTE_DEV04_DATABASE_URL,
    apiUrl: env.LEDGERBYTE_DEV04_API_URL,
    jsonSummary: false,
    executeRequested: false,
    approvalGates: defaultExecuteApprovalGates(),
  };
  let requestedExecute = false;
  let requestedDryRun = false;
  let requestedCleanupPlan = false;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg || arg === "--") {
      continue;
    }

    const { flag, value } = splitFlag(arg);

    switch (flag) {
      case "--help":
      case "-h":
        throw new Error(helpText());
      case "--plan":
        options.mode = "plan";
        break;
      case "--dry-run":
        requestedDryRun = true;
        break;
      case "--cleanup-plan":
        requestedCleanupPlan = true;
        break;
      case "--execute":
        requestedExecute = true;
        options.executeRequested = true;
        break;
      case "--family":
        options.family = readFlagValue(flag, value, argv, () => {
          index += 1;
          return argv[index];
        }) as FixtureFamilySelection;
        break;
      case "--marker":
        options.marker = readFlagValue(flag, value, argv, () => {
          index += 1;
          return argv[index];
        });
        break;
      case "--database-url":
        options.databaseUrl = readFlagValue(flag, value, argv, () => {
          index += 1;
          return argv[index];
        });
        break;
      case "--api-url":
        options.apiUrl = readFlagValue(flag, value, argv, () => {
          index += 1;
          return argv[index];
        });
        break;
      case "--json-summary":
        options.jsonSummary = true;
        break;
      case "--allow-local-mutation":
        options.approvalGates.allowLocalMutation = true;
        break;
      case "--approve-local-disposable-db":
        options.approvalGates.localDisposableDbApproved = true;
        break;
      case "--approve-fixture-creation":
        options.approvalGates.fixtureCreationApproved = true;
        break;
      case "--approve-cleanup-retention":
        options.approvalGates.cleanupRetentionApproved = true;
        break;
      case "--approve-no-production-no-beta":
        options.approvalGates.noProductionNoBetaApproved = true;
        break;
      case "--approve-no-customer-data":
        options.approvalGates.noCustomerDataApproved = true;
        break;
      case "--no-login":
        break;
      case "--allow-login":
        throw new Error("Login mode is not implemented or approved for the DEV-04 fixture runner.");
      default:
        assertNotForbiddenOperationArg(arg);
        if (arg.startsWith("-")) {
          throw new Error(`Unknown DEV-04 fixture runner flag: ${arg}`);
        }
        throw new Error(`Unexpected DEV-04 fixture runner argument: ${arg}`);
    }
  }

  if (requestedExecute && (requestedDryRun || requestedCleanupPlan)) {
    throw new Error("DEV-05 execute skeleton cannot be combined with dry-run or cleanup-plan mode.");
  }

  if (!requestedExecute && Object.values(options.approvalGates).some(Boolean)) {
    throw new Error("DEV-05 execute approval flags are only valid with --execute. No fixture data was created.");
  }

  if (requestedExecute) {
    options.mode = "execute";
  } else if (requestedCleanupPlan) {
    options.mode = "cleanup-plan";
  } else if (requestedDryRun) {
    options.mode = "dry-run";
  }

  return options;
}

function buildFixturePlan(argv: string[], env: RunnerEnvironment = {}): FixtureRunnerPlan {
  const options = parseFixtureArgs(argv, env);
  const family = validateFamily(options.family);
  const marker = validateMarker(options.marker, family);
  const selectedFamilies = family === "all" ? [...FAMILY_ORDER] : [family];
  const databaseTarget = classifyDatabaseUrl(options.databaseUrl);
  const apiTarget = classifyHttpUrl(options.apiUrl);

  if (options.executeRequested) {
    validateExecuteSkeleton(options, family, databaseTarget);
  }

  const executeApproved = options.executeRequested;

  return {
    mode: options.mode,
    family,
    marker,
    runId: deriveRunId(marker),
    databaseTarget,
    apiTarget,
    families: selectedFamilies.map((entry) => buildFamilyPlan(entry, marker)),
    cleanupPlanOnly: options.mode === "cleanup-plan",
    jsonSummary: options.jsonSummary,
    executeRequested: options.executeRequested,
    executeApprovedForSkeleton: executeApproved,
    executeRefused: false,
    executeRefusalReason: undefined,
    approvalGates: { ...options.approvalGates },
    createdFixtureData: false,
    fixtureDataPresent: false,
    fixtureCreationEnabled: executeApproved,
    mutationEnabled: false,
    databaseWritesEnabled: executeApproved,
    writesPerformed: false,
    loginEnabled: false,
    executeEnabled: executeApproved,
    nextManualApproval: options.executeRequested ? EXECUTE_APPROVAL_ACCEPTED : NEXT_MANUAL_APPROVAL,
    skipped: executeApproved
      ? SKIPPED_DEFAULTS.filter((entry) => !["fixture data creation", "database writes", "Prisma writes"].includes(entry))
      : [...SKIPPED_DEFAULTS],
  };
}

function validateExecuteSkeleton(
  options: ParsedArgs,
  family: FixtureFamilySelection,
  databaseTarget: TargetClassification,
): void {
  if (family === "all") {
    throw new Error("DEV-05 execute skeleton requires one explicit fixture family; all-family execution remains plan-only.");
  }

  if (family !== "ar") {
    throw new Error("DEV-05 execute skeleton is modeled for the first future fixture family only: Sales/AR.");
  }

  if (databaseTarget.kind !== "local-plan-only") {
    throw new Error("DEV-05 execute skeleton requires an explicit local database target via --database-url or LEDGERBYTE_DEV04_DATABASE_URL.");
  }

  const missing = REQUIRED_EXECUTE_APPROVAL_GATES.filter((gate) => !options.approvalGates[gate.key]).map((gate) => gate.label);
  if (missing.length > 0) {
    throw new Error(`DEV-05 execute skeleton is refused; missing approval gates: ${missing.join(", ")}. No fixture data was created.`);
  }
}

function buildFamilyPlan(family: FixtureFamily, marker: string): FixtureFamilyPlan {
  const definition = FAMILY_DEFINITIONS[family];
  if (family !== "ar") {
    return definition;
  }

  const runId = deriveRunId(marker);
  return {
    ...definition,
    proposedRecords: buildArProposedRecords(runId),
  };
}

function buildArProposedRecords(runId: string): FixtureProposedRecord[] {
  return [
    {
      group: "bootstrap",
      recordType: "organization",
      marker: `DEV03-AR-ORG-${runId}`,
      writeBehavior: "planned-only",
      notes: ["fake local-only organization", "base currency and legal fields remain fixture-marked"],
    },
    {
      group: "bootstrap",
      recordType: "user-role-membership",
      marker: `DEV03-AR-USER-ROLE-${runId}`,
      writeBehavior: "planned-only",
      notes: ["fixture user, role, and membership only", "login remains disabled until separately approved"],
    },
    {
      group: "business-base",
      recordType: "customer",
      marker: `DEV03-AR-CUSTOMER-${runId}`,
      writeBehavior: "planned-only",
      notes: ["fake customer data only", "no real tax identifiers, emails, addresses, or phone numbers"],
    },
    {
      group: "business-base",
      recordType: "service-item",
      marker: `DEV03-AR-SERVICE-${runId}`,
      writeBehavior: "planned-only",
      notes: ["non-inventory service item for AR forms", "inventory-tracked item remains out of first AR scope"],
    },
    {
      group: "dependencies",
      recordType: "tax-account-dependencies",
      marker: `DEV03-AR-TAX-ACCOUNT-${runId}`,
      writeBehavior: "planned-only",
      notes: ["accounts receivable, revenue, VAT, and tax-rate dependencies", "same fixture organization only"],
    },
    {
      group: "dependencies",
      recordType: "bank-cash-dependency",
      marker: `DEV03-AR-CASH-${runId}`,
      writeBehavior: "planned-only",
      notes: ["cash or bank dependency for future payment/refund plans", "no payment or refund creation in this skeleton"],
    },
    {
      group: "future-ar-drafts",
      recordType: "draft-ar-scaffolds",
      marker: `DEV03-AR-DRAFT-SCAFFOLDS-${runId}`,
      writeBehavior: "planned-only",
      notes: ["draft invoice, draft credit note, payment candidate, and refund candidate labels only", "no lifecycle transition or document output"],
    },
  ];
}

async function executeApprovedArFixtureCreation(plan: FixtureRunnerPlan, databaseUrl: string): Promise<FixtureExecutionResult> {
  if (plan.family !== "ar" || !plan.marker.startsWith("DEV03-AR-")) {
    throw new Error("DEV-05 Part 3B execution is restricted to the Sales/AR family with a DEV03-AR marker.");
  }

  if (!plan.executeEnabled || !plan.databaseWritesEnabled) {
    throw new Error("DEV-05 Part 3B execution is not enabled by the current approval gates.");
  }

  classifyDatabaseUrl(databaseUrl);

  const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  const records: FixtureWrittenRecordSummary[] = [];

  try {
    await prisma.$connect();
    await prisma.$transaction(async (tx) => {
      await createApprovedArFixtureRecords(tx, plan, records);
    });
  } finally {
    await prisma.$disconnect();
  }

  return {
    createdFixtureData: records.some((record) => record.status === "created"),
    fixtureDataPresent: records.length > 0,
    databaseConnectionOpened: true,
    databaseWritesPerformed: true,
    loginPerformed: false,
    auditWritingPerformed: false,
    lifecycleMutationsPerformed: false,
    outputActionsPerformed: false,
    records,
  };
}

type FixtureWriteClient = Pick<
  PrismaClient,
  "organization" | "user" | "role" | "organizationMember" | "account" | "taxRate" | "item" | "bankAccountProfile" | "contact"
>;

async function createApprovedArFixtureRecords(
  tx: FixtureWriteClient,
  plan: FixtureRunnerPlan,
  records: FixtureWrittenRecordSummary[],
): Promise<void> {
  const runId = plan.runId;
  const marker = plan.marker;
  const orgId = deterministicUuid(`${marker}:organization`);
  const customerId = deterministicUuid(`${marker}:customer`);
  const fixtureEmail = `dev03-ar-${runId.toLowerCase()}@ledgerbyte.local.test`;
  const codeSuffix = runId.replace(/[^A-Z0-9]/g, "").slice(-12);

  const orgBefore = await tx.organization.findUnique({ where: { id: orgId }, select: { id: true } });
  const organization = await tx.organization.upsert({
    where: { id: orgId },
    update: {
      name: `DEV03-AR-ORG-${runId}`,
      legalName: `DEV03 AR Local Fixture ${runId}`,
      taxNumber: "399999999999993",
      countryCode: "SA",
      baseCurrency: "SAR",
      timezone: "Asia/Riyadh",
    },
    create: {
      id: orgId,
      name: `DEV03-AR-ORG-${runId}`,
      legalName: `DEV03 AR Local Fixture ${runId}`,
      taxNumber: "399999999999993",
      countryCode: "SA",
      baseCurrency: "SAR",
      timezone: "Asia/Riyadh",
    },
    select: { id: true },
  });
  records.push(recordSummary("bootstrap", "organization", `DEV03-AR-ORG-${runId}`, orgBefore ? "reused" : "created", organization.id));

  const userBefore = await tx.user.findUnique({ where: { email: fixtureEmail }, select: { id: true } });
  const user = await tx.user.upsert({
    where: { email: fixtureEmail },
    update: {
      name: `DEV03-AR-USER-${runId}`,
    },
    create: {
      email: fixtureEmail,
      name: `DEV03-AR-USER-${runId}`,
      passwordHash: await bcrypt.hash(`${marker}-LOGIN-DISABLED`, 12),
    },
    select: { id: true },
  });
  records.push(recordSummary("bootstrap", "user", `DEV03-AR-USER-${runId}`, userBefore ? "reused" : "created", user.id));

  const roleName = `DEV03-AR-ROLE-${runId}`;
  const roleBefore = await tx.role.findUnique({ where: { organizationId_name: { organizationId: organization.id, name: roleName } }, select: { id: true } });
  const role = await tx.role.upsert({
    where: { organizationId_name: { organizationId: organization.id, name: roleName } },
    update: {
      permissions: approvedArBasePermissions(),
      isSystem: false,
    },
    create: {
      organizationId: organization.id,
      name: roleName,
      permissions: approvedArBasePermissions(),
      isSystem: false,
    },
    select: { id: true },
  });
  records.push(recordSummary("bootstrap", "role", roleName, roleBefore ? "reused" : "created", role.id));

  const memberBefore = await tx.organizationMember.findUnique({
    where: { organizationId_userId: { organizationId: organization.id, userId: user.id } },
    select: { id: true },
  });
  const member = await tx.organizationMember.upsert({
    where: { organizationId_userId: { organizationId: organization.id, userId: user.id } },
    update: {
      roleId: role.id,
      status: "ACTIVE",
    },
    create: {
      organizationId: organization.id,
      userId: user.id,
      roleId: role.id,
      status: "ACTIVE",
    },
    select: { id: true },
  });
  records.push(
    recordSummary("bootstrap", "organization-membership", `DEV03-AR-USER-ROLE-${runId}`, memberBefore ? "reused" : "created", member.id),
  );

  await upsertAccount(tx, records, organization.id, {
    group: "dependencies",
    code: `D3AR-${codeSuffix}-AR`,
    name: `DEV03-AR-ACCT-AR-${runId}`,
    type: "ASSET",
  });
  const revenueAccount = await upsertAccount(tx, records, organization.id, {
    group: "dependencies",
    code: `D3AR-${codeSuffix}-REV`,
    name: `DEV03-AR-ACCT-REV-${runId}`,
    type: "REVENUE",
  });
  await upsertAccount(tx, records, organization.id, {
    group: "dependencies",
    code: `D3AR-${codeSuffix}-VAT`,
    name: `DEV03-AR-ACCT-VAT-${runId}`,
    type: "LIABILITY",
  });
  const cashAccount = await upsertAccount(tx, records, organization.id, {
    group: "dependencies",
    code: `D3AR-${codeSuffix}-CASH`,
    name: `DEV03-AR-ACCT-CASH-${runId}`,
    type: "ASSET",
  });

  const taxName = `DEV03-AR-TAX-${runId}`;
  const taxBefore = await tx.taxRate.findUnique({ where: { organizationId_name: { organizationId: organization.id, name: taxName } }, select: { id: true } });
  const taxRate = await tx.taxRate.upsert({
    where: { organizationId_name: { organizationId: organization.id, name: taxName } },
    update: {
      scope: "SALES",
      category: "STANDARD",
      rate: "15.0000",
      description: `${marker} fake local AR tax dependency`,
      isActive: true,
      isSystem: false,
    },
    create: {
      organizationId: organization.id,
      name: taxName,
      scope: "SALES",
      category: "STANDARD",
      rate: "15.0000",
      description: `${marker} fake local AR tax dependency`,
      isActive: true,
      isSystem: false,
    },
    select: { id: true },
  });
  records.push(recordSummary("dependencies", "tax-rate", taxName, taxBefore ? "reused" : "created", taxRate.id));

  const bankBefore = await tx.bankAccountProfile.findUnique({ where: { accountId: cashAccount.id }, select: { id: true } });
  const bankProfile = await tx.bankAccountProfile.upsert({
    where: { accountId: cashAccount.id },
    update: {
      type: "CASH",
      status: "ACTIVE",
      displayName: `DEV03-AR-CASH-${runId}`,
      bankName: "DEV03 local cash fixture",
      currency: "SAR",
      openingBalance: "0.0000",
      notes: `${marker} fake local AR cash dependency`,
    },
    create: {
      organizationId: organization.id,
      accountId: cashAccount.id,
      type: "CASH",
      status: "ACTIVE",
      displayName: `DEV03-AR-CASH-${runId}`,
      bankName: "DEV03 local cash fixture",
      currency: "SAR",
      openingBalance: "0.0000",
      notes: `${marker} fake local AR cash dependency`,
    },
    select: { id: true },
  });
  records.push(recordSummary("dependencies", "bank-cash-profile", `DEV03-AR-CASH-${runId}`, bankBefore ? "reused" : "created", bankProfile.id));

  const customerBefore = await tx.contact.findUnique({ where: { id: customerId }, select: { id: true } });
  const customer = await tx.contact.upsert({
    where: { id: customerId },
    update: {
      type: "CUSTOMER",
      name: `DEV03-AR-CUSTOMER-${runId}`,
      displayName: `DEV03 AR Customer ${runId}`,
      email: `customer-${runId.toLowerCase()}@ledgerbyte.local.test`,
      taxNumber: "399999999999993",
      identificationType: "CRN",
      identificationNumber: `DEV03AR${codeSuffix}`,
      addressLine1: "DEV03 Local Fixture Street",
      buildingNumber: "1234",
      district: "DEV03 District",
      city: "Riyadh",
      countryCode: "SA",
      postalCode: "12345",
      isActive: true,
    },
    create: {
      id: customerId,
      organizationId: organization.id,
      type: "CUSTOMER",
      name: `DEV03-AR-CUSTOMER-${runId}`,
      displayName: `DEV03 AR Customer ${runId}`,
      email: `customer-${runId.toLowerCase()}@ledgerbyte.local.test`,
      taxNumber: "399999999999993",
      identificationType: "CRN",
      identificationNumber: `DEV03AR${codeSuffix}`,
      addressLine1: "DEV03 Local Fixture Street",
      buildingNumber: "1234",
      district: "DEV03 District",
      city: "Riyadh",
      countryCode: "SA",
      postalCode: "12345",
      isActive: true,
    },
    select: { id: true },
  });
  records.push(recordSummary("business-base", "customer", `DEV03-AR-CUSTOMER-${runId}`, customerBefore ? "reused" : "created", customer.id));

  const itemSku = `DEV03-AR-SVC-${runId}`;
  const itemBefore = await tx.item.findUnique({ where: { organizationId_sku: { organizationId: organization.id, sku: itemSku } }, select: { id: true } });
  const item = await tx.item.upsert({
    where: { organizationId_sku: { organizationId: organization.id, sku: itemSku } },
    update: {
      name: `DEV03-AR-SERVICE-${runId}`,
      description: `${marker} fake local non-inventory AR service item`,
      type: "SERVICE",
      status: "ACTIVE",
      sellingPrice: "100.0000",
      revenueAccountId: revenueAccount.id,
      salesTaxRateId: taxRate.id,
      inventoryTracking: false,
    },
    create: {
      organizationId: organization.id,
      name: `DEV03-AR-SERVICE-${runId}`,
      description: `${marker} fake local non-inventory AR service item`,
      sku: itemSku,
      type: "SERVICE",
      status: "ACTIVE",
      sellingPrice: "100.0000",
      revenueAccountId: revenueAccount.id,
      salesTaxRateId: taxRate.id,
      inventoryTracking: false,
    },
    select: { id: true },
  });
  records.push(recordSummary("business-base", "service-item", `DEV03-AR-SERVICE-${runId}`, itemBefore ? "reused" : "created", item.id));
}

type AccountInput = {
  group: string;
  code: string;
  name: string;
  type: "ASSET" | "LIABILITY" | "REVENUE";
};

async function upsertAccount(
  tx: FixtureWriteClient,
  records: FixtureWrittenRecordSummary[],
  organizationId: string,
  input: AccountInput,
): Promise<{ id: string }> {
  const before = await tx.account.findUnique({ where: { organizationId_code: { organizationId, code: input.code } }, select: { id: true } });
  const account = await tx.account.upsert({
    where: { organizationId_code: { organizationId, code: input.code } },
    update: {
      name: input.name,
      type: input.type,
      allowPosting: true,
      isSystem: false,
      isActive: true,
      description: `${input.name} fake local AR fixture dependency`,
    },
    create: {
      organizationId,
      code: input.code,
      name: input.name,
      type: input.type,
      allowPosting: true,
      isSystem: false,
      isActive: true,
      description: `${input.name} fake local AR fixture dependency`,
    },
    select: { id: true },
  });
  records.push(recordSummary(input.group, "account", input.name, before ? "reused" : "created", account.id));
  return account;
}

function approvedArBasePermissions(): string[] {
  return [
    PERMISSIONS.dashboard.view,
    PERMISSIONS.organization.view,
    PERMISSIONS.contacts.view,
    PERMISSIONS.contacts.manage,
    PERMISSIONS.items.view,
    PERMISSIONS.items.manage,
    PERMISSIONS.accounts.view,
    PERMISSIONS.taxRates.view,
    PERMISSIONS.bankAccounts.view,
    PERMISSIONS.salesInvoices.view,
    PERMISSIONS.salesInvoices.create,
    PERMISSIONS.salesInvoices.update,
    PERMISSIONS.customerPayments.view,
    PERMISSIONS.customerPayments.create,
    PERMISSIONS.creditNotes.view,
    PERMISSIONS.creditNotes.create,
    PERMISSIONS.customerRefunds.view,
    PERMISSIONS.customerRefunds.create,
    PERMISSIONS.documents.view,
    PERMISSIONS.generatedDocuments.view,
  ];
}

function recordSummary(
  group: string,
  recordType: string,
  marker: string,
  status: FixtureWriteStatus,
  id: string,
): FixtureWrittenRecordSummary {
  return {
    group,
    recordType,
    marker,
    status,
    idHint: summarizeId(id),
  };
}

function summarizeId(id: string): string {
  return `${id.slice(0, 8)}...`;
}

function deterministicUuid(input: string): string {
  const bytes = Buffer.from(createHash("sha256").update(input).digest("hex").slice(0, 32), "hex");
  bytes[6] = (bytes[6]! & 0x0f) | 0x50;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

function validateFamily(family: string): FixtureFamilySelection {
  if (family === "all" || FAMILY_ORDER.includes(family as FixtureFamily)) {
    return family as FixtureFamilySelection;
  }

  throw new Error(`Invalid fixture family "${family}". Expected ar, ap, bank, inv, jrd, or all.`);
}

function validateMarker(marker: string | undefined, family: FixtureFamilySelection): string {
  const value = marker?.trim();
  if (!value) {
    throw new Error("DEV-04 fixture marker is required.");
  }

  if (!value.startsWith("DEV03-") && !value.startsWith("DEV04-")) {
    throw new Error("DEV-04 fixture marker must start with DEV03- or DEV04-.");
  }

  if (!/^DEV0[34]-[A-Z0-9][A-Z0-9-]{2,96}$/.test(value)) {
    throw new Error("DEV-04 fixture marker must use uppercase letters, numbers, and hyphens only.");
  }

  const lower = value.toLowerCase();
  if (/https?:|[\\/"'`$&|<>()[\]{}]/.test(value) || SENSITIVE_KEY_TERMS.some((term) => lower.includes(term))) {
    throw new Error("DEV-04 fixture marker contains unsafe or secret-looking text.");
  }

  if (FORBIDDEN_OPERATION_TERMS.some((term) => lower.split("-").includes(term))) {
    throw new Error("DEV-04 fixture marker contains a destructive or forbidden operation term.");
  }

  if (family !== "all" && value.startsWith("DEV03-")) {
    const expectedPrefix = FAMILY_DEFINITIONS[family].markerPrefix;
    if (!value.startsWith(expectedPrefix)) {
      throw new Error(`DEV-04 fixture marker ${value} does not match family ${family}; expected ${expectedPrefix}...`);
    }
  }

  return value;
}

function classifyDatabaseUrl(rawUrl: string | undefined): TargetClassification {
  return classifyTargetUrl(rawUrl, {
    targetLabel: "database",
    allowedProtocols: ["postgresql:", "postgres:"],
  });
}

function classifyHttpUrl(rawUrl: string | undefined): TargetClassification {
  return classifyTargetUrl(rawUrl, {
    targetLabel: "API",
    allowedProtocols: ["http:", "https:"],
  });
}

function classifyTargetUrl(
  rawUrl: string | undefined,
  options: { targetLabel: string; allowedProtocols: string[] },
): TargetClassification {
  const value = stripWrappingQuotes(rawUrl?.trim() ?? "");
  if (!value) {
    return { kind: "not-provided", label: "not provided" };
  }

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`DEV-04 ${options.targetLabel} URL is invalid or not parseable.`);
  }

  if (!options.allowedProtocols.includes(parsed.protocol)) {
    throw new Error(`DEV-04 ${options.targetLabel} URL uses unsupported protocol ${parsed.protocol}.`);
  }

  const host = normalizeHostname(parsed.hostname);
  const targetFingerprint = `${host} ${parsed.pathname}`.toLowerCase();
  if (FORBIDDEN_TARGET_PATTERNS.some((pattern) => pattern.test(targetFingerprint))) {
    throw new Error(`DEV-04 ${options.targetLabel} URL points at a hosted or forbidden target and is refused.`);
  }

  if (!LOCAL_HOSTS.has(host)) {
    throw new Error(`DEV-04 ${options.targetLabel} URL must use a local host for plan/dry-run mode.`);
  }

  return {
    kind: "local-plan-only",
    label: `${options.targetLabel} local plan target`,
    host,
    protocol: parsed.protocol.replace(/:$/, ""),
    port: parsed.port || undefined,
  };
}

function renderFixturePlan(plan: FixtureRunnerPlan): string {
  const lines = [
    "DEV-04/DEV-05 fixture runner",
    `Mode: ${plan.mode}`,
    `Family: ${plan.family}`,
    `Marker: ${plan.marker}`,
    `Run id: ${plan.runId}`,
    `Database target: ${renderTarget(plan.databaseTarget, plan.executeRequested)}`,
    `API target: ${renderTarget(plan.apiTarget, false)}`,
    "Login: disabled",
    `Execute requested: ${plan.executeRequested}`,
    `Execute enabled: ${plan.executeEnabled}`,
    `Fixture creation: ${plan.fixtureCreationEnabled ? "enabled for approved local AR base records only" : "disabled"}`,
    "Mutation: disabled",
    `Database writes: ${plan.databaseWritesEnabled ? "enabled for approved local AR base records only" : "disabled"}`,
    `Writes performed: ${plan.writesPerformed}`,
    plan.cleanupPlanOnly ? "Cleanup: plan only; deletion is not implemented." : "Cleanup: not executing; cleanup inventory is plan-only.",
    `Next manual approval needed: ${plan.nextManualApproval}`,
    "",
    "Selected fixture family plans:",
  ];

  for (const family of plan.families) {
    lines.push(`- ${family.family} (${family.markerPrefix}): ${family.purpose}`);
    lines.push("  Planned groups:");
    for (const group of family.plannedGroups) {
      lines.push(`  - ${group}`);
    }
    if (family.proposedRecords && family.proposedRecords.length > 0) {
      lines.push("  Future approved AR records:");
      for (const record of family.proposedRecords) {
        lines.push(`  - ${record.recordType}: ${record.marker} (${record.writeBehavior})`);
      }
    }
    lines.push(`  Cleanup inventory later: ${family.cleanupInventory.join(", ")}`);
  }

  if (plan.executeRequested && plan.executeRefusalReason) {
    lines.push("");
    lines.push(`Execute refusal: ${plan.executeRefusalReason}`);
  }

  lines.push("");
  if (plan.executionResult) {
    const createdCount = plan.executionResult.records.filter((record) => record.status === "created").length;
    const reusedCount = plan.executionResult.records.filter((record) => record.status === "reused").length;
    lines.push("Approved AR fixture creation result:");
    lines.push(`- Records created: ${createdCount}`);
    lines.push(`- Records reused: ${reusedCount}`);
    for (const record of plan.executionResult.records) {
      lines.push(`- ${record.recordType}: ${record.marker} (${record.status}, id ${record.idHint})`);
    }
    lines.push("");
    lines.push("DATA CREATED OR REUSED");
    lines.push("DATABASE WRITES PERFORMED");
    lines.push("Fixture data was created or reused only for approved local AR base setup.");
    lines.push("Database writes were attempted only for approved local DEV03-AR base records.");
  } else {
    lines.push("NO DATA CREATED");
    lines.push("NO DATABASE WRITES");
    lines.push("No fixture data was created.");
    lines.push("No database writes were attempted.");
    lines.push("No database connection was opened.");
  }
  lines.push("No login or audit-writing flow was run.");
  lines.push("No AR lifecycle mutation was run.");
  lines.push("No migrations, seed/reset/delete, smoke, E2E, deploy, ZATCA, email, backup/restore, export, download, PDF, or archive action was run.");

  return lines.join("\n");
}

function buildJsonSummary(plan: FixtureRunnerPlan): Record<string, unknown> {
  return {
    mode: plan.mode,
    family: plan.family,
    marker: plan.marker,
    runId: plan.runId,
    executeRequested: plan.executeRequested,
    executeApprovedForSkeleton: plan.executeApprovedForSkeleton,
    executeRefused: plan.executeRefused,
    executeRefusalReason: plan.executeRefusalReason,
    approvalGates: plan.approvalGates,
    createdFixtureData: plan.createdFixtureData,
    fixtureDataPresent: plan.fixtureDataPresent,
    fixtureCreationEnabled: plan.fixtureCreationEnabled,
    mutationEnabled: plan.mutationEnabled,
    databaseWritesEnabled: plan.databaseWritesEnabled,
    writesPerformed: plan.writesPerformed,
    loginEnabled: plan.loginEnabled,
    executeEnabled: plan.executeEnabled,
    executionResult: plan.executionResult,
    cleanupPlanOnly: plan.cleanupPlanOnly,
    nextManualApproval: plan.nextManualApproval,
    databaseTarget: plan.databaseTarget,
    apiTarget: plan.apiTarget,
    families: plan.families.map((family) => ({
      family: family.family,
      markerPrefix: family.markerPrefix,
      plannedGroupCount: family.plannedGroups.length,
      cleanupInventoryCount: family.cleanupInventory.length,
      proposedRecordCount: family.proposedRecords?.length ?? 0,
      proposedRecords: family.proposedRecords?.map((record) => ({
        group: record.group,
        recordType: record.recordType,
        marker: record.marker,
        writeBehavior: record.writeBehavior,
      })),
    })),
  };
}

async function runFixtureRunner(
  argv = process.argv.slice(2),
  env: RunnerEnvironment = process.env,
  logger: RunnerLogger = console,
  executor: FixtureExecutor = executeApprovedArFixtureCreation,
): Promise<number> {
  try {
    if (argv.includes("--help") || argv.includes("-h")) {
      logger.log(helpText());
      return 0;
    }

    const plan = buildFixturePlan(argv, env);
    let renderedPlan = plan;

    if (plan.executeRequested) {
      const databaseUrl = parseFixtureArgs(argv, env).databaseUrl;
      if (!databaseUrl) {
        throw new Error("DEV-05 approved fixture creation requires an explicit local database target.");
      }
      const executionResult = await executor(plan, databaseUrl);
      renderedPlan = {
        ...plan,
        executionResult,
        createdFixtureData: executionResult.createdFixtureData,
        fixtureDataPresent: executionResult.fixtureDataPresent,
        writesPerformed: executionResult.databaseWritesPerformed,
      };
    }

    if (plan.jsonSummary) {
      logger.log(JSON.stringify(redactSecrets(buildJsonSummary(renderedPlan)), null, 2));
    } else {
      logger.log(renderFixturePlan(renderedPlan));
    }
    return 0;
  } catch (error) {
    logger.error(redactString(error instanceof Error ? error.message : String(error)));
    return 1;
  }
}

function renderTarget(target: TargetClassification, executeRequested: boolean): string {
  if (target.kind === "not-provided") {
    return "not provided; no connection or network call will be attempted";
  }

  const port = target.port ? `:${target.port}` : "";
  const suffix = executeRequested ? "approved local fixture target" : "plan only";
  return `${target.label} at ${target.host}${port}; ${suffix}`;
}

function buildHelpLines(): string[] {
  return [
    "Usage: tsx scripts/dev04-fixture-runner.ts --plan|--dry-run|--cleanup-plan|--execute --family ar|ap|bank|inv|jrd|all --marker DEV03-...|DEV04-...",
    "",
    "Supported plan flags: --plan, --dry-run, --cleanup-plan, --family, --marker, --database-url, --api-url, --json-summary, --no-login.",
    "Execute skeleton flags: --execute, --allow-local-mutation, --approve-local-disposable-db, --approve-fixture-creation, --approve-cleanup-retention, --approve-no-production-no-beta, --approve-no-customer-data.",
    "Refused flags: --allow-login. Execute mode is restricted to explicitly approved local DEV03-AR base fixture creation.",
    "Generic DATABASE_URL is intentionally ignored; pass --database-url or LEDGERBYTE_DEV04_DATABASE_URL to validate a local plan target.",
    "This runner never performs AR lifecycle mutations, login, audit-writing flows, output actions, migrations, seed/reset/delete, smoke, E2E, deploys, ZATCA, email, backup, or restore.",
  ];
}

function helpText(): string {
  return buildHelpLines().join("\n");
}

function splitFlag(arg: string): { flag: string; value?: string } {
  const equalsIndex = arg.indexOf("=");
  if (equalsIndex === -1) {
    return { flag: arg };
  }

  return { flag: arg.slice(0, equalsIndex), value: arg.slice(equalsIndex + 1) };
}

function readFlagValue(flag: string, inlineValue: string | undefined, argv: string[], readNext: () => string | undefined): string {
  const value = inlineValue ?? readNext();
  if (!value || value === "--") {
    throw new Error(`Missing value for ${flag}.`);
  }

  assertNotForbiddenOperationArg(value);
  return value;
}

function assertNotForbiddenOperationArg(arg: string): void {
  const normalized = arg.replace(/^-+/, "").toLowerCase();
  if (FORBIDDEN_OPERATION_TERMS.some((term) => normalized === term || normalized.startsWith(`${term}:`) || normalized.includes(`:${term}`))) {
    throw new Error(`DEV-04 fixture runner argument "${arg}" contains a destructive or forbidden operation term.`);
  }
}

function deriveRunId(marker: string): string {
  if (marker.startsWith("DEV03-BANK-")) {
    return marker.slice("DEV03-BANK-".length);
  }

  const parts = marker.split("-");
  if (marker.startsWith("DEV03-") && parts.length > 2) {
    return parts.slice(2).join("-");
  }

  if (marker.startsWith("DEV04-")) {
    return marker.slice("DEV04-".length);
  }

  return marker;
}

function normalizeHostname(hostname: string): string {
  return hostname.toLowerCase().replace(/^\[/, "").replace(/\]$/, "");
}

function stripWrappingQuotes(value: string): string {
  return value.replace(/^["']|["']$/g, "");
}

function isSensitiveKey(key: string): boolean {
  const normalized = key.replace(/[-_\s]/g, "").toLowerCase();
  return SENSITIVE_KEY_TERMS.some((term) => normalized.includes(term.replace(/[-_\s]/g, "")));
}

function redactSecrets(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => redactSecrets(entry));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => [key, isSensitiveKey(key) ? "[REDACTED]" : redactSecrets(entry)]),
    );
  }

  if (typeof value === "string") {
    return redactString(value);
  }

  return value;
}

function redactString(value: string): string {
  return value
    .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [REDACTED]")
    .replace(/\b(postgres(?:ql)?:\/\/)[^@\s]+@/gi, "$1<redacted>@")
    .replace(/\b(https?:\/\/)[^/\s:@]+:[^@\s/]+@/gi, "$1<redacted>@")
    .replace(
      /\b(DATABASE_URL|DIRECT_URL|JWT_SECRET|TOKEN|PASSWORD|SECRET|COOKIE|AUTHORIZATION|API_KEY|SMTP_PASSWORD)\b\s*[:=]\s*[^,\s;]+/gi,
      "$1=[REDACTED]",
    );
}

if (require.main === module) {
  void runFixtureRunner().then((exitCode) => {
    process.exitCode = exitCode;
  });
}

export {
  FAMILY_DEFINITIONS,
  FAMILY_ORDER,
  buildFixturePlan,
  buildJsonSummary,
  classifyDatabaseUrl,
  classifyHttpUrl,
  helpText,
  parseFixtureArgs,
  redactSecrets,
  redactString,
  renderFixturePlan,
  runFixtureRunner,
  validateMarker,
};

export type {
  ExecuteApprovalGates,
  FixtureFamily,
  FixtureFamilyPlan,
  FixtureFamilySelection,
  FixtureProposedRecord,
  FixtureRunnerMode,
  FixtureRunnerPlan,
  TargetClassification,
};
