import { Decimal } from "decimal.js";

const apiUrl = (process.env.LEDGERBYTE_API_URL ?? "http://localhost:4000").replace(/\/$/, "");
const seedEmail = process.env.LEDGERBYTE_SMOKE_EMAIL ?? "admin@example.com";
const seedPassword = process.env.LEDGERBYTE_SMOKE_PASSWORD ?? "Password123!";

interface LoginResponse {
  accessToken: string;
}

interface AuthMeResponse {
  id: string;
  email: string;
  memberships: Array<{
    id: string;
    status: string;
    organization: Organization;
    role: {
      id: string;
      name: string;
      permissions: unknown;
    };
  }>;
}

interface Organization {
  id: string;
  name: string;
}

interface Role {
  id: string;
  name: string;
  permissions: string[];
  isSystem: boolean;
  memberCount: number;
}

interface OrganizationMember {
  id: string;
  status: string;
  user: {
    id: string;
    email: string;
    name: string;
  };
  role: {
    id: string;
    name: string;
    permissions: string[];
    isSystem: boolean;
  };
}

interface Account {
  id: string;
  code: string;
  name: string;
  allowPosting: boolean;
  isActive: boolean;
}

interface FiscalPeriod {
  id: string;
  name: string;
  startsOn: string;
  endsOn: string;
  status: "OPEN" | "CLOSED" | "LOCKED";
}

interface JournalEntry {
  id: string;
  status: string;
  entryDate: string;
}

interface TaxRate {
  id: string;
  name: string;
  rate: string;
  isActive: boolean;
}

interface Contact {
  id: string;
  name: string;
  displayName?: string | null;
}

interface Item {
  id: string;
  name: string;
  sku?: string | null;
}

interface SalesInvoice {
  id: string;
  invoiceNumber: string;
  status: string;
  total: string;
  balanceDue: string;
  journalEntryId?: string | null;
  notes?: string | null;
}

interface CustomerPayment {
  id: string;
  paymentNumber: string;
  status: string;
  amountReceived: string;
  unappliedAmount: string;
  journalEntryId?: string | null;
  voidReversalJournalEntryId?: string | null;
}

interface CreditNote {
  id: string;
  creditNoteNumber: string;
  status: string;
  total: string;
  unappliedAmount: string;
  journalEntryId?: string | null;
  reversalJournalEntryId?: string | null;
}

interface PurchaseBill {
  id: string;
  billNumber: string;
  status: string;
  total: string;
  balanceDue: string;
  journalEntryId?: string | null;
  reversalJournalEntryId?: string | null;
}

interface PurchaseDebitNote {
  id: string;
  debitNoteNumber: string;
  status: string;
  total: string;
  unappliedAmount: string;
  journalEntryId?: string | null;
  reversalJournalEntryId?: string | null;
}

interface CashExpense {
  id: string;
  expenseNumber: string;
  status: string;
  total: string;
  taxTotal: string;
  contactId?: string | null;
  journalEntryId?: string | null;
  voidReversalJournalEntryId?: string | null;
}

interface PurchaseDebitNoteAllocation {
  id: string;
  debitNoteId: string;
  billId: string;
  amountApplied: string;
  reversedAt?: string | null;
  reversalReason?: string | null;
}

interface SupplierPayment {
  id: string;
  paymentNumber: string;
  status: string;
  amountPaid: string;
  unappliedAmount: string;
  journalEntryId?: string | null;
  voidReversalJournalEntryId?: string | null;
}

interface SupplierPaymentUnappliedAllocation {
  id: string;
  paymentId: string;
  billId: string;
  amountApplied: string;
  reversedAt?: string | null;
  reversalReason?: string | null;
}

interface SupplierRefund {
  id: string;
  refundNumber: string;
  status: string;
  amountRefunded: string;
  sourceType: "SUPPLIER_PAYMENT" | "PURCHASE_DEBIT_NOTE";
  sourcePaymentId?: string | null;
  sourceDebitNoteId?: string | null;
  journalEntryId?: string | null;
  voidReversalJournalEntryId?: string | null;
}

interface CreditNoteAllocation {
  id: string;
  creditNoteId: string;
  invoiceId: string;
  amountApplied: string;
  reversedAt?: string | null;
  reversalReason?: string | null;
}

interface CustomerPaymentUnappliedAllocation {
  id: string;
  paymentId: string;
  invoiceId: string;
  amountApplied: string;
  reversedAt?: string | null;
  reversalReason?: string | null;
}

interface CustomerRefund {
  id: string;
  refundNumber: string;
  status: string;
  amountRefunded: string;
  sourceType: "CUSTOMER_PAYMENT" | "CREDIT_NOTE";
  sourcePaymentId?: string | null;
  sourceCreditNoteId?: string | null;
  journalEntryId?: string | null;
  voidReversalJournalEntryId?: string | null;
}

interface LedgerRow {
  type: string;
  sourceId: string;
  debit: string;
  credit: string;
  status: string;
  balance: string;
  metadata?: Record<string, unknown>;
}

interface TrialBalanceReport {
  totals: {
    closingDebit: string;
    closingCredit: string;
    balanced: boolean;
  };
}

interface ProfitAndLossReport {
  revenue: string;
  expenses: string;
  netProfit: string;
}

interface BalanceSheetReport {
  balanced: boolean;
  totalAssets: string;
  totalLiabilitiesAndEquity: string;
}

interface VatSummaryReport {
  salesVat: string;
  purchaseVat: string;
  netVatPayable: string;
}

interface AgingReport {
  rows: unknown[];
  bucketTotals: Record<string, string>;
  grandTotal: string;
}

interface LedgerResponse {
  closingBalance: string;
  rows: LedgerRow[];
}

interface ReceiptData {
  customer?: { id: string; name: string };
  journalEntry?: { id: string; entryNumber: string } | null;
  allocations: Array<{ invoiceId: string; amountApplied: string }>;
  unappliedAllocations?: Array<{ invoiceId: string; amountApplied: string; status: string }>;
}

interface OrganizationDocumentSettings {
  footerText: string;
  primaryColor: string | null;
  accentColor: string | null;
}

interface GeneratedDocument {
  id: string;
  documentType: string;
  sourceId: string;
  filename: string;
  status: string;
}

interface ZatcaOrganizationProfile {
  id: string;
  sellerName?: string | null;
  vatNumber?: string | null;
  countryCode: string;
}

interface ZatcaAdapterConfigSummary {
  mode: string;
  realNetworkEnabled: boolean;
  effectiveRealNetworkEnabled: boolean;
}

interface ZatcaComplianceChecklistResponse {
  warning: string;
  summary: {
    total: number;
    byStatus: Record<string, number>;
    byRisk: Record<string, number>;
  };
  groups: Record<string, unknown[]>;
}

interface ZatcaReadinessSummary {
  warning: string;
  productionReady: boolean;
  blockingReasons: string[];
}

interface ZatcaXmlFieldMappingResponse {
  warning: string;
  summary: {
    total: number;
    byStatus: Record<string, number>;
    byCategory: Record<string, number>;
  };
  items: unknown[];
}

interface ZatcaEgsUnit {
  id: string;
  name: string;
  deviceSerialNumber: string;
  status: string;
  isActive: boolean;
  hasCsr: boolean;
  hasComplianceCsid: boolean;
  certificateRequestId?: string | null;
  lastIcv: number;
  lastInvoiceHash?: string | null;
}

interface ZatcaInvoiceMetadata {
  id: string;
  invoiceUuid: string;
  zatcaStatus: string;
  icv?: number | null;
  previousInvoiceHash?: string | null;
  invoiceHash?: string | null;
  qrCodeBase64?: string | null;
  xmlBase64?: string | null;
}

interface ZatcaQrResponse {
  qrCodeBase64: string;
}

interface ZatcaXmlValidationResult {
  localOnly: true;
  officialValidation: false;
  valid: boolean;
  errors: string[];
  warnings: string[];
}

interface ZatcaSdkReadinessResponse {
  referenceFolderFound: boolean;
  sdkJarFound: boolean;
  javaFound: boolean;
  canAttemptSdkValidation: boolean;
  warnings: string[];
  suggestedFixes: string[];
}

interface ZatcaSdkDryRunResponse {
  dryRun: true;
  localOnly: true;
  officialSdkValidation: false;
  commandPlan: {
    command: string | null;
    args: string[];
    warnings: string[];
  };
  warnings: string[];
}

interface ZatcaSubmissionLog {
  id: string;
  invoiceMetadataId?: string | null;
  egsUnitId?: string | null;
  responseCode?: string | null;
  submissionType: string;
  status: string;
}

class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body: unknown,
  ) {
    super(message);
  }
}

interface SmokeContext {
  token: string;
  organization: Organization;
  roleName: string;
  permissionCount: number;
}

