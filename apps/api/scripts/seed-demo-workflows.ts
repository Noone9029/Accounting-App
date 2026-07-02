const DEFAULT_API_URL = "http://localhost:4000";
const DEFAULT_EMAIL = "admin@example.com";
const DEFAULT_PASSWORD = "Password123!";
const DEFAULT_ORGANIZATION_ID = "00000000-0000-0000-0000-000000000001";
const DEMO_MARKER = "LEDGERBYTE_DEMO_WORKFLOW_SEED";
export const OWNER_APPROVAL_PHRASE = "I_UNDERSTAND_THIS_MUTATES_A_DISPOSABLE_NON_PRODUCTION_TARGET";

interface SeedOptions {
  apiUrl?: string;
  email?: string;
  password?: string;
  allowRemote?: boolean;
  targetClass?: string;
  ownerApproval?: string;
  env?: Record<string, string | undefined>;
}

interface Session {
  token: string;
  organizationId: string;
}

interface ApiEntity {
  id: string;
  [key: string]: unknown;
}

interface DemoSeedSummary {
  organizationId: string;
  created: string[];
  reused: string[];
  entities: Record<string, string>;
}

export async function seedDemoWorkflows(options: SeedOptions = {}): Promise<DemoSeedSummary> {
  const apiUrl = normalizeApiUrl(options.apiUrl ?? process.env.LEDGERBYTE_API_URL ?? DEFAULT_API_URL);
  const email = options.email ?? process.env.LEDGERBYTE_E2E_EMAIL ?? process.env.LEDGERBYTE_DEMO_SEED_EMAIL ?? DEFAULT_EMAIL;
  const password =
    options.password ?? process.env.LEDGERBYTE_E2E_PASSWORD ?? process.env.LEDGERBYTE_DEMO_SEED_PASSWORD ?? DEFAULT_PASSWORD;
  const organizationId = process.env.LEDGERBYTE_E2E_ORGANIZATION_ID ?? process.env.LEDGERBYTE_DEMO_SEED_ORGANIZATION_ID ?? DEFAULT_ORGANIZATION_ID;
  const allowRemote = options.allowRemote ?? process.env.LEDGERBYTE_DEMO_SEED_ALLOW_REMOTE === "true";
  const env = options.env ?? process.env;
  const targetClass = options.targetClass ?? env.LEDGERBYTE_DEMO_SEED_TARGET_CLASS;
  const ownerApproval = options.ownerApproval ?? env.LEDGERBYTE_DEMO_SEED_OWNER_APPROVAL;

  assertSafeSeedTarget(apiUrl, { allowRemote, targetClass, ownerApproval, env });

  const summary: DemoSeedSummary = { organizationId: "", created: [], reused: [], entities: {} };
  const session = await login(apiUrl, email, password, organizationId);
  summary.organizationId = session.organizationId;

  const [accounts, taxRates, bankAccounts, warehouses, items] = await Promise.all([
    apiRequest<ApiEntity[]>(apiUrl, "/accounts", {}, session),
    apiRequest<ApiEntity[]>(apiUrl, "/tax-rates", {}, session),
    apiRequest<ApiEntity[]>(apiUrl, "/bank-accounts", {}, session),
    apiRequest<ApiEntity[]>(apiUrl, "/warehouses", {}, session),
    apiRequest<ApiEntity[]>(apiUrl, "/items", {}, session),
  ]);

  const salesAccount = requireByCode(accounts, "411", "Sales account");
  const generalExpenseAccount = requireByCode(accounts, "511", "General expense account");
  const bankAccount = requireBankAccount(bankAccounts, "112");
  const warehouse = requireByCode(warehouses, "MAIN", "Main warehouse");
  const salesTaxRate = requireByName(taxRates, "VAT on Sales 15%");
  const purchaseTaxRate = requireByName(taxRates, "VAT on Purchases 15%");
  const serviceItem = requireBySku(items, "CONSULTING-HOUR");

  const customer = await ensureContact(apiUrl, session, summary, {
    type: "CUSTOMER",
    name: "Acme Riyadh Trading LLC",
    displayName: "Acme Riyadh",
    email: "accounts@acme-riyadh.test",
    phone: "+966500000001",
    taxNumber: "399999999800003",
    identificationType: "CRN",
    identificationNumber: "1010123456",
    addressLine1: "King Fahd Road",
    addressLine2: "Al Olaya",
    buildingNumber: "1234",
    district: "Al Olaya",
    city: "Riyadh",
    countryCode: "SA",
    postalCode: "12211",
    isActive: true,
  });

  const supplier = await ensureContact(apiUrl, session, summary, {
    type: "SUPPLIER",
    name: "Gulf Office Supplies Co.",
    displayName: "Gulf Office Supplies",
    email: "billing@gulf-office.test",
    phone: "+966500000002",
    taxNumber: "399999999800004",
    identificationType: "CRN",
    identificationNumber: "1010654321",
    addressLine1: "Prince Sultan Road",
    addressLine2: "Al Zahra",
    buildingNumber: "4321",
    district: "Al Zahra",
    city: "Jeddah",
    countryCode: "SA",
    postalCode: "21431",
    isActive: true,
  });

  const inventoryItem = await ensureInventoryItem(apiUrl, session, summary, {
    name: "Workflow Demo Product",
    description: "Inventory-tracked product used by browser E2E demo workflows.",
    sku: "DEMO-WORKFLOW-PRODUCT",
    type: "PRODUCT",
    status: "ACTIVE",
    sellingPrice: "350.0000",
    revenueAccountId: salesAccount.id,
    salesTaxRateId: salesTaxRate.id,
    purchaseCost: "180.0000",
    expenseAccountId: generalExpenseAccount.id,
    purchaseTaxRateId: purchaseTaxRate.id,
    inventoryTracking: true,
    reorderPoint: "5.0000",
    reorderQuantity: "20.0000",
  });

  await ensureOpeningStock(apiUrl, session, summary, inventoryItem.id, warehouse.id);
  const invoice = await ensureSalesInvoice(apiUrl, session, summary, customer.id, serviceItem.id, salesTaxRate.id);
  await ensureCustomerPayment(apiUrl, session, summary, customer.id, bankAccount.id, invoice);
  const purchaseBill = await ensurePurchaseBill(apiUrl, session, summary, supplier.id, serviceItem.id, purchaseTaxRate.id);
  await ensureSupplierPayment(apiUrl, session, summary, supplier.id, bankAccount.id, purchaseBill);
  const cashExpense = await ensureCashExpense(apiUrl, session, summary, supplier.id, bankAccount.id, generalExpenseAccount.id, purchaseTaxRate.id);
  await ensureDemoAttachment(apiUrl, session, summary, cashExpense.id);

  return summary;
}

