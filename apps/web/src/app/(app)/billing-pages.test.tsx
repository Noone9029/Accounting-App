import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import BillingSettingsPage from "./settings/billing/page";
import PlansPage from "./plans/page";

const apiRequestMock = jest.fn();
const mockRouter = { push: jest.fn() };
let organizationId: string | null = "organization-a";
let canManage = true;
let mockLocale: "en" | "ar" = "en";

jest.mock("next/navigation", () => ({ useRouter: () => mockRouter }));
jest.mock("@/components/app-locale-provider", () => ({ useAppLocale: () => ({ locale: mockLocale }) }));
jest.mock("@/hooks/use-active-organization", () => ({ useActiveOrganizationId: () => organizationId }));
jest.mock("@/components/permissions/permission-provider", () => ({ usePermissions: () => ({ can: () => canManage }) }));
jest.mock("@/lib/api", () => ({ apiRequest: (...args: unknown[]) => apiRequestMock(...args) }));

const catalog = {
  plans: [
    { key: "STARTER", displayName: "Starter", amountMinor: 14900, seats: 3, providerPriceReference: "price_private" },
    { key: "GROWTH", displayName: "Growth", amountMinor: 29900, seats: 10 },
  ],
  trialDays: 14, selfServiceEnabled: true, seller: { legalName: null },
  taxDisplay: "Applicable taxes are shown before checkout.",
};

function billingStatus(state: string | null = null, accessMode = state === "SUSPENDED" || state === "CANCELED" ? "READ_ONLY" : state ? "FULL" : "BILLING_ONLY") {
  return {
    account: { provider: "STRIPE", status: "ACTIVE", providerCustomerReference: "cus_private" },
    subscription: state ? {
      id: "synthetic-subscription", providerSubscriptionReference: "sub_private", status: state, interval: "MONTH",
      planKey: "STARTER", planName: "Starter", trialEndsAt: "2026-10-03T12:00:00.000Z", graceDeadline: null,
      currentPeriodEndsAt: "2026-10-19T12:00:00.000Z", cancelAtPeriodEnd: state === "CANCEL_AT_PERIOD_END", version: 1,
    } : null,
    access: { accessMode, enforcementMode: "ENFORCE" },
    providerReadiness: { status: "DISABLED", warnings: [], checkoutEnabled: false, portalEnabled: false, networkEnabled: false },
  };
}

function mockBilling(status = billingStatus(), publicCatalog = catalog) {
  apiRequestMock.mockImplementation((path: string) => {
    if (path === "/billing/catalog") return Promise.resolve(publicCatalog);
    if (path === "/billing/plans") return Promise.resolve([{ key: "STARTER", planVersionId: "starter-version", providerPriceReference: "price_private" }]);
    if (path === "/billing/status") return Promise.resolve(status);
    if (path === "/billing/trial") return Promise.resolve({ status: "TRIALING" });
    return Promise.reject(new Error("Unexpected route " + path));
  });
}

