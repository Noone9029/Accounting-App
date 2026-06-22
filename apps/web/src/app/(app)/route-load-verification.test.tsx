import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import BankAccountsPage from "./bank-accounts/page";
import BankTransfersPage from "./bank-transfers/page";
import ContactsPage from "./contacts/page";
import CustomersPage from "./customers/page";
import CustomerDetailPage from "./customers/[id]/page";
import InventoryBalancesPage from "./inventory/balances/page";
import PurchaseBillsPage from "./purchases/bills/page";
import NewPurchaseBillPage from "./purchases/bills/new/page";
import PurchaseDebitNotesPage from "./purchases/debit-notes/page";
import NewPurchaseDebitNotePage from "./purchases/debit-notes/new/page";
import ReportsPage from "./reports/page";
import SalesCreditNotesPage from "./sales/credit-notes/page";
import SalesInvoicesPage from "./sales/invoices/page";
import NewSalesInvoicePage from "./sales/invoices/new/page";
import SalesInventoryReturnsPage from "./sales/inventory-returns/page";
import SalesQuotesPage from "./sales/quotes/page";
import BankingAccountingSettingsPage from "./settings/banking-accounting/page";
import SettingsPage from "./settings/page";
import StorageSettingsPage from "./settings/storage/page";
import SuppliersPage from "./suppliers/page";
import SupplierDetailPage from "./suppliers/[id]/page";
import SetupPage from "./setup/page";
import PlaceholderPage from "./[...placeholder]/page";

const apiRequestMock = jest.fn();
const canMock = jest.fn((_: string) => true);
const canAnyMock = jest.fn((..._: string[]) => true);
const redirectMock = jest.fn();
const partyListPageMock = jest.fn(({ kind }: { kind: string }) => <div data-testid={`party-list-${kind}`}>{kind}</div>);
const partyDetailPageMock = jest.fn(({ kind }: { kind: string }) => <div data-testid={`party-detail-${kind}`}>{kind}</div>);
const reportsIndexPageMock = jest.fn(() => <div data-testid="reports-index-page">reports-index</div>);

let organizationId: string | null = null;

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
  redirect: (...args: unknown[]) => redirectMock(...args),
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock("@/hooks/use-active-organization", () => ({
  useActiveOrganizationId: () => organizationId,
}));

jest.mock("@/components/permissions/permission-provider", () => ({
  usePermissions: () => ({
    can: (permission: string) => canMock(permission),
    canAny: (...permissions: string[]) => canAnyMock(...permissions),
    activeMembership: { role: { permissions: [] } },
  }),
}));

jest.mock("@/lib/api", () => ({
  apiRequest: (...args: unknown[]) => apiRequestMock(...args),
}));

jest.mock("@/components/parties/party-pages", () => ({
  PartyListPage: (props: { kind: string }) => partyListPageMock(props),
  PartyDetailPage: (props: { kind: string }) => partyDetailPageMock(props),
}));

jest.mock("@/components/reports/report-pages", () => ({
  ReportsIndexPage: () => reportsIndexPageMock(),
}));

jest.mock("@/components/forms/sales-invoice-form", () => ({
  SalesInvoiceForm: () => <div data-testid="sales-invoice-form">sales-invoice-form</div>,
}));

jest.mock("@/components/forms/purchase-bill-form", () => ({
  PurchaseBillForm: () => <div data-testid="purchase-bill-form">purchase-bill-form</div>,
}));

jest.mock("@/components/forms/purchase-debit-note-form", () => ({
  PurchaseDebitNoteForm: () => <div data-testid="purchase-debit-note-form">purchase-debit-note-form</div>,
}));