async function login(apiUrl: string, email: string, password: string, preferredOrganizationId: string): Promise<Session> {
  const loginResponse = await apiRequest<{ accessToken: string }>(apiUrl, "/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  const me = await apiRequest<{
    memberships: Array<{ organizationId?: string; organization?: { id?: string }; status: string }>;
  }>(apiUrl, "/auth/me", {}, { token: loginResponse.accessToken, organizationId: "" });
  const membership =
    me.memberships.find((item) => item.status === "ACTIVE" && (item.organizationId ?? item.organization?.id) === preferredOrganizationId) ??
    me.memberships.find((item) => item.status === "ACTIVE") ??
    me.memberships[0];
  const organizationId = membership?.organizationId ?? membership?.organization?.id;
  if (!organizationId) {
    throw new Error("Demo seed user has no active organization membership.");
  }
  return { token: loginResponse.accessToken, organizationId };
}

async function ensureContact(
  apiUrl: string,
  session: Session,
  summary: DemoSeedSummary,
  payload: Record<string, unknown> & { name: string; type: string },
): Promise<ApiEntity> {
  const contacts = await apiRequest<ApiEntity[]>(apiUrl, "/contacts", {}, session);
  const existing = contacts.find((contact) => contact.name === payload.name && contact.type === payload.type);
  if (existing) {
    summary.reused.push(`${payload.type.toLowerCase()}:${payload.name}`);
    summary.entities[payload.type.toLowerCase()] = existing.id;
    return existing;
  }
  const created = await apiRequest<ApiEntity>(apiUrl, "/contacts", { method: "POST", body: JSON.stringify(payload) }, session);
  summary.created.push(`${payload.type.toLowerCase()}:${payload.name}`);
  summary.entities[payload.type.toLowerCase()] = created.id;
  return created;
}

