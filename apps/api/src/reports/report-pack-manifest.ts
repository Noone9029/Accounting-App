import type { CoreReportKind } from "./report-csv";

export type ReportPackReportKind = CoreReportKind | "cash-flow" | "revenue-trend" | "top-customers" | "top-products-services";
export type ReportPackReviewStatus = "NEEDS_REVIEW" | "READY_FOR_REVIEW" | "BLOCKED";
export type ReportPackManifestStatus =
  | "PLANNING_ONLY"
  | "DRAFT"
  | "GENERATING"
  | "READY_LOCAL"
  | "FAILED"
  | "DOWNLOAD_BLOCKED"
  | "EXPIRED";

export interface ReportPackSourceReport {
  kind: ReportPackReportKind;
  title: string;
  href: `/reports/${ReportPackReportKind}`;
}

export interface ReportPackItemInput {
  id: string;
  reportKind: ReportPackReportKind;
  query: Record<string, string | undefined>;
  title?: string;
  reviewStatus?: ReportPackReviewStatus;
}

export interface ReportPackManifestInput {
  id: string;
  organizationId: string;
  title: string;
  createdAt: string;
  generatedAt?: string | null;
  requestedByUserId: string;
  requestedBy?: {
    id: string;
    name?: string | null;
  };
  organization?: {
    id: string;
    name?: string | null;
    baseCurrency?: string | null;
  };
  period?: {
    from?: string | null;
    to?: string | null;
    asOf?: string | null;
  };
  requestId?: string | null;
  status?: ReportPackManifestStatus;
  items: ReportPackItemInput[];
}

export interface ReportPackManifestItem {
  id: string;
  reportKind: ReportPackReportKind;
  title: string;
  query: Record<string, string | undefined>;
  scope: {
    baseCurrency: string | null;
    transactionCurrency: string | null;
    costCenterId: string | null;
    projectId: string | null;
  };
  source: {
    type: "ledgerbyte-report-route";
    href: `/reports/${ReportPackReportKind}`;
  };
  exports: {
    csv: {
      supported: boolean;
      href: string | null;
      filename: string | null;
    };
    pdf: {
      supported: boolean;
      href: string | null;
      reason: string | null;
    };
  };
  reviewStatus: ReportPackReviewStatus;
}

export interface ReportPackExecutionBoundary {
  generationEnabled: false;
  downloadEnabled: false;
  emailSendingEnabled: false;
  scheduledRunEnabled: false;
  archiveWriteEnabled: false;
  generatedDocumentMutationEnabled: false;
  storageMutationEnabled: false;
  providerCallEnabled: false;
  complianceSubmissionEnabled: false;
}

export interface ReportPackManifest {
  id: string;
  organizationId: string;
  title: string;
  createdAt: string;
  generatedAt: string | null;
  requestedByUserId: string;
  requestedBy: {
    id: string;
    name: string | null;
  } | null;
  organization: {
    id: string;
    name: string | null;
    baseCurrency: string | null;
  } | null;
  accountingContext: { baseCurrency: string | null; amountBasis: "BASE_CURRENCY" };
  period: {
    from: string | null;
    to: string | null;
    asOf: string | null;
  };
  requestId: string | null;
  status: ReportPackManifestStatus;
  executionBoundary: ReportPackExecutionBoundary;
  downloadReadiness: {
    packDownloadEnabled: false;
    storageProvider: "disabled";
    signedUrlEnabled: false;
    reason: string;
  };
  items: ReportPackManifestItem[];
}

