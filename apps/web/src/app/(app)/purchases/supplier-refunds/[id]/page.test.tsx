import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import SupplierRefundDetailPage from "./page";

const apiRequestMock = jest.fn();
const canMock = jest.fn((_: string) => true);
const downloadPdfMock = jest.fn();

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
  useParams: () => ({ id: "supplier-refund-1" }),
}));

jest.mock("@/components/permissions/permission-provider", () => ({
  usePermissions: () => ({
    can: (permission: string) => canMock(permission),
  }),
}));

jest.mock("@/components/attachments/attachment-panel", () => ({
  AttachmentPanel: () => null,
}));

jest.mock("@/hooks/use-active-organization", () => ({
  useActiveOrganizationId: () => "org-1",
}));

jest.mock("@/lib/api", () => ({
  apiRequest: (...args: unknown[]) => apiRequestMock(...args),
}));

jest.mock("@/lib/pdf-download", () => ({
  downloadPdf: (...args: unknown[]) => downloadPdfMock(...args),
  supplierRefundPdfPath: (id: string) => `/supplier-refunds/${id}/pdf`,
}));

describe("SupplierRefundDetailPage", () => {
  beforeEach(() => {
    apiRequestMock.mockReset();
    canMock.mockReset();
    downloadPdfMock.mockReset();
    canMock.mockReturnValue(true);
    apiRequestMock.mockImplementation((path: string) => {
      if (path === "/supplier-refunds/supplier-refund-1") {
        return Promise.resolve(refundFixture());
      }
      if (path === "/supplier-refunds/supplier-refund-1/pdf-data") {
        return Promise.resolve({
          refund: { refundNumber: "SRF-001", amountRefunded: "25.0000", currency: "SAR" },
          source: { number: "SP-001" },
          generatedAt: "2026-05-22T00:00:00.000Z",
        });
      }
      return Promise.reject(new Error(`Unexpected path ${path}`));
    });
  });

  it("keeps manual refund boundaries and source handoffs visible", async () => {
    render(<SupplierRefundDetailPage />);

    expect((await screen.findAllByText("SRF-001")).length).toBeGreaterThan(0);
    expect(screen.getByText(/No bank transfer, bank reconciliation, payment gateway, or ZATCA submission is performed/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Supplier ledger" })).toHaveAttribute("href", "/contacts/supplier-1");
    expect(screen.getByRole("link", { name: "View source" })).toHaveAttribute("href", "/purchases/supplier-payments/payment-1");
    expect(screen.getByText("PDF amount")).toBeInTheDocument();
  });
});

function refundFixture() {
  return {
    id: "supplier-refund-1",
    organizationId: "org-1",
    refundNumber: "SRF-001",
    supplierId: "supplier-1",
    refundDate: "2026-05-22T00:00:00.000Z",
    sourceType: "SUPPLIER_PAYMENT",
    sourcePaymentId: "payment-1",
    sourceDebitNoteId: null,
    currency: "SAR",
    amountRefunded: "25.0000",
    accountId: "cash-1",
    status: "POSTED",
    description: null,
    journalEntryId: "je-1",
    voidReversalJournalEntryId: null,
    postedAt: "2026-05-22T00:00:00.000Z",
    voidedAt: null,
    supplier: { id: "supplier-1", name: "Beta Supplier", displayName: "Beta Supplier", type: "SUPPLIER" },
    account: { id: "cash-1", code: "111", name: "Cash on hand", type: "ASSET" },
    journalEntry: { id: "je-1", entryNumber: "JE-001" },
    voidReversalJournalEntry: null,
    sourcePayment: {
      id: "payment-1",
      paymentNumber: "SP-001",
      status: "POSTED",
      amountPaid: "100.0000",
      unappliedAmount: "75.0000",
    },
    sourceDebitNote: null,
  };
}
