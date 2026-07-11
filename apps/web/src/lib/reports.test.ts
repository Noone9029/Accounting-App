import {
  agingBucketLabel,
  balanceSheetStatusClass,
  balanceSheetStatusLabel,
  buildReportExportPath,
  buildReportQuery,
  buildVatReturnReviewExportPath,
  reportIndexGroups,
  REPORT_BUCKETS,
  VAT_REPORT_LABELS,
  reportExportFilename,
} from "./reports";

describe("report helpers", () => {
  it("builds compact report query strings", () => {
    expect(buildReportQuery({ from: "2026-01-01", to: "2026-01-31", accountId: "" })).toBe("?from=2026-01-01&to=2026-01-31");
    expect(buildReportQuery({})).toBe("");
  });

  it("builds report export paths and filenames", () => {
    expect(buildReportExportPath("/reports/trial-balance", { from: "2026-01-01", to: "2026-01-31" }, "csv")).toBe(
      "/reports/trial-balance?from=2026-01-01&to=2026-01-31&format=csv",
    );
    expect(buildReportExportPath("/reports/trial-balance", { from: "2026-01-01", to: "2026-01-31" }, "pdf")).toBe(
      "/reports/trial-balance/pdf?from=2026-01-01&to=2026-01-31",
    );
    expect(reportExportFilename("trial-balance", "csv", "2026-05-13")).toBe("trial-balance-2026-05-13.csv");
    expect(buildVatReturnReviewExportPath({ from: "2026-01-01", to: "2026-01-31" })).toBe("/reports/vat-return?from=2026-01-01&to=2026-01-31&format=csv");
  });

  it("labels aging buckets", () => {
    expect(REPORT_BUCKETS.map(agingBucketLabel)).toEqual(["Current / Not due", "1-30", "31-60", "61-90", "90+"]);
  });

  it("labels balance sheet status", () => {
    expect(balanceSheetStatusLabel({ balanced: true, difference: "0.0000" })).toBe("Balanced");
    expect(balanceSheetStatusClass({ balanced: true })).toContain("emerald");
    expect(balanceSheetStatusLabel({ balanced: false, difference: "1.0000" })).toBe("Out of balance by 1.0000");
    expect(balanceSheetStatusClass({ balanced: false })).toContain("rose");
  });

  it("keeps VAT labels aligned between summary and return surfaces", () => {
    expect(VAT_REPORT_LABELS.outputVat).toBe("Output VAT (sales)");
    expect(VAT_REPORT_LABELS.inputVat).toBe("Input VAT (purchases)");
  });

  it("builds the reports index from active route registry entries", () => {
    const groups = reportIndexGroups();
    const links = groups.flatMap((group) => group.links);

    expect(groups.map((group) => group.label)).toEqual(["Financial statements", "Management reports", "Tax reports", "Aging", "Inventory"]);
    expect(links.map((link) => link.href)).toEqual([
      "/reports/general-ledger",
      "/reports/trial-balance",
      "/reports/profit-and-loss",
      "/reports/balance-sheet",
      "/reports/cash-flow",
      "/reports/revenue-trend",
      "/reports/fx-activity",
      "/reports/top-customers",
      "/reports/top-products-services",
      "/reports/vat-summary",
      "/reports/vat-return",
      "/reports/aged-receivables",
      "/reports/aged-payables",
      "/inventory/reports/movement-summary",
      "/inventory/reports/stock-valuation",
      "/inventory/reports/low-stock",
    ]);
    expect(links.map((link) => link.routeKey)).not.toContain("reportPacks");
    expect(links.find((link) => link.routeKey === "reports.cashFlow")?.description).toContain("posted cash and bank journal lines");
    expect(links.every((link) => link.description.length > 20)).toBe(true);
    expect(links.find((link) => link.routeKey === "reports.vatReturn")?.description).toContain("not an official filing workflow");
    expect(JSON.stringify(groups)).not.toMatch(new RegExp("Open" + "Books", "i"));
  });
});
