import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import ImportExportSettingsPage from "./page";

const apiRequest = jest.fn();

jest.mock("@/hooks/use-active-organization", () => ({
  useActiveOrganizationId: () => "org-1",
}));

jest.mock("@/lib/api", () => ({
  apiBaseUrl: "http://localhost:4000",
  apiRequest: (...args: unknown[]) => apiRequest(...args),
}));

describe("ImportExportSettingsPage", () => {
  beforeEach(() => {
    apiRequest.mockReset();
  });

  it("renders safe local import/export controls without production migration claims", async () => {
    mockInitialLoad();
    render(<ImportExportSettingsPage />);

    expect(screen.getByRole("heading", { name: "Import and export" })).toBeInTheDocument();
    expect(screen.getByText(/does not upload to external providers/i)).toBeInTheDocument();
    expect(screen.getByText("Hosted production migration")).toBeInTheDocument();
    expect(screen.getByText("Unproven")).toBeInTheDocument();

    await waitFor(() => expect(screen.getByText(/Creates local customer contacts/i)).toBeInTheDocument());
    expect(screen.getByRole("link", { name: "Download template" })).toHaveAttribute("href", "http://localhost:4000/migration-toolkit/templates/CUSTOMERS.csv");
    expect(screen.getByRole("link", { name: "Export CSV" })).toHaveAttribute("href", "http://localhost:4000/migration-toolkit/exports/CUSTOMERS.csv");
    expect(await screen.findByText("Opening balances")).toBeInTheDocument();
    expect(screen.getByText("Bank credentials")).toBeInTheDocument();
  });

  it("shows preview validation errors and keeps commit disabled until clean reviewed state", async () => {
    mockInitialLoad([
      {
        id: "job-1",
        entityType: "CUSTOMERS",
        status: "READY_FOR_REVIEW",
        filename: "customers-preview.csv",
        previewOnly: true,
        summaryJson: { rowCount: 1, errorCount: 1 },
        requestId: "req-import-1",
        createdAt: "2026-07-09T00:00:00.000Z",
        committedAt: null,
        rows: [{ id: "row-1", rowNumber: 2, status: "INVALID", duplicate: false, rawJson: {}, normalizedJson: {}, createdRecordId: null }],
        validationIssues: [{ id: "issue-1", rowNumber: 2, field: "email", code: "INVALID_EMAIL", message: "Email must be valid.", severity: "ERROR" }],
      },
    ]);
    render(<ImportExportSettingsPage />);

    await waitFor(() => expect(apiRequest).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.getByText(/Creates local customer contacts/i)).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /customers-preview.csv/i }));
    await waitFor(() => expect(screen.getByText(/Email must be valid/i)).toBeInTheDocument());
    expect(screen.getByText("req-import-1")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Commit reviewed local import" })).toBeDisabled();
    fireEvent.click(screen.getByLabelText(/I reviewed the preview rows/i));
    expect(screen.getByRole("button", { name: "Commit reviewed local import" })).toBeDisabled();
  });

  it("shows transaction, rate, and base-equivalent evidence for foreign and legacy catalog rows", async () => {
    mockInitialLoad([
      makeProductImportJob({
        rows: [
          makeProductImportRow({
            id: "row-foreign",
            rowNumber: 2,
            normalizedJson: {
              name: "Cloud hosting",
              sellingPrice: "367.2500",
              transactionSellingPrice: "100.0000",
              baseSellingPrice: "367.2500",
              currency: "USD",
              baseCurrency: "AED",
              exchangeRate: "3.67250000",
              rateDate: "2026-07-10",
              rateSource: "MANUAL",
              rateSnapshotId: "rate-usd-1",
            },
          }),
          makeProductImportRow({
            id: "row-legacy",
            rowNumber: 3,
            normalizedJson: {
              name: "Local support",
              sellingPrice: "50.0000",
              transactionSellingPrice: "50.0000",
              baseSellingPrice: "50.0000",
              currency: "AED",
              baseCurrency: "AED",
              exchangeRate: "1",
              rateDate: null,
              rateSource: "SYSTEM_RATE_1",
              rateSnapshotId: null,
            },
          }),
        ],
      }),
    ]);
    render(<ImportExportSettingsPage />);

    const table = await screen.findByRole("table", { name: "Normalized product and service import rows" });
    expect(table).toBeInTheDocument();
    expect(within(table).getAllByRole("columnheader")).toHaveLength(8);
    within(table).getAllByRole("columnheader").forEach((header) => expect(header).toHaveAttribute("scope", "col"));
    const foreignRow = screen.getByText("Cloud hosting").closest("tr");
    expect(foreignRow).not.toBeNull();
    expect(within(foreignRow!).getByRole("rowheader", { name: "Cloud hosting" })).toHaveAttribute("scope", "row");
    expect(within(foreignRow!).getByText("100.0000 USD")).toBeInTheDocument();
    expect(within(foreignRow!).getByText("3.67250000")).toBeInTheDocument();
    expect(within(foreignRow!).getByText("2026-07-10")).toBeInTheDocument();
    expect(within(foreignRow!).getByText("MANUAL")).toBeInTheDocument();
    expect(within(foreignRow!).getByText("Snapshot rate-usd-1")).toBeInTheDocument();
    expect(within(foreignRow!).getByText("367.2500 AED")).toBeInTheDocument();

    const legacyRow = screen.getByText("Local support").closest("tr");
    expect(legacyRow).not.toBeNull();
    expect(within(legacyRow!).getAllByText("50.0000 AED")).toHaveLength(2);
    expect(within(legacyRow!).getByText("1")).toBeInTheDocument();
    expect(within(legacyRow!).getByText("Not required")).toBeInTheDocument();
    expect(within(legacyRow!).getByText("SYSTEM RATE 1")).toBeInTheDocument();
  });

  it("keeps product row errors beside the normalized evidence", async () => {
    mockInitialLoad([
      makeProductImportJob({
        rows: [
          makeProductImportRow({
            id: "row-invalid",
            rowNumber: 4,
            status: "INVALID",
            normalizedJson: {
              name: "Broken service",
              transactionSellingPrice: "100.0000",
              baseSellingPrice: "100.0000",
              currency: "USD",
              baseCurrency: "AED",
              exchangeRate: "0",
              rateDate: "2026-07-10",
              rateSource: "IMPORT",
              rateSnapshotId: null,
            },
          }),
        ],
        validationIssues: [
          {
            id: "issue-rate",
            rowNumber: 4,
            field: "exchangeRate",
            code: "INVALID_EXCHANGE_RATE",
            message: "Exchange rate must be positive.",
            severity: "ERROR",
          },
        ],
      }),
    ]);
    render(<ImportExportSettingsPage />);

    const invalidRow = (await screen.findByText("Broken service")).closest("tr");
    expect(invalidRow).not.toBeNull();
    expect(within(invalidRow!).getByText("INVALID")).toBeInTheDocument();
    expect(within(invalidRow!).getByText("Exchange rate must be positive.")).toBeInTheDocument();
  });

  it("requires an explicit reviewed action before a base-equivalent catalog commit", async () => {
    mockInitialLoad([
      makeProductImportJob({
        rows: [
          makeProductImportRow({
            normalizedJson: {
              name: "Cloud hosting",
              transactionSellingPrice: "100.0000",
              baseSellingPrice: "367.2500",
              currency: "USD",
              baseCurrency: "AED",
              exchangeRate: "3.67250000",
              rateDate: "2026-07-10",
              rateSource: "IMPORT",
              rateSnapshotId: null,
            },
          }),
        ],
      }),
    ]);
    render(<ImportExportSettingsPage />);

    const commitButton = await screen.findByRole("button", { name: "Commit reviewed local import" });
    expect(screen.getByText(/base amount that will be committed after approval/i)).toBeInTheDocument();
    expect(commitButton).toBeDisabled();

    fireEvent.click(screen.getByLabelText(/I reviewed the preview rows/i));

    expect(commitButton).toBeEnabled();
    expect(apiRequest).toHaveBeenCalledTimes(2);
  });

  it("binds review approval to the currently selected preview job", async () => {
    mockInitialLoad([
      makeProductImportJob({
        id: "job-a",
        filename: "products-a.csv",
        requestId: "req-a",
        rows: [makeProductImportRow({ id: "row-a" })],
      }),
      makeProductImportJob({
        id: "job-b",
        filename: "products-b.csv",
        requestId: "req-b",
        rows: [makeProductImportRow({ id: "row-b" })],
      }),
    ]);
    render(<ImportExportSettingsPage />);

    const commitButton = await screen.findByRole("button", { name: "Commit reviewed local import" });
    const reviewCheckbox = screen.getByLabelText(/I reviewed the preview rows/i);
    expect(screen.getByText("req-a")).toBeInTheDocument();
    fireEvent.click(reviewCheckbox);
    expect(reviewCheckbox).toBeChecked();
    expect(commitButton).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: /products-b\.csv/i }));

    expect(screen.getByText("req-b")).toBeInTheDocument();
    expect(reviewCheckbox).not.toBeChecked();
    expect(commitButton).toBeDisabled();
    expect(apiRequest).toHaveBeenCalledTimes(2);
  });
});

