import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { AppLocaleProvider } from "@/components/app-locale-provider";
import { PartyStatementPage } from "./party-statement-page";
import type { CustomerPartyDetail, CustomerStatement, SupplierPartyDetail, SupplierStatement } from "@/lib/types";

const apiRequestMock = jest.fn();
const getCustomerMock = jest.fn();
const getSupplierMock = jest.fn();
let searchParams = new URLSearchParams();
let routeId = "customer-1";

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
  useParams: () => ({ id: routeId }),
  useRouter: () => ({ refresh: jest.fn() }),
  useSearchParams: () => searchParams,
}));

jest.mock("@/hooks/use-active-organization", () => ({
  useActiveOrganizationId: () => "org-1",
}));

jest.mock("@/lib/api", () => ({
  apiRequest: (...args: unknown[]) => apiRequestMock(...args),
}));

jest.mock("@/lib/pdf-download", () => ({
  downloadPdf: jest.fn(),
  statementPdfPath: jest.fn(() => "/documents/customer-statement.pdf"),
  supplierStatementPdfPath: jest.fn(() => "/documents/supplier-statement.pdf"),
}));

jest.mock("@/lib/parties", () => {
  const actual = jest.requireActual("@/lib/parties");
  return {
    ...actual,
    getCustomer: (...args: unknown[]) => getCustomerMock(...args),
    getSupplier: (...args: unknown[]) => getSupplierMock(...args),
  };
});

jest.mock("@/app/(app)/contacts/[id]/page", () => ({
  __esModule: true,
  CustomerStatementDocumentGuidance: () => <div>Customer statement guidance</div>,
  SupplierStatementDocumentGuidance: () => <div>Supplier statement guidance</div>,
  LedgerTable: ({
    rows,
    returnToHref,
  }: {
    rows: Array<unknown>;
    returnToHref?: string;
  }) => (
    <div data-testid="ledger-table" data-rows={rows.length} data-return-to={returnToHref ?? ""}>
      Ledger table
    </div>
  ),
}));