export const REPORT_PACK_SUPPORTED_REPORTS: readonly ReportPackSourceReport[] = [
  { kind: "general-ledger", title: "General Ledger", href: "/reports/general-ledger" },
  { kind: "trial-balance", title: "Trial Balance", href: "/reports/trial-balance" },
  { kind: "profit-and-loss", title: "Profit & Loss", href: "/reports/profit-and-loss" },
  { kind: "balance-sheet", title: "Balance Sheet", href: "/reports/balance-sheet" },
  { kind: "vat-summary", title: "VAT Summary", href: "/reports/vat-summary" },
  { kind: "aged-receivables", title: "Aged Receivables", href: "/reports/aged-receivables" },
  { kind: "aged-payables", title: "Aged Payables", href: "/reports/aged-payables" },
  { kind: "cash-flow", title: "Cash Flow", href: "/reports/cash-flow" },
  { kind: "revenue-trend", title: "Revenue Trend", href: "/reports/revenue-trend" },
  { kind: "top-customers", title: "Top Customers", href: "/reports/top-customers" },
  { kind: "top-products-services", title: "Top Products & Services", href: "/reports/top-products-services" },
] as const;

export const REPORT_PACK_EXECUTION_BOUNDARY: ReportPackExecutionBoundary = {
  generationEnabled: false,
  downloadEnabled: false,
  emailSendingEnabled: false,
  scheduledRunEnabled: false,
  archiveWriteEnabled: false,
  generatedDocumentMutationEnabled: false,
  storageMutationEnabled: false,
  providerCallEnabled: false,
  complianceSubmissionEnabled: false,
};

const supportedReportByKind = new Map<ReportPackReportKind, ReportPackSourceReport>(
  REPORT_PACK_SUPPORTED_REPORTS.map((report) => [report.kind, report]),
);

const REPORT_PACK_PDF_SUPPORTED_KINDS = new Set<ReportPackReportKind>([
  "general-ledger",
  "trial-balance",
  "profit-and-loss",
  "balance-sheet",
  "vat-summary",
  "aged-receivables",
  "aged-payables",
]);

export function buildReportPackManifest(input: ReportPackManifestInput): ReportPackManifest {
  if (input.items.length === 0) {
    throw new Error("Report pack manifest requires at least one report item.");
  }

  const seenItemIds = new Set<string>();
  const items = input.items.map((item): ReportPackManifestItem => {
    if (seenItemIds.has(item.id)) {
      throw new Error("Report pack item IDs must be unique.");
    }
    seenItemIds.add(item.id);

    const sourceReport = supportedReportByKind.get(item.reportKind);
    if (!sourceReport) {
      throw new Error(`Unsupported report pack item kind: ${item.reportKind}.`);
    }

    const query = canonicalReportPackQuery(sourceReport.kind, item.query);
    return {
      id: item.id,
      reportKind: sourceReport.kind,
      title: item.title ?? sourceReport.title,
      query,
      scope: {
        baseCurrency: input.organization?.baseCurrency?.trim().toUpperCase() ?? null,
        transactionCurrency: query.transactionCurrency ?? null,
        costCenterId: query.costCenterId ?? null,
        projectId: query.projectId ?? null,
      },
      source: { type: "ledgerbyte-report-route", href: sourceReport.href },
      exports: reportPackExports(sourceReport.kind, query),
      reviewStatus: item.reviewStatus ?? "NEEDS_REVIEW",
    };
  });

  return {
    id: input.id,
    organizationId: input.organizationId,
    title: input.title,
    createdAt: input.createdAt,
    generatedAt: input.generatedAt ?? null,
    requestedByUserId: input.requestedByUserId,
    requestedBy: input.requestedBy
      ? {
          id: input.requestedBy.id,
          name: input.requestedBy.name ?? null,
        }
      : null,
    organization: input.organization
      ? {
          id: input.organization.id,
          name: input.organization.name ?? null,
          baseCurrency: input.organization.baseCurrency?.trim().toUpperCase() ?? null,
        }
      : null,
    accountingContext: {
      baseCurrency: input.organization?.baseCurrency?.trim().toUpperCase() ?? null,
      amountBasis: "BASE_CURRENCY",
    },
    period: {
      from: input.period?.from ?? null,
      to: input.period?.to ?? null,
      asOf: input.period?.asOf ?? null,
    },
    requestId: input.requestId ?? null,
    status: input.status ?? "PLANNING_ONLY",
    executionBoundary: REPORT_PACK_EXECUTION_BOUNDARY,
    downloadReadiness: {
      packDownloadEnabled: false,
      storageProvider: "disabled",
      signedUrlEnabled: false,
      reason: "Pack-level download is blocked until local storage/archive and signed URL proof are approved.",
    },
    items,
  };
}

