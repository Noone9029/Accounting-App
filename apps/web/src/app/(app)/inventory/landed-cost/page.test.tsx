import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import LandedCostPreviewPage from "./page";
import { PERMISSIONS, type Permission } from "@/lib/permissions";
import type { LandedCostPreviewResponse } from "@/lib/types";

const apiRequestMock = jest.fn();
let currentPermissions = new Set<Permission>();
let currentSearchParams = new URLSearchParams();

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
  useSearchParams: () => currentSearchParams,
}));

jest.mock("@/hooks/use-active-organization", () => ({
  useActiveOrganizationId: () => "org-1",
}));

jest.mock("@/lib/api", () => ({
  apiRequest: (...args: unknown[]) => apiRequestMock(...args),
}));

jest.mock("@/components/permissions/permission-provider", () => ({
  usePermissions: () => ({
    can: (permission: Permission) => currentPermissions.has(permission),
  }),
}));

describe("LandedCostPreviewPage", () => {
  beforeEach(() => {
    apiRequestMock.mockReset();
    currentSearchParams = new URLSearchParams();
    currentPermissions = new Set([PERMISSIONS.inventory.view, PERMISSIONS.purchaseReceiving.view, PERMISSIONS.purchaseBills.view]);
  });

  it("renders the page, accepts cost line entry, selects allocation method, and displays preview results", async () => {
    apiRequestMock.mockResolvedValue(landedCostPreviewResponse());

    render(<LandedCostPreviewPage />);

    expect(screen.getByRole("heading", { name: "Landed Cost Preview" })).toBeInTheDocument();
    expect(screen.getByText(/This preview allocates estimated landed costs across inventory receipt or bill lines/i)).toBeInTheDocument();
    expect(screen.getByText(/It does not post journals, update inventory valuation, change AP balances, create cost layers, or affect VAT/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Source document ID"), { target: { value: "receipt-1" } });
    fireEvent.change(screen.getByLabelText("Category 1"), { target: { value: "INSURANCE" } });
    fireEvent.change(screen.getByLabelText("Description 1"), { target: { value: "Marine cover" } });
    fireEvent.change(screen.getByLabelText("Cost amount 1"), { target: { value: "30.0000" } });
    fireEvent.click(screen.getByLabelText("By quantity"));
    fireEvent.click(screen.getByRole("button", { name: "Preview" }));

    await waitFor(() => {
      expect(apiRequestMock).toHaveBeenCalledWith(
        "/inventory/landed-cost/preview",
        expect.objectContaining({
          method: "POST",
          body: expect.objectContaining({
            sourceType: "PURCHASE_RECEIPT",
            sourceId: "receipt-1",
            allocationMethod: "BY_QUANTITY",
            costLines: [expect.objectContaining({ category: "INSURANCE", description: "Marine cover", amount: "30.0000" })],
          }),
        }),
      );
    });

    expect(await screen.findByText("Preview landed inventory value")).toBeInTheDocument();
    expect(screen.getByText("Tracked Item")).toBeInTheDocument();
    expect(screen.getByText("230.0000")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "PRC-000001" })).toHaveAttribute("href", "/inventory/purchase-receipts/receipt-1");
  });

  it("displays blocker output from the preview API", async () => {
    apiRequestMock.mockResolvedValue(
      landedCostPreviewResponse({
        allocation: [],
        blockers: ["Manual allocation total must equal total landed costs."],
      }),
    );

    render(<LandedCostPreviewPage />);
    fireEvent.change(screen.getByLabelText("Source document ID"), { target: { value: "receipt-1" } });
    fireEvent.click(screen.getByRole("button", { name: "Preview" }));

    expect(await screen.findByText("Blockers")).toBeInTheDocument();
    expect(screen.getByText("Manual allocation total must equal total landed costs.")).toBeInTheDocument();
  });

  it("shows manual allocation inputs after source lines are loaded", async () => {
    apiRequestMock.mockResolvedValue(landedCostPreviewResponse());

    render(<LandedCostPreviewPage />);
    fireEvent.change(screen.getByLabelText("Source document ID"), { target: { value: "receipt-1" } });
    fireEvent.click(screen.getByRole("button", { name: "Preview" }));
    expect(await screen.findByText("Tracked Item")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Manual"));
    expect(screen.getByLabelText("Tracked Item allocation")).toBeInTheDocument();
  });

  it("hides source document links when the role lacks the source permission", async () => {
    currentPermissions = new Set([PERMISSIONS.inventory.view, PERMISSIONS.purchaseReceiving.view]);
    apiRequestMock.mockResolvedValue(landedCostPreviewResponse({ source: { ...landedCostPreviewResponse().source!, sourceType: "PURCHASE_BILL", sourceNumber: "BILL-000001" } }));

    render(<LandedCostPreviewPage />);
    fireEvent.change(screen.getByLabelText("Source document ID"), { target: { value: "receipt-1" } });
    fireEvent.click(screen.getByRole("button", { name: "Preview" }));

    expect(await screen.findByText("BILL-000001")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "BILL-000001" })).not.toBeInTheDocument();
  });

  it("keeps safe limitations visible and avoids unsafe action wording", () => {
    render(<LandedCostPreviewPage />);

    expect(screen.getByText(/no landed cost documents are saved/i)).toBeInTheDocument();
    expect(screen.getByText(/no email is sent, and no ZATCA call is made/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /post landed cost/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /update inventory valuation/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/production-ready landed cost/i)).not.toBeInTheDocument();
  });
});

function landedCostPreviewResponse(overrides: Partial<LandedCostPreviewResponse> = {}): LandedCostPreviewResponse {
  const response: LandedCostPreviewResponse = {
    readOnly: true,
    previewOnly: true,
    noMutation: true,
    noPostingEffect: true,
    noInventoryEffect: true,
    noApEffect: true,
    noVatEffect: true,
    noZatcaEffect: true,
    noEmailEffect: true,
    generatedAt: "2026-06-06T00:00:00.000Z",
    source: {
      sourceType: "PURCHASE_RECEIPT",
      sourceId: "receipt-1",
      sourceNumber: "PRC-000001",
      supplier: { id: "supplier-1", name: "Example Supplier", displayName: "Example Supplier" },
      date: "2026-06-01T00:00:00.000Z",
      currency: "SAR",
    },
    allocationMethod: "BY_QUANTITY",
    baseLines: [
      {
        sourceLineId: "receipt-line-1",
        itemId: "item-1",
        itemName: "Tracked Item",
        itemSku: "TRK",
        quantity: "10.0000",
        returnedQuantity: "0.0000",
        baseUnitCost: "10.0000",
        baseLineValue: "100.0000",
        warnings: [],
      },
    ],
    costLines: [{ category: "INSURANCE", description: "Marine cover", amount: "30.0000", currency: null, supplierId: null }],
    allocation: [
      {
        sourceLineId: "receipt-line-1",
        allocatedLandedCost: "30.0000",
        landedUnitCostIncrease: "3.0000",
        previewLandedUnitCost: "13.0000",
        previewLandedLineValue: "130.0000",
        allocationPercent: "100.0000",
      },
    ],
    totals: {
      baseInventoryValue: "200.0000",
      totalLandedCosts: "30.0000",
      previewLandedInventoryValue: "230.0000",
    },
    blockers: [],
    warnings: [
      "Landed cost preview is read-only and planning-only.",
      "No journals, inventory item costs, moving average, FIFO/cost layers, AP balances, purchase bill balances, VAT reports, financial statements, payments, debit notes, refunds, ZATCA calls, emails, or source documents are created or changed.",
    ],
  };
  return { ...response, ...overrides };
}
