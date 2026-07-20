import { Injectable } from "@nestjs/common";
import {
  ZatcaSandboxRetryClassification,
  ZatcaSandboxSubmissionStateStatus,
  type ZatcaInvoiceType,
  type ZatcaSandboxSubmissionOperation,
} from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

const sensitiveValuePattern = /-----BEGIN [A-Z ]+-----|<\/?(?:\w+:)?(?:Invoice|Signature)\b|\b(?:otp|authorization|bearer|private[ _-]?key|binary[ _-]?security[ _-]?token|raw[ _-]?(?:request|response|certificate|xml))\b/i;
const sensitiveFieldPattern = /^(?:otp(?:Value)?|secret(?:Body)?|privateKey(?:Pem)?|raw(?:Xml|Request|Response|Certificate)|signedXml(?:Base64)?|xmlBase64|qr(?:Payload|Body)|authorization|authHeader|certificate(?:Body|Pem)?|binarySecurityToken(?:Body)?|tokenBody|requestBody|responseBody)$/i;

type StateClient = Pick<PrismaService, "zatcaSandboxProofRun" | "zatcaSandboxSubmissionState" | "zatcaSandboxSubmissionAttempt">;

export type ZatcaSandboxSubmissionStateSafeCode =
  | "ZATCA_SANDBOX_SENSITIVE_METADATA"
  | "ZATCA_SANDBOX_PROOF_RUN_NOT_FOUND"
  | "ZATCA_SANDBOX_IDEMPOTENCY_CONFLICT"
  | "ZATCA_SANDBOX_PIH_MISMATCH"
  | "ZATCA_SANDBOX_STATE_NOT_ACCEPTABLE";

export class ZatcaSandboxSubmissionStateError extends Error {
  constructor(readonly code: ZatcaSandboxSubmissionStateSafeCode) {
    super(code);
  }
}

export interface ReserveZatcaSandboxSubmissionInput {
  organizationId: string;
  egsUnitId: string;
  proofRunId: string;
  sourceIdentityHash: string;
  payloadHash: string;
  invoiceUuid: string;
  invoiceType: ZatcaInvoiceType;
  previousInvoiceHash: string;
  canonicalInvoiceHash: string;
  operation: ZatcaSandboxSubmissionOperation;
  reservationToken: string;
  invoiceMetadataId?: string;
  signedArtifactHash?: string;
  signingKeyReferenceId?: string;
  credentialReferenceId?: string;
  certificateFingerprint?: string;
  certificateSerialNumber?: string;
  certificateExpiresAt?: Date;
}

export interface RecordZatcaSandboxAttemptInput {
  organizationId: string;
  submissionStateId: string;
  requestHash: string;
  responseHash?: string;
  responseCode: string;
  correlationId: string;
  warningCodes?: string[];
  errorCodes?: string[];
  retryClassification?: ZatcaSandboxRetryClassification;
}

function assertMetadataOnly(value: object): void {
  for (const [field, fieldValue] of Object.entries(value)) {
    if (sensitiveFieldPattern.test(field)) throw new ZatcaSandboxSubmissionStateError("ZATCA_SANDBOX_SENSITIVE_METADATA");
    assertSafeMetadataValue(fieldValue);
  }
}

function assertSafeMetadataValue(value: unknown): void {
  if (value === undefined || value === null || value instanceof Date) return;
  if (typeof value === "string") {
    if (sensitiveValuePattern.test(value)) throw new ZatcaSandboxSubmissionStateError("ZATCA_SANDBOX_SENSITIVE_METADATA");
    return;
  }
  if (Array.isArray(value)) {
    value.forEach(assertSafeMetadataValue);
    return;
  }
  if (typeof value === "object") assertMetadataOnly(value);
}

@Injectable()
export class ZatcaSandboxSubmissionStateService {
  constructor(private readonly prisma: PrismaService) {}

