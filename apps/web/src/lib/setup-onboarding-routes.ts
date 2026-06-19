import { APP_ROUTES, type AppRoute, type AppRouteKey } from "./app-routes";

export interface SetupOnboardingRoute {
  key: AppRouteKey;
  label: string;
  href: string;
  description: string;
  actionLabel: string;
  safeExplanation: string;
}

export interface SetupBreadcrumb {
  label: string;
  href: string;
}

export const SETUP_ROUTE_KEY_BY_CHECKLIST_ITEM = {
  organization_profile: "settings.organization",
  chart_of_accounts: "accounting.accounts",
  tax_profile: "settings.taxRates",
  customer_created: "customers",
  first_invoice: "sales.invoice.new",
  bank_payment_method: "banking.bankAccounts",
  first_payment: "sales.customerPayment.new",
  first_report: "reports.profitLoss",
  zatca_local_readiness_visible: "settings.compliance",
  contact_vat_id_validation: "customers",
  storage_readiness_checked: "settings.storage",
} as const satisfies Record<string, AppRouteKey>;

const SETUP_RETURN_TO = "/setup";
const DASHBOARD_ROUTE_KEY = "dashboard" satisfies AppRouteKey;
const SETUP_ROUTE_KEY = "setup" satisfies AppRouteKey;

const SETUP_NAVIGATION_ROUTE_KEYS = [
  SETUP_ROUTE_KEY,
  "settings.organization",
  "settings.taxRates",
  "customers",
  "sales.invoice.new",
  "banking.bankAccounts",
  "sales.customerPayment.new",
  "reports.profitLoss",
  "settings.compliance",
  "settings.storage",
] as const satisfies readonly AppRouteKey[];

const SETUP_ROUTE_COPY: Partial<Record<AppRouteKey, Pick<SetupOnboardingRoute, "label" | "actionLabel" | "safeExplanation">>> = {
  setup: {
    label: "Guided setup",
    actionLabel: "Open setup",
    safeExplanation: "Review setup checklist evidence without mutating workspace data.",
  },
  "settings.organization": {
    label: "Organization profile",
    actionLabel: "Review organization",
    safeExplanation: "Review legal name, country, base currency, timezone, and VAT/tax identity. This wizard only links to setup screens.",
  },
  "accounting.accounts": {
    label: "Chart of accounts",
    actionLabel: "Open accounts",
    safeExplanation: "Posting workflows need active posting accounts. The wizard does not create, seed, or alter accounts.",
  },
  "settings.taxRates": {
    label: "VAT/tax profile",
    actionLabel: "Open tax rates",
    safeExplanation: "Review VAT identity and active tax-rate setup before first invoices. Existing contact VAT/ID validation is not changed here.",
  },
  customers: {
    label: "First customer",
    actionLabel: "Add first customer",
    safeExplanation: "Create or review customer records from the dedicated customer workspace. The wizard does not create contacts automatically.",
  },
  "sales.invoice.new": {
    label: "First invoice",
    actionLabel: "Create first invoice",
    safeExplanation: "Use the sales invoice workflow to create a draft invoice for review. The wizard does not finalize or submit invoices.",
  },
  "banking.bankAccounts": {
    label: "Bank/payment method",
    actionLabel: "Open bank accounts",
    safeExplanation: "Review bank, cash, card, wallet, or other payment profiles. The wizard does not post balances or payments.",
  },
  "sales.customerPayment.new": {
    label: "First payment",
    actionLabel: "Record first payment",
    safeExplanation: "Record a customer payment against a finalized invoice. The wizard does not allocate or post payments automatically.",
  },
  "reports.profitLoss": {
    label: "First report",
    actionLabel: "View first report",
    safeExplanation: "Open Profit & Loss after posted activity exists. The wizard does not generate or export reports automatically.",
  },
  "settings.compliance": {
    label: "Compliance readiness visibility",
    actionLabel: "Review compliance readiness",
    safeExplanation:
      "Country-specific compliance status is hidden in the generic workspace. VAT and accounting review stays local-only and does not enable tax-authority submission workflows.",
  },
  "settings.storage": {
    label: "Storage readiness",
    actionLabel: "Open storage settings",
    safeExplanation: "Review generated-document and attachment storage readiness. Signed XML and QR payload body persistence remain blocked.",
  },
};

const routesByKey = new Map<AppRouteKey, AppRoute>(APP_ROUTES.map((route) => [route.key, route]));

export function getSetupRoute(key: string): SetupOnboardingRoute | null {
  const route = routesByKey.get(key as AppRouteKey);
  if (!route || route.capabilityStatus !== "active") {
    return null;
  }

  const copy = SETUP_ROUTE_COPY[route.key];
  return {
    key: route.key,
    label: copy?.label ?? route.label,
    href: setupHrefForRoute(route),
    description: route.description,
    actionLabel: copy?.actionLabel ?? `Open ${route.label}`,
    safeExplanation: copy?.safeExplanation ?? "This setup link opens an active LedgerByte route without mutating setup data.",
  };
}

export function getSetupNavigationItems(): SetupOnboardingRoute[] {
  return SETUP_NAVIGATION_ROUTE_KEYS.flatMap((key) => {
    const route = getSetupRoute(key);
    return route ? [route] : [];
  });
}

export function getSetupBreadcrumbs(currentKey: string): SetupBreadcrumb[] {
  const dashboard = getSetupRoute(DASHBOARD_ROUTE_KEY);
  const setup = getSetupRoute(SETUP_ROUTE_KEY);
  const current = getSetupRoute(currentKey);

  return [dashboard, setup, current].flatMap((route) => {
    if (!route) {
      return [];
    }
    const registryRoute = routesByKey.get(route.key);
    return [{ label: route.key === currentKey && registryRoute ? registryRoute.label : route.label, href: route.href }];
  });
}

export function getSetupCompletionDestination(): SetupOnboardingRoute {
  const route = getSetupRoute(DASHBOARD_ROUTE_KEY);
  if (!route) {
    throw new Error("Dashboard route must remain active for setup completion.");
  }
  return route;
}

export function isSetupRouteAvailable(key: string): boolean {
  return getSetupRoute(key) !== null;
}

export function setupRouteForChecklistItem(itemId: string): SetupOnboardingRoute | null {
  const key = SETUP_ROUTE_KEY_BY_CHECKLIST_ITEM[itemId as keyof typeof SETUP_ROUTE_KEY_BY_CHECKLIST_ITEM];
  return key ? getSetupRoute(key) : null;
}

function setupHrefForRoute(route: AppRoute): string {
  if (route.key === "sales.invoice.new" || route.key === "sales.customerPayment.new") {
    const params = new URLSearchParams({ returnTo: SETUP_RETURN_TO });
    return `${route.href}?${params.toString()}`;
  }
  return route.href;
}
