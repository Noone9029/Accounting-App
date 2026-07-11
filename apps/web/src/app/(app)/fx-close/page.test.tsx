import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AppLocaleProvider } from "@/components/app-locale-provider";
import FxClosePage from "./page";

const apiRequestMock = jest.fn();
jest.mock("@/hooks/use-active-organization", () => ({ useActiveOrganizationId: () => "org-1" }));
jest.mock("@/lib/api", () => ({ apiRequest: (...args: unknown[]) => apiRequestMock(...args) }));
jest.mock("next/navigation", () => ({ useRouter: () => ({ refresh: jest.fn() }) }));

describe("FX close readiness workspace", () => {
  beforeEach(() => {
    apiRequestMock.mockReset();
    apiRequestMock.mockResolvedValue({
      status: "BLOCKED", asOf: "2026-07-31",
      blockers: [
        { code: "MISSING_CLOSING_RATE", count: 2, message: "Capture closing rates.", actionHref: "/settings/currencies" },
        { code: "REVALUATION_NOT_POSTED", count: 1, message: "Post the reviewed revaluation.", actionHref: "/fx-revaluations" },
      ],
      counts: { foreignDocuments: 4, openForeignDocuments: 3, foreignCurrencies: 2, missingClosingRates: 2, draftManualRateDocuments: 0, unpostedRevaluationRuns: 1, missingRealizedFxJournals: 0, historicalSourceChangesAfterClose: 0 },
      actions: [],
    });
  });

  it("renders a compact blocker queue with direct review actions and no mutation controls", async () => {
    render(<FxClosePage />);

    expect(await screen.findByRole("heading", { name: "FX close readiness" })).toBeInTheDocument();
    expect(screen.getByText("Blocked")).toBeInTheDocument();
    expect(screen.getByText("MISSING_CLOSING_RATE")).toBeInTheDocument();
    const reviewLinks = screen.getAllByRole("link", { name: "Review" });
    expect(reviewLinks[0]).toHaveAttribute("href", "/settings/currencies");
    expect(reviewLinks).toHaveLength(2);
    expect(screen.queryByRole("button", { name: /post|close|lock/i })).not.toBeInTheDocument();
  });

  it("runs an as-of check and keeps Arabic layout content-contained", async () => {
    render(<AppLocaleProvider initialLocale="ar"><FxClosePage /></AppLocaleProvider>);
    const input = await screen.findByLabelText("As of");
    fireEvent.change(input, { target: { value: "2026-08-31" } });
    fireEvent.click(screen.getByRole("button", { name: "Run readiness check" }));
    await waitFor(() => expect(apiRequestMock).toHaveBeenCalledWith("/fx/close-readiness?asOf=2026-08-31"));
    expect(screen.getByTestId("fx-close-queue")).toHaveClass("overflow-hidden");
  });
});
