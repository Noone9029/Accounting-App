import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import AccountingCloseCyclePage from "./page";

const apiRequestMock = jest.fn();

jest.mock("next/navigation", () => ({ useParams: () => ({ cycleId: "cycle-1" }) }));
jest.mock("@/hooks/use-active-organization", () => ({ useActiveOrganizationId: () => "org-1" }));
jest.mock("@/components/permissions/permission-provider", () => ({ usePermissions: () => ({ canAny: () => true }) }));
jest.mock("@/lib/api", () => ({ apiRequest: (...args: unknown[]) => apiRequestMock(...args) }));

describe("accountant close cycle detail", () => {
  beforeEach(() => {
    apiRequestMock.mockReset();
    apiRequestMock.mockImplementation((path: string) => {
      if (path === "/accounting-close/cycles/cycle-1") return Promise.resolve({ id: "cycle-1", fiscalPeriodId: "period-1", status: "IN_PROGRESS", version: 4, readinessHash: "abc123", fiscalPeriod: { name: "June 2026", status: "OPEN" }, taskCount: 2, evidenceCount: 1, snapshotCount: 1 });
      if (path === "/accounting-close/cycles/cycle-1/tasks?page=1&pageSize=100") return Promise.resolve({ items: [{ id: "task-1", title: "Review bank reconciliation", source: "STANDARD_TEMPLATE", severity: "INFORMATION", status: "OPEN", isRequired: true, assignedToUserId: null }], meta: { totalItems: 1 } });
      if (path.includes("/refresh")) return Promise.resolve({ id: "cycle-1", fiscalPeriodId: "period-1", status: "IN_PROGRESS", version: 5, readinessHash: "def456", fiscalPeriod: { name: "June 2026", status: "OPEN" }, taskCount: 2, evidenceCount: 1, snapshotCount: 1 });
      return Promise.resolve(null);
    });
  });

  it("loads the cycle and bounded checklist, then refreshes using the returned version", async () => {
    render(<AccountingCloseCyclePage />);
    expect(await screen.findByRole("heading", { name: "June 2026 close cycle" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Complete task: Review bank reconciliation" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Refresh readiness" }));
    await waitFor(() => expect(apiRequestMock).toHaveBeenCalledWith("/accounting-close/cycles/cycle-1/refresh", { method: "POST", body: { expectedVersion: 4 } }));
  });

  it("reloads the full cycle after a partial prepare response", async () => {
    let cycleReads = 0;
    apiRequestMock.mockImplementation((path: string) => {
      if (path === "/accounting-close/cycles/cycle-1") {
        cycleReads += 1;
        return Promise.resolve({ id: "cycle-1", fiscalPeriodId: "period-1", status: cycleReads === 1 ? "IN_PROGRESS" : "READY_FOR_REVIEW", version: cycleReads === 1 ? 4 : 5, readinessHash: "abc123", fiscalPeriod: { name: "June 2026", status: "OPEN" }, taskCount: 2, evidenceCount: 1, snapshotCount: 1 });
      }
      if (path === "/accounting-close/cycles/cycle-1/tasks?page=1&pageSize=100") return Promise.resolve({ items: [], meta: { totalItems: 0 } });
      if (path === "/accounting-close/cycles/cycle-1/prepare") return Promise.resolve({ id: "cycle-1", status: "READY_FOR_REVIEW", version: 5 });
      return Promise.resolve(null);
    });

    render(<AccountingCloseCyclePage />);
    fireEvent.click(await screen.findByRole("button", { name: "Prepare for review" }));
    await waitFor(() => expect(apiRequestMock).toHaveBeenCalledWith("/accounting-close/cycles/cycle-1/prepare", { method: "POST", body: { expectedVersion: 4 } }));
    expect(await screen.findByText("READY FOR REVIEW")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "June 2026 close cycle" })).toBeInTheDocument();
  });

  it("completes a manual task with the current cycle version and reloads", async () => {
    apiRequestMock.mockImplementation((path: string) => {
      if (path === "/accounting-close/cycles/cycle-1") return Promise.resolve({ id: "cycle-1", fiscalPeriodId: "period-1", status: "IN_PROGRESS", version: 4, readinessHash: "abc123", fiscalPeriod: { name: "June 2026", status: "OPEN" }, taskCount: 2, evidenceCount: 1, snapshotCount: 1 });
      if (path === "/accounting-close/cycles/cycle-1/tasks?page=1&pageSize=100") return Promise.resolve({ items: [{ id: "task-1", title: "Review bank reconciliation", source: "STANDARD_TEMPLATE", severity: "INFORMATION", status: "OPEN", isRequired: true, assignedToUserId: null }], meta: { totalItems: 1 } });
      if (path === "/accounting-close/cycles/cycle-1/tasks/task-1/complete") return Promise.resolve({ id: "task-1", status: "COMPLETED" });
      return Promise.resolve(null);
    });

    render(<AccountingCloseCyclePage />);
    fireEvent.click(await screen.findByRole("button", { name: "Complete task: Review bank reconciliation" }));
    await waitFor(() => expect(apiRequestMock).toHaveBeenCalledWith("/accounting-close/cycles/cycle-1/tasks/task-1/complete", { method: "POST", body: { expectedVersion: 4 } }));
  });

  it("links a safe report reference without uploading document content", async () => {
    apiRequestMock.mockImplementation((path: string) => {
      if (path === "/accounting-close/cycles/cycle-1") return Promise.resolve({ id: "cycle-1", fiscalPeriodId: "period-1", status: "IN_PROGRESS", version: 4, readinessHash: "abc123", fiscalPeriod: { name: "June 2026", status: "OPEN" }, taskCount: 2, evidenceCount: 1, snapshotCount: 1 });
      if (path === "/accounting-close/cycles/cycle-1/tasks?page=1&pageSize=100") return Promise.resolve({ items: [{ id: "task-1", title: "Review bank reconciliation", source: "STANDARD_TEMPLATE", severity: "INFORMATION", status: "OPEN", isRequired: true, assignedToUserId: null }], meta: { totalItems: 1 } });
      if (path === "/accounting-close/cycles/cycle-1/evidence") return Promise.resolve({ id: "evidence-2" });
      return Promise.resolve(null);
    });

    render(<AccountingCloseCyclePage />);
    fireEvent.change(await screen.findByRole("textbox", { name: "Safe label" }), { target: { value: "June trial balance reviewed" } });
    fireEvent.click(screen.getByRole("button", { name: "Link evidence" }));
    await waitFor(() => expect(apiRequestMock).toHaveBeenCalledWith("/accounting-close/cycles/cycle-1/evidence", { method: "POST", body: { expectedVersion: 4, evidenceType: "REPORT", reportType: "TRIAL_BALANCE", safeLabel: "June trial balance reviewed" } }));
  });

  it("only offers Complete for server-supported manual task statuses", async () => {
    apiRequestMock.mockImplementation((path: string) => {
      if (path === "/accounting-close/cycles/cycle-1") return Promise.resolve({ id: "cycle-1", fiscalPeriodId: "period-1", status: "IN_PROGRESS", version: 4, readinessHash: "abc123", fiscalPeriod: { name: "June 2026", status: "OPEN" }, taskCount: 2, evidenceCount: 1, snapshotCount: 1 });
      if (path === "/accounting-close/cycles/cycle-1/tasks?page=1&pageSize=100") return Promise.resolve({ items: [
        { id: "task-open", title: "Open task", source: "STANDARD_TEMPLATE", severity: "INFORMATION", status: "OPEN", isRequired: true, assignedToUserId: null },
        { id: "task-ack", title: "Acknowledged task", source: "STANDARD_TEMPLATE", severity: "WARNING", status: "ACKNOWLEDGED", isRequired: true, assignedToUserId: null },
        { id: "task-na", title: "Not applicable task", source: "STANDARD_TEMPLATE", severity: "INFORMATION", status: "NOT_APPLICABLE", isRequired: false, assignedToUserId: null },
      ], meta: { totalItems: 3 } });
      return Promise.resolve(null);
    });

    render(<AccountingCloseCyclePage />);
    expect(await screen.findByRole("button", { name: "Complete task: Open task" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Complete task: Acknowledged task" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Complete task: Not applicable task" })).not.toBeInTheDocument();
  });
});
