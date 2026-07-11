import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { AppLocaleProvider } from "@/components/app-locale-provider";
import { SalesInvoiceForm } from "./sales-invoice-form";

const apiRequestMock = jest.fn();
const pushMock = jest.fn();
let mockActiveOrganization = organizationFixture("SAR");

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
  useRouter: () => ({
    push: pushMock,
  }),
}));

jest.mock("@/hooks/use-active-organization", () => ({
  useActiveOrganization: () => mockActiveOrganization,
  useActiveOrganizationId: () => mockActiveOrganization.id,
}));

jest.mock("@/lib/api", () => ({
  apiRequest: (...args: unknown[]) => apiRequestMock(...args),
}));

describe("SalesInvoiceForm", () => {
  beforeEach(() => {
    window.history.pushState({}, "", "/sales/invoices/new");
    apiRequestMock.mockReset();
    pushMock.mockReset();
    mockActiveOrganization = organizationFixture("SAR");
    apiRequestMock.mockImplementation((path: string) => {
      if (path === "/contacts") {
        return Promise.resolve([
          contactFixture("customer-1", "Beta Customer"),
          contactFixture("customer-2", "Second Customer"),
        ]);
      }
      if (path === "/items") {
        return Promise.resolve([]);
      }
      if (path === "/accounts") {
        return Promise.resolve([
          {
            id: "revenue-1",
            code: "401",
            name: "Sales revenue",
            type: "REVENUE",
            isActive: true,
            allowPosting: true,
          },
        ]);
      }
      if (path === "/tax-rates") {
        return Promise.resolve([]);
      }
      if (path === "/branches") {
        return Promise.resolve([]);
      }
      if (path === "/sales-invoices/next-number") {
        return Promise.resolve({
          invoiceNumber: "INV-000042",
          editable: false,
          overrideAllowed: false,
          helperText: "Preview only. The invoice number is assigned from the invoice number sequence when the draft is saved.",
        });
      }
      if (path === "/fx/currencies") {
        return Promise.resolve({
          baseCurrency: mockActiveOrganization.baseCurrency,
          supportedCurrencies: [
            { code: "AED", name: "UAE Dirham" },
            { code: "SAR", name: "Saudi Riyal" },
            { code: "USD", name: "US Dollar" },
          ],
          manualRateEntryEnabled: true,
          liveRateProviderEnabled: false,
          providerState: "DISABLED",
        });
      }
      if (path.startsWith("/fx/rates?")) {
        return Promise.resolve({
          data: [{
            id: "11111111-1111-4111-8111-111111111111",
            organizationId: "org-1",
            transactionCurrency: "USD",
            baseCurrency: mockActiveOrganization.baseCurrency,
            rate: mockActiveOrganization.baseCurrency === "AED" ? "3.67250000" : "3.75000000",
            rateDate: "2026-07-10T00:00:00.000Z",
            source: "MANUAL",
            sourceReference: null,
            createdByUserId: null,
            createdAt: "2026-07-10T00:00:00.000Z",
          }],
          pagination: { page: 1, limit: 100, hasMore: false },
        });
      }
      return Promise.reject(new Error(`Unexpected path ${path}`));
    });
  });

  it.each(["AED", "SAR"])("renders and submits the active organization's %s base currency", async (baseCurrency) => {
    mockActiveOrganization = organizationFixture(baseCurrency);
    const { container } = render(<SalesInvoiceForm />);

    await waitFor(() => expect(screen.getByLabelText("Transaction currency")).toHaveValue(baseCurrency));
    await screen.findByRole("option", { name: "Beta Customer" });
    fireEvent.change(screen.getByLabelText("Customer"), { target: { value: "customer-1" } });

    const lineDescription = container.querySelector<HTMLInputElement>('input[required]:not([type])');
    const amountInputs = container.querySelectorAll<HTMLInputElement>('input[inputmode="decimal"]');
    fireEvent.change(lineDescription!, { target: { value: "Consulting" } });
    fireEvent.change(screen.getByLabelText("Posting account for line 1"), { target: { value: "revenue-1" } });
    fireEvent.change(amountInputs[1]!, { target: { value: "100.0000" } });
    expect(screen.getByLabelText("Customer")).toHaveValue("customer-1");
    expect(lineDescription).toHaveValue("Consulting");
    expect(screen.getByLabelText("Posting account for line 1")).toHaveValue("revenue-1");
    await waitFor(() => expect(screen.getByRole("button", { name: "Create draft invoice" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "Create draft invoice" }));

    await waitFor(() =>
      expect(apiRequestMock).toHaveBeenCalledWith(
        "/sales-invoices",
        expect.objectContaining({ method: "POST", body: expect.objectContaining({ currency: baseCurrency }) }),
      ),
    );
  });

  it("prefills the customer from the new-invoice route query string", async () => {
    window.history.pushState({}, "", "/sales/invoices/new?customerId=customer-2&returnTo=/customers/customer-2");

    render(<SalesInvoiceForm />);

    await waitFor(() => expect(screen.getByLabelText("Customer")).toHaveValue("customer-2"));
    expect(screen.getByRole("link", { name: "Cancel" })).toHaveAttribute("href", "/customers/customer-2");
  });

  it("submits a foreign draft only after a tenant rate snapshot is selected", async () => {
    mockActiveOrganization = organizationFixture("AED");
    const { container } = render(<SalesInvoiceForm />);
    await screen.findByRole("option", { name: "Beta Customer" });
    fireEvent.change(screen.getByLabelText("Customer"), { target: { value: "customer-1" } });
    const lineDescription = container.querySelector<HTMLInputElement>('input[required]:not([type])');
    const amountInputs = container.querySelectorAll<HTMLInputElement>('input[inputmode="decimal"]');
    fireEvent.change(lineDescription!, { target: { value: "Consulting" } });
    fireEvent.change(screen.getByLabelText("Posting account for line 1"), { target: { value: "revenue-1" } });
    fireEvent.change(amountInputs[1]!, { target: { value: "100.0000" } });

    await screen.findByRole("option", { name: "USD — US Dollar" });
    fireEvent.change(screen.getByLabelText("Transaction currency"), { target: { value: "USD" } });
    await screen.findByRole("option", { name: /2026-07-10 · 3.67250000/ });
    fireEvent.change(screen.getByLabelText("Saved rate snapshot"), { target: { value: "11111111-1111-4111-8111-111111111111" } });
    await waitFor(() => expect(screen.getByRole("button", { name: "Create draft invoice" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "Create draft invoice" }));

    await waitFor(() => expect(apiRequestMock).toHaveBeenCalledWith(
      "/sales-invoices",
      expect.objectContaining({
        method: "POST",
        body: expect.objectContaining({
          currency: "USD",
          exchangeRate: "3.67250000",
          rateDate: "2026-07-10",
          rateSource: "MANUAL",
          rateSnapshotId: "11111111-1111-4111-8111-111111111111",
        }),
      }),
    ));
  });

  it("shows a read-only invoice number sequence preview on new invoices", async () => {
    render(<SalesInvoiceForm />);

    await waitFor(() => expect(screen.getByLabelText("Invoice number")).toHaveValue("INV-000042"));
    expect(screen.getByLabelText("Invoice number")).toHaveAttribute("readonly");
    expect(screen.getByText(/assigned from the invoice number sequence/i)).toBeInTheDocument();
  });

  it("renders Arabic labels and locale-aware invoice totals", async () => {
    render(
      <AppLocaleProvider initialLocale="ar">
        <SalesInvoiceForm />
      </AppLocaleProvider>,
    );

    await waitFor(() => expect(screen.getByLabelText("رقم الفاتورة")).toHaveValue("INV-000042"));
    expect(screen.getByText("معاينة فقط. يتم تخصيص رقم الفاتورة من تسلسل أرقام الفواتير عند حفظ المسودة.")).toBeInTheDocument();
    expect(screen.getByLabelText("العميل")).toBeInTheDocument();
    expect(screen.getByText("سير عمل الفاتورة")).toBeInTheDocument();
    expect(screen.getByText("إجمالي الفاتورة")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "إنشاء فاتورة مسودة" })).toBeInTheDocument();
  });

  it("points the first invoice empty state to the dedicated customers page", async () => {
    apiRequestMock.mockImplementation((path: string) => {
      if (path === "/contacts") {
        return Promise.resolve([]);
      }
      if (path === "/items") {
        return Promise.resolve([]);
      }
      if (path === "/accounts") {
        return Promise.resolve([
          {
            id: "revenue-1",
            code: "401",
            name: "Sales revenue",
            type: "REVENUE",
            isActive: true,
            allowPosting: true,
          },
        ]);
      }
      if (path === "/tax-rates") {
        return Promise.resolve([]);
      }
      if (path === "/branches") {
        return Promise.resolve([]);
      }
      if (path === "/sales-invoices/next-number") {
        return Promise.resolve({
          invoiceNumber: "INV-000042",
          editable: false,
          overrideAllowed: false,
          helperText: "Preview only. The invoice number is assigned from the invoice number sequence when the draft is saved.",
        });
      }
      return Promise.reject(new Error(`Unexpected path ${path}`));
    });

    render(<SalesInvoiceForm />);

    expect(await screen.findByRole("link", { name: "Open customers" })).toHaveAttribute("href", "/customers");
  });

  it("uses returnTo from the edit route query string for cancel and post-save redirect", async () => {
    window.history.pushState({}, "", "/sales/invoices/invoice-1/edit?returnTo=/customers/customer-1");
    apiRequestMock.mockImplementation((path: string, options?: { method?: string }) => {
      if (path === "/sales-invoices/invoice-1" && options?.method === "PATCH") {
        return Promise.resolve({
          id: "invoice-1",
          invoiceNumber: "INV-000042",
          status: "DRAFT",
        });
      }
      if (path === "/contacts") {
        return Promise.resolve([
          contactFixture("customer-1", "Beta Customer"),
          contactFixture("customer-2", "Second Customer"),
        ]);
      }
      if (path === "/items") {
        return Promise.resolve([]);
      }
      if (path === "/accounts") {
        return Promise.resolve([
          {
            id: "revenue-1",
            code: "401",
            name: "Sales revenue",
            type: "REVENUE",
            isActive: true,
            allowPosting: true,
          },
        ]);
      }
      if (path === "/tax-rates") {
        return Promise.resolve([]);
      }
      if (path === "/branches") {
        return Promise.resolve([]);
      }
      return Promise.reject(new Error(`Unexpected path ${path}`));
    });

    render(
      <SalesInvoiceForm
        initialInvoice={
          {
            id: "invoice-1",
            organizationId: "org-1",
            invoiceNumber: "INV-000042",
            customerId: "customer-1",
            branchId: null,
            issueDate: "2026-06-11T00:00:00.000Z",
            dueDate: null,
            currency: "SAR",
            status: "DRAFT",
            taxMode: "TAX_EXCLUSIVE",
            subtotal: "100.0000",
            discountTotal: "0.0000",
            taxableTotal: "100.0000",
            taxTotal: "15.0000",
            total: "115.0000",
            balanceDue: "115.0000",
            notes: null,
            terms: null,
            finalizedAt: null,
            journalEntryId: null,
            reversalJournalEntryId: null,
            customer: { id: "customer-1", name: "Beta Customer", displayName: "Beta Customer", type: "CUSTOMER", taxNumber: null },
            journalEntry: null,
            reversalJournalEntry: null,
            paymentAllocations: [],
            paymentUnappliedAllocations: [],
            creditNoteAllocations: [],
            creditNotes: [],
            lines: [
              {
                id: "line-1",
                itemId: null,
                description: "Consulting",
                accountId: "revenue-1",
                quantity: "1.0000",
                unitPrice: "100.0000",
                discountRate: "0.0000",
                taxRateId: null,
              },
            ],
          } as any
        }
      />,
    );

    await waitFor(() => expect(screen.getByRole("link", { name: "Cancel" })).toHaveAttribute("href", "/customers/customer-1"));

    fireEvent.submit(screen.getByRole("button", { name: "Save changes" }).closest("form")!);

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/customers/customer-1"));
  });

  it("preserves an old foreign draft and requires an explicit rate before saving", () => {
    mockActiveOrganization = organizationFixture("AED");

    render(
      <SalesInvoiceForm
        initialInvoice={{
          id: "invoice-foreign",
          status: "DRAFT",
          currency: "SAR",
          customerId: "customer-1",
          branchId: null,
          issueDate: "2026-06-11T00:00:00.000Z",
          dueDate: null,
          taxMode: "TAX_EXCLUSIVE",
          notes: null,
          terms: null,
          lines: [],
        } as any}
      />,
    );

    expect(screen.getByLabelText("Transaction currency")).toHaveValue("SAR");
    expect(screen.getByText(/select a saved rate or enter a positive manual rate/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled();
  });
});

function contactFixture(id: string, name: string) {
  return {
    id,
    name,
    displayName: name,
    type: "CUSTOMER",
    email: null,
    phone: null,
    taxNumber: null,
    isActive: true,
  };
}

function organizationFixture(baseCurrency: string) {
  return {
    id: "org-1",
    name: "Test Organization",
    legalName: null,
    taxNumber: null,
    countryCode: baseCurrency === "AED" ? "AE" : "SA",
    baseCurrency,
    timezone: baseCurrency === "AED" ? "Asia/Dubai" : "Asia/Riyadh",
  };
}
