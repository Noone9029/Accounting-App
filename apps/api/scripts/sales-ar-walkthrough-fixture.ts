import * as fs from "node:fs";
import * as path from "node:path";

type Mode = "dry-run" | "execute";

type ParsedArgs = {
  mode: Mode;
  marker: string;
};

type TargetCheck = {
  key: string;
  source: string;
  status: "local" | "blocked" | "not-a-url";
  reason: string;
};

type PlannedRecord = {
  area: string;
  fakeIdentifier: string;
  route: string;
  expectedPostingEffect: string;
  expectedNonEffect: string;
  checkpoint: string;
};

type Session = {
  token: string;
  organizationId: string;
};

type ApiEntity = Record<string, unknown> & {
  id: string;
  organizationId?: string;
  customerId?: string;
  accountId?: string;
  name?: string;
  displayName?: string;
  code?: string;
  sku?: string;
  type?: string;
  status?: string;
  isActive?: boolean;
  allowPosting?: boolean;
  notes?: string | null;
  reference?: string | null;
  description?: string | null;
  invoiceNumber?: string;
  quoteNumber?: string;
  templateNumber?: string;
  deliveryNoteNumber?: string;
  caseNumber?: string;
  paymentNumber?: string;
  creditNoteNumber?: string;
  refundNumber?: string;
  total?: string;
  balanceDue?: string;
  unappliedAmount?: string;
  convertedSalesInvoice?: ApiEntity | null;
  convertedSalesInvoiceId?: string | null;
  runs?: Array<{ generatedInvoice?: ApiEntity | null }>;
  lines?: ApiEntity[];
  customer?: ApiEntity;
  originalInvoice?: ApiEntity | null;
  account?: ApiEntity;
  role?: { permissions?: string[] };
  memberships?: Array<{ organizationId?: string; organization?: { id?: string }; status?: string; role?: { permissions?: string[] } }>;
};

type CreditNoteApplyPayload = {
  invoiceId: string;
  amountApplied: string;
};

type ExecuteSummary = {
  marker: string;
  organizationId: string;
  created: string[];
  reused: string[];
  skipped: string[];
  entities: Record<string, string>;
  numbers: Record<string, string>;
  counts: Record<string, number>;
  routeHints: string[];
  nonEffects: string[];
};

type EndpointCheck = {
  path: string;
  status: "ready" | "blocked";
  statusCode?: number;
  markerOccurrences?: number;
  summary: string;
};

type SourceLineCheck = {
  status: "ready" | "pending" | "blocked";
  summary: string;
};

type IdempotencyCheck = {
  label: string;
  status: "reuse" | "create" | "pending" | "blocked";
  summary: string;
};

type FixturePreflight = {
  marker: string;
  checkedTargets: number;
  session?: Session;
  blockedReasons: string[];
  endpointChecks: EndpointCheck[];
  existingMarkerCounts: Record<string, number>;
  idempotencyChecks: IdempotencyCheck[];
  salesAccount?: ApiEntity;
  bankAccount?: ApiEntity;
  paymentAccount?: ApiEntity;
  salesTaxRate?: ApiEntity;
  sourceInvoiceLine?: SourceLineCheck;
  sourceQuoteLine?: SourceLineCheck;
};

const DEFAULT_MARKER = "SALES-AR-WALKTHROUGH-20260604";
const DEFAULT_API_URL = "http://localhost:4000";
const DEFAULT_EMAIL = "admin@example.com";
const DEFAULT_PASSWORD = "Password123!";
const DEFAULT_ORGANIZATION_ID = "00000000-0000-0000-0000-000000000001";
const BLOCKED_TARGET_PATTERN = /supabase|vercel|production|prod|staging|stage|beta|user-testing|ledgerbyte-api-test|ledgerbyte-web-test/i;
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "postgres", "redis", "host.docker.internal"]);
const TARGET_KEYS = ["DATABASE_URL", "DIRECT_URL", "REDIS_URL", "NEXT_PUBLIC_API_URL", "LEDGERBYTE_API_URL"];
const CREDIT_NOTE_APPLY_PAYLOAD_KEYS = ["invoiceId", "amountApplied"] as const;
const DELIVERY_NOTE_PAYLOAD_KEYS = [
  "customerId",
  "branchId",
  "issueDate",
  "deliveryDate",
  "reference",
  "relatedSalesInvoiceId",
  "relatedSalesQuoteId",
  "relatedSalesStockIssueId",
  "deliveryAddress",
  "notes",
  "instructions",
  "lines",
] as const;
const DELIVERY_NOTE_LINE_PAYLOAD_KEYS = [
  "itemId",
  "description",
  "quantity",
  "unitOfMeasure",
  "sourceSalesInvoiceLineId",
  "sourceSalesQuoteLineId",
  "sourceSalesStockIssueLineId",
  "sortOrder",
] as const;
const WALKTHROUGH_CREDIT_NOTE_APPLY_AMOUNT = "5.0000";

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const repoRoot = findRepoRoot(process.cwd());
  const envValues = collectTargetValues(repoRoot);
  const targetChecks = checkTargets(envValues);
  const blockedTargets = targetChecks.filter((target) => target.status === "blocked");
  const urlTargets = targetChecks.filter((target) => target.status !== "not-a-url");

  if (urlTargets.length === 0) {
    printLines([
      "LedgerByte Sales/AR walkthrough fixture planner",
      `marker=${args.marker}`,
      `mode=${args.mode}`,
      "status=blocked",
      "reason=No local target URLs were found in process or repo env files.",
      "createdData=false",
    ]);
    process.exitCode = 1;
    return;
  }

  if (blockedTargets.length > 0) {
    printLines([
      "LedgerByte Sales/AR walkthrough fixture planner",
      `marker=${args.marker}`,
      `mode=${args.mode}`,
      "status=blocked",
      `blockedTargetCount=${blockedTargets.length}`,
      "reason=At least one configured target is not proven local. No sample data was created.",
      "createdData=false",
    ]);
    process.exitCode = 1;
    return;
  }

  const apiUrl = normalizeApiUrl(
    process.env.LEDGERBYTE_API_URL ??
      process.env.NEXT_PUBLIC_API_URL ??
      readEnvValue(repoRoot, "apps/web/.env.local", "NEXT_PUBLIC_API_URL") ??
      readEnvValue(repoRoot, ".env", "NEXT_PUBLIC_API_URL") ??
      DEFAULT_API_URL,
  );
  const apiTarget = classifyTarget("LEDGERBYTE_API_URL", "effective-api-url", apiUrl);
  if (apiTarget.status !== "local") {
    printLines([
      "LedgerByte Sales/AR walkthrough fixture planner",
      `marker=${args.marker}`,
      `mode=${args.mode}`,
      "status=blocked",
      "reason=Effective API URL is not proven local. No sample data was created.",
      "createdData=false",
    ]);
    process.exitCode = 1;
    return;
  }

  const preflight = await loadFixturePreflight(apiUrl, args.marker, urlTargets.length);

  if (args.mode === "dry-run") {
    printDryRun(args.marker, urlTargets.length, preflight);
    if (preflight.blockedReasons.length > 0) {
      process.exitCode = 1;
    }
    return;
  }

  if (preflight.blockedReasons.length > 0) {
    printBlockedExecute(args.marker, preflight);
    process.exitCode = 1;
    return;
  }

  const summary = await executeFixture(apiUrl, args.marker, urlTargets.length, preflight);
  printExecuteSummary(summary);
}

function printDryRun(marker: string, checkedTargets: number, preflight: FixturePreflight) {
  const records = plannedRecords(marker);
  const isBlocked = preflight.blockedReasons.length > 0;
  printLines([
    "LedgerByte Sales/AR walkthrough fixture planner",
    `marker=${marker}`,
    "mode=dry-run",
    `status=${isBlocked ? "blocked" : "planned"}`,
    `localTargetGuard=passed checkedTargets=${checkedTargets}`,
    "createdData=false",
    "databaseWrites=false",
    "readOnlyApiPrerequisiteCheck=true",
    "seedResetDelete=false",
    `loginPerformed=${preflight.session ? "true" : "false"}`,
    "tokenOutput=false",
    "cookieOutput=false",
    "authHeaderOutput=false",
    "emailSent=false",
    "paymentCaptured=false",
    "zatcaCalled=false",
    "pdfGenerated=false",
    "",
    "Pre-execute prerequisite validation:",
    `activeOrganizationResolved=${preflight.session ? "true" : "false"}`,
    `salesTaxRate=${preflight.salesTaxRate ? formatTaxRate(preflight.salesTaxRate) : "blocked"}`,
    `salesRevenueAccount=${preflight.salesAccount ? formatAccount(preflight.salesAccount) : "blocked"}`,
    `bankProfile=${preflight.bankAccount ? formatBankAccount(preflight.bankAccount) : "blocked"}`,
    `paymentPostingAssetAccount=${preflight.paymentAccount ? formatAccount(preflight.paymentAccount) : "blocked"}`,
    `creditNoteApplyPayloadShape=${CREDIT_NOTE_APPLY_PAYLOAD_KEYS.join(",")}`,
    "creditNoteApplyUnsupportedKeys=none",
    `creditNoteApplyPlannedAmount=${WALKTHROUGH_CREDIT_NOTE_APPLY_AMOUNT}`,
    "creditNoteApplyRecordValidation=execute-only-after-local-credit-note-and-invoice-exist",
    `sourceInvoiceDetailLine=${formatSourceLineCheck(preflight.sourceInvoiceLine)}`,
    `sourceQuoteDetailLine=${formatSourceLineCheck(preflight.sourceQuoteLine)}`,
    `deliveryNotePayloadShape=${DELIVERY_NOTE_PAYLOAD_KEYS.join(",")} | lineKeys=${DELIVERY_NOTE_LINE_PAYLOAD_KEYS.join(",")}`,
    "deliveryNoteUnsupportedKeys=none",
    "",
    "Endpoint readiness:",
    ...preflight.endpointChecks.map((check) => `- ${check.path}: ${check.status}${check.statusCode ? ` http=${check.statusCode}` : ""} markerOccurrences=${check.markerOccurrences ?? "n/a"} summary=${check.summary}`),
    "",
    "Existing marker metadata:",
    ...Object.entries(preflight.existingMarkerCounts).map(([key, value]) => `${key}=${value}`),
    "",
    "Idempotency reuse plan:",
    ...preflight.idempotencyChecks.map((check) => `- ${check.label}: ${check.status} summary=${check.summary}`),
    ...(isBlocked ? ["", "Blocked reasons:", ...preflight.blockedReasons.map((reason) => `- ${reason}`)] : []),
    "",
    "Planned fake records:",
    ...records.map(
      (record) =>
        `- ${record.area}: ${record.fakeIdentifier} | route=${record.route} | posting=${record.expectedPostingEffect} | nonEffect=${record.expectedNonEffect} | checkpoint=${record.checkpoint}`,
    ),
    "",
    "Expected counts:",
    "customers=1",
    "serviceItems=1",
    "productItems=1",
    "salesInvoices=5",
    "customerPayments=1",
    "creditNotes=1",
    "refundScenarios=1",
    "salesQuotes=2",
    "recurringTemplates=1",
    "generatedDraftInvoices=2",
    "deliveryNotes=2",
    "collectionCases=2",
    "collectionActivities=4",
    "reportCheckpoints=3",
    "dashboardCheckpoints=6",
    "",
    "Planned routes:",
    ...plannedRoutes().map((route) => `- ${route}`),
    "",
    "Safety boundary:",
    "- Dry-run only; no records were created.",
    "- No seed, reset, cleanup, delete, migration, PDF generation, email, payment gateway, VAT filing, ZATCA, backup, restore, hosted, beta, production, or customer-data workflow was run.",
  ]);
}

