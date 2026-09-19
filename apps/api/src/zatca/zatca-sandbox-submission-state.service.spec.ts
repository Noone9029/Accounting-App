import {
  ZatcaSandboxSubmissionOperation,
  ZatcaSandboxSubmissionStateStatus,
} from "@prisma/client";
import { ZatcaSandboxSubmissionStateService } from "./zatca-sandbox-submission-state.service";

const organizationId = "11111111-1111-1111-1111-111111111111";
const otherOrganizationId = "99999999-9999-9999-9999-999999999999";
const egsUnitId = "22222222-2222-2222-2222-222222222222";
const proofRunId = "33333333-3333-3333-3333-333333333333";

function makePrisma(overrides: Record<string, unknown> = {}) {
  const state = {
    id: "44444444-4444-4444-4444-444444444444",
    organizationId,
    egsUnitId,
    proofRunId,
    sourceIdentityHash: "source-hash",
    payloadHash: "payload-hash",
    invoiceUuid: "invoice-uuid",
    invoiceType: "STANDARD_TAX_INVOICE",
    operation: ZatcaSandboxSubmissionOperation.COMPLIANCE_DOCUMENT,
    icv: 1,
    previousInvoiceHash: "initial-hash",
    canonicalInvoiceHash: "canonical-hash",
    status: ZatcaSandboxSubmissionStateStatus.RESERVED,
    reservationToken: "reservation-token",
    updatedAt: new Date(),
  };
  const tx = {
    zatcaSandboxProofRun: { findFirst: jest.fn().mockResolvedValue({ id: proofRunId, organizationId, egsUnitId, status: "ACTIVE", syntheticDataVerified: true }) },
    zatcaSandboxSubmissionState: {
      findFirst: jest.fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null),
      create: jest.fn().mockResolvedValue(state),
      update: jest.fn().mockResolvedValue({ ...state, status: ZatcaSandboxSubmissionStateStatus.ACCEPTED }),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    zatcaSandboxSubmissionAttempt: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: "attempt-1", attemptNumber: 1 }),
    },
    ...overrides,
  };
  const prisma = { $transaction: jest.fn((callback: (value: typeof tx) => unknown) => callback(tx)), ...tx };
  return { prisma, tx, state };
}

const reserveInput = {
  organizationId,
  egsUnitId,
  proofRunId,
  sourceIdentityHash: "source-hash",
  payloadHash: "payload-hash",
  invoiceUuid: "invoice-uuid",
  invoiceType: "STANDARD_TAX_INVOICE" as const,
  previousInvoiceHash: "initial-hash",
  canonicalInvoiceHash: "canonical-hash",
  operation: ZatcaSandboxSubmissionOperation.COMPLIANCE_DOCUMENT,
  reservationToken: "reservation-token",
};

