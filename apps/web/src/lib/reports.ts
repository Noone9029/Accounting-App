import type { AgingBucket, BalanceSheetReport } from "./types";

export const REPORT_BUCKETS: AgingBucket[] = ["CURRENT", "1_30", "31_60", "61_90", "90_PLUS"];
export type ReportExportFormat = "csv" | "pdf";

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

export function reportExportFilename(slug: string, format: ReportExportFormat, date = todayDateInput()): string {
  return `${slug}-${date}.${format}`;
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