function mockInitialLoad(jobs: unknown[] = []) {
  apiRequest
    .mockResolvedValueOnce({
      supportedImports: [
        {
          entityType: "CUSTOMERS",
          label: "Customers",
          headers: ["name", "displayName", "email", "phone", "taxNumber", "countryCode", "isActive"],
          requiredHeaders: ["name"],
          notes: ["Creates local customer contacts only after explicit reviewed commit."],
        },
      ],
      unsupportedImports: ["Opening balances", "Posted journals", "Bank credentials"],
      limitations: ["No external provider upload."],
    })
    .mockResolvedValueOnce(jobs);
}

function makeProductImportJob(overrides: Record<string, unknown> = {}) {
  return {
    id: "job-products",
    entityType: "PRODUCTS_SERVICES",
    status: "READY_FOR_REVIEW",
    filename: "products-preview.csv",
    previewOnly: true,
    summaryJson: { rowCount: 1, errorCount: 0 },
    requestId: "req-products-1",
    createdAt: "2026-07-11T00:00:00.000Z",
    committedAt: null,
    rows: [],
    validationIssues: [],
    ...overrides,
  };
}

function makeProductImportRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "row-product",
    rowNumber: 2,
    status: "VALID",
    duplicate: false,
    rawJson: {},
    normalizedJson: {},
    createdRecordId: null,
    ...overrides,
  };
}
