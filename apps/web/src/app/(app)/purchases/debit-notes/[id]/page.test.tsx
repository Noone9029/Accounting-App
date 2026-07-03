import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { PurchaseDebitNoteWorkflowGuidance } from "./page";
import { AppLocaleProvider } from "@/components/app-locale-provider";
import type { PurchaseDebitNote } from "@/lib/types";

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
  useRouter: () => ({ refresh: jest.fn() }),
}));

describe("purchase debit note workflow guidance", () => {
  it("explains draft debit-note state and shows the finalize action", () => {
    render(
      <PurchaseDebitNoteWorkflowGuidance
        debitNote={debitNoteFixture({ status: "DRAFT" })}
        appliedAmount="0.0000"
        actionLoading={false}
        canFinalizeDebitNote
        canApplyDebitNote={false}
        canDownloadGeneratedDocuments
        onFinalize={jest.fn()}
        onDownloadPdf={jest.fn()}
      />,
    );

    expect(screen.getByText("Draft")).toBeInTheDocument();
    expect(screen.getByText(/draft debit note is saved and editable/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Finalize debit note" })).toBeInTheDocument();
  });

  it("shows bill, supplier ledger, AP report, and safe ZATCA guidance after finalization", () => {
    render(
      <PurchaseDebitNoteWorkflowGuidance
        debitNote={debitNoteFixture({ status: "FINALIZED", unappliedAmount: "25.0000" })}
        appliedAmount="90.0000"
        actionLoading={false}
        canFinalizeDebitNote
        canApplyDebitNote
        canDownloadGeneratedDocuments
        onFinalize={jest.fn()}
        onDownloadPdf={jest.fn()}
      />,
    );

    expect(screen.getByText("Finalized")).toBeInTheDocument();
    expect(screen.getByText("Unapplied debit")).toBeInTheDocument();
    expect(screen.getByText(/remaining unapplied amount can be applied to open bills/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View original bill" })).toHaveAttribute("href", "/purchases/bills/bill-1");
    expect(screen.getByRole("button", { name: "Download debit note PDF" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open archive" })).toHaveAttribute("href", "/documents");
    expect(screen.getByRole("link", { name: "Open supplier workspace" })).toHaveAttribute("href", "/suppliers/supplier-1");
    expect(screen.getByRole("link", { name: "AP report" })).toHaveAttribute("href", "/reports/aged-payables");
    expect(screen.getByText(/ZATCA handling here is local\/readiness only/)).toBeInTheDocument();
    expect(screen.queryByText(/production submission is connected/i)).not.toBeInTheDocument();
  });

  it("hides source PDF action without generated document download permission", () => {
    render(
      <PurchaseDebitNoteWorkflowGuidance
        debitNote={debitNoteFixture({ status: "FINALIZED", unappliedAmount: "25.0000" })}
        appliedAmount="90.0000"
        actionLoading={false}
        canFinalizeDebitNote
        canApplyDebitNote
        canDownloadGeneratedDocuments={false}
        onFinalize={jest.fn()}
        onDownloadPdf={jest.fn()}
      />,
    );

    expect(screen.queryByRole("button", { name: "Download debit note PDF" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open archive" })).toHaveAttribute("href", "/documents");
  });

  it("renders finalized workflow guidance in Arabic without changing links", () => {
    render(
      <AppLocaleProvider initialLocale="ar">
        <PurchaseDebitNoteWorkflowGuidance
          debitNote={debitNoteFixture({ status: "FINALIZED", unappliedAmount: "25.0000" })}
          appliedAmount="90.0000"
          actionLoading={false}
          canFinalizeDebitNote
          canApplyDebitNote
          canDownloadGeneratedDocuments
          onFinalize={jest.fn()}
          onDownloadPdf={jest.fn()}
        />
      </AppLocaleProvider>,
    );

    expect(screen.getByText("نهائية")).toBeInTheDocument();
    expect(screen.getByText("رصيد مدين غير مخصص")).toBeInTheDocument();
    expect(screen.getByText(/خفض مستحق المورد/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "عرض الفاتورة الأصلية" })).toHaveAttribute("href", "/purchases/bills/bill-1");
    expect(screen.getByRole("button", { name: "تنزيل PDF الإشعار المدين" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "فتح الأرشيف" })).toHaveAttribute("href", "/documents");
    expect(screen.getByRole("link", { name: "فتح مساحة عمل المورد" })).toHaveAttribute("href", "/suppliers/supplier-1");
    expect(screen.getByRole("link", { name: "تقرير الدائنين" })).toHaveAttribute("href", "/reports/aged-payables");
    expect(screen.queryByText(/production submission is connected/i)).not.toBeInTheDocument();
  });
});

function debitNoteFixture(overrides: Partial<PurchaseDebitNote> = {}): PurchaseDebitNote {
  return {
    id: "debit-note-1",
    organizationId: "org-1",
    debitNoteNumber: "PDN-001",
    supplierId: "supplier-1",
    originalBillId: "bill-1",
    branchId: null,
    issueDate: "2026-05-21T00:00:00.000Z",
    currency: "SAR",
    status: "DRAFT",
    subtotal: "100.0000",
    discountTotal: "0.0000",
    taxableTotal: "100.0000",
    taxTotal: "15.0000",
    total: "115.0000",
    unappliedAmount: "115.0000",
    notes: null,
    reason: "Supplier adjustment",
    finalizedAt: null,
    journalEntryId: null,
    reversalJournalEntryId: null,
    supplier: { id: "supplier-1", name: "Beta Supplier", displayName: "Beta Supplier", type: "SUPPLIER", taxNumber: null },
    originalBill: { id: "bill-1", billNumber: "BILL-001", billDate: "2026-05-21T00:00:00.000Z", status: "FINALIZED", total: "115.0000", supplierId: "supplier-1" },
    branch: null,
    journalEntry: null,
    reversalJournalEntry: null,
    lines: [],
    allocations: [],
    ...overrides,
  };
}
