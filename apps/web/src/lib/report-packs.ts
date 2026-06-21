import { apiRequest } from "./api";

export type ReportPackReportKind =
  | "general-ledger"
  | "trial-balance"
  | "profit-and-loss"
  | "balance-sheet"
  | "vat-summary"
  | "aged-receivables"
  | "aged-payables"
  | "cash-flow"
  | "revenue-trend"
  | "top-customers"
  | "top-products-services";

export type ReportPackReviewStatus = "NEEDS_REVIEW" | "READY_FOR_REVIEW" | "BLOCKED";
export type ReportPackManifestStatus = "PLANNING_ONLY";

export interface ReportPackManifestItem {
  id: string;
  reportKind: ReportPackReportKind;
  title: string;
  query: Record<string, string | undefined>;
  source: {
    type: "ledgerbyte-report-route";
    href: `/reports/${ReportPackReportKind}`;
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

export interface ReportPackManifestPreview {
  id: string;
  organizationId: string;
  title: string;
  createdAt: string;
  requestedByUserId: string;
  status: ReportPackManifestStatus;
  executionBoundary: ReportPackExecutionBoundary;
  items: ReportPackManifestItem[];
}

export interface ReportPackDisabledBoundaryItem {
  key: keyof ReportPackExecutionBoundary;
  label: string;
  explanation: string;
}

export const REPORT_PACK_MANIFEST_PREVIEW_PATH = "/reports/report-pack/manifest-preview";

export const REPORT_PACK_DEFAULT_EXECUTION_BOUNDARY: ReportPackExecutionBoundary = {
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

export const REPORT_PACK_DISABLED_BOUNDARY_COPY: readonly ReportPackDisabledBoundaryItem[] = [
  {
    key: "generationEnabled",
    label: "Generation",
    explanation: "Report-pack generation is not implemented in this preview slice.",
  },
  {
    key: "downloadEnabled",
    label: "Download and export",
    explanation: "Pack-level downloads, CSV exports, and PDF bundle exports remain unavailable.",
  },
  {
    key: "emailSendingEnabled",
    label: "Email sending",
    explanation: "The preview does not send email or create email outbox records.",
  },
  {
    key: "scheduledRunEnabled",
    label: "Scheduling",
    explanation: "No background job, recurring schedule, or automatic run is configured.",
  },
  {
    key: "archiveWriteEnabled",
    label: "Archive writes",
    explanation: "The preview does not write archive records or generated-document records.",
  },
  {
    key: "generatedDocumentMutationEnabled",
    label: "Generated documents",
    explanation: "Generated-document mutation remains unchanged and outside this UI.",
  },
  {
    key: "storageMutationEnabled",
    label: "Object storage",
    explanation: "Object storage and signed URL behavior remain blocked until separately proven.",
  },
  {
    key: "providerCallEnabled",
    label: "Provider calls",
    explanation: "No third-party provider, storage provider, email provider, or compliance provider is called.",
  },
  {
    key: "complianceSubmissionEnabled",
    label: "Compliance submission",
    explanation: "No ZATCA, UAE, Peppol, ASP, tax authority, or compliance submission is available.",
  },
] as const;

const ACTIVE_WEB_REPORT_HREFS = new Set<string>([
  "/reports/general-ledger",
  "/reports/trial-balance",
  "/reports/profit-and-loss",
  "/reports/balance-sheet",
  "/reports/vat-summary",
  "/reports/aged-receivables",
  "/reports/aged-payables",
]);

export async function fetchReportPackManifestPreview(): Promise<ReportPackManifestPreview> {
  return normalizeReportPackManifestPreview(await apiRequest<Partial<ReportPackManifestPreview>>(REPORT_PACK_MANIFEST_PREVIEW_PATH));
}

export function disabledReportPackBoundaryItems(
  boundary: Partial<ReportPackExecutionBoundary> | null | undefined,
): ReportPackDisabledBoundaryItem[] {
  const normalizedBoundary = normalizeReportPackExecutionBoundary(boundary);
  return REPORT_PACK_DISABLED_BOUNDARY_COPY.filter((item) => normalizedBoundary[item.key] === false);
}

export function isReportPackSourceNavigable(item: Pick<ReportPackManifestItem, "source">): boolean {
  return ACTIVE_WEB_REPORT_HREFS.has(item.source.href);
}

export function reportPackReviewStatusLabel(status: ReportPackReviewStatus): string {
  switch (status) {
    case "READY_FOR_REVIEW":
      return "Ready for review";
    case "BLOCKED":
      return "Blocked";
    case "NEEDS_REVIEW":
      return "Needs review";
  }
}

function normalizeReportPackManifestPreview(response: Partial<ReportPackManifestPreview> | null | undefined): ReportPackManifestPreview {
  return {
    id: typeof response?.id === "string" ? response.id : "report-pack-manifest-preview",
    organizationId: typeof response?.organizationId === "string" ? response.organizationId : "",
    title: typeof response?.title === "string" ? response.title : "Report pack manifest preview",
    createdAt: typeof response?.createdAt === "string" ? response.createdAt : "",
    requestedByUserId: typeof response?.requestedByUserId === "string" ? response.requestedByUserId : "",
    status: response?.status === "PLANNING_ONLY" ? response.status : "PLANNING_ONLY",
    executionBoundary: normalizeReportPackExecutionBoundary(response?.executionBoundary),
    items: Array.isArray(response?.items) ? response.items : [],
  };
}

function normalizeReportPackExecutionBoundary(
  boundary: Partial<ReportPackExecutionBoundary> | null | undefined,
): ReportPackExecutionBoundary {
  return {
    ...REPORT_PACK_DEFAULT_EXECUTION_BOUNDARY,
    ...boundary,
  };
}
