import { ZatcaEnvironment } from "@prisma/client";

export const COMPLIANCE_CSID_ENDPOINT_PATH = "/compliance";
export const COMPLIANCE_CSID_METHOD = "POST";
export const COMPLIANCE_CSID_ACCEPT_VERSION = "V2";

export interface ComplianceCsidHttpRequestPlanInput {
  environment: ZatcaEnvironment;
  csrPem: string;
  otp: string;
  egsUnitId: string;
  organizationId: string;
  requestIdempotencyKey?: string;
}

export interface ComplianceCsidHttpRequestContractSummary {
  localOnly: true;
  noNetwork: true;
  productionCompliance: false;
  method: typeof COMPLIANCE_CSID_METHOD;
  endpointPath: typeof COMPLIANCE_CSID_ENDPOINT_PATH;
  environment: "SANDBOX" | "SIMULATION" | "BLOCKED_PRODUCTION";
  contentType: "application/json";
  acceptVersion: typeof COMPLIANCE_CSID_ACCEPT_VERSION;
  redactedHeaders: Array<{ name: string; required: boolean; value: string; source: string }>;
  redactedBody: Array<{ name: string; required: boolean; value: string; source: string }>;
  sensitiveFieldNames: string[];
  needsOfficialVerification: string[];
}

export interface ComplianceCsidHttpRequestPlan {
  localOnly: true;
  noNetwork: true;
  productionCompliance: false;
  method: typeof COMPLIANCE_CSID_METHOD;
  endpointPath: typeof COMPLIANCE_CSID_ENDPOINT_PATH;
  headers: Record<string, string>;
  body: { csr: string };
  redactedHeaders: ComplianceCsidHttpRequestContractSummary["redactedHeaders"];
  redactedBody: ComplianceCsidHttpRequestContractSummary["redactedBody"];
  sensitiveFieldNames: string[];
  publicSummary: ComplianceCsidHttpRequestContractSummary;
}

export interface ComplianceCsidHttpResponseSummary {
  localOnly: true;
  noNetwork: true;
  productionCompliance: false;
  requestId: string | null;
  certificateRequestId: string | null;
  hasBinarySecurityToken: boolean;
  hasSecret: boolean;
  hasCertificate: boolean;
  tokenReturned: false;
  secretReturned: false;
  certificateBodyReturned: false;
  otpReturned: false;
  csrReturned: false;
  sensitiveFieldNames: string[];
  warnings: string[];
}

export interface ComplianceCsidHttpResponsePlan {
  requestId: string | null;
  certificateRequestId: string | null;
  hasBinarySecurityToken: boolean;
  hasSecret: boolean;
  hasCertificate: boolean;
  publicSummary: ComplianceCsidHttpResponseSummary;
}

export interface ComplianceCsidHttpErrorSummary {
  localOnly: true;
  noNetwork: true;
  productionCompliance: false;
  errors: Array<{ code: string; message: string }>;
  sensitiveFieldNames: string[];
}

export class ComplianceCsidHttpMappingError extends Error {
  readonly code: string;
  readonly publicSummary: ComplianceCsidHttpErrorSummary;

  constructor(message: string, code: string, publicSummary?: ComplianceCsidHttpErrorSummary) {
    super(redactComplianceCsidSensitiveText(message));
    this.name = "ComplianceCsidHttpMappingError";
    this.code = code;
    this.publicSummary =
      publicSummary ??
      mapComplianceCsidHttpErrorResponse({
        errors: [{ code, message }],
      });
  }
}

const sensitiveFieldNames = [
  "OTP",
  "csr",
  "binarySecurityToken",
  "secret",
  "certificate",
  "rawCertificatePem",
  "complianceCsidPem",
  "privateKeyPem",
  "Authorization",
  "invoice",
  "qrPayload",
];

export function buildComplianceCsidHttpRequestContractSummary(environment: ZatcaEnvironment): ComplianceCsidHttpRequestContractSummary {
  return {
    localOnly: true,
    noNetwork: true,
    productionCompliance: false,
    method: COMPLIANCE_CSID_METHOD,
    endpointPath: COMPLIANCE_CSID_ENDPOINT_PATH,
    environment: environment === ZatcaEnvironment.PRODUCTION ? "BLOCKED_PRODUCTION" : environment,
    contentType: "application/json",
    acceptVersion: COMPLIANCE_CSID_ACCEPT_VERSION,
    redactedHeaders: [
      { name: "OTP", required: true, value: "[REDACTED_OTP]", source: "compliance_csid.pdf" },
      { name: "Accept-Version", required: true, value: COMPLIANCE_CSID_ACCEPT_VERSION, source: "compliance_csid.pdf" },
      { name: "accept-language", required: false, value: "en", source: "official API examples" },
      { name: "content-type", required: true, value: "application/json", source: "compliance_csid.pdf" },
    ],
    redactedBody: [{ name: "csr", required: true, value: "[REDACTED_CSR_BODY]", source: "compliance_csid.pdf" }],
    sensitiveFieldNames,
    needsOfficialVerification: [],
  };
}

