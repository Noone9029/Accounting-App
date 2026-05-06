export type ZatcaEnvironment = "sandbox" | "simulation" | "production";

export interface ZatcaSubmissionDraft {
  organizationId: string;
  invoiceId: string;
  environment: ZatcaEnvironment;
  invoiceXml: string;
  invoiceHash: string;
  uuid: string;
}

export interface ZatcaSubmissionResult {
  status: "PENDING" | "CLEARED" | "REPORTED" | "REJECTED" | "FAILED";
  responsePayload?: unknown;
}
