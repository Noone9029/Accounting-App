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
  firstAccountingWorkflowSteps,
  firstAccountingWorkflowSummary,
  groupAttentionBySeverity,
  setupWizardDashboardSummary,
  setupWizardLoadFailureMessage,
  setupWizardSteps,
  setupWizardSummary,
  onboardingChecklistItemStatusClass,
  onboardingChecklistProgressPercent,
  onboardingChecklistStatusClass,
  onboardingChecklistStatusLabel,
  visibleDashboardQuickActions,
} from "./dashboard";
import { PERMISSIONS } from "./permissions";
import type { DashboardOnboardingChecklist, DashboardSummary } from "./types";

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

  it("formats onboarding checklist helper labels and progress", () => {
    expect(onboardingChecklistStatusLabel("READY_FOR_SELLABLE_V1_REVIEW")).toBe("Ready for sellable-v1 review");
    expect(onboardingChecklistStatusLabel("BLOCKED")).toBe("Blocked");
    expect(onboardingChecklistStatusClass("IN_PROGRESS")).toContain("amber");
    expect(onboardingChecklistItemStatusClass("COMPLETE")).toContain("emerald");
    expect(onboardingChecklistProgressPercent(0, 9)).toBe("0%");
    expect(onboardingChecklistProgressPercent(1, 9)).toBe("11.1%");
    expect(onboardingChecklistProgressPercent(9, 9)).toBe("100.0%");
  });

  it("builds guided setup wizard steps from onboarding checklist items", () => {
    const steps = setupWizardSteps(sampleChecklist());

    expect(steps.map((step) => step.title)).toEqual([
      "Organization profile",
      "Chart of accounts",
      "VAT/tax profile",
      "First customer",
      "First invoice",
      "Bank/payment method",
      "First payment",
      "First report",
      "ZATCA local readiness visibility",
      "Contact VAT/ID validation",
      "Storage readiness",
    ]);
    expect(steps[0]).toEqual(
      expect.objectContaining({
        id: "organization_profile",
        status: "COMPLETE",
        statusLabel: "Complete",
        actionHref: "/organization/setup",
      }),
    );
    expect(steps[2]?.evidence).toContain("Active tax rates: 0");
    expect(steps[2]?.blockers).toContain("Create at least one active tax rate.");
    expect(steps[4]?.warnings).toContain("Create a test invoice before go-live rehearsals.");
  });

  it("calculates setup progress and next incomplete step", () => {
    const summary = setupWizardSummary(sampleChecklist());

    expect(summary.completedSteps).toBe(3);
    expect(summary.totalSteps).toBe(11);
    expect(summary.progressPercent).toBe(27);
    expect(summary.nextStep?.id).toBe("tax_profile");
    expect(summary.nextStep?.title).toBe("VAT/tax profile");
    expect(summary.statusLabel).toBe("Blocked");
    expect(summary.topBlockers).toEqual([
      "VAT/tax profile: Create at least one active tax rate.",
      "First customer: Create a customer contact.",
      "Bank/payment method: Create an active bank, cash, wallet, card, or other payment profile.",
    ]);
  });

  it("keeps ZATCA wizard messaging local-only and non-production", () => {
    const zatcaStep = setupWizardSteps(sampleChecklist()).find((step) => step.id === "zatca_local_readiness_visible");

    expect(zatcaStep?.safeExplanation).toContain("local readiness only");
    expect(zatcaStep?.safeExplanation).toContain("real ZATCA network is disabled");
    expect(zatcaStep?.safeExplanation).toContain("production compliance remains false");
    expect(zatcaStep?.safeExplanation).toContain("OTP and CSID are still required");
    expect(zatcaStep?.safeExplanation).toContain("clearance, reporting, and PDF/A-3 are not implemented");
    expect(zatcaStep?.actionLabel).toBe("Review local ZATCA readiness");
  });

  it("returns a safe fallback message when setup checklist loading fails", () => {
    expect(setupWizardLoadFailureMessage(new Error("stack trace with private details"))).toBe(
      "Setup checklist could not be loaded. Setup is not marked complete; open the dashboard checklist later or retry from this page.",
    );
  });

  it("summarizes dashboard onboarding card state with setup wizard link", () => {
    const summary = setupWizardDashboardSummary(sampleChecklist());

    expect(summary.setupHref).toBe("/setup");
    expect(summary.progressPercent).toBe(27);
    expect(summary.workflowProgressPercent).toBe(17);
    expect(summary.nextIncompleteStep?.title).toBe("VAT/tax profile");
    expect(summary.nextWorkflowStep?.title).toBe("VAT/tax profile");
    expect(summary.conciseBlockerSummary).toBe("3 blockers need review.");
  });

  it("builds the first accounting workflow from real setup checklist steps", () => {
    const steps = firstAccountingWorkflowSteps(sampleChecklist());
    const summary = firstAccountingWorkflowSummary(sampleChecklist());

    expect(steps.map((step) => step.id)).toEqual([
      "organization_profile",
      "tax_profile",
      "customer_created",
      "first_invoice",
      "first_payment",
      "first_report",
    ]);
    expect(steps.find((step) => step.id === "first_payment")?.actionHref).toBe("/sales/customer-payments/new");
    expect(steps.find((step) => step.id === "first_report")?.actionHref).toBe("/reports/profit-and-loss");
    expect(summary.completedSteps).toBe(1);
    expect(summary.totalSteps).toBe(6);
    expect(summary.progressPercent).toBe(17);
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

function sampleChecklist(): DashboardOnboardingChecklist {
  return {
    readOnly: true,
    noMutation: true,
    tenantScoped: true,
    organizationId: "org-1",
    generatedAt: "2026-05-18T00:00:00.000Z",
    status: "BLOCKED",
    readinessScore: 27,
    completedCount: 3,
    totalCount: 11,
    productionCompliance: false,
    zatcaProductionCompliance: false,
    realZatcaNetworkEnabled: false,
    signedXmlBodyPersistenceAllowed: false,
    qrPayloadBodyPersistenceAllowed: false,
    blockers: [
      "VAT/tax profile: Create at least one active tax rate.",
      "First customer: Create a customer contact.",
      "Bank/payment method: Create an active bank, cash, wallet, card, or other payment profile.",
      "First payment: Record a customer payment against an open invoice.",
      "First reportable activity: Finalize or post at least one accounting transaction before reviewing reports.",
      "Extra blocker: Keep summary short.",
    ],
    warnings: ["First invoice: Create a test invoice before go-live rehearsals."],
    recommendedNextSteps: ["Complete: VAT/tax profile."],
    items: [
      {
        id: "organization_profile",
        label: "Organization profile complete",
        status: "COMPLETE",
        description: "Legal profile is ready.",
        href: "/settings/organization",
        evidence: ["Legal profile fields complete: yes"],
        blockers: [],
        warnings: [],
      },
      {
        id: "chart_of_accounts",
        label: "Chart of accounts available",
        status: "COMPLETE",
        description: "Posting accounts exist.",
        href: "/accounts",
        evidence: ["Active posting accounts: 8"],
        blockers: [],
        warnings: [],
      },
      {
        id: "tax_profile",
        label: "VAT/tax profile complete",
        status: "INCOMPLETE",
        description: "VAT and tax rates are needed.",
        href: "/tax-rates",
        evidence: ["Active tax rates: 0"],
        blockers: ["Create at least one active tax rate."],
        warnings: [],
      },
      {
        id: "customer_created",
        label: "At least one customer",
        status: "INCOMPLETE",
        description: "Create a customer.",
        href: "/contacts",
        evidence: ["Customer contacts: 0"],
        blockers: ["Create a customer contact."],
        warnings: [],
      },
      {
        id: "first_invoice",
        label: "At least one sales invoice",
        status: "WARNING",
        description: "Create the first invoice.",
        href: "/sales/invoices",
        evidence: ["Sales invoices: 0"],
        blockers: [],
        warnings: ["Create a test invoice before go-live rehearsals."],
      },
      {
        id: "bank_payment_method",
        label: "Payment method or bank account configured",
        status: "INCOMPLETE",
        description: "Add a payment profile.",
        href: "/bank-accounts",
        evidence: ["Active bank/cash profiles: 0"],
        blockers: ["Create an active bank, cash, wallet, card, or other payment profile."],
        warnings: [],
      },
      {
        id: "first_payment",
        label: "At least one customer payment",
        status: "INCOMPLETE",
        description: "Record the first customer payment.",
        href: "/sales/customer-payments",
        evidence: ["Posted customer payments: 0"],
        blockers: ["Record a customer payment against an open invoice."],
        warnings: [],
      },
      {
        id: "first_report",
        label: "First reportable activity",
        status: "INCOMPLETE",
        description: "Review a first report.",
        href: "/reports/profit-and-loss",
        evidence: ["Posted journal entries: 0"],
        blockers: ["Finalize or post at least one accounting transaction before reviewing reports."],
        warnings: [],
      },
      {
        id: "zatca_local_readiness_visible",
        label: "ZATCA local readiness visible",
        status: "WARNING",
        description: "Local-only ZATCA visibility.",
        href: "/settings/zatca",
        evidence: ["Production compliance: false", "Real ZATCA network enabled: false"],
        blockers: [],
        warnings: ["OTP and CSID are still required."],
      },
      {
        id: "contact_vat_id_validation",
        label: "Contact VAT and ID validation ready",
        status: "COMPLETE",
        description: "Contact validation is enabled.",
        href: "/contacts",
        evidence: ["Backend/frontend validation is enabled."],
        blockers: [],
        warnings: [],
      },
      {
        id: "storage_readiness_checked",
        label: "Backup and storage readiness checked",
        status: "WARNING",
        description: "Storage readiness is checked.",
        href: "/settings/storage",
        evidence: ["Storage providers: database, database"],
        blockers: [],
        warnings: ["Signed XML and QR body persistence remain blocked."],
      },
    ],
  };
}
