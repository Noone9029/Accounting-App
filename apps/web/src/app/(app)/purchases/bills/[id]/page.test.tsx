import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import PurchaseBillDetailPage, { PurchaseBillWorkflowGuidance } from "./page";
import { AppLocaleProvider } from "@/components/app-locale-provider";
import type { PurchaseBill } from "@/lib/types";

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
  useParams: () => ({ id: "00000000-0000-0000-0000-000000000701" }),
  useRouter: () => ({ push: jest.fn() }),
  useSearchParams: () => searchParamsMock,
}));

jest.mock("@/hooks/use-active-organization", () => ({
  useActiveOrganizationId: () => "org-1",
}));

jest.mock("@/components/permissions/permission-provider", () => ({
  usePermissions: () => ({
    can: () => true,
  }),
}));

jest.mock("@/lib/api", () => ({
  apiRequest: (...args: unknown[]) => apiRequestMock(...args),
}));

jest.mock("@/components/attachments/attachment-panel", () => ({
  AttachmentPanel: () => <div>Attachment panel</div>,
}));

describe("purchase bill workflow guidance", () => {
  beforeEach(() => {
    apiRequestMock.mockReset();
    searchParamsMock = new URLSearchParams();
  });

  it("explains draft bill state and shows the finalize action", () => {
    render(
      <PurchaseBillWorkflowGuidance
        bill={billFixture({ status: "DRAFT" })}
        actionLoading={false}
        canFinalizeBill
        canCreateSupplierPayment
        canCreateDebitNote
        canDownloadGeneratedDocuments
        onFinalize={jest.fn()}
        onDownloadPdf={jest.fn()}
      />,
    );

    expect(screen.getByText("Draft")).toBeInTheDocument();
    expect(screen.getByText(/draft bill is saved and editable/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Finalize bill" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Record supplier payment" })).not.toBeInTheDocument();
  });

  it("keeps foreign-currency drafts visibly fail-closed until FX journal posting is available", () => {
    render(
      <PurchaseBillWorkflowGuidance
        bill={billFixture({ status: "DRAFT", currency: "USD", baseCurrency: "SAR", exchangeRate: "3.75000000" })}
        actionLoading={false}
        canFinalizeBill
        canCreateSupplierPayment
        canCreateDebitNote
        canDownloadGeneratedDocuments
        onFinalize={jest.fn()}
        onDownloadPdf={jest.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Finalize bill" })).toBeDisabled();
    expect(screen.getByText(/foreign-currency posting is not enabled yet/i)).toBeInTheDocument();
  });

  it("shows supplier payment, debit note, ledger, and AP report actions after posting", () => {
    render(
      <PurchaseBillWorkflowGuidance
        bill={billFixture({ status: "FINALIZED", balanceDue: "115.0000" })}
        actionLoading={false}
        canFinalizeBill
        canCreateSupplierPayment
        canCreateDebitNote
        canDownloadGeneratedDocuments
        onFinalize={jest.fn()}
        onDownloadPdf={jest.fn()}
      />,
    );

    expect(screen.getByText("Finalized/posted")).toBeInTheDocument();
    expect(screen.getByText("Unpaid")).toBeInTheDocument();
    expect(screen.getByText(/supplier payable is open/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Record supplier payment" })).toHaveAttribute(
      "href",
      "/purchases/supplier-payments/new?supplierId=00000000-0000-0000-0000-000000000201&billId=00000000-0000-0000-0000-000000000701&returnTo=%2Fpurchases%2Fbills%2F00000000-0000-0000-0000-000000000701",
    );
    expect(screen.getByRole("link", { name: "Create debit note" })).toHaveAttribute(
      "href",
      "/purchases/debit-notes/new?billId=00000000-0000-0000-0000-000000000701&supplierId=00000000-0000-0000-0000-000000000201&returnTo=%2Fpurchases%2Fbills%2F00000000-0000-0000-0000-000000000701",
    );
    expect(screen.getByRole("button", { name: "Download purchase bill PDF" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open archive" })).toHaveAttribute("href", "/documents");
    expect(screen.getByRole("link", { name: "View supplier ledger" })).toHaveAttribute(
      "href",
      "/suppliers/00000000-0000-0000-0000-000000000201",
    );
    expect(screen.getByRole("link", { name: "AP report" })).toHaveAttribute(
      "href",
      "/reports/aged-payables?returnTo=%2Fpurchases%2Fbills%2F00000000-0000-0000-0000-000000000701",
    );
  });

  it("preserves statement return context on supplier payment and debit note actions", () => {
    render(
      <PurchaseBillWorkflowGuidance
        bill={billFixture({ status: "FINALIZED", balanceDue: "115.0000" })}
        actionLoading={false}
        canFinalizeBill
        canCreateSupplierPayment
        canCreateDebitNote
        canDownloadGeneratedDocuments
        returnTo="/contacts/contact-1?section=supplier-statement&returnTo=%2Fsuppliers%2F00000000-0000-0000-0000-000000000201"
        onFinalize={jest.fn()}
        onDownloadPdf={jest.fn()}
      />,
    );

    expect(screen.getByRole("link", { name: "Record supplier payment" })).toHaveAttribute(
      "href",
      "/purchases/supplier-payments/new?supplierId=00000000-0000-0000-0000-000000000201&billId=00000000-0000-0000-0000-000000000701&returnTo=%2Fpurchases%2Fbills%2F00000000-0000-0000-0000-000000000701%3FreturnTo%3D%252Fcontacts%252Fcontact-1%253Fsection%253Dsupplier-statement%2526returnTo%253D%25252Fsuppliers%25252F00000000-0000-0000-0000-000000000201",
    );
    expect(screen.getByRole("link", { name: "Create debit note" })).toHaveAttribute(
      "href",
      "/purchases/debit-notes/new?billId=00000000-0000-0000-0000-000000000701&supplierId=00000000-0000-0000-0000-000000000201&returnTo=%2Fpurchases%2Fbills%2F00000000-0000-0000-0000-000000000701%3FreturnTo%3D%252Fcontacts%252Fcontact-1%253Fsection%253Dsupplier-statement%2526returnTo%253D%25252Fsuppliers%25252F00000000-0000-0000-0000-000000000201",
    );
  });

  it("renders Arabic purchase bill guidance without changing action routes", () => {
    render(
      <AppLocaleProvider initialLocale="ar">
        <PurchaseBillWorkflowGuidance
          bill={billFixture({ status: "FINALIZED", balanceDue: "115.0000" })}
          actionLoading={false}
          canFinalizeBill
          canCreateSupplierPayment
          canCreateDebitNote
          canDownloadGeneratedDocuments
          returnTo="/contacts/contact-1?section=supplier-statement&returnTo=%2Fsuppliers%2F00000000-0000-0000-0000-000000000201"
          onFinalize={jest.fn()}
          onDownloadPdf={jest.fn()}
        />
      </AppLocaleProvider>,
    );

    expect(screen.getByText("منتهية/مرحلة")).toBeInTheDocument();
    expect(screen.getByText("غير مدفوعة")).toBeInTheDocument();
    expect(screen.getByText(/مستحق المورد مفتوح/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "تسجيل دفعة مورد" })).toHaveAttribute(
      "href",
      "/purchases/supplier-payments/new?supplierId=00000000-0000-0000-0000-000000000201&billId=00000000-0000-0000-0000-000000000701&returnTo=%2Fpurchases%2Fbills%2F00000000-0000-0000-0000-000000000701%3FreturnTo%3D%252Fcontacts%252Fcontact-1%253Fsection%253Dsupplier-statement%2526returnTo%253D%25252Fsuppliers%25252F00000000-0000-0000-0000-000000000201",
    );
    expect(screen.getByRole("link", { name: "إنشاء إشعار مدين" })).toHaveAttribute(
      "href",
      "/purchases/debit-notes/new?billId=00000000-0000-0000-0000-000000000701&supplierId=00000000-0000-0000-0000-000000000201&returnTo=%2Fpurchases%2Fbills%2F00000000-0000-0000-0000-000000000701%3FreturnTo%3D%252Fcontacts%252Fcontact-1%253Fsection%253Dsupplier-statement%2526returnTo%253D%25252Fsuppliers%25252F00000000-0000-0000-0000-000000000201",
    );
    expect(screen.getByRole("link", { name: "عرض دفتر المورد" })).toHaveAttribute(
      "href",
      "/suppliers/00000000-0000-0000-0000-000000000201",
    );
    expect(screen.getByRole("link", { name: "تقرير الدائنين" })).toHaveAttribute(
      "href",
      "/reports/aged-payables?returnTo=%2Fpurchases%2Fbills%2F00000000-0000-0000-0000-000000000701%3FreturnTo%3D%252Fcontacts%252Fcontact-1%253Fsection%253Dsupplier-statement%2526returnTo%253D%25252Fsuppliers%25252F00000000-0000-0000-0000-000000000201",
    );
  });

  it("hides source PDF action without generated document download permission", () => {
    render(
      <PurchaseBillWorkflowGuidance
        bill={billFixture({ status: "FINALIZED", balanceDue: "115.0000" })}
        actionLoading={false}
        canFinalizeBill
        canCreateSupplierPayment
        canCreateDebitNote
        canDownloadGeneratedDocuments={false}
        onFinalize={jest.fn()}
        onDownloadPdf={jest.fn()}
      />,
    );

    expect(screen.queryByRole("button", { name: "Download purchase bill PDF" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open archive" })).toHaveAttribute("href", "/documents");
  });

  it("uses the incoming shared statement return path for the back action", async () => {
    searchParamsMock = new URLSearchParams("returnTo=%2Fcontacts%2Fcontact-1%3Fsection%3Dsupplier-statement%26returnTo%3D%252Fsuppliers%252F00000000-0000-0000-0000-000000000201");
    apiRequestMock.mockImplementation((path: string) => {
      if (path === "/purchase-bills/00000000-0000-0000-0000-000000000701") {
        return Promise.resolve(billFixture({ status: "FINALIZED", balanceDue: "115.0000" }));
      }
      return Promise.resolve(null);
    });

    render(<PurchaseBillDetailPage />);

    await waitFor(() =>
      expect(screen.getByRole("link", { name: "Back" })).toHaveAttribute(
        "href",
        "/contacts/contact-1?section=supplier-statement&returnTo=%2Fsuppliers%2F00000000-0000-0000-0000-000000000201",
      ),
    );
  });
});

function billFixture(overrides: Partial<PurchaseBill> = {}): PurchaseBill {
  return {
    id: "00000000-0000-0000-0000-000000000701",
    organizationId: "org-1",
    billNumber: "BILL-001",
    supplierId: "00000000-0000-0000-0000-000000000201",
    branchId: null,
    billDate: "2026-05-21T00:00:00.000Z",
    dueDate: null,
    currency: "SAR",
    status: "DRAFT",
    inventoryPostingMode: "DIRECT_EXPENSE_OR_ASSET",
    subtotal: "100.0000",
    discountTotal: "0.0000",
    taxableTotal: "100.0000",
    taxTotal: "15.0000",
    total: "115.0000",
    balanceDue: "115.0000",
    notes: null,
    terms: null,
    finalizedAt: null,
    journalEntryId: null,
    reversalJournalEntryId: null,
    supplier: {
      id: "00000000-0000-0000-0000-000000000201",
      name: "Beta Supplier",
      displayName: "Beta Supplier",
      type: "SUPPLIER",
      taxNumber: null,
    },
    branch: null,
    purchaseOrderId: null,
    purchaseOrder: null,
    journalEntry: null,
    reversalJournalEntry: null,
    lines: [],
    paymentAllocations: [],
    supplierPaymentUnappliedAllocations: [],
    debitNotes: [],
    debitNoteAllocations: [],
    ...overrides,
  };
}
