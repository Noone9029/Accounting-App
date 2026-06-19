import { type AppRouteKey } from "./app-routes";
import { getLedgerByteEdition, type LedgerByteMarket } from "./edition";
import { getSetupRoute, setupRouteForChecklistItem } from "./setup-onboarding-routes";
import type { DashboardOnboardingChecklist, DashboardOnboardingChecklistItem, DashboardOnboardingChecklistItemStatus } from "./types";

export type SetupProgressStatus = "complete" | "available" | "needs_attention" | "planned" | "blocked";

export type SetupProgressCategory =
  | "business_profile"
  | "contacts"
  | "documents"
  | "sales"
  | "purchases"
  | "reports"
  | "compliance"
  | "storage"
  | "integrations";

export interface SetupProgressItem {
  key: string;
  category: SetupProgressCategory;
  title: string;
  description: string;
  status: SetupProgressStatus;
  routeKey?: AppRouteKey;
  href?: string;
  actionLabel: string;
  safeExplanation: string;
  actionable: boolean;
  blockerCode?: string;
}

interface SetupProgressMetadata {
  category: SetupProgressCategory;
  title: string;
  description: string;
  actionLabel: string;
  safeExplanation: string;
}

export const FIRST_ACCOUNTING_WORKFLOW_PROGRESS_KEYS = [
  "organization_profile",
  "tax_profile",
  "customer_created",
  "first_invoice",
  "first_payment",
  "first_report",
] as const;

const SETUP_PROGRESS_ROUTE_UNAVAILABLE = "SETUP_PROGRESS_ROUTE_UNAVAILABLE";

const SETUP_PROGRESS_METADATA: Record<string, SetupProgressMetadata> = {
  organization_profile: {
    category: "business_profile",
    title: "Organization profile",
    description: "Review legal profile, country, currency, timezone, and tax identity before transactional work.",
    actionLabel: "Review organization",
    safeExplanation: "Review legal name, country, base currency, timezone, and VAT/tax identity. This wizard only links to setup screens.",
  },
  chart_of_accounts: {
    category: "business_profile",
    title: "Chart of accounts",
    description: "Confirm active posting accounts are available for accounting workflows.",
    actionLabel: "Open accounts",
    safeExplanation: "Posting workflows need active posting accounts. The wizard does not create, seed, or alter accounts.",
  },
  tax_profile: {
    category: "compliance",
    title: "VAT/tax profile",
    description: "Review VAT identity and active tax-rate setup before first invoices.",
    actionLabel: "Open tax rates",
    safeExplanation: "Review VAT identity and active tax-rate setup before first invoices. Existing contact VAT/ID validation is not changed here.",
  },
  customer_created: {
    category: "contacts",
    title: "First customer",
    description: "Create or review the first customer record from the customer workspace.",
    actionLabel: "Add first customer",
    safeExplanation: "Create or review customer records from the dedicated customer workspace. The wizard does not create contacts automatically.",
  },
  first_invoice: {
    category: "sales",
    title: "First invoice",
    description: "Create a first draft sales invoice through the sales invoice workflow.",
    actionLabel: "Create first invoice",
    safeExplanation: "Use the sales invoice workflow to create a draft invoice for review. The wizard does not finalize or submit invoices.",
  },
  bank_payment_method: {
    category: "integrations",
    title: "Bank/payment method",
    description: "Review bank, cash, card, wallet, or other payment profile readiness.",
    actionLabel: "Open bank accounts",
    safeExplanation: "Review bank, cash, card, wallet, or other payment profiles. The wizard does not post balances or payments.",
  },
  first_payment: {
    category: "sales",
    title: "First payment",
    description: "Record a first customer payment through the customer payment workflow.",
    actionLabel: "Record first payment",
    safeExplanation: "Record a customer payment against a finalized invoice. The wizard does not allocate or post payments automatically.",
  },
  first_report: {
    category: "reports",
    title: "First report",
    description: "Review the first financial report after posted accounting activity exists.",
    actionLabel: "View first report",
    safeExplanation: "Open Profit & Loss after posted activity exists. The wizard does not generate or export reports automatically.",
  },
  zatca_local_readiness_visible: {
    category: "compliance",
    title: "Compliance readiness visibility",
    description: "Review local compliance-readiness visibility without enabling authority submission workflows.",
    actionLabel: "Review compliance readiness",
    safeExplanation:
      "Country-specific compliance status is hidden in the generic workspace. VAT and accounting review stays local-only and does not enable tax-authority submission workflows.",
  },
  contact_vat_id_validation: {
    category: "contacts",
    title: "Contact VAT/ID validation",
    description: "Review contact VAT and buyer identification validation status.",
    actionLabel: "Review contacts",
    safeExplanation: "Contact VAT and buyer identification validation stays in the existing contact workflows. This wizard only reports checklist evidence.",
  },
  storage_readiness_checked: {
    category: "storage",
    title: "Storage readiness",
    description: "Review generated-document and attachment storage readiness without changing storage behavior.",
    actionLabel: "Open storage settings",
    safeExplanation: "Review generated-document and attachment storage readiness. Signed XML and QR payload body persistence remain blocked.",
  },
};

