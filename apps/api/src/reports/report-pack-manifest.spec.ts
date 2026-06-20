import {
  REPORT_PACK_EXECUTION_BOUNDARY,
  REPORT_PACK_SUPPORTED_REPORTS,
  buildReportPackManifest,
} from "./report-pack-manifest";

describe("report pack manifest contract", () => {
  it("lists only existing LedgerByte report routes as pack sources", () => {
    expect(REPORT_PACK_SUPPORTED_REPORTS.map((report) => report.kind)).toEqual([
      "general-ledger",
      "trial-balance",
      "profit-and-loss",
      "balance-sheet",
      "vat-summary",
      "aged-receivables",
      "aged-payables",
    ]);
    expect(REPORT_PACK_SUPPORTED_REPORTS.map((report) => report.href)).toEqual([
      "/reports/general-ledger",
      "/reports/trial-balance",
      "/reports/profit-and-loss",
      "/reports/balance-sheet",
      "/reports/vat-summary",
      "/reports/aged-receivables",
      "/reports/aged-payables",
    ]);
  });

  it("builds a planning-only manifest with execution boundaries disabled", () => {
    const manifest = buildReportPackManifest({
      id: "pack-1",
      organizationId: "org-1",
      title: "Monthly owner review",
      createdAt: "2026-06-21T10:00:00.000Z",
      requestedByUserId: "user-1",
      items: [
        { id: "item-1", reportKind: "profit-and-loss", query: { from: "2026-06-01", to: "2026-06-30" } },
        { id: "item-2", reportKind: "balance-sheet", query: { asOf: "2026-06-30" }, reviewStatus: "READY_FOR_REVIEW" },
      ],
    });

    expect(manifest).toMatchObject({
      id: "pack-1",
      organizationId: "org-1",
      title: "Monthly owner review",
      status: "PLANNING_ONLY",
      executionBoundary: REPORT_PACK_EXECUTION_BOUNDARY,
      items: [
        {
          id: "item-1",
          reportKind: "profit-and-loss",
          title: "Profit & Loss",
          source: { type: "ledgerbyte-report-route", href: "/reports/profit-and-loss" },
          reviewStatus: "NEEDS_REVIEW",
        },
        {
          id: "item-2",
          reportKind: "balance-sheet",
          title: "Balance Sheet",
          source: { type: "ledgerbyte-report-route", href: "/reports/balance-sheet" },
          reviewStatus: "READY_FOR_REVIEW",
        },
      ],
    });
  });

  it("rejects empty, unsupported, or duplicate manifest items", () => {
    const base = {
      id: "pack-1",
      organizationId: "org-1",
      title: "Monthly owner review",
      createdAt: "2026-06-21T10:00:00.000Z",
      requestedByUserId: "user-1",
    };

    expect(() => buildReportPackManifest({ ...base, items: [] })).toThrow("Report pack manifest requires at least one report item.");
    expect(() =>
      buildReportPackManifest({
        ...base,
        items: [{ id: "item-1", reportKind: "vat-return" as never, query: {} }],
      }),
    ).toThrow("Unsupported report pack item kind: vat-return.");
    expect(() =>
      buildReportPackManifest({
        ...base,
        items: [
          { id: "item-1", reportKind: "trial-balance", query: {} },
          { id: "item-1", reportKind: "balance-sheet", query: {} },
        ],
      }),
    ).toThrow("Report pack item IDs must be unique.");
  });
});