async function ensureInventoryItem(
  apiUrl: string,
  session: Session,
  summary: DemoSeedSummary,
  payload: Record<string, unknown> & { sku: string },
): Promise<ApiEntity> {
  const items = await apiRequest<ApiEntity[]>(apiUrl, "/items", {}, session);
  const existing = items.find((item) => item.sku === payload.sku);
  if (existing) {
    summary.reused.push(`item:${payload.sku}`);
    summary.entities.inventoryItem = existing.id;
    return existing;
  }
  const created = await apiRequest<ApiEntity>(apiUrl, "/items", { method: "POST", body: JSON.stringify(payload) }, session);
  summary.created.push(`item:${payload.sku}`);
  summary.entities.inventoryItem = created.id;
  return created;
}

async function ensureOpeningStock(
  apiUrl: string,
  session: Session,
  summary: DemoSeedSummary,
  itemId: string,
  warehouseId: string,
): Promise<ApiEntity> {
  const movements = await apiRequest<ApiEntity[]>(
    apiUrl,
    `/stock-movements?itemId=${encodeURIComponent(itemId)}&warehouseId=${encodeURIComponent(warehouseId)}`,
    {},
    session,
  );
  const existing = movements.find((movement) => movement.type === "OPENING_BALANCE");
  if (existing) {
    summary.reused.push("stock-movement:opening-balance");
    summary.entities.openingStockMovement = existing.id;
    return existing;
  }
  const created = await apiRequest<ApiEntity>(
    apiUrl,
    "/stock-movements",
    {
      method: "POST",
      body: JSON.stringify({
        itemId,
        warehouseId,
        movementDate: today(),
        type: "OPENING_BALANCE",
        quantity: "25.0000",
        unitCost: "180.0000",
        description: `${DEMO_MARKER} opening stock for validated workflow demos`,
      }),
    },
    session,
  );
  summary.created.push("stock-movement:opening-balance");
  summary.entities.openingStockMovement = created.id;
  return created;
}

async function ensureSalesInvoice(
  apiUrl: string,
  session: Session,
  summary: DemoSeedSummary,
  customerId: string,
  itemId: string,
  taxRateId: string,
): Promise<ApiEntity> {
  const invoices = await apiRequest<ApiEntity[]>(apiUrl, "/sales-invoices", {}, session);
  const existing = invoices.find((invoice) => getNestedId(invoice, "customer") === customerId);
  if (existing) {
    const invoice = existing.status === "DRAFT" ? await apiRequest<ApiEntity>(apiUrl, `/sales-invoices/${existing.id}/finalize`, { method: "POST" }, session) : existing;
    summary.reused.push("sales-invoice:demo-customer");
    summary.entities.salesInvoice = invoice.id;
    return invoice;
  }
  const draft = await apiRequest<ApiEntity>(
    apiUrl,
    "/sales-invoices",
    {
      method: "POST",
      body: JSON.stringify({
        customerId,
        issueDate: today(),
        dueDate: plusDays(30),
        currency: "SAR",
        notes: `${DEMO_MARKER} finalized sales invoice for E2E demo workflows`,
        terms: "Due on receipt for local demo data only.",
        lines: [
          {
            itemId,
            description: "Implementation advisory package",
            quantity: "3.0000",
            unitPrice: "500.0000",
            taxRateId,
            sortOrder: 0,
          },
        ],
      }),
    },
    session,
  );
  const finalized = await apiRequest<ApiEntity>(apiUrl, `/sales-invoices/${draft.id}/finalize`, { method: "POST" }, session);
  summary.created.push("sales-invoice:demo-customer");
  summary.entities.salesInvoice = finalized.id;
  return finalized;
}

