import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import AccountingCloseCyclePage from "./page";

const apiRequestMock = jest.fn();
const downloadAuthenticatedFileMock = jest.fn();

jest.mock("next/navigation", () => ({ useParams: () => ({ cycleId: "cycle-1" }) }));
jest.mock("@/hooks/use-active-organization", () => ({ useActiveOrganizationId: () => "org-1" }));
jest.mock("@/components/permissions/permission-provider", () => ({ usePermissions: () => ({ canAny: () => true }) }));
jest.mock("@/lib/api", () => ({ apiRequest: (...args: unknown[]) => apiRequestMock(...args) }));
jest.mock("@/lib/pdf-download", () => ({
  accountingCloseEvidenceExportPath: (cycleId: string, format: string) => `/accounting-close/cycles/${cycleId}/export?format=${format}`,
  downloadAuthenticatedFile: (...args: unknown[]) => downloadAuthenticatedFileMock(...args),
}));

describe("accountant close cycle detail", () => {
  beforeEach(() => {
    apiRequestMock.mockReset();
    downloadAuthenticatedFileMock.mockReset();
    downloadAuthenticatedFileMock.mockResolvedValue(undefined);
    apiRequestMock.mockImplementation((path: string) => {
      if (path === "/accounting-close/cycles/cycle-1") return Promise.resolve({ id: "cycle-1", fiscalPeriodId: "period-1", status: "IN_PROGRESS", version: 4, readinessHash: "abc123", fiscalPeriod: { name: "June 2026", status: "OPEN" }, taskCount: 2, evidenceCount: 1, snapshotCount: 1 });
      if (path === "/accounting-close/cycles/cycle-1/tasks?page=1&pageSize=100") return Promise.resolve({ items: [{ id: "task-1", title: "Review bank reconciliation", source: "STANDARD_TEMPLATE", severity: "INFORMATION", status: "OPEN", isRequired: true, assignedToUserId: null }], meta: { totalItems: 1 } });
      if (path === "/accounting-close/cycles/cycle-1/snapshots?page=1&pageSize=100") return Promise.resolve({ items: [], meta: { totalItems: 0 } });
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
      if (path === "/accounting-close/cycles/cycle-1/snapshots?page=1&pageSize=100") return Promise.resolve({ items: [], meta: { totalItems: 0 } });
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
      if (path === "/accounting-close/cycles/cycle-1/snapshots?page=1&pageSize=100") return Promise.resolve({ items: [], meta: { totalItems: 0 } });
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
      if (path === "/accounting-close/cycles/cycle-1/snapshots?page=1&pageSize=100") return Promise.resolve({ items: [], meta: { totalItems: 0 } });
      if (path === "/accounting-close/cycles/cycle-1/evidence") return Promise.resolve({ id: "evidence-2" });
      return Promise.resolve(null);
    });

    render(<AccountingCloseCyclePage />);
    fireEvent.change(await screen.findByRole("textbox", { name: "Safe label" }), { target: { value: "June trial balance reviewed" } });
    fireEvent.click(screen.getByRole("button", { name: "Link evidence" }));
    await waitFor(() => expect(apiRequestMock).toHaveBeenCalledWith("/accounting-close/cycles/cycle-1/evidence", { method: "POST", body: { expectedVersion: 4, evidenceType: "REPORT", reportType: "TRIAL_BALANCE", safeLabel: "June trial balance reviewed" } }));
  });

  it("returns a reviewed cycle to preparation with an explicit reason", async () => {
    const prompt = jest.spyOn(window, "prompt").mockReturnValue("Readiness changed after review.");
    apiRequestMock.mockImplementation((path: string) => {
      if (path === "/accounting-close/cycles/cycle-1") return Promise.resolve({ id: "cycle-1", fiscalPeriodId: "period-1", status: "REVIEWED", version: 7, readinessHash: "reviewed-hash", fiscalPeriod: { name: "June 2026", status: "OPEN" }, taskCount: 2, evidenceCount: 1, snapshotCount: 1 });
      if (path === "/accounting-close/cycles/cycle-1/tasks?page=1&pageSize=100") return Promise.resolve({ items: [], meta: { totalItems: 0 } });
      if (path === "/accounting-close/cycles/cycle-1/snapshots?page=1&pageSize=100") return Promise.resolve({ items: [], meta: { totalItems: 0 } });
      if (path === "/accounting-close/cycles/cycle-1/return-to-preparer") return Promise.resolve({ id: "cycle-1", status: "IN_PROGRESS", version: 8 });
      return Promise.resolve(null);
    });

    render(<AccountingCloseCyclePage />);
    fireEvent.click(await screen.findByRole("button", { name: "Return to preparer" }));
    await waitFor(() => expect(apiRequestMock).toHaveBeenCalledWith("/accounting-close/cycles/cycle-1/return-to-preparer", { method: "POST", body: { expectedVersion: 7, returnReason: "Readiness changed after review." } }));
    prompt.mockRestore();
  });

  it("offers return to preparation after an authorized fiscal-period reopen instead of an invalid lock action", async () => {
    const prompt = jest.spyOn(window, "prompt").mockReturnValue("Lock readiness changed after close.");
    apiRequestMock.mockImplementation((path: string) => {
      if (path === "/accounting-close/cycles/cycle-1") return Promise.resolve({ id: "cycle-1", fiscalPeriodId: "period-1", status: "CLOSED", version: 8, readinessHash: "closed-hash", fiscalPeriod: { name: "June 2026", status: "OPEN" }, taskCount: 2, evidenceCount: 1, snapshotCount: 2 });
      if (path === "/accounting-close/cycles/cycle-1/tasks?page=1&pageSize=100") return Promise.resolve({ items: [], meta: { totalItems: 0 } });
      if (path === "/accounting-close/cycles/cycle-1/snapshots?page=1&pageSize=100") return Promise.resolve({ items: [], meta: { totalItems: 0 } });
      if (path === "/accounting-close/cycles/cycle-1/return-to-preparer") return Promise.resolve({ id: "cycle-1", status: "IN_PROGRESS", version: 9 });
      return Promise.resolve(null);
    });

    render(<AccountingCloseCyclePage />);
    fireEvent.click(await screen.findByRole("button", { name: "Return to preparer" }));
    await waitFor(() => expect(apiRequestMock).toHaveBeenCalledWith("/accounting-close/cycles/cycle-1/return-to-preparer", { method: "POST", body: { expectedVersion: 8, returnReason: "Lock readiness changed after close." } }));
    expect(screen.getByText("The fiscal period is open while this close cycle remains closed. Return the close cycle to preparation before starting a fresh readiness and review workflow.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Refresh readiness" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Lock period" })).not.toBeInTheDocument();
    prompt.mockRestore();
  });

  it("reloads the cycle after the close gate invalidates a stale review", async () => {
    const confirm = jest.spyOn(window, "confirm").mockReturnValue(true);
    let cycleReads = 0;
    apiRequestMock.mockImplementation((path: string) => {
      if (path === "/accounting-close/cycles/cycle-1") {
        cycleReads += 1;
        return Promise.resolve({ id: "cycle-1", fiscalPeriodId: "period-1", status: cycleReads === 1 ? "REVIEWED" : "IN_PROGRESS", version: cycleReads === 1 ? 7 : 8, readinessHash: cycleReads === 1 ? "reviewed-hash" : null, fiscalPeriod: { name: "June 2026", status: "OPEN" }, taskCount: 2, evidenceCount: 1, snapshotCount: 2 });
      }
      if (path === "/accounting-close/cycles/cycle-1/tasks?page=1&pageSize=100") return Promise.resolve({ items: [], meta: { totalItems: 0 } });
      if (path === "/accounting-close/cycles/cycle-1/snapshots?page=1&pageSize=100") return Promise.resolve({ items: [], meta: { totalItems: 0 } });
      if (path === "/accounting-close/cycles/cycle-1/close") return Promise.reject(Object.assign(new Error("Close readiness changed and the review was invalidated."), { status: 409, details: { error: { code: "ACCOUNTING_CLOSE_REVIEW_INVALIDATED", message: "Close readiness changed and the review was invalidated.", statusCode: 409, requestId: "req-close-invalidated" } } }));
      return Promise.resolve(null);
    });

    render(<AccountingCloseCyclePage />);
    fireEvent.click(await screen.findByRole("button", { name: "Close period" }));
    await waitFor(() => expect(apiRequestMock).toHaveBeenCalledWith(
      "/accounting-close/cycles/cycle-1/close",
      expect.objectContaining({
        method: "POST",
        body: { expectedVersion: 7 },
        headers: { "idempotency-key": expect.stringMatching(/^acct-close-close-[A-Za-z0-9._:-]+$/) },
      }),
    ));
    expect(await screen.findByText("IN PROGRESS")).toBeInTheDocument();
    expect(screen.getByText("The review was invalidated because readiness changed. Refresh readiness and record a new review before closing this period.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Refresh readiness" })).toBeEnabled();
    confirm.mockRestore();
  });

  it("shows post-close drift and reloads after a safe lock revalidation conflict", async () => {
    const confirm = jest.spyOn(window, "confirm").mockReturnValue(true);
    let cycleReads = 0;
    apiRequestMock.mockImplementation((path: string) => {
      if (path === "/accounting-close/cycles/cycle-1") {
        cycleReads += 1;
        return Promise.resolve({ id: "cycle-1", fiscalPeriodId: "period-1", status: "CLOSED", version: 8, readinessHash: "closed-hash", fiscalPeriod: { name: "June 2026", status: "CLOSED" }, taskCount: 2, evidenceCount: 1, snapshotCount: cycleReads === 1 ? 2 : 3 });
      }
      if (path === "/accounting-close/cycles/cycle-1/tasks?page=1&pageSize=100") return Promise.resolve({ items: [], meta: { totalItems: 0 } });
      if (path === "/accounting-close/cycles/cycle-1/snapshots?page=1&pageSize=100") return Promise.resolve({ items: [], meta: { totalItems: 0 } });
      if (path === "/accounting-close/cycles/cycle-1/lock") return Promise.reject(Object.assign(new Error("Readiness changed after the period was closed."), { status: 409, details: { error: { code: "ACCOUNTING_CLOSE_LOCK_REVALIDATION_FAILED", message: "Readiness changed after the period was closed.", statusCode: 409, requestId: "req-lock-drift" } } }));
      return Promise.resolve(null);
    });

    render(<AccountingCloseCyclePage />);
    fireEvent.click(await screen.findByRole("button", { name: "Lock period" }));
    await waitFor(() => expect(apiRequestMock).toHaveBeenCalledWith(
      "/accounting-close/cycles/cycle-1/lock",
      expect.objectContaining({
        method: "POST",
        body: { expectedVersion: 8 },
        headers: { "idempotency-key": expect.stringMatching(/^acct-close-lock-[A-Za-z0-9._:-]+$/) },
      }),
    ));
    expect(await screen.findByText("Close readiness changed after the fiscal period was closed. No lock was applied. Use the authorized fiscal-period reopen workflow, then return this close cycle to preparation before a fresh review and lock attempt.")).toBeInTheDocument();
    expect(cycleReads).toBe(2);
    confirm.mockRestore();
  });

  it("keeps a generic close conflict visible instead of treating it as a review invalidation", async () => {
    const confirm = jest.spyOn(window, "confirm").mockReturnValue(true);
    let cycleReads = 0;
    apiRequestMock.mockImplementation((path: string) => {
      if (path === "/accounting-close/cycles/cycle-1") {
        cycleReads += 1;
        return Promise.resolve({ id: "cycle-1", fiscalPeriodId: "period-1", status: "REVIEWED", version: 7, readinessHash: "reviewed-hash", fiscalPeriod: { name: "June 2026", status: "OPEN" }, taskCount: 2, evidenceCount: 1, snapshotCount: 1 });
      }
      if (path === "/accounting-close/cycles/cycle-1/tasks?page=1&pageSize=100") return Promise.resolve({ items: [], meta: { totalItems: 0 } });
      if (path === "/accounting-close/cycles/cycle-1/snapshots?page=1&pageSize=100") return Promise.resolve({ items: [], meta: { totalItems: 0 } });
      if (path === "/accounting-close/cycles/cycle-1/close") return Promise.reject(Object.assign(new Error("Close cycle changed. Reload and retry."), { status: 409, details: { code: "CLOSE_CYCLE_CHANGED" } }));
      return Promise.resolve(null);
    });

    render(<AccountingCloseCyclePage />);
    fireEvent.click(await screen.findByRole("button", { name: "Close period" }));
    expect(await screen.findByText("Close cycle changed. Reload and retry.")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("button", { name: "Close period" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "Close period" }));
    await waitFor(() => expect(apiRequestMock.mock.calls.filter(([path]) => path === "/accounting-close/cycles/cycle-1/close")).toHaveLength(2));
    const closeCalls = apiRequestMock.mock.calls.filter(([path]) => path === "/accounting-close/cycles/cycle-1/close");
    expect((closeCalls[0][1] as { headers: { "idempotency-key": string } }).headers["idempotency-key"])
      .toBe((closeCalls[1][1] as { headers: { "idempotency-key": string } }).headers["idempotency-key"]);
    expect(cycleReads).toBe(1);
    confirm.mockRestore();
  });

  it("downloads the safe close evidence manifest as JSON or CSV without mutating the cycle", async () => {
    render(<AccountingCloseCyclePage />);
    expect(await screen.findByRole("button", { name: "Download evidence JSON" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Download evidence JSON" }));
    await waitFor(() => expect(downloadAuthenticatedFileMock).toHaveBeenCalledWith("/accounting-close/cycles/cycle-1/export?format=json", "accounting-close-cycle-1-evidence.json"));
    fireEvent.click(screen.getByRole("button", { name: "Download evidence CSV" }));
    await waitFor(() => expect(downloadAuthenticatedFileMock).toHaveBeenCalledWith("/accounting-close/cycles/cycle-1/export?format=csv", "accounting-close-cycle-1-evidence.csv"));
    expect(apiRequestMock).not.toHaveBeenCalledWith(expect.stringContaining("/export"), expect.anything());
  });

  it("only offers Complete for server-supported manual task statuses", async () => {
    apiRequestMock.mockImplementation((path: string) => {
      if (path === "/accounting-close/cycles/cycle-1") return Promise.resolve({ id: "cycle-1", fiscalPeriodId: "period-1", status: "IN_PROGRESS", version: 4, readinessHash: "abc123", fiscalPeriod: { name: "June 2026", status: "OPEN" }, taskCount: 2, evidenceCount: 1, snapshotCount: 1 });
      if (path === "/accounting-close/cycles/cycle-1/tasks?page=1&pageSize=100") return Promise.resolve({ items: [
        { id: "task-open", title: "Open task", source: "STANDARD_TEMPLATE", severity: "INFORMATION", status: "OPEN", isRequired: true, assignedToUserId: null },
        { id: "task-ack", title: "Acknowledged task", source: "STANDARD_TEMPLATE", severity: "WARNING", status: "ACKNOWLEDGED", isRequired: true, assignedToUserId: null },
        { id: "task-na", title: "Not applicable task", source: "STANDARD_TEMPLATE", severity: "INFORMATION", status: "NOT_APPLICABLE", isRequired: false, assignedToUserId: null },
      ], meta: { totalItems: 3 } });
      if (path === "/accounting-close/cycles/cycle-1/snapshots?page=1&pageSize=100") return Promise.resolve({ items: [], meta: { totalItems: 0 } });
      return Promise.resolve(null);
    });

    render(<AccountingCloseCyclePage />);
    expect(await screen.findByRole("button", { name: "Complete task: Open task" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Complete task: Acknowledged task" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Complete task: Not applicable task" })).not.toBeInTheDocument();
  });

  it("loads immutable snapshot history and fetches selected safe snapshot evidence on demand", async () => {
    apiRequestMock.mockImplementation((path: string) => {
      if (path === "/accounting-close/cycles/cycle-1") return Promise.resolve({ id: "cycle-1", fiscalPeriodId: "period-1", status: "REVIEWED", version: 6, readinessHash: "abc123", fiscalPeriod: { name: "June 2026", status: "OPEN" }, taskCount: 2, evidenceCount: 1, snapshotCount: 1 });
      if (path === "/accounting-close/cycles/cycle-1/tasks?page=1&pageSize=100") return Promise.resolve({ items: [], meta: { totalItems: 0 } });
      if (path === "/accounting-close/cycles/cycle-1/snapshots?page=1&pageSize=100") return Promise.resolve({ items: [{ id: "snapshot-1", status: "REVIEWED", capturedAt: "2026-07-01T10:00:00.000Z", blockerCount: 0, warningCount: 2, informationCount: 1, checkCount: 3, canonicalHash: "frozen-hash", sourceVersion: 6 }], meta: { totalItems: 1 } });
      if (path === "/accounting-close/cycles/cycle-1/snapshots/snapshot-1") return Promise.resolve({ id: "snapshot-1", status: "REVIEWED", capturedAt: "2026-07-01T10:00:00.000Z", blockerCount: 0, warningCount: 2, informationCount: 1, checkCount: 3, canonicalHash: "frozen-hash", sourceVersion: 6, items: [{ checkKey: "fx.rates", severity: "WARNING", status: "OPEN", code: "MISSING_RATE", safeMessage: "Capture a closing rate.", count: 1, currencyCode: "AED", sourceUpdatedAt: null, metadataSafe: { title: "FX rates" } }] });
      return Promise.resolve(null);
    });

    render(<AccountingCloseCyclePage />);
    expect(await screen.findByText("Immutable snapshot history")).toBeInTheDocument();
    expect(screen.getByText("frozen-hash")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "View snapshot evidence: REVIEWED captured 2026-07-01T10:00:00.000Z frozen-h" }));
    await waitFor(() => expect(apiRequestMock).toHaveBeenCalledWith("/accounting-close/cycles/cycle-1/snapshots/snapshot-1"));
    expect(await screen.findByText("Capture a closing rate.")).toBeInTheDocument();
    expect(screen.getByText("FX rates")).toBeInTheDocument();
  });

  it("keeps older immutable snapshots discoverable with bounded history pagination", async () => {
    let resolveSecondPage: ((value: unknown) => void) | undefined;
    apiRequestMock.mockImplementation((path: string) => {
      if (path === "/accounting-close/cycles/cycle-1") return Promise.resolve({ id: "cycle-1", fiscalPeriodId: "period-1", status: "REVIEWED", version: 6, readinessHash: "abc123", fiscalPeriod: { name: "June 2026", status: "OPEN" }, taskCount: 2, evidenceCount: 1, snapshotCount: 101 });
      if (path === "/accounting-close/cycles/cycle-1/tasks?page=1&pageSize=100") return Promise.resolve({ items: [], meta: { totalItems: 0 } });
      if (path === "/accounting-close/cycles/cycle-1/snapshots?page=1&pageSize=100") return Promise.resolve({ items: [{ id: "snapshot-1", status: "REVIEWED", capturedAt: "2026-07-01T10:00:00.000Z", blockerCount: 0, warningCount: 0, informationCount: 0, checkCount: 3, canonicalHash: "first-hash", sourceVersion: 6 }], meta: { page: 1, pageSize: 100, totalItems: 101, totalPages: 2 } });
      if (path === "/accounting-close/cycles/cycle-1/snapshots?page=2&pageSize=100") return new Promise((resolve) => { resolveSecondPage = resolve; });
      return Promise.resolve(null);
    });

    render(<AccountingCloseCyclePage />);
    expect(await screen.findByText("Showing 1 of 101 snapshots")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "View snapshot evidence: REVIEWED captured 2026-07-01T10:00:00.000Z first-ha" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Next snapshot page" }));
    await waitFor(() => expect(apiRequestMock).toHaveBeenCalledWith("/accounting-close/cycles/cycle-1/snapshots?page=2&pageSize=100"));
    expect(screen.getByRole("button", { name: "View snapshot evidence: REVIEWED captured 2026-07-01T10:00:00.000Z first-ha" })).toBeDisabled();
    resolveSecondPage?.({ items: [{ id: "snapshot-101", status: "DRAFT", capturedAt: "2026-06-01T10:00:00.000Z", blockerCount: 0, warningCount: 1, informationCount: 0, checkCount: 3, canonicalHash: "older-hash", sourceVersion: 1 }], meta: { page: 2, pageSize: 100, totalItems: 101, totalPages: 2 } });
    expect(await screen.findByText("older-hash")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Previous snapshot page" })).toBeInTheDocument();
  });

  it("compares two frozen snapshots and shows only the changed safe checks", async () => {
    apiRequestMock.mockImplementation((path: string) => {
      if (path === "/accounting-close/cycles/cycle-1") return Promise.resolve({ id: "cycle-1", fiscalPeriodId: "period-1", status: "REVIEWED", version: 6, readinessHash: "current", fiscalPeriod: { name: "June 2026", status: "OPEN" }, taskCount: 2, evidenceCount: 1, snapshotCount: 2 });
      if (path === "/accounting-close/cycles/cycle-1/tasks?page=1&pageSize=100") return Promise.resolve({ items: [], meta: { totalItems: 0 } });
      if (path === "/accounting-close/cycles/cycle-1/snapshots?page=1&pageSize=100") return Promise.resolve({ items: [{ id: "11111111-1111-4111-8111-111111111111", status: "REVIEWED", capturedAt: "2026-07-01T10:00:00.000Z", blockerCount: 0, warningCount: 1, informationCount: 0, checkCount: 2, canonicalHash: "current-hash", sourceVersion: 6 }, { id: "22222222-2222-4222-8222-222222222222", status: "REVIEWED", capturedAt: "2026-06-30T10:00:00.000Z", blockerCount: 0, warningCount: 0, informationCount: 0, checkCount: 1, canonicalHash: "baseline-hash", sourceVersion: 5 }], meta: { page: 1, pageSize: 100, totalItems: 2, totalPages: 1 } });
      if (path.includes("/compare?baselineSnapshotId=22222222-2222-4222-8222-222222222222")) return Promise.resolve({ changeCount: 1, changes: [{ checkKey: "fx.rates", changeType: "MODIFIED", before: { safeMessage: "No exception." }, after: { safeMessage: "Capture a closing rate." } }] });
      return Promise.resolve(null);
    });
    render(<AccountingCloseCyclePage />);
    expect(await screen.findByText("Compare frozen snapshots")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Baseline snapshot"), { target: { value: "22222222-2222-4222-8222-222222222222" } });
    fireEvent.change(screen.getByLabelText("Comparison snapshot"), { target: { value: "11111111-1111-4111-8111-111111111111" } });
    fireEvent.click(screen.getByRole("button", { name: "Compare snapshots" }));
    await waitFor(() => expect(apiRequestMock).toHaveBeenCalledWith("/accounting-close/cycles/cycle-1/snapshots/11111111-1111-4111-8111-111111111111/compare?baselineSnapshotId=22222222-2222-4222-8222-222222222222"));
    expect(await screen.findByText("Capture a closing rate.")).toBeInTheDocument();
  });
});
