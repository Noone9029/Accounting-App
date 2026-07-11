import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import FxActivityPage from "./page";

const apiRequestMock = jest.fn();
const downloadMock = jest.fn();

jest.mock("@/hooks/use-active-organization", () => ({ useActiveOrganizationId: () => "org-1" }));
jest.mock("@/lib/api", () => ({ apiRequest: (...args: unknown[]) => apiRequestMock(...args) }));
jest.mock("@/lib/pdf-download", () => ({ downloadAuthenticatedFile: (...args: unknown[]) => downloadMock(...args) }));
jest.mock("@/components/permissions/permission-provider", () => ({ usePermissions: () => ({ canAny: () => true }) }));

describe("FX activity report workspace", () => {
  beforeEach(() => {
    apiRequestMock.mockReset();
    downloadMock.mockReset();
    downloadMock.mockResolvedValue(undefined);
    apiRequestMock.mockImplementation((path: string) => {
      if (path.startsWith("/reports/fx/realized-activity")) {
        return Promise.resolve({
          accountingContext: { baseCurrency: "AED", amountBasis: "BASE_CURRENCY" },
          rows: [{ id: "row-1", allocationId: "allocation-1", eventType: "ORIGINAL", date: "2026-07-10", allocationType: "CUSTOMER_PAYMENT_ALLOCATION", paymentNumber: "PAY-1", documentNumber: "INV-1", currency: "USD", transactionAmount: "40.0000", grossGain: "5.0000", grossLoss: "0.0000", netGain: "5.0000", netLoss: "0.0000", reversed: false, missingJournal: false }],
          totals: { grossGain: "5.0000", grossLoss: "0.0000", reversedGain: "0.0000", reversedLoss: "0.0000", netGain: "5.0000", netLoss: "0.0000", missingJournalCount: 0, rowCount: 1 },
          totalsScope: "PAGE",
          pagination: { page: 1, limit: 100, hasMore: true },
          notes: ["Read-only allocation evidence"], filters: {}, from: null, to: null,
        });
      }
      if (path.startsWith("/reports/fx/open-exposure")) {
        return Promise.resolve({
          accountingContext: { baseCurrency: "AED", amountBasis: "BASE_CURRENCY" },
          rows: [], groups: [],
          totals: {
            receivableSourceBaseAmount: "0.0000", payableSourceBaseAmount: "0.0000", grossSourceBaseAmount: "0.0000", netSourceBaseAmount: "0.0000",
            receivableCarryingBaseAmount: "0.0000", payableCarryingBaseAmount: "0.0000", grossCarryingBaseAmount: "0.0000", netCarryingBaseAmount: "0.0000", documentCount: 0,
          },
          notes: [], filters: {},
        });
      }
      return Promise.resolve({ accountingContext: { baseCurrency: "AED", amountBasis: "BASE_CURRENCY" }, rows: [], groups: [], totals: {}, notes: [], filters: {} });
    });
  });

  it("shows the four read-only reports with base and transaction context", async () => {
    render(<FxActivityPage />);

    expect(await screen.findByRole("heading", { name: "FX activity and exposure" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Realized activity" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Unrealized activity" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Rate snapshots" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Open exposure" })).toBeInTheDocument();
    expect(screen.getByText("PAY-1")).toBeInTheDocument();
    expect(screen.getByText("Page gross gain")).toBeInTheDocument();
    expect(screen.getByText("$40.00")).toBeInTheDocument();
    expect(screen.getAllByText(/AED\s+5\.00/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/read-only accountant review/i).length).toBeGreaterThan(0);
  });

  it("normalizes filters and exports only the active report as CSV", async () => {
    render(<FxActivityPage />);
    const input = await screen.findByRole("textbox", { name: "Transaction currency" });
    fireEvent.change(input, { target: { value: "usd" } });
    fireEvent.click(screen.getByRole("button", { name: "Run report" }));
    await waitFor(() => expect(apiRequestMock).toHaveBeenCalledWith(expect.stringMatching(/transactionCurrency=USD/)));

    fireEvent.click(screen.getByRole("button", { name: "Download CSV" }));
    await waitFor(() => expect(downloadMock).toHaveBeenCalledWith(expect.stringMatching(/\/reports\/fx\/realized-activity\?.*format=csv/), expect.stringMatching(/^fx-realized-activity-.*\.csv$/)));
    expect(screen.queryByRole("button", { name: "Download PDF" })).not.toBeInTheDocument();
  });

  it("removes unsupported date controls and parameters for current open exposure", async () => {
    render(<FxActivityPage />);
    await screen.findByText("PAY-1");

    fireEvent.click(screen.getByRole("tab", { name: "Open exposure" }));

    await waitFor(() => expect(apiRequestMock).toHaveBeenCalledWith(expect.stringMatching(/^\/reports\/fx\/open-exposure/)));
    const exposureCall = apiRequestMock.mock.calls.map(([path]) => String(path)).find((path) => path.startsWith("/reports/fx/open-exposure"));
    expect(exposureCall).not.toMatch(/(?:from|to)=/);
    expect(screen.queryByLabelText("From")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("To")).not.toBeInTheDocument();
    expect(screen.getByText(/Open exposure is current, not date-filtered/i)).toBeInTheDocument();
  });

  it("navigates bounded report pages and resets to page one when filters change", async () => {
    render(<FxActivityPage />);
    await screen.findByText("PAY-1");

    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    await waitFor(() => expect(apiRequestMock).toHaveBeenCalledWith(expect.stringMatching(/[?&]page=2(?:&|$)/)));

    fireEvent.change(screen.getByRole("textbox", { name: "Transaction currency" }), { target: { value: "USD" } });
    fireEvent.click(screen.getByRole("button", { name: "Run report" }));
    await waitFor(() => expect(apiRequestMock).toHaveBeenCalledWith(expect.stringMatching(/[?&]page=1(?:&|$)/)));
  });
});