async function ensureCustomerPayment(
  apiUrl: string,
  session: Session,
  summary: DemoSeedSummary,
  customerId: string,
  accountId: string,
  invoice: ApiEntity,
): Promise<ApiEntity | null> {
  const payments = await apiRequest<ApiEntity[]>(apiUrl, "/customer-payments", {}, session);
  const existing = payments.find((payment) => getNestedId(payment, "customer") === customerId);
  if (existing) {
    summary.reused.push("customer-payment:demo-customer");
    summary.entities.customerPayment = existing.id;
    return existing;
  }
  const balanceDue = decimalString(invoice.balanceDue ?? invoice.total);
  if (Number(balanceDue) <= 0) {
    return null;
  }
  const created = await apiRequest<ApiEntity>(
    apiUrl,
    "/customer-payments",
    {
      method: "POST",
      body: JSON.stringify({
        customerId,
        paymentDate: today(),
        currency: "SAR",
        amountReceived: balanceDue,
        accountId,
        description: `${DEMO_MARKER} customer payment for E2E demo workflows`,
        allocations: [{ invoiceId: invoice.id, amountApplied: balanceDue }],
      }),
    },
    session,
  );
  summary.created.push("customer-payment:demo-customer");
  summary.entities.customerPayment = created.id;
  return created;
}

async function ensurePurchaseBill(
  apiUrl: string,
  session: Session,
  summary: DemoSeedSummary,
  supplierId: string,
  itemId: string,
  taxRateId: string,
): Promise<ApiEntity> {
  const bills = await apiRequest<ApiEntity[]>(apiUrl, "/purchase-bills", {}, session);
  const existing = bills.find((bill) => getNestedId(bill, "supplier") === supplierId);
  if (existing) {
    const bill = existing.status === "DRAFT" ? await apiRequest<ApiEntity>(apiUrl, `/purchase-bills/${existing.id}/finalize`, { method: "POST" }, session) : existing;
    summary.reused.push("purchase-bill:demo-supplier");
    summary.entities.purchaseBill = bill.id;
    return bill;
  }
  const draft = await apiRequest<ApiEntity>(
    apiUrl,
    "/purchase-bills",
    {
      method: "POST",
      body: JSON.stringify({
        supplierId,
        billDate: today(),
        dueDate: plusDays(20),
        currency: "SAR",
        notes: `${DEMO_MARKER} finalized purchase bill for E2E demo workflows`,
        terms: "Local demo supplier terms.",
        inventoryPostingMode: "DIRECT_EXPENSE_OR_ASSET",
        lines: [
          {
            itemId,
            description: "Office setup services",
            quantity: "2.0000",
            unitPrice: "300.0000",
            taxRateId,
            sortOrder: 0,
          },
        ],
      }),
    },
    session,
  );
  const finalized = await apiRequest<ApiEntity>(apiUrl, `/purchase-bills/${draft.id}/finalize`, { method: "POST" }, session);
  summary.created.push("purchase-bill:demo-supplier");
  summary.entities.purchaseBill = finalized.id;
  return finalized;
}