function printBlockedExecute(marker: string, preflight: FixturePreflight) {
  printLines([
    "LedgerByte Sales/AR walkthrough fixture planner",
    `marker=${marker}`,
    "mode=execute",
    "status=blocked",
    "createdData=false",
    "databaseWrites=false",
    "seedResetDelete=false",
    "emailSent=false",
    "paymentCaptured=false",
    "zatcaCalled=false",
    "pdfGenerated=false",
    "",
    "Execute was blocked before mutation because pre-execute prerequisite validation failed:",
    ...preflight.blockedReasons.map((reason) => `- ${reason}`),
  ]);
}

async function loadFixturePreflight(apiUrl: string, marker: string, checkedTargets: number): Promise<FixturePreflight> {
  const preflight: FixturePreflight = {
    marker,
    checkedTargets,
    blockedReasons: [],
    endpointChecks: [],
    existingMarkerCounts: {},
    idempotencyChecks: [],
  };

  const email = process.env.LEDGERBYTE_WALKTHROUGH_EMAIL ?? process.env.LEDGERBYTE_E2E_EMAIL ?? process.env.LEDGERBYTE_SMOKE_EMAIL ?? DEFAULT_EMAIL;
  const password =
    process.env.LEDGERBYTE_WALKTHROUGH_PASSWORD ?? process.env.LEDGERBYTE_E2E_PASSWORD ?? process.env.LEDGERBYTE_SMOKE_PASSWORD ?? DEFAULT_PASSWORD;
  const preferredOrganizationId =
    process.env.LEDGERBYTE_WALKTHROUGH_ORGANIZATION_ID ??
    process.env.LEDGERBYTE_E2E_ORGANIZATION_ID ??
    process.env.LEDGERBYTE_SMOKE_ORGANIZATION_ID ??
    DEFAULT_ORGANIZATION_ID;

  try {
    preflight.session = await login(apiUrl, email, password, preferredOrganizationId);
  } catch (error) {
    preflight.blockedReasons.push(`Local login failed: ${redact(error instanceof Error ? error.message : String(error))}`);
    return preflight;
  }

  const accountCheck = await readEndpoint<ApiEntity[]>(apiUrl, "/accounts", preflight.session, marker);
  const taxRateCheck = await readEndpoint<ApiEntity[]>(apiUrl, "/tax-rates", preflight.session, marker);
  const bankAccountCheck = await readEndpoint<ApiEntity[]>(apiUrl, "/bank-accounts", preflight.session, marker);
  const itemCheck = await readEndpoint<ApiEntity[]>(apiUrl, "/items", preflight.session, marker);
  const contactCheck = await readEndpoint<ApiEntity[]>(apiUrl, "/contacts", preflight.session, marker);
  const paymentCheck = await readEndpoint<ApiEntity[]>(apiUrl, "/customer-payments", preflight.session, marker);
  const creditNoteCheck = await readEndpoint<ApiEntity[]>(apiUrl, "/credit-notes", preflight.session, marker);
  const refundCheck = await readEndpoint<ApiEntity[]>(apiUrl, "/customer-refunds", preflight.session, marker);
  const salesInvoiceCheck = await readEndpoint<ApiEntity[]>(apiUrl, "/sales-invoices", preflight.session, marker);
  const salesQuoteCheck = await readEndpoint<ApiEntity[]>(apiUrl, "/sales-quotes", preflight.session, marker);
  const recurringCheck = await readEndpoint<ApiEntity[]>(apiUrl, "/recurring-invoices", preflight.session, marker);
  const deliveryNoteCheck = await readEndpoint<ApiEntity[]>(apiUrl, "/delivery-notes", preflight.session, marker);
  const collectionCheck = await readEndpoint<ApiEntity[]>(apiUrl, "/collections", preflight.session, marker);

  const endpointResults = [
    accountCheck,
    taxRateCheck,
    bankAccountCheck,
    itemCheck,
    contactCheck,
    paymentCheck,
    creditNoteCheck,
    refundCheck,
    salesInvoiceCheck,
    salesQuoteCheck,
    recurringCheck,
    deliveryNoteCheck,
    collectionCheck,
  ];
  preflight.endpointChecks = endpointResults.map((result) => result.check);

  for (const result of endpointResults) {
    preflight.existingMarkerCounts[result.check.path.replace(/^\//, "").replace(/-/g, "")] = result.check.markerOccurrences ?? 0;
    if (result.check.status === "blocked") {
      preflight.blockedReasons.push(`${result.check.path} is not ready: ${result.check.summary}`);
    }
  }

  preflight.idempotencyChecks = buildIdempotencyChecks(marker, {
    contacts: contactCheck.data ?? [],
    items: itemCheck.data ?? [],
    invoices: salesInvoiceCheck.data ?? [],
    payments: paymentCheck.data ?? [],
    creditNotes: creditNoteCheck.data ?? [],
    refunds: refundCheck.data ?? [],
    quotes: salesQuoteCheck.data ?? [],
    recurringTemplates: recurringCheck.data ?? [],
    deliveryNotes: deliveryNoteCheck.data ?? [],
    collections: collectionCheck.data ?? [],
  });

  const allocationCheck = await checkExistingCreditNoteAllocation(apiUrl, preflight.session, marker, creditNoteCheck.data ?? [], salesInvoiceCheck.data ?? []);
  preflight.idempotencyChecks.push(allocationCheck);
  if (allocationCheck.status === "blocked") {
    preflight.blockedReasons.push(allocationCheck.summary);
  }

  if (accountCheck.data) {
    try {
      preflight.salesAccount = findSalesRevenueAccount(accountCheck.data);
    } catch (error) {
      preflight.blockedReasons.push(redact(error instanceof Error ? error.message : String(error)));
    }
  }

  if (bankAccountCheck.data) {
    try {
      preflight.bankAccount = findBankAccount(bankAccountCheck.data);
    } catch (error) {
      preflight.blockedReasons.push(redact(error instanceof Error ? error.message : String(error)));
    }
  }

  if (accountCheck.data) {
    try {
      preflight.paymentAccount = findPaymentPostingAccount(accountCheck.data, preflight.bankAccount);
    } catch (error) {
      preflight.blockedReasons.push(redact(error instanceof Error ? error.message : String(error)));
    }
  }

  if (taxRateCheck.data) {
    try {
      preflight.salesTaxRate = findSalesTaxRate(taxRateCheck.data);
    } catch (error) {
      preflight.blockedReasons.push(redact(error instanceof Error ? error.message : String(error)));
    }
  }

  if (preflight.salesTaxRate && !isSalesTaxRate(preflight.salesTaxRate)) {
    preflight.blockedReasons.push("Selected tax rate is not active with SALES or BOTH scope.");
  }

  try {
    validateCreditNoteApplyPayloadShape(buildCreditNoteApplyPayload(DEFAULT_ORGANIZATION_ID, WALKTHROUGH_CREDIT_NOTE_APPLY_AMOUNT));
  } catch (error) {
    preflight.blockedReasons.push(redact(error instanceof Error ? error.message : String(error)));
  }

  if (salesInvoiceCheck.data) {
    preflight.sourceInvoiceLine = await checkExistingSourceInvoiceLine(apiUrl, preflight.session, marker, salesInvoiceCheck.data, contactCheck.data ?? []);
    if (preflight.sourceInvoiceLine.status === "blocked") {
      preflight.blockedReasons.push(preflight.sourceInvoiceLine.summary);
    }
  }

  if (salesQuoteCheck.data) {
    preflight.sourceQuoteLine = await checkExistingSourceQuoteLine(apiUrl, preflight.session, marker, salesQuoteCheck.data, contactCheck.data ?? []);
    if (preflight.sourceQuoteLine.status === "blocked") {
      preflight.blockedReasons.push(preflight.sourceQuoteLine.summary);
    }
  }

  return preflight;
}

async function readEndpoint<T>(apiUrl: string, requestPath: string, session: Session, marker: string): Promise<{ check: EndpointCheck; data?: T }> {
  try {
    const data = await apiRequest<T>(apiUrl, requestPath, {}, session);
    return {
      data,
      check: {
        path: requestPath,
        status: "ready",
        statusCode: 200,
        markerOccurrences: countMarkerOccurrences(data, marker),
        summary: "ok",
      },
    };
  } catch (error) {
    const message = redact(error instanceof Error ? error.message : String(error));
    const statusMatch = /HTTP\s+(\d+)/.exec(message);
    return {
      check: {
        path: requestPath,
        status: "blocked",
        statusCode: statusMatch ? Number(statusMatch[1]) : undefined,
        markerOccurrences: 0,
        summary: message,
      },
    };
  }
}

function assertReadyPreflight(
  preflight: FixturePreflight,
): asserts preflight is FixturePreflight & {
  session: Session;
  salesAccount: ApiEntity;
  bankAccount: ApiEntity;
  paymentAccount: ApiEntity;
  salesTaxRate: ApiEntity;
} {
  if (
    preflight.blockedReasons.length > 0 ||
    !preflight.session ||
    !preflight.salesAccount ||
    !preflight.bankAccount ||
    !preflight.paymentAccount ||
    !preflight.salesTaxRate
  ) {
    throw new Error("Fixture execute prerequisites are not ready. No sample data was created.");
  }
}

async function executeFixture(apiUrl: string, marker: string, checkedTargets: number, preflight: FixturePreflight): Promise<ExecuteSummary> {
  assertReadyPreflight(preflight);
  const session = preflight.session;
  const salesAccount = preflight.salesAccount;
  const paymentAccount = preflight.paymentAccount;
  const salesTaxRate = preflight.salesTaxRate;
  const summary: ExecuteSummary = {
    marker,
    organizationId: session.organizationId,
    created: [],
    reused: [],
    skipped: [],
    entities: {},
    numbers: {},
    counts: {},
    routeHints: [],
    nonEffects: [
      "seedResetDelete=false",
      "cleanupDelete=false",
      "emailSent=false",
      "paymentGatewayCapture=false",
      "paymentLinkCreated=false",
      "vatFiled=false",
      "zatcaCalled=false",
      "pdfGenerated=false",
      "backupRestore=false",
      "hostedOrCustomerData=false",
    ],
  };

  const customer = await ensureContact(apiUrl, session, summary, marker, {
    type: "CUSTOMER",
    name: `Walkthrough Customer ${marker}`,
    displayName: `Walkthrough Customer ${marker}`,
    email: `sales-ar-walkthrough-${marker.toLowerCase()}@example.com`,
    phone: "+966500000111",
    taxNumber: "399999999800111",
    identificationType: "CRN",
    identificationNumber: "1010999001",
    addressLine1: "Walkthrough Local Street",
    addressLine2: "Suite 10",
    buildingNumber: "2222",
    district: "Local Review",
    city: "Riyadh",
    countryCode: "SA",
    postalCode: "12222",
    isActive: true,
  });

  const serviceItem = await ensureItem(apiUrl, session, summary, marker, {
    name: `Walkthrough Service ${marker}`,
    description: "Synthetic service item for local Sales/AR accountant walkthrough.",
    sku: `WALK-SERVICE-${marker}`,
    type: "SERVICE",
    status: "ACTIVE",
    sellingPrice: "100.0000",
    revenueAccountId: salesAccount.id,
    salesTaxRateId: salesTaxRate.id,
    inventoryTracking: false,
  });

  const productItem = await ensureItem(apiUrl, session, summary, marker, {
    name: `Walkthrough Product ${marker}`,
    description: "Synthetic non-inventory product item for local Sales/AR accountant walkthrough.",
    sku: `WALK-PRODUCT-${marker}`,
    type: "PRODUCT",
    status: "ACTIVE",
    sellingPrice: "250.0000",
    revenueAccountId: salesAccount.id,
    salesTaxRateId: salesTaxRate.id,
    inventoryTracking: false,
  });

  const overdueInvoice = await ensureInvoice(apiUrl, session, summary, marker, "taxExclusiveInvoice", {
    customerId: customer.id,
    issueDate: isoDaysAgo(45),
    dueDate: isoDaysAgo(20),
    currency: "SAR",
    notes: `${marker} tax exclusive overdue finalized sample invoice`,
    terms: "Synthetic local walkthrough invoice. Finalized locally for accountant review evidence only.",
    taxMode: "TAX_EXCLUSIVE",
    lines: [
      linePayload(serviceItem, salesAccount, salesTaxRate, "Walkthrough tax-exclusive service line", "2.0000", "100.0000"),
    ],
  }, true);

  const taxInclusiveInvoice = await ensureInvoice(apiUrl, session, summary, marker, "taxInclusiveInvoice", {
    customerId: customer.id,
    issueDate: isoDaysAgo(10),
    dueDate: isoDaysFromNow(20),
    currency: "SAR",
    notes: `${marker} tax inclusive finalized sample invoice`,
    terms: "Synthetic local walkthrough invoice. No email, payment link, VAT filing, or ZATCA submission.",
    taxMode: "TAX_INCLUSIVE",
    lines: [
      linePayload(serviceItem, salesAccount, salesTaxRate, "Walkthrough tax-inclusive service line", "1.0000", "230.0000"),
    ],
  }, true);

  const noTaxInvoice = await ensureInvoice(apiUrl, session, summary, marker, "noTaxInvoice", {
    customerId: customer.id,
    issueDate: isoDaysAgo(5),
    dueDate: isoDaysFromNow(25),
    currency: "SAR",
    notes: `${marker} no-tax finalized sample invoice`,
    terms: "Synthetic local walkthrough no-tax invoice. No formal exemption approval is implied.",
    taxMode: "NO_TAX",
    lines: [
      {
        itemId: serviceItem.id,
        accountId: salesAccount.id,
        description: "Walkthrough no-tax service line",
        quantity: "1.0000",
        unitPrice: "80.0000",
        sortOrder: 0,
      },
    ],
  }, true);

  const payment = await ensureCustomerPayment(apiUrl, session, summary, marker, customer, paymentAccount, overdueInvoice, "20.0000");
  const creditNote = await ensureCreditNote(apiUrl, session, summary, marker, customer, noTaxInvoice, serviceItem, salesAccount, undefined);
  await ensureCreditNoteApplied(apiUrl, session, summary, creditNote, noTaxInvoice, WALKTHROUGH_CREDIT_NOTE_APPLY_AMOUNT);
  await ensureCustomerRefund(apiUrl, session, summary, marker, customer, creditNote, paymentAccount, "2.0000");

  const awaitingQuote = await ensureQuote(apiUrl, session, summary, marker, "awaitingQuote", {
    customerId: customer.id,
    issueDate: isoDaysAgo(1),
    expiryDate: isoDaysFromNow(6),
    reference: `${marker}-QUOTE-AWAITING`,
    currency: "SAR",
    notes: `${marker} sales quote awaiting acceptance sample`,
    terms: "Synthetic local walkthrough quote. Non-posting.",
    taxMode: "TAX_EXCLUSIVE",
    lines: [linePayload(serviceItem, salesAccount, salesTaxRate, "Walkthrough quote awaiting service line", "1.0000", "150.0000")],
  }, "SENT");

  const acceptedQuote = await ensureQuote(apiUrl, session, summary, marker, "acceptedQuote", {
    customerId: customer.id,
    issueDate: isoDaysAgo(2),
    expiryDate: isoDaysFromNow(5),
    reference: `${marker}-QUOTE-ACCEPTED`,
    currency: "SAR",
    notes: `${marker} accepted quote source sample`,
    terms: "Synthetic accepted quote for delivery note and draft invoice conversion.",
    taxMode: "TAX_EXCLUSIVE",
    lines: [linePayload(productItem, salesAccount, salesTaxRate, "Walkthrough accepted quote product line", "1.0000", "250.0000")],
  }, "ACCEPTED");

  const sourceInvoiceLineId = await resolveSourceSalesInvoiceLineId(apiUrl, session, overdueInvoice, customer, serviceItem);
  const sourceQuoteLineId = await resolveSourceSalesQuoteLineId(apiUrl, session, acceptedQuote, customer, productItem);
  summary.entities.deliverySourceInvoiceLine = sourceInvoiceLineId;
  summary.entities.deliverySourceQuoteLine = sourceQuoteLineId;

  const deliveryFromInvoice = await ensureDeliveryNote(apiUrl, session, summary, marker, "deliveryNoteFromInvoice", {
    customerId: customer.id,
    issueDate: isoDaysAgo(1),
    deliveryDate: isoDaysFromNow(1),
    reference: `${marker}-DN-INVOICE`,
    relatedSalesInvoiceId: overdueInvoice.id,
    deliveryAddress: "Synthetic local delivery address, Riyadh",
    notes: `${marker} delivery note sourced from finalized invoice`,
    instructions: "Local accountant walkthrough only. Does not move inventory by itself.",
    lines: [
      {
        itemId: serviceItem.id,
        description: "Walkthrough delivery from invoice line",
        quantity: "1.0000",
        unitOfMeasure: "unit",
        sourceSalesInvoiceLineId: sourceInvoiceLineId,
        sortOrder: 0,
      },
    ],
  }, "ISSUED");

  const deliveryFromQuote = await ensureDeliveryNote(apiUrl, session, summary, marker, "deliveryNoteFromQuote", {
    customerId: customer.id,
    issueDate: isoDaysAgo(1),
    deliveryDate: isoDaysFromNow(2),
    reference: `${marker}-DN-QUOTE`,
    relatedSalesQuoteId: acceptedQuote.id,
    deliveryAddress: "Synthetic local delivery address, Riyadh",
    notes: `${marker} delivery note sourced from accepted quote`,
    instructions: "Local accountant walkthrough only. Non-posting fulfillment document.",
    lines: [
      {
        itemId: productItem.id,
        description: "Walkthrough delivery from accepted quote line",
        quantity: "1.0000",
        unitOfMeasure: "unit",
        sourceSalesQuoteLineId: sourceQuoteLineId,
        sortOrder: 0,
      },
    ],
  }, "DRAFT");

  const quoteConversion = await ensureQuoteConvertedToDraftInvoice(apiUrl, session, summary, marker, acceptedQuote);
  const recurringTemplate = await ensureRecurringTemplate(apiUrl, session, summary, marker, customer, serviceItem, salesAccount, salesTaxRate);
  const recurringDraftInvoice = await ensureRecurringGeneratedDraft(apiUrl, session, summary, marker, recurringTemplate);

  const collectionCase = await ensureCollectionCase(apiUrl, session, summary, marker, "openCollectionCase", customer, overdueInvoice, {
    status: "OPEN",
    priority: "HIGH",
    followUpDate: isoDaysAgo(1),
    nextActionAt: isoDaysAgo(1),
    promisedPaymentDate: isoDaysFromNow(7),
    promisedAmount: "50.0000",
    summary: `${marker} overdue invoice collection follow-up`,
    notes: `${marker} synthetic local collection case. No email or payment link.`,
  });
  await ensureCollectionActivity(apiUrl, session, summary, marker, collectionCase, "NOTE", `${marker} note activity for accountant walkthrough`, "noteActivity");
  await ensureCollectionActivity(apiUrl, session, summary, marker, collectionCase, "CALL", `${marker} call note activity for accountant walkthrough`, "callActivity");
  await ensureCollectionActivity(apiUrl, session, summary, marker, collectionCase, "PROMISE_TO_PAY", `${marker} promise to pay note only`, "promiseActivity", {
    promisedPaymentDate: isoDaysFromNow(7),
    promisedAmount: "50.0000",
  });
  await markCollectionPromised(apiUrl, session, summary, marker, collectionCase, "50.0000");

  const disputedCase = await ensureCollectionCase(apiUrl, session, summary, marker, "disputedCollectionCase", customer, taxInclusiveInvoice, {
    status: "DISPUTED",
    priority: "NORMAL",
    followUpDate: isoDaysFromNow(3),
    nextActionAt: isoDaysFromNow(3),
    summary: `${marker} disputed collection case sample`,
    notes: `${marker} synthetic local dispute note. No legal automation.`,
  });
  await ensureCollectionActivity(apiUrl, session, summary, marker, disputedCase, "DISPUTE", `${marker} dispute activity for accountant walkthrough`, "disputeActivity");

  summary.entities.quoteConvertedDraftInvoice = quoteConversion.invoice.id;
  summary.numbers.quoteConvertedDraftInvoice = String(quoteConversion.invoice.invoiceNumber ?? "");
  summary.entities.recurringDraftInvoice = recurringDraftInvoice.id;
  summary.numbers.recurringDraftInvoice = String(recurringDraftInvoice.invoiceNumber ?? "");
  summary.entities.payment = payment.id;
  summary.numbers.payment = String(payment.paymentNumber ?? "");
  summary.entities.creditNote = creditNote.id;
  summary.numbers.creditNote = String(creditNote.creditNoteNumber ?? "");
  summary.entities.deliveryNoteFromInvoice = deliveryFromInvoice.id;
  summary.entities.deliveryNoteFromQuote = deliveryFromQuote.id;

  summary.counts = {
    customers: 1,
    serviceItems: 1,
    productItems: 1,
    salesInvoices: 5,
    finalizedInvoices: 3,
    generatedDraftInvoices: 2,
    customerPayments: payment ? 1 : 0,
    creditNotes: creditNote ? 1 : 0,
    refundScenarios: summary.entities.customerRefund ? 1 : 0,
    salesQuotes: 2,
    recurringTemplates: 1,
    deliveryNotes: 2,
    collectionCases: 2,
    collectionActivities: 4,
    generatedDocuments: 0,
  };

  summary.routeHints = [
    `/customers/${customer.id}`,
    `/sales/invoices/${overdueInvoice.id}`,
    `/sales/invoices/${taxInclusiveInvoice.id}`,
    `/sales/invoices/${noTaxInvoice.id}`,
    `/sales/invoices/${quoteConversion.invoice.id}`,
    `/sales/invoices/${recurringDraftInvoice.id}`,
    `/sales/quotes/${awaitingQuote.id}`,
    `/sales/quotes/${acceptedQuote.id}`,
    `/sales/recurring-invoices/${recurringTemplate.id}`,
    `/sales/delivery-notes/${deliveryFromInvoice.id}`,
    `/sales/delivery-notes/${deliveryFromQuote.id}`,
    `/sales/collections/${collectionCase.id}`,
    `/sales/collections/${disputedCase.id}`,
    "/dashboard",
    "/reports/aged-receivables",
    "/reports/vat-summary",
    "/reports/vat-return",
    "/tax",
  ];

  summary.numbers.customer = String(customer.displayName ?? customer.name ?? "");
  summary.numbers.taxExclusiveInvoice = String(overdueInvoice.invoiceNumber ?? "");
  summary.numbers.taxInclusiveInvoice = String(taxInclusiveInvoice.invoiceNumber ?? "");
  summary.numbers.noTaxInvoice = String(noTaxInvoice.invoiceNumber ?? "");
  summary.numbers.awaitingQuote = String(awaitingQuote.quoteNumber ?? "");
  summary.numbers.acceptedQuote = String(acceptedQuote.quoteNumber ?? "");
  summary.numbers.recurringTemplate = String(recurringTemplate.templateNumber ?? "");
  summary.numbers.deliveryNoteFromInvoice = String(deliveryFromInvoice.deliveryNoteNumber ?? "");
  summary.numbers.deliveryNoteFromQuote = String(deliveryFromQuote.deliveryNoteNumber ?? "");
  summary.numbers.openCollectionCase = String(collectionCase.caseNumber ?? "");
  summary.numbers.disputedCollectionCase = String(disputedCase.caseNumber ?? "");

  void checkedTargets;
  return summary;
}

function printExecuteSummary(summary: ExecuteSummary) {
  printLines([
    "LedgerByte Sales/AR walkthrough fixture planner",
    `marker=${summary.marker}`,
    "mode=execute",
    "status=executed",
    "createdData=true",
    "target=local-only",
    "databaseUrlPrinted=false",
    "tokenOutput=false",
    "cookieOutput=false",
    "authHeaderOutput=false",
    "responseBodiesPrinted=false",
    "",
    "Created/reused summary:",
    `created=${summary.created.length}`,
    `reused=${summary.reused.length}`,
    `skipped=${summary.skipped.length}`,
    "",
    "Counts:",
    ...Object.entries(summary.counts).map(([key, value]) => `${key}=${value}`),
    "",
    "Fake document numbers:",
    ...Object.entries(summary.numbers).map(([key, value]) => `${key}=${value || "n/a"}`),
    "",
    "Sample route hints:",
    ...summary.routeHints.map((route) => `- ${route}`),
    "",
    "Non-effects:",
    ...summary.nonEffects.map((item) => `- ${item}`),
  ]);
}

function parseArgs(args: string[]): ParsedArgs {
  let mode: Mode = "dry-run";
  let marker = DEFAULT_MARKER;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--dry-run") {
      mode = "dry-run";
      continue;
    }
    if (arg === "--execute") {
      mode = "execute";
      continue;
    }
    if (arg === "--marker") {
      const value = args[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error("--marker requires a value.");
      }
      marker = value;
      index += 1;
      continue;
    }
    if (arg.startsWith("--marker=")) {
      marker = arg.slice("--marker=".length);
      continue;
    }
    throw new Error(`Unsupported flag: ${arg}`);
  }

  if (!marker.trim()) {
    throw new Error("Marker must not be blank.");
  }

  return { mode, marker };
}

