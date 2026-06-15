import { apiRequest } from "./api";
import type { ComplianceDocumentSummary, ComplianceReadinessResponse, ComplianceSourceReadinessResponse, Organization } from "./types";

export function getComplianceReadiness(): Promise<ComplianceReadinessResponse> {
  return apiRequest<ComplianceReadinessResponse>("/compliance/readiness");
}

export function getOrganization(organizationId: string): Promise<Organization> {
  return apiRequest<Organization>(`/organizations/${encodeURIComponent(organizationId)}`);
}

export function updateOrganization(organizationId: string, body: Partial<Organization>): Promise<Organization> {
  return apiRequest<Organization>(`/organizations/${encodeURIComponent(organizationId)}`, { method: "PATCH", body });
}

export function getSalesInvoiceComplianceReadiness(invoiceId: string): Promise<ComplianceSourceReadinessResponse> {
  return apiRequest<ComplianceSourceReadinessResponse>(`/compliance/sales-invoices/${encodeURIComponent(invoiceId)}/readiness`);
}

export function getCreditNoteComplianceReadiness(creditNoteId: string): Promise<ComplianceSourceReadinessResponse> {
  return apiRequest<ComplianceSourceReadinessResponse>(`/compliance/credit-notes/${encodeURIComponent(creditNoteId)}/readiness`);
}

export function prepareSalesInvoiceCompliance(invoiceId: string): Promise<ComplianceDocumentSummary> {
  return apiRequest<ComplianceDocumentSummary>(`/compliance/sales-invoices/${encodeURIComponent(invoiceId)}/prepare`, { method: "POST" });
}

export function prepareCreditNoteCompliance(creditNoteId: string): Promise<ComplianceDocumentSummary> {
  return apiRequest<ComplianceDocumentSummary>(`/compliance/credit-notes/${encodeURIComponent(creditNoteId)}/prepare`, { method: "POST" });
}

export function validateComplianceDocument(documentId: string): Promise<{ document: ComplianceDocumentSummary; validation: ComplianceSourceReadinessResponse["readiness"]["validation"]; archiveCreated: boolean }> {
  return apiRequest(`/compliance/documents/${encodeURIComponent(documentId)}/validate`, { method: "POST" });
}

export function complianceStatusLabel(status: string): string {
  return status
    .split("_")
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(" ");
}
