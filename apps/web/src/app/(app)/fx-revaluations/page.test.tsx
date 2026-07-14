import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { PERMISSIONS, type Permission } from "@/lib/permissions";
import FxRevaluationsPage from "./page";

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

describe("FxRevaluationsPage", () => {
  beforeEach(() => {
    organizationId = "org-1";
    currentPermissions = new Set([
      PERMISSIONS.fxRevaluation.read,
      PERMISSIONS.fxRevaluation.run,
      PERMISSIONS.fxRevaluation.reverse,
      PERMISSIONS.fxRates.read,
    ]);
    apiRequestMock.mockReset();
    apiRequestMock.mockImplementation(defaultApiResponse);
  });

  afterEach(() => {
    document.documentElement.dir = "ltr";
    jest.restoreAllMocks();
  });

  it("shows a compact evidence-led workspace with explicit lifecycle controls", async () => {
    render(<FxRevaluationsPage />);

    expect(await screen.findByRole("heading", { name: "FX revaluation" })).toBeInTheDocument();
    expect(screen.getByText(/Manual captured rates only.*Nothing posts silently/i)).toBeInTheDocument();
    expect(await screen.findByText("INV-100")).toBeInTheDocument();
    expect(screen.getByText("Northwind Trading")).toBeInTheDocument();
    expect(screen.getByText("USD 100.0000")).toBeInTheDocument();
    expect(screen.getAllByText("SAR 367.2500")).toHaveLength(2);
    expect(screen.getByText("SAR 375.0000")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Review run" })).toBeEnabled();
  });

  it("creates a draft preview from selected immutable rate evidence", async () => {
    render(<FxRevaluationsPage />);
    await screen.findByText("INV-100");

    fireEvent.change(screen.getByLabelText("Revaluation date"), { target: { value: "2026-06-30" } });
    fireEvent.change(screen.getByLabelText("Rate date"), { target: { value: "2026-06-30" } });
    fireEvent.click(screen.getByLabelText(/USD\/SAR.*3\.75000000/i));
    fireEvent.click(screen.getByRole("button", { name: "Preview revaluation" }));

    await waitFor(() =>
      expect(apiRequestMock).toHaveBeenCalledWith("/fx/revaluations/preview", {
        method: "POST",
        body: {
          revaluationDate: "2026-06-30",
          rateDate: "2026-06-30",
          rates: [{ currencyCode: "USD", rateSnapshotId: "rate-1" }],
          idempotencyKey: expect.stringMatching(/^fx-revaluation-preview-/),
        },
      }),
    );
    expect(await screen.findByText(/Draft revaluation preview created/i)).toBeInTheDocument();
  });

  it("requires confirmation and uses idempotent review, post, and reverse actions", async () => {
    render(<FxRevaluationsPage />);
    await screen.findByText("INV-100");

    fireEvent.click(screen.getByRole("button", { name: "Review run" }));
    await waitFor(() => expect(apiRequestMock).toHaveBeenCalledWith("/fx/revaluations/run-1/review", expect.objectContaining({ method: "POST" })));

    expect(await screen.findByRole("button", { name: "Post revaluation" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Post revaluation" }));
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Post" }));
    await waitFor(() => expect(apiRequestMock).toHaveBeenCalledWith("/fx/revaluations/run-1/post", expect.objectContaining({ method: "POST" })));

    expect(await screen.findByRole("button", { name: "Reverse revaluation" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Reverse revaluation" }));
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Reverse" }));
    await waitFor(() => expect(apiRequestMock).toHaveBeenCalledWith("/fx/revaluations/run-1/reverse", expect.objectContaining({ method: "POST" })));
  });

  it("is view-only without run and reverse permissions", async () => {
    currentPermissions = new Set([PERMISSIONS.fxRevaluation.read]);
    render(<FxRevaluationsPage />);

    expect(await screen.findByText("View-only access")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Preview revaluation" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Review run" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reverse revaluation" })).not.toBeInTheDocument();
    expect(apiRequestMock).toHaveBeenCalledWith("/fx/revaluations/context");
    expect(apiRequestMock).not.toHaveBeenCalledWith("/fx/currencies");
    expect(apiRequestMock).not.toHaveBeenCalledWith("/fx/readiness");
    expect(apiRequestMock.mock.calls.some(([path]) => typeof path === "string" && path.startsWith("/fx/rates"))).toBe(false);
  });

  it("preserves the same accounting evidence under RTL document direction", async () => {
    document.documentElement.dir = "rtl";
    render(<FxRevaluationsPage />);

    expect(await screen.findByText("INV-100")).toBeInTheDocument();
    expect(screen.getByText("USD 100.0000")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Review run" })).toBeEnabled();
  });

  it("fails closed without an active organization", () => {
    organizationId = null;
    render(<FxRevaluationsPage />);

    expect(screen.getByText(/select an organization/i)).toBeInTheDocument();
    expect(apiRequestMock).not.toHaveBeenCalled();
  });
});

function defaultApiResponse(path: string, options?: { method?: string }) {
  if (path === "/fx/revaluations/context") return Promise.resolve({ catalog: currencyCatalog(), readiness: readiness() });
  if (path === "/fx/revaluations?limit=25") return Promise.resolve({ data: [runSummary()], pagination: { page: 1, limit: 25, hasMore: false } });
  if (path === "/fx/revaluations/run-1" && !options) return Promise.resolve(runDetail("DRAFT"));
  if (path === "/fx/rates?limit=100") return Promise.resolve({ data: [rateRow()], pagination: { page: 1, limit: 100, hasMore: false } });
  if (path === "/fx/revaluations/preview" && options?.method === "POST") return Promise.resolve(runDetail("DRAFT"));
  if (path.endsWith("/review") && options?.method === "POST") return Promise.resolve(runDetail("REVIEWED"));
  if (path.endsWith("/post") && options?.method === "POST") return Promise.resolve(runDetail("POSTED"));
  if (path.endsWith("/reverse") && options?.method === "POST") return Promise.resolve(runDetail("REVERSED"));
  return Promise.reject(new Error(`Unexpected path ${path}`));
}

function runSummary() {
  return { ...runDetail("DRAFT"), lines: [], _count: { lines: 1 } };
}

function runDetail(status: "DRAFT" | "REVIEWED" | "POSTED" | "REVERSED") {
  return {
    id: "run-1",
    organizationId: "org-1",
    revaluationDate: "2026-06-30T00:00:00.000Z",
    rateDate: "2026-06-30T00:00:00.000Z",
    status,
    idempotencyKey: "preview-1",
    reviewIdempotencyKey: status === "DRAFT" ? null : "review-1",
    postIdempotencyKey: status === "POSTED" || status === "REVERSED" ? "post-1" : null,
    reversalIdempotencyKey: status === "REVERSED" ? "reverse-1" : null,
    reviewedAt: status === "DRAFT" ? null : "2026-07-01T08:00:00.000Z",
    postedAt: status === "POSTED" || status === "REVERSED" ? "2026-07-01T09:00:00.000Z" : null,
    reversedAt: status === "REVERSED" ? "2026-07-02T09:00:00.000Z" : null,
    postedJournalEntry: status === "POSTED" || status === "REVERSED" ? { id: "journal-1", entryNumber: "JE-100", status: "POSTED" } : null,
    reversalJournalEntry: status === "REVERSED" ? { id: "journal-2", entryNumber: "JE-101", status: "POSTED" } : null,
    lines: [
      {
        id: "line-1",
        sourceType: "CUSTOMER_RECEIVABLE",
        salesInvoiceId: "invoice-1",
        purchaseBillId: null,
        counterpartyId: "contact-1",
        currencyCode: "USD",
        baseCurrencyCode: "SAR",
        openTransactionAmount: "100.0000",
        sourceBaseOpenAmount: "367.2500",
        carryingBaseAmount: "367.2500",
        closingRate: "3.75000000",
        revaluedBaseAmount: "375.0000",
        unrealizedGainAmount: "7.7500",
        unrealizedLossAmount: "0.0000",
        rateSnapshotId: "rate-1",
        salesInvoice: { id: "invoice-1", invoiceNumber: "INV-100" },
        purchaseBill: null,
        counterparty: { id: "contact-1", name: "Northwind Trading", displayName: null },
        rateSnapshot: { id: "rate-1", rate: "3.75000000", rateDate: "2026-06-30T00:00:00.000Z", source: "MANUAL", sourceReference: "Controller close pack" },
      },
    ],
  };
}

function rateRow() {
  return {
    id: "rate-1",
    organizationId: "org-1",
    transactionCurrency: "USD",
    baseCurrency: "SAR",
    rate: "3.75",
    rateDate: "2026-06-30T00:00:00.000Z",
    source: "MANUAL",
    sourceReference: "Controller close pack",
    createdByUserId: "user-1",
    createdAt: "2026-06-30T10:00:00.000Z",
  };
}

function currencyCatalog() {
  return {
    baseCurrency: "SAR",
    supportedCurrencies: [{ code: "SAR", name: "Saudi Riyal" }, { code: "USD", name: "US Dollar" }],
    manualRateEntryEnabled: true,
    liveRateProviderEnabled: false,
    providerState: "DISABLED",
  };
}

function readiness() {
  return {
    status: "READY",
    baseCurrency: "SAR",
    supportedCurrencyCodes: ["SAR", "USD"],
    manualRateEntryEnabled: true,
    liveRateProviderEnabled: false,
    providerState: "DISABLED",
    accountConfigurationComplete: true,
    controlAccountsComplete: true,
    foreignDocumentPostingEnabled: true,
    fxRevaluationEnabled: true,
    blockers: [],
  };
}
