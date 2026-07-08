import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import SupplierPayoutRequestsPage from "./page";

const apiRequestMock = jest.fn();

jest.mock("@/hooks/use-active-organization", () => ({
  useActiveOrganizationId: () => "org-1",
}));

jest.mock("@/lib/api", () => ({
  apiRequest: (...args: unknown[]) => apiRequestMock(...args),
}));

describe("SupplierPayoutRequestsPage", () => {
  beforeEach(() => {
    apiRequestMock.mockReset();
  });

  it("renders payout requests with safe status labels and no money movement action", async () => {
    apiRequestMock.mockResolvedValue([safeRequest()]);

    render(<SupplierPayoutRequestsPage />);

    expect(await screen.findByRole("heading", { name: "Supplier payout requests" })).toBeInTheDocument();
    expect(screen.getAllByText("Manually Released Externally").length).toBeGreaterThan(0);
    expect(screen.getByText("Supplier One")).toBeInTheDocument();
    expect(screen.getByText("BILL-1")).toBeInTheDocument();
    expect(screen.getByText("masked_7890")).toBeInTheDocument();
    expect(screen.getByText(/does not connect to Wio, store bank credentials, send money, or initiate supplier payouts/i)).toBeInTheDocument();

    const text = document.body.textContent ?? "";
    expect(text).not.toContain("AE070331234567890123456");
    expect(text).not.toContain("manual-bank-confirmation-1234567890");
    expect(text).not.toMatch(/password|secret|api key|authorization|cookie/i);
    expect(screen.queryByRole("button", { name: /send money|release payment|pay supplier/i })).not.toBeInTheDocument();
  });

  it("passes filters to the safe API list endpoint", async () => {
    apiRequestMock.mockResolvedValue([]);
    render(<SupplierPayoutRequestsPage />);

    await screen.findByRole("heading", { name: "Supplier payout requests" });
    fireEvent.change(screen.getByLabelText(/Status/i), { target: { value: "RELEASE_BLOCKED" } });
    fireEvent.change(screen.getByLabelText(/Reconciliation/i), { target: { value: "UNRECONCILED" } });
    fireEvent.change(screen.getByLabelText(/Supplier ID/i), { target: { value: "11111111-1111-1111-1111-111111111111" } });
    fireEvent.change(screen.getByLabelText(/Purchase bill ID/i), { target: { value: "22222222-2222-2222-2222-222222222222" } });
    fireEvent.change(screen.getByLabelText(/From/i), { target: { value: "2026-07-01" } });
    fireEvent.change(screen.getByLabelText(/To/i), { target: { value: "2026-07-31" } });
    fireEvent.click(screen.getByRole("button", { name: /Apply filters/i }));

    await waitFor(() =>
      expect(apiRequestMock).toHaveBeenLastCalledWith(
        "/bank-integrations/vendor-payment-requests?status=RELEASE_BLOCKED&supplierId=11111111-1111-1111-1111-111111111111&purchaseBillId=22222222-2222-2222-2222-222222222222&from=2026-07-01T00%3A00%3A00.000Z&to=2026-07-31T23%3A59%3A59.000Z&reconciliationState=UNRECONCILED",
      ),
    );
    expect(screen.getByText(/No supplier payout requests found/i)).toBeInTheDocument();
  });
});

function safeRequest() {
  return {
    id: "payreq-1",
    organizationId: "org-1",
    supplierId: "supplier-1",
    purchaseBillId: "bill-1",
    bankConnectionId: "conn-1",
    beneficiaryMappingId: "mapping-1",
    bankFeedTransactionId: "feed-txn-1",
    bankStatementTransactionId: null,
    status: "RELEASED_EXTERNALLY",
    amount: "50.0000",
    currency: "AED",
    memo: null,
    externalReleaseReferenceMasked: "masked_7890",
    releaseBlockedReason: "Real bank payment release is not implemented. No money movement was attempted.",
    approvedAt: "2026-07-08T12:05:00.000Z",
    manuallyReleasedAt: "2026-07-08T12:10:00.000Z",
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
    noSecretsReturned: true,
    noBankCredentialsStored: true,
    noMoneyMovement: true,
  };
}
