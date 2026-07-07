import { getAppRouteByKey, type AppRoute, type AppRouteKey } from "./app-routes";
import type { AgingBucket, BalanceSheetReport } from "./types";

export const REPORT_BUCKETS: AgingBucket[] = ["CURRENT", "1_30", "31_60", "61_90", "90_PLUS"];
export type ReportExportFormat = "csv" | "pdf";
export type ReportIndexGroupLabel = "Financial statements" | "Management reports" | "Tax reports" | "Aging" | "Inventory";

export interface ReportIndexLink {
  routeKey: AppRouteKey;
  label: string;
  href: string;
  description: string;
}

export interface ReportIndexGroup {
  label: ReportIndexGroupLabel;
  links: ReportIndexLink[];
}

interface ReportIndexRouteRef {
  group: ReportIndexGroupLabel;
  key: AppRouteKey;
  label?: string;
  description?: string;
}

const REPORT_INDEX_GROUP_LABELS: readonly ReportIndexGroupLabel[] = ["Financial statements", "Management reports", "Tax reports", "Aging", "Inventory"];

const REPORT_INDEX_ROUTE_REFS: readonly ReportIndexRouteRef[] = [
  { group: "Financial statements", key: "reports.generalLedger", description: "Trace posted journal lines by account." },
  { group: "Financial statements", key: "reports.trialBalance", description: "Confirm debits and credits stay balanced." },
  { group: "Financial statements", key: "reports.profitLoss", description: "Review revenue, costs, expenses, and net profit." },
  { group: "Financial statements", key: "reports.balanceSheet", description: "Check assets, liabilities, equity, and retained earnings." },
  { group: "Management reports", key: "reports.cashFlow", description: "Review cash movement from posted cash and bank journal lines." },
  { group: "Management reports", key: "reports.revenueTrend", description: "Trend posted revenue-account journal lines by month." },
  { group: "Management reports", key: "reports.topCustomers", description: "Rank customers by finalized sales invoice gross totals." },
  { group: "Management reports", key: "reports.topProductsServices", description: "Rank catalog items and uncataloged lines from finalized sales invoice lines." },
  { group: "Tax reports", key: "reports.vatSummary", description: "Account-basis VAT review from posted VAT account movement. It is not an official filing workflow." },
  { group: "Tax reports", key: "reports.vatReturn", description: "Draft source-document VAT review with internal CSV export only. It is not an official filing workflow." },
  {
    group: "Aging",
    key: "reports.agedReceivables",
    description:
      "Outstanding sales invoice balances after posted payments and credits. Quotes, recurring templates, delivery notes, and collection cases are excluded.",
  },
  { group: "Aging", key: "reports.agedPayables", description: "See supplier bill balances by overdue bucket." },
  {
    group: "Inventory",
    key: "inventory.report.movementSummary",
    label: "Inventory Movement",
    description: "Trace stock in, stock out, and closing quantity by item and warehouse.",
  },
  {
    group: "Inventory",
    key: "inventory.report.stockValuation",
    label: "Stock Valuation",
    description: "Review moving-average operational stock value estimates.",
  },
  { group: "Inventory", key: "inventory.report.lowStock", label: "Low Stock", description: "Find tracked items at or below reorder point." },
];

export const VAT_REPORT_LABELS = {
  outputVat: "Output VAT (sales)",
  inputVat: "Input VAT (purchases)",
} as const;

export function todayDateInput(): string {
  return new Date().toISOString().slice(0, 10);
}

export function monthStartDateInput(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10);
}

export function buildReportQuery(params: Record<string, string | undefined | null>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) {
      query.set(key, value);
    }
  }
  const text = query.toString();
  return text ? `?${text}` : "";
}

export function buildReportExportPath(endpoint: string, params: Record<string, string | undefined | null>, format: ReportExportFormat): string {
  if (format === "pdf") {
    return `${endpoint}/pdf${buildReportQuery(params)}`;
  }
  return `${endpoint}${buildReportQuery({ ...params, format: "csv" })}`;
}

export function buildVatReturnReviewExportPath(params: Record<string, string | undefined | null>): string {
  return `/reports/vat-return${buildReportQuery({ ...params, format: "csv" })}`;
}

export function reportExportFilename(slug: string, format: ReportExportFormat, date = todayDateInput()): string {
  return `${slug}-${date}.${format}`;
}

export function reportIndexGroups(): ReportIndexGroup[] {
  return REPORT_INDEX_GROUP_LABELS.map((label) => ({
    label,
    links: REPORT_INDEX_ROUTE_REFS.filter((ref) => ref.group === label).map(reportIndexLinkFromRef),
  })).filter((group) => group.links.length > 0);
}

export function agingBucketLabel(bucket: AgingBucket): string {
  switch (bucket) {
    case "CURRENT":
      return "Current / Not due";
    case "1_30":
      return "1-30";
    case "31_60":
      return "31-60";
    case "61_90":
      return "61-90";
    case "90_PLUS":
      return "90+";
  }
}

export function balanceSheetStatusLabel(report: Pick<BalanceSheetReport, "balanced" | "difference"> | null | undefined): string {
  if (!report) {
    return "Not loaded";
  }
  return report.balanced ? "Balanced" : `Out of balance by ${report.difference}`;
}

export function balanceSheetStatusClass(report: Pick<BalanceSheetReport, "balanced"> | null | undefined): string {
  if (!report) {
    return "bg-slate-100 text-slate-700";
  }
  return report.balanced ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rosewood";
}

function reportIndexLinkFromRef(ref: ReportIndexRouteRef): ReportIndexLink {
  const route = requireActiveReportIndexRoute(ref.key);
  return {
    routeKey: route.key,
    label: ref.label ?? route.label,
    href: route.href,
    description: ref.description ?? route.description,
  };
}

function requireActiveReportIndexRoute(key: AppRouteKey): AppRoute {
  const route = getAppRouteByKey(key);
  if (!route || route.capabilityStatus !== "active") {
    throw new Error(`Unknown active report index route: ${key}`);
  }
  return route;
}