async function main(): Promise<void> {
  const context = await loginAndSelectOrganization();
  const runId = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
  const headers = tenantHeaders(context);

  const roles = await get<Role[]>("/roles", headers);
  for (const roleName of ["Owner", "Admin", "Accountant", "Sales", "Purchases", "Viewer"]) {
    assert(roles.some((role) => role.name === roleName && role.isSystem), `default role ${roleName} exists and is system-protected`);
  }
  const ownerRole = required(roles.find((role) => role.name === "Owner"), "Owner role");
  assert(ownerRole.permissions.includes("admin.fullAccess"), "Owner role includes admin.fullAccess");
  const members = await get<OrganizationMember[]>("/organization-members", headers);
  assert(
    members.some((member) => member.user.email === seedEmail && member.role.name === "Owner" && member.status === "ACTIVE"),
    "seed user is an active Owner member",
  );
  const smokeRole = await post<Role>("/roles", headers, {
    name: `Smoke Reports Viewer ${runId}`,
    permissions: ["reports.view"],
  });
  assertEqual(smokeRole.permissions.length, 1, "smoke custom role permission count");
  assert(smokeRole.permissions.includes("reports.view"), "smoke custom role reports.view permission");
  await expectHttpError("unknown role permission", () =>
    post<Role>("/roles", headers, {
      name: `Smoke Invalid Role ${runId}`,
      permissions: ["reports.view", "unknown.permission"],
    }),
  );

  const documentSettings = await get<OrganizationDocumentSettings>("/organization-document-settings", headers);
  assertPresent(documentSettings.footerText, "document settings footer text");
  const patchedSettings = await patch<OrganizationDocumentSettings>("/organization-document-settings", headers, {
    footerText: documentSettings.footerText,
    primaryColor: documentSettings.primaryColor,
    accentColor: documentSettings.accentColor,
  });
  assertEqual(patchedSettings.footerText, documentSettings.footerText, "document settings patch footer text");

  const accounts = await get<Account[]>("/accounts", headers);
  const salesAccount = required(
    accounts.find((account) => account.code === "411" && account.allowPosting && account.isActive),
    "Sales revenue account code 411",
  );
  const expenseAccount = required(
    accounts.find((account) => account.code === "511" && account.allowPosting && account.isActive),
    "General expenses account code 511",
  );
  const paidThroughAccount =
    accounts.find((account) => account.code === "112" && account.allowPosting && account.isActive) ??
    accounts.find((account) => account.code === "111" && account.allowPosting && account.isActive);
  required(paidThroughAccount, "Bank Account code 112 or Cash code 111");

  const fiscalPeriods = await get<FiscalPeriod[]>("/fiscal-periods", headers);
  let closedSmokeYear = 1990;
  while (
    fiscalPeriods.some((period) => {
      const start = new Date(`${closedSmokeYear}-01-01T00:00:00.000Z`);
      const end = new Date(`${closedSmokeYear}-12-31T23:59:59.999Z`);
      return new Date(period.startsOn) <= end && new Date(period.endsOn) >= start;
    })
  ) {
    closedSmokeYear += 1;
  }
  assert(closedSmokeYear < 2100, "available isolated fiscal period year for smoke lock check");
  const closedFiscalPeriod = await post<FiscalPeriod>("/fiscal-periods", headers, {
    name: `Smoke Closed Period ${closedSmokeYear}`,
    startsOn: `${closedSmokeYear}-01-01`,
    endsOn: `${closedSmokeYear}-12-31`,
  });
  assertEqual(closedFiscalPeriod.status, "OPEN", "new fiscal period starts open");
  const closedFiscalPeriodAfterClose = await post<FiscalPeriod>(`/fiscal-periods/${closedFiscalPeriod.id}/close`, headers, {});
  assertEqual(closedFiscalPeriodAfterClose.status, "CLOSED", "closed fiscal period status");
  const blockedJournal = await post<JournalEntry>("/journal-entries", headers, {
    entryDate: `${closedSmokeYear}-06-15T00:00:00.000Z`,
    description: "Smoke test closed fiscal period posting guard",
    reference: `SMOKE-CLOSED-${runId}`,
    currency: "SAR",
    lines: [
      {
        accountId: paidThroughAccount!.id,
        debit: "1.0000",
        credit: "0.0000",
        description: "Closed period guard debit",
        currency: "SAR",
      },
      {
        accountId: salesAccount.id,
        debit: "0.0000",
        credit: "1.0000",
        description: "Closed period guard credit",
        currency: "SAR",
      },
    ],
  });
  await expectHttpError("manual journal post in closed fiscal period", () => post(`/journal-entries/${blockedJournal.id}/post`, headers, {}));

  const taxRates = await get<TaxRate[]>("/tax-rates", headers);
  const salesVat = taxRates.find((taxRate) => taxRate.name === "VAT on Sales 15%" && taxRate.isActive);
  const purchaseVat = taxRates.find((taxRate) => taxRate.name === "VAT on Purchases 15%" && taxRate.isActive);
  const expectedTotal = salesVat ? money("115.0000") : money("100.0000");
  const expectedPurchaseBillTotal = purchaseVat ? money("115.0000") : money("100.0000");
  const expectedCreditNoteTotal = salesVat ? money("11.5000") : money("10.0000");
  const expectedPurchaseDebitNoteTotal = purchaseVat ? money("11.5000") : money("10.0000");
  const partialPaymentAmount = money("50.0000");
  const remainingPaymentAmount = expectedTotal.minus(partialPaymentAmount);

  const customer = await post<Contact>("/contacts", headers, {
    type: "CUSTOMER",
    name: `Smoke Test Customer ${runId}`,
    displayName: `Smoke Test Customer ${runId}`,
    countryCode: "SA",
  });

  const itemPayload: Record<string, unknown> = {
    name: `Smoke Test Service ${runId}`,
    sku: `SMOKE-SERVICE-${runId}`,
    type: "SERVICE",
    sellingPrice: "100.0000",
    revenueAccountId: salesAccount.id,
  };
  if (salesVat) {
    itemPayload.salesTaxRateId = salesVat.id;
  }
  const item = await post<Item>("/items", headers, itemPayload);

  const linePayload: Record<string, unknown> = {
    itemId: item.id,
    description: "Smoke test service line",
    quantity: "1.0000",
    unitPrice: "100.0000",
  };
  if (salesVat) {
    linePayload.taxRateId = salesVat.id;
  }

  const draftInvoice = await post<SalesInvoice>("/sales-invoices", headers, {
    customerId: customer.id,
    issueDate: new Date().toISOString(),
    currency: "SAR",
    lines: [linePayload],
  });
  assertEqual(draftInvoice.status, "DRAFT", "created invoice status");

  const updatedInvoice = await patch<SalesInvoice>(`/sales-invoices/${draftInvoice.id}`, headers, {
    notes: `Smoke edited ${runId}`,
  });
  assertEqual(updatedInvoice.notes, `Smoke edited ${runId}`, "draft invoice notes update");

  const finalizedInvoice = await post<SalesInvoice>(`/sales-invoices/${draftInvoice.id}/finalize`, headers, {});
  assertEqual(finalizedInvoice.status, "FINALIZED", "finalized invoice status");
  assertPresent(finalizedInvoice.journalEntryId, "finalized invoice journalEntryId");
  assertMoney(finalizedInvoice.total, expectedTotal, "finalized invoice total");
  assertMoney(finalizedInvoice.balanceDue, expectedTotal, "finalized invoice balanceDue");

  const finalizedAgain = await post<SalesInvoice>(`/sales-invoices/${draftInvoice.id}/finalize`, headers, {});
  assertEqual(finalizedAgain.id, finalizedInvoice.id, "double finalize invoice id");
  assertEqual(finalizedAgain.journalEntryId, finalizedInvoice.journalEntryId, "double finalize journalEntryId");

  const zatcaProfile = await get<ZatcaOrganizationProfile>("/zatca/profile", headers);
  assertPresent(zatcaProfile.id, "ZATCA profile id");
  const patchedZatcaProfile = await patch<ZatcaOrganizationProfile>("/zatca/profile", headers, {
    sellerName: "LedgerByte Smoke Seller",
    vatNumber: "300000000000003",
    countryCode: "SA",
    city: "Riyadh",
    businessCategory: "Smoke testing",
    environment: "SANDBOX",
  });
  assertEqual(patchedZatcaProfile.vatNumber, "300000000000003", "ZATCA profile VAT number");
  const zatcaAdapterConfig = await get<ZatcaAdapterConfigSummary>("/zatca/adapter-config", headers);
  assertEqual(zatcaAdapterConfig.mode, "mock", "ZATCA adapter default mode");
  assertEqual(zatcaAdapterConfig.realNetworkEnabled, false, "ZATCA real network disabled flag");
  assertEqual(zatcaAdapterConfig.effectiveRealNetworkEnabled, false, "ZATCA effective real network disabled flag");
  const zatcaChecklist = await get<ZatcaComplianceChecklistResponse>("/zatca/compliance-checklist", headers);
  assert(zatcaChecklist.warning.includes("not legal certification"), "ZATCA checklist warning is present");
  assert(zatcaChecklist.summary.total > 0, "ZATCA checklist has items");
  assert((zatcaChecklist.groups.API?.length ?? 0) > 0, "ZATCA checklist groups API items");
  assert((zatcaChecklist.groups.PDF_A3?.length ?? 0) > 0, "ZATCA checklist groups PDF/A-3 items");
  const zatcaXmlFieldMapping = await get<ZatcaXmlFieldMappingResponse>("/zatca/xml-field-mapping", headers);
  assert(zatcaXmlFieldMapping.warning.includes("not official ZATCA validation"), "ZATCA XML field mapping warning is present");
  assert(zatcaXmlFieldMapping.summary.total > 0, "ZATCA XML field mapping has items");
  assert(zatcaXmlFieldMapping.items.length === zatcaXmlFieldMapping.summary.total, "ZATCA XML field mapping item count matches summary");
  const zatcaReadiness = await get<ZatcaReadinessSummary>("/zatca/readiness", headers);
  assert(zatcaReadiness.warning.includes("not legal certification"), "ZATCA readiness warning is present");
  assertEqual(zatcaReadiness.productionReady, false, "ZATCA readiness productionReady");
  assert(zatcaReadiness.blockingReasons.length > 0, "ZATCA readiness returns blocking reasons");
  assertNoPrivateKey(zatcaReadiness, "ZATCA readiness response");

  const smokeEgsSerial = "LEDGERBYTE-SMOKE-EGS";
  const existingEgsUnits = await get<ZatcaEgsUnit[]>("/zatca/egs-units", headers);
  assertNoPrivateKey(existingEgsUnits, "ZATCA EGS list response");
  let smokeEgs =
    existingEgsUnits.find((unit) => unit.deviceSerialNumber === smokeEgsSerial) ??
    (await post<ZatcaEgsUnit>("/zatca/egs-units", headers, {
      name: "LedgerByte Smoke Dev EGS",
      deviceSerialNumber: smokeEgsSerial,
      environment: "SANDBOX",
      solutionName: "LedgerByte",
    }));
  assertNoPrivateKey(smokeEgs, "ZATCA EGS create/detail response");
  smokeEgs = await post<ZatcaEgsUnit>(`/zatca/egs-units/${smokeEgs.id}/generate-csr`, headers, {});
  assertNoPrivateKey(smokeEgs, "ZATCA EGS CSR generation response");
  assertEqual(smokeEgs.hasCsr, true, "ZATCA smoke EGS CSR flag");
  const csrResponse = await get<{ csrPem: string }>(`/zatca/egs-units/${smokeEgs.id}/csr`, headers);
  assert(csrResponse.csrPem.includes("BEGIN CERTIFICATE REQUEST"), "ZATCA CSR endpoint returns CSR PEM");
  assert(!csrResponse.csrPem.includes("PRIVATE KEY"), "ZATCA CSR endpoint does not return private key material");
  await assertText(`/zatca/egs-units/${smokeEgs.id}/csr/download`, headers, "EGS CSR download", "BEGIN CERTIFICATE REQUEST");
  smokeEgs = await post<ZatcaEgsUnit>(`/zatca/egs-units/${smokeEgs.id}/request-compliance-csid`, headers, { otp: "000000", mode: "mock" });
  assertNoPrivateKey(smokeEgs, "ZATCA compliance CSID response");
  assertEqual(smokeEgs.hasComplianceCsid, true, "ZATCA smoke EGS compliance CSID flag");
  assertPresent(smokeEgs.certificateRequestId, "ZATCA smoke EGS certificate request id");
  if (!smokeEgs.isActive) {
    smokeEgs = await post<ZatcaEgsUnit>(`/zatca/egs-units/${smokeEgs.id}/activate-dev`, headers, {});
  }
  assertNoPrivateKey(smokeEgs, "ZATCA EGS activation response");
  assert(smokeEgs.isActive || smokeEgs.status === "ACTIVE" || smokeEgs.status === "CERTIFICATE_ISSUED", "ZATCA smoke EGS active or certificate state");
  const zatcaSubmissions = await get<ZatcaSubmissionLog[]>("/zatca/submissions", headers);
  assert(
    zatcaSubmissions.some((log) => log.egsUnitId === smokeEgs.id && log.responseCode === "LOCAL_MOCK" && log.status === "SUCCESS"),
    "ZATCA submissions include local mock onboarding log",
  );

  const zatcaMetadata = await post<ZatcaInvoiceMetadata>(`/sales-invoices/${draftInvoice.id}/zatca/generate`, headers, {});
  assertPresent(zatcaMetadata.invoiceUuid, "ZATCA invoice UUID");
  assertPresent(zatcaMetadata.invoiceHash, "ZATCA invoice hash");
  assertPresent(zatcaMetadata.xmlBase64, "ZATCA XML base64");
  assertPresent(zatcaMetadata.qrCodeBase64, "ZATCA QR base64");
  assertPresent(zatcaMetadata.icv, "ZATCA ICV");
  assertEqual(zatcaMetadata.zatcaStatus, "XML_GENERATED", "ZATCA metadata status");
  const egsAfterFirstZatcaGenerate = await get<ZatcaEgsUnit>(`/zatca/egs-units/${smokeEgs.id}`, headers);
  const repeatedZatcaMetadata = await post<ZatcaInvoiceMetadata>(`/sales-invoices/${draftInvoice.id}/zatca/generate`, headers, {});
  assertEqual(repeatedZatcaMetadata.id, zatcaMetadata.id, "repeated ZATCA generate metadata id");
  assertEqual(repeatedZatcaMetadata.icv, zatcaMetadata.icv, "repeated ZATCA generate ICV");
  assertEqual(repeatedZatcaMetadata.previousInvoiceHash, zatcaMetadata.previousInvoiceHash, "repeated ZATCA generate previous hash");
  assertEqual(repeatedZatcaMetadata.invoiceHash, zatcaMetadata.invoiceHash, "repeated ZATCA generate invoice hash");
  const egsAfterRepeatedZatcaGenerate = await get<ZatcaEgsUnit>(`/zatca/egs-units/${smokeEgs.id}`, headers);
  assertEqual(egsAfterRepeatedZatcaGenerate.lastIcv, egsAfterFirstZatcaGenerate.lastIcv, "repeated ZATCA generate does not change EGS ICV");
  assertEqual(
    egsAfterRepeatedZatcaGenerate.lastInvoiceHash,
    egsAfterFirstZatcaGenerate.lastInvoiceHash,
    "repeated ZATCA generate does not change EGS previous hash",
  );
  await assertXml(`/sales-invoices/${draftInvoice.id}/zatca/xml`, headers, "invoice ZATCA XML", finalizedInvoice.invoiceNumber);
  const zatcaXmlValidation = await get<ZatcaXmlValidationResult>(`/sales-invoices/${draftInvoice.id}/zatca/xml-validation`, headers);
  assertEqual(zatcaXmlValidation.localOnly, true, "ZATCA XML validation localOnly");
  assertEqual(zatcaXmlValidation.officialValidation, false, "ZATCA XML validation officialValidation");
  assertEqual(zatcaXmlValidation.valid, true, "ZATCA XML validation valid");
  assertNoPrivateKey(zatcaXmlValidation, "ZATCA XML validation response");
  const zatcaSdkReadiness = await get<ZatcaSdkReadinessResponse>("/zatca-sdk/readiness", headers);
  assert(typeof zatcaSdkReadiness.referenceFolderFound === "boolean", "ZATCA SDK readiness returns reference folder flag");
  assert(typeof zatcaSdkReadiness.sdkJarFound === "boolean", "ZATCA SDK readiness returns SDK JAR flag");
  assert(typeof zatcaSdkReadiness.javaFound === "boolean", "ZATCA SDK readiness returns Java flag");
  assertNoPrivateKey(zatcaSdkReadiness, "ZATCA SDK readiness response");
  const zatcaSdkDryRun = await post<ZatcaSdkDryRunResponse>("/zatca-sdk/validate-xml-dry-run", headers, { invoiceId: draftInvoice.id, mode: "dry-run" });
  assertEqual(zatcaSdkDryRun.dryRun, true, "ZATCA SDK dry-run flag");
  assertEqual(zatcaSdkDryRun.localOnly, true, "ZATCA SDK dry-run localOnly");
  assertEqual(zatcaSdkDryRun.officialSdkValidation, false, "ZATCA SDK dry-run does not execute SDK");
  assert(
    Boolean(zatcaSdkDryRun.commandPlan.command) || zatcaSdkDryRun.warnings.length > 0 || zatcaSdkDryRun.commandPlan.warnings.length > 0,
    "ZATCA SDK dry-run returns command plan or safe warnings",
  );
  assertNoPrivateKey(zatcaSdkDryRun, "ZATCA SDK dry-run response");
  const zatcaQr = await get<ZatcaQrResponse>(`/sales-invoices/${draftInvoice.id}/zatca/qr`, headers);
  assertPresent(zatcaQr.qrCodeBase64, "ZATCA QR endpoint payload");
  const checkedZatcaMetadata = await post<ZatcaInvoiceMetadata>(`/sales-invoices/${draftInvoice.id}/zatca/compliance-check`, headers, {});
  assertEqual(checkedZatcaMetadata.zatcaStatus, "READY_FOR_SUBMISSION", "ZATCA mock compliance-check status");
  const invoiceZatcaSubmissions = await get<ZatcaSubmissionLog[]>("/zatca/submissions", headers);
  assert(
    invoiceZatcaSubmissions.some(
      (log) => log.invoiceMetadataId === zatcaMetadata.id && log.responseCode === "LOCAL_MOCK_COMPLIANCE_CHECK" && log.status === "SUCCESS",
    ),
    "ZATCA submissions include local mock invoice compliance-check log",
  );
  await expectHttpError("mock clearance safe block", () => post<ZatcaInvoiceMetadata>(`/sales-invoices/${draftInvoice.id}/zatca/clearance`, headers, {}));
  await expectHttpError("mock reporting safe block", () => post<ZatcaInvoiceMetadata>(`/sales-invoices/${draftInvoice.id}/zatca/reporting`, headers, {}));
  const blockedZatcaSubmissions = await get<ZatcaSubmissionLog[]>("/zatca/submissions", headers);
  assert(
    blockedZatcaSubmissions.some((log) => log.invoiceMetadataId === zatcaMetadata.id && log.submissionType === "CLEARANCE" && log.status === "FAILED"),
    "ZATCA submissions include safe blocked clearance log",
  );
  assert(
    blockedZatcaSubmissions.some((log) => log.invoiceMetadataId === zatcaMetadata.id && log.submissionType === "REPORTING" && log.status === "FAILED"),
    "ZATCA submissions include safe blocked reporting log",
  );

  await expectHttpError("over-allocation payment", () =>
    post<CustomerPayment>("/customer-payments", headers, {
      customerId: customer.id,
      paymentDate: new Date().toISOString(),
      currency: "SAR",
      amountReceived: expectedTotal.plus(1).toFixed(4),
      accountId: paidThroughAccount!.id,
      allocations: [{ invoiceId: draftInvoice.id, amountApplied: expectedTotal.plus(1).toFixed(4) }],
    }),
  );

  const partialPayment = await post<CustomerPayment>("/customer-payments", headers, {
    customerId: customer.id,
    paymentDate: new Date().toISOString(),
    currency: "SAR",
    amountReceived: partialPaymentAmount.toFixed(4),
    accountId: paidThroughAccount!.id,
    description: "Smoke test partial payment",
    allocations: [{ invoiceId: draftInvoice.id, amountApplied: partialPaymentAmount.toFixed(4) }],
  });
  assertEqual(partialPayment.status, "POSTED", "partial payment status");

  const afterPartialPayment = await get<SalesInvoice>(`/sales-invoices/${draftInvoice.id}`, headers);
  assertMoney(afterPartialPayment.balanceDue, remainingPaymentAmount, "invoice balance after partial payment");

  const remainingPayment = await post<CustomerPayment>("/customer-payments", headers, {
    customerId: customer.id,
    paymentDate: new Date().toISOString(),
    currency: "SAR",
    amountReceived: remainingPaymentAmount.toFixed(4),
    accountId: paidThroughAccount!.id,
    description: "Smoke test remaining payment",
    allocations: [{ invoiceId: draftInvoice.id, amountApplied: remainingPaymentAmount.toFixed(4) }],
  });
  assertEqual(remainingPayment.status, "POSTED", "remaining payment status");

  const afterFullPayment = await get<SalesInvoice>(`/sales-invoices/${draftInvoice.id}`, headers);
  assertMoney(afterFullPayment.balanceDue, money(0), "invoice balance after remaining payment");

  const ledgerBeforeVoid = await get<LedgerResponse>(`/contacts/${customer.id}/ledger`, headers);
  assert(
    ledgerBeforeVoid.rows.some((row) => row.type === "INVOICE" && row.sourceId === draftInvoice.id && money(row.debit).eq(expectedTotal)),
    "ledger includes invoice debit",
  );
  assert(
    ledgerBeforeVoid.rows.some((row) => row.type === "PAYMENT" && row.sourceId === partialPayment.id && money(row.credit).eq(partialPaymentAmount)),
    "ledger includes partial payment credit",
  );
  assert(
    ledgerBeforeVoid.rows.some((row) => row.type === "PAYMENT" && row.sourceId === remainingPayment.id && money(row.credit).eq(remainingPaymentAmount)),
    "ledger includes remaining payment credit",
  );
  assertMoney(ledgerBeforeVoid.closingBalance, money(0), "ledger closing balance before void");

  const { from, to } = statementRange();
  const statement = await get<LedgerResponse>(`/contacts/${customer.id}/statement?from=${from}&to=${to}`, headers);
  assert(statement.rows.length > 0, "statement returns rows");
  assertMoney(statement.closingBalance, money(0), "statement closing balance before void");

  const receipt = await get<ReceiptData>(`/customer-payments/${partialPayment.id}/receipt-data`, headers);
  assertEqual(receipt.customer?.id, customer.id, "receipt customer id");
  assertPresent(receipt.journalEntry?.id, "receipt journal entry id");
  assert(receipt.allocations.some((allocation) => allocation.invoiceId === draftInvoice.id), "receipt includes invoice allocation");

  const invoicePdfData = await get<{ invoice: { total: string; balanceDue: string }; lines: unknown[] }>(
    `/sales-invoices/${draftInvoice.id}/pdf-data`,
    headers,
  );
  assertMoney(invoicePdfData.invoice.total, expectedTotal, "invoice pdf-data total");
  assert(invoicePdfData.lines.length > 0, "invoice pdf-data returns lines");
  await assertPdf(`/sales-invoices/${draftInvoice.id}/pdf`, headers, "invoice PDF");
  const invoiceDocuments = await get<GeneratedDocument[]>(
    `/generated-documents?documentType=SALES_INVOICE&sourceId=${encodeURIComponent(draftInvoice.id)}`,
    headers,
  );
  const archivedInvoicePdf = required(
    invoiceDocuments.find((document) => document.sourceId === draftInvoice.id && document.status === "GENERATED"),
    "archived invoice PDF document",
  );
  await assertPdf(`/generated-documents/${archivedInvoicePdf.id}/download`, headers, "archived invoice PDF");

  const receiptPdfData = await get<{ payment: { paymentNumber: string }; allocations: unknown[] }>(
    `/customer-payments/${partialPayment.id}/receipt-pdf-data`,
    headers,
  );
  assertEqual(receiptPdfData.payment.paymentNumber, partialPayment.paymentNumber, "receipt pdf-data payment number");
  assert(receiptPdfData.allocations.length > 0, "receipt pdf-data returns allocations");
  await assertPdf(`/customer-payments/${partialPayment.id}/receipt.pdf`, headers, "receipt PDF");

  const statementPdfData = await get<{ closingBalance: string; rows: unknown[] }>(
    `/contacts/${customer.id}/statement-pdf-data?from=${from}&to=${to}`,
    headers,
  );
  assertMoney(statementPdfData.closingBalance, money(0), "statement pdf-data closing balance before void");
  assert(statementPdfData.rows.length > 0, "statement pdf-data returns rows");
  await assertPdf(`/contacts/${customer.id}/statement.pdf?from=${from}&to=${to}`, headers, "statement PDF");

  const refundCustomer = await post<Contact>("/contacts", headers, {
    type: "CUSTOMER",
    name: `Smoke Refund Customer ${runId}`,
    displayName: `Smoke Refund Customer ${runId}`,
    countryCode: "SA",
  });
  const refundDraftInvoice = await post<SalesInvoice>("/sales-invoices", headers, {
    customerId: refundCustomer.id,
    issueDate: new Date().toISOString(),
    currency: "SAR",
    lines: [linePayload],
  });
  const refundInvoice = await post<SalesInvoice>(`/sales-invoices/${refundDraftInvoice.id}/finalize`, headers, {});
  const overpaymentAmount = expectedTotal.plus(20);
  const refundSourcePayment = await post<CustomerPayment>("/customer-payments", headers, {
    customerId: refundCustomer.id,
    paymentDate: new Date().toISOString(),
    currency: "SAR",
    amountReceived: overpaymentAmount.toFixed(4),
    accountId: paidThroughAccount!.id,
    description: "Smoke test overpayment for refund",
    allocations: [{ invoiceId: refundInvoice.id, amountApplied: expectedTotal.toFixed(4) }],
  });
  assertEqual(refundSourcePayment.status, "POSTED", "refund source payment status");
  assertMoney(refundSourcePayment.unappliedAmount, money("20.0000"), "refund source payment opening unapplied amount");
  const paymentRefundAmount = money("7.0000");
  const paymentRefund = await post<CustomerRefund>("/customer-refunds", headers, {
    customerId: refundCustomer.id,
    sourceType: "CUSTOMER_PAYMENT",
    sourcePaymentId: refundSourcePayment.id,
    refundDate: new Date().toISOString(),
    currency: "SAR",
    amountRefunded: paymentRefundAmount.toFixed(4),
    accountId: paidThroughAccount!.id,
    description: "Smoke test payment refund",
  });
  assertEqual(paymentRefund.status, "POSTED", "payment refund status");
  assertPresent(paymentRefund.journalEntryId, "payment refund journal entry id");
  const afterPaymentRefund = await get<CustomerPayment>(`/customer-payments/${refundSourcePayment.id}`, headers);
  assertMoney(afterPaymentRefund.unappliedAmount, money("13.0000"), "payment unapplied amount after refund");
  const refundCustomerLedger = await get<LedgerResponse>(`/contacts/${refundCustomer.id}/ledger`, headers);
  assert(
    refundCustomerLedger.rows.some(
      (row) => row.type === "CUSTOMER_REFUND" && row.sourceId === paymentRefund.id && money(row.debit).eq(paymentRefundAmount),
    ),
    "ledger includes customer refund row for payment refund",
  );
  assertMoney(refundCustomerLedger.closingBalance, money("-13.0000"), "refund customer ledger after payment refund");
  await assertPdf(`/customer-refunds/${paymentRefund.id}/pdf`, headers, "customer refund PDF");
  const voidedPaymentRefund = await post<CustomerRefund>(`/customer-refunds/${paymentRefund.id}/void`, headers, {});
  assertEqual(voidedPaymentRefund.status, "VOIDED", "voided payment refund status");
  assertPresent(voidedPaymentRefund.voidReversalJournalEntryId, "voided payment refund reversal journal");
  const afterPaymentRefundVoid = await get<CustomerPayment>(`/customer-payments/${refundSourcePayment.id}`, headers);
  assertMoney(afterPaymentRefundVoid.unappliedAmount, money("20.0000"), "payment unapplied amount after refund void");
  const refundCustomerLedgerAfterVoid = await get<LedgerResponse>(`/contacts/${refundCustomer.id}/ledger`, headers);
  assert(
    refundCustomerLedgerAfterVoid.rows.some(
      (row) => row.type === "VOID_CUSTOMER_REFUND" && row.sourceId === paymentRefund.id && money(row.credit).eq(paymentRefundAmount),
    ),
    "ledger includes void customer refund row for payment refund",
  );
  assertMoney(refundCustomerLedgerAfterVoid.closingBalance, money("-20.0000"), "refund customer ledger after payment refund void");

  const paymentUnappliedDraftInvoice = await post<SalesInvoice>("/sales-invoices", headers, {
    customerId: refundCustomer.id,
    issueDate: new Date().toISOString(),
    currency: "SAR",
    lines: [linePayload],
  });
  const paymentUnappliedInvoice = await post<SalesInvoice>(
    `/sales-invoices/${paymentUnappliedDraftInvoice.id}/finalize`,
    headers,
    {},
  );
  assertMoney(paymentUnappliedInvoice.balanceDue, expectedTotal, "payment unapplied application invoice opening balance");

  const paymentUnappliedApplyAmount = money("8.0000");
  const paymentBeforeUnappliedApply = await get<CustomerPayment>(`/customer-payments/${refundSourcePayment.id}`, headers);
  const appliedUnappliedPayment = await post<CustomerPayment>(`/customer-payments/${refundSourcePayment.id}/apply-unapplied`, headers, {
    invoiceId: paymentUnappliedInvoice.id,
    amountApplied: paymentUnappliedApplyAmount.toFixed(4),
  });
  assertEqual(
    appliedUnappliedPayment.journalEntryId,
    paymentBeforeUnappliedApply.journalEntryId,
    "unapplied payment application reuses original payment journal only",
  );
  assertMoney(appliedUnappliedPayment.unappliedAmount, money("20.0000").minus(paymentUnappliedApplyAmount), "payment unapplied amount after invoice application");
  const paymentUnappliedInvoiceAfterApply = await get<SalesInvoice>(`/sales-invoices/${paymentUnappliedInvoice.id}`, headers);
  assertMoney(paymentUnappliedInvoiceAfterApply.balanceDue, expectedTotal.minus(paymentUnappliedApplyAmount), "invoice balance after unapplied payment application");
  const paymentUnappliedAllocations = await get<CustomerPaymentUnappliedAllocation[]>(
    `/customer-payments/${refundSourcePayment.id}/unapplied-allocations`,
    headers,
  );
  const paymentUnappliedAllocation = required(
    paymentUnappliedAllocations.find(
      (allocation) => allocation.invoiceId === paymentUnappliedInvoice.id && money(allocation.amountApplied).eq(paymentUnappliedApplyAmount),
    ),
    "payment unapplied allocation for smoke application",
  );
  const invoicePaymentUnappliedAllocations = await get<CustomerPaymentUnappliedAllocation[]>(
    `/sales-invoices/${paymentUnappliedInvoice.id}/customer-payment-unapplied-allocations`,
    headers,
  );
  assert(
    invoicePaymentUnappliedAllocations.some((allocation) => allocation.id === paymentUnappliedAllocation.id),
    "invoice exposes unapplied payment allocation",
  );
  const receiptAfterPaymentUnappliedApply = await get<ReceiptData>(`/customer-payments/${refundSourcePayment.id}/receipt-data`, headers);
  assert(
    Boolean(receiptAfterPaymentUnappliedApply.unappliedAllocations?.some(
      (allocation) => allocation.invoiceId === paymentUnappliedInvoice.id && money(allocation.amountApplied).eq(paymentUnappliedApplyAmount),
    )),
    "receipt-data includes unapplied payment allocation",
  );
  const ledgerAfterPaymentUnappliedApply = await get<LedgerResponse>(`/contacts/${refundCustomer.id}/ledger`, headers);
  const paymentUnappliedAllocationRow = required(
    ledgerAfterPaymentUnappliedApply.rows.find(
      (row) =>
        row.type === "CUSTOMER_PAYMENT_UNAPPLIED_ALLOCATION" &&
        row.sourceId === paymentUnappliedAllocation.id &&
        money(row.debit).eq(0) &&
        money(row.credit).eq(0),
    ),
    "ledger row for unapplied payment allocation",
  );
  assertMoney(paymentUnappliedAllocationRow.balance, expectedTotal.minus(money("20.0000")), "unapplied payment allocation row keeps running balance unchanged");
  assertMoney(
    ledgerAfterPaymentUnappliedApply.closingBalance,
    expectedTotal.minus(money("20.0000")),
    "refund customer ledger after unapplied payment application",
  );

  await expectHttpError("refund above current payment unapplied amount", () =>
    post<CustomerRefund>("/customer-refunds", headers, {
      customerId: refundCustomer.id,
      sourceType: "CUSTOMER_PAYMENT",
      sourcePaymentId: refundSourcePayment.id,
      refundDate: new Date().toISOString(),
      currency: "SAR",
      amountRefunded: "13.0000",
      accountId: paidThroughAccount!.id,
      description: "Smoke test refund above current unapplied amount",
    }),
  );
  await expectHttpError("void payment with active unapplied allocation", () =>
    post<CustomerPayment>(`/customer-payments/${refundSourcePayment.id}/void`, headers, {}),
  );
  await expectHttpError("void invoice with active unapplied payment allocation", () =>
    post<SalesInvoice>(`/sales-invoices/${paymentUnappliedInvoice.id}/void`, headers, {}),
  );

  const reversedUnappliedPayment = await post<CustomerPayment>(
    `/customer-payments/${refundSourcePayment.id}/unapplied-allocations/${paymentUnappliedAllocation.id}/reverse`,
    headers,
    { reason: "Smoke test unapplied payment allocation reversal" },
  );
  assertMoney(reversedUnappliedPayment.unappliedAmount, money("20.0000"), "payment unapplied amount after allocation reversal");
  const paymentUnappliedInvoiceAfterReverse = await get<SalesInvoice>(`/sales-invoices/${paymentUnappliedInvoice.id}`, headers);
  assertMoney(paymentUnappliedInvoiceAfterReverse.balanceDue, expectedTotal, "invoice balance after unapplied payment allocation reversal");
  const reversedPaymentUnappliedAllocations = await get<CustomerPaymentUnappliedAllocation[]>(
    `/customer-payments/${refundSourcePayment.id}/unapplied-allocations`,
    headers,
  );
  assert(
    reversedPaymentUnappliedAllocations.some(
      (allocation) =>
        allocation.id === paymentUnappliedAllocation.id &&
        Boolean(allocation.reversedAt) &&
        allocation.reversalReason === "Smoke test unapplied payment allocation reversal",
    ),
    "payment unapplied allocations include reversal metadata",
  );
  const ledgerAfterPaymentUnappliedReverse = await get<LedgerResponse>(`/contacts/${refundCustomer.id}/ledger`, headers);
  assert(
    ledgerAfterPaymentUnappliedReverse.rows.some(
      (row) =>
        row.type === "CUSTOMER_PAYMENT_UNAPPLIED_ALLOCATION_REVERSAL" &&
        row.sourceId === paymentUnappliedAllocation.id &&
        money(row.debit).eq(0) &&
        money(row.credit).eq(0),
    ),
    "ledger includes neutral unapplied payment allocation reversal row",
  );
  assertMoney(
    ledgerAfterPaymentUnappliedReverse.closingBalance,
    expectedTotal.minus(money("20.0000")),
    "refund customer ledger after unapplied payment allocation reversal",
  );

  const creditApplicationDraftInvoice = await post<SalesInvoice>("/sales-invoices", headers, {
    customerId: customer.id,
    issueDate: new Date().toISOString(),
    currency: "SAR",
    lines: [linePayload],
  });
  const creditApplicationInvoice = await post<SalesInvoice>(`/sales-invoices/${creditApplicationDraftInvoice.id}/finalize`, headers, {});
  assertEqual(creditApplicationInvoice.status, "FINALIZED", "credit application invoice status");
  assertMoney(creditApplicationInvoice.balanceDue, expectedTotal, "credit application invoice opening balance");

  const creditNoteLinePayload: Record<string, unknown> = {
    description: "Smoke test credit adjustment",
    accountId: salesAccount.id,
    quantity: "1.0000",
    unitPrice: "10.0000",
  };
  if (salesVat) {
    creditNoteLinePayload.taxRateId = salesVat.id;
  }
  const draftCreditNote = await post<CreditNote>("/credit-notes", headers, {
    customerId: customer.id,
    originalInvoiceId: creditApplicationInvoice.id,
    issueDate: new Date().toISOString(),
    currency: "SAR",
    reason: "Smoke test credit note",
    lines: [creditNoteLinePayload],
  });
  assertEqual(draftCreditNote.status, "DRAFT", "created credit note status");
  assertMoney(draftCreditNote.total, expectedCreditNoteTotal, "draft credit note total");
  assertMoney(draftCreditNote.unappliedAmount, expectedCreditNoteTotal, "draft credit note unapplied amount");

  const finalizedCreditNote = await post<CreditNote>(`/credit-notes/${draftCreditNote.id}/finalize`, headers, {});
  assertEqual(finalizedCreditNote.status, "FINALIZED", "finalized credit note status");
  assertPresent(finalizedCreditNote.journalEntryId, "finalized credit note journalEntryId");
  assertMoney(finalizedCreditNote.total, expectedCreditNoteTotal, "finalized credit note total");

  const finalizedCreditNoteAgain = await post<CreditNote>(`/credit-notes/${draftCreditNote.id}/finalize`, headers, {});
  assertEqual(finalizedCreditNoteAgain.journalEntryId, finalizedCreditNote.journalEntryId, "double finalize credit note journalEntryId");

  const invoiceCreditNotes = await get<CreditNote[]>(`/sales-invoices/${creditApplicationInvoice.id}/credit-notes`, headers);
  assert(
    invoiceCreditNotes.some((creditNote) => creditNote.id === draftCreditNote.id && creditNote.status === "FINALIZED"),
    "invoice linked credit notes include finalized smoke credit note",
  );

  const ledgerAfterCreditNote = await get<LedgerResponse>(`/contacts/${customer.id}/ledger`, headers);
  assert(
    ledgerAfterCreditNote.rows.some((row) => row.type === "CREDIT_NOTE" && row.sourceId === draftCreditNote.id && money(row.credit).eq(expectedCreditNoteTotal)),
    "ledger includes finalized credit note credit",
  );
  const expectedLedgerAfterCreditNote = expectedTotal.minus(expectedCreditNoteTotal);
  assertMoney(ledgerAfterCreditNote.closingBalance, expectedLedgerAfterCreditNote, "ledger closing balance after credit note");

  const creditApplyAmount = money("5.0000");
  const appliedCreditNote = await post<CreditNote>(`/credit-notes/${draftCreditNote.id}/apply`, headers, {
    invoiceId: creditApplicationInvoice.id,
    amountApplied: creditApplyAmount.toFixed(4),
  });
  assertMoney(appliedCreditNote.unappliedAmount, expectedCreditNoteTotal.minus(creditApplyAmount), "credit note unapplied amount after partial application");
  const afterCreditApplyInvoice = await get<SalesInvoice>(`/sales-invoices/${creditApplicationInvoice.id}`, headers);
  assertMoney(afterCreditApplyInvoice.balanceDue, expectedTotal.minus(creditApplyAmount), "invoice balance after credit note application");
  const creditNoteAllocations = await get<CreditNoteAllocation[]>(`/credit-notes/${draftCreditNote.id}/allocations`, headers);
  const creditNoteAllocation = required(
    creditNoteAllocations.find((allocation) => allocation.invoiceId === creditApplicationInvoice.id && money(allocation.amountApplied).eq(creditApplyAmount)),
    "credit note allocation for smoke application",
  );
  assert(
    !creditNoteAllocation.reversedAt,
    "credit note allocations include partial application",
  );
  const invoiceCreditAllocations = await get<CreditNoteAllocation[]>(`/sales-invoices/${creditApplicationInvoice.id}/credit-note-allocations`, headers);
  assert(
    invoiceCreditAllocations.some((allocation) => allocation.creditNoteId === draftCreditNote.id && money(allocation.amountApplied).eq(creditApplyAmount)),
    "invoice credit note allocations include partial application",
  );
  const ledgerAfterCreditApply = await get<LedgerResponse>(`/contacts/${customer.id}/ledger`, headers);
  assert(
    ledgerAfterCreditApply.rows.some(
      (row) => row.type === "CREDIT_NOTE_ALLOCATION" && row.sourceId === creditNoteAllocations[0]?.id && money(row.debit).eq(0) && money(row.credit).eq(0),
    ),
    "ledger includes neutral credit note allocation row",
  );
  assertMoney(ledgerAfterCreditApply.closingBalance, expectedLedgerAfterCreditNote, "ledger closing balance after credit allocation is not double counted");

  await expectHttpError("over-apply credit note", () =>
    post<CreditNote>(`/credit-notes/${draftCreditNote.id}/apply`, headers, {
      invoiceId: creditApplicationInvoice.id,
      amountApplied: expectedCreditNoteTotal.toFixed(4),
    }),
  );
  await expectHttpError("void allocated credit note", () => post<CreditNote>(`/credit-notes/${draftCreditNote.id}/void`, headers, {}));

  const reversedCreditNote = await post<CreditNote>(
    `/credit-notes/${draftCreditNote.id}/allocations/${creditNoteAllocation.id}/reverse`,
    headers,
    { reason: "Smoke test allocation reversal" },
  );
  assertMoney(reversedCreditNote.unappliedAmount, expectedCreditNoteTotal, "credit note unapplied amount after allocation reversal");
  const afterCreditReverseInvoice = await get<SalesInvoice>(`/sales-invoices/${creditApplicationInvoice.id}`, headers);
  assertMoney(afterCreditReverseInvoice.balanceDue, expectedTotal, "invoice balance after credit allocation reversal");
  const reversedCreditNoteAllocations = await get<CreditNoteAllocation[]>(`/credit-notes/${draftCreditNote.id}/allocations`, headers);
  assert(
    reversedCreditNoteAllocations.some(
      (allocation) => allocation.id === creditNoteAllocation.id && Boolean(allocation.reversedAt) && allocation.reversalReason === "Smoke test allocation reversal",
    ),
    "credit note allocations include reversal metadata",
  );
  const ledgerAfterCreditReverse = await get<LedgerResponse>(`/contacts/${customer.id}/ledger`, headers);
  assert(
    ledgerAfterCreditReverse.rows.some(
      (row) => row.type === "CREDIT_NOTE_ALLOCATION_REVERSAL" && row.sourceId === creditNoteAllocation.id && money(row.debit).eq(0) && money(row.credit).eq(0),
    ),
    "ledger includes neutral credit note allocation reversal row",
  );
  assertMoney(ledgerAfterCreditReverse.closingBalance, expectedLedgerAfterCreditNote, "ledger closing balance after credit allocation reversal is not double counted");

  const creditNotePdfData = await get<{ creditNote: { total: string; unappliedAmount: string }; lines: unknown[]; allocations: unknown[] }>(
    `/credit-notes/${draftCreditNote.id}/pdf-data`,
    headers,
  );
  assertMoney(creditNotePdfData.creditNote.total, expectedCreditNoteTotal, "credit note pdf-data total");
  assertMoney(creditNotePdfData.creditNote.unappliedAmount, expectedCreditNoteTotal, "credit note pdf-data unapplied amount after reversal");
  assert(creditNotePdfData.lines.length > 0, "credit note pdf-data returns lines");
  assert(creditNotePdfData.allocations.length > 0, "credit note pdf-data returns allocations");
  await assertPdf(`/credit-notes/${draftCreditNote.id}/pdf`, headers, "credit note PDF");
  const creditNoteDocuments = await get<GeneratedDocument[]>(
    `/generated-documents?documentType=CREDIT_NOTE&sourceId=${encodeURIComponent(draftCreditNote.id)}`,
    headers,
  );
  const archivedCreditNotePdf = required(
    creditNoteDocuments.find((document) => document.sourceId === draftCreditNote.id && document.status === "GENERATED"),
    "archived credit note PDF document",
  );
  await assertPdf(`/generated-documents/${archivedCreditNotePdf.id}/download`, headers, "archived credit note PDF");

  const creditNoteRefundAmount = money("2.0000");
  const creditNoteRefund = await post<CustomerRefund>("/customer-refunds", headers, {
    customerId: customer.id,
    sourceType: "CREDIT_NOTE",
    sourceCreditNoteId: draftCreditNote.id,
    refundDate: new Date().toISOString(),
    currency: "SAR",
    amountRefunded: creditNoteRefundAmount.toFixed(4),
    accountId: paidThroughAccount!.id,
    description: "Smoke test credit note refund",
  });
  assertEqual(creditNoteRefund.status, "POSTED", "credit note refund status");
  assertPresent(creditNoteRefund.journalEntryId, "credit note refund journal entry id");
  const afterCreditNoteRefund = await get<CreditNote>(`/credit-notes/${draftCreditNote.id}`, headers);
  assertMoney(afterCreditNoteRefund.unappliedAmount, expectedCreditNoteTotal.minus(creditNoteRefundAmount), "credit note unapplied amount after refund");
  const ledgerAfterCreditNoteRefund = await get<LedgerResponse>(`/contacts/${customer.id}/ledger`, headers);
  assert(
    ledgerAfterCreditNoteRefund.rows.some(
      (row) => row.type === "CUSTOMER_REFUND" && row.sourceId === creditNoteRefund.id && money(row.debit).eq(creditNoteRefundAmount),
    ),
    "ledger includes customer refund row for credit note refund",
  );
  assertMoney(
    ledgerAfterCreditNoteRefund.closingBalance,
    expectedLedgerAfterCreditNote.plus(creditNoteRefundAmount),
    "ledger closing balance after credit note refund",
  );
  await expectHttpError("void refunded credit note", () => post<CreditNote>(`/credit-notes/${draftCreditNote.id}/void`, headers, {}));
  const voidedCreditNoteRefund = await post<CustomerRefund>(`/customer-refunds/${creditNoteRefund.id}/void`, headers, {});
  assertEqual(voidedCreditNoteRefund.status, "VOIDED", "voided credit note refund status");
  assertPresent(voidedCreditNoteRefund.voidReversalJournalEntryId, "voided credit note refund reversal journal");
  const afterCreditNoteRefundVoid = await get<CreditNote>(`/credit-notes/${draftCreditNote.id}`, headers);
  assertMoney(afterCreditNoteRefundVoid.unappliedAmount, expectedCreditNoteTotal, "credit note unapplied amount after refund void");
  const ledgerAfterCreditNoteRefundVoid = await get<LedgerResponse>(`/contacts/${customer.id}/ledger`, headers);
  assert(
    ledgerAfterCreditNoteRefundVoid.rows.some(
      (row) => row.type === "VOID_CUSTOMER_REFUND" && row.sourceId === creditNoteRefund.id && money(row.credit).eq(creditNoteRefundAmount),
    ),
    "ledger includes void customer refund row for credit note refund",
  );
  assertMoney(
    ledgerAfterCreditNoteRefundVoid.closingBalance,
    expectedLedgerAfterCreditNote,
    "ledger closing balance after credit note refund void",
  );

  const voidedCreditNote = await post<CreditNote>(`/credit-notes/${draftCreditNote.id}/void`, headers, {});
  assertEqual(voidedCreditNote.status, "VOIDED", "voided credit note after allocation reversal status");
  assertPresent(voidedCreditNote.reversalJournalEntryId, "voided credit note reversal journal after allocation reversal");

  const supplier = await post<Contact>("/contacts", headers, {
    type: "SUPPLIER",
    name: `Smoke Test Supplier ${runId}`,
    displayName: `Smoke Test Supplier ${runId}`,
    countryCode: "SA",
  });
  const purchaseBillLinePayload: Record<string, unknown> = {
    description: "Smoke test supplier bill line",
    accountId: expenseAccount.id,
    quantity: "1.0000",
    unitPrice: "100.0000",
  };
  if (purchaseVat) {
    purchaseBillLinePayload.taxRateId = purchaseVat.id;
  }
  const draftPurchaseBill = await post<PurchaseBill>("/purchase-bills", headers, {
    supplierId: supplier.id,
    billDate: new Date().toISOString(),
    currency: "SAR",
    notes: "Smoke purchase bill",
    lines: [purchaseBillLinePayload],
  });
  assertEqual(draftPurchaseBill.status, "DRAFT", "created purchase bill status");
  assertMoney(draftPurchaseBill.total, expectedPurchaseBillTotal, "draft purchase bill total");

  const finalizedPurchaseBill = await post<PurchaseBill>(`/purchase-bills/${draftPurchaseBill.id}/finalize`, headers, {});
  assertEqual(finalizedPurchaseBill.status, "FINALIZED", "finalized purchase bill status");
  assertPresent(finalizedPurchaseBill.journalEntryId, "finalized purchase bill journalEntryId");
  assertMoney(finalizedPurchaseBill.balanceDue, expectedPurchaseBillTotal, "finalized purchase bill balanceDue");
  const finalizedPurchaseBillAgain = await post<PurchaseBill>(`/purchase-bills/${draftPurchaseBill.id}/finalize`, headers, {});
  assertEqual(finalizedPurchaseBillAgain.journalEntryId, finalizedPurchaseBill.journalEntryId, "double finalize purchase bill journalEntryId");

  const purchaseBillPdfData = await get<{ bill: { total: string; balanceDue: string }; lines: unknown[] }>(
    `/purchase-bills/${draftPurchaseBill.id}/pdf-data`,
    headers,
  );
  assertMoney(purchaseBillPdfData.bill.total, expectedPurchaseBillTotal, "purchase bill pdf-data total");
  assert(purchaseBillPdfData.lines.length > 0, "purchase bill pdf-data returns lines");
  await assertPdf(`/purchase-bills/${draftPurchaseBill.id}/pdf`, headers, "purchase bill PDF");

  const cashExpensePayload: Record<string, unknown> = {
    contactId: supplier.id,
    expenseDate: new Date().toISOString(),
    currency: "SAR",
    paidThroughAccountId: paidThroughAccount!.id,
    description: "Smoke cash expense",
    notes: "Smoke test immediate paid expense",
    lines: [
      {
        description: "Smoke test office supplies",
        accountId: expenseAccount.id,
        quantity: "1.0000",
        unitPrice: "100.0000",
        taxRateId: purchaseVat?.id,
      },
    ],
  };
  const cashExpense = await post<CashExpense>("/cash-expenses", headers, cashExpensePayload);
  assertEqual(cashExpense.status, "POSTED", "cash expense posted status");
  assertPresent(cashExpense.journalEntryId, "cash expense journalEntryId");
  assertMoney(cashExpense.total, expectedPurchaseBillTotal, "cash expense total");
  const cashExpensePdfData = await get<{ expense: { expenseNumber: string; total: string }; lines: unknown[] }>(
    `/cash-expenses/${cashExpense.id}/pdf-data`,
    headers,
  );
  assertEqual(cashExpensePdfData.expense.expenseNumber, cashExpense.expenseNumber, "cash expense pdf-data number");
  assertMoney(cashExpensePdfData.expense.total, expectedPurchaseBillTotal, "cash expense pdf-data total");
  assert(cashExpensePdfData.lines.length > 0, "cash expense pdf-data returns lines");
  await assertPdf(`/cash-expenses/${cashExpense.id}/pdf`, headers, "cash expense PDF");
  const supplierLedgerAfterCashExpense = await get<LedgerResponse>(`/contacts/${supplier.id}/supplier-ledger`, headers);
  assert(
    supplierLedgerAfterCashExpense.rows.some(
      (row) =>
        row.type === "CASH_EXPENSE" &&
        row.sourceId === cashExpense.id &&
        money(row.debit).eq(0) &&
        money(row.credit).eq(0) &&
        money(row.metadata?.total).eq(cashExpense.total),
    ),
    "supplier ledger includes neutral cash expense row",
  );
  assertMoney(supplierLedgerAfterCashExpense.closingBalance, expectedPurchaseBillTotal, "supplier ledger cash expense row is neutral");
  const voidedCashExpense = await post<CashExpense>(`/cash-expenses/${cashExpense.id}/void`, headers, {});
  assertEqual(voidedCashExpense.status, "VOIDED", "voided cash expense status");
  assertPresent(voidedCashExpense.voidReversalJournalEntryId, "voided cash expense reversal journal");

  const debitNoteLinePayload: Record<string, unknown> = {
    description: "Smoke test supplier debit adjustment",
    accountId: expenseAccount.id,
    quantity: "1.0000",
    unitPrice: "10.0000",
  };
  if (purchaseVat) {
    debitNoteLinePayload.taxRateId = purchaseVat.id;
  }
  const draftPurchaseDebitNote = await post<PurchaseDebitNote>("/purchase-debit-notes", headers, {
    supplierId: supplier.id,
    originalBillId: draftPurchaseBill.id,
    issueDate: new Date().toISOString(),
    currency: "SAR",
    reason: "Smoke test supplier debit note",
    lines: [debitNoteLinePayload],
  });
  assertEqual(draftPurchaseDebitNote.status, "DRAFT", "created purchase debit note status");
  assertMoney(draftPurchaseDebitNote.total, expectedPurchaseDebitNoteTotal, "draft purchase debit note total");
  assertMoney(draftPurchaseDebitNote.unappliedAmount, expectedPurchaseDebitNoteTotal, "draft purchase debit note unapplied amount");

  const finalizedPurchaseDebitNote = await post<PurchaseDebitNote>(`/purchase-debit-notes/${draftPurchaseDebitNote.id}/finalize`, headers, {});
  assertEqual(finalizedPurchaseDebitNote.status, "FINALIZED", "finalized purchase debit note status");
  assertPresent(finalizedPurchaseDebitNote.journalEntryId, "finalized purchase debit note journalEntryId");
  assertMoney(finalizedPurchaseDebitNote.total, expectedPurchaseDebitNoteTotal, "finalized purchase debit note total");
  const finalizedPurchaseDebitNoteAgain = await post<PurchaseDebitNote>(`/purchase-debit-notes/${draftPurchaseDebitNote.id}/finalize`, headers, {});
  assertEqual(
    finalizedPurchaseDebitNoteAgain.journalEntryId,
    finalizedPurchaseDebitNote.journalEntryId,
    "double finalize purchase debit note journalEntryId",
  );

  const billDebitNotes = await get<PurchaseDebitNote[]>(`/purchase-bills/${draftPurchaseBill.id}/debit-notes`, headers);
  assert(
    billDebitNotes.some((debitNote) => debitNote.id === draftPurchaseDebitNote.id && debitNote.status === "FINALIZED"),
    "purchase bill linked debit notes include finalized smoke debit note",
  );
  const supplierLedgerAfterDebitNote = await get<LedgerResponse>(`/contacts/${supplier.id}/supplier-ledger`, headers);
  assert(
    supplierLedgerAfterDebitNote.rows.some(
      (row) => row.type === "PURCHASE_DEBIT_NOTE" && row.sourceId === draftPurchaseDebitNote.id && money(row.debit).eq(expectedPurchaseDebitNoteTotal),
    ),
    "supplier ledger includes purchase debit note debit",
  );
  assertMoney(
    supplierLedgerAfterDebitNote.closingBalance,
    expectedPurchaseBillTotal.minus(expectedPurchaseDebitNoteTotal),
    "supplier ledger closing balance after purchase debit note",
  );

  const debitApplyAmount = money("5.0000");
  const appliedPurchaseDebitNote = await post<PurchaseDebitNote>(`/purchase-debit-notes/${draftPurchaseDebitNote.id}/apply`, headers, {
    billId: draftPurchaseBill.id,
    amountApplied: debitApplyAmount.toFixed(4),
  });
  assertMoney(
    appliedPurchaseDebitNote.unappliedAmount,
    expectedPurchaseDebitNoteTotal.minus(debitApplyAmount),
    "purchase debit note unapplied amount after partial application",
  );
  const purchaseBillAfterDebitApply = await get<PurchaseBill>(`/purchase-bills/${draftPurchaseBill.id}`, headers);
  assertMoney(purchaseBillAfterDebitApply.balanceDue, expectedPurchaseBillTotal.minus(debitApplyAmount), "purchase bill balance after debit note application");
  const purchaseDebitNoteAllocations = await get<PurchaseDebitNoteAllocation[]>(
    `/purchase-debit-notes/${draftPurchaseDebitNote.id}/allocations`,
    headers,
  );
  const purchaseDebitNoteAllocation = required(
    purchaseDebitNoteAllocations.find((allocation) => allocation.billId === draftPurchaseBill.id && money(allocation.amountApplied).eq(debitApplyAmount)),
    "purchase debit note allocation for smoke application",
  );
  const billDebitNoteAllocations = await get<PurchaseDebitNoteAllocation[]>(`/purchase-bills/${draftPurchaseBill.id}/debit-note-allocations`, headers);
  assert(
    billDebitNoteAllocations.some(
      (allocation) => allocation.debitNoteId === draftPurchaseDebitNote.id && money(allocation.amountApplied).eq(debitApplyAmount),
    ),
    "purchase bill debit note allocations include partial application",
  );
  const supplierLedgerAfterDebitApply = await get<LedgerResponse>(`/contacts/${supplier.id}/supplier-ledger`, headers);
  assert(
    supplierLedgerAfterDebitApply.rows.some(
      (row) =>
        row.type === "PURCHASE_DEBIT_NOTE_ALLOCATION" &&
        row.sourceId === purchaseDebitNoteAllocation.id &&
        money(row.debit).eq(0) &&
        money(row.credit).eq(0),
    ),
    "supplier ledger includes neutral purchase debit note allocation row",
  );
  assertMoney(
    supplierLedgerAfterDebitApply.closingBalance,
    expectedPurchaseBillTotal.minus(expectedPurchaseDebitNoteTotal),
    "supplier ledger closing balance after debit allocation is not double counted",
  );
  await expectHttpError("over-apply purchase debit note", () =>
    post<PurchaseDebitNote>(`/purchase-debit-notes/${draftPurchaseDebitNote.id}/apply`, headers, {
      billId: draftPurchaseBill.id,
      amountApplied: expectedPurchaseDebitNoteTotal.toFixed(4),
    }),
  );
  await expectHttpError("void allocated purchase debit note", () => post<PurchaseDebitNote>(`/purchase-debit-notes/${draftPurchaseDebitNote.id}/void`, headers, {}));
  await expectHttpError("void purchase bill with active debit note allocation", () =>
    post<PurchaseBill>(`/purchase-bills/${draftPurchaseBill.id}/void`, headers, {}),
  );

  const reversedPurchaseDebitNote = await post<PurchaseDebitNote>(
    `/purchase-debit-notes/${draftPurchaseDebitNote.id}/allocations/${purchaseDebitNoteAllocation.id}/reverse`,
    headers,
    { reason: "Smoke test purchase debit allocation reversal" },
  );
  assertMoney(reversedPurchaseDebitNote.unappliedAmount, expectedPurchaseDebitNoteTotal, "purchase debit note unapplied amount after allocation reversal");
  const purchaseBillAfterDebitReverse = await get<PurchaseBill>(`/purchase-bills/${draftPurchaseBill.id}`, headers);
  assertMoney(purchaseBillAfterDebitReverse.balanceDue, expectedPurchaseBillTotal, "purchase bill balance after debit allocation reversal");
  const reversedPurchaseDebitNoteAllocations = await get<PurchaseDebitNoteAllocation[]>(
    `/purchase-debit-notes/${draftPurchaseDebitNote.id}/allocations`,
    headers,
  );
  assert(
    reversedPurchaseDebitNoteAllocations.some(
      (allocation) =>
        allocation.id === purchaseDebitNoteAllocation.id &&
        Boolean(allocation.reversedAt) &&
        allocation.reversalReason === "Smoke test purchase debit allocation reversal",
    ),
    "purchase debit note allocations include reversal metadata",
  );
  const supplierLedgerAfterDebitReverse = await get<LedgerResponse>(`/contacts/${supplier.id}/supplier-ledger`, headers);
  assert(
    supplierLedgerAfterDebitReverse.rows.some(
      (row) =>
        row.type === "PURCHASE_DEBIT_NOTE_ALLOCATION_REVERSAL" &&
        row.sourceId === purchaseDebitNoteAllocation.id &&
        money(row.debit).eq(0) &&
        money(row.credit).eq(0),
    ),
    "supplier ledger includes neutral purchase debit note allocation reversal row",
  );
  assertMoney(
    supplierLedgerAfterDebitReverse.closingBalance,
    expectedPurchaseBillTotal.minus(expectedPurchaseDebitNoteTotal),
    "supplier ledger closing balance after debit allocation reversal is not double counted",
  );
  const purchaseDebitNotePdfData = await get<{ debitNote: { total: string; unappliedAmount: string }; lines: unknown[]; allocations: unknown[] }>(
    `/purchase-debit-notes/${draftPurchaseDebitNote.id}/pdf-data`,
    headers,
  );
  assertMoney(purchaseDebitNotePdfData.debitNote.total, expectedPurchaseDebitNoteTotal, "purchase debit note pdf-data total");
  assertMoney(
    purchaseDebitNotePdfData.debitNote.unappliedAmount,
    expectedPurchaseDebitNoteTotal,
    "purchase debit note pdf-data unapplied amount after reversal",
  );
  assert(purchaseDebitNotePdfData.lines.length > 0, "purchase debit note pdf-data returns lines");
  assert(purchaseDebitNotePdfData.allocations.length > 0, "purchase debit note pdf-data returns allocations");
  await assertPdf(`/purchase-debit-notes/${draftPurchaseDebitNote.id}/pdf`, headers, "purchase debit note PDF");
  const purchaseDebitNoteDocuments = await get<GeneratedDocument[]>(
    `/generated-documents?documentType=PURCHASE_DEBIT_NOTE&sourceId=${encodeURIComponent(draftPurchaseDebitNote.id)}`,
    headers,
  );
  const archivedPurchaseDebitNotePdf = required(
    purchaseDebitNoteDocuments.find((document) => document.sourceId === draftPurchaseDebitNote.id && document.status === "GENERATED"),
    "archived purchase debit note PDF document",
  );
  await assertPdf(`/generated-documents/${archivedPurchaseDebitNotePdf.id}/download`, headers, "archived purchase debit note PDF");
  const voidedPurchaseDebitNote = await post<PurchaseDebitNote>(`/purchase-debit-notes/${draftPurchaseDebitNote.id}/void`, headers, {});
  assertEqual(voidedPurchaseDebitNote.status, "VOIDED", "voided purchase debit note status after reversed allocation");
  assertPresent(voidedPurchaseDebitNote.reversalJournalEntryId, "voided purchase debit note reversal journal");
  const supplierLedgerAfterDebitNoteVoid = await get<LedgerResponse>(`/contacts/${supplier.id}/supplier-ledger`, headers);
  assert(
    supplierLedgerAfterDebitNoteVoid.rows.some(
      (row) =>
        row.type === "VOID_PURCHASE_DEBIT_NOTE" &&
        row.sourceId === draftPurchaseDebitNote.id &&
        money(row.credit).eq(expectedPurchaseDebitNoteTotal),
    ),
    "supplier ledger includes void purchase debit note credit",
  );
  assertMoney(
    supplierLedgerAfterDebitNoteVoid.closingBalance,
    expectedPurchaseBillTotal,
    "supplier ledger closing balance after purchase debit note void",
  );

  const supplierPaymentAmount = money("40.0000");
  const supplierPayment = await post<SupplierPayment>("/supplier-payments", headers, {
    supplierId: supplier.id,
    paymentDate: new Date().toISOString(),
    currency: "SAR",
    amountPaid: supplierPaymentAmount.toFixed(4),
    accountId: paidThroughAccount!.id,
    description: "Smoke test supplier payment",
    allocations: [{ billId: draftPurchaseBill.id, amountApplied: supplierPaymentAmount.toFixed(4) }],
  });
  assertEqual(supplierPayment.status, "POSTED", "supplier payment status");
  assertPresent(supplierPayment.journalEntryId, "supplier payment journalEntryId");
  assertMoney(supplierPayment.unappliedAmount, money(0), "supplier payment unapplied amount");

  const purchaseBillAfterPayment = await get<PurchaseBill>(`/purchase-bills/${draftPurchaseBill.id}`, headers);
  assertMoney(purchaseBillAfterPayment.balanceDue, expectedPurchaseBillTotal.minus(supplierPaymentAmount), "purchase bill balance after supplier payment");
  const supplierLedgerAfterPayment = await get<LedgerResponse>(`/contacts/${supplier.id}/supplier-ledger`, headers);
  assert(
    supplierLedgerAfterPayment.rows.some(
      (row) => row.type === "PURCHASE_BILL" && row.sourceId === draftPurchaseBill.id && money(row.credit).eq(expectedPurchaseBillTotal),
    ),
    "supplier ledger includes purchase bill credit",
  );
  assert(
    supplierLedgerAfterPayment.rows.some(
      (row) => row.type === "SUPPLIER_PAYMENT" && row.sourceId === supplierPayment.id && money(row.debit).eq(supplierPaymentAmount),
    ),
    "supplier ledger includes supplier payment debit",
  );
  assertMoney(
    supplierLedgerAfterPayment.closingBalance,
    expectedPurchaseBillTotal.minus(supplierPaymentAmount),
    "supplier ledger closing balance after payment",
  );

  const supplierStatement = await get<LedgerResponse>(`/contacts/${supplier.id}/supplier-statement?from=${from}&to=${to}`, headers);
  assert(supplierStatement.rows.length > 0, "supplier statement returns rows");
  assertMoney(
    supplierStatement.closingBalance,
    expectedPurchaseBillTotal.minus(supplierPaymentAmount),
    "supplier statement closing balance after payment",
  );
  const supplierReceiptPdfData = await get<{ payment: { paymentNumber: string }; allocations: unknown[] }>(
    `/supplier-payments/${supplierPayment.id}/receipt-pdf-data`,
    headers,
  );
  assertEqual(supplierReceiptPdfData.payment.paymentNumber, supplierPayment.paymentNumber, "supplier receipt pdf-data payment number");
  assert(supplierReceiptPdfData.allocations.length > 0, "supplier receipt pdf-data returns allocations");
  await assertPdf(`/supplier-payments/${supplierPayment.id}/receipt.pdf`, headers, "supplier payment receipt PDF");

  await expectHttpError("void purchase bill with active supplier payment", () =>
    post<PurchaseBill>(`/purchase-bills/${draftPurchaseBill.id}/void`, headers, {}),
  );
  const voidedSupplierPayment = await post<SupplierPayment>(`/supplier-payments/${supplierPayment.id}/void`, headers, {});
  assertEqual(voidedSupplierPayment.status, "VOIDED", "voided supplier payment status");
  assertPresent(voidedSupplierPayment.voidReversalJournalEntryId, "voided supplier payment reversal journal");
  const purchaseBillAfterSupplierPaymentVoid = await get<PurchaseBill>(`/purchase-bills/${draftPurchaseBill.id}`, headers);
  assertMoney(purchaseBillAfterSupplierPaymentVoid.balanceDue, expectedPurchaseBillTotal, "purchase bill balance after supplier payment void");
  const supplierLedgerAfterPaymentVoid = await get<LedgerResponse>(`/contacts/${supplier.id}/supplier-ledger`, headers);
  assert(
    supplierLedgerAfterPaymentVoid.rows.some(
      (row) => row.type === "VOID_SUPPLIER_PAYMENT" && row.sourceId === supplierPayment.id && money(row.credit).eq(supplierPaymentAmount),
    ),
    "supplier ledger includes void supplier payment credit",
  );
  assertMoney(supplierLedgerAfterPaymentVoid.closingBalance, expectedPurchaseBillTotal, "supplier ledger closing balance after payment void");

  const voidedPurchaseBill = await post<PurchaseBill>(`/purchase-bills/${draftPurchaseBill.id}/void`, headers, {});
  assertEqual(voidedPurchaseBill.status, "VOIDED", "voided purchase bill status");
  assertPresent(voidedPurchaseBill.reversalJournalEntryId, "voided purchase bill reversal journal");

  const supplierOverpaymentBill = await post<PurchaseBill>("/purchase-bills", headers, {
    supplierId: supplier.id,
    billDate: new Date().toISOString(),
    currency: "SAR",
    notes: "Smoke test supplier overpayment target bill",
    lines: [purchaseBillLinePayload],
  });
  const finalizedSupplierOverpaymentBill = await post<PurchaseBill>(
    `/purchase-bills/${supplierOverpaymentBill.id}/finalize`,
    headers,
    {},
  );
  assertMoney(finalizedSupplierOverpaymentBill.balanceDue, expectedPurchaseBillTotal, "supplier overpayment target bill balance");

  const supplierOverpaymentAmount = money("80.0000");
  const supplierUnappliedApplyAmount = money("30.0000");
  const supplierOverpayment = await post<SupplierPayment>("/supplier-payments", headers, {
    supplierId: supplier.id,
    paymentDate: new Date().toISOString(),
    currency: "SAR",
    amountPaid: supplierOverpaymentAmount.toFixed(4),
    accountId: paidThroughAccount!.id,
    description: "Smoke test supplier overpayment",
    allocations: [],
  });
  assertMoney(supplierOverpayment.unappliedAmount, supplierOverpaymentAmount, "supplier overpayment unapplied amount");

  const supplierPaymentAfterUnappliedApply = await post<SupplierPayment>(
    `/supplier-payments/${supplierOverpayment.id}/apply-unapplied`,
    headers,
    {
      billId: finalizedSupplierOverpaymentBill.id,
      amountApplied: supplierUnappliedApplyAmount.toFixed(4),
    },
  );
  assertMoney(
    supplierPaymentAfterUnappliedApply.unappliedAmount,
    supplierOverpaymentAmount.minus(supplierUnappliedApplyAmount),
    "supplier payment unapplied amount after application",
  );
  const supplierOverpaymentBillAfterApply = await get<PurchaseBill>(
    `/purchase-bills/${finalizedSupplierOverpaymentBill.id}`,
    headers,
  );
  assertMoney(
    supplierOverpaymentBillAfterApply.balanceDue,
    expectedPurchaseBillTotal.minus(supplierUnappliedApplyAmount),
    "purchase bill balance after supplier overpayment application",
  );
  const supplierPaymentUnappliedAllocations = await get<SupplierPaymentUnappliedAllocation[]>(
    `/supplier-payments/${supplierOverpayment.id}/unapplied-allocations`,
    headers,
  );
  const supplierPaymentUnappliedAllocation = required(
    supplierPaymentUnappliedAllocations.find(
      (allocation) =>
        allocation.billId === finalizedSupplierOverpaymentBill.id &&
        money(allocation.amountApplied).eq(supplierUnappliedApplyAmount),
    ),
    "supplier payment unapplied allocation for smoke application",
  );
  const billSupplierPaymentUnappliedAllocations = await get<SupplierPaymentUnappliedAllocation[]>(
    `/purchase-bills/${finalizedSupplierOverpaymentBill.id}/supplier-payment-unapplied-allocations`,
    headers,
  );
  assert(
    billSupplierPaymentUnappliedAllocations.some((allocation) => allocation.id === supplierPaymentUnappliedAllocation.id),
    "purchase bill exposes supplier payment unapplied allocation",
  );
  const supplierReceiptAfterUnappliedApply = await get<{
    unappliedAllocations?: Array<{ billId: string; amountApplied: string; status: string }>;
  }>(`/supplier-payments/${supplierOverpayment.id}/receipt-pdf-data`, headers);
  assert(
    Boolean(
      supplierReceiptAfterUnappliedApply.unappliedAllocations?.some(
        (allocation) =>
          allocation.billId === finalizedSupplierOverpaymentBill.id &&
          money(allocation.amountApplied).eq(supplierUnappliedApplyAmount),
      ),
    ),
    "supplier receipt pdf-data includes unapplied payment allocation",
  );
  const supplierLedgerAfterUnappliedApply = await get<LedgerResponse>(`/contacts/${supplier.id}/supplier-ledger`, headers);
  assert(
    supplierLedgerAfterUnappliedApply.rows.some(
      (row) =>
        row.type === "SUPPLIER_PAYMENT_UNAPPLIED_ALLOCATION" &&
        row.sourceId === supplierPaymentUnappliedAllocation.id &&
        money(row.debit).eq(0) &&
        money(row.credit).eq(0),
    ),
    "supplier ledger includes neutral supplier payment unapplied allocation row",
  );

  const supplierPaymentAfterUnappliedReverse = await post<SupplierPayment>(
    `/supplier-payments/${supplierOverpayment.id}/unapplied-allocations/${supplierPaymentUnappliedAllocation.id}/reverse`,
    headers,
    { reason: "Smoke test supplier payment application reversal" },
  );
  assertMoney(
    supplierPaymentAfterUnappliedReverse.unappliedAmount,
    supplierOverpaymentAmount,
    "supplier payment unapplied amount after application reversal",
  );
  const supplierOverpaymentBillAfterReverse = await get<PurchaseBill>(
    `/purchase-bills/${finalizedSupplierOverpaymentBill.id}`,
    headers,
  );
  assertMoney(
    supplierOverpaymentBillAfterReverse.balanceDue,
    expectedPurchaseBillTotal,
    "purchase bill balance after supplier overpayment application reversal",
  );
  const reversedSupplierPaymentUnappliedAllocations = await get<SupplierPaymentUnappliedAllocation[]>(
    `/supplier-payments/${supplierOverpayment.id}/unapplied-allocations`,
    headers,
  );
  assert(
    reversedSupplierPaymentUnappliedAllocations.some(
      (allocation) =>
        allocation.id === supplierPaymentUnappliedAllocation.id &&
        Boolean(allocation.reversedAt) &&
        allocation.reversalReason === "Smoke test supplier payment application reversal",
    ),
    "supplier payment unapplied allocations include reversal metadata",
  );
  const supplierLedgerAfterUnappliedReverse = await get<LedgerResponse>(`/contacts/${supplier.id}/supplier-ledger`, headers);
  assert(
    supplierLedgerAfterUnappliedReverse.rows.some(
      (row) =>
        row.type === "SUPPLIER_PAYMENT_UNAPPLIED_ALLOCATION_REVERSAL" &&
        row.sourceId === supplierPaymentUnappliedAllocation.id &&
        money(row.debit).eq(0) &&
        money(row.credit).eq(0),
    ),
    "supplier ledger includes neutral supplier payment unapplied allocation reversal row",
  );

  const supplierRefundableSources = await get<{ payments: SupplierPayment[]; debitNotes: PurchaseDebitNote[] }>(
    `/supplier-refunds/refundable-sources?supplierId=${supplier.id}`,
    headers,
  );
  assert(
    supplierRefundableSources.payments.some(
      (payment) => payment.id === supplierOverpayment.id && money(payment.unappliedAmount).eq(supplierOverpaymentAmount),
    ),
    "supplier refundable sources include unapplied supplier payment",
  );

  const supplierPaymentRefundAmount = money("20.0000");
  const supplierPaymentRefund = await post<SupplierRefund>("/supplier-refunds", headers, {
    supplierId: supplier.id,
    sourceType: "SUPPLIER_PAYMENT",
    sourcePaymentId: supplierOverpayment.id,
    refundDate: new Date().toISOString(),
    currency: "SAR",
    amountRefunded: supplierPaymentRefundAmount.toFixed(4),
    accountId: paidThroughAccount!.id,
    description: "Smoke test supplier payment refund",
  });
  assertEqual(supplierPaymentRefund.status, "POSTED", "supplier payment refund status");
  assertPresent(supplierPaymentRefund.journalEntryId, "supplier payment refund journalEntryId");
  const supplierOverpaymentAfterRefund = await get<SupplierPayment>(`/supplier-payments/${supplierOverpayment.id}`, headers);
  assertMoney(
    supplierOverpaymentAfterRefund.unappliedAmount,
    supplierOverpaymentAmount.minus(supplierPaymentRefundAmount),
    "supplier payment unapplied amount after refund",
  );
  const supplierLedgerAfterPaymentRefund = await get<LedgerResponse>(`/contacts/${supplier.id}/supplier-ledger`, headers);
  assert(
    supplierLedgerAfterPaymentRefund.rows.some(
      (row) =>
        row.type === "SUPPLIER_REFUND" &&
        row.sourceId === supplierPaymentRefund.id &&
        money(row.credit).eq(supplierPaymentRefundAmount),
    ),
    "supplier ledger includes supplier payment refund credit",
  );

  const voidedSupplierPaymentRefund = await post<SupplierRefund>(`/supplier-refunds/${supplierPaymentRefund.id}/void`, headers, {});
  assertEqual(voidedSupplierPaymentRefund.status, "VOIDED", "voided supplier payment refund status");
  assertPresent(voidedSupplierPaymentRefund.voidReversalJournalEntryId, "voided supplier payment refund reversal journal");
  const supplierOverpaymentAfterRefundVoid = await get<SupplierPayment>(`/supplier-payments/${supplierOverpayment.id}`, headers);
  assertMoney(
    supplierOverpaymentAfterRefundVoid.unappliedAmount,
    supplierOverpaymentAmount,
    "supplier payment unapplied amount after refund void",
  );
  const supplierLedgerAfterPaymentRefundVoid = await get<LedgerResponse>(`/contacts/${supplier.id}/supplier-ledger`, headers);
  assert(
    supplierLedgerAfterPaymentRefundVoid.rows.some(
      (row) =>
        row.type === "VOID_SUPPLIER_REFUND" &&
        row.sourceId === supplierPaymentRefund.id &&
        money(row.debit).eq(supplierPaymentRefundAmount),
    ),
    "supplier ledger includes void supplier payment refund debit",
  );

  const supplierRefundDebitNote = await post<PurchaseDebitNote>("/purchase-debit-notes", headers, {
    supplierId: supplier.id,
    issueDate: new Date().toISOString(),
    currency: "SAR",
    reason: "Smoke test supplier refund debit note",
    lines: [debitNoteLinePayload],
  });
  const finalizedSupplierRefundDebitNote = await post<PurchaseDebitNote>(
    `/purchase-debit-notes/${supplierRefundDebitNote.id}/finalize`,
    headers,
    {},
  );
  assertMoney(
    finalizedSupplierRefundDebitNote.unappliedAmount,
    expectedPurchaseDebitNoteTotal,
    "supplier refund debit note unapplied amount",
  );
  const supplierDebitNoteRefundableSources = await get<{ payments: SupplierPayment[]; debitNotes: PurchaseDebitNote[] }>(
    `/supplier-refunds/refundable-sources?supplierId=${supplier.id}`,
    headers,
  );
  assert(
    supplierDebitNoteRefundableSources.debitNotes.some(
      (debitNote) =>
        debitNote.id === finalizedSupplierRefundDebitNote.id &&
        money(debitNote.unappliedAmount).eq(expectedPurchaseDebitNoteTotal),
    ),
    "supplier refundable sources include unapplied purchase debit note",
  );

  const supplierDebitNoteRefundAmount = money("5.0000");
  const supplierDebitNoteRefund = await post<SupplierRefund>("/supplier-refunds", headers, {
    supplierId: supplier.id,
    sourceType: "PURCHASE_DEBIT_NOTE",
    sourceDebitNoteId: finalizedSupplierRefundDebitNote.id,
    refundDate: new Date().toISOString(),
    currency: "SAR",
    amountRefunded: supplierDebitNoteRefundAmount.toFixed(4),
    accountId: paidThroughAccount!.id,
    description: "Smoke test purchase debit note supplier refund",
  });
  assertEqual(supplierDebitNoteRefund.status, "POSTED", "supplier debit note refund status");
  assertPresent(supplierDebitNoteRefund.journalEntryId, "supplier debit note refund journalEntryId");
  const supplierRefundDebitNoteAfterRefund = await get<PurchaseDebitNote>(
    `/purchase-debit-notes/${finalizedSupplierRefundDebitNote.id}`,
    headers,
  );
  assertMoney(
    supplierRefundDebitNoteAfterRefund.unappliedAmount,
    expectedPurchaseDebitNoteTotal.minus(supplierDebitNoteRefundAmount),
    "purchase debit note unapplied amount after supplier refund",
  );
  const supplierRefundPdfData = await get<{ refund: { refundNumber: string }; source: { number: string } }>(
    `/supplier-refunds/${supplierDebitNoteRefund.id}/pdf-data`,
    headers,
  );
  assertEqual(
    supplierRefundPdfData.refund.refundNumber,
    supplierDebitNoteRefund.refundNumber,
    "supplier refund pdf-data refund number",
  );
  await assertPdf(`/supplier-refunds/${supplierDebitNoteRefund.id}/pdf`, headers, "supplier refund PDF");
  const supplierLedgerAfterDebitNoteRefund = await get<LedgerResponse>(`/contacts/${supplier.id}/supplier-ledger`, headers);
  assert(
    supplierLedgerAfterDebitNoteRefund.rows.some(
      (row) =>
        row.type === "SUPPLIER_REFUND" &&
        row.sourceId === supplierDebitNoteRefund.id &&
        money(row.credit).eq(supplierDebitNoteRefundAmount),
    ),
    "supplier ledger includes purchase debit note supplier refund credit",
  );

  const generalLedgerReport = await get<{ accounts: Array<{ accountId: string; lines: unknown[] }> }>("/reports/general-ledger", headers);
  assert(generalLedgerReport.accounts.length > 0, "general ledger returns account activity");
  const trialBalanceReport = await get<TrialBalanceReport>("/reports/trial-balance", headers);
  assertMoney(trialBalanceReport.totals.closingDebit, money(trialBalanceReport.totals.closingCredit), "trial balance closing debit equals credit");
  assertEqual(trialBalanceReport.totals.balanced, true, "trial balance balanced flag");
  const profitAndLossReport = await get<ProfitAndLossReport>("/reports/profit-and-loss", headers);
  assertPresent(profitAndLossReport.revenue, "profit and loss revenue");
  assertPresent(profitAndLossReport.expenses, "profit and loss expenses");
  assertPresent(profitAndLossReport.netProfit, "profit and loss net profit");
  const balanceSheetReport = await get<BalanceSheetReport>("/reports/balance-sheet", headers);
  assertEqual(typeof balanceSheetReport.balanced, "boolean", "balance sheet balanced flag exists");
  assertPresent(balanceSheetReport.totalAssets, "balance sheet total assets");
  assertPresent(balanceSheetReport.totalLiabilitiesAndEquity, "balance sheet total liabilities and equity");
  const vatSummaryReport = await get<VatSummaryReport>("/reports/vat-summary", headers);
  assertPresent(vatSummaryReport.salesVat, "VAT summary salesVat");
  assertPresent(vatSummaryReport.purchaseVat, "VAT summary purchaseVat");
  assertPresent(vatSummaryReport.netVatPayable, "VAT summary netVatPayable");
  const agedReceivablesReport = await get<AgingReport>("/reports/aged-receivables", headers);
  assertPresent(agedReceivablesReport.grandTotal, "aged receivables grand total");
  const agedPayablesReport = await get<AgingReport>("/reports/aged-payables", headers);
  assertPresent(agedPayablesReport.grandTotal, "aged payables grand total");

  const voidedPayment = await post<CustomerPayment>(`/customer-payments/${partialPayment.id}/void`, headers, {});
  assertEqual(voidedPayment.status, "VOIDED", "voided payment status");
  assertPresent(voidedPayment.voidReversalJournalEntryId, "voided payment reversal journal");

  const afterPaymentVoid = await get<SalesInvoice>(`/sales-invoices/${draftInvoice.id}`, headers);
  assertMoney(afterPaymentVoid.balanceDue, partialPaymentAmount, "invoice balance after voiding partial payment");

  const voidedAgain = await post<CustomerPayment>(`/customer-payments/${partialPayment.id}/void`, headers, {});
  assertEqual(voidedAgain.voidReversalJournalEntryId, voidedPayment.voidReversalJournalEntryId, "double payment void reversal id");
  const afterSecondPaymentVoid = await get<SalesInvoice>(`/sales-invoices/${draftInvoice.id}`, headers);
  assertMoney(afterSecondPaymentVoid.balanceDue, partialPaymentAmount, "invoice balance after double payment void");

  await expectHttpError("void invoice with active payment", () =>
    post<SalesInvoice>(`/sales-invoices/${draftInvoice.id}/void`, headers, {}),
  );

  const ledgerAfterVoid = await get<LedgerResponse>(`/contacts/${customer.id}/ledger`, headers);

  console.log("LedgerByte accounting smoke: PASS");
  console.log(
    JSON.stringify(
      {
        apiUrl,
        organization: context.organization,
        smokeRoleName: context.roleName,
        smokePermissionCount: context.permissionCount,
        roleManagementChecked: true,
        smokeCustomRoleId: smokeRole.id,
        memberManagementChecked: true,
        closedFiscalPeriodId: closedFiscalPeriod.id,
        fiscalPeriodLockChecked: true,
        customerId: customer.id,
        invoiceId: draftInvoice.id,
        invoiceNumber: finalizedInvoice.invoiceNumber,
        creditApplicationInvoiceId: creditApplicationInvoice.id,
        zatcaMetadataId: zatcaMetadata.id,
        zatcaIcv: zatcaMetadata.icv,
        paymentIds: [partialPayment.id, remainingPayment.id],
        paymentRefundId: paymentRefund.id,
        paymentUnappliedInvoiceId: paymentUnappliedInvoice.id,
        paymentUnappliedAllocationId: paymentUnappliedAllocation.id,
        creditNoteRefundId: creditNoteRefund.id,
        creditNoteId: draftCreditNote.id,
        creditNoteNumber: finalizedCreditNote.creditNoteNumber,
        creditApplyAmount: creditApplyAmount.toFixed(4),
        supplierId: supplier.id,
        purchaseBillId: draftPurchaseBill.id,
        purchaseBillNumber: finalizedPurchaseBill.billNumber,
        cashExpenseId: cashExpense.id,
        cashExpenseNumber: cashExpense.expenseNumber,
        purchaseDebitNoteId: draftPurchaseDebitNote.id,
        purchaseDebitNoteNumber: finalizedPurchaseDebitNote.debitNoteNumber,
        purchaseDebitNoteAllocationId: purchaseDebitNoteAllocation.id,
        archivedPurchaseDebitNotePdfId: archivedPurchaseDebitNotePdf.id,
        supplierPaymentId: supplierPayment.id,
        supplierOverpaymentId: supplierOverpayment.id,
        supplierPaymentUnappliedAllocationId: supplierPaymentUnappliedAllocation.id,
        supplierPaymentRefundId: supplierPaymentRefund.id,
        supplierRefundDebitNoteId: finalizedSupplierRefundDebitNote.id,
        supplierDebitNoteRefundId: supplierDebitNoteRefund.id,
        reportsChecked: [
          "general-ledger",
          "trial-balance",
          "profit-and-loss",
          "balance-sheet",
          "vat-summary",
          "aged-receivables",
          "aged-payables",
        ],
        archivedInvoicePdfId: archivedInvoicePdf.id,
        archivedCreditNotePdfId: archivedCreditNotePdf.id,
        finalInvoiceBalance: afterSecondPaymentVoid.balanceDue,
        ledgerClosingBalanceBeforeVoid: ledgerBeforeVoid.closingBalance,
        ledgerClosingBalanceAfterVoid: ledgerAfterVoid.closingBalance,
      },
      null,
      2,
    ),
  );
}

