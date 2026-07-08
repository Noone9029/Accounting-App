import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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