const PLANNED_SETUP_PROGRESS_ITEMS: readonly SetupProgressItem[] = [
  {
    key: "typed_onboarding_state",
    category: "business_profile",
    title: "Typed onboarding state",
    description: "Future typed onboarding state remains planned and has no active route or persistence in this slice.",
    status: "planned",
    actionLabel: "Planned",
    safeExplanation: "This planned metadata does not create database state, backend setup state, or active navigation.",
    actionable: false,
  },
];

export function setupProgressStatusFromChecklistStatus(status: DashboardOnboardingChecklistItemStatus): SetupProgressStatus {
  return status === "COMPLETE" ? "complete" : "needs_attention";
}

export function getSetupProgressItem(
  item: DashboardOnboardingChecklistItem,
  market?: LedgerByteMarket,
): SetupProgressItem | null {
  const metadata = setupProgressMetadataForItem(item, market);
  if (!metadata) {
    return null;
  }

  const route = setupProgressRouteForItem(item, market);
  const routeUnavailable = !route;
  const status = routeUnavailable ? "blocked" : setupProgressStatusFromChecklistStatus(item.status);

  return {
    key: item.id,
    category: metadata.category,
    title: metadata.title,
    description: metadata.description,
    status,
    routeKey: route?.key,
    href: route?.href,
    actionLabel: metadata.actionLabel,
    safeExplanation: metadata.safeExplanation,
    actionable: Boolean(route),
    blockerCode: routeUnavailable ? SETUP_PROGRESS_ROUTE_UNAVAILABLE : undefined,
  };
}

export function getSetupProgressItems(checklist: DashboardOnboardingChecklist, market?: LedgerByteMarket): SetupProgressItem[] {
  return checklist.items.flatMap((item) => {
    const progressItem = getSetupProgressItem(item, market);
    return progressItem ? [progressItem] : [];
  });
}

export function getFirstAccountingWorkflowProgressItems(
  checklist: DashboardOnboardingChecklist,
  market?: LedgerByteMarket,
): SetupProgressItem[] {
  const progressItemsByKey = new Map(getSetupProgressItems(checklist, market).map((item) => [item.key, item]));
  return FIRST_ACCOUNTING_WORKFLOW_PROGRESS_KEYS.flatMap((key) => {
    const item = progressItemsByKey.get(key);
    return item ? [item] : [];
  });
}

export function getPlannedSetupProgressItems(): SetupProgressItem[] {
  return [...PLANNED_SETUP_PROGRESS_ITEMS];
}

function setupProgressMetadataForItem(
  item: DashboardOnboardingChecklistItem,
  market?: LedgerByteMarket,
): SetupProgressMetadata | null {
  if (item.id === "zatca_local_readiness_visible") {
    const edition = getLedgerByteEdition(market);
    const baseMetadata = SETUP_PROGRESS_METADATA.zatca_local_readiness_visible!;
    return {
      category: baseMetadata.category,
      description: baseMetadata.description,
      title: edition.complianceReadinessTitle,
      actionLabel: edition.complianceReadinessActionLabel,
      safeExplanation: edition.complianceReadinessExplanation,
    };
  }

  return SETUP_PROGRESS_METADATA[item.id] ?? {
    category: "business_profile",
    title: item.label,
    description: item.description,
    actionLabel: "Open",
    safeExplanation: "This setup progress item is blocked because no active LedgerByte route metadata is available.",
  };
}

function setupProgressRouteForItem(item: DashboardOnboardingChecklistItem, market?: LedgerByteMarket) {
  if (item.id === "zatca_local_readiness_visible") {
    const edition = getLedgerByteEdition(market);
    return getSetupRoute(edition.showZatca ? "settings.zatca" : "settings.compliance");
  }

  return setupRouteForChecklistItem(item.id);
}
