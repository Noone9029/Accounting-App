import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import CurrenciesAndFxSettingsPage from "./page";
import { PERMISSIONS, type Permission } from "@/lib/permissions";

const apiRequestMock = jest.fn();
let organizationId: string | null = "org-1";
let currentPermissions = new Set<Permission>();

jest.mock("@/hooks/use-active-organization", () => ({
  useActiveOrganizationId: () => organizationId,
}));

jest.mock("@/lib/api", () => ({
  apiRequest: (...args: unknown[]) => apiRequestMock(...args),
}));

jest.mock("@/components/permissions/permission-provider", () => ({
  usePermissions: () => ({
    can: (permission: Permission) => currentPermissions.has(permission),
  }),
}));

describe("CurrenciesAndFxSettingsPage", () => {
  beforeEach(() => {
    organizationId = "org-1";
    currentPermissions = new Set([
      PERMISSIONS.currencies.read,
      PERMISSIONS.currencies.manage,
      PERMISSIONS.fxRates.read,
      PERMISSIONS.fxRates.manage,
      PERMISSIONS.accounts.view,
    ]);
    apiRequestMock.mockReset();
    apiRequestMock.mockImplementation(defaultApiResponse);
  });

  it("shows manual-only controls, immutable evidence, and blocked posting readiness", async () => {
    render(<CurrenciesAndFxSettingsPage />);

    expect(await screen.findByRole("heading", { name: "Currencies and FX" })).toBeInTheDocument();
    expect(await screen.findByText("USD/SAR")).toBeInTheDocument();
    expect(screen.getByText(/Base currency is SAR.*fixed for captured-rate evidence/i)).toBeInTheDocument();
    expect(screen.getByText(/Manual rate capture only/i)).toBeInTheDocument();
    expect(screen.getByText(/Live rate provider is disabled/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Foreign-currency document posting remains disabled/i)).toHaveLength(2);
    expect(screen.getByText("3.67250000")).toBeInTheDocument();
    expect(screen.getByText("Treasury worksheet 17")).toBeInTheDocument();
    expect(screen.getByText("Account configuration incomplete")).toBeInTheDocument();
  });

  it("renders accessible loading, empty, and error states", async () => {
    let resolveCurrencies: ((value: unknown) => void) | undefined;
    apiRequestMock.mockImplementation((path: string) => {
      if (path === "/fx/currencies") {
        return new Promise((resolve) => {
          resolveCurrencies = resolve;
        });
      }
      return defaultApiResponse(path);
    });
    const { unmount } = render(<CurrenciesAndFxSettingsPage />);
    expect(screen.getByRole("status", { name: /Loading currency and FX settings/i })).toBeInTheDocument();
    unmount();
    resolveCurrencies?.(currenciesResponse());

    apiRequestMock.mockImplementation((path: string) =>
      path.startsWith("/fx/rates") ? Promise.resolve({ data: [], pagination: { page: 1, limit: 25, hasMore: false } }) : defaultApiResponse(path),
    );
    const empty = render(<CurrenciesAndFxSettingsPage />);
    expect(await screen.findByText("No captured rates" )).toBeInTheDocument();
    empty.unmount();

    apiRequestMock.mockRejectedValue(new Error("FX settings unavailable"));
    render(<CurrenciesAndFxSettingsPage />);
    expect(await screen.findByRole("alert")).toHaveTextContent("FX settings unavailable");
  });

  it("keeps rate and account mutation controls view-only without their dedicated manage permissions", async () => {
    currentPermissions = new Set([PERMISSIONS.currencies.read, PERMISSIONS.fxRates.read, PERMISSIONS.accounts.view]);
    render(<CurrenciesAndFxSettingsPage />);

    expect(await screen.findByText("View-only access")).toBeInTheDocument();
    expect(await screen.findByLabelText("Transaction currency")).toBeDisabled();
    expect(screen.getByLabelText("Exact rate")).toBeDisabled();
    expect(screen.getByLabelText("Realized gain account")).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Capture immutable rate" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Save FX accounts" })).not.toBeInTheDocument();
    expect(screen.getByText(/FX rate management permission is required to capture a rate/i)).toBeInTheDocument();
    expect(screen.getByText(/Currency management permission is required to save FX accounts/i)).toBeInTheDocument();
  });

  it("keeps rate evidence permission-denied without calling its protected endpoint", async () => {
    currentPermissions = new Set([PERMISSIONS.currencies.read, PERMISSIONS.accounts.view]);
    render(<CurrenciesAndFxSettingsPage />);

    expect(await screen.findByText("FX rate evidence unavailable")).toBeInTheDocument();
    expect(screen.getByText(/FX rate read permission is required/i)).toBeInTheDocument();
    expect(apiRequestMock.mock.calls.some(([path]) => typeof path === "string" && path.startsWith("/fx/rates"))).toBe(false);
  });

  it("does not call the account catalog when chart-of-accounts read permission is absent", async () => {
    currentPermissions = new Set([PERMISSIONS.currencies.read, PERMISSIONS.currencies.manage, PERMISSIONS.fxRates.read]);
    render(<CurrenciesAndFxSettingsPage />);

    expect(await screen.findByText(/Chart of accounts view permission is required to select FX posting accounts/i)).toBeInTheDocument();
    expect(screen.getByLabelText("Realized gain account")).toBeDisabled();
    expect(apiRequestMock).not.toHaveBeenCalledWith("/accounts");
  });

  it("posts a manual immutable rate and refreshes rate evidence", async () => {
    render(<CurrenciesAndFxSettingsPage />);
    await screen.findByText("USD/SAR");

    fireEvent.change(screen.getByLabelText("Transaction currency"), { target: { value: "EUR" } });
    fireEvent.change(screen.getByLabelText("Exact rate"), { target: { value: "4.12500000" } });
    fireEvent.change(screen.getByLabelText("Effective date"), { target: { value: "2026-07-10" } });
    fireEvent.change(screen.getByLabelText("Source reference (optional)"), { target: { value: "Controller worksheet" } });
    fireEvent.click(screen.getByRole("button", { name: "Capture immutable rate" }));

    await waitFor(() =>
      expect(apiRequestMock).toHaveBeenCalledWith("/fx/rates", {
        method: "POST",
        body: {
          transactionCurrency: "EUR",
          rate: "4.12500000",
          rateDate: "2026-07-10",
          sourceReference: "Controller worksheet",
        },
      }),
    );
    expect(await screen.findByText("Manual rate captured. Existing rates remain immutable.")).toBeInTheDocument();
  });

  it("saves four type-safe posting account selections via PUT", async () => {
    render(<CurrenciesAndFxSettingsPage />);
    await screen.findByText("USD/SAR");

    fireEvent.change(screen.getByLabelText("Realized gain account"), { target: { value: "revenue-1" } });
    fireEvent.change(screen.getByLabelText("Realized loss account"), { target: { value: "expense-1" } });
    fireEvent.change(screen.getByLabelText("Unrealized gain account"), { target: { value: "revenue-2" } });
    fireEvent.change(screen.getByLabelText("Unrealized loss account"), { target: { value: "expense-2" } });
    fireEvent.click(screen.getByRole("button", { name: "Save FX accounts" }));

    await waitFor(() =>
      expect(apiRequestMock).toHaveBeenCalledWith("/fx/account-configuration", {
        method: "PUT",
        body: {
          realizedGainAccountId: "revenue-1",
          realizedLossAccountId: "expense-1",
          unrealizedGainAccountId: "revenue-2",
          unrealizedLossAccountId: "expense-2",
        },
      }),
    );
    expect(await screen.findByText("FX posting accounts saved.")).toBeInTheDocument();
  });

  it("does not fetch without an active organization", () => {
    organizationId = null;
    render(<CurrenciesAndFxSettingsPage />);

    expect(screen.getByText("Log in and select an organization to review currency and FX settings.")).toBeInTheDocument();
    expect(apiRequestMock).not.toHaveBeenCalled();
  });
});

