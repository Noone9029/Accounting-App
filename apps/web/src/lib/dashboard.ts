import { getLedgerByteEdition, type LedgerByteMarket } from "./edition";
import { formatMoneyAmount } from "./money";
import { hasPermission, PERMISSIONS, type Permission, type PermissionSubject } from "./permissions";
import { getSetupCompletionDestination, getSetupRoute, setupRouteForChecklistItem } from "./setup-onboarding-routes";
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

export const DASHBOARD_ROUTE = getSetupCompletionDestination().href;
export const SETUP_WIZARD_ROUTE = getSetupRoute("setup")?.href ?? "/setup";

export const DASHBOARD_QUICK_ACTIONS: readonly DashboardQuickAction[] = [
  {
    label: "Create invoice",
    href: `/sales/invoices/new?returnTo=${encodeURIComponent(DASHBOARD_ROUTE)}`,
    permission: PERMISSIONS.salesInvoices.create,
  },
  {
    label: "Record customer payment",
    href: `/sales/customer-payments/new?returnTo=${encodeURIComponent(DASHBOARD_ROUTE)}`,
    permission: PERMISSIONS.customerPayments.create,
  },
  {
    label: "Create purchase bill",
    href: `/purchases/bills/new?returnTo=${encodeURIComponent(DASHBOARD_ROUTE)}`,
    permission: PERMISSIONS.purchaseBills.create,
  },
  {
    label: "Record supplier payment",
    href: `/purchases/supplier-payments/new?returnTo=${encodeURIComponent(DASHBOARD_ROUTE)}`,
    permission: PERMISSIONS.supplierPayments.create,
  },
  {
    label: "Create cash expense",
    href: `/purchases/cash-expenses/new?returnTo=${encodeURIComponent(DASHBOARD_ROUTE)}`,
    permission: PERMISSIONS.cashExpenses.create,
  },
  { label: "Import bank statement", href: "/bank-accounts", permission: PERMISSIONS.bankStatements.import },
  { label: "View reports", href: "/reports", permission: PERMISSIONS.reports.view },
  { label: "Inventory adjustment", href: "/inventory/adjustments/new", permission: PERMISSIONS.inventoryAdjustments.create },
];

export type DashboardDrilldownKey =
  | "unpaidInvoices"
  | "overdueInvoices"
  | "salesQuotes"
  | "recurringInvoices"
  | "deliveryNotes"
  | "collections"
  | "unpaidBills"
  | "overdueBills"
  | "customerPayments"
  | "customers"
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
  salesQuotes: { label: "View quotes", href: "/sales/quotes", permissions: [PERMISSIONS.salesInvoices.view] },
  recurringInvoices: { label: "View recurring templates", href: "/sales/recurring-invoices", permissions: [PERMISSIONS.salesInvoices.view] },
  deliveryNotes: { label: "View delivery notes", href: "/sales/delivery-notes", permissions: [PERMISSIONS.salesInvoices.view] },
  collections: { label: "View collections", href: "/sales/collections", permissions: [PERMISSIONS.salesInvoices.view] },
  unpaidBills: { label: "View bills", href: "/purchases/bills", permissions: [PERMISSIONS.purchaseBills.view] },
  overdueBills: { label: "View aged payables", href: "/reports/aged-payables", permissions: [PERMISSIONS.reports.view] },
  customerPayments: { label: "View customer payments", href: "/sales/customer-payments", permissions: [PERMISSIONS.customerPayments.view] },
  customers: { label: "View customers", href: "/customers", permissions: [PERMISSIONS.contacts.view] },
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
  zatcaReadiness: { label: "View compliance readiness", href: "/settings/compliance", permissions: [PERMISSIONS.compliance.view, PERMISSIONS.zatca.view] },
  auditLogs: { label: "View audit logs", href: "/settings/audit-logs", permissions: [PERMISSIONS.auditLogs.view] },
  storage: {
    label: "View storage",
    href: "/settings/storage",
    permissions: [PERMISSIONS.documentSettings.view, PERMISSIONS.attachments.manage],
  },
};

export function formatDashboardMoney(value: string | number, currency = getLedgerByteEdition().defaultCurrency): string {
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
  workflowProgressPercent: number;
  workflowProgressWidth: string;
  nextWorkflowStep: SetupWizardStep | null;
  conciseBlockerSummary: string;
}

export const FIRST_ACCOUNTING_WORKFLOW_STEP_IDS = [
  "organization_profile",
  "tax_profile",
  "customer_created",
  "first_invoice",
  "first_payment",
  "first_report",
] as const;

interface SetupStepCopy {
  title: string;
  actionHref: string;
  actionLabel: string;
  safeExplanation: string;
}

