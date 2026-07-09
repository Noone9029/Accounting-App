import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import BankIntegrationSettingsPage from "./page";

const apiRequestMock = jest.fn();

jest.mock("@/hooks/use-active-organization", () => ({
  useActiveOrganizationId: () => "org-1",
}));

jest.mock("@/lib/api", () => ({
  apiRequest: (...args: unknown[]) => apiRequestMock(...args),
}));

describe("BankIntegrationSettingsPage", () => {
  beforeEach(() => {
    apiRequestMock.mockReset();
    apiRequestMock.mockResolvedValue({
      provider: "WIO_DISABLED_PLACEHOLDER",
      providerStateLabel: "Future Provider",
      noSecretsReturned: true,
      noBankCredentialsStored: true,
      noRealWioApiCalls: true,
      noMoneyMovement: true,
      manualImportStillSupported: true,
      counts: { connections: 0, feedAccounts: 0, paymentRequests: 0 },
      surfaces: {
        bankConnection: {
          provider: "WIO_DISABLED_PLACEHOLDER",
          status: "DISABLED",
          stateLabel: "Future Provider",
          canCreateLocalMockConnection: false,
          blockers: ["Bank provider is disabled or future-only."],
        },
        bankFeed: {
          provider: "WIO_DISABLED_PLACEHOLDER",
          status: "NOT_CONFIGURED",
          stateLabel: "Future Provider",
          canRecordMockSync: false,
          blockers: ["No bank feed provider is configured. Manual statement imports remain the supported path."],
        },
        beneficiaryMapping: {
          provider: "WIO_DISABLED_PLACEHOLDER",
          status: "NEEDS_REVIEW",
          stateLabel: "Future Provider",
          safeReferencesOnly: true,
          blockers: [],
        },
        vendorPayment: {
          provider: "WIO_DISABLED_PLACEHOLDER",
          status: "RELEASE_BLOCKED",
          stateLabel: "Blocked",
          releaseBlocked: true,
          blockers: ["Bank payment release is blocked until a real provider implementation is explicitly added and approved."],
        },
      },
      warnings: ["Real Wio integration is a disabled placeholder. No Wio API calls, bank credentials, or payment initiation are implemented."],
    });
  });

  it("renders Wio readiness as disabled/future-only without exposing secret or account values", async () => {
    render(<BankIntegrationSettingsPage />);

    expect(await screen.findByRole("heading", { name: "Bank integration readiness" })).toBeInTheDocument();
    expect(screen.getAllByText("Future Provider").length).toBeGreaterThan(0);
    expect(screen.getByText(/does not connect to Wio, store bank credentials, fetch live bank feeds, or move money/i)).toBeInTheDocument();
    expect(screen.getByText("No bank feed provider is configured. Manual statement imports remain the supported path.")).toBeInTheDocument();
    expect(screen.getByText("Bank payment release is blocked until a real provider implementation is explicitly added and approved.")).toBeInTheDocument();

    const text = document.body.textContent ?? "";
    expect(text).not.toContain("AE070331234567890123456");
    expect(text).not.toMatch(/password|secret token|api key/i);
  });
});
