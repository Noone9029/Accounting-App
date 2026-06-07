import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import SupplierApDashboardPage from "./page";
import { PERMISSIONS, type Permission } from "@/lib/permissions";
import type { SupplierApDashboardResponse } from "@/lib/types";

const apiRequestMock = jest.fn();
let currentPermissions = new Set<Permission>();

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

jest.mock("@/hooks/use-active-organization", () => ({
  useActiveOrganizationId: () => "org-1",
}));

jest.mock("@/lib/api", () => ({
  apiRequest: (...args: unknown[]) => apiRequestMock(...args),
}));

jest.mock("@/components/permissions/permission-provider", () => ({
  usePermissions: () => ({
    can: (permission: Permission) => currentPermissions.has(permission),
    canAny: (...permissions: Permission[]) => permissions.some((permission) => currentPermissions.has(permission)),
  }),
}));

describe("SupplierApDashboardPage", () => {
  beforeEach(() => {
    apiRequestMock.mockReset();
    currentPermissions = new Set([
      PERMISSIONS.contacts.view,
      PERMISSIONS.purchaseBills.view,
      PERMISSIONS.purchaseOrders.view,
      PERMISSIONS.purchaseReceiving.view,
      PERMISSIONS.inventory.view,
      PERMISSIONS.supplierPayments.view,
    ]);
  });

  it("renders summary cards, top supplier panels, actionable lists, safe helper text, and drilldown links", async () => {
    apiRequestMock.mockResolvedValue(dashboardResponse());

    render(<SupplierApDashboardPage />);

    expect(await screen.findByText("Supplier/AP Dashboard")).toBeInTheDocument();
    expect(screen.getByText(/This dashboard is read-only/i)).toBeInTheDocument();
    expect(screen.getByText(/does not post journals, adjust AP balances, move inventory by itself, send email, or book variances/i)).toBeInTheDocument();
    for (const label of [
      "Open payables",
      "Overdue bills",
      "Open purchase orders",
      "Receipts pending bill",
      "Bills pending receipt",
      "Matching exceptions",
      "Reviews needing action",
      "Purchase returns",
      "Variance previews",
    ]) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    }
    expect(screen.getByText("Top suppliers by payable balance")).toBeInTheDocument();
    expect(screen.getByText("Top suppliers by matching exception severity")).toBeInTheDocument();
    expect(screen.getByText("Suppliers with open returns")).toBeInTheDocument();
    expect(screen.getByText("Suppliers with variance previews")).toBeInTheDocument();
    expect(screen.getByText("Bills due soon / overdue")).toBeInTheDocument();
    expect(screen.getByText("Matching exceptions needing review")).toBeInTheDocument();
    expect(screen.getByText("Purchase returns awaiting action")).toBeInTheDocument();
    expect(screen.getByText(/1 completed, 1 awaiting movement, 0 posted/i)).toBeInTheDocument();
    expect(screen.getByText("Variance previews needing accountant review")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Alpha Supplier" }).length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: "BILL-000001" })).toHaveAttribute("href", "/purchases/bills/bill-1");
    expect(screen.getByRole("link", { name: "PO-000001" })).toHaveAttribute("href", "/purchases/purchase-orders/po-1");
    expect(screen.getByRole("link", { name: "Valuation variance preview" })).toHaveAttribute("href", "/inventory/valuation-variances");
    expect(screen.getAllByText("Non-posting").length).toBeGreaterThan(0);
    expect(screen.queryByText(/email sent|supplier paid|payment scheduled|journal posted|variance booked|landed cost allocated|VAT filed|ZATCA cleared/i)).not.toBeInTheDocument();
  });

  it("hides supplier and source links when permissions or response hrefs do not allow drilldown", async () => {
    currentPermissions = new Set([PERMISSIONS.supplierPayments.view]);
    apiRequestMock.mockResolvedValue(
      dashboardResponse({
        topSuppliersByPayable: [{ supplierId: "supplier-1", supplierName: "Alpha Supplier", href: "/suppliers/supplier-1", amount: "150.0000", openBillCount: 2 }],
        upcomingDueBills: [
          {
            id: "bill-1",
            billNumber: "BILL-000001",
            supplierId: "supplier-1",
            supplierName: "Alpha Supplier",
            supplierHref: "/suppliers/supplier-1",
            href: null,
            dueDate: "2026-06-01T00:00:00.000Z",
            balanceDue: "150.0000",
            currency: "SAR",
            dueStatus: "OVERDUE",
            attentionCategory: "Bills overdue",
          },
        ],
      }),
    );

    render(<SupplierApDashboardPage />);

    expect(await screen.findByText("Supplier/AP Dashboard")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Alpha Supplier" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "BILL-000001" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Matching exceptions" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Valuation variance preview" })).not.toBeInTheDocument();
  });

  it("renders safe empty states", async () => {
    apiRequestMock.mockResolvedValue(dashboardResponse({ empty: true }));

    render(<SupplierApDashboardPage />);

    expect(await screen.findByText("Supplier/AP Dashboard")).toBeInTheDocument();
    expect(screen.getAllByText("No suppliers found for this attention view.").length).toBeGreaterThan(0);
    expect(screen.getByText("No bills are overdue or due soon for the current permissions.")).toBeInTheDocument();
    expect(screen.getByText("No matching exceptions need review for the current permissions.")).toBeInTheDocument();
    expect(screen.getByText("No purchase returns are awaiting action for the current permissions.")).toBeInTheDocument();
    expect(screen.getByText("No valuation variance previews need review for the current permissions.")).toBeInTheDocument();
  });
});

function dashboardResponse(
  overrides: Partial<SupplierApDashboardResponse["apSummary"]> & { empty?: boolean } = {},
): SupplierApDashboardResponse {
  const empty = overrides.empty;
  return {
    readOnly: true,
    noMutation: true,
    noPostingEffect: true,
    noInventoryEffect: true,
    generatedAt: "2026-06-05T00:00:00.000Z",
    permissions: {
      canViewSuppliers: true,
      canViewPurchaseBills: true,
      canViewPurchaseOrders: true,
      canViewPurchaseReceiving: true,
      canViewPurchaseMatching: true,
      canViewInventoryValuation: true,
      canViewSupplierPayments: true,
      canViewPurchaseDebitNotes: true,
      canViewSupplierRefunds: true,
    },
    attentionPolicy: {
      dueSoonDays: 7,
      topRowLimit: 5,
      ordering: "Critical/high first.",
      categories: [],
    },
    warnings: [],
    apSummary: {
      openPayablesTotal: "150.0000",
      overdueBillsTotal: "100.0000",
      openBillCount: 2,
      overdueBillCount: 1,
      purchaseOrdersOpenCount: 2,
      purchaseReceiptsPendingBillCount: 1,
      purchaseBillsPendingReceiptCount: 1,
      matchingExceptionCount: 3,
      matchingCriticalCount: 1,
      matchingReviewOpenCount: 2,
      returnsOpenCount: 1,
      returnsCompletedCount: 1,
      returnsAwaitingInventoryMovementCount: 1,
      returnsInventoryMovementPostedCount: 0,
      variancePreviewCount: 1,
      variancePreviewTotal: "25.0000",
      suppliersWithOpenPayables: 1,
      suppliersWithExceptions: 1,
      topSuppliersByPayable: empty ? [] : [{ supplierId: "supplier-1", supplierName: "Alpha Supplier", href: "/suppliers/supplier-1", amount: "150.0000", openBillCount: 2 }],
      topSuppliersByExceptionSeverity: empty ? [] : [{ supplierId: "supplier-1", supplierName: "Alpha Supplier", href: "/suppliers/supplier-1", exceptionCount: 3, highestSeverity: "CRITICAL" }],
      suppliersWithOpenReturns: empty ? [] : [{ supplierId: "supplier-1", supplierName: "Alpha Supplier", href: "/suppliers/supplier-1", openReturnCount: 1 }],
      suppliersWithVariancePreviews: empty ? [] : [{ supplierId: "supplier-1", supplierName: "Alpha Supplier", href: "/suppliers/supplier-1", variancePreviewCount: 1, variancePreviewTotal: "25.0000", highestSeverity: "HIGH" }],
      upcomingDueBills: empty
        ? []
        : [
            {
              id: "bill-1",
              billNumber: "BILL-000001",
              supplierId: "supplier-1",
              supplierName: "Alpha Supplier",
              supplierHref: "/suppliers/supplier-1",
              href: "/purchases/bills/bill-1",
              dueDate: "2026-06-01T00:00:00.000Z",
              balanceDue: "150.0000",
              currency: "SAR",
              dueStatus: "OVERDUE",
              attentionCategory: "Bills overdue",
            },
          ],
      matchingExceptionsNeedingReview: empty
        ? []
        : [
            {
              id: "match-1",
              supplierId: "supplier-1",
              supplierName: "Alpha Supplier",
              supplierHref: "/suppliers/supplier-1",
              sourceType: "purchaseOrder",
              sourceId: "po-1",
              sourceNumber: "PO-000001",
              sourceHref: "/purchases/purchase-orders/po-1",
              exceptionType: "OVER_BILLED",
              severity: "CRITICAL",
              reviewStatus: null,
              attentionCategory: "Matching exceptions critical/high",
            },
          ],
      purchaseReturnsAwaitingAction: empty
        ? []
        : [
            {
              id: "return-1",
              purchaseReturnNumber: "PRN-000001",
              supplierId: "supplier-1",
              supplierName: "Alpha Supplier",
              supplierHref: "/suppliers/supplier-1",
              href: "/purchases/returns/return-1",
              status: "SUBMITTED",
              returnDate: "2026-06-04T00:00:00.000Z",
              reason: "Damaged goods",
              inventoryMovementStatus: "NOT_POSTED",
              inventoryReturnPostedAt: null,
              attentionCategory: "Purchase returns awaiting approval/completion",
              nonPosting: true,
            },
          ],
      variancePreviewsNeedingReview: empty
        ? []
        : [
            {
              id: "variance-1",
              supplierId: "supplier-1",
              supplierName: "Alpha Supplier",
              supplierHref: "/suppliers/supplier-1",
              sourceType: "purchaseReceipt",
              sourceId: "receipt-1",
              sourceNumber: "PRC-000001",
              sourceHref: "/inventory/purchase-receipts/receipt-1",
              varianceType: "PRICE_VARIANCE",
              severity: "HIGH",
              varianceAmount: "25.0000",
              attentionCategory: "Valuation variance previews needing review",
              nonPosting: true,
            },
          ],
      recentSupplierActivity: empty
        ? []
        : [
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
      ...overrides,
    },
  };
}
