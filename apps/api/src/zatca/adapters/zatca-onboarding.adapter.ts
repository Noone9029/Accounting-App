import type {
  ClearanceInput,
  ComplianceCheckInput,
  ComplianceCsidResult,
  ProductionCsidResult,
  ReportingInput,
  RequestComplianceCsidInput,
  RequestProductionCsidInput,
  ZatcaAdapterResult,
  ZatcaClearanceResponse,
  ZatcaComplianceCheckResponse,
  ZatcaReportingResponse,
} from "./zatca-adapter.types";

export const ZATCA_ONBOARDING_ADAPTER = Symbol("ZATCA_ONBOARDING_ADAPTER");

export interface ZatcaOnboardingAdapter {
  requestComplianceCsid(input: RequestComplianceCsidInput): Promise<ComplianceCsidResult>;
  requestProductionCsid(input: RequestProductionCsidInput): Promise<ProductionCsidResult>;
  submitComplianceCheck(input: ComplianceCheckInput): Promise<ZatcaAdapterResult<ZatcaComplianceCheckResponse>>;
  submitClearance(input: ClearanceInput): Promise<ZatcaAdapterResult<ZatcaClearanceResponse>>;
  submitReporting(input: ReportingInput): Promise<ZatcaAdapterResult<ZatcaReportingResponse>>;
}

export type {
  ClearanceInput,
  ComplianceCheckInput,
  ComplianceCsidResult,
  ProductionCsidResult,
  ReportingInput,
  RequestComplianceCsidInput,
  RequestProductionCsidInput,
  ZatcaAdapterResult,
  ZatcaClearanceRequest,
  ZatcaClearanceResponse,
  ZatcaComplianceCheckRequest,
  ZatcaComplianceCheckResponse,
  ZatcaComplianceCsidRequest,
  ZatcaComplianceCsidResponse,
  ZatcaProductionCsidRequest,
  ZatcaProductionCsidResponse,
  ZatcaReportingRequest,
  ZatcaReportingResponse,
} from "./zatca-adapter.types";
