import {
  buildPartyTransactionHref,
  customerDetailPath,
  customersPath,
  filterPartySummaries,
  filterPartyTransactions,
  partyDetailHref,
  partyTransactionActionHref,
  partyTransactionsCsv,
  safeReturnToFromSearch,
  supplierDetailPath,
  suppliersPath,
} from "./parties";
import type { CustomerPartySummary, PartyTransaction, SupplierPartySummary } from "./types";

describe("party API paths", () => {
  it("builds dedicated customer and supplier API paths", () => {
    expect(customersPath()).toBe("/contacts/customers");
    expect(customerDetailPath("customer 1")).toBe("/contacts/customers/customer%201");
    expect(suppliersPath()).toBe("/contacts/suppliers");
    expect(supplierDetailPath("supplier 1")).toBe("/contacts/suppliers/supplier%201");
  });

  it("rejects missing detail ids", () => {
    expect(() => customerDetailPath(" ")).toThrow("customerId is required.");
    expect(() => supplierDetailPath(" ")).toThrow("supplierId is required.");
  });

  it("builds party context transaction links with safe return targets", () => {
    expect(partyDetailHref("customer", "customer 1")).toBe("/customers/customer%201");
    expect(buildPartyTransactionHref("/sales/invoices/new", "customer", "customer-1")).toBe(
      "/sales/invoices/new?customerId=customer-1&returnTo=%2Fcustomers%2Fcustomer-1",
    );
    expect(buildPartyTransactionHref("/purchases/bills/new", "supplier", "supplier-1", { billId: "bill-1" })).toBe(
      "/purchases/bills/new?supplierId=supplier-1&returnTo=%2Fsuppliers%2Fsupplier-1&billId=bill-1",
    );
    expect(safeReturnToFromSearch("?returnTo=/customers/customer-1")).toBe("/customers/customer-1");
    expect(safeReturnToFromSearch("?returnTo=https://example.test")).toBe("");
    expect(safeReturnToFromSearch("?returnTo=//example.test")).toBe("");
  });
});

describe("party list search helpers", () => {
  it("searches parties by contact fields, tax registration, and balances", () => {
    const rows = [
      partySummary("customer-1", "Alpha Trading", "alpha@example.com", "555-0101", "TRN-123", "125.0000"),
      partySummary("customer-2", "Beta Design", "beta@example.com", "555-0202", "TRN-456", "0.0000"),
    ];

    expect(filterPartySummaries(rows, "alpha").map((row) => row.contact.id)).toEqual(["customer-1"]);
    expect(filterPartySummaries(rows, "TRN-456").map((row) => row.contact.id)).toEqual(["customer-2"]);
    expect(filterPartySummaries(rows, "125").map((row) => row.contact.id)).toEqual(["customer-1"]);
    expect(filterPartySummaries(rows, "555-0202").map((row) => row.contact.id)).toEqual(["customer-2"]);
  });
});

describe("party transaction helpers", () => {
  const transactions: PartyTransaction[] = [
    transaction({
      id: "invoice-open",
      sourceType: "SalesInvoice",
      sourceId: "invoice-1",
      type: "Invoice",
      balanceDue: "100.0000",
      dueDate: "2026-05-01T00:00:00.000Z",
      date: "2026-04-15T00:00:00.000Z",
    }),
    transaction({
      id: "invoice-paid",
      sourceType: "SalesInvoice",
      sourceId: "invoice-2",
      type: "Invoice",
      balanceDue: "0.0000",
      dueDate: "2026-06-01T00:00:00.000Z",
      date: "2026-05-15T00:00:00.000Z",
    }),
    transaction({
      id: "bill-open",
      sourceType: "PurchaseBill",
      sourceId: "bill-1",
      type: "Bill",
      balanceDue: "50.0000",
      dueDate: "2026-06-15T00:00:00.000Z",
      date: "2026-05-20T00:00:00.000Z",
    }),
  ];

  it("filters transactions by open, overdue, paid, type, and date range", () => {
    expect(filterPartyTransactions(transactions, filters({ status: "OPEN" })).map((row) => row.id)).toEqual([
      "invoice-open",
      "bill-open",
    ]);
    expect(filterPartyTransactions(transactions, filters({ status: "OVERDUE" }), new Date("2026-05-25T00:00:00.000Z")).map((row) => row.id)).toEqual([
      "invoice-open",
    ]);
    expect(filterPartyTransactions(transactions, filters({ status: "PAID" })).map((row) => row.id)).toEqual(["invoice-paid"]);
    expect(filterPartyTransactions(transactions, filters({ type: "PurchaseBill" })).map((row) => row.id)).toEqual(["bill-open"]);
    expect(filterPartyTransactions(transactions, filters({ fromDate: "2026-05-01", toDate: "2026-05-31" })).map((row) => row.id)).toEqual([
      "invoice-paid",
      "bill-open",
    ]);
  });

  it("builds action links and CSV exports for transaction lists", () => {
    const invoice = transactions[0]!;
    const bill = transactions[2]!;

    expect(partyTransactionActionHref(invoice)).toBe("/sales/invoices/invoice-1");
    expect(partyTransactionActionHref(bill)).toBe("/purchases/bills/bill-1");
    expect(partyTransactionsCsv([invoice])).toContain("Date,Type,Transaction number");
    expect(partyTransactionsCsv([invoice])).toContain("INV-001");
  });
});

function filters(overrides: Partial<Parameters<typeof filterPartyTransactions>[1]> = {}) {
  return {
    status: "ALL" as const,
    type: "ALL",
    fromDate: "",
    toDate: "",
    ...overrides,
  };
}

function transaction(overrides: Partial<PartyTransaction>): PartyTransaction {
  return {
    id: "transaction",
    sourceType: "SalesInvoice",
    sourceId: "source",
    date: "2026-05-01T00:00:00.000Z",
    dueDate: null,
    type: "Invoice",
    transactionNumber: "INV-001",
    currency: "SAR",
    subtotal: "100.0000",
    taxAmount: "15.0000",
    total: "115.0000",
    balanceDue: "115.0000",
    status: "FINALIZED",
    ...overrides,
  };
}

function partySummary(
  id: string,
  name: string,
  email: string,
  phone: string,
  taxNumber: string,
  openBalance: string,
): CustomerPartySummary | SupplierPartySummary {
  return {
    contact: {
      id,
      name,
      displayName: name,
      type: "CUSTOMER",
      email,
      phone,
      taxNumber,
      identificationType: null,
      identificationNumber: null,
      addressLine1: null,
      addressLine2: null,
      buildingNumber: null,
      district: null,
      city: null,
      postalCode: null,
      countryCode: "SA",
      isActive: true,
    },
    openReceivableBalance: openBalance,
    overdueReceivableBalance: "0.0000",
    lastTransactionDate: null,
  };
}
