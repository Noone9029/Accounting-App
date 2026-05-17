import { ZatcaEnvironment } from "@prisma/client";
import {
  buildComplianceCsidHttpRequestContractSummary,
  buildComplianceCsidHttpRequestPlan,
  ComplianceCsidHttpMappingError,
  mapComplianceCsidHttpErrorResponse,
  mapComplianceCsidHttpResponse,
} from "./compliance-csid-http.mapper";

describe("compliance CSID HTTP mapper", () => {
  const csrPem = "-----BEGIN CERTIFICATE REQUEST-----\nSECRET-CSR-BODY\n-----END CERTIFICATE REQUEST-----";
  const otp = "123456";

  it("maps the official compliance CSID request contract without exposing OTP or CSR in the public plan", () => {
    const plan = buildComplianceCsidHttpRequestPlan({
      environment: ZatcaEnvironment.SANDBOX,
      csrPem,
      otp,
      egsUnitId: "egs-1",
      organizationId: "org-1",
      requestIdempotencyKey: "idem-1",
    });

    expect(plan.method).toBe("POST");
    expect(plan.endpointPath).toBe("/compliance");
    expect(plan.headers.OTP).toBe(otp);
    expect(plan.headers["Accept-Version"]).toBe("V2");
    expect(plan.headers["content-type"]).toBe("application/json");
    expect(plan.body).toEqual({ csr: csrPem });
    expect(plan.publicSummary.method).toBe("POST");
    expect(plan.publicSummary.endpointPath).toBe("/compliance");
    expect(plan.publicSummary.redactedHeaders).toEqual(expect.arrayContaining([expect.objectContaining({ name: "OTP", value: "[REDACTED_OTP]" })]));
    expect(plan.publicSummary.redactedBody).toEqual(expect.arrayContaining([expect.objectContaining({ name: "csr", value: "[REDACTED_CSR_BODY]" })]));
    const serializedPublicPlan = JSON.stringify(plan.publicSummary);
    expect(serializedPublicPlan).not.toContain(otp);
    expect(serializedPublicPlan).not.toContain("SECRET-CSR-BODY");
    expect(serializedPublicPlan).not.toContain("BEGIN CERTIFICATE REQUEST");
    expect(plan.publicSummary.localOnly).toBe(true);
    expect(plan.publicSummary.noNetwork).toBe(true);
    expect(plan.publicSummary.productionCompliance).toBe(false);
  });

  it("blocks production and missing request credentials in the request mapper", () => {
    expect(() =>
      buildComplianceCsidHttpRequestPlan({
        environment: ZatcaEnvironment.PRODUCTION,
        csrPem,
        otp,
        egsUnitId: "egs-1",
        organizationId: "org-1",
      }),
    ).toThrow(ComplianceCsidHttpMappingError);

    expect(() =>
      buildComplianceCsidHttpRequestPlan({
        environment: ZatcaEnvironment.SANDBOX,
        csrPem: "",
        otp,
        egsUnitId: "egs-1",
        organizationId: "org-1",
      }),
    ).toThrow("CSR");

    expect(() =>
      buildComplianceCsidHttpRequestPlan({
        environment: ZatcaEnvironment.SIMULATION,
        csrPem,
        otp: "12 456",
        egsUnitId: "egs-1",
        organizationId: "org-1",
      }),
    ).toThrow("OTP");
  });

  it("provides a redacted contract summary when OTP is intentionally absent from planning responses", () => {
    const summary = buildComplianceCsidHttpRequestContractSummary(ZatcaEnvironment.SIMULATION);

    expect(summary.method).toBe("POST");
    expect(summary.endpointPath).toBe("/compliance");
    expect(summary.redactedHeaders).toEqual(expect.arrayContaining([expect.objectContaining({ name: "OTP", value: "[REDACTED_OTP]" })]));
    expect(summary.redactedBody).toEqual(expect.arrayContaining([expect.objectContaining({ name: "csr", value: "[REDACTED_CSR_BODY]" })]));
    expect(JSON.stringify(summary)).not.toContain("123456");
    expect(summary.productionCompliance).toBe(false);
  });

  it("maps official-like compliance CSID responses to safe booleans and IDs only", () => {
    const mapped = mapComplianceCsidHttpResponse({
      requestID: 347,
      tokenType: "http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-x509-token-profile-1.0#X509v3",
      dispositionMessage: "ISSUED",
      binarySecurityToken: "SECRET_BINARY_SECURITY_TOKEN",
      secret: "SECRET_PASSWORD",
    });

    expect(mapped.requestId).toBe("347");
    expect(mapped.certificateRequestId).toBe("347");
    expect(mapped.hasBinarySecurityToken).toBe(true);
    expect(mapped.hasSecret).toBe(true);
    expect(mapped.hasCertificate).toBe(true);
    expect(mapped.publicSummary.tokenReturned).toBe(false);
    expect(mapped.publicSummary.secretReturned).toBe(false);
    expect(mapped.publicSummary.certificateBodyReturned).toBe(false);
    const serialized = JSON.stringify(mapped.publicSummary);
    expect(serialized).not.toContain("SECRET_BINARY_SECURITY_TOKEN");
    expect(serialized).not.toContain("SECRET_PASSWORD");
  });

  it("turns malformed and error responses into sanitized mapper errors", () => {
    expect(() => mapComplianceCsidHttpResponse({ requestID: 347, binarySecurityToken: "SECRET_BINARY_SECURITY_TOKEN" })).toThrow(
      ComplianceCsidHttpMappingError,
    );

    const errorSummary = mapComplianceCsidHttpErrorResponse({
      errors: [
        { code: "Invalid-OTP", message: "The provided OTP 123456 is invalid" },
        { code: "Invalid-CSR", message: "CSR -----BEGIN CERTIFICATE REQUEST-----SECRET-----END CERTIFICATE REQUEST----- is invalid" },
      ],
      secret: "SECRET_PASSWORD",
      binarySecurityToken: "SECRET_BINARY_SECURITY_TOKEN",
    });
    const serialized = JSON.stringify(errorSummary);
    expect(serialized).toContain("Invalid-OTP");
    expect(serialized).not.toContain("123456");
    expect(serialized).not.toContain("SECRET_PASSWORD");
    expect(serialized).not.toContain("SECRET_BINARY_SECURITY_TOKEN");
    expect(serialized).not.toContain("BEGIN CERTIFICATE REQUEST");
  });
});