async function loginAndSelectOrganization(): Promise<SmokeContext> {
  const login = await post<LoginResponse>("/auth/login", {}, { email: seedEmail, password: seedPassword });
  const authHeaders = { Authorization: `Bearer ${login.accessToken}` };
  const me = await get<AuthMeResponse>("/auth/me", authHeaders);
  const membership = me.memberships.find((item) => item.status === "ACTIVE") ?? me.memberships[0];
  if (!membership) {
    throw new Error("Seed user does not have an organization membership.");
  }
  const permissions = normalizePermissionList(membership.role.permissions);
  assert(permissions.length > 0, "/auth/me returns role permissions");
  assert(
    permissions.includes("admin.fullAccess") || permissions.includes("*") || permissions.includes("reports.view"),
    "/auth/me role permissions include recognizable permission strings",
  );

  return {
    token: login.accessToken,
    organization: membership.organization,
    roleName: membership.role.name,
    permissionCount: permissions.length,
  };
}

function tenantHeaders(context: SmokeContext): Record<string, string> {
  return {
    Authorization: `Bearer ${context.token}`,
    "x-organization-id": context.organization.id,
  };
}

async function get<T>(path: string, headers: Record<string, string>): Promise<T> {
  return request<T>("GET", path, headers);
}

async function post<T>(path: string, headers: Record<string, string>, body: unknown): Promise<T> {
  return request<T>("POST", path, headers, body);
}

