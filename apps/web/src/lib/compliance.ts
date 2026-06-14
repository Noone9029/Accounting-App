import { apiRequest } from "./api";
import type { ComplianceReadinessResponse } from "./types";

export function getComplianceReadiness(): Promise<ComplianceReadinessResponse> {
  return apiRequest<ComplianceReadinessResponse>("/compliance/readiness");
}

export function complianceStatusLabel(status: string): string {
  return status
    .split("_")
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(" ");
}
