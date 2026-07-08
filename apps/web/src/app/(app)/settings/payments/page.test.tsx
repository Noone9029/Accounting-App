import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import PaymentReadinessPage from "./page";

const apiRequestMock = jest.fn();

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

describe("PaymentReadinessPage", () => {
  beforeEach(() => {
    apiRequestMock.mockReset();
    apiRequestMock.mockImplementation((path: string) => {
      if (path === "/payments/provider-readiness") {
        return Promise.resolve({
          provider: "STRIPE",
          readOnly: true,
          noPaymentInitiated: true,
          noSecretsReturned: true,
          providerConfigured: false,
          paymentLinksEnabled: false,
          mockLinksEnabled: false,
          readyForNonProductionTest: false,
          webhookSecretConfigured: false,
          productionReady: false,
          blockers: ["Stripe provider config is not created.", "Stripe payment-link creation is disabled by default."],
          warnings: ["This endpoint never returns Stripe secret keys or webhook secrets."],
          config: null,
        });
      }
      if (path === "/sales-invoices/invoice-1/payment-link") {
        return Promise.resolve({
          id: "link-1",
          status: "BLOCKED_PROVIDER_DISABLED",
          paymentUrl: null,
          noPaymentInitiated: true,
          providerConfigured: false,
          blockers: ["Stripe provider config is not created."],
        });
      }
      return Promise.resolve({});
    });
  });

  it("renders provider-disabled payment readiness without secret claims", async () => {
    render(<PaymentReadinessPage />);

    expect(await screen.findByRole("heading", { name: "Payment readiness" })).toBeInTheDocument();
    expect(screen.getByText("Provider not configured")).toBeInTheDocument();
    expect(screen.getByText(/Secret keys and webhook secrets are never displayed/i)).toBeInTheDocument();
    expect(screen.getByText("Stripe provider config is not created.")).toBeInTheDocument();
    expect(screen.getAllByText("No").length).toBeGreaterThan(2);
  });

  it("creates a payment-link readiness record without initiating payment", async () => {
    render(<PaymentReadinessPage />);

    await screen.findByText("Stripe provider config is not created.");
    fireEvent.change(screen.getByPlaceholderText("Finalized sales invoice UUID"), { target: { value: "invoice-1" } });
    fireEvent.click(screen.getByRole("button", { name: "Create readiness record" }));

    await waitFor(() =>
      expect(apiRequestMock).toHaveBeenCalledWith("/sales-invoices/invoice-1/payment-link", {
        method: "POST",
        body: { provider: "STRIPE", note: undefined },
      }),
    );
    expect(await screen.findByText("Payment-link result")).toBeInTheDocument();
    expect(screen.getByText("BLOCKED PROVIDER DISABLED")).toBeInTheDocument();
    expect(screen.getByText("Not created")).toBeInTheDocument();
  });
});