async function ensureSupplierPayment(
  apiUrl: string,
  session: Session,
  summary: DemoSeedSummary,
  supplierId: string,
  accountId: string,
  bill: ApiEntity,
): Promise<ApiEntity | null> {
  const payments = await apiRequest<ApiEntity[]>(apiUrl, "/supplier-payments", {}, session);
  const existing = payments.find((payment) => getNestedId(payment, "supplier") === supplierId);
  if (existing) {
    summary.reused.push("supplier-payment:demo-supplier");
    summary.entities.supplierPayment = existing.id;
    return existing;
  }
  const balanceDue = decimalString(bill.balanceDue ?? bill.total);
  if (Number(balanceDue) <= 0) {
    return null;
  }
  const created = await apiRequest<ApiEntity>(
    apiUrl,
    "/supplier-payments",
    {
      method: "POST",
      body: JSON.stringify({
        supplierId,
        paymentDate: today(),
        currency: "SAR",
        amountPaid: balanceDue,
        accountId,
        description: `${DEMO_MARKER} supplier payment for E2E demo workflows`,
        allocations: [{ billId: bill.id, amountApplied: balanceDue }],
      }),
    },
    session,
  );
  summary.created.push("supplier-payment:demo-supplier");
  summary.entities.supplierPayment = created.id;
  return created;
}

async function ensureCashExpense(
  apiUrl: string,
  session: Session,
  summary: DemoSeedSummary,
  contactId: string,
  paidThroughAccountId: string,
  expenseAccountId: string,
  taxRateId: string,
): Promise<ApiEntity> {
  const expenses = await apiRequest<ApiEntity[]>(apiUrl, "/cash-expenses", {}, session);
  const existing = expenses.find((expense) => typeof expense.description === "string" && expense.description.includes(DEMO_MARKER));
  if (existing) {
    summary.reused.push("cash-expense:office-supplies");
    summary.entities.cashExpense = existing.id;
    return existing;
  }
  const created = await apiRequest<ApiEntity>(
    apiUrl,
    "/cash-expenses",
    {
      method: "POST",
      body: JSON.stringify({
        contactId,
        expenseDate: today(),
        currency: "SAR",
        description: `${DEMO_MARKER} office supplies cash purchase`,
        notes: "Local demo cash expense created through validated API workflow seeding.",
        paidThroughAccountId,
        lines: [
          {
            description: "Office supplies",
            accountId: expenseAccountId,
            quantity: "4.0000",
            unitPrice: "75.0000",
            taxRateId,
            sortOrder: 0,
          },
        ],
      }),
    },
    session,
  );
  summary.created.push("cash-expense:office-supplies");
  summary.entities.cashExpense = created.id;
  return created;
}

async function ensureDemoAttachment(apiUrl: string, session: Session, summary: DemoSeedSummary, cashExpenseId: string): Promise<ApiEntity | null> {
  const attachments = await apiRequest<ApiEntity[]>(
    apiUrl,
    `/attachments?linkedEntityType=CASH_EXPENSE&linkedEntityId=${encodeURIComponent(cashExpenseId)}`,
    {},
    session,
  );
  const existing = attachments.find((attachment) => attachment.filename === "demo-workflow-receipt.csv");
  if (existing) {
    summary.reused.push("attachment:cash-expense-receipt");
    summary.entities.attachment = existing.id;
    return existing;
  }
  const created = await apiRequest<ApiEntity>(
    apiUrl,
    "/attachments",
    {
      method: "POST",
      body: JSON.stringify({
        linkedEntityType: "CASH_EXPENSE",
        linkedEntityId: cashExpenseId,
        filename: "demo-workflow-receipt.csv",
        mimeType: "text/csv",
        contentBase64: Buffer.from("label,value\npurpose,demo workflow receipt placeholder\n", "utf8").toString("base64"),
        notes: `${DEMO_MARKER} harmless attachment placeholder`,
      }),
    },
    session,
  );
  summary.created.push("attachment:cash-expense-receipt");
  summary.entities.attachment = created.id;
  return created;
}

