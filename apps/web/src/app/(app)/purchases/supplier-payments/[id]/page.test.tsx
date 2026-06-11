import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import SupplierPaymentDetailPage, { SupplierPaymentWorkflowGuidance } from "./page";
import type { SupplierPayment } from "@/lib/types";

const mockApiRequest = jest.fn();
const mockDownloadPdf = jest.fn();
const mockPermissionCan = jest.fn((_: string) => true);
let searchParams = new URLSearchParams();

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
  useParams: () => ({ id: "supplier-payment-1" }),
  useSearchParams: () => searchParams,
}));

jest.mock("@/hooks/use-active-organization", () => ({
  useActiveOrganizationId: () => "org-1",
}));

jest.mock("@/components/permissions/permission-provider", () => ({
  usePermissions: () => ({
    can: (permission: string) => mockPermissionCan(permission),
  }),
}));

jest.mock("@/components/attachments/attachment-panel", () => ({
  AttachmentPanel: () => null,
}));

jest.mock("@/lib/api", () => ({
  apiRequest: (...args: unknown[]) => mockApiRequest(...args),
}));

jest.mock("@/lib/pdf-download", () => ({
  downloadPdf: (...args: unknown[]) => mockDownloadPdf(...args),
  supplierPaymentReceiptPdfPath: (id: string) => `/supplier-payments/${id}/receipt.pdf`,
}));

