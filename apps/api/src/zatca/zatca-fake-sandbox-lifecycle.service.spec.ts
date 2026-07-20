import { ZatcaSandboxSubmissionOperation } from "@prisma/client";
import { FakeLoopbackZatcaSandboxAdapter } from "./adapters/fake-loopback-zatca-sandbox.adapter";
import { ZatcaFakeSandboxLifecycleService } from "./zatca-fake-sandbox-lifecycle.service";
import { LoopbackZatcaSandboxHttpClient, LoopbackZatcaSandboxServer } from "./adapters/loopback-zatca-sandbox-http";

const reservation = { organizationId: "org", egsUnitId: "egs", proofRunId: "proof", sourceIdentityHash: "source", payloadHash: "payload", invoiceUuid: "uuid", invoiceType: "STANDARD_TAX_INVOICE" as const, previousInvoiceHash: "initial", canonicalInvoiceHash: "canonical", operation: ZatcaSandboxSubmissionOperation.COMPLIANCE_DOCUMENT, reservationToken: "token" };

describe("fake sandbox lifecycle", () => {
  it("records an accepted loopback attempt with hashes only", async () => {
    const state = { reserve: jest.fn().mockResolvedValue({ disposition: "RESERVED", state: { id: "state" } }), accept: jest.fn(), recordUncertain: jest.fn() };
    const handler = { requestComplianceCsid: jest.fn(), requestProductionCsid: jest.fn(), submitComplianceCheck: jest.fn().mockResolvedValue({ responseCode: "SIMULATED_ACCEPTED", responsePayload: {} }), submitClearance: jest.fn(), submitReporting: jest.fn() };
    const service = new ZatcaFakeSandboxLifecycleService(state as never, new FakeLoopbackZatcaSandboxAdapter(handler as never));

    const result = await service.run({ reservation, invoiceId: "invoice", invoiceMetadataId: "metadata", outcome: "ACCEPTED", correlationId: "correlation" });

    expect(result).toMatchObject({ disposition: "ACCEPTED", adapter: { inProcessOnly: true, externalNetworkAttempted: false } });
    expect(state.accept).toHaveBeenCalledWith(expect.objectContaining({ requestHash: expect.any(String), responseHash: expect.any(String) }));
    expect(JSON.stringify(state.accept.mock.calls)).not.toContain("invoiceXml");
  });

  it("records a timeout as uncertain without an adapter call or accepted transition", async () => {
    const state = { reserve: jest.fn().mockResolvedValue({ disposition: "RESERVED", state: { id: "state" } }), accept: jest.fn(), recordUncertain: jest.fn() };
    const handler = { requestComplianceCsid: jest.fn(), requestProductionCsid: jest.fn(), submitComplianceCheck: jest.fn(), submitClearance: jest.fn(), submitReporting: jest.fn() };
    const adapter = new FakeLoopbackZatcaSandboxAdapter(handler as never);
    const result = await new ZatcaFakeSandboxLifecycleService(state as never, adapter).run({ reservation, invoiceId: "invoice", invoiceMetadataId: "metadata", outcome: "TIMEOUT", correlationId: "correlation" });

    expect(result.disposition).toBe("UNCERTAIN");
    expect(state.accept).not.toHaveBeenCalled();
    expect(state.recordUncertain).toHaveBeenCalledWith(expect.objectContaining({ responseCode: "SIMULATED_TIMEOUT" }));
    expect(adapter.calls).toEqual([]);
  });

  it("maps real loopback HTTP acceptance and rejection into safe transactional transitions", async () => {
    for (const [scenario, expected, method] of [["ACCEPTED", "ACCEPTED", "accept"], ["REJECTED", "REJECTED", "reject"], ["RATE_LIMIT", "UNCERTAIN", "recordUncertain"]] as const) {
      const state = { reserve: jest.fn().mockResolvedValue({ disposition: "RESERVED", state: { id: `state-${scenario}` } }), accept: jest.fn(), reject: jest.fn(), recordUncertain: jest.fn() };
      const handler = { requestComplianceCsid: jest.fn(), requestProductionCsid: jest.fn(), submitComplianceCheck: jest.fn(), submitClearance: jest.fn(), submitReporting: jest.fn() };
      const server = new LoopbackZatcaSandboxServer(scenario);
      const baseUrl = await server.start(true);
      try {
        const result = await new ZatcaFakeSandboxLifecycleService(state as never, new FakeLoopbackZatcaSandboxAdapter(handler as never)).runOverLoopbackHttp({ reservation, invoiceId: "invoice", invoiceMetadataId: "metadata", correlationId: `correlation-${scenario}` }, new LoopbackZatcaSandboxHttpClient(baseUrl));
        expect(result.disposition).toBe(expected);
        expect(state[method]).toHaveBeenCalledWith(expect.objectContaining({ responseHash: expect.any(String), responseCode: expect.stringMatching(/^SIMULATED_/) }));
      } finally { await server.stop(); }
    }
  });

  it("maps unsafe or unavailable loopback responses to one retryable uncertain attempt", async () => {
    for (const scenario of ["SERVER_ERROR", "MALFORMED", "WRONG_CONTENT_TYPE", "OVERSIZED", "TRUNCATED", "REDIRECT", "EMPTY", "TIMEOUT", "RESET_AFTER_REQUEST"] as const) {
      const state = { reserve: jest.fn().mockResolvedValue({ disposition: "RESERVED", state: { id: `state-${scenario}` } }), accept: jest.fn(), reject: jest.fn(), recordUncertain: jest.fn() };
      const handler = { requestComplianceCsid: jest.fn(), requestProductionCsid: jest.fn(), submitComplianceCheck: jest.fn(), submitClearance: jest.fn(), submitReporting: jest.fn() };
      const server = new LoopbackZatcaSandboxServer(scenario); const baseUrl = await server.start(true);
      try {
        const result = await new ZatcaFakeSandboxLifecycleService(state as never, new FakeLoopbackZatcaSandboxAdapter(handler as never)).runOverLoopbackHttp({ reservation, invoiceId: "invoice", invoiceMetadataId: "metadata", correlationId: `correlation-${scenario}` }, new LoopbackZatcaSandboxHttpClient(baseUrl));
        expect(result.disposition).toBe("UNCERTAIN");
        expect(state.accept).not.toHaveBeenCalled();
        expect(state.recordUncertain).toHaveBeenCalledTimes(1);
      } finally { await server.stop(); }
    }
  });

  it("requires the explicit unchanged-artifact retry path before a second loopback attempt", async () => {
    const uncertainState = { id: "state", ...reservation, status: "UNCERTAIN" };
    const state = { loadExactUncertainRetry: jest.fn().mockResolvedValue(uncertainState), reserve: jest.fn(), accept: jest.fn(), reject: jest.fn(), recordUncertain: jest.fn() };
    const handler = { requestComplianceCsid: jest.fn(), requestProductionCsid: jest.fn(), submitComplianceCheck: jest.fn(), submitClearance: jest.fn(), submitReporting: jest.fn() };
    const server = new LoopbackZatcaSandboxServer("ACCEPTED"); const baseUrl = await server.start(true);
    try {
      const result = await new ZatcaFakeSandboxLifecycleService(state as never, new FakeLoopbackZatcaSandboxAdapter(handler as never)).retryExactUncertainOverLoopbackHttp({ organizationId: reservation.organizationId, submissionStateId: "state", sourceIdentityHash: reservation.sourceIdentityHash, payloadHash: reservation.payloadHash, canonicalInvoiceHash: reservation.canonicalInvoiceHash, invoiceUuid: reservation.invoiceUuid, invoiceType: reservation.invoiceType, previousInvoiceHash: reservation.previousInvoiceHash, operation: reservation.operation, correlationId: "retry-correlation" }, new LoopbackZatcaSandboxHttpClient(baseUrl));
      expect(result).toMatchObject({ disposition: "ACCEPTED", stateId: "state" });
      expect(state.loadExactUncertainRetry).toHaveBeenCalledTimes(1);
      expect(state.reserve).not.toHaveBeenCalled();
      expect(state.accept).toHaveBeenCalledTimes(1);
    } finally { await server.stop(); }
  });

  it("permits only one concurrent exact retry to own the loopback provider call", async () => {
    const uncertainState = { id: "state", ...reservation, status: "UNCERTAIN" };
    const state = { loadExactUncertainRetry: jest.fn().mockResolvedValue(uncertainState), reserve: jest.fn(), accept: jest.fn().mockResolvedValue(undefined), reject: jest.fn(), recordUncertain: jest.fn() };
    const handler = { requestComplianceCsid: jest.fn(), requestProductionCsid: jest.fn(), submitComplianceCheck: jest.fn(), submitClearance: jest.fn(), submitReporting: jest.fn() };
    const server = new LoopbackZatcaSandboxServer("ACCEPTED"); const baseUrl = await server.start(true);
    const retry = { organizationId: reservation.organizationId, submissionStateId: "state", sourceIdentityHash: reservation.sourceIdentityHash, payloadHash: reservation.payloadHash, canonicalInvoiceHash: reservation.canonicalInvoiceHash, invoiceUuid: reservation.invoiceUuid, invoiceType: reservation.invoiceType, previousInvoiceHash: reservation.previousInvoiceHash, operation: reservation.operation };
    try {
      const service = new ZatcaFakeSandboxLifecycleService(state as never, new FakeLoopbackZatcaSandboxAdapter(handler as never));
      const results = await Promise.all([
        service.retryExactUncertainOverLoopbackHttp({ ...retry, correlationId: "retry-one" }, new LoopbackZatcaSandboxHttpClient(baseUrl)),
        service.retryExactUncertainOverLoopbackHttp({ ...retry, correlationId: "retry-two" }, new LoopbackZatcaSandboxHttpClient(baseUrl)),
      ]);

      expect(results.map((result) => result.disposition).sort()).toEqual(["ACCEPTED", "RETRY_IN_PROGRESS"]);
      expect(server.getEvidence().requestCount).toBe(1);
      expect(state.accept).toHaveBeenCalledTimes(1);
    } finally { await server.stop(); }
  });

  it("returns CONFLICT before transport when the source identity has a changed payload", async () => {
    const state = { reserve: jest.fn().mockRejectedValue(Object.assign(new Error("conflict"), { code: "ZATCA_SANDBOX_IDEMPOTENCY_CONFLICT" })), accept: jest.fn(), reject: jest.fn(), recordUncertain: jest.fn() };
    const handler = { requestComplianceCsid: jest.fn(), requestProductionCsid: jest.fn(), submitComplianceCheck: jest.fn(), submitClearance: jest.fn(), submitReporting: jest.fn() };
    const server = new LoopbackZatcaSandboxServer("ACCEPTED"); const baseUrl = await server.start(true);
    try {
      const result = await new ZatcaFakeSandboxLifecycleService(state as never, new FakeLoopbackZatcaSandboxAdapter(handler as never)).runOverLoopbackHttp({ reservation: { ...reservation, payloadHash: "changed" }, invoiceId: "invoice", invoiceMetadataId: "metadata", correlationId: "conflict" }, new LoopbackZatcaSandboxHttpClient(baseUrl));
      expect(result).toEqual({ disposition: "CONFLICT" });
      expect(server.getEvidence().requestCount).toBe(0);
    } finally { await server.stop(); }
  });

  it("rejects expired, revoked, mismatched, legacy, incomplete, and production-looking credential metadata before reservation or transport", async () => {
    const credentialBoundReservation = { ...reservation, credentialReferenceId: "credential-reference", signingKeyReferenceId: "signing-key-reference", certificateFingerprint: "certificate-fingerprint", certificateSerialNumber: "certificate-serial" };
    const validCredential = { status: "ACTIVE" as const, referenceId: "credential-reference", signingKeyReferenceId: "signing-key-reference", certificateFingerprint: "certificate-fingerprint", certificateSerialNumber: "certificate-serial" };
    for (const [credential, safeCode] of [
      [{ ...validCredential, status: "EXPIRED" as const }, "SIMULATED_CREDENTIAL_EXPIRED"],
      [{ ...validCredential, status: "REVOKED" as const }, "SIMULATED_CREDENTIAL_REVOKED"],
      [{ ...validCredential, referenceId: "wrong-reference" }, "SIMULATED_CREDENTIAL_REFERENCE_MISMATCH"],
      [{ ...validCredential, signingKeyReferenceId: "wrong-key" }, "SIMULATED_SIGNING_KEY_REFERENCE_MISMATCH"],
      [{ ...validCredential, certificateFingerprint: "wrong-fingerprint" }, "SIMULATED_CERTIFICATE_FINGERPRINT_MISMATCH"],
      [{ ...validCredential, certificateSerialNumber: "wrong-serial" }, "SIMULATED_CERTIFICATE_SERIAL_MISMATCH"],
      [{ ...validCredential, legacyPlaintextPem: true }, "SIMULATED_LEGACY_PEM_REJECTED"],
      [{ status: "ACTIVE" as const }, "SIMULATED_CREDENTIAL_REFERENCE_MISSING"],
      [{ ...validCredential, provider: "PRODUCTION" as const }, "SIMULATED_CUSTODY_PROVIDER_REJECTED"],
    ] as const) {
      const state = { reserve: jest.fn(), accept: jest.fn(), reject: jest.fn(), recordUncertain: jest.fn() };
      const handler = { requestComplianceCsid: jest.fn(), requestProductionCsid: jest.fn(), submitComplianceCheck: jest.fn(), submitClearance: jest.fn(), submitReporting: jest.fn() };
      const server = new LoopbackZatcaSandboxServer("ACCEPTED"); const baseUrl = await server.start(true);
      try {
        const result = await new ZatcaFakeSandboxLifecycleService(state as never, new FakeLoopbackZatcaSandboxAdapter(handler as never)).runOverLoopbackHttp({ reservation: credentialBoundReservation, invoiceId: "invoice", invoiceMetadataId: "metadata", correlationId: "credential", credential }, new LoopbackZatcaSandboxHttpClient(baseUrl));
        expect(result).toEqual({ disposition: "REJECTED", safeCode });
        expect(state.reserve).not.toHaveBeenCalled();
        expect(server.getEvidence().requestCount).toBe(0);
      } finally { await server.stop(); }
    }
  });
});
