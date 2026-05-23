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
  createdFixtureData: false;
  fixtureCreationEnabled: false;
  mutationEnabled: false;
  databaseWritesEnabled: false;
  writesPerformed: false;
  loginEnabled: false;
  executeEnabled: false;
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
    executeApprovedForSkeleton: options.executeRequested,
    executeRefused: options.executeRequested,
    executeRefusalReason: options.executeRequested ? EXECUTE_SKELETON_REFUSAL : undefined,
    approvalGates: { ...options.approvalGates },
    createdFixtureData: false,
    fixtureCreationEnabled: false,
    mutationEnabled: false,
    databaseWritesEnabled: false,
    writesPerformed: false,
    loginEnabled: false,
    executeEnabled: false,
    nextManualApproval: options.executeRequested ? EXECUTE_SKELETON_REFUSAL : NEXT_MANUAL_APPROVAL,
    skipped: [...SKIPPED_DEFAULTS],
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
    "DEV-04 fixture runner dry-run skeleton",
    `Mode: ${plan.mode}`,
    `Family: ${plan.family}`,
    `Marker: ${plan.marker}`,
    `Run id: ${plan.runId}`,
    `Database target: ${renderTarget(plan.databaseTarget)}`,
    `API target: ${renderTarget(plan.apiTarget)}`,
    "Login: disabled",
    `Execute requested: ${plan.executeRequested}`,
    "Execute enabled: false",
    "Fixture creation: disabled",
    "Mutation: disabled",
    "Database writes: disabled",
    "Writes performed: false",
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
  lines.push("NO DATA CREATED");
  lines.push("NO DATABASE WRITES");
  lines.push("No fixture data was created.");
  lines.push("No database writes were attempted.");
  lines.push("No database connection was opened.");
  lines.push("No login or audit-writing flow was run.");
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
    fixtureCreationEnabled: plan.fixtureCreationEnabled,
    mutationEnabled: plan.mutationEnabled,
    databaseWritesEnabled: plan.databaseWritesEnabled,
    writesPerformed: plan.writesPerformed,
    loginEnabled: plan.loginEnabled,
    executeEnabled: plan.executeEnabled,
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

function runFixtureRunner(argv = process.argv.slice(2), env: RunnerEnvironment = process.env, logger: RunnerLogger = console): number {
  try {
    if (argv.includes("--help") || argv.includes("-h")) {
      logger.log(helpText());
      return 0;
    }

    const plan = buildFixturePlan(argv, env);
    if (plan.jsonSummary) {
      logger.log(JSON.stringify(redactSecrets(buildJsonSummary(plan)), null, 2));
    } else {
      logger.log(renderFixturePlan(plan));
    }
    if (plan.executeRequested) {
      logger.error(plan.executeRefusalReason ?? EXECUTE_SKELETON_REFUSAL);
      return 1;
    }
    return 0;
  } catch (error) {
    logger.error(redactString(error instanceof Error ? error.message : String(error)));
    return 1;
  }
}

function renderTarget(target: TargetClassification): string {
  if (target.kind === "not-provided") {
    return "not provided; no connection or network call will be attempted";
  }

  const port = target.port ? `:${target.port}` : "";
  return `${target.label} at ${target.host}${port}; plan only`;
}

function buildHelpLines(): string[] {
  return [
    "Usage: tsx scripts/dev04-fixture-runner.ts --plan|--dry-run|--cleanup-plan|--execute --family ar|ap|bank|inv|jrd|all --marker DEV03-...|DEV04-...",
    "",
    "Supported plan flags: --plan, --dry-run, --cleanup-plan, --family, --marker, --database-url, --api-url, --json-summary, --no-login.",
    "Execute skeleton flags: --execute, --allow-local-mutation, --approve-local-disposable-db, --approve-fixture-creation, --approve-cleanup-retention, --approve-no-production-no-beta, --approve-no-customer-data.",
    "Refused flags: --allow-login. Execute mode always exits nonzero until a later approved task enables fixture creation.",
    "Generic DATABASE_URL is intentionally ignored; pass --database-url or LEDGERBYTE_DEV04_DATABASE_URL to validate a local plan target.",
    "This runner never creates fixture data or performs database writes.",
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
  process.exitCode = runFixtureRunner();
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
