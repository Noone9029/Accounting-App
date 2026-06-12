import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import ContactDetailPage, { CustomerLedgerGuidance, CustomerStatementDocumentGuidance, LedgerTable, SupplierLedgerGuidance, SupplierStatementDocumentGuidance } from "./page";
import type { Contact, CustomerLedger, CustomerLedgerRow, SupplierLedger, SupplierLedgerRow } from "@/lib/types";

const apiRequestMock = jest.fn();
const canMock = jest.fn((_: string) => true);
let searchParamsMock = new URLSearchParams();

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
  useParams: () => ({ id: "contact-1" }),
  useSearchParams: () => searchParamsMock,
}));

jest.mock("@/hooks/use-active-organization", () => ({
  useActiveOrganizationId: () => "org-1",
}));

jest.mock("@/components/permissions/permission-provider", () => ({
  usePermissions: () => ({
    can: (permission: string) => canMock(permission),
  }),
}));

jest.mock("@/lib/api", () => ({
  apiRequest: (...args: unknown[]) => apiRequestMock(...args),
}));

describe("ContactDetailPage workspace handoff", () => {
  beforeEach(() => {
    apiRequestMock.mockReset();
    canMock.mockReset();
    canMock.mockReturnValue(true);
    searchParamsMock = new URLSearchParams();
  });

  it("shows the customer workspace handoff for customer contacts", async () => {
    apiRequestMock.mockImplementation((path: string) => {
      if (path === "/contacts/contact-1") {
        return Promise.resolve(contactFixture({ type: "CUSTOMER" }));
      }
      if (path === "/contacts/contact-1/ledger") {
        return Promise.resolve(customerLedgerFixture());
      }
      return Promise.reject(new Error(`Unexpected path ${path}`));
    });

    render(<ContactDetailPage />);

    expect(await screen.findByRole("link", { name: "Customer workspace" })).toHaveAttribute("href", "/customers/contact-1");
    expect(screen.queryByRole("link", { name: "Supplier workspace" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to contacts" })).toHaveAttribute("href", "/contacts");
  });

  it("shows both workspace buttons for mixed contacts", async () => {
    apiRequestMock.mockImplementation((path: string) => {
      if (path === "/contacts/contact-1") {
        return Promise.resolve(contactFixture({ type: "BOTH" }));
      }
      if (path === "/contacts/contact-1/ledger") {
        return Promise.resolve(customerLedgerFixture());
      }
      if (path === "/contacts/contact-1/supplier-ledger") {
        return Promise.resolve(supplierLedgerFixture());
      }
      return Promise.reject(new Error(`Unexpected path ${path}`));
    });

    render(<ContactDetailPage />);

    expect(await screen.findByText(/appears in both customer and supplier workspaces/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Customer workspace" })).toHaveAttribute("href", "/customers/contact-1");
    expect(screen.getByRole("link", { name: "Supplier workspace" })).toHaveAttribute("href", "/suppliers/contact-1");
  });

  it("opens the customer statement tab with workspace-aware handoff actions", async () => {
    searchParamsMock = new URLSearchParams("section=statement&returnTo=/customers/contact-1");
    apiRequestMock.mockImplementation((path: string) => {
      if (path === "/contacts/contact-1") {
        return Promise.resolve(contactFixture({ type: "CUSTOMER" }));
      }
      if (path === "/contacts/contact-1/ledger") {
        return Promise.resolve(customerLedgerFixture());
      }
      return Promise.reject(new Error(`Unexpected path ${path}`));
    });

    render(<ContactDetailPage />);

    expect(await screen.findByRole("link", { name: "Back to workspace" })).toHaveAttribute("href", "/customers/contact-1");
    expect(await screen.findByRole("link", { name: "Open customer workspace" })).toHaveAttribute("href", "/customers/contact-1");
    expect(await screen.findByRole("link", { name: "Customer statement activity" })).toHaveAttribute(
      "href",
      "/customers/contact-1/statement?returnTo=%2Fcustomers%2Fcontact-1",
    );
    expect(await screen.findByRole("link", { name: "View AR activity" })).toHaveAttribute(
      "href",
      "/sales/customer-payments?customerId=contact-1&returnTo=%2Fcustomers%2Fcontact-1%2Fstatement%3FreturnTo%3D%252Fcustomers%252Fcontact-1",
    );
    expect(screen.getByRole("link", { name: "Aged receivables" })).toHaveAttribute(
      "href",
      "/reports/aged-receivables?returnTo=%2Fcustomers%2Fcontact-1%2Fstatement%3FreturnTo%3D%252Fcustomers%252Fcontact-1",
    );
  });
});

describe("customer ledger drill-down guidance", () => {
  it("explains payment impact and links to the next customer workflow steps", () => {
    render(<CustomerLedgerGuidance contactId="customer-1" closingBalance="0.0000" rowCount={2} />);

    expect(screen.getByText("What changed after payment?")).toBeInTheDocument();
    expect(screen.getByText(/Finalized invoices increase the amount owed/)).toBeInTheDocument();
    expect(screen.getByText(/payments, credit notes, and refunds reduce or reverse it/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Create invoice" })).toHaveAttribute("href", "/sales/invoices/new?customerId=customer-1");
    expect(screen.getByRole("link", { name: "Record payment" })).toHaveAttribute("href", "/sales/customer-payments/new?customerId=customer-1");
    expect(screen.getByRole("link", { name: "AR report" })).toHaveAttribute("href", "/reports/aged-receivables");
    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute("href", "/dashboard");
  });

  it("renders a helpful empty state for a customer without ledger rows", () => {
    render(<LedgerTable rows={[]} emptyMessage="No customer ledger activity yet." ledgerKind="customer" contactId="customer-1" />);

    expect(screen.getByText("No customer ledger activity yet.")).toBeInTheDocument();
    expect(screen.getByText(/Create and finalize an invoice/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Create invoice" })).toHaveAttribute("href", "/sales/invoices/new?customerId=customer-1");
    expect(screen.getByRole("link", { name: "Record payment" })).toHaveAttribute("href", "/sales/customer-payments/new?customerId=customer-1");
    expect(screen.getByRole("link", { name: "Open AR report" })).toHaveAttribute("href", "/reports/aged-receivables");
  });

  it("uses readable row labels and status badges instead of raw ledger enums", () => {
    render(<LedgerTable rows={[ledgerRow()]} emptyMessage="No customer ledger activity yet." ledgerKind="customer" contactId="customer-1" />);

    expect(screen.getByText(/Debit adds to the customer balance/)).toBeInTheDocument();
    expect(screen.getByText("Payment allocation")).toBeInTheDocument();
    expect(screen.getByText("Posted")).toBeInTheDocument();
    expect(screen.queryByText("PAYMENT_ALLOCATION")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View invoice" })).toHaveAttribute("href", "/sales/invoices/invoice-1");
  });

  it("preserves statement return context on row drill-down links", () => {
    render(
      <LedgerTable
        rows={[ledgerRow()]}
        emptyMessage="No customer ledger activity yet."
        ledgerKind="customer"
        contactId="customer-1"
        returnToHref="/contacts/contact-1?section=statement&returnTo=%2Fcustomers%2Fcontact-1"
      />,
    );

    expect(screen.getByRole("link", { name: "View invoice" })).toHaveAttribute(
      "href",
      "/sales/invoices/invoice-1?returnTo=%2Fcontacts%2Fcontact-1%3Fsection%3Dstatement%26returnTo%3D%252Fcustomers%252Fcontact-1",
    );
  });

  it("explains supplier ledger impact and links to AP actions", () => {
    render(<SupplierLedgerGuidance contactId="supplier-1" closingBalance="250.0000" rowCount={3} />);

    expect(screen.getByText("What changed after supplier payment?")).toBeInTheDocument();
    expect(screen.getByText(/Finalized purchase bills increase what you owe/)).toBeInTheDocument();
    expect(screen.getByText(/Supplier payments, debit notes, refunds, and reversals/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Create bill" })).toHaveAttribute("href", "/purchases/bills/new?supplierId=supplier-1");
    expect(screen.getByRole("link", { name: "Record supplier payment" })).toHaveAttribute("href", "/purchases/supplier-payments/new?supplierId=supplier-1");
    expect(screen.getByRole("link", { name: "AP report" })).toHaveAttribute("href", "/reports/aged-payables");
  });

  it("renders supplier ledger empty state with AP next actions", () => {
    render(<LedgerTable rows={[]} emptyMessage="No supplier ledger activity found." ledgerKind="supplier" contactId="supplier-1" />);

    expect(screen.getByText("No supplier ledger activity found.")).toBeInTheDocument();
    expect(screen.getByText(/Post a supplier bill or supplier payment/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Create bill" })).toHaveAttribute("href", "/purchases/bills/new?supplierId=supplier-1");
    expect(screen.getByRole("link", { name: "Record supplier payment" })).toHaveAttribute("href", "/purchases/supplier-payments/new?supplierId=supplier-1");
    expect(screen.getByRole("link", { name: "Open AP report" })).toHaveAttribute("href", "/reports/aged-payables");
  });

  it("uses supplier-safe debit and credit helper copy", () => {
    render(<LedgerTable rows={[supplierLedgerRow()]} emptyMessage="No supplier ledger activity found." ledgerKind="supplier" contactId="supplier-1" />);

    expect(screen.getByText(/posted supplier ledger rows exactly/)).toBeInTheDocument();
    expect(screen.getAllByText("Supplier payment").length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: "View payment" })).toHaveAttribute("href", "/purchases/supplier-payments/supplier-payment-1");
  });

  it("explains customer statement PDF archive behavior", () => {
    render(<CustomerStatementDocumentGuidance />);

    expect(screen.getByText(/Customer statements show invoices that increase what customers owe/)).toBeInTheDocument();
    expect(screen.getByText(/PDF downloads from source records are archived automatically/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open archive" })).toHaveAttribute("href", "/documents");
  });

  it("keeps supplier statement export wording honest for beta", () => {
    render(<SupplierStatementDocumentGuidance />);

    expect(screen.getByText(/Supplier statements show purchase bills that increase what you owe suppliers/)).toBeInTheDocument();
    expect(screen.getByText(/supplier payments and debit notes reduce or adjust that payable balance/)).toBeInTheDocument();
    expect(screen.getByText(/Supplier statement PDF downloads are archived automatically/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open archive" })).toHaveAttribute("href", "/documents");
    expect(screen.getByText(/production compliance are not enabled/)).toBeInTheDocument();
    expect(screen.queryByText(/production submission is connected/i)).not.toBeInTheDocument();
  });
});

function ledgerRow(overrides: Partial<CustomerLedgerRow> = {}): CustomerLedgerRow {
  return {
    id: "ledger-row-1",
    type: "PAYMENT_ALLOCATION",
    date: "2026-05-21T00:00:00.000Z",
    number: "CP-001",
    description: "Payment allocation to INV-001",
    debit: "0.0000",
    credit: "115.0000",
    balance: "0.0000",
    sourceType: "CustomerPaymentAllocation",
    sourceId: "allocation-1",
    status: "POSTED",
    metadata: { invoiceId: "invoice-1" },
    ...overrides,
  };
}

function supplierLedgerRow(overrides: Partial<SupplierLedgerRow> = {}): SupplierLedgerRow {
  return {
    id: "supplier-ledger-row-1",
    type: "SUPPLIER_PAYMENT",
    date: "2026-05-21T00:00:00.000Z",
    number: "SP-001",
    description: "Supplier payment",
    debit: "115.0000",
    credit: "0.0000",
    balance: "0.0000",
    sourceType: "SupplierPayment",
    sourceId: "supplier-payment-1",
    status: "POSTED",
    metadata: {},
    ...overrides,
  };
}

function contactFixture(overrides: Partial<Contact> = {}): Contact {
  return {
    id: "contact-1",
    organizationId: "org-1",
    type: "CUSTOMER",
    name: "Alpha Contact",
    displayName: "Alpha Contact",
    email: "alpha@example.com",
    phone: "0500000000",
    taxNumber: null,
    addressLine1: null,
    addressLine2: null,
    buildingNumber: null,
    district: null,
    city: null,
    postalCode: null,
    countryCode: "SA",
    identificationType: null,
    identificationNumber: null,
    isActive: true,
    ...overrides,
  };
}

function customerLedgerFixture(): CustomerLedger {
  const contact = contactFixture({ type: "CUSTOMER" });
  return {
    contact,
    openingBalance: "0.0000",
    closingBalance: "0.0000",
    rows: [],
  };
}

function supplierLedgerFixture(): SupplierLedger {
  const contact = contactFixture({ type: "SUPPLIER" });
  return {
    contact,
    openingBalance: "0.0000",
    closingBalance: "0.0000",
    rows: [],
  };
}
