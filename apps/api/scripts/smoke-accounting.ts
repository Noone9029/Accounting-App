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
    status: string;
    organization: Organization;
  }>;
}

interface Organization {
  id: string;
  name: string;
}

interface Account {
  id: string;
  code: string;
  name: string;
  allowPosting: boolean;
  isActive: boolean;
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
  journalEntryId?: string | null;
  voidReversalJournalEntryId?: string | null;
}

interface LedgerRow {
  type: string;
  sourceId: string;
  debit: string;
  credit: string;
  status: string;
}

interface LedgerResponse {
  closingBalance: string;
  rows: LedgerRow[];
}

interface ReceiptData {
  customer?: { id: string; name: string };
  journalEntry?: { id: string; entryNumber: string } | null;
  allocations: Array<{ invoiceId: string; amountApplied: string }>;
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
}

async function main(): Promise<void> {
  const context = await loginAndSelectOrganization();
  const runId = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
  const headers = tenantHeaders(context);

  const accounts = await get<Account[]>("/accounts", headers);
  const salesAccount = required(
    accounts.find((account) => account.code === "411" && account.allowPosting && account.isActive),
    "Sales revenue account code 411",
  );
  const paidThroughAccount =
    accounts.find((account) => account.code === "112" && account.allowPosting && account.isActive) ??
    accounts.find((account) => account.code === "111" && account.allowPosting && account.isActive);
  required(paidThroughAccount, "Bank Account code 112 or Cash code 111");

  const taxRates = await get<TaxRate[]>("/tax-rates", headers);
  const salesVat = taxRates.find((taxRate) => taxRate.name === "VAT on Sales 15%" && taxRate.isActive);
  const expectedTotal = salesVat ? money("115.0000") : money("100.0000");
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
        customerId: customer.id,
        invoiceId: draftInvoice.id,
        invoiceNumber: finalizedInvoice.invoiceNumber,
        paymentIds: [partialPayment.id, remainingPayment.id],
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
  return { token: login.accessToken, organization: membership.organization };
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