function defaultApiResponse(path: string, options?: { method?: string }) {
  if (path === "/fx/currencies") return Promise.resolve(currenciesResponse());
  if (path.startsWith("/fx/rates") && options?.method === "POST") return Promise.resolve(rateRow());
  if (path.startsWith("/fx/rates")) return Promise.resolve({ data: [rateRow()], pagination: { page: 1, limit: 25, hasMore: false } });
  if (path === "/fx/account-configuration" && options?.method === "PUT") return Promise.resolve(configurationResponse());
  if (path === "/fx/account-configuration") return Promise.resolve(configurationResponse());
  if (path === "/fx/readiness") return Promise.resolve(readinessResponse());
  if (path === "/accounts") return Promise.resolve(accountsResponse());
  return Promise.reject(new Error(`Unexpected path ${path}`));
}

function currenciesResponse() {
  return {
    baseCurrency: "SAR",
    supportedCurrencies: [
      { code: "SAR", name: "Saudi Riyal" },
      { code: "USD", name: "US Dollar" },
      { code: "EUR", name: "Euro" },
    ],
    manualRateEntryEnabled: true,
    liveRateProviderEnabled: false,
    providerState: "DISABLED",
  };
}

function rateRow() {
  return {
    id: "rate-1",
    organizationId: "org-1",
    transactionCurrency: "USD",
    baseCurrency: "SAR",
    rate: "3.6725",
    rateDate: "2026-07-10T00:00:00.000Z",
    source: "MANUAL",
    sourceReference: "Treasury worksheet 17",
    createdAt: "2026-07-10T08:30:00.000Z",
  };
}

function configurationResponse() {
  return {
    id: "config-1",
    organizationId: "org-1",
    realizedGainAccountId: null,
    realizedLossAccountId: null,
    unrealizedGainAccountId: null,
    unrealizedLossAccountId: null,
    realizedGainAccount: null,
    realizedLossAccount: null,
    unrealizedGainAccount: null,
    unrealizedLossAccount: null,
    createdAt: "2026-07-10T08:00:00.000Z",
    updatedAt: "2026-07-10T08:00:00.000Z",
  };
}

function readinessResponse() {
  return {
    status: "BLOCKED",
    baseCurrency: "SAR",
    supportedCurrencyCodes: ["SAR", "USD", "EUR"],
    manualRateEntryEnabled: true,
    liveRateProviderEnabled: false,
    providerState: "DISABLED",
    accountConfigurationComplete: false,
    foreignDocumentPostingEnabled: false,
    blockers: [
      "Configure active posting accounts for realized and unrealized FX gains and losses.",
      "Foreign-currency document posting remains disabled until document, posting, settlement, and report controls are complete.",
    ],
  };
}

function accountsResponse() {
  return [
    account("revenue-1", "4100", "Realized FX gain", "REVENUE"),
    account("revenue-2", "4110", "Unrealized FX gain", "REVENUE"),
    account("expense-1", "5100", "Realized FX loss", "EXPENSE"),
    account("expense-2", "5110", "Unrealized FX loss", "EXPENSE"),
    { ...account("inactive-revenue", "4199", "Inactive gain", "REVENUE"), isActive: false },
  ];
}

function account(id: string, code: string, name: string, type: "REVENUE" | "EXPENSE") {
  return {
    id,
    organizationId: "org-1",
    parentId: null,
    code,
    name,
    type,
    description: null,
    allowPosting: true,
    isSystem: false,
    isActive: true,
  };
}
