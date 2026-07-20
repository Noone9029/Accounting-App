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
    icv: 1,
    previousInvoiceHash: "initial-hash",
    canonicalInvoiceHash: "canonical-hash",
    status: ZatcaSandboxSubmissionStateStatus.RESERVED,
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
});
