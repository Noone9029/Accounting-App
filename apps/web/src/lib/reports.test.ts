import {
  agingBucketLabel,
  balanceSheetStatusClass,
  balanceSheetStatusLabel,
  buildReportQuery,
  REPORT_BUCKETS,
} from "./reports";

describe("report helpers", () => {
  it("builds compact report query strings", () => {
    expect(buildReportQuery({ from: "2026-01-01", to: "2026-01-31", accountId: "" })).toBe("?from=2026-01-01&to=2026-01-31");
    expect(buildReportQuery({})).toBe("");
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
});