function reportPackExports(reportKind: ReportPackReportKind, query: Record<string, string | undefined>) {
  const csvHref = reportHrefWithQuery(reportKind, { ...query, format: "csv" });
  return {
    csv: {
      supported: true,
      href: csvHref,
      filename: `${reportKind}.csv`,
    },
    pdf: REPORT_PACK_PDF_SUPPORTED_KINDS.has(reportKind)
      ? {
          supported: true,
          href: reportPdfHrefWithQuery(reportKind, query),
          reason: null,
        }
      : {
          supported: false,
          href: null,
          reason: "PDF export is not implemented for this report.",
        },
  };
}

function reportHrefWithQuery(reportKind: ReportPackReportKind, query: Record<string, string | undefined>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    const normalizedValue = value?.trim();
    if (normalizedValue) {
      params.set(key, normalizedValue);
    }
  }
  const suffix = params.toString();
  return suffix ? `/reports/${reportKind}?${suffix}` : `/reports/${reportKind}`;
}

function reportPdfHrefWithQuery(reportKind: ReportPackReportKind, query: Record<string, string | undefined>): string {
  const href = reportHrefWithQuery(reportKind, query);
  return href.replace(`/reports/${reportKind}`, `/reports/${reportKind}/pdf`);
}

const REPORT_QUERY_KEYS = ["from", "to", "asOf", "accountId", "branchId", "costCenterId", "projectId", "includeZero", "transactionCurrency", "limit"] as const;
type ReportQueryKey = (typeof REPORT_QUERY_KEYS)[number];
const REPORT_FILTER_CAPABILITIES: Record<ReportPackReportKind, ReadonlySet<ReportQueryKey>> = {
  "general-ledger": new Set(["from", "to", "accountId", "branchId", "costCenterId", "projectId", "includeZero", "transactionCurrency"]),
  "trial-balance": new Set(["from", "to", "branchId", "costCenterId", "projectId", "includeZero"]),
  "profit-and-loss": new Set(["from", "to", "branchId", "costCenterId", "projectId"]),
  "balance-sheet": new Set(["asOf", "branchId", "costCenterId", "projectId"]),
  "vat-summary": new Set(["from", "to", "branchId", "costCenterId", "projectId"]),
  "aged-receivables": new Set(["asOf", "branchId", "transactionCurrency"]),
  "aged-payables": new Set(["asOf", "branchId", "transactionCurrency"]),
  "cash-flow": new Set(["from", "to", "branchId", "costCenterId", "projectId"]),
  "revenue-trend": new Set(["from", "to", "branchId"]),
  "top-customers": new Set(["from", "to", "branchId", "limit"]),
  "top-products-services": new Set(["from", "to", "branchId", "limit"]),
};

function canonicalReportPackQuery(reportKind: ReportPackReportKind, input: Record<string, string | undefined>): Record<string, string | undefined> {
  const query: Record<string, string | undefined> = {};
  const allowed = REPORT_FILTER_CAPABILITIES[reportKind];
  for (const [key, rawValue] of Object.entries(input)) {
    if (!rawValue?.trim()) continue;
    if (!allowed.has(key as ReportQueryKey)) {
      if (key === "transactionCurrency") throw new Error(`Transaction-currency filtering is not supported for ${reportKind} report-pack items.`);
      throw new Error(`Filter ${key} is not supported for ${reportKind} report-pack items.`);
    }
  }
  for (const key of REPORT_QUERY_KEYS) {
    const value = input[key]?.trim();
    if (!value) continue;
    query[key] = key === "transactionCurrency" ? value.toUpperCase() : value;
  }
  if (query.transactionCurrency && !/^[A-Z]{3}$/.test(query.transactionCurrency)) {
    throw new Error("Report-pack transactionCurrency must be a three-letter ISO currency code.");
  }
  return query;
}