async function patch<T>(path: string, headers: Record<string, string>, body: unknown): Promise<T> {
  return request<T>("PATCH", path, headers, body);
}

async function request<T>(method: string, path: string, headers: Record<string, string>, body?: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${apiUrl}${path}`, {
      method,
      headers: {
        "content-type": "application/json",
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (error) {
    throw new Error(`Could not reach LedgerByte API at ${apiUrl}: ${String(error)}`);
  }

  const text = await response.text();
  const parsedBody = text ? safeJson(text) : null;
  if (!response.ok) {
    throw new ApiError(`${method} ${path} failed with ${response.status}: ${text}`, response.status, parsedBody);
  }
  return parsedBody as T;
}

async function expectHttpError(label: string, action: () => Promise<unknown>): Promise<void> {
  try {
    await action();
  } catch (error) {
    if (error instanceof ApiError) {
      console.log(`Expected rejection: ${label} -> HTTP ${error.status}`);
      return;
    }
    throw error;
  }
  throw new Error(`Expected ${label} to fail, but it succeeded.`);
}

async function assertPdf(path: string, headers: Record<string, string>, label: string): Promise<void> {
  let response: Response;
  try {
    response = await fetch(`${apiUrl}${path}`, { headers });
  } catch (error) {
    throw new Error(`Could not reach LedgerByte API at ${apiUrl}: ${String(error)}`);
  }

  if (!response.ok) {
    const text = await response.text();
    throw new ApiError(`GET ${path} failed with ${response.status}: ${text}`, response.status, safeJson(text));
  }

  const contentType = response.headers.get("content-type") ?? "";
  assert(contentType.includes("application/pdf"), `${label} returns application/pdf`);
  const bytes = Buffer.from(await response.arrayBuffer());
  assert(bytes.byteLength > 1000, `${label} returns a non-empty PDF body`);
  assertEqual(bytes.subarray(0, 4).toString(), "%PDF", `${label} starts with PDF header`);
}

async function assertXml(path: string, headers: Record<string, string>, label: string, expectedText: string): Promise<void> {
  let response: Response;
  try {
    response = await fetch(`${apiUrl}${path}`, { headers });
  } catch (error) {
    throw new Error(`Could not reach LedgerByte API at ${apiUrl}: ${String(error)}`);
  }

  if (!response.ok) {
    const text = await response.text();
    throw new ApiError(`GET ${path} failed with ${response.status}: ${text}`, response.status, safeJson(text));
  }

  const contentType = response.headers.get("content-type") ?? "";
  assert(contentType.includes("application/xml"), `${label} returns application/xml`);
  const text = await response.text();
  assert(text.includes(expectedText), `${label} includes invoice number`);
}

async function assertText(path: string, headers: Record<string, string>, label: string, expectedText: string): Promise<void> {
  let response: Response;
  try {
    response = await fetch(`${apiUrl}${path}`, { headers });
  } catch (error) {
    throw new Error(`Could not reach LedgerByte API at ${apiUrl}: ${String(error)}`);
  }

  if (!response.ok) {
    const text = await response.text();
    throw new ApiError(`GET ${path} failed with ${response.status}: ${text}`, response.status, safeJson(text));
  }

  const contentType = response.headers.get("content-type") ?? "";
  assert(contentType.includes("text/plain"), `${label} returns text/plain`);
  const text = await response.text();
  assert(text.includes(expectedText), `${label} includes expected text`);
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function required<T>(value: T | undefined | null, label: string): T {
  if (value === undefined || value === null) {
    throw new Error(`Missing required smoke dependency: ${label}.`);
  }
  return value;
}

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Smoke assertion failed: ${message}.`);
  }
}

