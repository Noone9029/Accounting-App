import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import BillingSettingsPage from "./settings/billing/page";
import PlansPage from "./plans/page";

const apiRequestMock = jest.fn();
let organizationId: string | null = "organization-a";
let canManage = true;

jest.mock("@/hooks/use-active-organization", () => ({ useActiveOrganizationId: () => organizationId }));
jest.mock("@/components/permissions/permission-provider", () => ({ usePermissions: () => ({ can: () => canManage }) }));
jest.mock("@/lib/api", () => ({ apiRequest: (...args: unknown[]) => apiRequestMock(...args) }));

describe("billing settings and plans", () => {
  beforeEach(() => {
    organizationId = "organization-a";
    canManage = true;
    apiRequestMock.mockReset();
  });

  it("renders controlled-beta and provider-disabled status without a price or provider identifier", async () => {
    apiRequestMock.mockResolvedValue({ account: null, subscription: null, access: { accessMode: "FULL", enforcementMode: "DISABLED" }, providerReadiness: { status: "DISABLED", warnings: [] } });
    render(<BillingSettingsPage />);
    await waitFor(() => expect(screen.getByText("Controlled beta")).toBeInTheDocument());
    expect(screen.getByText(/Subscription collection and provider execution remain disabled/i)).toBeInTheDocument();
    expect(screen.getByText(/No payment collection, public pricing, provider portal, or checkout is enabled/i)).toBeInTheDocument();
    expect(screen.queryByText(/XTS|fake_price|Stripe/i)).not.toBeInTheDocument();
  });

  it.each([
    ["TRIALING", "Your trial is active"],
    ["ACTIVE", "Subscription collection and provider execution remain disabled"],
    ["GRACE", "Your grace period is active"],
    ["SUSPENDED", "Accounting changes are read-only"],
    ["CANCEL_AT_PERIOD_END", "Subscription collection and provider execution remain disabled"],
    ["CANCELED", "Subscription collection and provider execution remain disabled"],
  ])("renders the %s lifecycle state safely", async (status, note) => {
    apiRequestMock.mockResolvedValue({ account: { provider: "DISABLED", status: "ACTIVE" }, subscription: { id: "synthetic-subscription", status, interval: "MONTH", planKey: "STARTER", planName: "Starter", trialEndsAt: null, graceDeadline: null, currentPeriodEndsAt: null, cancelAtPeriodEnd: status === "CANCEL_AT_PERIOD_END", version: 1 }, access: { accessMode: status === "SUSPENDED" ? "READ_ONLY" : "FULL", enforcementMode: "ENFORCE" }, providerReadiness: { status: "DISABLED", warnings: [] } });
    render(<BillingSettingsPage />);
    await waitFor(() => expect(screen.getByText(note, { exact: false })).toBeInTheDocument());
  });

  it("keeps billing mutation controls disabled for a viewer", async () => {
    canManage = false;
    apiRequestMock.mockResolvedValue({ account: null, subscription: null, access: { accessMode: "FULL", enforcementMode: "DISABLED" }, providerReadiness: { status: "DISABLED", warnings: [] } });
    render(<BillingSettingsPage />);
    await waitFor(() => expect(screen.getByText(/Billing permission required/i)).toBeInTheDocument());
    expect(screen.getByRole("button", { name: /Manage subscription/i })).toBeDisabled();
  });

  it("keeps the plan view capability-only, compliance-blocked, and RTL-safe", async () => {
    apiRequestMock.mockResolvedValue([{ key: "STARTER", displayName: "Starter", entitlements: [{ key: "core_accounting", booleanValue: true, integerValue: null, stringValue: null }] }]);
    render(<div dir="rtl"><PlansPage /></div>);
    await waitFor(() => expect(screen.getByRole("heading", { name: "Starter" })).toBeInTheDocument());
    expect(screen.getByText(/KSA compliance remains unavailable and UAE compliance is not sellable/i)).toBeInTheDocument();
    expect(screen.getByText(/Public prices and checkout are intentionally unavailable/i)).toBeInTheDocument();
    expect(screen.queryByText(/XTS|fake_price|checkout_/i)).not.toBeInTheDocument();
  });

  it("renders a loading state while the billing request is pending", async () => {
    apiRequestMock.mockReturnValue(new Promise(() => undefined));
    render(<BillingSettingsPage />);
    expect(await screen.findByText("Loading billing status...")).toBeInTheDocument();
  });

  it("renders a safe billing error without exposing provider details", async () => {
    apiRequestMock.mockRejectedValue(new Error("Unable to load billing status."));
    render(<BillingSettingsPage />);
    expect(await screen.findByText("Unable to load billing status.")).toBeInTheDocument();
    expect(screen.queryByText(/fake_price|Stripe/i)).not.toBeInTheDocument();
  });

  it("renders no-organization states without issuing requests", () => {
    organizationId = null;
    render(<><BillingSettingsPage /><PlansPage /></>);
    expect(screen.getByText("Log in and select an organization to view billing.")).toBeInTheDocument();
    expect(screen.getByText("Log in and select an organization to view plans.")).toBeInTheDocument();
    expect(apiRequestMock).not.toHaveBeenCalled();
  });
});
