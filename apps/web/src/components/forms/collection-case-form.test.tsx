import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { AppLocaleProvider } from "@/components/app-locale-provider";
import { CollectionCaseForm } from "./collection-case-form";
import type { CollectionCase, Contact, SalesInvoice } from "@/lib/types";

const apiRequestMock = jest.fn();
const pushMock = jest.fn();

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
  useSearchParams: () => new URLSearchParams("customerId=customer-1&invoiceId=invoice-1&returnTo=/sales/invoices/invoice-1"),
}));

jest.mock("@/hooks/use-active-organization", () => ({
  useActiveOrganizationId: () => "org-1",
}));

jest.mock("@/lib/api", () => ({
  apiRequest: (...args: unknown[]) => apiRequestMock(...args),
}));

describe("CollectionCaseForm", () => {
  beforeEach(() => {
    apiRequestMock.mockReset();
    pushMock.mockReset();
  });

  it("loads customers/open invoices, preserves safe wording, and creates a collection case", async () => {
    apiRequestMock.mockImplementation((path: string, options?: { method?: string; body?: unknown }) => {
      if (path === "/contacts") {
        return Promise.resolve([customerFixture()]);
      }
      if (path === "/collections/next-number") {
        return Promise.resolve({ caseNumber: "COL-000001", helperText: "Assigned from sequence." });
      }
      if (path === "/sales-invoices/open?customerId=customer-1") {
        return Promise.resolve([invoiceFixture()]);
      }
      if (path === "/collections" && options?.method === "POST") {
        expect(options.body).toEqual(expect.objectContaining({
          customerId: "customer-1",
          salesInvoiceId: "invoice-1",
          promisedAmount: "75",
        }));
        return Promise.resolve(collectionCaseFixture());
      }
      return Promise.reject(new Error(`Unexpected path ${path}`));
    });

    render(<CollectionCaseForm />);

    expect(await screen.findByDisplayValue("COL-000001")).toBeInTheDocument();
    expect((await screen.findAllByText(/INV-000010/)).length).toBeGreaterThan(0);
    expect(screen.getByText(/do not post journals, allocate payments, send email or reminders, create payment links, file VAT, call ZATCA, or change invoice balances/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Promised amount"), { target: { value: "75" } });
    fireEvent.click(screen.getByRole("button", { name: "Create collection case" }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/sales/invoices/invoice-1"));
  });

  it("renders Arabic collection case form labels and actions", async () => {
    apiRequestMock.mockImplementation((path: string) => {
      if (path === "/contacts") {
        return Promise.resolve([customerFixture()]);
      }
      if (path === "/collections/next-number") {
        return Promise.resolve({ caseNumber: "COL-000001", helperText: "Assigned from sequence." });
      }
      if (path === "/sales-invoices/open?customerId=customer-1") {
        return Promise.resolve([invoiceFixture()]);
      }
      return Promise.reject(new Error(`Unexpected path ${path}`));
    });

    render(
      <AppLocaleProvider initialLocale="ar">
        <CollectionCaseForm />
      </AppLocaleProvider>,
    );

    expect(await screen.findByDisplayValue("COL-000001")).toBeInTheDocument();
    expect(screen.getByText("حالة تحصيل جديدة")).toBeInTheDocument();
    expect(screen.getByLabelText("رقم حالة التحصيل")).toBeInTheDocument();
    expect(screen.getByText("الفاتورة المستحقة")).toBeInTheDocument();
    expect(screen.getByText("مخصص من التسلسل.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "إنشاء حالة تحصيل" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "إلغاء" })).toHaveAttribute("href", "/sales/collections");
  });

  it("locks terminal cases from normal edits", () => {
    apiRequestMock.mockImplementation((path: string) => {
      if (path === "/contacts") {
        return Promise.resolve([customerFixture()]);
      }
      if (path === "/sales-invoices/open?customerId=customer-1") {
        return Promise.resolve([invoiceFixture()]);
      }
      return Promise.resolve(null);
    });
    render(<CollectionCaseForm initialCase={collectionCaseFixture({ status: "CLOSED" })} />);

    expect(screen.getByText("Collection case cannot be edited")).toBeInTheDocument();
    expect(screen.getByText(/Closed or cancelled collection cases are locked/)).toBeInTheDocument();
  });
});

function customerFixture(overrides: Partial<Contact> = {}): Contact {
  return {
    id: "customer-1",
    organizationId: "org-1",
    type: "CUSTOMER",
    name: "Beta Customer",
    displayName: "Beta Customer",
    email: null,
    phone: null,
    taxNumber: null,
    identificationType: null,
    identificationNumber: null,
    addressLine1: null,
    addressLine2: null,
    buildingNumber: null,
    district: null,
    city: null,
    countryCode: "SA",
    postalCode: null,
    isActive: true,
    ...overrides,
  };
}

function invoiceFixture(overrides: Partial<SalesInvoice> = {}): SalesInvoice {
  return {
    id: "invoice-1",
    organizationId: "org-1",
    invoiceNumber: "INV-000010",
    customerId: "customer-1",
    branchId: null,
    issueDate: "2026-05-01T00:00:00.000Z",
    dueDate: "2026-06-01T00:00:00.000Z",
    currency: "SAR",
    status: "FINALIZED",
    taxMode: "TAX_EXCLUSIVE",
    subtotal: "100.0000",
    discountTotal: "0.0000",
    taxableTotal: "100.0000",
    taxTotal: "15.0000",
    total: "115.0000",
    balanceDue: "115.0000",
    notes: null,
    terms: null,
    finalizedAt: "2026-05-01T00:00:00.000Z",
    journalEntryId: "journal-1",
    reversalJournalEntryId: null,
    customer: customerFixture(),
    journalEntry: null,
    reversalJournalEntry: null,
    paymentAllocations: [],
    paymentUnappliedAllocations: [],
    creditNoteAllocations: [],
    creditNotes: [],
    lines: [],
    ...overrides,
  };
}

function collectionCaseFixture(overrides: Partial<CollectionCase> = {}): CollectionCase {
  return {
    id: "case-1",
    organizationId: "org-1",
    caseNumber: "COL-000001",
    customerId: "customer-1",
    salesInvoiceId: "invoice-1",
    status: "OPEN",
    priority: "NORMAL",
    followUpDate: "2026-06-08T00:00:00.000Z",
    promisedPaymentDate: null,
    promisedAmount: null,
    assignedToUserId: null,
    lastActivityAt: null,
    nextActionAt: "2026-06-08T00:00:00.000Z",
    summary: null,
    notes: null,
    createdById: "user-1",
    updatedById: "user-1",
    createdAt: "2026-06-04T00:00:00.000Z",
    updatedAt: "2026-06-04T00:00:00.000Z",
    customer: customerFixture(),
    salesInvoice: invoiceFixture(),
    assignedTo: null,
    createdBy: null,
    updatedBy: null,
    activities: [],
    ...overrides,
  };
}