describe("billing settings and plans", () => {
  beforeEach(() => {
    organizationId = "organization-a";
    canManage = true;
    mockLocale = "en";
    apiRequestMock.mockReset();
    mockRouter.push.mockReset();
    mockBilling();
  });

  it("shows test-mode limits and disables provider actions without rendering provider identifiers", async () => {
    mockBilling(billingStatus("ACTIVE"));
    render(<BillingSettingsPage />);
    expect(await screen.findByText("Current access")).toBeInTheDocument();
    expect(screen.getByText("Test mode")).toBeInTheDocument();
    expect(screen.getByText(/Live billing is not enabled/)).toBeInTheDocument();
    expect(screen.getByText(/A checkout return page does not confirm payment/)).toBeInTheDocument();
    for (const name of ["Manage payment method", "Change plan", "Cancel renewal"]) {
      const button = screen.getByRole("button", { name });
      expect(button).toBeDisabled();
      fireEvent.click(button);
    }
    expect(apiRequestMock.mock.calls.map(([path]) => path)).toEqual(["/billing/status"]);
    expect(screen.queryByText(/cus_private|sub_private|price_private|synthetic-subscription/)).not.toBeInTheDocument();
  });

  it.each([
    ["TRIALING", "FULL", "Your 14-day trial is active. No card is required."],
    ["ACTIVE", "FULL", "Manage your subscription and review access below."],
    ["GRACE", "FULL", "Update your payment method before the grace deadline to keep editing."],
    ["SUSPENDED", "READ_ONLY", "Accounting changes are read-only. Your records, billing and support remain available."],
    ["CANCEL_AT_PERIOD_END", "FULL", "Manage your subscription and review access below."],
    ["CANCELED", "READ_ONLY", "Accounting changes are read-only. Your records, billing and support remain available."],
    // Request-time expiry is authoritative even before the worker updates persisted status.
    ["TRIALING", "READ_ONLY", "Accounting changes are read-only. Your records, billing and support remain available."],
    ["GRACE", "READ_ONLY", "Accounting changes are read-only. Your records, billing and support remain available."],
  ])("renders %s with effective %s access", async (state, access, note) => {
    mockBilling(billingStatus(state, access));
    render(<BillingSettingsPage />);
    expect(await screen.findByText(note)).toBeInTheDocument();
    expect(screen.getByText(state.replace(/_/g, " "))).toBeInTheDocument();
    if (access === "READ_ONLY") {
      expect(screen.getByText("Read only")).toBeInTheDocument();
      expect(screen.queryByText("Your 14-day trial is active. No card is required.")).not.toBeInTheDocument();
    }
    if (state === "CANCEL_AT_PERIOD_END") expect(screen.getByRole("button", { name: "Resume renewal" })).toBeDisabled();
  });

  it("keeps mutation controls disabled for a viewer even when the provider is ready", async () => {
    canManage = false;
    const status = billingStatus("ACTIVE");
    status.providerReadiness = { ...status.providerReadiness, networkEnabled: true, portalEnabled: true, checkoutEnabled: true };
    mockBilling(status);
    render(<BillingSettingsPage />);
    expect(await screen.findByText("Billing permission required")).toBeInTheDocument();
    for (const name of ["Manage payment method", "Change plan", "Cancel renewal"]) expect(screen.getByRole("button", { name })).toBeDisabled();
    expect(screen.getByRole("link", { name: "Review plans" })).toHaveAttribute("href", "/plans");
  });

  it("shows public monthly prices, seat limits and trial terms without compliance or live-payment claims", async () => {
    render(<PlansPage />);
    expect(await screen.findByRole("heading", { name: "Starter" })).toBeInTheDocument();
    expect(screen.getByText(/SAR 149/)).toBeInTheDocument();
    expect(screen.getByText(/SAR 299/)).toBeInTheDocument();
    expect(screen.getByText(/3 seats, including the owner/)).toBeInTheDocument();
    expect(screen.getByText(/10 seats, including the owner/)).toBeInTheDocument();
    expect(screen.getAllByText("14-day trial. No card required.")).toHaveLength(2);
    expect(screen.getByText(/Tax-authority submission and live banking are not included/)).toBeInTheDocument();
    expect(screen.getByText(/Payment collection is currently limited to separately configured Stripe test mode/)).toBeInTheDocument();
    expect(screen.queryByText(/price_private|cus_private|sub_private/)).not.toBeInTheDocument();
    const start = screen.getByRole("button", { name: "Start Starter trial" });
    await waitFor(() => expect(start).toBeEnabled());
    fireEvent.click(start);
    await waitFor(() => expect(mockRouter.push).toHaveBeenCalledWith("/dashboard"));
    expect(apiRequestMock).toHaveBeenCalledWith("/billing/trial", { method: "POST", body: { planKey: "STARTER" } });
  });

  it.each(["viewer", "closed"])("disables trial enrollment for %s", async (reason) => {
    canManage = reason !== "viewer";
    mockBilling(billingStatus(), { ...catalog, selfServiceEnabled: reason !== "closed" });
    render(<PlansPage />);
    const trial = await screen.findByRole("button", { name: "Start Starter trial" });
    await waitFor(() => expect(apiRequestMock).toHaveBeenCalledWith("/billing/status"));
    expect(trial).toBeDisabled();
    fireEvent.click(trial);
    expect(apiRequestMock.mock.calls.some(([path]) => path === "/billing/trial")).toBe(false);
  });

  it("keeps checkout disabled for an existing trial when provider execution is disabled", async () => {
    mockBilling(billingStatus("TRIALING"));
    render(<PlansPage />);
    const subscribe = await screen.findByRole("button", { name: "Subscribe to Starter (test)" });
    expect(subscribe).toBeDisabled();
    fireEvent.click(subscribe);
    expect(apiRequestMock.mock.calls.some(([path]) => path === "/billing/checkout")).toBe(false);
    expect(screen.getByText(/starts the monthly subscription immediately after successful checkout/)).toBeInTheDocument();
  });

  it("renders the trial and safety copy in Arabic", async () => {
    mockLocale = "ar";
    render(<div dir="rtl"><PlansPage /></div>);
    expect(await screen.findByRole("button", { name: "ابدأ تجربة Starter" })).toBeInTheDocument();
    expect(screen.getAllByText("تجربة لمدة 14 يوماً دون بطاقة دفع.")).toHaveLength(2);
    expect(screen.getByText(/لا تشمل الخطط الإرسال إلى هيئة الزكاة والضريبة والجمارك أو الربط البنكي المباشر/)).toBeInTheDocument();
    expect(screen.queryByText("14-day trial. No card required.")).not.toBeInTheDocument();
  });

  it("renders a loading state while the billing request is pending", async () => {
    apiRequestMock.mockReturnValue(new Promise(() => undefined));
    render(<BillingSettingsPage />);
    expect(await screen.findByText("Loading billing status...")).toBeInTheDocument();
  });

  it("renders a safe billing error without rendering synthetic provider identifiers", async () => {
    apiRequestMock.mockRejectedValue(new Error("Unable to load billing status."));
    render(<BillingSettingsPage />);
    expect(await screen.findByText("Unable to load billing status.")).toBeInTheDocument();
    expect(screen.queryByText(/price_private|cus_private|sub_private/)).not.toBeInTheDocument();
  });

  it("loads only the public catalog without an organization and disables tenant actions", async () => {
    organizationId = null;
    render(<><BillingSettingsPage /><PlansPage /></>);
    expect(screen.getByText("Log in and select an organization to view billing.")).toBeInTheDocument();
    expect(screen.getByText("Log in and create an organization to choose a plan.")).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Starter" })).toBeInTheDocument();
    const refresh = screen.getByRole("button", { name: "Refresh" });
    expect(refresh).toBeDisabled();
    fireEvent.click(refresh);
    expect(screen.getByRole("button", { name: "Start Starter trial" })).toBeDisabled();
    expect(apiRequestMock.mock.calls).toEqual([["/billing/catalog", { auth: false, organizationId: null }]]);
  });
});
