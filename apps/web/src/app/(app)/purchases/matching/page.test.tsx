import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import PurchaseMatchingExceptionsPage from "./page";
import { PERMISSIONS, type Permission } from "@/lib/permissions";
import type { PurchaseMatchingExceptionsResponse } from "@/lib/types";

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

describe("PurchaseMatchingExceptionsPage", () => {
  beforeEach(() => {
    apiRequestMock.mockReset();
    currentPermissions = new Set([
      PERMISSIONS.purchaseOrders.view,
      PERMISSIONS.purchaseBills.view,
      PERMISSIONS.purchaseReceiving.view,
      PERMISSIONS.contacts.view,
    ]);
  });

  it("renders summary cards, supplier groups, safe labels, and source links", async () => {
    apiRequestMock.mockResolvedValue(exceptionResponse());

    render(<PurchaseMatchingExceptionsPage />);

    expect(await screen.findByText("Purchase Matching Exceptions")).toBeInTheDocument();
    expect(screen.getByText(/This page is read-only/i)).toBeInTheDocument();
    expect(screen.getByText(/does not post journals, update AP balances, change inventory quantities, or book variances/i)).toBeInTheDocument();
    expect(screen.getByText("Total exceptions")).toBeInTheDocument();
    expect(screen.getAllByText("Example Supplier").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: "Example Supplier" })[0]).toHaveAttribute("href", "/suppliers/supplier-1");
    expect(screen.getAllByText("Over Billed").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Over billed").length).toBeGreaterThan(0);
    expect(screen.getAllByText("No review started").length).toBeGreaterThan(0);
    expect(screen.getByLabelText("Review status")).toBeInTheDocument();
    expect(screen.getByLabelText("Reason")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "PO-000001" })).toHaveAttribute("href", "/purchases/purchase-orders/po-1");
    expect(screen.getByRole("link", { name: "PO: PO-000001" })).toHaveAttribute("href", "/purchases/purchase-orders/po-1");
    expect(screen.getByRole("link", { name: "Bill: BILL-000001" })).toHaveAttribute("href", "/purchases/bills/bill-1");
    expect(screen.getByRole("link", { name: "Receipt: PRC-000001" })).toHaveAttribute("href", "/inventory/purchase-receipts/receipt-1");
    expect(screen.queryByText(/accountant-approved|production-ready/i)).not.toBeInTheDocument();
  });

  it("starts a review when the user has matching management permission", async () => {
    currentPermissions = new Set([
      PERMISSIONS.purchaseOrders.view,
      PERMISSIONS.purchaseOrders.update,
      PERMISSIONS.purchaseBills.view,
      PERMISSIONS.purchaseReceiving.view,
      PERMISSIONS.contacts.view,
    ]);
    apiRequestMock
      .mockResolvedValueOnce(exceptionResponse())
      .mockResolvedValueOnce({
        id: "review-1",
        status: "OPEN",
        reviewOnly: true,
        noPostingEffect: true,
      })
      .mockResolvedValueOnce(exceptionResponse({ reviewStatus: "OPEN" }));

    render(<PurchaseMatchingExceptionsPage />);

    fireEvent.click(await screen.findByRole("button", { name: "Start review" }));

    await waitFor(() => {
      expect(apiRequestMock).toHaveBeenCalledWith(
        "/purchase-matching/reviews",
        expect.objectContaining({
          method: "POST",
          body: expect.objectContaining({
            sourceType: "purchaseOrder",
            sourceId: "po-1",
            supplierId: "supplier-1",
            exceptionType: "OVER_BILLED",
            severity: "CRITICAL",
          }),
        }),
      );
    });
    expect(await screen.findByText(/Review status updated/i)).toBeInTheDocument();
    expect(screen.getAllByText("Open").length).toBeGreaterThan(0);
    expect(screen.queryAllByText(/post journals, update AP balances, change inventory quantities, book variances, create returns, or contact suppliers/i).length).toBeGreaterThan(0);
  });

  it("keeps review actions hidden from view-only users", async () => {
    apiRequestMock.mockResolvedValue(exceptionResponse());

    render(<PurchaseMatchingExceptionsPage />);

    expect((await screen.findAllByText("No review started")).length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: "Start review" })).not.toBeInTheDocument();
  });

  it("shows return review follow-up and linked purchase return metadata", async () => {
    currentPermissions = new Set([
      PERMISSIONS.purchaseOrders.view,
      PERMISSIONS.purchaseBills.view,
      PERMISSIONS.purchaseBills.create,
      PERMISSIONS.purchaseReceiving.view,
      PERMISSIONS.contacts.view,
    ]);
    apiRequestMock.mockResolvedValue(exceptionResponse({ reviewStatus: "NEEDS_RETURN_REVIEW", purchaseReturn: true }));

    render(<PurchaseMatchingExceptionsPage />);

    expect(await screen.findByText("Return review needed")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Return PRN-000001" })).toHaveAttribute("href", "/purchases/returns/return-1");
    expect(screen.queryByRole("link", { name: "Create purchase return" })).not.toBeInTheDocument();
  });

  it("offers an explicit create-return link only after a return review exists", async () => {
    currentPermissions = new Set([
      PERMISSIONS.purchaseOrders.view,
      PERMISSIONS.purchaseBills.view,
      PERMISSIONS.purchaseBills.create,
      PERMISSIONS.purchaseReceiving.view,
      PERMISSIONS.contacts.view,
    ]);
    apiRequestMock.mockResolvedValue(exceptionResponse({ reviewStatus: "NEEDS_RETURN_REVIEW" }));

    render(<PurchaseMatchingExceptionsPage />);

    const link = await screen.findByRole("link", { name: "Create purchase return" });
    expect(link).toHaveAttribute(
      "href",
      "/purchases/returns/new?matchingReviewId=review-1&supplierId=supplier-1&sourceType=purchaseOrder&sourceId=po-1",
    );
  });

  it("links variance review rows to valuation variance preview when inventory view is allowed", async () => {
    currentPermissions = new Set([
      PERMISSIONS.inventory.view,
      PERMISSIONS.purchaseOrders.view,
      PERMISSIONS.purchaseBills.view,
      PERMISSIONS.purchaseReceiving.view,
      PERMISSIONS.contacts.view,
    ]);
    apiRequestMock.mockResolvedValue(exceptionResponse({ reviewStatus: "NEEDS_VARIANCE_REVIEW" }));

    render(<PurchaseMatchingExceptionsPage />);

    expect(await screen.findByRole("link", { name: "Valuation variance preview" })).toHaveAttribute(
      "href",
      "/inventory/valuation-variances?matchingReviewId=review-1&sourceType=matchingReview",
    );
  });


  it("sends selected filters to the exception endpoint", async () => {
    apiRequestMock.mockResolvedValue(exceptionResponse());

    render(<PurchaseMatchingExceptionsPage />);
    await screen.findAllByText("Example Supplier");

    fireEvent.change(screen.getByLabelText("Severity"), { target: { value: "CRITICAL" } });
    fireEvent.change(screen.getByLabelText("Search"), { target: { value: "BILL-000001" } });

    await waitFor(() => {
      expect(apiRequestMock).toHaveBeenCalledWith(expect.stringContaining("severity=CRITICAL"));
      expect(apiRequestMock).toHaveBeenCalledWith(expect.stringContaining("search=BILL-000001"));
    });
  });

  it("renders a safe empty state", async () => {
    apiRequestMock.mockResolvedValue({
      ...exceptionResponse(),
      summary: {
        totalExceptionCount: 0,
        criticalCount: 0,
        highCount: 0,
        mediumCount: 0,
        lowCount: 0,
        suppliersWithExceptions: 0,
        overBilledCount: 0,
        overReceivedCount: 0,
        billPendingReceiptCount: 0,
        receiptPendingBillCount: 0,
        partiallyMatchedCount: 0,
        notReceivedCount: 0,
        notBilledCount: 0,
        reviewRequiredCount: 0,
      },
      groups: [],
      items: [],
    });

    render(<PurchaseMatchingExceptionsPage />);

    expect(await screen.findByText("No purchase matching exceptions found for the selected filters.")).toBeInTheDocument();
    expect(screen.queryByText(/accountant-approved|production-ready/i)).not.toBeInTheDocument();
  });

  it("keeps restricted source links as text when the role cannot open them", async () => {
    currentPermissions = new Set([PERMISSIONS.purchaseOrders.view]);
    apiRequestMock.mockResolvedValue(exceptionResponse());

    render(<PurchaseMatchingExceptionsPage />);

    expect((await screen.findAllByText("Example Supplier")).length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: "PO-000001" })).toHaveAttribute("href", "/purchases/purchase-orders/po-1");
    expect(screen.queryByRole("link", { name: "Bill: BILL-000001" })).not.toBeInTheDocument();
    expect(screen.getByText("Bill: BILL-000001")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Receipt: PRC-000001" })).not.toBeInTheDocument();
    expect(screen.getByText("Receipt: PRC-000001")).toBeInTheDocument();
  });
});

