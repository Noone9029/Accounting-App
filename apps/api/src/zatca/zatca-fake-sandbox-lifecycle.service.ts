import { createHash } from "node:crypto";
import { ZatcaSandboxRetryClassification, ZatcaSandboxSubmissionOperation } from "@prisma/client";
import { FakeLoopbackZatcaSandboxAdapter } from "./adapters/fake-loopback-zatca-sandbox.adapter";
import { LoopbackZatcaProtocolError, LoopbackZatcaSandboxHttpClient } from "./adapters/loopback-zatca-sandbox-http";
import { type ReserveZatcaSandboxSubmissionInput, type RetryZatcaSandboxSubmissionInput, ZatcaSandboxSubmissionStateService } from "./zatca-sandbox-submission-state.service";

export interface RunFakeSandboxLifecycleInput {
  reservation: ReserveZatcaSandboxSubmissionInput;
  invoiceId: string;
  invoiceMetadataId: string;
  outcome: "ACCEPTED" | "TIMEOUT";
  correlationId: string;
  credential?: {
    status: "ACTIVE" | "EXPIRED" | "REVOKED";
    referenceId?: string;
    signingKeyReferenceId?: string;
    certificateFingerprint?: string;
    certificateSerialNumber?: string;
    legacyPlaintextPem?: boolean;
    provider?: "LOCAL_REFERENCE" | "PRODUCTION";
  };
}

/** In-process only: request and response bodies never enter state or evidence. */
export class ZatcaFakeSandboxLifecycleService {
  private readonly retryInProgress = new Set<string>();

  constructor(private readonly state: ZatcaSandboxSubmissionStateService, private readonly adapter: FakeLoopbackZatcaSandboxAdapter) {}

  async run(input: RunFakeSandboxLifecycleInput) {
    const reserved = await this.state.reserve(input.reservation);
    if (reserved.disposition === "REPLAY") return { disposition: "REPLAY" as const, stateId: reserved.state.id, adapter: this.adapter.getEvidence() };
    const requestHash = hash(`request:${reserved.state.id}`);
    if (input.outcome === "TIMEOUT") {
      await this.state.recordUncertain({ organizationId: input.reservation.organizationId, submissionStateId: reserved.state.id, requestHash, responseCode: "SIMULATED_TIMEOUT", correlationId: input.correlationId, retryClassification: ZatcaSandboxRetryClassification.RETRYABLE });
      return { disposition: "UNCERTAIN" as const, stateId: reserved.state.id, adapter: this.adapter.getEvidence() };
    }
    const response = await this.submit(input, reserved.state.id);
    await this.state.accept({ organizationId: input.reservation.organizationId, submissionStateId: reserved.state.id, requestHash, responseHash: hash(`response:${response.responseCode}`), responseCode: response.responseCode, correlationId: input.correlationId });
    return { disposition: "ACCEPTED" as const, stateId: reserved.state.id, adapter: this.adapter.getEvidence() };
  }

  async runOverLoopbackHttp(input: Omit<RunFakeSandboxLifecycleInput, "outcome">, client: LoopbackZatcaSandboxHttpClient) {
    const credentialFailure = credentialFailureCode(input.reservation, input.credential);
    if (credentialFailure) return { disposition: "REJECTED" as const, safeCode: credentialFailure };
    let reserved: Awaited<ReturnType<ZatcaSandboxSubmissionStateService["reserve"]>>;
    try { reserved = await this.state.reserve(input.reservation); }
    catch (error) {
      if (typeof error === "object" && error !== null && "code" in error && error.code === "ZATCA_SANDBOX_IDEMPOTENCY_CONFLICT") return { disposition: "CONFLICT" as const };
      throw error;
    }
    if (reserved.disposition === "REPLAY") return { disposition: "REPLAY" as const, stateId: reserved.state.id };
    const requestHash = hash(`request:${reserved.state.id}`);
    const route = input.reservation.operation === ZatcaSandboxSubmissionOperation.CLEARANCE ? "/loopback/clearance" : input.reservation.operation === ZatcaSandboxSubmissionOperation.REPORTING ? "/loopback/reporting" : "/loopback/compliance";
    let response: Awaited<ReturnType<LoopbackZatcaSandboxHttpClient["submit"]>>;
    try { response = await client.submit(route, { invoiceUuid: input.reservation.invoiceUuid, invoiceHash: input.reservation.canonicalInvoiceHash }); }
    catch (error) {
      const responseCode = error instanceof LoopbackZatcaProtocolError ? error.safeCode : "SIMULATED_PROTOCOL_FAILURE";
      await this.state.recordUncertain({ organizationId: input.reservation.organizationId, submissionStateId: reserved.state.id, requestHash, responseCode, correlationId: input.correlationId, errorCodes: [responseCode], retryClassification: ZatcaSandboxRetryClassification.RETRYABLE });
      return { disposition: "UNCERTAIN" as const, stateId: reserved.state.id };
    }
    const attempt = { organizationId: input.reservation.organizationId, submissionStateId: reserved.state.id, requestHash, responseHash: hash(`response:${response.responseCode}`), responseCode: response.responseCode, correlationId: input.correlationId, warningCodes: response.warningCodes, errorCodes: response.errorCodes, retryClassification: response.responseCode === "SIMULATED_RATE_LIMIT" ? ZatcaSandboxRetryClassification.RETRYABLE : ZatcaSandboxRetryClassification.NOT_RETRYABLE };
    if (/^SIMULATED_ACCEPTED/.test(response.responseCode)) {
      await this.state.accept(attempt);
      return { disposition: "ACCEPTED" as const, stateId: reserved.state.id };
    }
    if (["SIMULATED_RATE_LIMIT", "SIMULATED_SERVER_ERROR"].includes(response.responseCode)) {
      await this.state.recordUncertain(attempt);
      return { disposition: "UNCERTAIN" as const, stateId: reserved.state.id };
    }
    await this.state.reject(attempt);
    return { disposition: "REJECTED" as const, stateId: reserved.state.id };
  }

