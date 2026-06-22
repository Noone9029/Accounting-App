import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import PurchaseOrderDetailPage from "./page";
import type { PurchaseOrder, PurchaseReceivingStatus } from "@/lib/types";

const apiRequestMock = jest.fn();
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
  useParams: () => ({ id: "po-1" }),
  useRouter: () => ({ push: jest.fn() }),
  useSearchParams: () => searchParamsMock,
}));

jest.mock("@/components/attachments/attachment-panel", () => ({
  AttachmentPanel: () => <div>Attachment panel</div>,
}));

jest.mock("@/components/purchases/purchase-matching-panel", () => ({
  PurchaseMatchingPanel: () => <div>Purchase matching panel</div>,
}));

jest.mock("@/components/permissions/permission-provider", () => ({
  usePermissions: () => ({
    can: () => true,
  }),
}));

jest.mock("@/hooks/use-active-organization", () => ({
  useActiveOrganizationId: () => "org-1",
}));

jest.mock("@/lib/api", () => ({
  apiRequest: (...args: unknown[]) => apiRequestMock(...args),
}));

jest.mock("@/lib/pdf-download", () => ({
  downloadPdf: jest.fn(),
  purchaseOrderPdfPath: (id: string) => `/generated-documents/purchase-orders/${id}/pdf`,
}));

describe("PurchaseOrderDetailPage", () => {
  beforeEach(() => {
    searchParamsMock = new URLSearchParams("returnTo=%2Fsuppliers%2Fsupplier-1%3Ftab%3Dorders");
    apiRequestMock.mockReset();
    apiRequestMock.mockImplementation((path: string) => {
      if (path === "/purchase-orders/po-1") {
        return Promise.resolve(purchaseOrderFixture());
      }
      if (path === "/purchase-orders/po-1/receiving-status") {
        return Promise.resolve(receivingStatusFixture());
      }
      if (path === "/purchase-matching/purchase-orders/po-1") {
        return Promise.resolve(null);
      }
      return Promise.reject(new Error(`Unexpected path ${path}`));
    });
  });

  it("preserves return context through purchase order detail handoffs", async () => {
    render(<PurchaseOrderDetailPage />);

    await waitFor(() => expect(screen.getByRole("link", { name: "Back" })).toHaveAttribute("href", "/suppliers/supplier-1?tab=orders"));
    expect(await screen.findByRole("heading", { name: "PO-000001" })).toBeInTheDocument();

    const orderDetailHref = "/purchases/purchase-orders/po-1?returnTo=%2Fsuppliers%2Fsupplier-1%3Ftab%3Dorders";
    expect(screen.getByRole("link", { name: "Receive stock" })).toHaveAttribute(
      "href",
      `/inventory/purchase-receipts/new?sourceType=purchaseOrder&purchaseOrderId=po-1&returnTo=${encodeURIComponent(orderDetailHref)}`,
    );
    expect(screen.getByRole("link", { name: /BILL-000001/ })).toHaveAttribute(
      "href",
      `/purchases/bills/bill-1?returnTo=${encodeURIComponent(orderDetailHref)}`,
    );
    expect(screen.getByText(/non-posting supplier commitments until an explicit conversion, receipt, or lifecycle action is run/i)).toBeInTheDocument();
  });
});

function purchaseOrderFixture(overrides: Partial<PurchaseOrder> = {}): PurchaseOrder {
  return {
    id: "po-1",
    organizationId: "org-1",
    purchaseOrderNumber: "PO-000001",
    supplierId: "supplier-1",
    branchId: null,
    orderDate: "2026-06-01T00:00:00.000Z",
    expectedDeliveryDate: "2026-06-10T00:00:00.000Z",
    currency: "SAR",
    status: "APPROVED",
    subtotal: "100.0000",
    discountTotal: "0.0000",
    taxableTotal: "100.0000",
    taxTotal: "15.0000",
    total: "115.0000",
    notes: null,
    terms: null,
    approvedAt: "2026-06-02T00:00:00.000Z",
    sentAt: null,
    closedAt: null,
    voidedAt: null,
    convertedBillId: "bill-1",
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z",
    supplier: { id: "supplier-1", name: "Beta Supplier", displayName: "Beta Supplier", type: "SUPPLIER", isActive: true },
    branch: null,
    convertedBill: { id: "bill-1", billNumber: "BILL-000001", status: "DRAFT", billDate: "2026-06-02T00:00:00.000Z", total: "115.0000" },
    lines: [
      {
        id: "line-1",
        organizationId: "org-1",
        purchaseOrderId: "po-1",
        itemId: "item-1",
        description: "Inventory widgets",
        accountId: "account-1",
        quantity: "2.0000",
        unitPrice: "50.0000",
        discountRate: "0.0000",
        taxRateId: "tax-1",
        lineGrossAmount: "100.0000",
        discountAmount: "0.0000",
        taxableAmount: "100.0000",
        taxAmount: "15.0000",
        lineTotal: "115.0000",
        sortOrder: 0,
        account: { id: "account-1", code: "5100", name: "Purchases", type: "EXPENSE" },
        taxRate: { id: "tax-1", name: "VAT 15%", rate: "15.0000" },
        item: { id: "item-1", name: "Inventory widgets", sku: "WID-1", expenseAccountId: "account-1" },
      },
    ],
    ...overrides,
  };
}

function receivingStatusFixture(overrides: Partial<PurchaseReceivingStatus> = {}): PurchaseReceivingStatus {
  return {
    sourceId: "po-1",
    sourceType: "purchaseOrder",
    status: "PARTIAL",
    lines: [
      {
        lineId: "line-1",
        item: { id: "item-1", name: "Inventory widgets", sku: "WID-1", type: "PRODUCT", status: "ACTIVE", inventoryTracking: true },
        inventoryTracking: true,
        sourceQuantity: "2.0000",
        orderedQuantity: "2.0000",
        receivedQuantity: "0.0000",
        remainingQuantity: "2.0000",
      },
    ],
    ...overrides,
  };
}
