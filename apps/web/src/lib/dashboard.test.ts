import {
  attentionSeverityLabel,
  agingBucketLabel,
  chartBarPercent,
  chartHasData,
  chartMaxAmount,
  dashboardDrilldownLink,
  dashboardHealthLabel,
  dashboardIsEmpty,
  formatDashboardMoney,
  groupAttentionBySeverity,
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

  it("resolves drill-down links by permission", () => {
    const subject = {
      role: {
        permissions: [
          PERMISSIONS.salesInvoices.view,
          PERMISSIONS.customerPayments.view,
          PERMISSIONS.bankAccounts.view,
          PERMISSIONS.fiscalPeriods.view,
          PERMISSIONS.inventory.view,
        ],
      },
    };

    expect(dashboardDrilldownLink("unpaidInvoices", subject)?.href).toBe("/sales/invoices");
    expect(dashboardDrilldownLink("customerPayments", subject)?.href).toBe("/sales/customer-payments");
    expect(dashboardDrilldownLink("bankReconciliations", subject)?.href).toBe("/bank-accounts");
    expect(dashboardDrilldownLink("lowStock", subject)?.href).toBe("/inventory/reports/low-stock");
    expect(dashboardDrilldownLink("negativeStock", subject)?.href).toBe("/inventory/balances");
    expect(dashboardDrilldownLink("fiscalPeriods", subject)?.href).toBe("/fiscal-periods");
    expect(dashboardDrilldownLink("profitAndLoss", subject)).toBeNull();
  });

  it("formats chart helpers and aging labels", () => {
    expect(chartMaxAmount(["0.0000", "-40.0000", "20.0000"])).toBe(40);
    expect(chartBarPercent("20.0000", 40)).toBe("50.0%");
    expect(chartBarPercent("0.0000", 40)).toBe("0%");
    expect(chartHasData([{ amount: "0.0000" }, { amount: "1.0000" }])).toBe(true);
    expect(chartHasData([{ balance: "0.0000" }], "balance")).toBe(false);
    expect(agingBucketLabel("31_60")).toBe("31-60");
    expect(agingBucketLabel("Current")).toBe("Current");
  });

  it("groups attention items by severity", () => {
    const grouped = groupAttentionBySeverity([
      { type: "A", severity: "critical", title: "A", description: "A", href: "/" },
      { type: "B", severity: "warning", title: "B", description: "B", href: "/" },
      { type: "C", severity: "info", title: "C", description: "C", href: "/" },
      { type: "D", severity: "warning", title: "D", description: "D", href: "/" },
    ]);

    expect(grouped.critical).toHaveLength(1);
    expect(grouped.warning).toHaveLength(2);
    expect(grouped.info).toHaveLength(1);
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
      lowStockItems: [],
    },
    reports: {
      trialBalanceBalanced: true,
      profitAndLossNetProfit: "0.0000",
      balanceSheetBalanced: true,
    },
    trends: {
      monthlySales: [],
      monthlyPurchases: [],
      monthlyNetProfit: [],
      cashBalanceTrend: [],
    },
    aging: {
      receivablesBuckets: [],
      payablesBuckets: [],
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