function exceptionResponse(options: { reviewStatus?: "OPEN" | "NEEDS_VARIANCE_REVIEW" | "NEEDS_RETURN_REVIEW" | null; purchaseReturn?: boolean } = {}): PurchaseMatchingExceptionsResponse {
  const reviewFields =
    options.reviewStatus
      ? {
          reviewId: "review-1",
          reviewStatus: options.reviewStatus,
          reasonCode: "OVER_BILLED" as const,
          assignedTo: null,
          nextReviewDate: null,
          reviewedAt: null,
          reviewNoteSummary: null,
          purchaseReturnId: options.purchaseReturn ? "return-1" : null,
          purchaseReturnNumber: options.purchaseReturn ? "PRN-000001" : null,
          purchaseReturnStatus: options.purchaseReturn ? "SUBMITTED" as const : null,
          purchaseReturnHref: options.purchaseReturn ? "/purchases/returns/return-1" : null,
      }
      : {
          reviewId: null,
          reviewStatus: null,
          reasonCode: null,
          assignedTo: null,
          nextReviewDate: null,
          reviewedAt: null,
          reviewNoteSummary: null,
          purchaseReturnId: null,
          purchaseReturnNumber: null,
          purchaseReturnStatus: null,
          purchaseReturnHref: null,
        };
  return {
    readOnly: true,
    noMutation: true,
    filters: { limit: 100 },
    summary: {
      totalExceptionCount: 1,
      criticalCount: 1,
      highCount: 0,
      mediumCount: 0,
      lowCount: 0,
      suppliersWithExceptions: 1,
      overBilledCount: 1,
      overReceivedCount: 0,
      billPendingReceiptCount: 0,
      receiptPendingBillCount: 0,
      partiallyMatchedCount: 0,
      notReceivedCount: 0,
      notBilledCount: 0,
      reviewRequiredCount: 0,
    },
    groups: [
      {
        supplierId: "supplier-1",
        supplierName: "Example Supplier",
        totalExceptionCount: 1,
        highestSeverity: "CRITICAL",
        outstandingReviewCount: 1,
        items: [
          {
            id: "purchaseOrder:po-1:line-1:OVER_BILLED",
            supplierId: "supplier-1",
            supplierName: "Example Supplier",
            sourceType: "purchaseOrder",
            sourceId: "po-1",
            sourceNumber: "PO-000001",
            sourceHref: "/purchases/purchase-orders/po-1",
            purchaseOrderId: "po-1",
            purchaseOrderNumber: "PO-000001",
            purchaseOrderHref: "/purchases/purchase-orders/po-1",
            purchaseBillId: "bill-1",
            purchaseBillNumber: "BILL-000001",
            purchaseBillHref: "/purchases/bills/bill-1",
            purchaseReceiptId: "receipt-1",
            purchaseReceiptNumber: "PRC-000001",
            purchaseReceiptHref: "/inventory/purchase-receipts/receipt-1",
            relatedBills: [{ id: "bill-1", number: "BILL-000001", href: "/purchases/bills/bill-1" }],
            relatedReceipts: [{ id: "receipt-1", number: "PRC-000001", href: "/inventory/purchase-receipts/receipt-1" }],
            itemName: "Tracked item",
            lineDescription: "Tracked item",
            orderedQuantity: "10.0000",
            billedQuantity: "12.0000",
            receivedQuantity: "7.0000",
            remainingToBill: "0.0000",
            remainingToReceive: "3.0000",
            overBilledQuantity: "2.0000",
            overReceivedQuantity: "0.0000",
            exceptionType: "OVER_BILLED",
            exceptionLabel: "Over billed",
            severity: "CRITICAL",
            ...reviewFields,
            latestRelevantDate: "2026-06-05T00:00:00.000Z",
            warnings: ["Billed quantity exceeds ordered quantity."],
          },
        ],
      },
    ],
    items: [],
  };
}
