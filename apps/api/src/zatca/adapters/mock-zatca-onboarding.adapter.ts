import { BadRequestException, Injectable, NotImplementedException } from "@nestjs/common";
import { createHash } from "node:crypto";
import {
  type ComplianceCheckInput,
  type ComplianceCsidResult,
  type RequestComplianceCsidInput,
  type RequestProductionCsidInput,
  type ZatcaOnboardingAdapter,
} from "./zatca-onboarding.adapter";

@Injectable()
export class MockZatcaOnboardingAdapter implements ZatcaOnboardingAdapter {
  async requestComplianceCsid(input: RequestComplianceCsidInput): Promise<ComplianceCsidResult> {
    if (!/^\d{6}$/.test(input.otp)) {
      throw new BadRequestException("OTP must be a 6-digit value for the local mock flow.");
    }

    const requestId = createHash("sha256").update(`${input.organizationId}:${input.egsUnitId}:${input.csrPem}`).digest("hex").slice(0, 24);
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
      },
    };
  }

  async requestProductionCsid(_input: RequestProductionCsidInput): Promise<never> {
    throw new NotImplementedException("Production CSID request is not implemented. Complete compliance CSID flow and real adapter first.");
  }

  async runComplianceCheck(_input: ComplianceCheckInput): Promise<never> {
    throw new NotImplementedException("Compliance check adapter is not implemented. Real ZATCA API integration comes later.");
  }
}
