import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { AppLocaleProvider } from "@/components/app-locale-provider";
import { CreditNoteForm } from "./credit-note-form";
import type { CreditNote } from "@/lib/types";

const apiRequestMock = jest.fn();
const pushMock = jest.fn();
let mockBaseCurrency = "SAR";
let mockInvoiceCurrency = "SAR";
let mockInvoicesAvailable = true;

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({
    href,
    children,
    ...props
  }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; children: ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: jest.fn() }),
}));

jest.mock("@/hooks/use-active-organization", () => ({
  useActiveOrganization: () => ({ id: "org-1", baseCurrency: mockBaseCurrency }),
  useActiveOrganizationId: () => "org-1",
}));

jest.mock("@/lib/api", () => ({
  apiRequest: (...args: unknown[]) => apiRequestMock(...args),
}));

describe("CreditNoteForm", () => {
  beforeEach(() => {
    pushMock.mockReset();
    apiRequestMock.mockReset();
    mockBaseCurrency = "SAR";
    mockInvoiceCurrency = "SAR";
    mockInvoicesAvailable = true;
    window.history.pushState({}, "", "/sales/credit-notes/new?returnTo=/customers/customer-1");
    apiRequestMock.mockImplementation((path: string) => {
      switch (path) {
        case "/contacts":
          return Promise.resolve([{ id: "customer-1", name: "Visual Customer", displayName: "Visual Customer", type: "CUSTOMER", isActive: true }]);
        case "/sales-invoices":
          return Promise.resolve(mockInvoicesAvailable ? [{ id: "invoice-1", invoiceNumber: "INV-001", customerId: "customer-1", status: "FINALIZED", total: "115.0000", currency: mockInvoiceCurrency }] : []);
        case "/items":
          return Promise.resolve([{ id: "item-1", name: "Visual Item", description: "Visual item", status: "ACTIVE", sellingPrice: "100.0000", revenueAccountId: "revenue-1", salesTaxRateId: "tax-1" }]);
        case "/accounts":
          return Promise.resolve([{ id: "revenue-1", code: "4010", name: "Sales", type: "REVENUE", allowPosting: true, isActive: true }]);
        case "/tax-rates":
          return Promise.resolve([{ id: "tax-1", name: "VAT 15%", rate: "15.0000", scope: "BOTH", isActive: true }]);
        case "/branches":
          return Promise.resolve([]);
        default:
          return Promise.resolve({});
      }
    });
  });

  it("renders the create credit note form in Arabic without changing returnTo", async () => {
    render(
      <AppLocaleProvider initialLocale="ar">
        <CreditNoteForm />
      </AppLocaleProvider>,
    );

    expect(await screen.findByText("Visual Customer")).toBeInTheDocument();
    expect(screen.getByText("العميل")).toBeInTheDocument();
    expect(screen.getByText("تاريخ الإصدار")).toBeInTheDocument();
    expect(screen.getByText("الفاتورة الأصلية")).toBeInTheDocument();
    expect(screen.getByText("حساب الإيراد")).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "إشعار دائن مستقل" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "إضافة سطر" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "إنشاء إشعار دائن مسودة" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "إلغاء" })).toHaveAttribute("href", "/customers/customer-1");
  });

  it("renders the non-draft edit guard in Arabic without changing the detail route", () => {
    render(
      <AppLocaleProvider initialLocale="ar">
        <CreditNoteForm initialCreditNote={creditNoteFixture({ status: "FINALIZED" })} />
      </AppLocaleProvider>,
    );

    expect(screen.getByText("يمكن تعديل الإشعارات الدائنة المسودة فقط.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "العودة إلى الإشعار الدائن" })).toHaveAttribute("href", "/sales/credit-notes/credit-note-1");
  });

  it("blocks linking an AED-base credit note to a historical SAR invoice", async () => {
    mockBaseCurrency = "AED";
    mockInvoiceCurrency = "SAR";
    window.history.pushState({}, "", "/sales/credit-notes/new?customerId=customer-1&invoiceId=invoice-1");

    render(<CreditNoteForm />);

    expect(await screen.findByText(/linked invoice currency does not match/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create draft credit note" })).toBeDisabled();
  });

  it("rejects a query-prefilled original invoice when the active organization has no matching invoice", async () => {
    mockInvoicesAvailable = false;
    window.history.pushState({}, "", "/sales/credit-notes/new?customerId=customer-1&invoiceId=prior-org-invoice");
    const { container } = render(<CreditNoteForm />);

    await waitFor(() => expect(screen.getByLabelText("Customer")).toHaveValue("customer-1"));
    const descriptionInput = container.querySelector<HTMLInputElement>('input[required]:not([type])');
    const amountInputs = container.querySelectorAll<HTMLInputElement>('input[inputmode="decimal"]');
    fireEvent.change(descriptionInput!, { target: { value: "Credit adjustment" } });
    fireEvent.change(amountInputs[1]!, { target: { value: "100.0000" } });
    const revenueOption = screen.getByRole("option", { name: "4010 Sales" });
    fireEvent.change(revenueOption.parentElement!, { target: { value: "revenue-1" } });
    fireEvent.submit(screen.getByRole("button", { name: "Create draft credit note" }).closest("form")!);

    expect(await screen.findByText(/original invoice does not belong to the active organization/i)).toBeInTheDocument();
    expect(apiRequestMock).not.toHaveBeenCalledWith("/credit-notes", expect.objectContaining({ method: "POST" }));
  });
});

function creditNoteFixture(overrides: Partial<CreditNote> = {}): CreditNote {
  return {
    id: "credit-note-1",
    organizationId: "org-1",
    creditNoteNumber: "CN-001",
    customerId: "customer-1",
    originalInvoiceId: "invoice-1",
    branchId: null,
    issueDate: "2026-05-21T00:00:00.000Z",
    currency: "SAR",
    status: "DRAFT",
    subtotal: "100.0000",
    discountTotal: "0.0000",
    taxableTotal: "100.0000",
    taxTotal: "15.0000",
    total: "115.0000",
    unappliedAmount: "115.0000",
    notes: null,
    reason: null,
    finalizedAt: null,
    journalEntryId: null,
    reversalJournalEntryId: null,
    customer: { id: "customer-1", name: "Visual Customer", displayName: "Visual Customer", type: "CUSTOMER", taxNumber: null },
    originalInvoice: { id: "invoice-1", invoiceNumber: "INV-001", issueDate: "2026-05-21T00:00:00.000Z", status: "FINALIZED", total: "115.0000", customerId: "customer-1" },
    branch: null,
    journalEntry: null,
    reversalJournalEntry: null,
    lines: [],
    allocations: [],
    ...overrides,
  };
}
