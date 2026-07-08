import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import SupplierPayoutRequestDetailPage from "./page";

const apiRequestMock = jest.fn();

jest.mock("next/navigation", () => ({
  useParams: () => ({ id: "payreq-1" }),
}));

jest.mock("@/hooks/use-active-organization", () => ({
  useActiveOrganizationId: () => "org-1",
}));

jest.mock("@/lib/api", () => ({
  apiRequest: (...args: unknown[]) => apiRequestMock(...args),
}));

describe("SupplierPayoutRequestDetailPage", () => {
  beforeEach(() => {
    apiRequestMock.mockReset();
    apiRequestMock.mockResolvedValue(safeDetail());
  });

  it("renders safe detail, masked references, and audit timeline without secret exposure", async () => {
    render(<SupplierPayoutRequestDetailPage />);

    expect(await screen.findByRole("heading", { name: "Payout request detail" })).toBeInTheDocument();
    expect(screen.getByText("Release Blocked")).toBeInTheDocument();
    expect(screen.getAllByText("Supplier One").length).toBeGreaterThan(0);
    expect(screen.getByText("BILL-1")).toBeInTheDocument();
    expect(screen.getByText("masked_4321")).toBeInTheDocument();
    expect(screen.getByText("masked_3456")).toBeInTheDocument();
    expect(screen.getByText("BANK PAYMENT REQUEST APPROVED")).toBeInTheDocument();
    expect(screen.getByText(/No live Wio connection, bank credentials, provider payloads, or payment initiation/i)).toBeInTheDocument();

    const text = document.body.textContent ?? "";
    expect(text).not.toContain("AE070331234567890123456");
    expect(text).not.toContain("manual-bank-confirmation-1234567890");
    expect(text).not.toContain("beneficiary-account");
    expect(text).not.toMatch(/password|secret|api key|authorization|cookie/i);
    expect(screen.queryByRole("button", { name: /send money|release payment|pay supplier/i })).not.toBeInTheDocument();
    expect(apiRequestMock).toHaveBeenCalledWith("/bank-integrations/vendor-payment-requests/payreq-1");
  });
});

function safeDetail() {
  return {
    id: "payreq-1",
    organizationId: "org-1",
    supplierId: "supplier-1",
    purchaseBillId: "bill-1",
    bankConnectionId: "conn-1",
    beneficiaryMappingId: "mapping-1",
    bankFeedTransactionId: "feed-txn-1",
    bankStatementTransactionId: null,
    status: "RELEASE_BLOCKED",
    amount: "50.0000",
    currency: "AED",
    memo: null,
    externalReleaseReferenceMasked: "masked_7890",
    releaseBlockedReason: "Real bank payment release is not implemented. No money movement was attempted.",
    approvedAt: "2026-07-08T12:05:00.000Z",
    manuallyReleasedAt: null,
    reconciledAt: null,
    cancelledAt: null,
    requestId: "req-bank-1",
    createdAt: "2026-07-08T12:00:00.000Z",
    updatedAt: "2026-07-08T12:10:00.000Z",
    supplier: { id: "supplier-1", name: "Supplier One LLC", displayName: "Supplier One" },
    purchaseBill: {
      id: "bill-1",
      billNumber: "BILL-1",
      billDate: "2026-07-01T00:00:00.000Z",
      dueDate: "2026-07-31T00:00:00.000Z",
      status: "FINALIZED",
      total: "50.0000",
      balanceDue: "50.0000",
      currency: "AED",
    },
    bankConnection: {
      id: "conn-1",
      provider: "MOCK_WIO",
      status: "SYNCED",
      displayName: "Wio fixture",
      externalConnectionRefMasked: "masked_7890",
      externalInstitutionName: "Wio local mock",
    },
    beneficiaryMapping: {
      id: "mapping-1",
      provider: "MOCK_WIO",
      status: "MAPPED",
      beneficiaryDisplayName: "Supplier One",
      beneficiaryRefMasked: "masked_4321",
      externalBeneficiaryRefMasked: "masked_7777",
    },
    reconciliation: {
      state: "RECONCILED",
      bankFeedTransaction: {
        id: "feed-txn-1",
        transactionDate: "2026-07-08T00:00:00.000Z",
        description: "Supplier payout fixture",
        reference: "masked-statement-ref",
        type: "DEBIT",
        amount: "50.0000",
        currency: "AED",
        externalTransactionRefMasked: "masked_3456",
      },
      bankStatementTransaction: null,
    },
    auditTimeline: [
      {
        id: "audit-1",
        action: "BANK_PAYMENT_REQUEST_APPROVED",
        actorUserId: "approver-1",
        requestId: "req-bank-1",
        createdAt: "2026-07-08T12:05:00.000Z",
      },
    ],
    noSecretsReturned: true,
    noBankCredentialsStored: true,
    noMoneyMovement: true,
  };
}