describe("party statement routes", () => {
  beforeEach(() => {
    searchParams = new URLSearchParams();
    routeId = "customer-1";
    apiRequestMock.mockReset();
    getCustomerMock.mockReset();
    getSupplierMock.mockReset();
  });

  it("renders the dedicated customer statement route with workspace-safe links", async () => {
    getCustomerMock.mockResolvedValue(customerDetail());

    render(<PartyStatementPage kind="customer" />);

    expect(await screen.findByRole("link", { name: "Back to customer workspace" })).toHaveAttribute("href", "/customers/customer-1");
    expect(screen.getByRole("link", { name: "Open shared contact ledger" })).toHaveAttribute(
      "href",
      "/contacts/customer-1?section=statement&returnTo=%2Fcustomers%2Fcustomer-1",
    );
    expect(await screen.findByRole("link", { name: "View AR activity" })).toHaveAttribute(
      "href",
      "/sales/customer-payments?customerId=customer-1&returnTo=%2Fcustomers%2Fcustomer-1%2Fstatement%3FreturnTo%3D%252Fcustomers%252Fcustomer-1",
    );
    expect(screen.getByRole("link", { name: "Aged receivables" })).toHaveAttribute(
      "href",
      "/reports/aged-receivables?returnTo=%2Fcustomers%2Fcustomer-1%2Fstatement%3FreturnTo%3D%252Fcustomers%252Fcustomer-1",
    );
  });

  it("loads customer statement rows and preserves the dedicated route as the drill-down return target", async () => {
    getCustomerMock.mockResolvedValue(customerDetail());
    apiRequestMock.mockResolvedValue(customerStatement());

    render(<PartyStatementPage kind="customer" />);

    const loadButton = await screen.findByRole("button", { name: "Load customer statement" });
    fireEvent.click(loadButton);

    await waitFor(() =>
      expect(apiRequestMock).toHaveBeenCalledWith(expect.stringMatching(/^\/contacts\/customer-1\/statement\?/)),
    );
    await waitFor(() =>
      expect(screen.getByTestId("ledger-table")).toHaveAttribute(
        "data-return-to",
        "/customers/customer-1/statement?returnTo=%2Fcustomers%2Fcustomer-1",
      ),
    );
  });

  it("labels statement balances in base currency and shows foreign document evidence separately", async () => {
    getCustomerMock.mockResolvedValue(customerDetail());
    apiRequestMock.mockResolvedValue({
      ...customerStatement(),
      baseCurrency: "AED",
      rows: [{
        id: "invoice-fx:invoice", type: "INVOICE", date: "2026-07-01T00:00:00.000Z", number: "INV-FX",
        description: "Invoice INV-FX", debit: "367.2500", credit: "0.0000", balance: "367.2500",
        sourceType: "SalesInvoice", sourceId: "invoice-fx", status: "FINALIZED",
        metadata: { currency: "USD", transactionTotal: "100.0000", transactionBalanceDue: "40.0000", sourceBaseBalanceDue: "146.9000", carryingBaseAmount: "150.0000", carryingRate: "3.75000000" },
      }],
    });

    render(<PartyStatementPage kind="customer" />);
    fireEvent.click(await screen.findByRole("button", { name: "Load customer statement" }));

    expect(await screen.findByText(/AED 10\.00 Dr/)).toBeInTheDocument();
    expect(screen.queryByText(/SAR 10\.00 Dr/)).not.toBeInTheDocument();
    expect(screen.getByText("INV-FX · USD")).toBeInTheDocument();
    expect(screen.getByText("$40.00 open · $100.00 original")).toBeInTheDocument();
    expect(screen.getByText(/AED\s+150\.00 carrying · AED\s+146\.90 source/)).toBeInTheDocument();
    expect(screen.getByText("Rate 3.75000000")).toBeInTheDocument();
  });

  it("renders Arabic customer statement copy while preserving workspace return links", async () => {
    getCustomerMock.mockResolvedValue(customerDetail());

    render(
      <AppLocaleProvider initialLocale="ar">
        <PartyStatementPage kind="customer" />
      </AppLocaleProvider>,
    );

    expect(await screen.findByRole("heading", { name: "نشاط كشف العميل" })).toBeInTheDocument();
    expect(screen.getByText("راجع صفوف كشف العميل المرحلة من مسار مساحة العمل المخصص مع إبقاء متابعة المدينين مرتبطة بمساحة العميل.")).toBeInTheDocument();
    expect(screen.getByText("مراجعة نشاط ضمن البيتا المضبوطة فقط. لا يضيف هذا المسار أي ادعاءات رسمية أو معتمدة أو مؤكدة بنكيا أو متعلقة بإقرار الضريبة أو امتثال زاتكا.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "العودة إلى مساحة العميل" })).toHaveAttribute("href", "/customers/customer-1");
    expect(screen.getByRole("link", { name: "عرض نشاط المدينين" })).toHaveAttribute(
      "href",
      "/sales/customer-payments?customerId=customer-1&returnTo=%2Fcustomers%2Fcustomer-1%2Fstatement%3FreturnTo%3D%252Fcustomers%252Fcustomer-1",
    );
    expect(screen.getByRole("button", { name: "تحميل كشف العميل" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "تنزيل PDF كشف العميل" })).toBeInTheDocument();
  });

  it("renders the dedicated supplier statement route with AP-safe links", async () => {
    routeId = "supplier-1";
    getSupplierMock.mockResolvedValue(supplierDetail());
    apiRequestMock.mockResolvedValue(supplierStatement());

    render(<PartyStatementPage kind="supplier" />);

    expect(await screen.findByRole("link", { name: "Back to supplier workspace" })).toHaveAttribute("href", "/suppliers/supplier-1");
    expect(screen.getByRole("link", { name: "View AP activity" })).toHaveAttribute(
      "href",
      "/purchases/supplier-payments?supplierId=supplier-1&returnTo=%2Fsuppliers%2Fsupplier-1%2Fstatement%3FreturnTo%3D%252Fsuppliers%252Fsupplier-1",
    );
    expect(screen.getByRole("link", { name: "Aged payables" })).toHaveAttribute(
      "href",
      "/reports/aged-payables?returnTo=%2Fsuppliers%2Fsupplier-1%2Fstatement%3FreturnTo%3D%252Fsuppliers%252Fsupplier-1",
    );
  });
});

function customerDetail(): CustomerPartyDetail {
  return {
    contact: {
      id: "customer-1",
      organizationId: "org-1",
      type: "CUSTOMER",
      name: "Alpha Customer",
      displayName: "Alpha Customer",
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
    },
    openReceivableBalance: "120.0000",
    overdueReceivableBalance: "20.0000",
    lastTransactionDate: "2026-06-12T00:00:00.000Z",
    notes: null,
    transactions: [],
  };
}

function customerStatement(): CustomerStatement {
  return {
    contact: {
      id: "customer-1",
      name: "Alpha Customer",
      displayName: "Alpha Customer",
      type: "CUSTOMER",
      email: "alpha@example.com",
      phone: "0500000000",
      taxNumber: null,
    },
    openingBalance: "10.0000",
    closingBalance: "20.0000",
    periodFrom: "2026-05-01",
    periodTo: "2026-06-12",
    rows: [],
  };
}

function supplierDetail(): SupplierPartyDetail {
  return {
    contact: {
      id: "supplier-1",
      organizationId: "org-1",
      type: "SUPPLIER",
      name: "Beta Supplier",
      displayName: "Beta Supplier",
      email: "beta@example.com",
      phone: "0500000001",
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
    },
    openPayableBalance: "140.0000",
    overduePayableBalance: "40.0000",
    lastTransactionDate: "2026-06-12T00:00:00.000Z",
    paymentNotes: null,
    transactions: [],
  };
}

function supplierStatement(): SupplierStatement {
  return {
    contact: {
      id: "supplier-1",
      name: "Beta Supplier",
      displayName: "Beta Supplier",
      type: "SUPPLIER",
      email: "beta@example.com",
      phone: "0500000001",
      taxNumber: null,
    },
    openingBalance: "30.0000",
    closingBalance: "15.0000",
    periodFrom: "2026-05-01",
    periodTo: "2026-06-12",
    rows: [],
  };
}
