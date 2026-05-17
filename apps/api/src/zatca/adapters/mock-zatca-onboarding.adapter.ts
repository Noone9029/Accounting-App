import { BadRequestException, Injectable } from "@nestjs/common";
import { createHash } from "node:crypto";
import {
  type ClearanceInput,
  type ComplianceCheckInput,
  type ComplianceCsidResult,
  type RequestComplianceCsidInput,
  type RequestProductionCsidInput,
  type ReportingInput,
  type ZatcaAdapterResult,
  type ZatcaOnboardingAdapter,
} from "./zatca-onboarding.adapter";
import { buildComplianceCsidHttpRequestPlan, mapComplianceCsidHttpResponse } from "./compliance-csid-http.mapper";
import { createMockNotImplementedError } from "./zatca-adapter.error";
import type { ProductionCsidResult, ZatcaClearanceResponse, ZatcaComplianceCheckResponse, ZatcaReportingResponse } from "./zatca-adapter.types";

@Injectable()
export class MockZatcaOnboardingAdapter implements ZatcaOnboardingAdapter {
  async requestComplianceCsid(input: RequestComplianceCsidInput): Promise<ComplianceCsidResult> {
    const otp = typeof input.request.otp === "string" ? input.request.otp.trim() : "";
    const csrPem = typeof input.request.csrPem === "string" ? input.request.csrPem.trim() : "";
    const scenario = input.request.mockScenario ?? "success";

    if (input.environment === "PRODUCTION") {
      throw new BadRequestException("Mock compliance CSID adapter is restricted to sandbox/simulation EGS units.");
    }

    if (!csrPem) {
      throw new BadRequestException("CSR PEM is required for the local mock compliance CSID flow.");
    }

    if (!/^\d{6}$/.test(otp)) {
      throw new BadRequestException("OTP must be a 6-digit value for the local mock flow.");
    }
    if (scenario === "adapter-disabled") {
      throw new BadRequestException("Mock compliance CSID adapter disabled by requested scenario.");
    }
    if (scenario === "invalid-otp") {
      throw new BadRequestException("Mock compliance CSID adapter rejected the OTP.");
    }
    if (scenario === "expired-otp") {
      throw new BadRequestException("Mock compliance CSID adapter simulated an expired OTP.");
    }
    if (scenario === "duplicate-request") {
      throw new BadRequestException("Mock compliance CSID adapter simulated a duplicate request.");
    }
    if (scenario === "malformed-response") {
      throw new BadRequestException("Mock compliance CSID adapter simulated a malformed response.");
    }

    buildComplianceCsidHttpRequestPlan({
      environment: input.environment,
      csrPem,
      otp,
      egsUnitId: input.egsUnitId,
      organizationId: input.organizationId,
      requestIdempotencyKey: input.request.requestIdempotencyKey,
    });

    const suffix = createHash("sha256").update(`${input.organizationId}:${input.egsUnitId}:${csrPem}`).digest("hex").slice(0, 24);
    const requestId = `LOCAL-MOCK-REQUEST-${suffix}`;
    const certificateRequestId = `LOCAL-MOCK-${suffix}`;
    const rawCertificatePem = [
      "-----BEGIN CERTIFICATE-----",
      Buffer.from(`LedgerByte local mock compliance CSID for ${input.egsUnitId}`, "utf8").toString("base64"),
      "-----END CERTIFICATE-----",
    ].join("\n");
    const binarySecurityToken = `LOCAL-MOCK-BINARY-SECURITY-TOKEN-${suffix}`;
    const secret = `LOCAL-MOCK-SECRET-${suffix}`;
    const responseContract = mapComplianceCsidHttpResponse({
      requestID: requestId,
      certificateRequestId,
      binarySecurityToken,
      secret,
      certificate: rawCertificatePem,
    }).publicSummary;
    return {
      requestUrl: `mock://zatca/${input.environment.toLowerCase()}/compliance`,
      requestId,
      certificateRequestId,
      complianceCsidPem: rawCertificatePem,
      binarySecurityToken,
      secret,
      rawCertificatePem,
      warnings: ["Local mock adapter only. No real ZATCA request, token, secret, certificate, or CSID was issued."],
      responseCode: "LOCAL_MOCK",
      responsePayload: {
        message: "Local mock compliance CSID contract exercised. No ZATCA network call was made.",
        requestId,
        certificateRequestId,
        hasBinarySecurityToken: responseContract.hasBinarySecurityToken,
        hasSecret: responseContract.hasSecret,
        hasCertificate: responseContract.hasCertificate,
        tokenReturned: responseContract.tokenReturned,
        secretReturned: responseContract.secretReturned,
        certificateBodyReturned: responseContract.certificateBodyReturned,
        otpReturned: responseContract.otpReturned,
        csrReturned: responseContract.csrReturned,
        environment: input.environment,
        isSandboxMock: true,
      },
    };
  }

  async requestProductionCsid(_input: RequestProductionCsidInput): Promise<ProductionCsidResult> {
    throw createMockNotImplementedError("Production CSID request");
  }

  async submitComplianceCheck(input: ComplianceCheckInput): Promise<ZatcaAdapterResult<ZatcaComplianceCheckResponse>> {
    return {
      requestUrl: "local-mock-compliance-check",
      responseCode: "LOCAL_MOCK_COMPLIANCE_CHECK",
      responsePayload: {
        message: "Local mock compliance check passed. No ZATCA network call was made.",
        invoiceId: input.invoiceId,
        invoiceMetadataId: input.invoiceMetadataId,
        invoiceHash: input.request.invoiceHash ?? null,
        validationStatus: "LOCAL_MOCK_SUCCESS",
        isSandboxMock: true,
      },
    };
  }

  async submitClearance(_input: ClearanceInput): Promise<ZatcaAdapterResult<ZatcaClearanceResponse>> {
    throw createMockNotImplementedError("Clearance submission");
  }

  async submitReporting(_input: ReportingInput): Promise<ZatcaAdapterResult<ZatcaReportingResponse>> {
    throw createMockNotImplementedError("Reporting submission");
  }
}