export function buildComplianceCsidHttpRequestPlan(input: ComplianceCsidHttpRequestPlanInput): ComplianceCsidHttpRequestPlan {
  if (input.environment === ZatcaEnvironment.PRODUCTION) {
    throw new ComplianceCsidHttpMappingError("Production environment is not supported for sandbox compliance CSID mapping.", "PRODUCTION_BLOCKED");
  }

  const otp = input.otp.trim();
  const csrPem = input.csrPem.trim();
  if (!/^[0-9]{6}$/.test(otp)) {
    throw new ComplianceCsidHttpMappingError("OTP must be a 6-digit numeric header value for compliance CSID mapping.", "INVALID_OTP");
  }
  if (!csrPem) {
    throw new ComplianceCsidHttpMappingError("CSR body is required for compliance CSID mapping.", "MISSING_CSR");
  }

  const publicSummary = buildComplianceCsidHttpRequestContractSummary(input.environment);
  return {
    localOnly: true,
    noNetwork: true,
    productionCompliance: false,
    method: COMPLIANCE_CSID_METHOD,
    endpointPath: COMPLIANCE_CSID_ENDPOINT_PATH,
    headers: {
      OTP: otp,
      "Accept-Version": COMPLIANCE_CSID_ACCEPT_VERSION,
      "accept-language": "en",
      "content-type": "application/json",
    },
    body: { csr: csrPem },
    redactedHeaders: publicSummary.redactedHeaders,
    redactedBody: publicSummary.redactedBody,
    sensitiveFieldNames,
    publicSummary,
  };
}

export function mapComplianceCsidHttpResponse(raw: Record<string, unknown>): ComplianceCsidHttpResponsePlan {
  const requestId = readStringOrNumber(raw.requestID ?? raw.requestId);
  const certificateRequestId = readStringOrNumber(raw.certificateRequestId ?? raw.certificateRequestID ?? raw.requestID ?? raw.requestId);
  const hasBinarySecurityToken = hasText(raw.binarySecurityToken);
  const hasSecret = hasText(raw.secret);
  const hasCertificate =
    hasBinarySecurityToken || hasText(raw.certificate) || hasText(raw.rawCertificatePem) || hasText(raw.complianceCsidPem);

  const missing: string[] = [];
  if (!requestId) missing.push("requestID");
  if (!hasBinarySecurityToken) missing.push("binarySecurityToken");
  if (!hasSecret) missing.push("secret");
  if (missing.length > 0) {
    throw new ComplianceCsidHttpMappingError(
      `Compliance CSID response is missing required official field(s): ${missing.join(", ")}.`,
      "MALFORMED_COMPLIANCE_CSID_RESPONSE",
      mapComplianceCsidHttpErrorResponse({ errors: [{ code: "MALFORMED_COMPLIANCE_CSID_RESPONSE", message: `Missing fields: ${missing.join(", ")}` }] }),
    );
  }

  const publicSummary: ComplianceCsidHttpResponseSummary = {
    localOnly: true,
    noNetwork: true,
    productionCompliance: false,
    requestId,
    certificateRequestId,
    hasBinarySecurityToken,
    hasSecret,
    hasCertificate,
    tokenReturned: false,
    secretReturned: false,
    certificateBodyReturned: false,
    otpReturned: false,
    csrReturned: false,
    sensitiveFieldNames,
    warnings: [],
  };
  return { requestId, certificateRequestId, hasBinarySecurityToken, hasSecret, hasCertificate, publicSummary };
}

export function mapComplianceCsidHttpErrorResponse(raw: Record<string, unknown>): ComplianceCsidHttpErrorSummary {
  const errors = Array.isArray(raw.errors)
    ? raw.errors.map((error) => {
        const item = typeof error === "object" && error !== null ? (error as Record<string, unknown>) : {};
        return {
          code: readStringOrNumber(item.code) ?? "ZATCA_ERROR",
          message: redactComplianceCsidSensitiveText(readStringOrNumber(item.message) ?? "ZATCA error response was returned."),
        };
      })
    : [
        {
          code: readStringOrNumber(raw.code) ?? "ZATCA_ERROR",
          message: redactComplianceCsidSensitiveText(readStringOrNumber(raw.message) ?? "ZATCA error response was returned."),
        },
      ];

  return {
    localOnly: true,
    noNetwork: true,
    productionCompliance: false,
    errors,
    sensitiveFieldNames,
  };
}

function readStringOrNumber(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

function hasText(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

export function redactComplianceCsidSensitiveText(value: string): string {
  return value
    .replace(/-----BEGIN [^-]+-----[\s\S]*?-----END [^-]+-----/g, "[REDACTED_PEM]")
    .replace(/\b\d{6}\b/g, "[REDACTED_OTP]")
    .replace(/SECRET[-_A-Z0-9]*/gi, "[REDACTED_SECRET]")
    .replace(/BINARY[-_A-Z0-9]*/gi, "[REDACTED_TOKEN]")
    .replace(/TOKEN[-_A-Z0-9]*/gi, "[REDACTED_TOKEN]");
}
