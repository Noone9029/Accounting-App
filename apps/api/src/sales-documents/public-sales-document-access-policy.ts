export type PublicSalesDocumentAccessType = "sales-invoice" | "sales-quote";
export type PublicSalesDocumentAccessPolicyStatus = "PLANNING_ONLY";

export interface PublicSalesDocumentAccessInput {
  documentType: PublicSalesDocumentAccessType;
  documentId: string;
  organizationId: string;
  customerId: string;
  documentNumber: string;
  status: string;
  requestedByUserId: string;
}

export interface PublicSalesDocumentAccessDocumentRef {
  documentType: PublicSalesDocumentAccessType;
  documentId: string;
  organizationId: string;
  customerId: string;
  documentNumber: string;
  status: string;
}

export interface PublicSalesDocumentAccessBoundary {
  tokenIssuanceEnabled: false;
  publicRouteEnabled: false;
  documentMutationEnabled: false;
  paymentCollectionEnabled: false;
  quoteAcceptanceEnabled: false;
  emailSendingEnabled: false;
  providerCallEnabled: false;
  complianceSubmissionEnabled: false;
}

export interface PublicSalesDocumentAccessPolicy {
  status: PublicSalesDocumentAccessPolicyStatus;
  eligible: boolean;
  document: PublicSalesDocumentAccessDocumentRef;
  requestedByUserId: string;
  boundary: PublicSalesDocumentAccessBoundary;
  blockers: string[];
}

export const PUBLIC_SALES_DOCUMENT_ACCESS_BOUNDARY: PublicSalesDocumentAccessBoundary = {
  tokenIssuanceEnabled: false,
  publicRouteEnabled: false,
  documentMutationEnabled: false,
  paymentCollectionEnabled: false,
  quoteAcceptanceEnabled: false,
  emailSendingEnabled: false,
  providerCallEnabled: false,
  complianceSubmissionEnabled: false,
};

const supportedDocumentTypes = new Set<PublicSalesDocumentAccessType>(["sales-invoice", "sales-quote"]);

export function buildPublicSalesDocumentAccessPolicy(input: PublicSalesDocumentAccessInput): PublicSalesDocumentAccessPolicy {
  if (!supportedDocumentTypes.has(input.documentType)) {
    throw new Error(`Unsupported public sales document access type: ${input.documentType}.`);
  }

  const documentId = requiredTrimmed(input.documentId, "documentId");
  const organizationId = requiredTrimmed(input.organizationId, "organizationId");
  const customerId = requiredTrimmed(input.customerId, "customerId");
  const requestedByUserId = requiredTrimmed(input.requestedByUserId, "requestedByUserId");
  const documentNumber = requiredTrimmed(input.documentNumber, "documentNumber");
  const status = requiredTrimmed(input.status, "status").toUpperCase();
  const blockers = accessBlockers(input.documentType, status);

  return {
    status: "PLANNING_ONLY",
    eligible: blockers.length === 0,
    document: {
      documentType: input.documentType,
      documentId,
      organizationId,
      customerId,
      documentNumber,
      status,
    },
    requestedByUserId,
    boundary: PUBLIC_SALES_DOCUMENT_ACCESS_BOUNDARY,
    blockers,
  };
}

function accessBlockers(documentType: PublicSalesDocumentAccessType, status: string): string[] {
  if (documentType === "sales-invoice" && status !== "FINALIZED") {
    return ["Sales invoice public access requires FINALIZED status."];
  }

  if (documentType === "sales-quote" && status !== "SENT" && status !== "ACCEPTED") {
    return ["Sales quote public access requires SENT or ACCEPTED status."];
  }

  return [];
}

function requiredTrimmed(value: string, field: string): string {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) {
    throw new Error(`Public sales document access policy requires ${field}.`);
  }
  return trimmed;
}
