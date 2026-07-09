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
export type ReportPackManifestStatus =
  | "PLANNING_ONLY"
  | "DRAFT"
  | "GENERATING"
  | "READY_LOCAL"
  | "FAILED"
  | "DOWNLOAD_BLOCKED"
  | "EXPIRED";

export interface ReportPackExportReference {
  supported: boolean;
  href: string | null;
  filename?: string | null;
  reason?: string | null;
}

export interface ReportPackManifestItem {
  id: string;
  reportKind: ReportPackReportKind;
  title: string;
  query: Record<string, string | undefined>;
  source: {
    type: "ledgerbyte-report-route";
    href: `/reports/${ReportPackReportKind}`;
  };
  exports: {
    csv: ReportPackExportReference;
    pdf: ReportPackExportReference;
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
  generatedAt: string | null;
  requestedByUserId: string;
  requestId: string | null;
  status: ReportPackManifestStatus;
  executionBoundary: ReportPackExecutionBoundary;
  downloadReadiness?: {
    packDownloadEnabled: false;
    storageProvider: "disabled";
    signedUrlEnabled: false;
    reason: string;
  };
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
    label: "Pack artifact generation",
    explanation: "Local manifest records may be generated, but bundle artifacts and background generation remain disabled.",
  },
  {
    key: "downloadEnabled",
    label: "Download and export",
    explanation: "Pack-level downloads remain blocked. Per-report CSV links are shown where the report route supports CSV.",
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
  "/reports/cash-flow",
  "/reports/revenue-trend",
  "/reports/top-customers",
  "/reports/top-products-services",
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

export function reportPackStatusLabel(status: ReportPackManifestStatus): string {
  switch (status) {
    case "PLANNING_ONLY":
      return "Planning only";
    case "DRAFT":
      return "Draft";
    case "GENERATING":
      return "Generating";
    case "READY_LOCAL":
      return "Ready local";
    case "FAILED":
      return "Failed";
    case "DOWNLOAD_BLOCKED":
      return "Download blocked";
    case "EXPIRED":
      return "Expired";
  }
}

function normalizeReportPackManifestPreview(response: Partial<ReportPackManifestPreview> | null | undefined): ReportPackManifestPreview {
  return {
    id: typeof response?.id === "string" ? response.id : "report-pack-manifest-preview",
    organizationId: typeof response?.organizationId === "string" ? response.organizationId : "",
    title: typeof response?.title === "string" ? response.title : "Report pack manifest preview",
    createdAt: typeof response?.createdAt === "string" ? response.createdAt : "",
    generatedAt: typeof response?.generatedAt === "string" ? response.generatedAt : null,
    requestedByUserId: typeof response?.requestedByUserId === "string" ? response.requestedByUserId : "",
    requestId: typeof response?.requestId === "string" ? response.requestId : null,
    status: normalizeReportPackStatus(response?.status),
    executionBoundary: normalizeReportPackExecutionBoundary(response?.executionBoundary),
    downloadReadiness: response?.downloadReadiness,
    items: Array.isArray(response?.items) ? response.items.map(normalizeReportPackManifestItem) : [],
  };
}

function normalizeReportPackStatus(status: ReportPackManifestPreview["status"] | undefined): ReportPackManifestStatus {
  switch (status) {
    case "PLANNING_ONLY":
    case "DRAFT":
    case "GENERATING":
    case "READY_LOCAL":
    case "FAILED":
    case "DOWNLOAD_BLOCKED":
    case "EXPIRED":
      return status;
    default:
      return "PLANNING_ONLY";
  }
}

function normalizeReportPackManifestItem(item: ReportPackManifestItem): ReportPackManifestItem {
  return {
    ...item,
    exports: {
      csv: item.exports?.csv ?? { supported: false, href: null, filename: null, reason: "CSV export reference unavailable." },
      pdf: item.exports?.pdf ?? { supported: false, href: null, reason: "PDF export reference unavailable." },
    },
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
