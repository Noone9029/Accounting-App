import { formatMoneyAmount } from "./money";
import { hasPermission, PERMISSIONS, type Permission, type PermissionSubject } from "./permissions";
import type {
  DashboardAttentionItem,
  DashboardAttentionSeverity,
  DashboardOnboardingChecklist,
  DashboardOnboardingChecklistItem,
  DashboardOnboardingChecklistItemStatus,
  DashboardOnboardingChecklistStatus,
  DashboardSummary,
} from "./types";

export interface DashboardQuickAction {
  label: string;
  href: string;
  permission: Permission;
}

export const SETUP_WIZARD_ROUTE = "/setup";

export const DASHBOARD_QUICK_ACTIONS: readonly DashboardQuickAction[] = [
  { label: "Create invoice", href: "/sales/invoices/new", permission: PERMISSIONS.salesInvoices.create },
  { label: "Record customer payment", href: "/sales/customer-payments/new", permission: PERMISSIONS.customerPayments.create },
  { label: "Create purchase bill", href: "/purchases/bills/new", permission: PERMISSIONS.purchaseBills.create },
  { label: "Record supplier payment", href: "/purchases/supplier-payments/new", permission: PERMISSIONS.supplierPayments.create },
  { label: "Create cash expense", href: "/purchases/cash-expenses/new", permission: PERMISSIONS.cashExpenses.create },
  { label: "Import bank statement", href: "/bank-accounts", permission: PERMISSIONS.bankStatements.import },
  { label: "View reports", href: "/reports", permission: PERMISSIONS.reports.view },
  { label: "Inventory adjustment", href: "/inventory/adjustments/new", permission: PERMISSIONS.inventoryAdjustments.create },
];

export type DashboardDrilldownKey =
  | "unpaidInvoices"
  | "overdueInvoices"
  | "unpaidBills"
  | "overdueBills"
  | "customerPayments"
  | "supplierPayments"
  | "bankBalance"
  | "bankReconciliations"
  | "unreconciledTransactions"
  | "lowStock"
  | "negativeStock"
  | "clearingVariances"
  | "trialBalance"
  | "profitAndLoss"
  | "balanceSheet"
  | "fiscalPeriods"
  | "zatcaReadiness"
  | "auditLogs"
  | "storage";

export interface DashboardDrilldownLink {
  label: string;
  href: string;
  permissions: readonly Permission[];
}

export const DASHBOARD_DRILLDOWN_LINKS: Record<DashboardDrilldownKey, DashboardDrilldownLink> = {
  unpaidInvoices: { label: "View invoices", href: "/sales/invoices", permissions: [PERMISSIONS.salesInvoices.view] },
  overdueInvoices: { label: "View aged receivables", href: "/reports/aged-receivables", permissions: [PERMISSIONS.reports.view] },
  unpaidBills: { label: "View bills", href: "/purchases/bills", permissions: [PERMISSIONS.purchaseBills.view] },
  overdueBills: { label: "View aged payables", href: "/reports/aged-payables", permissions: [PERMISSIONS.reports.view] },
  customerPayments: { label: "View customer payments", href: "/sales/customer-payments", permissions: [PERMISSIONS.customerPayments.view] },
  supplierPayments: { label: "View supplier payments", href: "/purchases/supplier-payments", permissions: [PERMISSIONS.supplierPayments.view] },
  bankBalance: { label: "View bank accounts", href: "/bank-accounts", permissions: [PERMISSIONS.bankAccounts.view] },
  bankReconciliations: { label: "View bank accounts", href: "/bank-accounts", permissions: [PERMISSIONS.bankAccounts.view] },
  unreconciledTransactions: { label: "Review bank accounts", href: "/bank-accounts", permissions: [PERMISSIONS.bankAccounts.view] },
  lowStock: { label: "View low stock", href: "/inventory/reports/low-stock", permissions: [PERMISSIONS.inventory.view] },
  negativeStock: { label: "View inventory balances", href: "/inventory/balances", permissions: [PERMISSIONS.inventory.view] },
  clearingVariances: { label: "View variances", href: "/inventory/reports/clearing-variance", permissions: [PERMISSIONS.inventory.view] },
  trialBalance: { label: "View trial balance", href: "/reports/trial-balance", permissions: [PERMISSIONS.reports.view] },
  profitAndLoss: { label: "View P&L", href: "/reports/profit-and-loss", permissions: [PERMISSIONS.reports.view] },
  balanceSheet: { label: "View balance sheet", href: "/reports/balance-sheet", permissions: [PERMISSIONS.reports.view] },
  fiscalPeriods: { label: "View fiscal periods", href: "/fiscal-periods", permissions: [PERMISSIONS.fiscalPeriods.view] },
  zatcaReadiness: { label: "View ZATCA", href: "/settings/zatca", permissions: [PERMISSIONS.zatca.view] },
  auditLogs: { label: "View audit logs", href: "/settings/audit-logs", permissions: [PERMISSIONS.auditLogs.view] },
  storage: {
    label: "View storage",
    href: "/settings/storage",
    permissions: [PERMISSIONS.documentSettings.view, PERMISSIONS.attachments.manage],
  },
};