function assertEqual(actual: unknown, expected: unknown, label: string): void {
  if (actual !== expected) {
    throw new Error(`Smoke assertion failed: ${label}. Expected ${String(expected)}, got ${String(actual)}.`);
  }
}

function assertPresent(value: unknown, label: string): void {
  if (value === undefined || value === null || value === "") {
    throw new Error(`Smoke assertion failed: missing ${label}.`);
  }
}

function assertNoPrivateKey(value: unknown, label: string): void {
  const serialized = JSON.stringify(value) ?? "";
  assert(!serialized.includes("privateKeyPem"), `${label} does not expose privateKeyPem`);
  assert(!serialized.includes("PRIVATE KEY"), `${label} does not expose private key material`);
}

function normalizePermissionList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((permission): permission is string => typeof permission === "string");
  }

  if (typeof value === "object" && value !== null && Array.isArray((value as { permissions?: unknown }).permissions)) {
    return (value as { permissions: unknown[] }).permissions.filter((permission): permission is string => typeof permission === "string");
  }

  return [];
}

function assertMoney(actual: unknown, expected: Decimal, label: string): void {
  const actualMoney = money(actual);
  if (!actualMoney.eq(expected)) {
    throw new Error(`Smoke assertion failed: ${label}. Expected ${expected.toFixed(4)}, got ${actualMoney.toFixed(4)}.`);
  }
}

function money(value: unknown): Decimal {
  return new Decimal(value === undefined || value === null || value === "" ? 0 : String(value));
}

function statementRange(): { from: string; to: string } {
  const now = new Date();
  const fromDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1));
  const toDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  return { from: isoDate(fromDate), to: isoDate(toDate) };
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

main().catch((error) => {
  console.error("LedgerByte accounting smoke: FAIL");
  if (error instanceof ApiError) {
    console.error(error.message);
    console.error(JSON.stringify(error.body, null, 2));
  } else {
    console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  }
  process.exitCode = 1;
});