type SetupStepStaticCopy = Omit<SetupStepCopy, "actionHref">;

const SETUP_STEP_COPY: Record<string, SetupStepStaticCopy> = {
  organization_profile: {
    title: "Organization profile",
    actionLabel: "Review organization",
    safeExplanation: "Review legal name, country, base currency, timezone, and VAT/tax identity. This wizard only links to setup screens.",
  },
  chart_of_accounts: {
    title: "Chart of accounts",
    actionLabel: "Open accounts",
    safeExplanation: "Posting workflows need active posting accounts. The wizard does not create, seed, or alter accounts.",
  },
  tax_profile: {
    title: "VAT/tax profile",
    actionLabel: "Open tax rates",
    safeExplanation: "Review VAT identity and active tax-rate setup before first invoices. Existing contact VAT/ID validation is not changed here.",
  },
  customer_created: {
    title: "First customer",
    actionLabel: "Add first customer",
    safeExplanation: "Create or review customer records from the dedicated customer workspace. The wizard does not create contacts automatically.",
  },
  first_invoice: {
    title: "First invoice",
    actionLabel: "Create first invoice",
    safeExplanation: "Use the sales invoice workflow to create a draft invoice for review. The wizard does not finalize or submit invoices.",
  },
  bank_payment_method: {
    title: "Bank/payment method",
    actionLabel: "Open bank accounts",
    safeExplanation: "Review bank, cash, card, wallet, or other payment profiles. The wizard does not post balances or payments.",
  },
  first_payment: {
    title: "First payment",
    actionLabel: "Record first payment",
    safeExplanation: "Record a customer payment against a finalized invoice. The wizard does not allocate or post payments automatically.",
  },
  first_report: {
    title: "First report",
    actionLabel: "View first report",
    safeExplanation: "Open Profit & Loss after posted activity exists. The wizard does not generate or export reports automatically.",
  },
  zatca_local_readiness_visible: {
    title: "Compliance readiness visibility",
    actionLabel: "Review compliance readiness",
    safeExplanation:
      "Country-specific compliance status is hidden in the generic workspace. VAT and accounting review stays local-only and does not enable tax-authority submission workflows.",
  },
  contact_vat_id_validation: {
    title: "Contact VAT/ID validation",
    actionLabel: "Review contacts",
    safeExplanation: "Contact VAT and buyer identification validation stays in the existing contact workflows. This wizard only reports checklist evidence.",
  },
  storage_readiness_checked: {
    title: "Storage readiness",
    actionLabel: "Open storage settings",
    safeExplanation: "Review generated-document and attachment storage readiness. Signed XML and QR payload body persistence remain blocked.",
  },
};

export function setupWizardSteps(checklist: DashboardOnboardingChecklist, market?: LedgerByteMarket): SetupWizardStep[] {
  const edition = getLedgerByteEdition(market);
  return checklist.items.map((item) => {
    const copy = item.id === "zatca_local_readiness_visible" ? editionSetupStepCopy(edition) : setupStepCopy(item);
    const countryComplianceFields = countryComplianceChecklistFields(item, edition);
    return {
      id: item.id,
      title: copy.title,
      status: item.status,
      statusLabel: onboardingChecklistItemStatusLabel(item.status),
      statusClassName: onboardingChecklistItemStatusClass(item.status),
      description: countryComplianceFields.description,
      actionHref: copy.actionHref,
      actionLabel: copy.actionLabel,
      evidence: countryComplianceFields.evidence,
      blockers: countryComplianceFields.blockers,
      warnings: countryComplianceFields.warnings,
      safeExplanation: copy.safeExplanation,
    };
  });
}