async function login(apiUrl: string, email: string, password: string, preferredOrganizationId: string): Promise<Session> {
  const loginResponse = await apiRequest<ApiEntity>(apiUrl, "/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  const accessToken = String(loginResponse.accessToken ?? "");
  if (!accessToken) {
    throw new Error("Local login did not return an access token.");
  }
  const me = await apiRequest<ApiEntity>(apiUrl, "/auth/me", {}, { token: accessToken, organizationId: "" });
  const memberships = me.memberships ?? [];
  const membership =
    memberships.find((item) => item.status === "ACTIVE" && (item.organizationId ?? item.organization?.id) === preferredOrganizationId) ??
    memberships.find((item) => item.status === "ACTIVE") ??
    memberships[0];
  const organizationId = membership?.organizationId ?? membership?.organization?.id;
  if (!organizationId) {
    throw new Error("Local login has no active organization membership.");
  }
  return { token: accessToken, organizationId };
}

async function ensureContact(apiUrl: string, session: Session, summary: ExecuteSummary, marker: string, payload: Record<string, unknown> & { name: string; type: string }) {
  const contacts = await apiRequest<ApiEntity[]>(apiUrl, "/contacts", {}, session);
  const existing = contacts.find((contact) => contact.name === payload.name && contact.type === payload.type);
  if (existing) {
    track(summary, "reused", `customer:${payload.name}`);
    summary.entities.customer = existing.id;
    return existing;
  }
  const created = await apiRequest<ApiEntity>(apiUrl, "/contacts", { method: "POST", body: JSON.stringify(payload) }, session);
  track(summary, "created", `customer:${marker}`);
  summary.entities.customer = created.id;
  return created;
}

async function ensureItem(apiUrl: string, session: Session, summary: ExecuteSummary, marker: string, payload: Record<string, unknown> & { sku: string }) {
  const items = await apiRequest<ApiEntity[]>(apiUrl, "/items", {}, session);
  const existing = items.find((item) => item.sku === payload.sku);
  const key = String(payload.type === "PRODUCT" ? "productItem" : "serviceItem");
  if (existing) {
    track(summary, "reused", `item:${payload.sku}`);
    summary.entities[key] = existing.id;
    return existing;
  }
  const created = await apiRequest<ApiEntity>(apiUrl, "/items", { method: "POST", body: JSON.stringify(payload) }, session);
  track(summary, "created", `item:${marker}:${payload.sku}`);
  summary.entities[key] = created.id;
  return created;
}

async function ensureInvoice(
  apiUrl: string,
  session: Session,
  summary: ExecuteSummary,
  marker: string,
  key: string,
  payload: Record<string, unknown> & { notes: string },
  finalize: boolean,
) {
  const invoices = await apiRequest<ApiEntity[]>(apiUrl, "/sales-invoices", {}, session);
  let invoice = invoices.find((item) => textIncludes(item.notes, payload.notes));
  if (invoice) {
    track(summary, "reused", `sales-invoice:${key}`);
  } else {
    invoice = await apiRequest<ApiEntity>(apiUrl, "/sales-invoices", { method: "POST", body: JSON.stringify(payload) }, session);
    track(summary, "created", `sales-invoice:${key}`);
  }
  if (finalize && invoice.status === "DRAFT") {
    invoice = await apiRequest<ApiEntity>(apiUrl, `/sales-invoices/${invoice.id}/finalize`, { method: "POST", body: JSON.stringify({}) }, session);
    track(summary, "created", `sales-invoice-finalize:${key}`);
  }
  summary.entities[key] = invoice.id;
  summary.numbers[key] = String(invoice.invoiceNumber ?? "");
  return invoice;
}

async function ensureCustomerPayment(
  apiUrl: string,
  session: Session,
  summary: ExecuteSummary,
  marker: string,
  customer: ApiEntity,
  paymentAccount: ApiEntity,
  invoice: ApiEntity,
  amount: string,
) {
  const description = `${marker} local walkthrough partial customer payment`;
  const payments = await apiRequest<ApiEntity[]>(apiUrl, "/customer-payments", {}, session);
  const existing = payments.find((payment) => textIncludes(payment.description, description));
  if (existing) {
    track(summary, "reused", "customer-payment:partial");
    summary.entities.customerPayment = existing.id;
    return existing;
  }
  const balanceDue = Number(invoice.balanceDue ?? invoice.total ?? 0);
  if (balanceDue <= 0) {
    track(summary, "skipped", "customer-payment:invoice-has-no-balance");
    return { id: "", paymentNumber: "", status: "SKIPPED" };
  }
  const payment = await apiRequest<ApiEntity>(
    apiUrl,
    "/customer-payments",
    {
      method: "POST",
      body: JSON.stringify({
        customerId: customer.id,
        paymentDate: new Date().toISOString(),
        currency: "SAR",
        amountReceived: amount,
        accountId: paymentAccount.id,
        description,
        allocations: [{ invoiceId: invoice.id, amountApplied: amount }],
      }),
    },
    session,
  );
  track(summary, "created", "customer-payment:partial");
  summary.entities.customerPayment = payment.id;
  summary.numbers.customerPayment = String(payment.paymentNumber ?? "");
  return payment;
}

async function ensureCreditNote(
  apiUrl: string,
  session: Session,
  summary: ExecuteSummary,
  marker: string,
  customer: ApiEntity,
  invoice: ApiEntity,
  item: ApiEntity,
  salesAccount: ApiEntity,
  taxRate?: ApiEntity,
) {
  const reason = `${marker} local walkthrough credit note`;
  const creditNotes = await apiRequest<ApiEntity[]>(apiUrl, "/credit-notes", {}, session);
  let creditNote = creditNotes.find((item) => textIncludes(item.reason, reason));
  if (creditNote) {
    track(summary, "reused", "credit-note:sample");
  } else {
    creditNote = await apiRequest<ApiEntity>(
      apiUrl,
      "/credit-notes",
      {
        method: "POST",
        body: JSON.stringify({
          customerId: customer.id,
          originalInvoiceId: invoice.id,
          issueDate: new Date().toISOString(),
          currency: "SAR",
          notes: `${marker} synthetic local credit note. Adjusts customer balance through existing credit-note logic only.`,
          reason,
          lines: [
            {
              itemId: item.id,
              accountId: salesAccount.id,
              description: "Walkthrough credit adjustment",
              quantity: "1.0000",
              unitPrice: "10.0000",
              ...(taxRate ? { taxRateId: taxRate.id } : {}),
              sortOrder: 0,
            },
          ],
        }),
      },
      session,
    );
    track(summary, "created", "credit-note:sample");
  }
  if (creditNote.status === "DRAFT") {
    creditNote = await apiRequest<ApiEntity>(apiUrl, `/credit-notes/${creditNote.id}/finalize`, { method: "POST", body: JSON.stringify({}) }, session);
    track(summary, "created", "credit-note-finalize:sample");
  }
  summary.entities.creditNote = creditNote.id;
  summary.numbers.creditNote = String(creditNote.creditNoteNumber ?? "");
  return creditNote;
}

async function ensureCreditNoteApplied(apiUrl: string, session: Session, summary: ExecuteSummary, creditNote: ApiEntity, invoice: ApiEntity, amount: string) {
  const allocations = await apiRequest<ApiEntity[]>(apiUrl, `/credit-notes/${creditNote.id}/allocations`, {}, session);
  const existingAllocations = allocations.filter((allocation) => allocation.invoiceId === invoice.id && !allocation.reversedAt);
  const existing = existingAllocations.find((allocation) => decimalEquals(allocation.amountApplied, amount)) ?? existingAllocations.find((allocation) => sumAmounts(existingAllocations.map((item) => item.amountApplied)) >= Number(amount));
  if (existing) {
    track(summary, "reused", "credit-note-allocation:sample");
    summary.entities.creditNoteAllocation = existing.id;
    return existing;
  }
  const current = await apiRequest<ApiEntity>(apiUrl, `/credit-notes/${creditNote.id}`, {}, session);
  const targetInvoice = await apiRequest<ApiEntity>(apiUrl, `/sales-invoices/${invoice.id}`, {}, session);
  const payload = buildCreditNoteApplyPayload(targetInvoice.id, amount);
  validateCreditNoteApplyPrerequisites(session, current, targetInvoice, payload);
  if (Number(current.unappliedAmount ?? 0) < Number(amount)) {
    track(summary, "skipped", "credit-note-allocation:insufficient-unapplied");
    return { id: "" };
  }
  const applied = await apiRequest<ApiEntity>(
    apiUrl,
    `/credit-notes/${creditNote.id}/apply`,
    { method: "POST", body: JSON.stringify(payload) },
    session,
  );
  track(summary, "created", "credit-note-allocation:sample");
  summary.entities.creditNoteAllocation = applied.id;
  return applied;
}

function buildCreditNoteApplyPayload(invoiceId: string, amountApplied: string): CreditNoteApplyPayload {
  return { invoiceId, amountApplied };
}

function validateCreditNoteApplyPayloadShape(payload: Record<string, unknown>): asserts payload is CreditNoteApplyPayload {
  const allowedKeys = new Set<string>(CREDIT_NOTE_APPLY_PAYLOAD_KEYS);
  const keys = Object.keys(payload);
  const unsupportedKeys = keys.filter((key) => !allowedKeys.has(key));
  if (unsupportedKeys.length > 0) {
    throw new Error(`Credit note apply payload includes unsupported keys: ${unsupportedKeys.join(", ")}.`);
  }
  for (const key of CREDIT_NOTE_APPLY_PAYLOAD_KEYS) {
    if (!(key in payload)) {
      throw new Error(`Credit note apply payload is missing ${key}.`);
    }
  }
  if (typeof payload.invoiceId !== "string" || payload.invoiceId.length === 0) {
    throw new Error("Credit note apply payload invoiceId is required.");
  }
  if (typeof payload.amountApplied !== "string" || Number(payload.amountApplied) <= 0) {
    throw new Error("Credit note apply payload amountApplied must be positive.");
  }
}

function validateCreditNoteApplyPrerequisites(session: Session, creditNote: ApiEntity, invoice: ApiEntity, payload: CreditNoteApplyPayload) {
  validateCreditNoteApplyPayloadShape(payload);
  if (creditNote.organizationId && creditNote.organizationId !== session.organizationId) {
    throw new Error("Credit note apply prerequisite failed: credit note organization mismatch.");
  }
  if (invoice.organizationId && invoice.organizationId !== session.organizationId) {
    throw new Error("Credit note apply prerequisite failed: invoice organization mismatch.");
  }
  if (creditNote.status && creditNote.status !== "FINALIZED") {
    throw new Error("Credit note apply prerequisite failed: credit note is not finalized.");
  }
  if (invoice.status && invoice.status !== "FINALIZED") {
    throw new Error("Credit note apply prerequisite failed: invoice is not finalized.");
  }
  const creditCustomerId = getCustomerId(creditNote);
  const invoiceCustomerId = getCustomerId(invoice);
  if (creditCustomerId && invoiceCustomerId && creditCustomerId !== invoiceCustomerId) {
    throw new Error("Credit note apply prerequisite failed: credit note and invoice customer mismatch.");
  }
  const amount = Number(payload.amountApplied);
  if (Number(creditNote.unappliedAmount ?? 0) < amount) {
    throw new Error("Credit note apply prerequisite failed: credit note unapplied amount is insufficient.");
  }
  if (Number(invoice.balanceDue ?? 0) < amount) {
    throw new Error("Credit note apply prerequisite failed: invoice balance due is insufficient.");
  }
}

function getCustomerId(entity: ApiEntity): string | undefined {
  const direct = entity.customerId;
  if (direct) {
    return direct;
  }
  const customer = entity.customer;
  if (customer?.id) {
    return customer.id;
  }
  const originalInvoice = entity.originalInvoice;
  if (originalInvoice?.customerId) {
    return originalInvoice.customerId;
  }
  return undefined;
}

async function ensureCustomerRefund(
  apiUrl: string,
  session: Session,
  summary: ExecuteSummary,
  marker: string,
  customer: ApiEntity,
  creditNote: ApiEntity,
  paymentAccount: ApiEntity,
  amount: string,
) {
  const description = `${marker} local walkthrough credit note refund`;
  const refunds = await apiRequest<ApiEntity[]>(apiUrl, "/customer-refunds", {}, session);
  const existing = refunds.find((refund) => textIncludes(refund.description, description));
  if (existing) {
    track(summary, "reused", "customer-refund:credit-note");
    summary.entities.customerRefund = existing.id;
    summary.numbers.customerRefund = String(existing.refundNumber ?? "");
    return existing;
  }
  const current = await apiRequest<ApiEntity>(apiUrl, `/credit-notes/${creditNote.id}`, {}, session);
  if (Number(current.unappliedAmount ?? 0) < Number(amount)) {
    track(summary, "skipped", "customer-refund:insufficient-credit-note-unapplied");
    return { id: "", refundNumber: "", status: "SKIPPED" };
  }
  const refund = await apiRequest<ApiEntity>(
    apiUrl,
    "/customer-refunds",
    {
      method: "POST",
      body: JSON.stringify({
        customerId: customer.id,
        sourceType: "CREDIT_NOTE",
        sourceCreditNoteId: creditNote.id,
        refundDate: new Date().toISOString(),
        currency: "SAR",
        amountRefunded: amount,
        accountId: paymentAccount.id,
        description,
      }),
    },
    session,
  );
  track(summary, "created", "customer-refund:credit-note");
  summary.entities.customerRefund = refund.id;
  summary.numbers.customerRefund = String(refund.refundNumber ?? "");
  return refund;
}

async function ensureQuote(apiUrl: string, session: Session, summary: ExecuteSummary, marker: string, key: string, payload: Record<string, unknown> & { reference: string }, targetStatus: "SENT" | "ACCEPTED") {
  const quotes = await apiRequest<ApiEntity[]>(apiUrl, "/sales-quotes", {}, session);
  let quote = quotes.find((item) => item.reference === payload.reference || textIncludes(item.notes, String(payload.notes ?? "")));
  if (quote) {
    track(summary, "reused", `sales-quote:${key}`);
  } else {
    quote = await apiRequest<ApiEntity>(apiUrl, "/sales-quotes", { method: "POST", body: JSON.stringify(payload) }, session);
    track(summary, "created", `sales-quote:${key}`);
  }
  if (quote.status === "DRAFT" && (targetStatus === "SENT" || targetStatus === "ACCEPTED")) {
    quote = await apiRequest<ApiEntity>(apiUrl, `/sales-quotes/${quote.id}/mark-sent`, { method: "POST", body: JSON.stringify({}) }, session);
    track(summary, "created", `sales-quote-mark-sent:${key}`);
  }
  if (quote.status === "SENT" && targetStatus === "ACCEPTED") {
    quote = await apiRequest<ApiEntity>(apiUrl, `/sales-quotes/${quote.id}/accept`, { method: "POST", body: JSON.stringify({}) }, session);
    track(summary, "created", `sales-quote-accept:${key}`);
  }
  summary.entities[key] = quote.id;
  summary.numbers[key] = String(quote.quoteNumber ?? "");
  return quote;
}

async function ensureQuoteConvertedToDraftInvoice(apiUrl: string, session: Session, summary: ExecuteSummary, marker: string, quote: ApiEntity) {
  const currentQuote = await apiRequest<ApiEntity>(apiUrl, `/sales-quotes/${quote.id}`, {}, session);
  if (currentQuote.convertedSalesInvoice) {
    track(summary, "reused", "sales-quote-conversion:draft-invoice");
    return { quote: currentQuote, invoice: currentQuote.convertedSalesInvoice };
  }
  const result = await apiRequest<{ quote: ApiEntity; invoice: ApiEntity }>(apiUrl, `/sales-quotes/${quote.id}/convert-to-invoice`, { method: "POST", body: JSON.stringify({}) }, session);
  track(summary, "created", `sales-quote-conversion:${marker}`);
  return result;
}

async function ensureRecurringTemplate(
  apiUrl: string,
  session: Session,
  summary: ExecuteSummary,
  marker: string,
  customer: ApiEntity,
  item: ApiEntity,
  salesAccount: ApiEntity,
  taxRate: ApiEntity,
) {
  const name = `Walkthrough Recurring Template ${marker}`;
  const templates = await apiRequest<ApiEntity[]>(apiUrl, "/recurring-invoices", {}, session);
  let template = templates.find((item) => item.name === name || item.reference === `${marker}-REC`);
  if (template) {
    track(summary, "reused", "recurring-template:sample");
  } else {
    template = await apiRequest<ApiEntity>(
      apiUrl,
      "/recurring-invoices",
      {
        method: "POST",
        body: JSON.stringify({
          customerId: customer.id,
          name,
          startDate: isoDaysAgo(30),
          nextRunDate: isoDaysAgo(1),
          frequency: "MONTHLY",
          interval: 1,
          dayOfMonth: 1,
          invoiceDateMode: "RUN_DATE",
          paymentTermsDays: 15,
          reference: `${marker}-REC`,
          currency: "SAR",
          notes: `${marker} recurring template due for manual generation. Non-posting template.`,
          terms: "Generated invoices remain draft and must be finalized separately.",
          taxMode: "TAX_EXCLUSIVE",
          lines: [linePayload(item, salesAccount, taxRate, "Walkthrough recurring template service line", "1.0000", "120.0000")],
        }),
      },
      session,
    );
    track(summary, "created", "recurring-template:sample");
  }
  if (template.status === "DRAFT") {
    template = await apiRequest<ApiEntity>(apiUrl, `/recurring-invoices/${template.id}/activate`, { method: "POST", body: JSON.stringify({}) }, session);
    track(summary, "created", "recurring-template-activate:sample");
  }
  summary.entities.recurringTemplate = template.id;
  summary.numbers.recurringTemplate = String(template.templateNumber ?? "");
  return template;
}

async function ensureRecurringGeneratedDraft(apiUrl: string, session: Session, summary: ExecuteSummary, marker: string, template: ApiEntity) {
  const current = await apiRequest<ApiEntity>(apiUrl, `/recurring-invoices/${template.id}`, {}, session);
  const existingRun = (current.runs ?? []).find((run) => run.generatedInvoice?.id);
  if (existingRun?.generatedInvoice) {
    track(summary, "reused", "recurring-generate-now:draft-invoice");
    return existingRun.generatedInvoice;
  }
  const result = await apiRequest<{ invoice: ApiEntity }>(apiUrl, `/recurring-invoices/${template.id}/generate-now`, { method: "POST", body: JSON.stringify({}) }, session);
  track(summary, "created", `recurring-generate-now:${marker}`);
  return result.invoice;
}

async function ensureDeliveryNote(apiUrl: string, session: Session, summary: ExecuteSummary, marker: string, key: string, payload: Record<string, unknown> & { reference: string }, targetStatus: "DRAFT" | "ISSUED") {
  validateDeliveryNotePayloadShape(payload);
  const notes = await apiRequest<ApiEntity[]>(apiUrl, "/delivery-notes", {}, session);
  let note = notes.find((item) => item.reference === payload.reference || textIncludes(item.notes, String(payload.notes ?? "")));
  if (note) {
    track(summary, "reused", `delivery-note:${key}`);
  } else {
    note = await apiRequest<ApiEntity>(apiUrl, "/delivery-notes", { method: "POST", body: JSON.stringify(payload) }, session);
    track(summary, "created", `delivery-note:${key}`);
  }
  if (targetStatus === "ISSUED" && note.status === "DRAFT") {
    note = await apiRequest<ApiEntity>(apiUrl, `/delivery-notes/${note.id}/issue`, { method: "POST", body: JSON.stringify({}) }, session);
    track(summary, "created", `delivery-note-issue:${key}`);
  }
  summary.entities[key] = note.id;
  summary.numbers[key] = String(note.deliveryNoteNumber ?? "");
  return note;
}

async function ensureCollectionCase(
  apiUrl: string,
  session: Session,
  summary: ExecuteSummary,
  marker: string,
  key: string,
  customer: ApiEntity,
  invoice: ApiEntity,
  payload: Record<string, unknown>,
) {
  const existingCases = await apiRequest<ApiEntity[]>(apiUrl, `/collections/invoice/${invoice.id}`, {}, session);
  let collectionCase = existingCases.find((item) => textIncludes(item.summary, String(payload.summary ?? "")) || textIncludes(item.notes, String(payload.notes ?? "")));
  if (collectionCase) {
    track(summary, "reused", `collection-case:${key}`);
  } else {
    collectionCase = await apiRequest<ApiEntity>(
      apiUrl,
      "/collections",
      {
        method: "POST",
        body: JSON.stringify({
          customerId: customer.id,
          salesInvoiceId: invoice.id,
          ...payload,
        }),
      },
      session,
    );
    track(summary, "created", `collection-case:${key}`);
  }
  summary.entities[key] = collectionCase.id;
  summary.numbers[key] = String(collectionCase.caseNumber ?? "");
  return collectionCase;
}

async function ensureCollectionActivity(
  apiUrl: string,
  session: Session,
  summary: ExecuteSummary,
  marker: string,
  collectionCase: ApiEntity,
  activityType: string,
  note: string,
  key: string,
  extras: Record<string, unknown> = {},
) {
  const current = await apiRequest<ApiEntity>(apiUrl, `/collections/${collectionCase.id}`, {}, session);
  const activities = (current.activities ?? []) as ApiEntity[];
  const existing = activities.find((activity) => activity.activityType === activityType && activity.note === note);
  if (existing) {
    track(summary, "reused", `collection-activity:${key}`);
    summary.entities[key] = existing.id;
    return existing;
  }
  const activity = await apiRequest<ApiEntity>(
    apiUrl,
    `/collections/${collectionCase.id}/activities`,
    {
      method: "POST",
      body: JSON.stringify({
        activityType,
        activityDate: new Date().toISOString(),
        note,
        ...extras,
      }),
    },
    session,
  );
  track(summary, "created", `collection-activity:${key}`);
  summary.entities[key] = activity.id;
  void marker;
  return activity;
}

async function markCollectionPromised(apiUrl: string, session: Session, summary: ExecuteSummary, marker: string, collectionCase: ApiEntity, promisedAmount: string) {
  const current = await apiRequest<ApiEntity>(apiUrl, `/collections/${collectionCase.id}`, {}, session);
  if (current.status === "PROMISED_TO_PAY") {
    track(summary, "reused", "collection-transition:promised");
    return current;
  }
  const promised = await apiRequest<ApiEntity>(
    apiUrl,
    `/collections/${collectionCase.id}/mark-promised`,
    {
      method: "POST",
      body: JSON.stringify({
        promisedPaymentDate: isoDaysFromNow(7),
        promisedAmount,
        followUpDate: isoDaysFromNow(2),
        nextActionAt: isoDaysFromNow(2),
        summary: `${marker} promise-to-pay follow-up. Promise is note-only and not payment received.`,
      }),
    },
    session,
  );
  track(summary, "created", "collection-transition:promised");
  return promised;
}

async function apiRequest<T>(apiUrl: string, requestPath: string, options: RequestInit = {}, session?: Partial<Session>): Promise<T> {
  const response = await fetch(`${apiUrl}${requestPath}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}),
      ...(session?.organizationId ? { "x-organization-id": session.organizationId } : {}),
      ...(options.headers ?? {}),
    },
  });
  const text = await response.text();
  const payload = text ? safeJson(text) : undefined;
  if (!response.ok) {
    const message = typeof payload === "object" && payload && "message" in payload ? String((payload as { message?: unknown }).message) : response.statusText;
    throw new Error(`${options.method ?? "GET"} ${requestPath} failed with HTTP ${response.status}: ${redact(message)}`);
  }
  return payload as T;
}

function linePayload(item: ApiEntity, salesAccount: ApiEntity, taxRate: ApiEntity, description: string, quantity: string, unitPrice: string) {
  return {
    itemId: item.id,
    accountId: salesAccount.id,
    description,
    quantity,
    unitPrice,
    taxRateId: taxRate.id,
    sortOrder: 0,
  };
}

async function checkExistingSourceInvoiceLine(apiUrl: string, session: Session, marker: string, invoices: ApiEntity[], contacts: ApiEntity[]): Promise<SourceLineCheck> {
  const invoice = invoices.find((item) => textIncludes(item.notes, `${marker} tax exclusive overdue finalized sample invoice`));
  if (!invoice) {
    return { status: "pending", summary: "pending until marker source invoice exists" };
  }
  try {
    const customer = findMarkerCustomer(marker, contacts);
    const detail = await apiRequest<ApiEntity>(apiUrl, `/sales-invoices/${invoice.id}`, {}, session);
    validateSourceDocumentDetail(session, detail, "source sales invoice", customer, { blockedStatuses: ["VOIDED"] });
    firstLineId(detail, "source sales invoice");
    return { status: "ready", summary: formatSourceDetailSummary(detail) };
  } catch (error) {
    return { status: "blocked", summary: `source invoice detail line blocked: ${redact(error instanceof Error ? error.message : String(error))}` };
  }
}

async function checkExistingSourceQuoteLine(apiUrl: string, session: Session, marker: string, quotes: ApiEntity[], contacts: ApiEntity[]): Promise<SourceLineCheck> {
  const quote = quotes.find((item) => item.reference === `${marker}-QUOTE-ACCEPTED` || textIncludes(item.notes, `${marker} accepted quote source sample`));
  if (!quote) {
    return { status: "pending", summary: "pending until marker accepted quote exists" };
  }
  try {
    const customer = findMarkerCustomer(marker, contacts);
    const detail = await apiRequest<ApiEntity>(apiUrl, `/sales-quotes/${quote.id}`, {}, session);
    validateSourceDocumentDetail(session, detail, "source sales quote", customer, { requiredStatus: "ACCEPTED" });
    firstLineId(detail, "source sales quote");
    return { status: "ready", summary: formatSourceDetailSummary(detail) };
  } catch (error) {
    return { status: "blocked", summary: `source quote detail line blocked: ${redact(error instanceof Error ? error.message : String(error))}` };
  }
}

async function resolveSourceSalesInvoiceLineId(apiUrl: string, session: Session, invoice: ApiEntity, customer: ApiEntity, expectedItem: ApiEntity): Promise<string> {
  const detail = await apiRequest<ApiEntity>(apiUrl, `/sales-invoices/${invoice.id}`, {}, session);
  validateSourceDocumentDetail(session, detail, "source sales invoice", customer, { blockedStatuses: ["VOIDED"] });
  return firstLineId(detail, "source sales invoice", expectedItem);
}

async function resolveSourceSalesQuoteLineId(apiUrl: string, session: Session, quote: ApiEntity, customer: ApiEntity, expectedItem: ApiEntity): Promise<string> {
  const detail = await apiRequest<ApiEntity>(apiUrl, `/sales-quotes/${quote.id}`, {}, session);
  validateSourceDocumentDetail(session, detail, "source sales quote", customer, { requiredStatus: "ACCEPTED" });
  return firstLineId(detail, "source sales quote", expectedItem);
}

function firstLineId(entity: ApiEntity, label = "source document", expectedItem?: ApiEntity): string {
  const line = entity.lines?.[0];
  const id = line?.id;
  if (!id) {
    throw new Error(`Expected ${label} detail to include at least one line.`);
  }
  if (expectedItem?.id && line.itemId && line.itemId !== expectedItem.id) {
    throw new Error(`${label} line item does not match the planned delivery note item.`);
  }
  return id;
}

function validateSourceDocumentDetail(
  session: Session,
  document: ApiEntity,
  label: string,
  expectedCustomer: ApiEntity | undefined,
  options: { requiredStatus?: string; blockedStatuses?: string[] },
) {
  if (!document.id) {
    throw new Error(`${label} detail was not loaded.`);
  }
  if (document.organizationId && document.organizationId !== session.organizationId) {
    throw new Error(`${label} organization mismatch.`);
  }
  const customerId = getCustomerId(document);
  if (expectedCustomer?.id && customerId && customerId !== expectedCustomer.id) {
    throw new Error(`${label} customer mismatch.`);
  }
  if (options.requiredStatus && document.status !== options.requiredStatus) {
    throw new Error(`${label} must be ${options.requiredStatus}.`);
  }
  if (options.blockedStatuses?.includes(String(document.status ?? ""))) {
    throw new Error(`${label} status ${document.status} is not eligible.`);
  }
  if (!document.lines?.length) {
    throw new Error(`${label} detail has no lines.`);
  }
}

function validateDeliveryNotePayloadShape(payload: Record<string, unknown>) {
  const allowedKeys = new Set<string>(DELIVERY_NOTE_PAYLOAD_KEYS);
  const unsupportedKeys = Object.keys(payload).filter((key) => !allowedKeys.has(key));
  if (unsupportedKeys.length > 0) {
    throw new Error(`Delivery note payload includes unsupported keys: ${unsupportedKeys.join(", ")}.`);
  }
  if (!Array.isArray(payload.lines) || payload.lines.length === 0) {
    throw new Error("Delivery note payload requires at least one line.");
  }
  const allowedLineKeys = new Set<string>(DELIVERY_NOTE_LINE_PAYLOAD_KEYS);
  payload.lines.forEach((line, index) => {
    if (!line || typeof line !== "object" || Array.isArray(line)) {
      throw new Error(`Delivery note line ${index + 1} must be an object.`);
    }
    const lineRecord = line as Record<string, unknown>;
    const unsupportedLineKeys = Object.keys(lineRecord).filter((key) => !allowedLineKeys.has(key));
    if (unsupportedLineKeys.length > 0) {
      throw new Error(`Delivery note line ${index + 1} includes unsupported keys: ${unsupportedLineKeys.join(", ")}.`);
    }
    const sourceCount = ["sourceSalesInvoiceLineId", "sourceSalesQuoteLineId", "sourceSalesStockIssueLineId"].filter((key) => Boolean(lineRecord[key])).length;
    if (sourceCount > 1) {
      throw new Error(`Delivery note line ${index + 1} can reference only one source line.`);
    }
  });
}

function findMarkerCustomer(marker: string, contacts: ApiEntity[]): ApiEntity | undefined {
  return contacts.find((contact) => contact.name === `Walkthrough Customer ${marker}` || contact.displayName === `Walkthrough Customer ${marker}`);
}

function buildIdempotencyChecks(
  marker: string,
  data: {
    contacts: ApiEntity[];
    items: ApiEntity[];
    invoices: ApiEntity[];
    payments: ApiEntity[];
    creditNotes: ApiEntity[];
    refunds: ApiEntity[];
    quotes: ApiEntity[];
    recurringTemplates: ApiEntity[];
    deliveryNotes: ApiEntity[];
    collections: ApiEntity[];
  },
): IdempotencyCheck[] {
  const checks: IdempotencyCheck[] = [];
  const customer = findMarkerCustomer(marker, data.contacts);
  const serviceItem = data.items.find((item) => item.sku === `WALK-SERVICE-${marker}`);
  const productItem = data.items.find((item) => item.sku === `WALK-PRODUCT-${marker}`);
  const overdueInvoice = data.invoices.find((item) => textIncludes(item.notes, `${marker} tax exclusive overdue finalized sample invoice`));
  const taxInclusiveInvoice = data.invoices.find((item) => textIncludes(item.notes, `${marker} tax inclusive finalized sample invoice`));
  const noTaxInvoice = data.invoices.find((item) => textIncludes(item.notes, `${marker} no-tax finalized sample invoice`));
  const payment = data.payments.find((item) => textIncludes(item.description, `${marker} local walkthrough partial customer payment`));
  const creditNote = data.creditNotes.find((item) => textIncludes(item.reason, `${marker} local walkthrough credit note`));
  const refund = data.refunds.find((item) => textIncludes(item.description, `${marker} local walkthrough credit note refund`));
  const awaitingQuote = data.quotes.find((item) => item.reference === `${marker}-QUOTE-AWAITING` || textIncludes(item.notes, `${marker} sales quote awaiting acceptance sample`));
  const acceptedQuote = data.quotes.find((item) => item.reference === `${marker}-QUOTE-ACCEPTED` || textIncludes(item.notes, `${marker} accepted quote source sample`));
  const recurringTemplate = data.recurringTemplates.find((item) => item.name === `Walkthrough Recurring Template ${marker}` || item.reference === `${marker}-REC`);
  const deliveryFromInvoice = data.deliveryNotes.find((item) => item.reference === `${marker}-DN-INVOICE` || textIncludes(item.notes, `${marker} delivery note sourced from finalized invoice`));
  const deliveryFromQuote = data.deliveryNotes.find((item) => item.reference === `${marker}-DN-QUOTE` || textIncludes(item.notes, `${marker} delivery note sourced from accepted quote`));
  const openCollection = data.collections.find((item) => textIncludes(item.summary, `${marker} overdue invoice collection case sample`) || textIncludes(item.notes, `${marker} synthetic local collection note`));
  const disputedCollection = data.collections.find((item) => textIncludes(item.summary, `${marker} disputed collection case sample`) || textIncludes(item.notes, `${marker} synthetic local dispute note`));

  checks.push(markerCheck("customer", customer, "marker customer"));
  checks.push(markerCheck("service item", serviceItem, "marker service item"));
  checks.push(markerCheck("product item", productItem, "marker product item"));
  checks.push(markerCheck("tax-exclusive invoice", overdueInvoice, "marker finalized overdue invoice"));
  checks.push(markerCheck("tax-inclusive invoice", taxInclusiveInvoice, "marker finalized tax-inclusive invoice"));
  checks.push(markerCheck("no-tax invoice", noTaxInvoice, "marker finalized no-tax invoice"));
  checks.push(markerCheck("customer payment", payment, "marker partial payment"));
  checks.push(markerCheck("credit note", creditNote, "marker finalized credit note"));
  checks.push(markerCheck("customer refund", refund, "marker credit-note refund"));
  checks.push(markerCheck("awaiting quote", awaitingQuote, "marker quote awaiting acceptance"));
  checks.push(markerCheck("accepted quote", acceptedQuote, "marker accepted quote"));
  checks.push(markerCheck("recurring template", recurringTemplate, "marker recurring template"));
  checks.push(markerCheck("delivery note from invoice", deliveryFromInvoice, "marker invoice-sourced delivery note"));
  checks.push(markerCheck("delivery note from quote", deliveryFromQuote, "marker quote-sourced delivery note"));
  checks.push(markerCheck("open collection case", openCollection, "marker overdue collection case"));
  checks.push(markerCheck("disputed collection case", disputedCollection, "marker disputed collection case"));

  return checks;
}

function markerCheck(label: string, entity: ApiEntity | undefined, summary: string): IdempotencyCheck {
  if (entity) {
    return { label, status: "reuse", summary: `${summary} exists status=${safeLabel(entity.status ?? "n/a")}` };
  }
  return { label, status: "create", summary: `${summary} not found; execute would create if all gates pass` };
}

async function checkExistingCreditNoteAllocation(
  apiUrl: string,
  session: Session,
  marker: string,
  creditNotes: ApiEntity[],
  invoices: ApiEntity[],
): Promise<IdempotencyCheck> {
  const creditNote = creditNotes.find((item) => textIncludes(item.reason, `${marker} local walkthrough credit note`));
  const invoice = invoices.find((item) => textIncludes(item.notes, `${marker} no-tax finalized sample invoice`));
  if (!creditNote || !invoice) {
    return {
      label: "credit-note allocation",
      status: "pending",
      summary: "pending until marker credit note and target invoice exist",
    };
  }
  try {
    const allocations = await apiRequest<ApiEntity[]>(apiUrl, `/credit-notes/${creditNote.id}/allocations`, {}, session);
    const invoiceAllocations = allocations.filter((allocation) => allocation.invoiceId === invoice.id && !allocation.reversedAt);
    const hasEquivalentAllocation = invoiceAllocations.some((allocation) => decimalEquals(allocation.amountApplied, WALKTHROUGH_CREDIT_NOTE_APPLY_AMOUNT));
    const hasCoveringAllocation = sumAmounts(invoiceAllocations.map((allocation) => allocation.amountApplied)) >= Number(WALKTHROUGH_CREDIT_NOTE_APPLY_AMOUNT);
    if (hasEquivalentAllocation || hasCoveringAllocation) {
      return {
        label: "credit-note allocation",
        status: "reuse",
        summary: `existing non-reversed allocation covers planned amount allocationCount=${invoiceAllocations.length}`,
      };
    }
    return {
      label: "credit-note allocation",
      status: "create",
      summary: `no existing allocation covers planned amount allocationCount=${invoiceAllocations.length}`,
    };
  } catch (error) {
    return {
      label: "credit-note allocation",
      status: "blocked",
      summary: `credit-note allocation lookup failed: ${redact(error instanceof Error ? error.message : String(error))}`,
    };
  }
}

function formatSourceLineCheck(check: SourceLineCheck | undefined): string {
  if (!check) {
    return "pending summary=not-checked";
  }
  return `${check.status} summary=${check.summary}`;
}

function formatSourceDetailSummary(document: ApiEntity): string {
  const number = document.invoiceNumber ?? document.quoteNumber ?? "n/a";
  return `document=${safeLabel(number)} status=${safeLabel(document.status)} lineCount=${document.lines?.length ?? 0}`;
}

function findSalesRevenueAccount(accounts: ApiEntity[]): ApiEntity {
  const validRevenueAccounts = accounts.filter(isValidSalesRevenueAccount);
  const preferred = validRevenueAccounts.find((account) => ["411", "4100", "4010"].includes(String(account.code ?? "")));
  if (preferred) {
    return preferred;
  }
  const fallback = validRevenueAccounts[0];
  if (!fallback) {
    throw new Error("Sales revenue account must be an active posting revenue account in this organization.");
  }
  return fallback;
}

function findBankAccount(bankAccounts: ApiEntity[]): ApiEntity {
  const validBankAccounts = bankAccounts.filter((item) => isActiveBankProfile(item) && isPostingAssetAccount(item.account));
  const preferred = validBankAccounts.find((item) => ["112", "111"].includes(String(item.account?.code ?? item.code ?? "")));
  if (preferred) {
    return preferred;
  }
  const fallback = validBankAccounts.find((item) => item.type === "BANK" || item.type === "CASH") ?? validBankAccounts[0];
  if (!fallback) {
    throw new Error("Bank/cash account must be active and backed by an active posting account in this organization.");
  }
  return fallback;
}

function findPaymentPostingAccount(accounts: ApiEntity[], bankAccount?: ApiEntity): ApiEntity {
  const linkedAccountId = String(bankAccount?.accountId ?? bankAccount?.account?.id ?? "");
  const linkedAccount = accounts.find((account) => account.id === linkedAccountId) ?? bankAccount?.account;
  if (isPostingAssetAccount(linkedAccount)) {
    return linkedAccount;
  }

  const validPaymentAccounts = accounts.filter(isPostingAssetAccount);
  const preferred = validPaymentAccounts.find((item) => ["112", "111"].includes(String(item.code ?? "")));
  const fallback = preferred ?? validPaymentAccounts[0];
  if (!fallback) {
    throw new Error("Paid-through account must be an active posting asset chart account in this organization.");
  }
  return fallback;
}

function findSalesTaxRate(taxRates: ApiEntity[]): ApiEntity {
  const validSalesRates = taxRates.filter(isSalesTaxRate);
  const exact = validSalesRates.find((item) => item.name === "VAT on Sales 15%");
  if (exact) {
    return exact;
  }
  const fifteenPercent = validSalesRates.find((item) => normalizeDecimal(item.rate) === 15);
  if (fifteenPercent) {
    return fifteenPercent;
  }
  const fallback = validSalesRates[0];
  if (!fallback) {
    throw new Error("Sales tax rate must be active with SALES or BOTH scope in this organization.");
  }
  return fallback;
}

function isValidSalesRevenueAccount(account: ApiEntity): boolean {
  return account.type === "REVENUE" && account.isActive !== false && account.allowPosting !== false;
}

function isSalesTaxRate(taxRate: ApiEntity): boolean {
  const scope = String(taxRate.scope ?? "");
  return taxRate.isActive !== false && (scope === "SALES" || scope === "BOTH");
}

function isActiveBankProfile(bankAccount: ApiEntity): boolean {
  const profileStatus = String(bankAccount.status ?? "ACTIVE");
  return bankAccount.isActive !== false && profileStatus === "ACTIVE" && (bankAccount.type === "BANK" || bankAccount.type === "CASH");
}

function isPostingAssetAccount(account: ApiEntity | undefined): account is ApiEntity {
  return Boolean(account?.id && account.type === "ASSET" && account.isActive !== false && account.allowPosting !== false);
}

function normalizeDecimal(value: unknown): number {
  const parsed = Number(String(value ?? "").trim());
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function decimalEquals(left: unknown, right: unknown): boolean {
  const leftValue = normalizeDecimal(left);
  const rightValue = normalizeDecimal(right);
  return Number.isFinite(leftValue) && Number.isFinite(rightValue) && Math.abs(leftValue - rightValue) < 0.0001;
}

function sumAmounts(values: unknown[]): number {
  return values.reduce((sum, value) => {
    const amount = normalizeDecimal(value);
    return Number.isFinite(amount) ? sum + amount : sum;
  }, 0);
}

function formatTaxRate(taxRate: ApiEntity): string {
  return `${safeLabel(taxRate.name)} rate=${safeLabel(taxRate.rate)} scope=${safeLabel(taxRate.scope)} active=${taxRate.isActive !== false}`;
}

function formatAccount(account: ApiEntity): string {
  return `${safeLabel(account.code)} type=${safeLabel(account.type)} active=${account.isActive !== false} posting=${account.allowPosting !== false}`;
}

function formatBankAccount(bankAccount: ApiEntity): string {
  const account = (bankAccount.account ?? {}) as ApiEntity;
  return `${safeLabel(bankAccount.type)} profileStatus=${safeLabel(bankAccount.status ?? "ACTIVE")} linkedAccountCode=${safeLabel(account.code ?? bankAccount.code)} linkedAccountType=${safeLabel(account.type)} linkedActive=${account.isActive !== false} linkedPosting=${account.allowPosting !== false}`;
}

function safeLabel(value: unknown): string {
  return String(value ?? "n/a").replace(/\s+/g, " ").slice(0, 80);
}

function countMarkerOccurrences(value: unknown, marker: string): number {
  return (JSON.stringify(value ?? {}).match(new RegExp(escapeRegExp(marker), "g")) ?? []).length;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function findAccount(accounts: ApiEntity[], preferredCodes: string[], fallbackType: string, label: string): ApiEntity {
  return findEntity(
    accounts,
    (account) => preferredCodes.includes(String(account.code ?? "")) || (account.type === fallbackType && account.allowPosting !== false && account.isActive !== false),
    label,
  );
}

function findEntity(entities: ApiEntity[], predicate: (entity: ApiEntity) => boolean, label: string): ApiEntity {
  const entity = entities.find(predicate);
  if (!entity) {
    throw new Error(`${label} is required for local walkthrough fixture execution.`);
  }
  return entity;
}

function findRepoRoot(startDir: string): string {
  let current = path.resolve(startDir);
  while (true) {
    if (fs.existsSync(path.join(current, "pnpm-workspace.yaml"))) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      return startDir;
    }
    current = parent;
  }
}

function collectTargetValues(repoRoot: string): TargetCheck[] {
  const targets: TargetCheck[] = [];
  const envSources = [
    { label: "process.env", values: process.env as Record<string, string | undefined> },
    { label: ".env", values: parseEnvFile(path.join(repoRoot, ".env")) },
    { label: ".env.local", values: parseEnvFile(path.join(repoRoot, ".env.local")) },
    { label: "apps/api/.env", values: parseEnvFile(path.join(repoRoot, "apps", "api", ".env")) },
    { label: "apps/api/.env.local", values: parseEnvFile(path.join(repoRoot, "apps", "api", ".env.local")) },
    { label: "apps/web/.env.local", values: parseEnvFile(path.join(repoRoot, "apps", "web", ".env.local")) },
  ];

  for (const source of envSources) {
    for (const key of TARGET_KEYS) {
      const value = source.values[key];
      if (typeof value === "string" && value.trim()) {
        targets.push(classifyTarget(key, source.label, value.trim()));
      }
    }
  }

  return targets;
}

function parseEnvFile(filePath: string): Record<string, string> {
  if (!fs.existsSync(filePath)) {
    return {};
  }
  const values: Record<string, string> = {};
  const text = fs.readFileSync(filePath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const match = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(trimmed);
    if (!match) {
      continue;
    }
    values[match[1]] = unquote(match[2].trim());
  }
  return values;
}

function readEnvValue(repoRoot: string, relativePath: string, key: string): string | undefined {
  return parseEnvFile(path.join(repoRoot, relativePath))[key];
}

function unquote(value: string): string {
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  return value;
}

function classifyTarget(key: string, source: string, value: string): TargetCheck {
  if (BLOCKED_TARGET_PATTERN.test(value)) {
    return { key, source, status: "blocked", reason: "blocked environment marker" };
  }

  try {
    const parsed = new URL(value);
    const host = parsed.hostname.toLowerCase();
    if (LOCAL_HOSTS.has(host)) {
      return { key, source, status: "local", reason: "local host" };
    }
    if (host.endsWith(".local") || host.endsWith(".localhost")) {
      return { key, source, status: "local", reason: "local DNS name" };
    }
    return { key, source, status: "blocked", reason: "non-local host" };
  } catch {
    return { key, source, status: "not-a-url", reason: "not a URL value" };
  }
}

function checkTargets(targets: TargetCheck[]): TargetCheck[] {
  const seen = new Set<string>();
  return targets.filter((target) => {
    const id = `${target.key}:${target.source}:${target.status}:${target.reason}`;
    if (seen.has(id)) {
      return false;
    }
    seen.add(id);
    return true;
  });
}

function plannedRecords(marker: string): PlannedRecord[] {
  return [
    { area: "customer", fakeIdentifier: `Walkthrough Customer ${marker}`, route: "/customers/[id]", expectedPostingEffect: "none until posting documents are finalized", expectedNonEffect: "does not create AR by itself", checkpoint: "customer summary, ledger, activity, and statement review" },
    { area: "service item", fakeIdentifier: `WALK-SERVICE-${marker}`, route: "/sales/invoices/new", expectedPostingEffect: "revenue account coding when finalized invoice uses it", expectedNonEffect: "no inventory movement", checkpoint: "service revenue line coding" },
    { area: "product item", fakeIdentifier: `WALK-PRODUCT-${marker}`, route: "/sales/invoices/new", expectedPostingEffect: "sales line only if existing product item support is used", expectedNonEffect: "no automatic stock movement from invoice or delivery note", checkpoint: "product wording remains separate from stock movement" },
    { area: "tax exclusive invoice", fakeIdentifier: `INV-WALK-TAX-EXCL-${marker}`, route: "/sales/invoices/[id]", expectedPostingEffect: "AR, revenue, and tax only after invoice finalization", expectedNonEffect: "no email, payment link, or ZATCA submission", checkpoint: "tax exclusive math, balance due, and Sales Invoice label" },
    { area: "tax inclusive invoice", fakeIdentifier: `INV-WALK-TAX-INCL-${marker}`, route: "/sales/invoices/[id]", expectedPostingEffect: "AR, revenue, and tax only after invoice finalization", expectedNonEffect: "no official VAT filing", checkpoint: "tax inclusive math and tax-mode wording" },
    { area: "no-tax invoice", fakeIdentifier: `INV-WALK-NO-TAX-${marker}`, route: "/sales/invoices/[id]", expectedPostingEffect: "AR and revenue only after invoice finalization", expectedNonEffect: "no tax payable line", checkpoint: "no-tax wording and zero tax behavior" },
    { area: "customer payment", fakeIdentifier: `PAY-WALK-${marker}`, route: "/customers/[id]", expectedPostingEffect: "payment allocation through existing payment logic only", expectedNonEffect: "not created by collection cases or dashboard", checkpoint: "ledger and statement payment rows" },
    { area: "credit note", fakeIdentifier: `CN-WALK-${marker}`, route: "/customers/[id]", expectedPostingEffect: "customer balance reduction through existing credit note logic only", expectedNonEffect: "not generated by dashboard or delivery notes", checkpoint: "credit note wording and balance effect" },
    { area: "refund scenario", fakeIdentifier: `REF-WALK-${marker}`, route: "/customers/[id]", expectedPostingEffect: "refund through existing refund logic only if safe", expectedNonEffect: "no gateway refund or bank execution claim", checkpoint: "refund wording and ledger separation" },
    { area: "sales quote awaiting acceptance", fakeIdentifier: `SQ-WALK-SENT-${marker}`, route: "/sales/quotes/[id]", expectedPostingEffect: "none", expectedNonEffect: "no AR, VAT filing, email, or ZATCA", checkpoint: "Sales Quote label and awaiting action dashboard signal" },
    { area: "accepted quote converted to draft invoice", fakeIdentifier: `SQ-WALK-ACCEPTED-${marker}`, route: "/sales/quotes/[id]", expectedPostingEffect: "none until generated draft invoice is finalized", expectedNonEffect: "conversion does not post automatically", checkpoint: "converted draft invoice link" },
    { area: "recurring template", fakeIdentifier: `REC-WALK-${marker}`, route: "/sales/recurring-invoices/[id]", expectedPostingEffect: "none", expectedNonEffect: "no scheduler, email, payment, journal, VAT filing, or ZATCA", checkpoint: "manual generation wording and next-run signal" },
    { area: "generated recurring draft invoice", fakeIdentifier: `INV-WALK-REC-DRAFT-${marker}`, route: "/sales/invoices/[id]", expectedPostingEffect: "none while draft", expectedNonEffect: "not finalized automatically", checkpoint: "draft invoice generated from recurring template" },
    { area: "delivery note from invoice", fakeIdentifier: `DN-WALK-INV-${marker}`, route: "/sales/delivery-notes/[id]", expectedPostingEffect: "none", expectedNonEffect: "no AR, VAT, payment, email, ZATCA, or inventory movement by itself", checkpoint: "source invoice visibility and Delivery Note label" },
    { area: "delivery note from accepted quote", fakeIdentifier: `DN-WALK-QUOTE-${marker}`, route: "/sales/delivery-notes/[id]", expectedPostingEffect: "none", expectedNonEffect: "accepted quote source remains non-posting", checkpoint: "source accepted quote visibility" },
    { area: "collection case overdue invoice", fakeIdentifier: `COL-WALK-OPEN-${marker}`, route: "/sales/collections/[id]", expectedPostingEffect: "none", expectedNonEffect: "no payment allocation, legal automation, email, or payment link", checkpoint: "linked invoice balance and collection follow-up wording" },
    { area: "promise-to-pay activity", fakeIdentifier: `COL-ACT-PROMISE-${marker}`, route: "/sales/collections/[id]", expectedPostingEffect: "none", expectedNonEffect: "promise does not mean payment received", checkpoint: "activity timeline and promise-to-pay wording" },
    { area: "disputed collection case", fakeIdentifier: `COL-WALK-DISPUTED-${marker}`, route: "/sales/collections/[id]", expectedPostingEffect: "none", expectedNonEffect: "dispute does not imply legal action", checkpoint: "disputed dashboard signal and safe status label" },
  ];
}

function plannedRoutes(): string[] {
  return [
    "/dashboard",
    "/customers",
    "/customers/[id]",
    "/sales/invoices",
    "/sales/invoices/new",
    "/sales/invoices/[id]",
    "/sales/quotes",
    "/sales/quotes/new",
    "/sales/quotes/[id]",
    "/sales/recurring-invoices",
    "/sales/recurring-invoices/new",
    "/sales/recurring-invoices/[id]",
    "/sales/delivery-notes",
    "/sales/delivery-notes/new",
    "/sales/delivery-notes/[id]",
    "/sales/collections",
    "/sales/collections/new",
    "/sales/collections/[id]",
    "/reports/aged-receivables",
    "/reports/vat-summary",
    "/reports/vat-return",
    "/tax",
    "/documents",
  ];
}

function normalizeApiUrl(value: string): string {
  return value.replace(/\/+$/, "");
}

function isoDaysAgo(days: number): string {
  return isoDaysFromNow(-days);
}

function isoDaysFromNow(days: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
}

function textIncludes(value: unknown, needle: string): boolean {
  return typeof value === "string" && value.includes(needle);
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function redact(value: string): string {
  return value
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer [redacted]")
    .replace(/(password|token|authorization|cookie|secret|DATABASE_URL|DIRECT_URL)[^\r\n]*/gi, "[redacted]");
}

function track(summary: ExecuteSummary, bucket: "created" | "reused" | "skipped", label: string) {
  if (!summary[bucket].includes(label)) {
    summary[bucket].push(label);
  }
}

function printLines(lines: string[]) {
  for (const line of lines) {
    console.log(line);
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`sales-ar-walkthrough-fixture: ${redact(message)}`);
  process.exitCode = 1;
});
