import { assertSmokeMutationTargetAllowed, fetchSmokeApi, parseSmokeRequestTimeout, safeRouteLabel, smokeProgressEnabled } from "./smoke-http";

interface TestCredentialOptions {
  label: string;
  targetUrls: string[];
  emailVar: string;
  passwordVar: string;
}

interface TestCredentialResult {
  email: string;
  password: string;
}

const { resolveTestCredentials } = require("../../../scripts/test-credential-env.cjs") as {
  resolveTestCredentials(options: TestCredentialOptions): TestCredentialResult;
};

interface LoginResponse {
  accessToken: string;
}

interface Organization {
  id: string;
  name: string;
}

interface AuthMeResponse {
  memberships: Array<{
    status: string;
    organization: Organization;
  }>;
}

interface BankAccountSummary {
  id: string;
  type: string;
  status: string;
  ledgerBalance: string;
}

interface BankAccountTransactionsResponse {
  transactions: Array<{
    sourceType: string;
    sourceId: string | null;
    debit: string;
    credit: string;
  }>;
}

interface BankTransfer {
  id: string;
  transferNumber: string;
  status: string;
  voidReversalJournalEntryId?: string | null;
}

interface BankStatementImport {
  id: string;
  rowCount: number;
}

interface BankStatementTransaction {
  id: string;
  importId: string;
  status: string;
  matchType?: string | null;
}

interface BankStatementMatchCandidate {
  journalLineId: string;
  reference?: string | null;
}

class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

const apiUrl = (process.env.LEDGERBYTE_API_URL ?? "http://localhost:4000").replace(/\/$/, "");
assertSmokeMutationTargetAllowed(apiUrl);
const smokeHttpOptions = {
  apiUrl,
  timeoutMs: parseSmokeRequestTimeout(process.env.LEDGERBYTE_SMOKE_REQUEST_TIMEOUT_MS),
  progress: smokeProgressEnabled(process.env.LEDGERBYTE_SMOKE_PROGRESS),
};
const smokeCredentials = resolveTestCredentials({
  label: "Banking smoke",
  targetUrls: [apiUrl],
  emailVar: "LEDGERBYTE_SMOKE_EMAIL",
  passwordVar: "LEDGERBYTE_SMOKE_PASSWORD",
});
const seedOrganizationId = process.env.LEDGERBYTE_SMOKE_ORGANIZATION_ID ?? "00000000-0000-0000-0000-000000000001";