export function formatDashboardMoney(value: string | number, currency = "SAR"): string {
  return formatMoneyAmount(value, currency);
}

export function attentionSeverityLabel(severity: DashboardAttentionSeverity): string {
  switch (severity) {
    case "critical":
      return "Critical";
    case "warning":
      return "Warning";
    case "info":
      return "Info";
  }
}

export function attentionSeverityClass(severity: DashboardAttentionSeverity): string {
  switch (severity) {
    case "critical":
      return "border-red-200 bg-red-50 text-red-800";
    case "warning":
      return "border-amber-200 bg-amber-50 text-amber-900";
    case "info":
      return "border-blue-200 bg-blue-50 text-blue-800";
  }
}

export function dashboardHealthLabel(value: boolean): string {
  return value ? "Balanced" : "Needs review";
}

export function onboardingChecklistStatusLabel(status: DashboardOnboardingChecklistStatus): string {
  switch (status) {
    case "READY_FOR_SELLABLE_V1_REVIEW":
      return "Ready for sellable-v1 review";
    case "IN_PROGRESS":
      return "In progress";
    case "BLOCKED":
      return "Blocked";
  }
}

export function onboardingChecklistStatusClass(status: DashboardOnboardingChecklistStatus): string {
  switch (status) {
    case "READY_FOR_SELLABLE_V1_REVIEW":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    case "IN_PROGRESS":
      return "border-amber-200 bg-amber-50 text-amber-900";
    case "BLOCKED":
      return "border-red-200 bg-red-50 text-red-800";
  }
}

export function onboardingChecklistItemStatusClass(status: DashboardOnboardingChecklistItemStatus): string {
  switch (status) {
    case "COMPLETE":
      return "text-emerald-700";
    case "WARNING":
      return "text-amber-700";
    case "INCOMPLETE":
      return "text-red-700";
  }
}

export function onboardingChecklistItemStatusLabel(status: DashboardOnboardingChecklistItemStatus): string {
  switch (status) {
    case "COMPLETE":
      return "Complete";
    case "WARNING":
      return "Needs review";
    case "INCOMPLETE":
      return "Incomplete";
  }
}

export function onboardingChecklistProgressPercent(completedCount: number, totalCount: number): string {
  if (totalCount <= 0 || completedCount <= 0) {
    return "0%";
  }
  return `${Math.max(4, Math.min(100, (completedCount / totalCount) * 100)).toFixed(1)}%`;
}

export interface SetupWizardStep {
  id: string;
  title: string;
  status: DashboardOnboardingChecklistItemStatus;
  statusLabel: string;
  statusClassName: string;
  description: string;
  actionHref: string;
  actionLabel: string;
  evidence: string[];
  blockers: string[];
  warnings: string[];
  safeExplanation: string;
}

export interface SetupWizardSummary {
  completedSteps: number;
  totalSteps: number;
  progressPercent: number;
  progressWidth: string;
  statusLabel: string;
  statusClassName: string;
  nextStep: SetupWizardStep | null;
  topBlockers: string[];
  readyForControlledBetaReview: boolean;
}

