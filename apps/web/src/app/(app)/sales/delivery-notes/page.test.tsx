import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { AppLocaleProvider } from "@/components/app-locale-provider";
import type { DeliveryNote } from "@/lib/types";
import DeliveryNotesPage from "./page";

const apiRequestMock = jest.fn();
let mockAllowedPermissions = new Set<string>();
const refreshMock = jest.fn();

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
  useRouter: () => ({ refresh: refreshMock }),
}));

jest.mock("@/hooks/use-active-organization", () => ({
  useActiveOrganizationId: () => "org-1",
}));

jest.mock("@/components/permissions/permission-provider", () => ({
  usePermissions: () => ({
    can: (permission: string) => mockAllowedPermissions.has(permission),
  }),
}));

jest.mock("@/lib/api", () => ({
  apiRequest: (...args: unknown[]) => apiRequestMock(...args),
}));

describe("DeliveryNotesPage", () => {
  beforeEach(() => {
    window.history.pushState({}, "", "/sales/delivery-notes");
    apiRequestMock.mockReset();
    refreshMock.mockReset();
    mockAllowedPermissions = new Set(["salesInvoices.view", "salesInvoices.create", "salesInvoices.update"]);
  });

  it("lists delivery notes with safe non-posting wording and source links", async () => {
    apiRequestMock.mockResolvedValueOnce([deliveryNoteFixture()]);

    render(<DeliveryNotesPage />);

    await waitFor(() => expect(screen.getByText("DN-000042")).toBeInTheDocument());
    expect(screen.getByText(/do not post accounting or move inventory by themselves/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Create delivery note" })).toHaveAttribute("href", "/sales/delivery-notes/new");
    expect(screen.getByText("Invoice INV-000010")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View" })).toHaveAttribute("href", "/sales/delivery-notes/dn-1");
    expect(screen.getByRole("link", { name: "Edit" })).toHaveAttribute("href", "/sales/delivery-notes/dn-1/edit");
  });

  it("hides creation and edit links when permissions are restricted", async () => {
    mockAllowedPermissions = new Set(["salesInvoices.view"]);
    apiRequestMock.mockResolvedValueOnce([deliveryNoteFixture()]);

    render(<DeliveryNotesPage />);

    await waitFor(() => expect(screen.getByText("DN-000042")).toBeInTheDocument());
    expect(screen.queryByRole("link", { name: "Create delivery note" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Edit" })).not.toBeInTheDocument();
  });

  it("renders delivery notes in Arabic with RTL direction and stable record codes", async () => {
    apiRequestMock.mockResolvedValueOnce([deliveryNoteFixture()]);

    render(
      <AppLocaleProvider initialLocale="ar">
        <DeliveryNotesPage />
      </AppLocaleProvider>,
    );

    await waitFor(() => expect(screen.getByText("DN-000042")).toBeInTheDocument());
    expect(document.documentElement).toHaveAttribute("dir", "rtl");
    expect(screen.getByRole("heading", { name: "إشعارات التسليم" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "إنشاء إشعار تسليم" })).toHaveAttribute("href", "/sales/delivery-notes/new");
    expect(screen.getByText("فاتورة INV-000010")).toBeInTheDocument();
  });
});

function deliveryNoteFixture(overrides: Partial<DeliveryNote> = {}): DeliveryNote {
  return {
    id: "dn-1",
    organizationId: "org-1",
    deliveryNoteNumber: "DN-000042",
    customerId: "customer-1",
    branchId: null,
    status: "DRAFT",
    issueDate: "2026-06-04T00:00:00.000Z",
    deliveryDate: "2026-06-05T00:00:00.000Z",
    reference: "INV-000010",
    relatedSalesInvoiceId: "invoice-1",
    relatedSalesQuoteId: null,
    relatedSalesStockIssueId: null,
    deliveryAddress: null,
    notes: null,
    instructions: null,
    issuedAt: null,
    deliveredAt: null,
    cancelledAt: null,
    voidedAt: null,
    customer: { id: "customer-1", name: "Beta Customer", displayName: "Beta Customer", type: "CUSTOMER", taxNumber: null, isActive: true },
    branch: null,
    relatedSalesInvoice: { id: "invoice-1", invoiceNumber: "INV-000010", status: "FINALIZED" },
    relatedSalesQuote: null,
    relatedSalesStockIssue: null,
    _count: { lines: 1 },
    ...overrides,
  };
}
