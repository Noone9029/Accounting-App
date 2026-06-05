import { apiRequest } from "./api";
import {
  combineGlobalSearchResults,
  getLocalGlobalSearchResults,
  globalSearchPath,
  groupGlobalSearchResults,
  searchGlobalRecords,
} from "./global-search";
import { PERMISSIONS } from "./permissions";
import type { GlobalSearchResult } from "./types";

jest.mock("./api", () => ({
  apiRequest: jest.fn(),
}));

const apiRequestMock = apiRequest as jest.MockedFunction<typeof apiRequest>;

describe("global search helpers", () => {
  beforeEach(() => {
    apiRequestMock.mockReset();
  });

  it("builds and calls the global search API path", async () => {
    apiRequestMock.mockResolvedValueOnce({ query: "alpha", results: [] });

    await expect(searchGlobalRecords("alpha customer")).resolves.toEqual({ query: "alpha", results: [] });

    expect(globalSearchPath("alpha customer")).toBe("/search?query=alpha+customer");
    expect(apiRequestMock).toHaveBeenCalledWith("/search?query=alpha+customer");
  });

  it("filters local report and page results by permissions", () => {
    const reportOnly = getLocalGlobalSearchResults("trial", { role: { permissions: [PERMISSIONS.reports.view] } });
    const noReports = getLocalGlobalSearchResults("trial", { role: { permissions: [PERMISSIONS.contacts.view] } });
    const customers = getLocalGlobalSearchResults("customers", { role: { permissions: [PERMISSIONS.contacts.view] } });

    expect(reportOnly.map((result) => result.label)).toEqual(["Trial Balance"]);
    expect(noReports).toEqual([]);
    expect(customers[0]).toEqual(
      expect.objectContaining({
        category: "Pages / Navigation",
        href: "/customers",
      }),
    );
  });

  it("finds the delivery note workflow as a sales fulfillment page", () => {
    const results = getLocalGlobalSearchResults("fulfillment", { role: { permissions: [PERMISSIONS.salesInvoices.view] } });

    expect(results).toEqual([
      expect.objectContaining({
        category: "Transactions",
        label: "Delivery Notes",
        href: "/sales/delivery-notes",
      }),
    ]);
  });

  it("finds the collections workspace as a Sales/AR follow-up page", () => {
    const results = getLocalGlobalSearchResults("promise to pay", { role: { permissions: [PERMISSIONS.salesInvoices.view] } });

    expect(results).toEqual([
      expect.objectContaining({
        category: "Transactions",
        label: "Collections",
        href: "/sales/collections",
      }),
    ]);
    expect(JSON.stringify(results)).not.toMatch(/payment sent|tax invoice|ZATCA/i);
  });

  it("deduplicates and groups remote and local results in display order", () => {
    const invoice = result("invoice-1", "Transactions", "INV-001", "/sales/invoices/invoice-1");
    const duplicateInvoice = result("invoice-1-copy", "Transactions", "INV-001", "/sales/invoices/invoice-1");
    const customer = result("customer-1", "Contacts", "Alpha Customer", "/customers/customer-1");

    const combined = combineGlobalSearchResults([invoice, customer], [duplicateInvoice]);
    const groups = groupGlobalSearchResults(combined);

    expect(combined).toHaveLength(2);
    expect(groups.map((group) => group.category)).toEqual(["Contacts", "Transactions"]);
  });
});

function result(
  id: string,
  category: GlobalSearchResult["category"],
  label: string,
  href: string,
): GlobalSearchResult {
  return {
    id,
    category,
    label,
    href,
    resultType: "Invoice",
    detail: "Alpha Customer",
    amount: "115.0000",
    date: "2026-05-01T00:00:00.000Z",
    status: "FINALIZED",
    keywords: [label, "Alpha Customer"],
  };
}