export interface SetupWizardDashboardSummary {
  setupHref: string;
  progressPercent: number;
  nextIncompleteStep: SetupWizardStep | null;
  conciseBlockerSummary: string;
}

const SETUP_STEP_COPY: Record<
  string,
  {
    title: string;
    actionHref: string;
    actionLabel: string;
    safeExplanation: string;
  }
> = {
  organization_profile: {
    title: "Organization profile",
    actionHref: "/organization/setup",
    actionLabel: "Review organization",
    safeExplanation: "Review legal name, country, base currency, timezone, and VAT/tax identity. This wizard only links to setup screens.",
  },
  chart_of_accounts: {
    title: "Chart of accounts",
    actionHref: "/accounts",
    actionLabel: "Open accounts",
    safeExplanation: "Posting workflows need active posting accounts. The wizard does not create, seed, or alter accounts.",
  },
  tax_profile: {
    title: "VAT/tax profile",
    actionHref: "/tax-rates",
    actionLabel: "Open tax rates",
    safeExplanation: "Review VAT identity and active tax-rate setup before first invoices. Existing contact VAT/ID validation is not changed here.",
  },
  customer_created: {
    title: "First customer",
    actionHref: "/contacts",
    actionLabel: "Open contacts",
    safeExplanation: "Create or review customer records from the contacts page. The wizard does not create contacts automatically.",
  },
  first_invoice: {
    title: "First invoice",
    actionHref: "/sales/invoices",
    actionLabel: "Open invoices",
    safeExplanation: "Use the sales invoice workflow for a draft or test invoice. The wizard does not finalize or submit invoices.",
  },
  bank_payment_method: {
    title: "Bank/payment method",
    actionHref: "/bank-accounts",
    actionLabel: "Open bank accounts",
    safeExplanation: "Review bank, cash, card, wallet, or other payment profiles. The wizard does not post balances or payments.",
  },
  zatca_local_readiness_visible: {
    title: "ZATCA local readiness visibility",
    actionHref: "/settings/zatca",
    actionLabel: "Review local ZATCA readiness",
    safeExplanation:
      "ZATCA status shown here is local readiness only: real ZATCA network is disabled, production compliance remains false, OTP and CSID are still required, and clearance, reporting, and PDF-A3 are not implemented.",
  },
  contact_vat_id_validation: {
    title: "Contact VAT/ID validation",
    actionHref: "/contacts",
    actionLabel: "Review contacts",
    safeExplanation: "Contact VAT and buyer identification validation stays in the existing contact workflows. This wizard only reports checklist evidence.",
  },
  storage_readiness_checked: {
    title: "Storage readiness",
    actionHref: "/settings/storage",
    actionLabel: "Open storage settings",
    safeExplanation: "Review generated-document and attachment storage readiness. Signed XML and QR payload body persistence remain blocked.",
  },
};

export function setupWizardSteps(checklist: DashboardOnboardingChecklist): SetupWizardStep[] {
  return checklist.items.map((item) => {
    const copy = SETUP_STEP_COPY[item.id] ?? fallbackSetupStepCopy(item);
    return {
      id: item.id,
      title: copy.title,
      status: item.status,
      statusLabel: onboardingChecklistItemStatusLabel(item.status),
      statusClassName: onboardingChecklistItemStatusClass(item.status),
      description: item.description,
      actionHref: copy.actionHref,
      actionLabel: copy.actionLabel,
      evidence: item.evidence,
      blockers: item.blockers,
      warnings: item.warnings,
      safeExplanation: copy.safeExplanation,
    };
  });
}

export function setupWizardSummary(checklist: DashboardOnboardingChecklist): SetupWizardSummary {
  const steps = setupWizardSteps(checklist);
  const totalSteps = steps.length;
  const completedSteps = steps.filter((step) => step.status === "COMPLETE").length;
  const progressPercent = setupWizardProgressPercent(completedSteps, totalSteps);
  return {
    completedSteps,
    totalSteps,
    progressPercent,
    progressWidth: onboardingChecklistProgressPercent(completedSteps, totalSteps),
    statusLabel: onboardingChecklistStatusLabel(checklist.status),
    statusClassName: onboardingChecklistStatusClass(checklist.status),
    nextStep: nextIncompleteSetupWizardStep(steps),
    topBlockers: checklist.blockers.slice(0, 3),
    readyForControlledBetaReview: checklist.status === "READY_FOR_SELLABLE_V1_REVIEW",
  };
}

