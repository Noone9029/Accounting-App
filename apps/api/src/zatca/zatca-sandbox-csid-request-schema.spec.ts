import {
  buildZatcaSandboxCsidRequestSchemaPlan,
  assertZatcaSandboxCsidRequestSchemaMetadataSafe,
} from "./zatca-sandbox-csid-request-schema";

describe("ZATCA sandbox CSID request schema planning", () => {
  const safeInput = {
    environment: "SANDBOX" as const,
    organizationId: "11111111-1111-1111-1111-111111111111",
    egsUnitId: "22222222-2222-2222-2222-222222222222",
    csrReferenceAlias: "csr-config-review-2026-06-07",
    csrMetadataReference: "csr-metadata-reference",
    certificateRequestId: "future-certificate-request-id",
    otpRequired: true,
    custodyProviderType: "DISABLED" as const,
    custodyReferenceAlias: "future-custody-reference-alias",
    requestReadinessStatus: "METADATA_ONLY_READY" as const,
  };

  it("accepts metadata and reference aliases without constructing a request body", () => {
    const plan = buildZatcaSandboxCsidRequestSchemaPlan(safeInput);
    const serialized = JSON.stringify(plan);

    expect(plan.schemaStatus).toBe("METADATA_SCHEMA_VALID");
    expect(plan.ready).toBe(false);
    expect(plan.requestReadinessStatus).toBe("BLOCKED_PENDING_APPROVAL");
    expect(plan.safeRequestContractSummary.environment).toBe("SANDBOX");
    expect(plan.safeRequestContractSummary.allowedMetadataFields).toEqual(expect.arrayContaining(["csrReferenceAlias", "custodyReferenceAlias"]));
    expect(plan.noNetwork).toBe(true);
    expect(plan.noRequestBodyCreated).toBe(true);
    expect(plan.noResponseBodyProcessed).toBe(true);
    expect(plan.noOtpValueAccepted).toBe(true);
    expect(plan.noCsrBodyAccepted).toBe(true);
    expect(plan.productionCompliance).toBe(false);
    expect(plan.blockers).toEqual(expect.arrayContaining(["real sandbox OTP capture is not approved", "real sandbox CSID request execution is not approved"]));
    expect(serialized).not.toMatch(/BEGIN CERTIFICATE REQUEST|BEGIN PRIVATE KEY|binarySecurityToken":"|real-otp-value/i);
  });

  it("rejects forbidden secret and body fields before planning", () => {
    const forbiddenPayloads = [
      { ...safeInput, otp: "123456" },
      { ...safeInput, privateKeyPem: "-----BEGIN PRIVATE KEY-----body-----END PRIVATE KEY-----" },
      { ...safeInput, csrPem: "-----BEGIN CERTIFICATE REQUEST-----body-----END CERTIFICATE REQUEST-----" },
      { ...safeInput, rawCsr: "csr-body" },
      { ...safeInput, csrBody: "csr-body" },
      { ...safeInput, certificateBody: "certificate-body" },
      { ...safeInput, binarySecurityToken: "token-body" },
      { ...safeInput, secret: "secret-body" },
      { ...safeInput, token: "token-body" },
      { ...safeInput, requestBody: { csr: "body" } },
      { ...safeInput, responseBody: { binarySecurityToken: "body" } },
      { ...safeInput, providerPayload: { raw: "body" } },
      { ...safeInput, signedXml: "<Invoice>body</Invoice>" },
      { ...safeInput, qrPayload: "qr-body" },
    ];

    for (const payload of forbiddenPayloads) {
      expect(() => assertZatcaSandboxCsidRequestSchemaMetadataSafe(payload)).toThrow(
        "Sensitive ZATCA sandbox CSID request material is not allowed",
      );
    }
  });

  it("reports missing readiness metadata and keeps real execution blocked", () => {
    const plan = buildZatcaSandboxCsidRequestSchemaPlan({
      environment: "SANDBOX",
      organizationId: "",
      egsUnitId: "",
      otpRequired: false,
      custodyProviderType: "DISABLED",
    });

    expect(plan.ready).toBe(false);
    expect(plan.schemaStatus).toBe("METADATA_SCHEMA_INCOMPLETE");
    expect(plan.executionStatus).toBe("BLOCKED_NOT_IMPLEMENTED");
    expect(plan.blockers).toEqual(
      expect.arrayContaining([
        "organizationId metadata is required",
        "egsUnitId metadata is required",
        "CSR metadata reference or certificate request metadata is required",
        "OTP is required by the official sandbox compliance CSID flow, but OTP values are not accepted in this planner",
        "custody provider approval is required before real sandbox CSID response handling",
      ]),
    );
    expect(plan.realRequestExecutionImplemented).toBe(false);
    expect(plan.realResponseProcessingImplemented).toBe(false);
    expect(plan.signingEnabled).toBe(false);
    expect(plan.clearanceReportingEnabled).toBe(false);
    expect(plan.pdfA3Enabled).toBe(false);
  });

  it("blocks production environments even for schema planning", () => {
    const plan = buildZatcaSandboxCsidRequestSchemaPlan({
      ...safeInput,
      environment: "PRODUCTION",
      custodyProviderType: "LOCAL_REFERENCE",
    });

    expect(plan.ready).toBe(false);
    expect(plan.safeRequestContractSummary.environment).toBe("BLOCKED_PRODUCTION");
    expect(plan.blockers).toContain("production CSID request planning is out of scope for the sandbox schema lane");
    expect(plan.productionCompliance).toBe(false);
  });
});
