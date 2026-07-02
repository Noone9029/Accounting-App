import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { PurchaseOrderForm } from "./purchase-order-form";
import type { PurchaseOrder } from "@/lib/types";

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
  useRouter: () => ({
    push: pushMock,
  }),
}));

jest.mock("@/hooks/use-active-organization", () => ({
  useActiveOrganizationId: () => "org-1",
}));

jest.mock("@/lib/api", () => ({
  apiRequest: (...args: unknown[]) => apiRequestMock(...args),
}));

describe("PurchaseOrderForm", () => {
  beforeEach(() => {
    window.history.pushState({}, "", "/purchases/purchase-orders/new");
    apiRequestMock.mockReset();
    pushMock.mockReset();
    apiRequestMock.mockImplementation((path: string) => {
      if (path === "/contacts") {
        return Promise.resolve([contactFixture("supplier-1", "Beta Supplier"), contactFixture("supplier-2", "Second Supplier")]);
      }
      if (path === "/items") {
        return Promise.resolve([]);
      }
      if (path === "/accounts") {
        return Promise.resolve([{ id: "account-1", code: "5100", name: "Purchases", type: "EXPENSE", isActive: true, allowPosting: true }]);
      }
      if (path === "/tax-rates") {
        return Promise.resolve([{ id: "tax-1", name: "VAT 15%", rate: "15.0000", scope: "PURCHASES", category: "STANDARD", isActive: true }]);
      }
      if (path === "/branches") {
        return Promise.resolve([{ id: "branch-1", name: "Riyadh Demo Branch", displayName: "Riyadh Demo Branch", countryCode: "SA", isDefault: true }]);
      }
      return Promise.reject(new Error(`Unexpected path ${path}`));
    });
  });

  it("prefills supplier context and keeps the purchase order boundaries visible", async () => {
    window.history.pushState({}, "", "/purchases/purchase-orders/new?supplierId=supplier-2&returnTo=/suppliers/supplier-2");

    render(<PurchaseOrderForm />);

    await waitFor(() => expect(screen.getByLabelText("Supplier")).toHaveValue("supplier-2"));
    expect(screen.getByRole("link", { name: "Cancel" })).toHaveAttribute("href", "/suppliers/supplier-2");
    expect(screen.getByText(/No AP posting, inventory movement, payment sending, or tax-authority submission happens from this form/i)).toBeInTheDocument();
    expect(screen.queryByText(/auto.?approve|auto.?send|supplier paid|payment scheduled|journal posted|VAT filed|ZATCA cleared/i)).not.toBeInTheDocument();
  });

  it("labels order line controls and disables the last remove action", async () => {
    render(<PurchaseOrderForm />);

    await waitFor(() => expect(screen.getByLabelText("Item for purchase order line 1")).toBeInTheDocument());

    expect(screen.getByLabelText("Description for purchase order line 1")).toBeInTheDocument();
    expect(screen.getByLabelText("Purchase account for purchase order line 1")).toBeInTheDocument();
    expect(screen.getByLabelText("Quantity for purchase order line 1")).toBeInTheDocument();
    expect(screen.getByLabelText("Unit price for purchase order line 1")).toBeInTheDocument();
    expect(screen.getByLabelText("Discount rate for purchase order line 1")).toBeInTheDocument();
    expect(screen.getByLabelText("Tax rate for purchase order line 1")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove" })).toBeDisabled();
  });

  it("uses returnTo from edit routes for cancel handoffs", async () => {
    window.history.pushState({}, "", "/purchases/purchase-orders/po-1/edit?returnTo=/suppliers/supplier-1");

    render(<PurchaseOrderForm initialOrder={purchaseOrderFixture()} />);

    await waitFor(() => expect(screen.getByLabelText("Supplier")).toHaveValue("supplier-1"));
    expect(screen.getByRole("link", { name: "Cancel" })).toHaveAttribute("href", "/suppliers/supplier-1");
  });

  it("uses returnTo from edit routes for post-save redirect", async () => {
    window.history.pushState({}, "", "/purchases/purchase-orders/po-1/edit?returnTo=/suppliers/supplier-1");
    apiRequestMock.mockImplementation((path: string, options?: { method?: string }) => {
      if (path === "/contacts") {
        return Promise.resolve([contactFixture("supplier-1", "Beta Supplier")]);
      }
      if (path === "/items") {
        return Promise.resolve([]);
      }
      if (path === "/accounts") {
        return Promise.resolve([{ id: "account-1", code: "5100", name: "Purchases", type: "EXPENSE", isActive: true, allowPosting: true }]);
      }
      if (path === "/tax-rates") {
        return Promise.resolve([{ id: "tax-1", name: "VAT 15%", rate: "15.0000", scope: "PURCHASES", category: "STANDARD", isActive: true }]);
      }
      if (path === "/branches") {
        return Promise.resolve([]);
      }
      if (path === "/purchase-orders/po-1" && options?.method === "PATCH") {
        return Promise.resolve({ id: "po-1" });
      }
      return Promise.reject(new Error(`Unexpected path ${path}`));
    });

    render(<PurchaseOrderForm initialOrder={purchaseOrderFixture()} />);

    await waitFor(() => expect(screen.getByLabelText("Supplier")).toHaveValue("supplier-1"));
    fireEvent.submit(screen.getByRole("button", { name: "Save changes" }).closest("form")!);

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/suppliers/supplier-1"));
  });
});

function contactFixture(id: string, name: string) {
  return {
    id,
    name,
    displayName: name,
    type: "SUPPLIER",
    email: null,
    phone: null,
    taxNumber: null,
    isActive: true,
  };
}

function purchaseOrderFixture(overrides: Partial<PurchaseOrder> = {}): PurchaseOrder {
  return {
    id: "po-1",
    organizationId: "org-1",
    purchaseOrderNumber: "PO-000001",
    supplierId: "supplier-1",
    branchId: null,
    orderDate: "2026-06-01T00:00:00.000Z",
    expectedDeliveryDate: null,
    currency: "SAR",
    status: "DRAFT",
    subtotal: "100.0000",
    discountTotal: "0.0000",
    taxableTotal: "100.0000",
    taxTotal: "15.0000",
    total: "115.0000",
    notes: null,
    terms: null,
    approvedAt: null,
    sentAt: null,
    closedAt: null,
    voidedAt: null,
    convertedBillId: null,
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z",
    supplier: { id: "supplier-1", name: "Beta Supplier", displayName: "Beta Supplier", type: "SUPPLIER", isActive: true },
    branch: null,
    convertedBill: null,
    lines: [
      {
        id: "line-1",
        organizationId: "org-1",
        purchaseOrderId: "po-1",
        itemId: null,
        description: "Office supplies",
        accountId: "account-1",
        quantity: "1.0000",
        unitPrice: "100.0000",
        discountRate: "0.0000",
        taxRateId: "tax-1",
        lineGrossAmount: "100.0000",
        discountAmount: "0.0000",
        taxableAmount: "100.0000",
        taxAmount: "15.0000",
        lineTotal: "115.0000",
        sortOrder: 0,
        account: undefined,
        taxRate: undefined,
        item: undefined,
      },
    ],
    ...overrides,
  };
}
