import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { AppLocaleProvider } from "@/components/app-locale-provider";
import type { SalesInventoryReturn } from "@/lib/types";
import SalesInventoryReturnsPage from "./page";

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

describe("SalesInventoryReturnsPage", () => {
  beforeEach(() => {
    apiRequestMock.mockReset();
    refreshMock.mockReset();
    mockAllowedPermissions = new Set(["salesInvoices.view", "salesInvoices.create"]);
  });

  it("lists customer stock returns with source and movement status", async () => {
    apiRequestMock.mockResolvedValue([salesReturnFixture()]);

    render(<SalesInventoryReturnsPage />);

    await waitFor(() => expect(apiRequestMock).toHaveBeenCalledWith("/sales-inventory-returns"));
    expect(screen.getByText("Sales inventory returns")).toBeInTheDocument();
    expect(screen.getByText(/They do not create credit notes, refunds, accounting journals/i)).toBeInTheDocument();
    expect(screen.getByText("SRN-000001")).toBeInTheDocument();
    expect(screen.getByText("Beta Customer")).toBeInTheDocument();
    expect(screen.getByText("Stock issue")).toBeInTheDocument();
    expect(screen.getByText("SSI-000001")).toBeInTheDocument();
    expect(screen.getByText("Not posted")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Create return" })).toHaveAttribute("href", "/sales/inventory-returns/new");
    expect(screen.getByRole("link", { name: "View" })).toHaveAttribute("href", "/sales/inventory-returns/sir-1");
  });

  it("hides create action without sales create permission", async () => {
    mockAllowedPermissions = new Set(["salesInvoices.view"]);
    apiRequestMock.mockResolvedValue([salesReturnFixture()]);

    render(<SalesInventoryReturnsPage />);

    await waitFor(() => expect(screen.getByText("SRN-000001")).toBeInTheDocument());
    expect(screen.queryByRole("link", { name: "Create return" })).not.toBeInTheDocument();
  });

  it("renders sales inventory returns in Arabic with stable record codes", async () => {
    apiRequestMock.mockResolvedValue([salesReturnFixture()]);

    render(
      <AppLocaleProvider initialLocale="ar">
        <SalesInventoryReturnsPage />
      </AppLocaleProvider>,
    );

    await waitFor(() => expect(screen.getByText("SRN-000001")).toBeInTheDocument());
    expect(document.documentElement).toHaveAttribute("dir", "rtl");
    expect(screen.getByRole("heading", { name: "مرتجعات مخزون المبيعات" })).toBeInTheDocument();
    expect(screen.getByText(/مستندات مرتجعات مخزون العملاء/)).toBeInTheDocument();
    expect(screen.getByText("إصدار مخزون")).toBeInTheDocument();
    expect(screen.getByText("SSI-000001")).toBeInTheDocument();
    expect(screen.getByText("غير مرحلة")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "إنشاء مرتجع" })).toHaveAttribute("href", "/sales/inventory-returns/new");
  });
});

function salesReturnFixture(overrides: Partial<SalesInventoryReturn> = {}): SalesInventoryReturn {
  return {
    id: "sir-1",
    organizationId: "org-1",
    customerId: "customer-1",
    salesReturnNumber: "SRN-000001",
    status: "APPROVED",
    returnDate: "2026-06-06T00:00:00.000Z",
    reason: "Damaged goods",
    reference: "RMA-1",
    sourceSalesInvoiceId: null,
    sourceCreditNoteId: null,
    sourceDeliveryNoteId: null,
    sourceSalesStockIssueId: "ssi-1",
    notes: null,
    createdByUserId: null,
    approvedByUserId: null,
    inventoryReturnPostedByUserId: null,
    approvedAt: null,
    receivedAt: null,
    cancelledAt: null,
    voidedAt: null,
    inventoryReturnPostedAt: null,
    createdAt: "2026-06-06T00:00:00.000Z",
    updatedAt: "2026-06-06T00:00:00.000Z",
    inventoryReturnMovementStatus: "NOT_POSTED",
    customer: { id: "customer-1", name: "Beta Customer", displayName: "Beta Customer", type: "CUSTOMER", taxNumber: null, isActive: true },
    sourceSalesInvoice: null,
    sourceCreditNote: null,
    sourceDeliveryNote: null,
    sourceSalesStockIssue: { id: "ssi-1", issueNumber: "SSI-000001", status: "POSTED", customerId: "customer-1", warehouseId: "warehouse-1" },
    lines: [],
    ...overrides,
  };
}