describe("controlled beta route-load verification batch", () => {
  beforeEach(() => {
    organizationId = null;
    apiRequestMock.mockReset();
    canMock.mockReset();
    canMock.mockReturnValue(true);
    canAnyMock.mockReset();
    canAnyMock.mockReturnValue(true);
    redirectMock.mockReset();
    partyListPageMock.mockClear();
    partyDetailPageMock.mockClear();
    reportsIndexPageMock.mockClear();
  });

  it("loads the setup route safely without an organization", () => {
    render(<SetupPage />);

    expect(screen.getByText("Log in and select an organization to open guided setup.")).toBeInTheDocument();
    expect(apiRequestMock).not.toHaveBeenCalled();
  });

  it("loads placeholder routes as planned and non-actionable", async () => {
    render(await PlaceholderPage({ params: Promise.resolve({ placeholder: ["fixed-assets"] }) }));

    expect(screen.getByRole("heading", { name: "Fixed assets" })).toBeInTheDocument();
    expect(screen.getByText("Module not implemented yet")).toBeInTheDocument();
    expect(screen.getByText(/No live integration, payroll, bank-feed, billing, ZATCA, email, posting, or production workflow/)).toBeInTheDocument();
    expect(screen.getByText("No workflow execution")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to dashboard" })).toHaveAttribute("href", "/dashboard");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("routes customer and supplier workspaces through the shared party pages", () => {
    render(
      <>
        <CustomersPage />
        <CustomerDetailPage />
        <SuppliersPage />
        <SupplierDetailPage />
      </>,
    );

    expect(screen.getByTestId("party-list-customer")).toBeInTheDocument();
    expect(screen.getByTestId("party-detail-customer")).toBeInTheDocument();
    expect(screen.getByTestId("party-list-supplier")).toBeInTheDocument();
    expect(screen.getByTestId("party-detail-supplier")).toBeInTheDocument();
    expect(partyListPageMock).toHaveBeenNthCalledWith(1, expect.objectContaining({ kind: "customer" }));
    expect(partyDetailPageMock).toHaveBeenNthCalledWith(1, expect.objectContaining({ kind: "customer" }));
    expect(partyListPageMock).toHaveBeenNthCalledWith(2, expect.objectContaining({ kind: "supplier" }));
    expect(partyDetailPageMock).toHaveBeenNthCalledWith(2, expect.objectContaining({ kind: "supplier" }));
  });

  it("loads the contacts route without workspace data", () => {
    render(<ContactsPage />);

    expect(screen.getByRole("heading", { name: "Contacts" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Guided setup" })).toHaveAttribute("href", "/setup");
    expect(screen.getByText("Log in and select an organization to load contacts.")).toBeInTheDocument();
    expect(apiRequestMock).not.toHaveBeenCalled();
  });

  it("loads the reports route through the reports index module", () => {
    render(<ReportsPage />);

    expect(screen.getByTestId("reports-index-page")).toBeInTheDocument();
    expect(reportsIndexPageMock).toHaveBeenCalledTimes(1);
  });

  it("loads the settings overview route safely", () => {
    render(<SettingsPage />);

    expect(screen.getByRole("heading", { name: "Settings" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Team and roles/i })).toHaveAttribute("href", "/settings/team");
    expect(screen.getByRole("link", { name: /Compliance readiness/i })).toHaveAttribute("href", "/settings/compliance");
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("loads the storage settings route safely without an organization", () => {
    render(<StorageSettingsPage />);

    expect(screen.getByText("Log in and select an organization to review storage readiness.")).toBeInTheDocument();
    expect(apiRequestMock).not.toHaveBeenCalled();
  });

  it("loads the banking accounting settings route safely without an organization", () => {
    render(<BankingAccountingSettingsPage />);

    expect(screen.getByText("Log in and select an organization to configure banking accounting.")).toBeInTheDocument();
    expect(apiRequestMock).not.toHaveBeenCalled();
  });

  it("loads the bank account and transfer routes without workspace data", () => {
    render(
      <>
        <BankAccountsPage />
        <BankTransfersPage />
      </>,
    );

    expect(screen.getByRole("heading", { name: "Bank accounts" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Link account" })).toHaveAttribute("href", "/bank-accounts/new");
    expect(screen.getByText("Log in and select an organization to load bank accounts.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Bank transfers" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "New transfer" })).toHaveAttribute("href", "/bank-transfers/new");
    expect(screen.getByText("Log in and select an organization to load bank transfers.")).toBeInTheDocument();
    expect(apiRequestMock).not.toHaveBeenCalled();
  });

  it("loads the inventory balance route without workspace data", () => {
    render(<InventoryBalancesPage />);

    expect(screen.getByRole("heading", { name: "Inventory balances" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Stock valuation" })).toHaveAttribute("href", "/inventory/reports/stock-valuation");
    expect(screen.getByText("Log in and select an organization to load inventory balances.")).toBeInTheDocument();
    expect(apiRequestMock).not.toHaveBeenCalled();
  });

  it("loads the sales invoice, quote, credit-note, and inventory-return routes without workspace data", () => {
    render(
      <>
        <SalesInvoicesPage />
        <SalesQuotesPage />
        <SalesCreditNotesPage />
        <SalesInventoryReturnsPage />
      </>,
    );

    expect(screen.getByRole("heading", { name: "Sales invoices" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Create invoice" })).toHaveAttribute("href", "/sales/invoices/new");
    expect(screen.getByText("Log in and select an organization to load invoices.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Sales quotes" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Create quote" })).toHaveAttribute("href", "/sales/quotes/new");
    expect(screen.getByText("Log in and select an organization to load sales quotes.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Sales credit notes" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Create credit note" })).toHaveAttribute("href", "/sales/credit-notes/new");
    expect(screen.getByText("Log in and select an organization to load credit notes.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Sales inventory returns" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Create return" })).toHaveAttribute("href", "/sales/inventory-returns/new");
    expect(screen.getByText("Log in and select an organization to load sales inventory returns.")).toBeInTheDocument();
    expect(apiRequestMock).not.toHaveBeenCalled();
  });

  it("loads the new sales invoice route with its form shell", () => {
    render(<NewSalesInvoicePage />);

    expect(screen.getByRole("heading", { name: "Create sales invoice" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Guided setup" })).toHaveAttribute("href", "/setup");
    expect(screen.getByTestId("sales-invoice-form")).toBeInTheDocument();
  });

  it("loads the purchase bill and debit-note routes without workspace data", () => {
    render(
      <>
        <PurchaseBillsPage />
        <PurchaseDebitNotesPage />
      </>,
    );

    expect(screen.getByRole("heading", { name: "Purchase bills" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Create bill" })).toHaveAttribute("href", "/purchases/bills/new");
    expect(screen.getByText("Log in and select an organization to load purchase bills.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Debit notes" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Create debit note" })).toHaveAttribute("href", "/purchases/debit-notes/new");
    expect(screen.getByText("Log in and select an organization to load debit notes.")).toBeInTheDocument();
    expect(apiRequestMock).not.toHaveBeenCalled();
  });

  it("loads the new purchase bill route with its form shell", () => {
    render(<NewPurchaseBillPage />);

    expect(screen.getByRole("heading", { name: "Create purchase bill" })).toBeInTheDocument();
    expect(screen.getByTestId("purchase-bill-form")).toBeInTheDocument();
  });

  it("loads the new purchase debit-note route with its form shell", () => {
    render(<NewPurchaseDebitNotePage />);

    expect(screen.getByRole("heading", { name: "Create debit note" })).toBeInTheDocument();
    expect(screen.getByTestId("purchase-debit-note-form")).toBeInTheDocument();
  });
});