async function main(): Promise<void> {
  const context = await loginAndSelectOrganization();
  const headers = tenantHeaders(context);
  const accounts = await get<BankAccountSummary[]>("/bank-accounts", headers);
  const fromProfile = required(
    accounts.find((account) => account.status === "ACTIVE" && account.type === "BANK"),
    "active bank profile",
  );
  const toProfile = required(
    accounts.find((account) => account.status === "ACTIVE" && account.type === "CASH"),
    "active cash profile",
  );

  const amount = "1.2500";
  const runId = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
  const transferDate = new Date().toISOString();
  const statementDate = transferDate.slice(0, 10);
  const bankBeforeTransfer = await get<BankAccountSummary>(`/bank-accounts/${fromProfile.id}`, headers);
  const transfer = await post<BankTransfer>("/bank-transfers", headers, {
    fromBankAccountProfileId: fromProfile.id,
    toBankAccountProfileId: toProfile.id,
    transferDate,
    amount,
    currency: "SAR",
    description: "Banking smoke bank transfer diagnostic",
  });

  assertEqual(transfer.status, "POSTED", "bank transfer posted status");
  const transactionsBeforeVoid = await get<BankAccountTransactionsResponse>(`/bank-accounts/${fromProfile.id}/transactions`, headers);
  assert(
    transactionsBeforeVoid.transactions.some(
      (transaction) => transaction.sourceType === "BANK_TRANSFER" && transaction.sourceId === transfer.id && transaction.credit === amount,
    ),
    "bank transactions include bank transfer credit",
  );

  const transferStatementImport = await post<BankStatementImport>(`/bank-accounts/${fromProfile.id}/statement-imports`, headers, {
    filename: `banking-smoke-bank-transfer-${runId}.csv`,
    rows: [
      {
        date: statementDate,
        description: "Banking smoke bank transfer statement debit",
        reference: transfer.transferNumber,
        debit: amount,
        credit: "0.0000",
      },
    ],
    openingStatementBalance: bankBeforeTransfer.ledgerBalance,
    closingStatementBalance: (Number(bankBeforeTransfer.ledgerBalance) - Number(amount)).toFixed(4),
  });
  assertEqual(transferStatementImport.rowCount, 1, "bank transfer statement import row count");

  const unmatchedTransferStatementRows = await get<BankStatementTransaction[]>(
    `/bank-accounts/${fromProfile.id}/statement-transactions?status=UNMATCHED`,
    headers,
  );
  const transferStatementRow = required(
    unmatchedTransferStatementRows.find((transaction) => transaction.importId === transferStatementImport.id),
    "imported bank transfer statement row",
  );
  const transferMatchCandidates = await get<BankStatementMatchCandidate[]>(
    `/bank-statement-transactions/${transferStatementRow.id}/match-candidates`,
    headers,
  );
  const transferMatchCandidate = required(
    transferMatchCandidates.find((candidate) => candidate.reference === transfer.transferNumber),
    "bank statement transfer match candidate",
  );
  const matchedTransferStatementRow = await post<BankStatementTransaction>(
    `/bank-statement-transactions/${transferStatementRow.id}/match`,
    headers,
    { journalLineId: transferMatchCandidate.journalLineId },
  );
  assertEqual(matchedTransferStatementRow.status, "MATCHED", "bank statement transfer row matched");
  assertEqual(matchedTransferStatementRow.matchType, "JOURNAL_LINE", "bank statement transfer match type");

  const voidedBankTransfer = await post<BankTransfer>(`/bank-transfers/${transfer.id}/void`, headers, {});
  assertEqual(voidedBankTransfer.status, "VOIDED", "voided bank transfer status");
  assertPresent(voidedBankTransfer.voidReversalJournalEntryId, "voided bank transfer reversal journal");
  const voidedBankTransferAgain = await post<BankTransfer>(`/bank-transfers/${transfer.id}/void`, headers, {});
  assertEqual(
    voidedBankTransferAgain.voidReversalJournalEntryId,
    voidedBankTransfer.voidReversalJournalEntryId,
    "double void bank transfer reversal journal idempotent",
  );

  await get<BankAccountSummary>(`/bank-accounts/${fromProfile.id}`, headers);
  await get<BankAccountSummary>(`/bank-accounts/${toProfile.id}`, headers);
  const transactionsAfterVoid = await get<BankAccountTransactionsResponse>(`/bank-accounts/${fromProfile.id}/transactions`, headers);
  assert(
    transactionsAfterVoid.transactions.some(
      (transaction) => transaction.sourceType === "VOID_BANK_TRANSFER" && transaction.sourceId === transfer.id && transaction.debit === amount,
    ),
    "bank transactions include bank transfer void reversal debit",
  );

  console.log(
    JSON.stringify({
      status: "PASS",
      bankingSlice: true,
      transferStatus: voidedBankTransfer.status,
      doubleVoidIdempotent: true,
      transactionsBeforeCount: transactionsBeforeVoid.transactions.length,
      transactionsAfterCount: transactionsAfterVoid.transactions.length,
    }),
  );
}

async function loginAndSelectOrganization(): Promise<{ token: string; organization: Organization }> {
  const login = await post<LoginResponse>("/auth/login", {}, { email: smokeCredentials.email, password: smokeCredentials.password });
  const authHeaders = { Authorization: `Bearer ${login.accessToken}` };
  const me = await get<AuthMeResponse>("/auth/me", authHeaders);
  const membership =
    me.memberships.find((item) => item.status === "ACTIVE" && item.organization.id === seedOrganizationId) ??
    me.memberships.find((item) => item.status === "ACTIVE") ??
    me.memberships[0];
  if (!membership) {
    throw new Error("Smoke user does not have an organization membership.");
  }
  return { token: login.accessToken, organization: membership.organization };
}

function tenantHeaders(context: { token: string; organization: Organization }): Record<string, string> {
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

async function request<T>(method: string, path: string, headers: Record<string, string>, body?: unknown): Promise<T> {
  let response: Response;
  const label = safeRouteLabel(method, path);
  try {
    response = await fetchSmokeApi(
      path,
      {
        method,
        headers: {
          "content-type": "application/json",
          ...headers,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      },
      smokeHttpOptions,
    );
  } catch (error) {
    throw new Error(`Could not reach LedgerByte API route ${label}: ${error instanceof Error ? error.message : String(error)}`);
  }

  const text = await response.text();
  if (!response.ok) {
    throw new ApiError(`${label} failed with HTTP ${response.status}.`, response.status);
  }
  return (text ? JSON.parse(text) : null) as T;
}

function required<T>(value: T | null | undefined, label: string): T {
  if (value === null || value === undefined) {
    throw new Error(`Missing ${label}.`);
  }
  return value;
}

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function assertEqual(actual: unknown, expected: unknown, label: string): void {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${String(expected)}, received ${String(actual)}`);
  }
}

function assertPresent(value: unknown, label: string): void {
  if (value === null || value === undefined || value === "") {
    throw new Error(`${label}: expected value to be present.`);
  }
}

main().catch((error) => {
  if (error instanceof ApiError) {
    console.error(error.message);
  } else {
    console.error(error instanceof Error ? error.message : String(error));
  }
  process.exit(1);
});
