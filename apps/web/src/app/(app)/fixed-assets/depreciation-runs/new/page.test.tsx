import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import NewDepreciationRunPage from "./page";

const apiRequestMock = jest.fn();
const pushMock = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

jest.mock("@/hooks/use-active-organization", () => ({
  useActiveOrganizationId: () => "org-1",
}));

jest.mock("@/lib/api", () => ({
  apiRequest: (...args: unknown[]) => apiRequestMock(...args),
}));

describe("NewDepreciationRunPage", () => {
  beforeEach(() => {
    apiRequestMock.mockReset();
    pushMock.mockReset();
    apiRequestMock.mockImplementation((path: string) => {
      if (path === "/fiscal-periods") return Promise.resolve([{ id: "period-1", name: "July 2026", status: "OPEN" }]);
      return Promise.resolve({ id: "run-1" });
    });
  });

  it("selects the fiscal period required by the preview API", async () => {
    render(<NewDepreciationRunPage />);

    expect(await screen.findByLabelText("Fiscal period")).toHaveValue("period-1");
    fireEvent.change(screen.getByLabelText("Depreciation date"), { target: { value: "2026-07-31" } });
    fireEvent.change(screen.getByLabelText("Review key"), { target: { value: "july-2026" } });
    fireEvent.click(screen.getByRole("button", { name: "Build preview" }));

    await waitFor(() => expect(apiRequestMock).toHaveBeenCalledWith("/fixed-assets/depreciation-runs/preview", {
      method: "POST",
      body: { fiscalPeriodId: "period-1", depreciationDate: "2026-07-31", idempotencyKey: "july-2026" },
    }));
  });
});
