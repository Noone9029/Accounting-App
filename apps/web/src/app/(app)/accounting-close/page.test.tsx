import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import AccountingClosePage from "./page";

const apiRequestMock = jest.fn();
let mockOrganizationId = "org-1";

jest.mock("@/hooks/use-active-organization", () => ({ useActiveOrganizationId: () => mockOrganizationId }));
jest.mock("@/lib/api", () => ({ apiRequest: (...args: unknown[]) => apiRequestMock(...args) }));
jest.mock("@/components/permissions/permission-provider", () => ({ usePermissions: () => ({ canAny: () => true }) }));

describe("accountant month-end close workspace", () => {
  beforeEach(() => {
    mockOrganizationId = "org-1";
    apiRequestMock.mockReset();
    apiRequestMock.mockImplementation((path: string) => {
      if (path === "/fiscal-periods") return Promise.resolve([{ id: "period-1", name: "June 2026", startsOn: "2026-06-01", endsOn: "2026-06-30", status: "OPEN" }]);
      if (path === "/accounting-close/readiness?fiscalPeriodId=period-1") return Promise.resolve({ blockerCount: 1, warningCount: 2, informationCount: 0, checks: [{ key: "fx", title: "FX readiness", severity: "BLOCKER", status: "BLOCKED", safeMessage: "Post the reviewed revaluation.", detailsHref: "/fx-close" }] });
      if (path === "/accounting-close/cycles?fiscalPeriodId=period-1") return Promise.resolve({ id: "cycle-1", fiscalPeriodId: "period-1", status: "READY_FOR_REVIEW", version: 4 });
      return Promise.resolve({ id: "cycle-1", fiscalPeriodId: "period-1", status: "IN_PROGRESS", version: 1 });
    });
  });

  it("shows a discovered close cycle and its guarded readiness state after reload", async () => {
    render(<AccountingClosePage />);

    expect(await screen.findByRole("heading", { name: "Month-end close" })).toBeInTheDocument();
    expect(await screen.findByText("1 blocker")).toBeInTheDocument();
    expect(screen.getByText("FX readiness")).toBeInTheDocument();
    expect(screen.getByText("Close cycle started · READY FOR REVIEW")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Review blocker" })).toHaveAttribute("href", "/fx-close");
    expect(apiRequestMock).toHaveBeenCalledWith("/accounting-close/cycles?fiscalPeriodId=period-1");
    expect(screen.queryByRole("button", { name: "Start close cycle" })).not.toBeInTheDocument();
  });

  it("ignores an out-of-order readiness response after changing fiscal periods", async () => {
    let resolveOldReadiness!: (value: unknown) => void;
    let resolveOldCycle!: (value: unknown) => void;
    const oldReadiness = new Promise((resolve) => { resolveOldReadiness = resolve; });
    const oldCycle = new Promise((resolve) => { resolveOldCycle = resolve; });
    apiRequestMock.mockImplementation((path: string) => {
      if (path === "/fiscal-periods") return Promise.resolve([
        { id: "period-1", name: "June 2026", startsOn: "2026-06-01", endsOn: "2026-06-30", status: "OPEN" },
        { id: "period-2", name: "July 2026", startsOn: "2026-07-01", endsOn: "2026-07-31", status: "OPEN" },
      ]);
      if (path === "/accounting-close/readiness?fiscalPeriodId=period-1") return oldReadiness;
      if (path === "/accounting-close/cycles?fiscalPeriodId=period-1") return oldCycle;
      if (path === "/accounting-close/readiness?fiscalPeriodId=period-2") return Promise.resolve({ blockerCount: 0, warningCount: 0, informationCount: 1, checks: [] });
      if (path === "/accounting-close/cycles?fiscalPeriodId=period-2") return Promise.resolve(null);
      return Promise.resolve(null);
    });

    render(<AccountingClosePage />);
    const selector = await screen.findByLabelText("Fiscal period");
    fireEvent.change(selector, { target: { value: "period-2" } });
    expect(await screen.findByText("Ready to prepare")).toBeInTheDocument();
    resolveOldReadiness({ blockerCount: 9, warningCount: 0, informationCount: 0, checks: [] });
    resolveOldCycle({ id: "cycle-old", fiscalPeriodId: "period-1", status: "LOCKED", version: 9 });
    await waitFor(() => expect(screen.getByText("Ready to prepare")).toBeInTheDocument());
    expect(screen.queryByText(/Close cycle started.*LOCKED/)).not.toBeInTheDocument();
  });

  it("does not apply a pending start result after switching fiscal periods", async () => {
    let resolveStartedCycle!: (value: unknown) => void;
    const startedCycle = new Promise((resolve) => { resolveStartedCycle = resolve; });
    apiRequestMock.mockImplementation((path: string, options?: { method?: string }) => {
      if (path === "/fiscal-periods") return Promise.resolve([
        { id: "period-1", name: "June 2026", startsOn: "2026-06-01", endsOn: "2026-06-30", status: "OPEN" },
        { id: "period-2", name: "July 2026", startsOn: "2026-07-01", endsOn: "2026-07-31", status: "OPEN" },
      ]);
      if (path.startsWith("/accounting-close/readiness")) return Promise.resolve({ blockerCount: 0, warningCount: 0, informationCount: 0, checks: [] });
      if (path.startsWith("/accounting-close/cycles?") ) return Promise.resolve(null);
      if (path === "/accounting-close/cycles" && options?.method === "POST") return startedCycle;
      return Promise.resolve(null);
    });

    render(<AccountingClosePage />);
    expect(await screen.findByRole("button", { name: "Start close cycle" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Start close cycle" }));
    fireEvent.change(screen.getByLabelText("Fiscal period"), { target: { value: "period-2" } });
    expect(await screen.findByText("Ready to prepare")).toBeInTheDocument();
    resolveStartedCycle({ id: "cycle-old", fiscalPeriodId: "period-1", status: "IN_PROGRESS", version: 1 });
    await waitFor(() => expect(screen.getByText("Ready to prepare")).toBeInTheDocument());
    expect(screen.queryByText(/Close cycle started.*IN PROGRESS/)).not.toBeInTheDocument();
  });

  it("ignores a prior organization's late fiscal-period list", async () => {
    let resolveOldPeriods!: (value: unknown) => void;
    const oldPeriods = new Promise((resolve) => { resolveOldPeriods = resolve; });
    let periodCalls = 0;
    apiRequestMock.mockImplementation((path: string) => {
      if (path === "/fiscal-periods") {
        periodCalls += 1;
        return periodCalls === 1 ? oldPeriods : Promise.resolve([{ id: "period-b", name: "Organization B July", startsOn: "2026-07-01", endsOn: "2026-07-31", status: "OPEN" }]);
      }
      if (path === "/accounting-close/readiness?fiscalPeriodId=period-b") return Promise.resolve({ blockerCount: 0, warningCount: 0, informationCount: 0, checks: [] });
      if (path === "/accounting-close/cycles?fiscalPeriodId=period-b") return Promise.resolve(null);
      return Promise.resolve(null);
    });

    const view = render(<AccountingClosePage />);
    mockOrganizationId = "org-2";
    view.rerender(<AccountingClosePage />);
    expect(await screen.findByRole("option", { name: /Organization B July/ })).toBeInTheDocument();
    resolveOldPeriods([{ id: "period-a", name: "Organization A June", startsOn: "2026-06-01", endsOn: "2026-06-30", status: "OPEN" }]);
    await waitFor(() => expect(screen.queryByRole("option", { name: /Organization A June/ })).not.toBeInTheDocument());
    expect(apiRequestMock).not.toHaveBeenCalledWith("/accounting-close/readiness?fiscalPeriodId=period-a");
  });
});
