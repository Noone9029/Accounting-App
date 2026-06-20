import type { CoreReportKind } from "./report-csv";

export type ReportPackReviewStatus = "NEEDS_REVIEW" | "READY_FOR_REVIEW" | "BLOCKED";
export type ReportPackManifestStatus = "PLANNING_ONLY";

export interface ReportPackSourceReport {
  kind: CoreReportKind;
  title: string;
  href: `/reports/${CoreReportKind}`;
}

export interface ReportPackItemInput {
  id: string;
  reportKind: CoreReportKind;
  query: Record<string, string | undefined>;
  title?: string;
  reviewStatus?: ReportPackReviewStatus;
}

export interface ReportPackManifestInput {
  id: string;
  organizationId: string;
  title: string;
  createdAt: string;
  requestedByUserId: string;
  items: ReportPackItemInput[];
}

export interface ReportPackManifestItem {
  id: string;
  reportKind: CoreReportKind;
  title: string;
  query: Record<string, string | undefined>;
  source: {
    type: "ledgerbyte-report-route";
    href: `/reports/${CoreReportKind}`;
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
  providerCallEnabled: false;
}

export interface ReportPackManifest {
  id: string;
  organizationId: string;
  title: string;
  createdAt: string;
  requestedByUserId: string;
  status: ReportPackManifestStatus;
  executionBoundary: ReportPackExecutionBoundary;
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
] as const;

export const REPORT_PACK_EXECUTION_BOUNDARY: ReportPackExecutionBoundary = {
  generationEnabled: false,
  downloadEnabled: false,
  emailSendingEnabled: false,
  scheduledRunEnabled: false,
  archiveWriteEnabled: false,
  generatedDocumentMutationEnabled: false,
  providerCallEnabled: false,
};

const supportedReportByKind = new Map<CoreReportKind, ReportPackSourceReport>(
  REPORT_PACK_SUPPORTED_REPORTS.map((report) => [report.kind, report]),
);

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

    return {
      id: item.id,
      reportKind: sourceReport.kind,
      title: item.title ?? sourceReport.title,
      query: item.query,
      source: { type: "ledgerbyte-report-route", href: sourceReport.href },
      reviewStatus: item.reviewStatus ?? "NEEDS_REVIEW",
    };
  });

  return {
    id: input.id,
    organizationId: input.organizationId,
    title: input.title,
    createdAt: input.createdAt,
    requestedByUserId: input.requestedByUserId,
    status: "PLANNING_ONLY",
    executionBoundary: REPORT_PACK_EXECUTION_BOUNDARY,
    items,
  };
}