  async reserve(input: ReserveZatcaSandboxSubmissionInput) {
    assertMetadataOnly(input);
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        return await this.prisma.$transaction((tx) => this.reserveInTransaction(tx, input), { isolationLevel: "Serializable" });
      } catch (error) {
        if (!isRetryableReservationConflict(error) || attempt === 2) throw error;
      }
    }
    throw new ZatcaSandboxSubmissionStateError("ZATCA_SANDBOX_STATE_NOT_ACCEPTABLE");
  }

  async accept(input: RecordZatcaSandboxAttemptInput) {
    assertMetadataOnly(input);
    return this.prisma.$transaction(async (tx) => {
      const state = await tx.zatcaSandboxSubmissionState.findFirst({
        where: { id: input.submissionStateId, organizationId: input.organizationId },
      });
      if (!state || !([ZatcaSandboxSubmissionStateStatus.RESERVED, ZatcaSandboxSubmissionStateStatus.UNCERTAIN] as ZatcaSandboxSubmissionStateStatus[]).includes(state.status)) {
        throw new ZatcaSandboxSubmissionStateError("ZATCA_SANDBOX_STATE_NOT_ACCEPTABLE");
      }
      await this.createAttempt(tx, input, ZatcaSandboxSubmissionStateStatus.ACCEPTED);
      return tx.zatcaSandboxSubmissionState.update({
        where: { id: state.id },
        data: { status: ZatcaSandboxSubmissionStateStatus.ACCEPTED, acceptedAt: new Date(), completedAt: new Date() },
      });
    }, { isolationLevel: "Serializable" });
  }

  async recordUncertain(input: RecordZatcaSandboxAttemptInput) {
    assertMetadataOnly(input);
    return this.prisma.$transaction(async (tx) => {
      const state = await tx.zatcaSandboxSubmissionState.findFirst({ where: { id: input.submissionStateId, organizationId: input.organizationId } });
      if (!state || state.status !== ZatcaSandboxSubmissionStateStatus.RESERVED) {
        throw new ZatcaSandboxSubmissionStateError("ZATCA_SANDBOX_STATE_NOT_ACCEPTABLE");
      }
      await this.createAttempt(tx, input, ZatcaSandboxSubmissionStateStatus.UNCERTAIN);
      return tx.zatcaSandboxSubmissionState.update({ where: { id: state.id }, data: { status: ZatcaSandboxSubmissionStateStatus.UNCERTAIN, completedAt: new Date() } });
    }, { isolationLevel: "Serializable" });
  }

  async releaseReservation(organizationId: string, submissionStateId: string) {
    return this.prisma.$transaction(async (tx) => {
      const state = await tx.zatcaSandboxSubmissionState.findFirst({ where: { id: submissionStateId, organizationId } });
      if (!state || state.status !== ZatcaSandboxSubmissionStateStatus.RESERVED) {
        throw new ZatcaSandboxSubmissionStateError("ZATCA_SANDBOX_STATE_NOT_ACCEPTABLE");
      }
      return tx.zatcaSandboxSubmissionState.delete({ where: { id: state.id } });
    }, { isolationLevel: "Serializable" });
  }

  async cleanupSyntheticProofRun(organizationId: string, proofRunId: string) {
    return this.prisma.$transaction(async (tx) => {
      const proofRun = await tx.zatcaSandboxProofRun.findFirst({
        where: { id: proofRunId, organizationId, syntheticDataVerified: true },
      });
      if (!proofRun) throw new ZatcaSandboxSubmissionStateError("ZATCA_SANDBOX_PROOF_RUN_NOT_FOUND");
      await tx.zatcaSandboxProofRun.delete({ where: { id: proofRun.id } });
      return { proofRunId: proofRun.id, cleanedUp: true as const };
    }, { isolationLevel: "Serializable" });
  }

  private async reserveInTransaction(tx: StateClient, input: ReserveZatcaSandboxSubmissionInput) {
    const proofRun = await tx.zatcaSandboxProofRun.findFirst({
      where: { id: input.proofRunId, organizationId: input.organizationId, egsUnitId: input.egsUnitId, status: "ACTIVE", syntheticDataVerified: true },
    });
    if (!proofRun) throw new ZatcaSandboxSubmissionStateError("ZATCA_SANDBOX_PROOF_RUN_NOT_FOUND");

    const existing = await tx.zatcaSandboxSubmissionState.findFirst({
      where: { organizationId: input.organizationId, sourceIdentityHash: input.sourceIdentityHash },
    });
    if (existing) {
      if (existing.payloadHash === input.payloadHash) return { disposition: "REPLAY" as const, state: existing };
      throw new ZatcaSandboxSubmissionStateError("ZATCA_SANDBOX_IDEMPOTENCY_CONFLICT");
    }

    const priorAccepted = await tx.zatcaSandboxSubmissionState.findFirst({
      where: { organizationId: input.organizationId, egsUnitId: input.egsUnitId, proofRunId: input.proofRunId, status: ZatcaSandboxSubmissionStateStatus.ACCEPTED },
      orderBy: { icv: "desc" },
    });
    if (priorAccepted && input.previousInvoiceHash !== priorAccepted.canonicalInvoiceHash) {
      throw new ZatcaSandboxSubmissionStateError("ZATCA_SANDBOX_PIH_MISMATCH");
    }

    const latestReservation = await tx.zatcaSandboxSubmissionState.findFirst({
      where: { organizationId: input.organizationId, egsUnitId: input.egsUnitId, proofRunId: input.proofRunId },
      orderBy: { icv: "desc" },
    });
    const state = await tx.zatcaSandboxSubmissionState.create({
      data: {
        ...input,
        icv: (latestReservation?.icv ?? 0) + 1,
        status: ZatcaSandboxSubmissionStateStatus.RESERVED,
      },
    });
    return { disposition: "RESERVED" as const, state };
  }

  private async createAttempt(tx: StateClient, input: RecordZatcaSandboxAttemptInput, status: ZatcaSandboxSubmissionStateStatus) {
    const latest = await tx.zatcaSandboxSubmissionAttempt.findFirst({
      where: { submissionStateId: input.submissionStateId, organizationId: input.organizationId },
      orderBy: { attemptNumber: "desc" },
    });
    return tx.zatcaSandboxSubmissionAttempt.create({
      data: {
        organizationId: input.organizationId,
        submissionStateId: input.submissionStateId,
        attemptNumber: (latest?.attemptNumber ?? 0) + 1,
        status,
        requestHash: input.requestHash,
        responseHash: input.responseHash,
        responseCode: input.responseCode,
        correlationId: input.correlationId,
        warningCodes: input.warningCodes,
        errorCodes: input.errorCodes,
        retryClassification: input.retryClassification ?? ZatcaSandboxRetryClassification.NOT_RETRYABLE,
        completedAt: new Date(),
      },
    });
  }
}

function isRetryableReservationConflict(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && ["P2002", "P2034"].includes(String(error.code));
}