describe("supplier payment workflow guidance", () => {
  beforeEach(() => {
    mockApiRequest.mockReset();
    mockDownloadPdf.mockReset();
    mockPermissionCan.mockReset();
    mockPermissionCan.mockReturnValue(true);
    searchParams = new URLSearchParams();
  });

  it("shows recorded-payment success guidance and AP next actions", () => {
    render(
      <SupplierPaymentWorkflowGuidance
        payment={paymentFixture()}
        recorded
        receiptData={null}
        actionLoading={false}
        canDownloadGeneratedDocuments
        paymentDetailHref="/purchases/supplier-payments/supplier-payment-1?returnTo=%2Fpurchases%2Fsupplier-payments%3FsupplierId%3Dsupplier-1%26returnTo%3D%252Fsuppliers%252Fsupplier-1"
        onDownloadReceiptPdf={jest.fn()}
      />,
    );

    expect(screen.getByText(/Supplier payment recorded/)).toBeInTheDocument();
    expect(screen.getByText("Posted")).toBeInTheDocument();
    expect(screen.getByText(/linked purchase bill balances were reduced/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View bill" })).toHaveAttribute(
      "href",
      "/purchases/bills/bill-1?returnTo=%2Fpurchases%2Fsupplier-payments%2Fsupplier-payment-1%3FreturnTo%3D%252Fpurchases%252Fsupplier-payments%253FsupplierId%253Dsupplier-1%2526returnTo%253D%25252Fsuppliers%25252Fsupplier-1",
    );
    expect(screen.getByRole("link", { name: "Open supplier workspace" })).toHaveAttribute("href", "/suppliers/supplier-1");
    expect(screen.getByRole("button", { name: "Download payment PDF" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open archive" })).toHaveAttribute("href", "/documents");
    expect(screen.getByRole("link", { name: "AP report" })).toHaveAttribute(
      "href",
      "/reports/aged-payables?returnTo=%2Fpurchases%2Fsupplier-payments%2Fsupplier-payment-1%3FreturnTo%3D%252Fpurchases%252Fsupplier-payments%253FsupplierId%253Dsupplier-1%2526returnTo%253D%25252Fsuppliers%25252Fsupplier-1",
    );
  });

  it("calls out unapplied supplier credit without changing posting behavior", () => {
    render(
      <SupplierPaymentWorkflowGuidance
        payment={paymentFixture({ unappliedAmount: "25.0000", allocations: [] })}
        recorded={false}
        receiptData={null}
        actionLoading={false}
        canDownloadGeneratedDocuments
        paymentDetailHref="/purchases/supplier-payments/supplier-payment-1"
        onDownloadReceiptPdf={jest.fn()}
      />,
    );

    expect(screen.getByText("Unapplied supplier credit")).toBeInTheDocument();
    expect(screen.getByText(/matched to a later bill or refunded/)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "View bill" })).not.toBeInTheDocument();
  });

  it("hides source PDF action without generated document download permission", () => {
    render(
      <SupplierPaymentWorkflowGuidance
        payment={paymentFixture()}
        recorded={false}
        receiptData={null}
        actionLoading={false}
        canDownloadGeneratedDocuments={false}
        paymentDetailHref="/purchases/supplier-payments/supplier-payment-1"
        onDownloadReceiptPdf={jest.fn()}
      />,
    );

    expect(screen.queryByRole("button", { name: "Download payment PDF" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open archive" })).toHaveAttribute("href", "/documents");
  });

  it("uses the filtered list context for the detail back action", async () => {
    searchParams = new URLSearchParams("returnTo=%2Fpurchases%2Fsupplier-payments%3FsupplierId%3Dsupplier-1%26returnTo%3D%252Fsuppliers%252Fsupplier-1");

    mockApiRequest.mockImplementation((path: string) => {
      if (path === "/supplier-payments/supplier-payment-1") {
        return Promise.resolve(paymentFixture());
      }
      if (path === "/supplier-payments/supplier-payment-1/receipt-data") {
        return Promise.resolve({
          receiptNumber: "SP-001",
          supplier: { id: "supplier-1", name: "Beta Supplier", displayName: "Beta Supplier", type: "SUPPLIER" },
          paymentDate: "2026-05-21T00:00:00.000Z",
          status: "POSTED",
          amountPaid: "115.0000",
          currency: "SAR",
          allocations: [],
          unappliedAmount: "0.0000",
          paidThroughAccount: { id: "account-1", code: "111", name: "Cash on hand", type: "ASSET" },
          journalEntry: { id: "je-1", entryNumber: "JE-001", status: "POSTED", totalDebit: "115.0000", totalCredit: "115.0000" },
        });
      }
      if (path === "/purchase-bills/open?supplierId=supplier-1") {
        return Promise.resolve([]);
      }
      return Promise.reject(new Error(`Unexpected path ${path}`));
    });

    render(<SupplierPaymentDetailPage />);

    expect((await screen.findAllByText("SP-001")).length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: "Back" })).toHaveAttribute(
      "href",
      "/purchases/supplier-payments?supplierId=supplier-1&returnTo=%2Fsuppliers%2Fsupplier-1",
    );
  });
});

function paymentFixture(overrides: Partial<SupplierPayment> = {}): SupplierPayment {
  return {
    id: "supplier-payment-1",
    organizationId: "org-1",
    paymentNumber: "SP-001",
    supplierId: "supplier-1",
    paymentDate: "2026-05-21T00:00:00.000Z",
    currency: "SAR",
    status: "POSTED",
    amountPaid: "115.0000",
    unappliedAmount: "0.0000",
    description: null,
    accountId: "account-1",
    journalEntryId: "je-1",
    voidReversalJournalEntryId: null,
    postedAt: "2026-05-21T00:00:00.000Z",
    voidedAt: null,
    supplier: { id: "supplier-1", name: "Beta Supplier", displayName: "Beta Supplier", type: "SUPPLIER" },
    account: { id: "account-1", code: "111", name: "Cash on hand", type: "ASSET" },
    journalEntry: { id: "je-1", entryNumber: "JE-001", status: "POSTED", totalDebit: "115.0000", totalCredit: "115.0000" },
    voidReversalJournalEntry: null,
    allocations: [
      {
        id: "allocation-1",
        organizationId: "org-1",
        paymentId: "supplier-payment-1",
        billId: "bill-1",
        amountApplied: "115.0000",
        bill: {
          id: "bill-1",
          billNumber: "BILL-001",
          billDate: "2026-05-21T00:00:00.000Z",
          dueDate: null,
          total: "115.0000",
          balanceDue: "0.0000",
          status: "FINALIZED",
        },
      },
    ],
    unappliedAllocations: [],
    ...overrides,
  };
}