async function apiRequest<T>(apiUrl: string, path: string, options: RequestInit = {}, session?: Partial<Session>): Promise<T> {
  const response = await fetch(`${apiUrl}${path}`, {
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
    const message = typeof payload === "object" && payload && "message" in payload ? String(payload.message) : response.statusText;
    throw new Error(`${options.method ?? "GET"} ${path} failed with HTTP ${response.status}: ${message}`);
  }
  return payload as T;
}

function requireByCode(entities: ApiEntity[], code: string, label: string): ApiEntity {
  const entity = entities.find((item) => item.code === code);
  if (!entity) {
    throw new Error(`${label} with code ${code} is required before seeding demo workflows.`);
  }
  return entity;
}

function requireByName(entities: ApiEntity[], name: string): ApiEntity {
  const entity = entities.find((item) => item.name === name);
  if (!entity) {
    throw new Error(`${name} is required before seeding demo workflows.`);
  }
  return entity;
}

function requireBySku(entities: ApiEntity[], sku: string): ApiEntity {
  const entity = entities.find((item) => item.sku === sku);
  if (!entity) {
    throw new Error(`${sku} is required before seeding demo workflows.`);
  }
  return entity;
}

function requireBankAccount(entities: ApiEntity[], accountCode: string): ApiEntity {
  const profile = entities.find((item) => {
    const account = item.account as { code?: string; id?: string } | undefined;
    return account?.code === accountCode;
  });
  const account = profile?.account as { id?: string } | undefined;
  if (!account?.id) {
    throw new Error(`Bank account profile linked to account ${accountCode} is required before seeding demo workflows.`);
  }
  return { id: account.id };
}

function getNestedId(entity: ApiEntity, key: string): string | undefined {
  const nested = entity[key] as { id?: string } | undefined;
  return nested?.id;
}

function decimalString(value: unknown): string {
  if (typeof value === "number") {
    return value.toFixed(4);
  }
  const text = String(value ?? "0").trim();
  return Number(text).toFixed(4);
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function plusDays(days: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function normalizeApiUrl(value: string): string {
  return value.replace(/\/$/, "");
}

export function assertSafeSeedTarget(
  apiUrl: string,
  options: { allowRemote?: boolean; targetClass?: string; ownerApproval?: string; env?: Record<string, string | undefined> } = {},
): void {
  if (isProductionLikeEnvironment(options.env ?? process.env) || isProductionLikeUrl(apiUrl)) {
    throw new Error("Demo workflow seeding refuses production-like environments and targets.");
  }
  const parsed = new URL(apiUrl);
  const hostname = parsed.hostname.toLowerCase();
  const isLocal = ["localhost", "127.0.0.1", "::1", "0.0.0.0"].includes(hostname);
  if (isLocal) {
    return;
  }
  if (!options.allowRemote) {
    throw new Error("Demo workflow seeding is local-only by default. Set LEDGERBYTE_DEMO_SEED_ALLOW_REMOTE=true for disposable non-production targets.");
  }
  if (options.targetClass !== "disposable-non-production" || options.ownerApproval !== OWNER_APPROVAL_PHRASE) {
    throw new Error(
      `Demo workflow seeding remote targets require disposable non-production owner approval: LEDGERBYTE_DEMO_SEED_TARGET_CLASS=disposable-non-production and LEDGERBYTE_DEMO_SEED_OWNER_APPROVAL=${OWNER_APPROVAL_PHRASE}.`,
    );
  }
}

function isProductionLikeEnvironment(env: Record<string, string | undefined>): boolean {
  return [env.NODE_ENV, env.VERCEL_ENV, env.LEDGERBYTE_ENV, env.LEDGERBYTE_DEPLOY_ENV, env.LEDGERBYTE_TARGET_ENV].some((value) => /^(prod|production)$/i.test(String(value ?? "")));
}

function isProductionLikeUrl(value: string): boolean {
  try {
    return /(^|[.-])(prod|production)([.-]|$)/i.test(new URL(value).hostname.toLowerCase());
  } catch {
    return false;
  }
}

function safeJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

if (typeof require !== "undefined" && require.main === module) {
  seedDemoWorkflows()
    .then((summary) => {
      console.log(
        JSON.stringify(
          {
            seededDemoWorkflows: true,
            organizationId: summary.organizationId,
            created: summary.created,
            reused: summary.reused,
            entities: summary.entities,
          },
          null,
          2,
        ),
      );
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    });
}
