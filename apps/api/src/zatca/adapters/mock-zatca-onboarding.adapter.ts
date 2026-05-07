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
import { createMockNotImplementedError } from "./zatca-adapter.error";
import type { ProductionCsidResult, ZatcaClearanceResponse, ZatcaComplianceCheckResponse, ZatcaReportingResponse } from "./zatca-adapter.types";

@Injectable()
export class MockZatcaOnboardingAdapter implements ZatcaOnboardingAdapter {
  async requestComplianceCsid(input: RequestComplianceCsidInput): Promise<ComplianceCsidResult> {
    const otp = typeof input.request.otp === "string" ? input.request.otp : "";
    const csrPem = typeof input.request.csrPem === "string" ? input.request.csrPem : "";

    if (!/^\d{6}$/.test(otp)) {
      throw new BadRequestException("OTP must be a 6-digit value for the local mock flow.");
    }

    const requestId = createHash("sha256").update(`${input.organizationId}:${input.egsUnitId}:${csrPem}`).digest("hex").slice(0, 24);
    return {
      certificateRequestId: `LOCAL-MOCK-${requestId}`,
      complianceCsidPem: [
        "-----BEGIN CERTIFICATE-----",
        Buffer.from(`LedgerByte local mock compliance CSID for ${input.egsUnitId}`, "utf8").toString("base64"),
        "-----END CERTIFICATE-----",
      ].join("\n"),
      responseCode: "LOCAL_MOCK",
      responsePayload: {
        message: "Local mock compliance CSID issued. No ZATCA network call was made.",
        certificateRequestId: `LOCAL-MOCK-${requestId}`,
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
