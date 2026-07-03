import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { AppLocaleProvider } from "@/components/app-locale-provider";
import type { SalesInventoryReturn, SalesInventoryReturnInventoryMovementPreview } from "@/lib/types";
import SalesInventoryReturnDetailPage from "./page";

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
  useParams: () => ({ id: "sir-1" }),
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

describe("SalesInventoryReturnDetailPage", () => {
  beforeEach(() => {
    apiRequestMock.mockReset();
    refreshMock.mockReset();
    mockAllowedPermissions = new Set(["salesInvoices.view", "salesInvoices.update", "inventory.view", "stockMovements.create"]);
    jest.spyOn(window, "confirm").mockReturnValue(true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("shows safe helper text, movement preview, linked movement IDs, and posts explicit stock-in", async () => {
    apiRequestMock.mockImplementation((path: string, options?: unknown) => {
      if (path === "/sales-inventory-returns/sir-1" && !options) return Promise.resolve(salesReturnFixture());
      if (path === "/sales-inventory-returns/sir-1/inventory-return-preview") return Promise.resolve(previewFixture());
      if (path === "/sales-inventory-returns/sir-1/post-inventory-return") return Promise.resolve(salesReturnFixture({ inventoryReturnPostedAt: "2026-06-06T12:00:00.000Z", inventoryReturnMovementStatus: "POSTED" }));
      return Promise.reject(new Error(`Unexpected path ${path}`));
    });

    render(<SalesInventoryReturnDetailPage />);

    await waitFor(() => expect(screen.getByText("SRN-000001")).toBeInTheDocument());
    expect(screen.getAllByText(/Sales inventory returns record operational stock returned by a customer/i).length).toBeGreaterThan(0);
    expect(screen.getByText("Inventory return movement")).toBeInTheDocument();
    expect(screen.getByText("5.0000")).toBeInTheDocument();
    expect(screen.getByText("7.0000")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Post inventory return movement" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Post inventory return movement" }));

    await waitFor(() => expect(apiRequestMock).toHaveBeenCalledWith("/sales-inventory-returns/sir-1/post-inventory-return", { method: "POST" }));
    expect(screen.getByText(/Inventory return movement posted/i)).toBeInTheDocument();
  });

  it("hides post action for restricted users while showing the read-only preview", async () => {
    mockAllowedPermissions = new Set(["salesInvoices.view", "inventory.view"]);
    apiRequestMock.mockImplementation((path: string) => {
      if (path === "/sales-inventory-returns/sir-1") return Promise.resolve(salesReturnFixture());
      if (path === "/sales-inventory-returns/sir-1/inventory-return-preview") return Promise.resolve(previewFixture());
      return Promise.reject(new Error(`Unexpected path ${path}`));
    });

    render(<SalesInventoryReturnDetailPage />);

    await waitFor(() => expect(screen.getByText("Inventory return movement")).toBeInTheDocument());
    expect(screen.getByText("Sales return in")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Post inventory return movement" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Approve" })).not.toBeInTheDocument();
  });

  it("renders sales inventory return detail in Arabic with RTL direction and stable movement codes", async () => {
    apiRequestMock.mockImplementation((path: string) => {
      if (path === "/sales-inventory-returns/sir-1") return Promise.resolve(salesReturnFixture());
      if (path === "/sales-inventory-returns/sir-1/inventory-return-preview") return Promise.resolve(previewFixture({ movementIds: ["SM-000001"] }));
      return Promise.reject(new Error(`Unexpected path ${path}`));
    });

    render(
      <AppLocaleProvider initialLocale="ar">
        <SalesInventoryReturnDetailPage />
      </AppLocaleProvider>,
    );

    await waitFor(() => expect(screen.getByRole("heading", { name: "SRN-000001" })).toBeInTheDocument());
    expect(document.documentElement).toHaveAttribute("dir", "rtl");
    expect(screen.getByText(/تفاصيل مرتجع مخزون عميل/)).toBeInTheDocument();
    expect(screen.getByText("حركة مرتجع المخزون")).toBeInTheDocument();
    expect(screen.getByText("SM-000001")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "استلام" })).toBeInTheDocument();
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
    createdByUserId: "user-1",
    approvedByUserId: null,
    inventoryReturnPostedByUserId: null,
    approvedAt: "2026-06-06T10:00:00.000Z",
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
    lines: [
      {
        id: "line-1",
        organizationId: "org-1",
        salesInventoryReturnId: "sir-1",
        itemId: "item-1",
        description: "Returned product",
        quantity: "2.0000",
        sourceSalesInvoiceLineId: null,
        sourceCreditNoteLineId: null,
        sourceDeliveryNoteLineId: null,
        sourceSalesStockIssueLineId: "ssi-line-1",
        warehouseId: "warehouse-1",
        stockMovementId: null,
        reason: "Damaged",
        sortOrder: 0,
        item: { id: "item-1", name: "Tracked item", sku: "TRK", status: "ACTIVE", inventoryTracking: true },
        warehouse: { id: "warehouse-1", code: "MAIN", name: "Main", status: "ACTIVE" },
      },
    ],
    ...overrides,
  };
}

function previewFixture(overrides: Partial<SalesInventoryReturnInventoryMovementPreview> = {}): SalesInventoryReturnInventoryMovementPreview {
  return {
    readOnly: true,
    previewOnly: true,
    noPostingEffect: true,
    noAccountingEffect: true,
    noArEffect: true,
    noVatEffect: true,
    noZatcaEffect: true,
    sourceType: "SalesInventoryReturn",
    sourceSalesInventoryReturn: { id: "sir-1", salesReturnNumber: "SRN-000001", status: "APPROVED" },
    inventoryMovementStatus: "NOT_POSTED",
    canPost: true,
    alreadyPosted: false,
    reversalSupported: false,
    postedAt: null,
    movementIds: [],
    blockingReasons: [],
    warnings: [],
    safeHelperText:
      "Sales inventory returns record operational stock returned by a customer. They do not create credit notes, refunds, accounting journals, AR adjustments, VAT filings, ZATCA submissions, emails, or payment links by themselves.",
    lines: [
      {
        lineId: "line-1",
        description: "Returned product",
        item: { id: "item-1", name: "Tracked item", sku: "TRK", inventoryTracking: true },
        warehouse: { id: "warehouse-1", code: "MAIN", name: "Main" },
        returnQuantity: "2.0000",
        currentOnHand: "5.0000",
        projectedOnHandAfterReturn: "7.0000",
        movementType: "SALES_RETURN_IN",
        movementRequired: true,
        status: "POSTABLE",
        stockMovementId: null,
        sourceType: "salesStockIssue",
        sourceLineId: "ssi-line-1",
        sourceDocumentNumber: "SSI-000001",
        blockingReasons: [],
        warnings: [],
      },
    ],
    ...overrides,
  };
}