  async retryExactUncertainOverLoopbackHttp(input: RetryZatcaSandboxSubmissionInput & { correlationId: string }, client: LoopbackZatcaSandboxHttpClient) {
    const retryKey = `${input.organizationId}:${input.submissionStateId}`;
    if (this.retryInProgress.has(retryKey)) return { disposition: "RETRY_IN_PROGRESS" as const, stateId: input.submissionStateId };
    this.retryInProgress.add(retryKey);
    try {
      const state = await this.state.loadExactUncertainRetry(input);
      const route = state.operation === ZatcaSandboxSubmissionOperation.CLEARANCE ? "/loopback/clearance" : state.operation === ZatcaSandboxSubmissionOperation.REPORTING ? "/loopback/reporting" : "/loopback/compliance";
      const requestHash = hash(`retry-request:${state.id}`);
      try {
        const response = await client.submit(route, { invoiceUuid: state.invoiceUuid, invoiceHash: state.canonicalInvoiceHash });
        const attempt = { organizationId: input.organizationId, submissionStateId: state.id, requestHash, responseHash: hash(`response:${response.responseCode}`), responseCode: response.responseCode, correlationId: input.correlationId, warningCodes: response.warningCodes, errorCodes: response.errorCodes, retryClassification: ["SIMULATED_RATE_LIMIT", "SIMULATED_SERVER_ERROR"].includes(response.responseCode) ? ZatcaSandboxRetryClassification.RETRYABLE : ZatcaSandboxRetryClassification.NOT_RETRYABLE };
        if (/^SIMULATED_ACCEPTED/.test(response.responseCode)) { await this.state.accept(attempt); return { disposition: "ACCEPTED" as const, stateId: state.id }; }
        if (["SIMULATED_RATE_LIMIT", "SIMULATED_SERVER_ERROR"].includes(response.responseCode)) { await this.state.recordUncertain(attempt); return { disposition: "UNCERTAIN" as const, stateId: state.id }; }
        await this.state.reject(attempt); return { disposition: "REJECTED" as const, stateId: state.id };
      } catch (error) {
        const responseCode = error instanceof LoopbackZatcaProtocolError ? error.safeCode : "SIMULATED_PROTOCOL_FAILURE";
        await this.state.recordUncertain({ organizationId: input.organizationId, submissionStateId: state.id, requestHash, responseCode, correlationId: input.correlationId, errorCodes: [responseCode], retryClassification: ZatcaSandboxRetryClassification.RETRYABLE });
        return { disposition: "UNCERTAIN" as const, stateId: state.id };
      }
    } finally {
      this.retryInProgress.delete(retryKey);
    }
  }

  private submit(input: RunFakeSandboxLifecycleInput, stateId: string) {
    const base = { organizationId: input.reservation.organizationId, invoiceId: input.invoiceId, invoiceMetadataId: input.invoiceMetadataId, egsUnitId: input.reservation.egsUnitId, invoiceXml: "", request: { invoiceUuid: input.reservation.invoiceUuid, invoiceHash: input.reservation.canonicalInvoiceHash } };
    if (input.reservation.operation === ZatcaSandboxSubmissionOperation.CLEARANCE) return this.adapter.submitClearance(base);
    if (input.reservation.operation === ZatcaSandboxSubmissionOperation.REPORTING) return this.adapter.submitReporting(base);
    void stateId;
    return this.adapter.submitComplianceCheck(base);
  }
}

function credentialFailureCode(reservation: ReserveZatcaSandboxSubmissionInput, credential: RunFakeSandboxLifecycleInput["credential"]): string | undefined {
  if (!credential) return undefined;
  if (credential.status === "EXPIRED") return "SIMULATED_CREDENTIAL_EXPIRED";
  if (credential.status === "REVOKED") return "SIMULATED_CREDENTIAL_REVOKED";
  if (!credential.referenceId || !credential.signingKeyReferenceId) return "SIMULATED_CREDENTIAL_REFERENCE_MISSING";
  if (credential.provider === "PRODUCTION") return "SIMULATED_CUSTODY_PROVIDER_REJECTED";
  if (credential.legacyPlaintextPem) return "SIMULATED_LEGACY_PEM_REJECTED";
  if (reservation.credentialReferenceId && credential.referenceId !== reservation.credentialReferenceId) return "SIMULATED_CREDENTIAL_REFERENCE_MISMATCH";
  if (reservation.signingKeyReferenceId && credential.signingKeyReferenceId !== reservation.signingKeyReferenceId) return "SIMULATED_SIGNING_KEY_REFERENCE_MISMATCH";
  if (reservation.certificateFingerprint && credential.certificateFingerprint !== reservation.certificateFingerprint) return "SIMULATED_CERTIFICATE_FINGERPRINT_MISMATCH";
  if (reservation.certificateSerialNumber && credential.certificateSerialNumber !== reservation.certificateSerialNumber) return "SIMULATED_CERTIFICATE_SERIAL_MISMATCH";
  return undefined;
}

function hash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
