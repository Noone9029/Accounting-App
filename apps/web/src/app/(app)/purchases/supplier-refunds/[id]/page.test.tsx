import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { AppLocaleProvider } from "@/components/app-locale-provider";
import SupplierRefundDetailPage from "./page";
import type { SupplierRefund, SupplierRefundPdfData } from "@/lib/types";

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
  useRouter: () => ({ refresh: jest.fn() }),
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
        return Promise.resolve(pdfFixture());
      }
      return Promise.reject(new Error(`Unexpected path ${path}`));
    });
  });

  it("renders Arabic supplier refund detail without changing record links", async () => {
    render(
      <AppLocaleProvider initialLocale="ar">
        <SupplierRefundDetailPage />
      </AppLocaleProvider>,
    );

    expect((await screen.findAllByText("SREF-001")).length).toBeGreaterThan(0);
    expect(screen.getByText("ترحيل رد المورد يدويا، ومرجع المصدر، وتنزيل PDF.")).toBeInTheDocument();
    expect(screen.getByText("لا يتم تنفيذ تحويل بنكي أو تسوية بنكية أو بوابة دفع أو تقديم إلى زاتكا.")).toBeInTheDocument();
    expect(screen.getByText("الحساب المستلم فيه")).toBeInTheDocument();
    expect(screen.getByText("مصدر الرد")).toBeInTheDocument();
    expect(screen.getByText("معاينة بيانات PDF")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "رجوع" })).toHaveAttribute("href", "/purchases/supplier-refunds");
    expect(screen.getByRole("link", { name: "دفتر المورد" })).toHaveAttribute("href", "/contacts/supplier-1");
    expect(screen.getByRole("link", { name: "عرض المصدر" })).toHaveAttribute("href", "/purchases/debit-notes/debit-note-1");
    expect(screen.getByRole("button", { name: "تنزيل PDF" })).toBeInTheDocument();
  });
});

function refundFixture(overrides: Partial<SupplierRefund> = {}): SupplierRefund {
  return {
    id: "supplier-refund-1",
    organizationId: "org-1",
    refundNumber: "SREF-001",
    supplierId: "supplier-1",
    sourceType: "PURCHASE_DEBIT_NOTE",
    sourcePaymentId: null,
    sourceDebitNoteId: "debit-note-1",
    refundDate: "2026-05-21T00:00:00.000Z",
    currency: "SAR",
    status: "POSTED",
    amountRefunded: "115.0000",
    accountId: "account-1",
    description: "Supplier refund",
    journalEntryId: "journal-1",
    voidReversalJournalEntryId: null,
    postedAt: "2026-05-21T00:00:00.000Z",
    voidedAt: null,
    supplier: { id: "supplier-1", name: "Beta Supplier", displayName: "Beta Supplier", type: "SUPPLIER" },
    account: { id: "account-1", code: "111", name: "Cash on hand", type: "ASSET" },
    sourcePayment: null,
    sourceDebitNote: {
      id: "debit-note-1",
      debitNoteNumber: "PDN-001",
      issueDate: "2026-05-21T00:00:00.000Z",
      status: "FINALIZED",
      total: "115.0000",
      unappliedAmount: "0.0000",
      currency: "SAR",
    },
    journalEntry: { id: "journal-1", entryNumber: "JE-001", status: "POSTED" },
    voidReversalJournalEntry: null,
    ...overrides,
  };
}

function pdfFixture(): SupplierRefundPdfData {
  const refund = refundFixture();
  return {
    organization: {
      id: "org-1",
      name: "LedgerByte",
      legalName: "LedgerByte",
      taxNumber: null,
      countryCode: "SA",
      baseCurrency: "SAR",
      timezone: "Asia/Riyadh",
    },
    supplier: { id: "supplier-1", name: "Beta Supplier", displayName: "Beta Supplier", email: null, phone: null, taxNumber: null },
    refund: {
      id: refund.id,
      refundNumber: refund.refundNumber,
      refundDate: refund.refundDate,
      status: refund.status,
      currency: refund.currency,
      amountRefunded: refund.amountRefunded,
      description: refund.description,
    },
    source: {
      type: refund.sourceType,
      id: "debit-note-1",
      number: "PDN-001",
      date: "2026-05-21T00:00:00.000Z",
      status: "FINALIZED",
      originalAmount: "115.0000",
      remainingUnappliedAmount: "0.0000",
    },
    receivedIntoAccount: { id: "account-1", code: "111", name: "Cash on hand" },
    journalEntry: refund.journalEntry ?? null,
    voidReversalJournalEntry: null,
    generatedAt: "2026-05-21T00:00:00.000Z",
  };
}