export function setupWizardDashboardSummary(checklist: DashboardOnboardingChecklist): SetupWizardDashboardSummary {
  const summary = setupWizardSummary(checklist);
  return {
    setupHref: SETUP_WIZARD_ROUTE,
    progressPercent: summary.progressPercent,
    nextIncompleteStep: summary.nextStep,
    conciseBlockerSummary: conciseSetupBlockerSummary(summary.topBlockers.length),
  };
}

export function setupWizardLoadFailureMessage(_error: unknown): string {
  return "Setup checklist could not be loaded. Setup is not marked complete; open the dashboard checklist later or retry from this page.";
}

function setupWizardProgressPercent(completedCount: number, totalCount: number): number {
  if (totalCount <= 0 || completedCount <= 0) {
    return 0;
  }
  return Math.max(0, Math.min(100, Math.round((completedCount / totalCount) * 100)));
}

function nextIncompleteSetupWizardStep(steps: SetupWizardStep[]): SetupWizardStep | null {
  return steps.find((step) => step.status === "INCOMPLETE") ?? steps.find((step) => step.status === "WARNING") ?? null;
}

function conciseSetupBlockerSummary(blockerCount: number): string {
  if (blockerCount <= 0) {
    return "No blockers in the top setup checks.";
  }
  return blockerCount === 1 ? "1 blocker needs review." : `${blockerCount} blockers need review.`;
}

function fallbackSetupStepCopy(item: DashboardOnboardingChecklistItem): (typeof SETUP_STEP_COPY)[string] {
  return {
    title: item.label,
    actionHref: item.href,
    actionLabel: "Open",
    safeExplanation: "This wizard shows checklist evidence and links to the relevant page without mutating setup data.",
  };
}

export function visibleDashboardQuickActions(subject: PermissionSubject): DashboardQuickAction[] {
  return DASHBOARD_QUICK_ACTIONS.filter((action) => hasPermission(subject, action.permission));
}

export function dashboardDrilldownLink(key: DashboardDrilldownKey, subject: PermissionSubject): DashboardDrilldownLink | null {
  const link = DASHBOARD_DRILLDOWN_LINKS[key];
  return link.permissions.some((permission) => hasPermission(subject, permission)) ? link : null;
}

export function chartMaxAmount(values: Array<string | number>): number {
  return values.reduce<number>((max, value) => Math.max(max, Math.abs(Number(value) || 0)), 0);
}

export function chartBarPercent(value: string | number, max: number): string {
  const numeric = Math.abs(Number(value) || 0);
  if (numeric <= 0 || max <= 0) {
    return "0%";
  }
  return `${Math.max(4, Math.min(100, (numeric / max) * 100)).toFixed(1)}%`;
}

export function chartHasData<T>(points: T[], valueKey: keyof T | string = "amount"): boolean {
  return points.some((point) => Number((point as Record<string, unknown>)[String(valueKey)]) !== 0);
}

export function agingBucketLabel(bucket: string): string {
  switch (bucket) {
    case "CURRENT":
      return "Current";
    case "1_30":
      return "1-30";
    case "31_60":
      return "31-60";
    case "61_90":
      return "61-90";
    case "90_PLUS":
      return "90+";
    default:
      return bucket;
  }
}

export function groupAttentionBySeverity(items: DashboardAttentionItem[]): Record<DashboardAttentionSeverity, DashboardAttentionItem[]> {
  return {
    critical: items.filter((item) => item.severity === "critical"),
    warning: items.filter((item) => item.severity === "warning"),
    info: items.filter((item) => item.severity === "info"),
  };
}

export function dashboardIsEmpty(summary: DashboardSummary): boolean {
  return (
    summary.sales.unpaidInvoiceCount === 0 &&
    summary.purchases.unpaidBillCount === 0 &&
    summary.banking.bankAccountCount === 0 &&
    summary.inventory.trackedItemCount === 0 &&
    summary.attentionItems.length === 0
  );
}