export function setupWizardSummary(checklist: DashboardOnboardingChecklist, market?: LedgerByteMarket): SetupWizardSummary {
  const steps = setupWizardSteps(checklist, market);
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

export function setupWizardDashboardSummary(checklist: DashboardOnboardingChecklist, market?: LedgerByteMarket): SetupWizardDashboardSummary {
  const summary = setupWizardSummary(checklist, market);
  const workflow = firstAccountingWorkflowSummary(checklist, market);
  return {
    setupHref: SETUP_WIZARD_ROUTE,
    progressPercent: summary.progressPercent,
    nextIncompleteStep: summary.nextStep,
    workflowProgressPercent: workflow.progressPercent,
    workflowProgressWidth: workflow.progressWidth,
    nextWorkflowStep: workflow.nextStep,
    conciseBlockerSummary: conciseSetupBlockerSummary(summary.topBlockers.length),
  };
}

export function firstAccountingWorkflowSteps(checklist: DashboardOnboardingChecklist, market?: LedgerByteMarket): SetupWizardStep[] {
  const stepsById = new Map(setupWizardSteps(checklist, market).map((step) => [step.id, step]));
  return FIRST_ACCOUNTING_WORKFLOW_STEP_IDS.flatMap((id) => {
    const step = stepsById.get(id);
    return step ? [step] : [];
  });
}

export function firstAccountingWorkflowSummary(checklist: DashboardOnboardingChecklist, market?: LedgerByteMarket): Pick<
  SetupWizardSummary,
  "completedSteps" | "totalSteps" | "progressPercent" | "progressWidth" | "nextStep"
> {
  const steps = firstAccountingWorkflowSteps(checklist, market);
  const totalSteps = steps.length;
  const completedSteps = steps.filter((step) => step.status === "COMPLETE").length;
  return {
    completedSteps,
    totalSteps,
    progressPercent: setupWizardProgressPercent(completedSteps, totalSteps),
    progressWidth: onboardingChecklistProgressPercent(completedSteps, totalSteps),
    nextStep: nextIncompleteSetupWizardStep(steps),
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

function setupStepCopy(item: DashboardOnboardingChecklistItem): SetupStepCopy {
  const route = setupRouteForChecklistItem(item.id);
  const copy = SETUP_STEP_COPY[item.id] ?? fallbackSetupStepCopy(item);

  return {
    title: copy.title,
    actionHref: route?.href ?? item.href,
    actionLabel: copy.actionLabel,
    safeExplanation: copy.safeExplanation,
  };
}

function fallbackSetupStepCopy(item: DashboardOnboardingChecklistItem): SetupStepStaticCopy {
  return {
    title: item.label,
    actionLabel: "Open",
    safeExplanation: "This wizard shows checklist evidence and links to the relevant page without mutating setup data.",
  };
}

function editionSetupStepCopy(edition: ReturnType<typeof getLedgerByteEdition>): SetupStepCopy {
  const route = getSetupRoute(edition.showZatca ? "settings.zatca" : "settings.compliance");
  return {
    title: edition.complianceReadinessTitle,
    actionHref: route?.href ?? edition.complianceReadinessHref,
    actionLabel: edition.complianceReadinessActionLabel,
    safeExplanation: edition.complianceReadinessExplanation,
  };
}

function countryComplianceChecklistFields(
  item: DashboardOnboardingChecklistItem,
  edition: ReturnType<typeof getLedgerByteEdition>,
): Pick<DashboardOnboardingChecklistItem, "description" | "evidence" | "blockers" | "warnings"> {
  if (item.id !== "zatca_local_readiness_visible" || edition.showZatca) {
    return {
      description: item.description,
      evidence: item.evidence,
      blockers: item.blockers,
      warnings: item.warnings,
    };
  }

  if (edition.showUaeEinvoicing) {
    return {
      description: "UAE eInvoicing readiness is visible for local controlled-beta review.",
      evidence: ["UAE eInvoicing readiness remains local-only.", "Provider validation and tax-authority reporting remain disabled."],
      blockers: item.blockers,
      warnings: item.warnings.filter((warning) => !/ZATCA|CSID|OTP/i.test(warning)),
    };
  }

  return {
    description: "Country-specific compliance modules are hidden in the generic workspace.",
    evidence: ["Country-specific compliance module disabled in generic edition."],
    blockers: [],
    warnings: [],
  };
}

export function visibleDashboardQuickActions(subject: PermissionSubject): DashboardQuickAction[] {
  return DASHBOARD_QUICK_ACTIONS.filter((action) => hasPermission(subject, action.permission));
}

export function dashboardDrilldownLink(key: DashboardDrilldownKey, subject: PermissionSubject, market?: LedgerByteMarket): DashboardDrilldownLink | null {
  if (key === "zatcaReadiness") {
    const edition = getLedgerByteEdition(market);
    if (!edition.showCountryCompliance) {
      return null;
    }
    const link: DashboardDrilldownLink = {
      label: edition.complianceReadinessActionLabel,
      href: edition.complianceReadinessHref,
      permissions: edition.showZatca ? [PERMISSIONS.zatca.view] : [PERMISSIONS.compliance.view],
    };
    return link.permissions.some((permission) => hasPermission(subject, permission)) ? link : null;
  }

  const link = DASHBOARD_DRILLDOWN_LINKS[key];
  return link.permissions.some((permission) => hasPermission(subject, permission)) ? link : null;
}

export function canViewSalesAttention(subject: PermissionSubject): boolean {
  return hasPermission(subject, PERMISSIONS.salesInvoices.view);
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
