import {
  DisabledZatcaCustodyProviderBoundary,
  LocalReferenceZatcaCustodyProviderBoundary,
  assertZatcaCustodyMetadataSafe,
  createZatcaCustodyProviderBoundary,
  readZatcaCustodyProviderBoundaryPlan,
} from "./zatca-custody-provider-boundary";

const organizationId = "11111111-1111-1111-1111-111111111111";
const egsUnitId = "22222222-2222-2222-2222-222222222222";
const now = new Date("2026-06-07T12:00:00.000Z");

describe("ZATCA custody provider reference-only boundary", () => {
  it("keeps the runtime provider disabled by default", async () => {
    const provider = createZatcaCustodyProviderBoundary();
    const readiness = provider.getReadiness();

    expect(provider).toBeInstanceOf(DisabledZatcaCustodyProviderBoundary);
    expect(readiness.provider).toBe("DISABLED");
    expect(readiness.defaultProvider).toBe("DISABLED");
    expect(readiness.enabled).toBe(false);
    expect(readiness.referenceOperationsAvailable).toBe(false);
    expect(readiness.realProviderImplementationReady).toBe(false);
    expect(readiness.bodyStorageAllowed).toBe(false);
    expect(readiness.networkCallsEnabled).toBe(false);
    expect(readiness.signingEnabled).toBe(false);
    expect(readiness.clearanceReportingEnabled).toBe(false);
    expect(readiness.pdfA3Enabled).toBe(false);
    expect(readiness.productionCompliance).toBe(false);
    await expect(
      provider.storeSecretMaterialReferenceOnly({
        organizationId,
        egsUnitId,
        materialKind: "COMPLIANCE_SECRET",
        referenceId: "local-reference",
      }),
    ).rejects.toThrow("ZATCA custody provider boundary is disabled");
  });

  it("requires an explicit test-only switch before constructing a local-reference provider", () => {
    const provider = createZatcaCustodyProviderBoundary({ provider: "LOCAL_REFERENCE" });

    expect(provider).toBeInstanceOf(DisabledZatcaCustodyProviderBoundary);
    expect(provider.getReadiness().provider).toBe("DISABLED");
  });

  it("accepts only metadata and redacted references in the local-reference test provider", async () => {
    const provider = new LocalReferenceZatcaCustodyProviderBoundary({ now: () => now });

    const metadata = await provider.storeSandboxCsidResponseMetadataOnly({
      organizationId,
      egsUnitId,
      environment: "SANDBOX",
      lifecycleStatus: "COMPLIANCE_CSID_PENDING",
      referenceId: "local/sandbox/csid/reference-001",
      referenceAlias: "zatca-sandbox-reference-alias",
      referenceVersionId: "version-001",
      certificateFingerprint: "9f2d4c8e6a0b",
      certificateSerialNumber: "SERIAL-123",
      certificateIssuer: "ZATCA sandbox issuer metadata",
      certificateSubject: "LedgerByte sandbox subject metadata",
      certificateExpiresAt: "2026-12-31T00:00:00.000Z",
      certificateRequestId: "request-123",
      hasToken: true,
      hasSecret: true,
      hasCertificate: true,
      statusReason: "metadata-only local reference",
    });
    const serialized = JSON.stringify(metadata);

    expect(metadata.provider).toBe("LOCAL_REFERENCE");
    expect(metadata.purpose).toBe("SANDBOX_CSID_RESPONSE");
    expect(metadata.environment).toBe("SANDBOX");
    expect(metadata.lifecycleStatus).toBe("COMPLIANCE_CSID_PENDING");
    expect(metadata.referenceAlias).toBe("zatca-sandbox-reference-alias");
    expect(metadata.referenceId).toBe("[redacted-reference:length-32]");
    expect(metadata.referenceVersionId).toBe("[redacted-reference:length-11]");
    expect(metadata.hasToken).toBe(true);
    expect(metadata.hasSecret).toBe(true);
    expect(metadata.hasCertificate).toBe(true);
    expect(metadata.metadataOnly).toBe(true);
    expect(metadata.bodyReturned).toBe(false);
    expect(metadata.secretBodyStored).toBe(false);
    expect(metadata.privateKeyReturned).toBe(false);
    expect(metadata.signingEnabled).toBe(false);
    expect(metadata.clearanceReportingEnabled).toBe(false);
    expect(metadata.pdfA3Enabled).toBe(false);
    expect(metadata.productionCompliance).toBe(false);
    expect(serialized).not.toContain("local/sandbox/csid/reference-001");
    expect(serialized).not.toMatch(/BEGIN CERTIFICATE|BEGIN PRIVATE KEY|binarySecurityToken=|secret-value|<Invoice\b|request-body-value|response-body-value|signed-xml-body|qr-payload-body/i);
  });

  it("stores material references without accepting material bodies", async () => {
    const provider = new LocalReferenceZatcaCustodyProviderBoundary({ now: () => now });

    const reference = await provider.storeSecretMaterialReferenceOnly({
      organizationId,
      egsUnitId,
      environment: "SANDBOX",
      materialKind: "COMPLIANCE_TOKEN",
      referenceId: "managed-secret-reference-token-001",
      referenceAlias: "token-reference-alias",
      hasToken: true,
    });

    expect(reference.purpose).toBe("SECRET_MATERIAL_REFERENCE");
    expect(reference.materialKind).toBe("COMPLIANCE_TOKEN");
    expect(reference.referenceId).toBe("[redacted-reference:length-34]");
    expect(reference.referenceAlias).toBe("token-reference-alias");
    expect(reference.hasToken).toBe(true);
    expect(reference.bodyReturned).toBe(false);
    expect(reference.secretBodyStored).toBe(false);
    expect(reference.productionCompliance).toBe(false);
  });

  it("returns signing handles without private keys or signing capability", async () => {
    const provider = new LocalReferenceZatcaCustodyProviderBoundary({ now: () => now });

    const handle = await provider.retrieveSigningHandleNotPrivateKey({
      organizationId,
      egsUnitId,
      environment: "SANDBOX",
      referenceId: "local-signing-handle-001",
      referenceAlias: "dummy-signing-handle",
    });

    expect(handle.purpose).toBe("SIGNING_HANDLE");
    expect(handle.referenceId).toBe("[redacted-reference:length-24]");
    expect(handle.referenceAlias).toBe("dummy-signing-handle");
    expect(handle.privateKeyReturned).toBe(false);
    expect(handle.signingEnabled).toBe(false);
    expect(handle.productionCompliance).toBe(false);
    expect(JSON.stringify(handle)).not.toMatch(/BEGIN PRIVATE KEY|privateKeyPem|signing key/i);
  });

  it("rejects forbidden secret and body fields anywhere in provider payloads", () => {
    const forbiddenPayloads = [
      { otp: "123456" },
      { rawPrivateKey: "-----BEGIN PRIVATE KEY-----\nbody\n-----END PRIVATE KEY-----" },
      { csrBody: "-----BEGIN CERTIFICATE REQUEST-----\nbody\n-----END CERTIFICATE REQUEST-----" },
      { certificateBody: "-----BEGIN CERTIFICATE-----\nbody\n-----END CERTIFICATE-----" },
      { binarySecurityToken: "token-body" },
      { secretBody: "secret-body" },
      { signedXml: "<Invoice>body</Invoice>" },
      { qrPayload: "qr-body" },
      { requestBody: { csr: "body" } },
      { responseBody: { binarySecurityToken: "body" } },
      { providerPayload: { raw: "body" } },
    ];

    for (const payload of forbiddenPayloads) {
      expect(() => assertZatcaCustodyMetadataSafe(payload)).toThrow("Sensitive ZATCA custody material is not allowed");
    }
  });

  it("supports reference revocation, rotation, and health checks without provider calls", async () => {
    const provider = new LocalReferenceZatcaCustodyProviderBoundary({ now: () => now });

    const revoked = await provider.revokeReference({ organizationId, egsUnitId, referenceId: "local-reference-to-revoke" });
    const rotated = await provider.rotateReference({
      organizationId,
      egsUnitId,
      referenceId: "old-reference-id",
      nextReferenceId: "new-reference-id",
      referenceAlias: "rotated-reference",
    });
    const health = await provider.verifyReferenceHealth({ organizationId, egsUnitId, referenceId: "local-reference-health" });

    expect(revoked.status).toBe("REVOKED");
    expect(rotated.status).toBe("ROTATED");
    expect(rotated.previousReferenceId).toBe("[redacted-reference:length-16]");
    expect(rotated.referenceId).toBe("[redacted-reference:length-16]");
    expect(health.status).toBe("REFERENCE_PRESENT");
    expect(health.referencePresent).toBe(true);
    expect(health.realProviderChecked).toBe(false);
    expect(health.networkCallsMade).toBe(false);
    expect(health.productionCompliance).toBe(false);
  });

  it("reports legacy raw PEM and payload columns as blockers in the boundary plan", () => {
    const plan = readZatcaCustodyProviderBoundaryPlan({
      ZATCA_CUSTODY_PROVIDER_BOUNDARY: "local-reference",
      ZATCA_CUSTODY_PROVIDER_REFERENCE_ALIAS: "raw-reference-alias-value",
    } as NodeJS.ProcessEnv);
    const serialized = JSON.stringify(plan);

    expect(plan.defaultProvider).toBe("DISABLED");
    expect(plan.runtimeProvider).toBe("DISABLED");
    expect(plan.localReferenceProviderAvailableForTests).toBe(true);
    expect(plan.realProviderImplementationReady).toBe(false);
    expect(plan.bodyStorageAllowed).toBe(false);
    expect(plan.legacyRawPemBlockers).toEqual([
      "ZatcaEgsUnit.csrPem",
      "ZatcaEgsUnit.privateKeyPem",
      "ZatcaEgsUnit.complianceCsidPem",
      "ZatcaEgsUnit.productionCsidPem",
      "ZatcaSubmissionLog.requestPayloadBase64",
      "ZatcaSubmissionLog.responsePayloadBase64",
    ]);
    expect(serialized).not.toContain("raw-reference-alias-value");
    expect(serialized).toContain("[redacted");
  });
});
