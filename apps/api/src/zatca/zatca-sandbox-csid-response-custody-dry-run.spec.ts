import {
  assertZatcaSandboxCsidResponseCustodyMetadataSafe,
  buildZatcaSandboxCsidResponseCustodyDryRunPlan,
} from "./zatca-sandbox-csid-response-custody-dry-run";

describe("ZATCA sandbox CSID response custody dry-run planning", () => {
  const safeInput = {
    environment: "SANDBOX" as const,
    organizationId: "11111111-1111-1111-1111-111111111111",
    egsUnitId: "22222222-2222-2222-2222-222222222222",
    requestReferenceAlias: "sandbox-csid-request-plan-2026-06-08",
    custodyProviderType: "LOCAL_REFERENCE" as const,
    custodyReferenceAlias: "sandbox-csid-response-reference-alias",
    certificateRequestId: "future-certificate-request-id",
    hasBinarySecurityToken: true,
    hasSecret: true,
    hasCertificate: true,
    certificateFingerprint: "sha256:9f2d4c8e6a0b",
    certificateSerialNumber: "SERIAL-123",
    certificateIssuer: "ZATCA sandbox issuer metadata",
    certificateSubject: "LedgerByte sandbox subject metadata",
    certificateExpiresAt: "2026-12-31T00:00:00.000Z",
    responseCustodyReadinessStatus: "METADATA_ONLY_READY" as const,
  };

  it("accepts response metadata without persisting secret material", () => {
    const plan = buildZatcaSandboxCsidResponseCustodyDryRunPlan(safeInput);
    const serialized = JSON.stringify(plan);

    expect(plan.schemaStatus).toBe("METADATA_SCHEMA_VALID");
    expect(plan.ready).toBe(false);
    expect(plan.responseCustodyReadinessStatus).toBe("BLOCKED_PENDING_APPROVAL");
    expect(plan.safeCustodyContractSummary.environment).toBe("SANDBOX");
    expect(plan.safeCustodyContractSummary.allowedMetadataFields).toEqual(expect.arrayContaining(["hasBinarySecurityToken", "certificateFingerprint"]));
    expect(plan.hasBinarySecurityToken).toBe(true);
    expect(plan.hasSecret).toBe(true);
    expect(plan.hasCertificate).toBe(true);
    expect(plan.noNetwork).toBe(true);
    expect(plan.noRequestBodyCreated).toBe(true);
    expect(plan.noResponseBodyProcessed).toBe(true);
    expect(plan.noSecretMaterialPersisted).toBe(true);
    expect(plan.productionCompliance).toBe(false);
    expect(plan.realResponseCustodyImplemented).toBe(false);
    expect(plan.blockers).toEqual(expect.arrayContaining(["real sandbox CSID response-body processing is not approved"]));
    expect(serialized).not.toMatch(/SECRET_VALUE|BEGIN CERTIFICATE|binary-security-token-body|raw-provider-body|real-response-body/i);
  });

  it("rejects forbidden response, request, secret, and credential body fields", () => {
    const forbiddenPayloads = [
      { ...safeInput, otp: "123456" },
      { ...safeInput, privateKeyPem: "-----BEGIN PRIVATE KEY-----body-----END PRIVATE KEY-----" },
      { ...safeInput, rawPrivateKey: "-----BEGIN PRIVATE KEY-----body-----END PRIVATE KEY-----" },
      { ...safeInput, csrPem: "-----BEGIN CERTIFICATE REQUEST-----body-----END CERTIFICATE REQUEST-----" },
      { ...safeInput, rawCsr: "csr-body" },
      { ...safeInput, csrBody: "csr-body" },
      { ...safeInput, rawCsid: "raw-csid-body" },
      { ...safeInput, complianceCsidPem: "-----BEGIN CERTIFICATE-----body-----END CERTIFICATE-----" },
      { ...safeInput, certificateBody: "certificate-body" },
      { ...safeInput, rawCertificate: "raw-certificate-body" },
      { ...safeInput, binarySecurityToken: "binary-security-token-body" },
      { ...safeInput, binarySecurityTokenBody: "binary-security-token-body" },
      { ...safeInput, secret: "secret-body" },
      { ...safeInput, secretBody: "secret-body" },
      { ...safeInput, token: "token-body" },
      { ...safeInput, requestBody: { csr: "body" } },
      { ...safeInput, responseBody: { binarySecurityToken: "body" } },
      { ...safeInput, providerPayload: { raw: "body" } },
      { ...safeInput, signedXml: "<Invoice>body</Invoice>" },
      { ...safeInput, qrPayload: "qr-body" },
    ];

    for (const payload of forbiddenPayloads) {
      expect(() => assertZatcaSandboxCsidResponseCustodyMetadataSafe(payload)).toThrow(
        "Sensitive ZATCA sandbox CSID response custody material is not allowed",
      );
    }
  });

  it("reports missing metadata and disabled custody provider blockers", () => {
    const plan = buildZatcaSandboxCsidResponseCustodyDryRunPlan({
      environment: "SANDBOX",
      organizationId: "",
      egsUnitId: "",
      custodyProviderType: "DISABLED",
      hasBinarySecurityToken: false,
      hasSecret: false,
      hasCertificate: false,
    });

    expect(plan.ready).toBe(false);
    expect(plan.schemaStatus).toBe("METADATA_SCHEMA_INCOMPLETE");
    expect(plan.executionStatus).toBe("BLOCKED_NOT_IMPLEMENTED");
    expect(plan.missingMetadata).toEqual(expect.arrayContaining(["organizationId", "egsUnitId", "requestReferenceAlias", "custodyReferenceAlias"]));
    expect(plan.blockers).toEqual(
      expect.arrayContaining([
        "organizationId metadata is required",
        "egsUnitId metadata is required",
        "sandbox CSID request reference alias metadata is required",
        "custody reference alias metadata is required",
        "custody provider approval is required before real sandbox CSID response custody",
        "response material presence metadata is required as booleans only",
      ]),
    );
    expect(plan.noSecretMaterialPersisted).toBe(true);
    expect(plan.signingEnabled).toBe(false);
    expect(plan.clearanceReportingEnabled).toBe(false);
    expect(plan.pdfA3Enabled).toBe(false);
  });

  it("blocks production environments even for response custody dry-run planning", () => {
    const plan = buildZatcaSandboxCsidResponseCustodyDryRunPlan({
      ...safeInput,
      environment: "PRODUCTION",
    });

    expect(plan.ready).toBe(false);
    expect(plan.safeCustodyContractSummary.environment).toBe("BLOCKED_PRODUCTION");
    expect(plan.blockers).toContain("production CSID response custody planning is out of scope for the sandbox dry-run lane");
    expect(plan.productionCompliance).toBe(false);
  });
});
