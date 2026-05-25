import { apiRequest } from "./api";
import {
  eligibleOpenSalesInvoicesForCustomer,
  listOpenSalesInvoicesForCustomer,
  openSalesInvoicesPath,
} from "./sales-invoices";
import type { OpenSalesInvoice } from "./types";

jest.mock("./api", () => ({
  apiRequest: jest.fn(),
}));

const apiRequestMock = apiRequest as jest.MockedFunction<typeof apiRequest>;

describe("sales invoice API helpers", () => {
  beforeEach(() => {
    apiRequestMock.mockReset();
  });

  it("builds the customer-scoped open sales invoice path", () => {
    expect(openSalesInvoicesPath(" customer 1 ")).toBe("/sales-invoices/open?customerId=customer%201");
    expect(() => openSalesInvoicesPath("   ")).toThrow("customerId is required");
  });

  it("loads and filters eligible open sales invoices for payment allocation", async () => {
    const invoices = [
      openInvoiceFixture({ id: "invoice-open", customerId: "customer-1", balanceDue: "40.0000", status: "FINALIZED" }),
      openInvoiceFixture({ id: "invoice-other-customer", customerId: "customer-2", balanceDue: "40.0000", status: "FINALIZED" }),
      openInvoiceFixture({ id: "invoice-paid", customerId: "customer-1", balanceDue: "0.0000", status: "FINALIZED" }),
      openInvoiceFixture({ id: "invoice-draft", customerId: "customer-1", balanceDue: "40.0000", status: "DRAFT" }),
      openInvoiceFixture({ id: "invoice-voided", customerId: "customer-1", balanceDue: "40.0000", status: "VOIDED" }),
    ];
    apiRequestMock.mockResolvedValueOnce(invoices);

    await expect(listOpenSalesInvoicesForCustomer(" customer-1 ")).resolves.toEqual([invoices[0]]);

    expect(apiRequestMock).toHaveBeenCalledWith("/sales-invoices/open?customerId=customer-1");
  });

  it("keeps current open invoice API responses eligible when status is omitted", () => {
    const invoices = [openInvoiceFixture({ id: "invoice-current-api", customerId: "customer-1", balanceDue: "25.0000" })];

    expect(eligibleOpenSalesInvoicesForCustomer(invoices, "customer-1")).toEqual(invoices);
  });
});

function openInvoiceFixture(
  overrides: Partial<OpenSalesInvoice & { status: "DRAFT" | "FINALIZED" | "VOIDED" }> = {},
): OpenSalesInvoice & { status?: "DRAFT" | "FINALIZED" | "VOIDED" } {
  return {
    id: "invoice-1",
    invoiceNumber: "INV-001",
    issueDate: "2026-05-21T00:00:00.000Z",
    dueDate: null,
    currency: "SAR",
    total: "40.0000",
    balanceDue: "40.0000",
    customerId: "customer-1",
    ...overrides,
  };
}
