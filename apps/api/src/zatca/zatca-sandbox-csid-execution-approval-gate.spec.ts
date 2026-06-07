import {
  assertZatcaSandboxCsidExecutionApprovalGateMetadataSafe,
  buildZatcaSandboxCsidExecutionApprovalGatePlan,
  ZATCA_SANDBOX_CSID_EXECUTION_APPROVAL_GATE_PHRASE,
} from "./zatca-sandbox-csid-execution-approval-gate";

describe("ZATCA sandbox CSID execution approval gate", () => {
  const safeInput = {
    environment: "SANDBOX" as const,
    organizationId: "11111111-1111-1111-1111-111111111111",
    egsUnitId: "22222222-2222-2222-2222-222222222222",
    approvalPhrase: ZATCA_SANDBOX_CSID_EXECUTION_APPROVAL_GATE_PHRASE,
    sandboxAccessConfirmed: false,
    otpCaptureApproved: false,
    custodyProviderApproved: false,
    requestBodyCreationApproved: false,
    responseBodyProcessingApproved: false,
    realNetworkEnabled: false,
  };

  it("requires the exact approval phrase before recognizing approval metadata", () => {
    const missing = buildZatcaSandboxCsidExecutionApprovalGatePlan({ ...safeInput, approvalPhrase: "" });
    const invalid = buildZatcaSandboxCsidExecutionApprovalGatePlan({ ...safeInput, approvalPhrase: "I approve sandbox execution" });

    expect(missing.approvalPhraseRecognized).toBe(false);
    expect(missing.primaryStatus).toBe("APPROVAL_REQUIRED");
    expect(missing.statuses).toContain("APPROVAL_REQUIRED");
    expect(invalid.approvalPhraseRecognized).toBe(false);
    expect(invalid.primaryStatus).toBe("APPROVAL_PHRASE_INVALID");
    expect(invalid.statuses).toContain("APPROVAL_PHRASE_INVALID");
  });

  it("recognizes the exact phrase as metadata only while keeping execution blocked", () => {
    const plan = buildZatcaSandboxCsidExecutionApprovalGatePlan(safeInput);
    const serialized = JSON.stringify(plan);

    expect(plan.approvalPhraseRecognized).toBe(true);
    expect(plan.approvalPhraseStored).toBe(false);
    expect(plan.primaryStatus).toBe("APPROVAL_RECOGNIZED_BUT_EXECUTION_BLOCKED");
    expect(plan.statuses).toEqual(
      expect.arrayContaining([
        "APPROVAL_RECOGNIZED_BUT_EXECUTION_BLOCKED",
        "BLOCKED_SANDBOX_ACCESS_NOT_CONFIRMED",
        "BLOCKED_OTP_CAPTURE_NOT_APPROVED",
        "BLOCKED_CUSTODY_PROVIDER_NOT_APPROVED",
        "BLOCKED_REQUEST_BODY_CREATION_NOT_APPROVED",
        "BLOCKED_RESPONSE_BODY_PROCESSING_NOT_APPROVED",
        "BLOCKED_REAL_NETWORK_DISABLED",
        "BLOCKED_PRODUCTION_COMPLIANCE_FALSE",
      ]),
    );
    expect(plan.executionAllowed).toBe(false);
    expect(plan.noNetwork).toBe(true);
    expect(plan.noOtpCaptured).toBe(true);
    expect(plan.noCsidRequested).toBe(true);
    expect(plan.noRequestBodyCreated).toBe(true);
    expect(plan.noResponseBodyProcessed).toBe(true);
    expect(plan.noSecretMaterialPersisted).toBe(true);
    expect(plan.signingEnabled).toBe(false);
    expect(plan.clearanceReportingEnabled).toBe(false);
    expect(plan.pdfA3Enabled).toBe(false);
    expect(plan.productionCompliance).toBe(false);
    expect(plan.nextRequiredApprovalBoundary).toBe("SANDBOX_ACCESS_AND_OTP_CAPTURE_APPROVAL");
    expect(serialized).not.toMatch(/123456|real-csid|BEGIN PRIVATE KEY|BEGIN CERTIFICATE|binary-token-body|secret-password|token-value/i);
  });

  it("rejects forbidden OTP, CSID, credential, request, response, and provider body fields", () => {
    const forbiddenPayloads = [
      { ...safeInput, otp: "123456" },
      { ...safeInput, otpValue: "123456" },
      { ...safeInput, csid: "real-csid" },
      { ...safeInput, complianceCsid: "real-compliance-csid" },
      { ...safeInput, productionCsid: "real-production-csid" },
      { ...safeInput, privateKeyPem: "-----BEGIN PRIVATE KEY-----body-----END PRIVATE KEY-----" },
      { ...safeInput, rawPrivateKey: "-----BEGIN PRIVATE KEY-----body-----END PRIVATE KEY-----" },
      { ...safeInput, csrPem: "-----BEGIN CERTIFICATE REQUEST-----body-----END CERTIFICATE REQUEST-----" },
      { ...safeInput, rawCsr: "csr-body" },
      { ...safeInput, csrBody: "csr-body" },
      { ...safeInput, certificateBody: "certificate-body" },
      { ...safeInput, rawCertificate: "raw-certificate-body" },
      { ...safeInput, binarySecurityToken: "binary-token-body" },
      { ...safeInput, binarySecurityTokenBody: "binary-token-body" },
      { ...safeInput, secret: "secret-body" },
      { ...safeInput, secretBody: "secret-body" },
      { ...safeInput, token: "token-body" },
      { ...safeInput, requestBody: { csr: "body" } },
      { ...safeInput, responseBody: { binarySecurityToken: "body" } },
      { ...safeInput, providerPayload: { raw: "body" } },
      { ...safeInput, signedXml: "<Invoice>body</Invoice>" },
      { ...safeInput, qrPayload: "qr-body" },
      { ...safeInput, password: "secret-password" },
      { ...safeInput, authHeader: "Bearer token-value" },
      { ...safeInput, authorization: "Bearer token-value" },
    ];

    for (const payload of forbiddenPayloads) {
      expect(() => assertZatcaSandboxCsidExecutionApprovalGateMetadataSafe(payload)).toThrow(
        "Sensitive ZATCA sandbox CSID execution approval material is not allowed",
      );
    }
  });

  it("blocks production environments even with the exact approval-gate phrase", () => {
    const plan = buildZatcaSandboxCsidExecutionApprovalGatePlan({
      ...safeInput,
      environment: "PRODUCTION",
    });

    expect(plan.approvalPhraseRecognized).toBe(true);
    expect(plan.executionAllowed).toBe(false);
    expect(plan.environment).toBe("BLOCKED_PRODUCTION");
    expect(plan.statuses).toContain("BLOCKED_PRODUCTION_COMPLIANCE_FALSE");
    expect(plan.blockers).toContain("production CSID execution is out of scope and production compliance remains false");
  });
});
