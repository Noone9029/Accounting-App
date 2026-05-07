import type { ZatcaEnvironment } from "@prisma/client";

export interface FlexibleZatcaPayload {
  [key: string]: unknown;
}

export interface ZatcaComplianceCsidRequest extends FlexibleZatcaPayload {
  csrPem?: string;
  otp?: string;
  endpointPath?: string;
  // TODO: Verify the official FATOORA sandbox compliance CSID request fields before real use.
}

export interface ZatcaComplianceCsidResponse extends FlexibleZatcaPayload {
  complianceCsidPem?: string;
  certificateRequestId?: string;
  // TODO: Verify official response token/certificate field names before mapping these values.
}

export interface ZatcaProductionCsidRequest extends FlexibleZatcaPayload {
  complianceCsidPem?: string;
  certificateRequestId?: string;
  endpointPath?: string;
  // TODO: Verify the official production CSID request fields before implementation.
}

export interface ZatcaProductionCsidResponse extends FlexibleZatcaPayload {
  productionCsidPem?: string;
  certificateRequestId?: string;
  // TODO: Verify official production CSID response fields before implementation.
}

export interface ZatcaComplianceCheckRequest extends FlexibleZatcaPayload {
  invoiceUuid?: string;
  invoiceHash?: string | null;
  xmlHash?: string | null;
  invoiceXmlBase64?: string;
  endpointPath?: string;
  // TODO: Verify required signed XML, hash, and clearance/reporting sample fields with official docs.
}

export interface ZatcaComplianceCheckResponse extends FlexibleZatcaPayload {
  validationStatus?: string;
  validationResults?: unknown;
  // TODO: Verify official validation result field names and severity mapping.
}

export interface ZatcaClearanceRequest extends FlexibleZatcaPayload {
  invoiceUuid?: string;
  invoiceHash?: string | null;
  xmlHash?: string | null;
  invoiceXmlBase64?: string;
  endpointPath?: string;
  // TODO: Verify official clearance payload fields and signing requirements.
}

export interface ZatcaClearanceResponse extends FlexibleZatcaPayload {
  clearanceStatus?: string;
  clearedInvoiceXmlBase64?: string;
  // TODO: Verify official clearance response fields before mapping them.
}

export interface ZatcaReportingRequest extends FlexibleZatcaPayload {
  invoiceUuid?: string;
  invoiceHash?: string | null;
  xmlHash?: string | null;
  invoiceXmlBase64?: string;
  endpointPath?: string;
  // TODO: Verify official reporting payload fields and simplified invoice rules.
}

export interface ZatcaReportingResponse extends FlexibleZatcaPayload {
  reportingStatus?: string;
  // TODO: Verify official reporting response fields before mapping them.
}

export interface RequestComplianceCsidInput {
  organizationId: string;
  egsUnitId: string;
  environment: ZatcaEnvironment;
  request: ZatcaComplianceCsidRequest;
}

export interface RequestProductionCsidInput {
  organizationId: string;
  egsUnitId: string;
  complianceCsidPem: string;
  request: ZatcaProductionCsidRequest;
}

export interface ComplianceCheckInput {
  organizationId: string;
  invoiceId: string;
  invoiceMetadataId: string;
  egsUnitId: string | null;
  invoiceXml: string;
  request: ZatcaComplianceCheckRequest;
}

export interface ClearanceInput {
  organizationId: string;
  invoiceId: string;
  invoiceMetadataId: string;
  egsUnitId: string | null;
  invoiceXml: string;
  request: ZatcaClearanceRequest;
}

export interface ReportingInput {
  organizationId: string;
  invoiceId: string;
  invoiceMetadataId: string;
  egsUnitId: string | null;
  invoiceXml: string;
  request: ZatcaReportingRequest;
}

export interface ZatcaAdapterResult<TResponse extends FlexibleZatcaPayload = FlexibleZatcaPayload> {
  requestUrl?: string;
  responseCode: string;
  responsePayload: TResponse;
  httpStatus?: number;
}

export interface ComplianceCsidResult extends ZatcaAdapterResult<ZatcaComplianceCsidResponse> {
  complianceCsidPem: string;
  certificateRequestId: string;
}

export interface ProductionCsidResult extends ZatcaAdapterResult<ZatcaProductionCsidResponse> {
  productionCsidPem?: string;
  certificateRequestId?: string;
}
