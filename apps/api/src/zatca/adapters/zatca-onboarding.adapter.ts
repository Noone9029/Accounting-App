import type { ZatcaEnvironment } from "@prisma/client";

export const ZATCA_ONBOARDING_ADAPTER = Symbol("ZATCA_ONBOARDING_ADAPTER");

export interface RequestComplianceCsidInput {
  organizationId: string;
  egsUnitId: string;
  environment: ZatcaEnvironment;
  otp: string;
  csrPem: string;
}

export interface RequestProductionCsidInput {
  organizationId: string;
  egsUnitId: string;
  complianceCsidPem: string;
}

export interface ComplianceCheckInput {
  organizationId: string;
  egsUnitId: string;
  invoiceXml: string;
}

export interface ComplianceCsidResult {
  complianceCsidPem: string;
  certificateRequestId: string;
  responseCode: string;
  responsePayload: Record<string, unknown>;
}

export interface ZatcaOnboardingAdapter {
  requestComplianceCsid(input: RequestComplianceCsidInput): Promise<ComplianceCsidResult>;
  requestProductionCsid(input: RequestProductionCsidInput): Promise<never>;
  runComplianceCheck(input: ComplianceCheckInput): Promise<never>;
}