describe("ZATCA sandbox transactional submission state", () => {
  it("reserves the first ICV only inside the synthetic proof run and leaves the production EGS chain untouched", async () => {
    const { prisma, tx } = makePrisma();
    const service = new ZatcaSandboxSubmissionStateService(prisma as never);

    const result = await service.reserve(reserveInput);

    expect(result.disposition).toBe("RESERVED");
    expect(result.state.icv).toBe(1);
    expect(tx.zatcaSandboxSubmissionState.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ organizationId, egsUnitId, proofRunId, icv: 1, status: "RESERVED" }),
    }));
    expect((prisma as Record<string, unknown>).zatcaEgsUnit).toBeUndefined();
  });

  it("returns an existing reservation for an exact replay but rejects a changed payload under the same identity", async () => {
    const { prisma, tx, state } = makePrisma();
    tx.zatcaSandboxSubmissionState.findFirst
      .mockReset()
      .mockResolvedValueOnce(state)
      .mockResolvedValueOnce({ ...state, payloadHash: "different-payload" });
    const service = new ZatcaSandboxSubmissionStateService(prisma as never);

    await expect(service.reserve(reserveInput)).resolves.toMatchObject({ disposition: "REPLAY", state: { id: state.id } });
    await expect(service.reserve(reserveInput)).rejects.toMatchObject({ code: "ZATCA_SANDBOX_IDEMPOTENCY_CONFLICT" });
  });

  it("rejects a cross-tenant proof-run reference before it reserves or calls an adapter", async () => {
    const { prisma, tx } = makePrisma();
    tx.zatcaSandboxProofRun.findFirst.mockResolvedValue(null);
    const service = new ZatcaSandboxSubmissionStateService(prisma as never);

    await expect(service.reserve(reserveInput)).rejects.toMatchObject({ code: "ZATCA_SANDBOX_PROOF_RUN_NOT_FOUND" });
    expect(tx.zatcaSandboxSubmissionState.create).not.toHaveBeenCalled();
  });

  it("requires PIH to equal the prior accepted canonical hash", async () => {
    const { prisma, tx, state } = makePrisma();
    tx.zatcaSandboxSubmissionState.findFirst
      .mockReset()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ ...state, status: ZatcaSandboxSubmissionStateStatus.ACCEPTED, canonicalInvoiceHash: "prior-accepted-hash" });
    const service = new ZatcaSandboxSubmissionStateService(prisma as never);

    await expect(service.reserve(reserveInput)).rejects.toMatchObject({ code: "ZATCA_SANDBOX_PIH_MISMATCH" });
    expect(tx.zatcaSandboxSubmissionState.create).not.toHaveBeenCalled();
  });

  it("accepts exactly the tenant-scoped reserved state and writes only metadata-only attempt fields", async () => {
    const { prisma, tx, state } = makePrisma();
    tx.zatcaSandboxSubmissionState.findFirst.mockReset().mockResolvedValue({ ...state, status: ZatcaSandboxSubmissionStateStatus.RESERVED });
    const service = new ZatcaSandboxSubmissionStateService(prisma as never);

    const accepted = await service.accept({ organizationId, submissionStateId: state.id, requestHash: "request-hash", responseHash: "response-hash", responseCode: "SIMULATED_ACCEPTED", correlationId: "correlation-id" });

    expect(accepted.status).toBe(ZatcaSandboxSubmissionStateStatus.ACCEPTED);
    expect(tx.zatcaSandboxSubmissionAttempt.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.not.objectContaining({ rawResponse: expect.anything(), responseBody: expect.anything() }) }));
    expect(tx.zatcaSandboxSubmissionState.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: state.id }, data: expect.objectContaining({ status: "ACCEPTED" }) }));
  });

  it("refuses secret and body-shaped values at the public service boundary", async () => {
    const { prisma } = makePrisma();
    const service = new ZatcaSandboxSubmissionStateService(prisma as never);

    await expect(service.reserve({ ...reserveInput, payloadHash: "<Invoice>raw body</Invoice>" })).rejects.toMatchObject({ code: "ZATCA_SANDBOX_SENSITIVE_METADATA" });
    await expect(service.reserve({ ...reserveInput, credentialReferenceId: "-----BEGIN CERTIFICATE-----" })).rejects.toMatchObject({ code: "ZATCA_SANDBOX_SENSITIVE_METADATA" });
    await expect(service.accept({ organizationId, submissionStateId: "state-id", requestHash: "request", responseCode: "response", correlationId: "correlation", warningCodes: ["<Invoice>raw body</Invoice>"] })).rejects.toMatchObject({ code: "ZATCA_SANDBOX_SENSITIVE_METADATA" });
    expect(otherOrganizationId).not.toBe(organizationId);
  });

  it("rejects every changed immutable artifact field under an existing source identity", async () => {
    const existing = {
      ...makePrisma().state,
      signedArtifactHash: "signed-artifact-hash",
      credentialReferenceId: "credential-reference",
      signingKeyReferenceId: "signing-key-reference",
      certificateFingerprint: "certificate-fingerprint",
    };
    const { prisma, tx } = makePrisma();
    tx.zatcaSandboxSubmissionState.findFirst.mockReset().mockResolvedValue(existing);
    const service = new ZatcaSandboxSubmissionStateService(prisma as never);
    const exact = { ...reserveInput, signedArtifactHash: existing.signedArtifactHash, credentialReferenceId: existing.credentialReferenceId, signingKeyReferenceId: existing.signingKeyReferenceId, certificateFingerprint: existing.certificateFingerprint };

    await expect(service.reserve(exact)).resolves.toMatchObject({ disposition: "REPLAY", state: { id: existing.id } });
    for (const changed of [
      { egsUnitId: "different-egs" },
      { proofRunId: "different-proof" },
      { invoiceMetadataId: "different-metadata" },
      { signedArtifactHash: "changed-signed-artifact" },
      { canonicalInvoiceHash: "changed-canonical-hash" },
      { invoiceUuid: "changed-invoice-uuid" },
      { invoiceType: "SIMPLIFIED_TAX_INVOICE" as const },
      { operation: ZatcaSandboxSubmissionOperation.CLEARANCE },
      { credentialReferenceId: "changed-credential-reference" },
      { signingKeyReferenceId: "changed-signing-key-reference" },
      { certificateFingerprint: "changed-certificate-fingerprint" },
    ]) {
      await expect(service.reserve({ ...exact, ...changed })).rejects.toMatchObject({ code: "ZATCA_SANDBOX_IDEMPOTENCY_CONFLICT" });
    }
  });

  it("allows an exact uncertain retry identity but blocks altered artifact identity and terminal states", async () => {
    const { prisma, tx, state } = makePrisma();
    tx.zatcaSandboxSubmissionState.findFirst.mockReset().mockResolvedValue({ ...state, status: ZatcaSandboxSubmissionStateStatus.UNCERTAIN });
    const service = new ZatcaSandboxSubmissionStateService(prisma as never);
    const retry = { organizationId, submissionStateId: state.id, sourceIdentityHash: state.sourceIdentityHash, payloadHash: state.payloadHash, canonicalInvoiceHash: state.canonicalInvoiceHash, invoiceUuid: state.invoiceUuid, invoiceType: "STANDARD_TAX_INVOICE" as const, previousInvoiceHash: state.previousInvoiceHash, operation: ZatcaSandboxSubmissionOperation.COMPLIANCE_DOCUMENT };

    await expect(service.loadExactUncertainRetry(retry)).resolves.toMatchObject({ id: state.id, status: "UNCERTAIN" });
    await expect(service.loadExactUncertainRetry({ ...retry, payloadHash: "changed" })).rejects.toMatchObject({ code: "ZATCA_SANDBOX_RETRY_IDENTITY_MISMATCH" });
    tx.zatcaSandboxSubmissionState.findFirst.mockResolvedValue({ ...state, status: ZatcaSandboxSubmissionStateStatus.ACCEPTED });
    await expect(service.loadExactUncertainRetry(retry)).rejects.toMatchObject({ code: "ZATCA_SANDBOX_STATE_NOT_ACCEPTABLE" });
  });

  it("allows UNCERTAIN to remain uncertain as a second bounded attempt but blocks terminal mutation", async () => {
    const { prisma, tx, state } = makePrisma();
    tx.zatcaSandboxSubmissionState.findFirst.mockReset().mockResolvedValue({ ...state, status: ZatcaSandboxSubmissionStateStatus.UNCERTAIN });
    const service = new ZatcaSandboxSubmissionStateService(prisma as never);
    await expect(service.recordUncertain({ organizationId, submissionStateId: state.id, requestHash: "retry-request", responseCode: "SIMULATED_TIMEOUT", correlationId: "retry-correlation", retryClassification: "RETRYABLE" })).resolves.toBeDefined();
    expect(tx.zatcaSandboxSubmissionAttempt.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "UNCERTAIN" }) }));
    tx.zatcaSandboxSubmissionState.findFirst.mockResolvedValue({ ...state, status: ZatcaSandboxSubmissionStateStatus.ACCEPTED });
    await expect(service.recordUncertain({ organizationId, submissionStateId: state.id, requestHash: "retry-request", responseCode: "SIMULATED_TIMEOUT", correlationId: "retry-correlation-two" })).rejects.toMatchObject({ code: "ZATCA_SANDBOX_STATE_NOT_ACCEPTABLE" });
  });

  it("blocks every provider-result transition from terminal states", async () => {
    const attempt = { organizationId, submissionStateId: "state-id", requestHash: "request", responseHash: "response", responseCode: "SIMULATED_ACCEPTED", correlationId: "correlation" };
    const transitions = ["accept", "reject", "recordUncertain"] as const;
    for (const status of [ZatcaSandboxSubmissionStateStatus.ACCEPTED, ZatcaSandboxSubmissionStateStatus.REJECTED]) {
      for (const transition of transitions) {
        const { prisma, tx, state } = makePrisma();
        tx.zatcaSandboxSubmissionState.findFirst.mockReset().mockResolvedValue({ ...state, id: attempt.submissionStateId, status });
        const service = new ZatcaSandboxSubmissionStateService(prisma as never);
        await expect(service[transition](attempt)).rejects.toMatchObject({ code: "ZATCA_SANDBOX_STATE_NOT_ACCEPTABLE" });
        expect(tx.zatcaSandboxSubmissionAttempt.create).not.toHaveBeenCalled();
        expect(tx.zatcaSandboxSubmissionState.update).not.toHaveBeenCalled();
      }
    }
  });

  it("atomically claims an exact uncertain retry and does not reclaim an active owner", async () => {
    const { prisma, tx, state } = makePrisma();
    const retry = { ...reserveInput, submissionStateId: state.id };
    const service = new ZatcaSandboxSubmissionStateService(prisma as never);
    tx.zatcaSandboxSubmissionState.findFirst.mockReset().mockResolvedValue({ ...state, status: ZatcaSandboxSubmissionStateStatus.UNCERTAIN });
    const claim = await service.claimExactUncertainRetry(retry);
    expect(claim).toMatchObject({ disposition: "CLAIMED", retryClaimToken: expect.stringMatching(/^sandbox-retry:/) });
    expect(tx.zatcaSandboxSubmissionState.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: state.id, organizationId, status: "UNCERTAIN", reservationToken: state.reservationToken } }));
    tx.zatcaSandboxSubmissionState.findFirst.mockResolvedValue({ ...state, reservationToken: "sandbox-retry:existing-owner" });
    await expect(service.claimExactUncertainRetry(retry)).resolves.toEqual({ disposition: "RETRY_IN_PROGRESS" });
    expect(tx.zatcaSandboxSubmissionState.updateMany).toHaveBeenCalledTimes(1);
    await expect(service.releaseReservation(organizationId, state.id)).rejects.toMatchObject({ code: "ZATCA_SANDBOX_STATE_NOT_ACCEPTABLE" });
  });

  it("does not authorize a provider call after losing the compare-and-set or tenant/identity checks", async () => {
    const { prisma, tx, state } = makePrisma();
    const retry = { ...reserveInput, submissionStateId: state.id };
    const service = new ZatcaSandboxSubmissionStateService(prisma as never);
    tx.zatcaSandboxSubmissionState.findFirst.mockReset().mockResolvedValue({ ...state, status: ZatcaSandboxSubmissionStateStatus.UNCERTAIN });
    tx.zatcaSandboxSubmissionState.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.claimExactUncertainRetry(retry)).resolves.toEqual({ disposition: "RETRY_IN_PROGRESS" });
    await expect(service.claimExactUncertainRetry({ ...retry, payloadHash: "changed" })).rejects.toMatchObject({ code: "ZATCA_SANDBOX_RETRY_IDENTITY_MISMATCH" });
    tx.zatcaSandboxSubmissionState.findFirst.mockResolvedValue(null);
    await expect(service.claimExactUncertainRetry({ ...retry, organizationId: otherOrganizationId })).rejects.toMatchObject({ code: "ZATCA_SANDBOX_STATE_NOT_ACCEPTABLE" });
    expect(tx.zatcaSandboxSubmissionState.findFirst).toHaveBeenLastCalledWith({ where: { id: state.id, organizationId: otherOrganizationId } });
    expect(tx.zatcaSandboxSubmissionState.updateMany).toHaveBeenCalledTimes(1);
  });

  it("fences missing and stale ownership tokens on every result transition", async () => {
    for (const transition of ["accept", "reject", "recordUncertain"] as const) {
      const { prisma, tx, state } = makePrisma();
      tx.zatcaSandboxSubmissionState.findFirst.mockReset().mockResolvedValue({ ...state, reservationToken: "sandbox-retry:current" });
      const service = new ZatcaSandboxSubmissionStateService(prisma as never);
      const attempt = { organizationId, submissionStateId: state.id, requestHash: "request", responseCode: "SIMULATED_ACCEPTED", correlationId: "correlation" };
      await expect(service[transition](attempt)).rejects.toMatchObject({ code: "ZATCA_SANDBOX_RETRY_OWNERSHIP_LOST" });
      await expect(service[transition]({ ...attempt, retryClaimToken: "sandbox-retry:old" })).rejects.toMatchObject({ code: "ZATCA_SANDBOX_RETRY_OWNERSHIP_LOST" });
      expect(tx.zatcaSandboxSubmissionAttempt.create).not.toHaveBeenCalled();
      await service[transition]({ ...attempt, retryClaimToken: "sandbox-retry:current" });
      expect(tx.zatcaSandboxSubmissionState.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ reservationToken: expect.stringMatching(/^settled-retry:/) }) }));
    }
  });

  it("requires stopped-worker review, minimum age, and exact tenant owner before recovery to uncertain", async () => {
    const { prisma, tx, state } = makePrisma();
    const service = new ZatcaSandboxSubmissionStateService(prisma as never);
    const recovery = { organizationId, submissionStateId: state.id, retryClaimToken: "sandbox-retry:owner", previousWorkerStopped: true, recoveryReviewReference: "local-proof-review-123", correlationId: "recovery-correlation" };
    tx.zatcaSandboxSubmissionState.findFirst.mockReset().mockResolvedValue({ ...state, reservationToken: recovery.retryClaimToken });
    await expect(service.recoverAbandonedRetry({ ...recovery, previousWorkerStopped: false })).rejects.toMatchObject({ code: "ZATCA_SANDBOX_RETRY_RECOVERY_NOT_ALLOWED" });
    await expect(service.recoverAbandonedRetry(recovery)).rejects.toMatchObject({ code: "ZATCA_SANDBOX_RETRY_RECOVERY_NOT_ALLOWED" });
    tx.zatcaSandboxSubmissionState.findFirst.mockResolvedValue({ ...state, reservationToken: recovery.retryClaimToken, updatedAt: new Date(Date.now() - 16 * 60_000) });
    await expect(service.recoverAbandonedRetry({ ...recovery, retryClaimToken: "sandbox-retry:wrong" })).rejects.toMatchObject({ code: "ZATCA_SANDBOX_RETRY_OWNERSHIP_LOST" });
    await service.recoverAbandonedRetry(recovery);
    expect(tx.zatcaSandboxSubmissionAttempt.create).toHaveBeenCalledTimes(1);
    expect(tx.zatcaSandboxSubmissionAttempt.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "UNCERTAIN", responseCode: "SANDBOX_RETRY_OWNER_RECOVERY", retryClassification: "NOT_RETRYABLE" }) }));
    expect(JSON.stringify(tx.zatcaSandboxSubmissionAttempt.create.mock.calls)).not.toContain(recovery.recoveryReviewReference);
    expect(tx.zatcaSandboxSubmissionState.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "UNCERTAIN", reservationToken: expect.stringMatching(/^settled-retry:/) }) }));
  });
});
