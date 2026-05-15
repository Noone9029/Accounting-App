import {
  attentionSeverityLabel,
  dashboardHealthLabel,
  dashboardIsEmpty,
  formatDashboardMoney,
  visibleDashboardQuickActions,
} from "./dashboard";
import { PERMISSIONS } from "./permissions";
import type { DashboardSummary } from "./types";

describe("dashboard helpers", () => {
  it("formats KPI money and status labels", () => {
    expect(formatDashboardMoney("123.4500", "SAR")).toContain("123.45");
    expect(attentionSeverityLabel("critical")).toBe("Critical");
    expect(attentionSeverityLabel("warning")).toBe("Warning");
    expect(dashboardHealthLabel(true)).toBe("Balanced");
    expect(dashboardHealthLabel(false)).toBe("Needs review");
  });

  it("filters quick actions by permission", () => {
    const actions = visibleDashboardQuickActions({
      role: { permissions: [PERMISSIONS.salesInvoices.create, PERMISSIONS.reports.view] },
    });

    expect(actions.map((action) => action.label)).toEqual(["Create invoice", "View reports"]);
  });

  it("detects dashboard empty states", () => {
    expect(dashboardIsEmpty(emptySummary())).toBe(true);
    expect(dashboardIsEmpty({ ...emptySummary(), sales: { ...emptySummary().sales, unpaidInvoiceCount: 1 } })).toBe(false);
    expect(dashboardIsEmpty({ ...emptySummary(), attentionItems: [{ type: "X", severity: "info", title: "Info", description: "Item", href: "/" }] })).toBe(false);
  });
});

function emptySummary(): DashboardSummary {
  return {
    asOf: "2026-05-15T00:00:00.000Z",
    currency: "SAR",
    sales: {
      unpaidInvoiceCount: 0,
      unpaidInvoiceBalance: "0.0000",
      overdueInvoiceCount: 0,
      overdueInvoiceBalance: "0.0000",
      salesThisMonth: "0.0000",
      customerPaymentThisMonth: "0.0000",
    },
    purchases: {
      unpaidBillCount: 0,
      unpaidBillBalance: "0.0000",
      overdueBillCount: 0,
      overdueBillBalance: "0.0000",
      purchasesThisMonth: "0.0000",
      supplierPaymentThisMonth: "0.0000",
    },
    banking: {
      bankAccountCount: 0,
      totalBankBalance: "0.0000",
      unreconciledTransactionCount: 0,
      latestReconciliationDate: null,
    },
    inventory: {
      trackedItemCount: 0,
      lowStockCount: 0,
      negativeStockCount: 0,
      inventoryEstimatedValue: "0.0000",
      clearingVarianceCount: 0,
    },
    reports: {
      trialBalanceBalanced: true,
      profitAndLossNetProfit: "0.0000",
      balanceSheetBalanced: true,
    },
    compliance: {
      zatcaProductionReady: false,
      zatcaBlockingReasonCount: 0,
      fiscalPeriodsLockedCount: 0,
      auditLogCountThisMonth: 0,
    },
    attentionItems: [],
  };
}
