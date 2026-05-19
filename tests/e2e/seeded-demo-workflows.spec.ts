import { apiRequest, expect, gotoApp, loginByApi, test, type E2eSession } from "./utils/e2e-helpers";

interface ContactSummary {
  id: string;
  name: string;
  displayName?: string | null;
  type: string;
  taxNumber?: string | null;
}

interface TransactionSummary {
  id: string;
  status: string;
  total?: string | number;
  balanceDue?: string | number;
  customer?: { id: string; name: string; displayName?: string | null };
  supplier?: { id: string; name: string; displayName?: string | null };
}

interface CashExpenseSummary {
  id: string;
  expenseNumber?: string;
  status: string;
  description?: string | null;
  total?: string | number;
}

interface StockMovementSummary {
  id: string;
  type: string;
  quantity: string | number;
  item?: { name: string; sku?: string | null };
}

const DEMO_MARKER = "LEDGERBYTE_DEMO_WORKFLOW_SEED";
const apiUrl = process.env.LEDGERBYTE_API_URL ?? "http://localhost:4000";
const workflowChecksEnabled =
  process.env.LEDGERBYTE_E2E_SEED_WORKFLOWS === "true" ||
  (process.env.LEDGERBYTE_E2E_SEED_WORKFLOWS !== "false" && isLocalApiUrl(apiUrl));

test.beforeEach(async ({ page }) => {
  await loginByApi(page);
});

test("validated demo workflow data appears across API-backed app lists", async ({ page }) => {
  test.skip(!workflowChecksEnabled, "Validated demo workflow assertions run only against local or explicitly seeded E2E targets.");

  const session: E2eSession = await loginByApi(page);

  const contacts = await apiRequest<ContactSummary[]>("/contacts", {}, session);
  const customer = contacts.find((contact) => contact.name === "Acme Riyadh Trading LLC" && contact.type === "CUSTOMER");
  const supplier = contacts.find((contact) => contact.name === "Gulf Office Supplies Co." && contact.type === "SUPPLIER");

  expect(customer?.taxNumber).toMatch(/^[0-9]{15}$/);
  expect(supplier?.taxNumber).toMatch(/^[0-9]{15}$/);

  const invoices = await apiRequest<TransactionSummary[]>("/sales-invoices", {}, session);
  const invoice = invoices.find((item) => item.customer?.id === customer?.id);
  expect(invoice?.status).toBe("FINALIZED");
  expect(Number(invoice?.total ?? 0)).toBeGreaterThan(0);

  const bills = await apiRequest<TransactionSummary[]>("/purchase-bills", {}, session);
  const bill = bills.find((item) => item.supplier?.id === supplier?.id);
  expect(bill?.status).toBe("FINALIZED");
  expect(Number(bill?.total ?? 0)).toBeGreaterThan(0);

  const expenses = await apiRequest<CashExpenseSummary[]>("/cash-expenses", {}, session);
  const expense = expenses.find((item) => item.description?.includes(DEMO_MARKER));
  expect(expense?.status).toBe("POSTED");
  expect(expense?.expenseNumber).toMatch(/^EXP-/);
  expect(Number(expense?.total ?? 0)).toBeGreaterThan(0);

  const movements = await apiRequest<StockMovementSummary[]>("/stock-movements", {}, session);
  const movement = movements.find((item) => item.item?.sku === "DEMO-WORKFLOW-PRODUCT");
  expect(movement?.type).toBe("OPENING_BALANCE");
  expect(Number(movement?.quantity ?? 0)).toBeGreaterThan(0);

  await gotoApp(page, "/sales/invoices", /Sales invoices/i);
  await expect(page.getByText(/Acme Riyadh/i).first()).toBeVisible();

  await gotoApp(page, "/purchases/bills", /Purchase bills/i);
  await expect(page.getByText(/Gulf Office Supplies/i).first()).toBeVisible();

  await gotoApp(page, "/purchases/cash-expenses", /Cash expenses/i);
  await expect(page.getByText(expense!.expenseNumber!).first()).toBeVisible();

  await gotoApp(page, "/inventory/stock-movements", /Stock movements/i);
  await expect(page.getByText(/Workflow Demo Product/i).first()).toBeVisible();
});

function isLocalApiUrl(value: string) {
  const hostname = new URL(value).hostname.toLowerCase();
  return ["localhost", "127.0.0.1", "::1", "0.0.0.0"].includes(hostname);
}
