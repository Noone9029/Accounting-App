import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { AppLocaleProvider } from "@/components/app-locale-provider";
import {
  PartyActivitySummary,
  PartyListPage,
  SupplierApSummaryPanel,
  SupplierGroupedActivityTables,
} from "./party-pages";
import type {
  CustomerPartyDetail,
  PartyTransaction,
  SupplierApDetailSummary,
  SupplierPartyDetail,
} from "@/lib/types";

const apiRequestMock = jest.fn();
const canMock = jest.fn();

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({
    href,
    children,
    ...props
  }: AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string;
    children: ReactNode;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

jest.mock("next/navigation", () => ({
  useParams: () => ({ id: "party-1" }),
  useRouter: () => ({ refresh: jest.fn() }),
}));

jest.mock("@/components/permissions/permission-provider", () => ({
  usePermissions: () => ({ can: (permission: string) => canMock(permission) }),
}));

jest.mock("@/hooks/use-active-organization", () => ({
  useActiveOrganizationId: () => "org-1",
}));

jest.mock("@/lib/api", () => ({
  apiRequest: (...args: unknown[]) => apiRequestMock(...args),
}));

describe("PartyListPage", () => {
  beforeEach(() => {
    apiRequestMock.mockReset();
    apiRequestMock.mockResolvedValue([]);
    canMock.mockReset();
    canMock.mockReturnValue(false);
  });

  it("hides the add-customer action without contact management permission", async () => {
    render(
      <AppLocaleProvider initialLocale="en">
        <PartyListPage kind="customer" />
      </AppLocaleProvider>,
    );

    expect(
      await screen.findByRole("heading", { name: "Customers" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Add customer" }),
    ).not.toBeInTheDocument();
  });
});

describe("Supplier AP detail panels", () => {
  it("renders supplier AP summary metrics, recent activity, and read-only non-posting wording", () => {
    render(<SupplierApSummaryPanel summary={supplierApSummary()} />);

    expect(screen.getByText("Supplier AP Summary")).toBeInTheDocument();
    expect(screen.getByText("Outstanding payable balance")).toBeInTheDocument();
    expect(screen.getByText("Overdue bills")).toBeInTheDocument();
    expect(screen.getByText("Open purchase orders")).toBeInTheDocument();
    expect(
      screen.getByText("Purchase receipts pending bill"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Purchase bills pending receipt"),
    ).toBeInTheDocument();
    expect(screen.getByText("Open purchase returns")).toBeInTheDocument();
    expect(screen.getByText("Open matching reviews")).toBeInTheDocument();
    expect(screen.getByText("Valuation variance previews")).toBeInTheDocument();
    expect(screen.getByText(/This panel is read-only/i)).toBeInTheDocument();
    expect(
      screen.getByText(
        /Purchase returns are operational\/non-posting activity/i,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Supplier payment")).toBeInTheDocument();
    expect(screen.getByText("Purchase return")).toBeInTheDocument();
    expect(screen.getByText("Non-posting")).toBeInTheDocument();
    expect(
      screen.queryByText(
        /email sent|supplier paid|payment scheduled|journal posted|variance booked|landed cost allocated|VAT filed|ZATCA cleared/i,
      ),
    ).not.toBeInTheDocument();
  });

  it("renders supplier AP summary labels in Arabic when the app locale is Arabic", () => {
    render(
      <AppLocaleProvider initialLocale="ar">
        <SupplierApSummaryPanel summary={supplierApSummary()} />
      </AppLocaleProvider>,
    );

    expect(screen.getByText("ملخص الموردين الدائنين")).toBeInTheDocument();
    expect(screen.getByText("رصيد دائن قائم")).toBeInTheDocument();
    expect(screen.getByText("فواتير مستلمة متأخرة")).toBeInTheDocument();
    expect(screen.getByText("نشاط حديث")).toBeInTheDocument();
    expect(screen.getByText("ترحيل مالي")).toBeInTheDocument();
    expect(screen.getByText("غير مرحل")).toBeInTheDocument();
  });

  it("groups supplier transactions into financial posting and operational non-posting activity", () => {
    render(
      <SupplierGroupedActivityTables
        transactions={supplierTransactions()}
        emptyLabel="No supplier transactions."
      />,
    );

    expect(screen.getByText("Financial posting activity")).toBeInTheDocument();
    expect(
      screen.getByText("Operational/non-posting activity"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Operational rows help track purchasing work/i),
    ).toBeInTheDocument();
    expect(screen.getByText("Bill")).toBeInTheDocument();
    expect(screen.getByText("Purchase return")).toBeInTheDocument();
    expect(screen.getByText("Financial posting")).toBeInTheDocument();
    expect(screen.getByText("Non-posting")).toBeInTheDocument();
    expect(
      screen
        .getAllByRole("link", { name: "View" })
        .map((link) => link.getAttribute("href")),
    ).toEqual(
      expect.arrayContaining([
        "/purchases/bills/bill-1",
        "/purchases/returns/return-1",
      ]),
    );
  });

  it("renders grouped empty state", () => {
    render(
      <SupplierGroupedActivityTables
        transactions={[]}
        emptyLabel="No supplier transactions."
      />,
    );

    expect(screen.getByText("No supplier transactions.")).toBeInTheDocument();
  });
});

describe("Party activity summary statement entry points", () => {
  it("adds a direct customer statement activity card with workspace return context", () => {
    render(<PartyActivitySummary detail={customerDetail()} kind="customer" />);

    expect(
      screen.getByRole("link", {
        name: "Customer statement activity Statement",
      }),
    ).toHaveAttribute(
      "href",
      "/customers/customer-1/statement?returnTo=%2Fcustomers%2Fcustomer-1",
    );
    expect(
      screen.getByRole("link", { name: "Open shared contact ledger" }),
    ).toHaveAttribute("href", "/contacts/customer-1");
  });

  it("adds a direct supplier statement activity card with workspace return context", () => {
    render(<PartyActivitySummary detail={supplierDetail()} kind="supplier" />);

    expect(
      screen.getByRole("link", {
        name: "Supplier statement activity Statement",
      }),
    ).toHaveAttribute(
      "href",
      "/suppliers/supplier-1/statement?returnTo=%2Fsuppliers%2Fsupplier-1",
    );
    expect(
      screen.getByRole("link", { name: "Open shared contact ledger" }),
    ).toHaveAttribute("href", "/contacts/supplier-1");
  });

  it("renders customer activity summary labels in Arabic while preserving links", () => {
    render(
      <AppLocaleProvider initialLocale="ar">
        <PartyActivitySummary detail={customerDetail()} kind="customer" />
      </AppLocaleProvider>,
    );

    expect(screen.getByText("رؤية دفتر العميل")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "نشاط كشف العميل كشف" }),
    ).toHaveAttribute(
      "href",
      "/customers/customer-1/statement?returnTo=%2Fcustomers%2Fcustomer-1",
    );
    expect(
      screen.getByRole("link", { name: "فتح دفتر جهة الاتصال المشترك" }),
    ).toHaveAttribute("href", "/contacts/customer-1");
  });
});

function supplierApSummary(): SupplierApDetailSummary {
  return {
    readOnly: true,
    noMutation: true,
    noPostingEffect: true,
    noInventoryEffect: true,
    supplierId: "supplier-1",
    outstandingPayableBalance: "150.0000",
    overdueBillsTotal: "100.0000",
    overdueBillCount: 1,
    openPurchaseOrders: 2,
    purchaseReceiptsPendingBill: 1,
    purchaseBillsPendingReceipt: 1,
    openPurchaseReturns: 1,
    openMatchingReviews: 2,
    valuationVariancePreviews: 1,
    helperText:
      "Operational rows help track purchasing work. They do not change the supplier payable balance unless a posting document, payment, debit note, or refund is recorded separately.",
    recentApActivity: [
      {
        id: "activity-1",
        sourceType: "SupplierPayment",
        sourceId: "payment-1",
        sourceNumber: "SP-000001",
        supplierId: "supplier-1",
        supplierName: "Alpha Supplier",
        supplierHref: "/suppliers/supplier-1",
        href: "/purchases/supplier-payments/payment-1",
        date: "2026-06-05T00:00:00.000Z",
        status: "POSTED",
        amount: "20.0000",
        label: "Supplier payment",
        category: "financialPosting",
        nonPosting: false,
      },
      {
        id: "activity-2",
        sourceType: "PurchaseReturn",
        sourceId: "return-1",
        sourceNumber: "PRN-000001",
        supplierId: "supplier-1",
        supplierName: "Alpha Supplier",
        supplierHref: "/suppliers/supplier-1",
        href: "/purchases/returns/return-1",
        date: "2026-06-04T00:00:00.000Z",
        status: "SUBMITTED",
        amount: null,
        label: "Purchase return",
        category: "operationalNonPosting",
        nonPosting: true,
      },
    ],
  };
}

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
    openReceivableBalance: "150.0000",
    overdueReceivableBalance: "20.0000",
    lastTransactionDate: "2026-06-05T00:00:00.000Z",
    notes: null,
    transactions: [
      transaction({
        sourceType: "CustomerPayment",
        sourceId: "payment-1",
        type: "Payment",
        balanceDue: "0.0000",
      }),
    ],
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
    openPayableBalance: "150.0000",
    overduePayableBalance: "20.0000",
    lastTransactionDate: "2026-06-05T00:00:00.000Z",
    paymentNotes: null,
    transactions: [
      transaction({
        sourceType: "SupplierPayment",
        sourceId: "payment-1",
        type: "Supplier payment",
        balanceDue: "0.0000",
      }),
    ],
  };
}

function supplierTransactions(): PartyTransaction[] {
  return [
    transaction({
      id: "bill-row",
      sourceType: "PurchaseBill",
      sourceId: "bill-1",
      type: "Bill",
      transactionNumber: "BILL-000001",
      balanceDue: "150.0000",
    }),
    transaction({
      id: "return-row",
      sourceType: "PurchaseReturn",
      sourceId: "return-1",
      type: "Purchase return",
      transactionNumber: "PRN-000001",
      balanceDue: "0.0000",
      status: "SUBMITTED",
    }),
  ];
}

function transaction(overrides: Partial<PartyTransaction>): PartyTransaction {
  return {
    id: "transaction",
    sourceType: "PurchaseBill",
    sourceId: "source",
    date: "2026-06-05T00:00:00.000Z",
    dueDate: null,
    type: "Bill",
    transactionNumber: "BILL-000001",
    currency: "SAR",
    subtotal: "100.0000",
    taxAmount: "15.0000",
    total: "115.0000",
    balanceDue: "115.0000",
    status: "FINALIZED",
    ...overrides,
  };
}
