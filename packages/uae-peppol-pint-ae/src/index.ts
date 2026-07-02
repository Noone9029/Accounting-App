import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import {
  UAE_ELECTRONIC_ADDRESS_SCHEME_ID,
  UAE_PINT_AE_CUSTOMIZATION_ID,
  UAE_PINT_AE_PREDEFINED_ENDPOINT_VALUES,
  UAE_PINT_AE_PROFILE_ID,
  buildUaePintAeTransactionTypeFlagCode,
  deriveUaePintAeEndpointId,
  isValidUaePintAeEndpointId,
  resolveUaePintAeTransactionTypeFlagCode,
} from "./pint-ae/constants";
import { serializeUaePintAeDocument } from "./pint-ae/serializer";
import type { UaePintAeDocumentInput, UaePintAePredefinedEndpointScenario, UaePintAeTransactionTypeFlag } from "./pint-ae/types";

export * from "./pint-ae/constants";
export * from "./pint-ae/fixture-suite";
export * from "./pint-ae/fixtures";
export * from "./pint-ae/rules";
export * from "./pint-ae/serializer";
export * from "./pint-ae/types";

export type UaePintDocumentKind = "invoice" | "credit-note";

export type AspProviderKey = "DISABLED" | "MOCK" | "FUTURE_COMPLYANCE" | "FUTURE_CLEARTAX" | "FUTURE_EDICOM" | "FUTURE_GENERIC_ASP";
export type AspProviderMode = "DISABLED" | "MOCK" | "FUTURE";
export type AspProviderCapability =
  | "LOCAL_READINESS_VALIDATION"
  | "MOCK_VALIDATION"
  | "MOCK_SUBMISSION"
  | "STATUS_LOOKUP"
  | "WEBHOOK_SIGNATURE_VERIFICATION"
  | "EVIDENCE_DOWNLOAD";
export type AspProviderNormalizedStatus =
  | "DISABLED"
  | "NOT_CONFIGURED"
  | "READY_FOR_LOCAL_VALIDATION"
  | "LOCAL_VALIDATION_FAILED"
  | "READY_LOCAL_ONLY"
  | "BLOCKED_NO_ASP"
  | "QUEUED_MOCK"
  | "SUBMITTED_MOCK"
  | "ACCEPTED_MOCK"
  | "REJECTED_MOCK"
  | "FAILED_MOCK"
  | "PROVIDER_PENDING"
  | "PROVIDER_REJECTED"
  | "PROVIDER_ACCEPTED"
  | "FTA_REPORTED"
  | "INBOUND_RECEIVED"
  | "RETRYABLE_ERROR"
  | "TERMINAL_ERROR"
  | "ARCHIVED";

export interface AspProviderConfig {
  providerKey?: AspProviderKey | null;
  mode?: AspProviderMode | null;
  mockModeEnabled?: boolean | null;
  endpointUrl?: string | null;
  apiKey?: string | null;
  secret?: string | null;
  webhookSecret?: string | null;
  metadata?: Record<string, unknown> | null;
}

export const UAE_PINT_AE_SERIALIZER_MODES = {
  READINESS_ONLY: "READINESS_ONLY",
  OFFICIAL_DRAFT_LOCAL_ONLY: "OFFICIAL_DRAFT_LOCAL_ONLY",
  PROVIDER_SUBMISSION_BLOCKED: "PROVIDER_SUBMISSION_BLOCKED",
} as const;

export type UaePintAeSerializerMode = (typeof UAE_PINT_AE_SERIALIZER_MODES)[keyof typeof UAE_PINT_AE_SERIALIZER_MODES];

export type UaeTransmissionStatus =
  | "DRAFT"
  | "VALIDATION_FAILED"
  | "READY_LOCAL_ONLY"
  | "BLOCKED_NO_ASP"
  | "QUEUED_MOCK"
  | "SUBMITTED_MOCK"
  | "ACCEPTED_MOCK"
  | "REJECTED_MOCK"
  | "FAILED_MOCK"
  | "PROVIDER_PENDING"
  | "PROVIDER_REJECTED"
  | "PROVIDER_ACCEPTED"
  | "FTA_REPORTED"
  | "INBOUND_RECEIVED";

export const UAE_TRANSMISSION_STATUSES: UaeTransmissionStatus[] = [
  "DRAFT",
  "VALIDATION_FAILED",
  "READY_LOCAL_ONLY",
  "BLOCKED_NO_ASP",
  "QUEUED_MOCK",
  "SUBMITTED_MOCK",
  "ACCEPTED_MOCK",
  "REJECTED_MOCK",
  "FAILED_MOCK",
  "PROVIDER_PENDING",
  "PROVIDER_REJECTED",
  "PROVIDER_ACCEPTED",
  "FTA_REPORTED",
  "INBOUND_RECEIVED",
];

export const ASP_PROVIDER_ERROR_CODES = [
  "AUTHENTICATION_FAILED",
  "RATE_LIMITED",
  "VALIDATION_FAILED",
  "DUPLICATE_DOCUMENT",
  "RECEIVER_NOT_FOUND",
  "ENDPOINT_NOT_REGISTERED",
  "PROVIDER_UNAVAILABLE",
  "SIGNATURE_INVALID",
  "REPLAY_DETECTED",
  "UNKNOWN_PROVIDER_ERROR",
  "CONFIGURATION_MISSING",
  "ASP_ACCESS_REQUIRED",
] as const;

export type AspProviderErrorCode = (typeof ASP_PROVIDER_ERROR_CODES)[number];

export interface UaeAspProviderCapabilityFlags {
  supportsSandbox: boolean;
  supportsWebhooks: boolean;
  supportsInboundInvoices: boolean;
  supportsStatusPolling: boolean;
  supportsTaxDataReporting: boolean;
  requiresClientCertificate: boolean;
  requiresHmacSignature: boolean;
  networkEnabled: false;
  productionEnabled: false;
}

export const UAE_ASP_PROVIDER_CAPABILITY_FLAGS: Record<"disabled" | "mock" | "future", UaeAspProviderCapabilityFlags> = {
  disabled: {
    supportsSandbox: false,
    supportsWebhooks: false,
    supportsInboundInvoices: false,
    supportsStatusPolling: false,
    supportsTaxDataReporting: false,
    requiresClientCertificate: false,
    requiresHmacSignature: false,
    networkEnabled: false,
    productionEnabled: false,
  },
  mock: {
    supportsSandbox: true,
    supportsWebhooks: true,
    supportsInboundInvoices: false,
    supportsStatusPolling: true,
    supportsTaxDataReporting: false,
    requiresClientCertificate: false,
    requiresHmacSignature: true,
    networkEnabled: false,
    productionEnabled: false,
  },
  future: {
    supportsSandbox: false,
    supportsWebhooks: false,
    supportsInboundInvoices: false,
    supportsStatusPolling: false,
    supportsTaxDataReporting: false,
    requiresClientCertificate: false,
    requiresHmacSignature: false,
    networkEnabled: false,
    productionEnabled: false,
  },
};

export type AspProviderOperation = "validate" | "submit" | "status" | "webhook" | "evidence";

export interface AspIdempotencyKeyInput {
  tenantId: string;
  providerKey: AspProviderKey;
  operation: AspProviderOperation;
  documentId?: string | null;
  documentNumber?: string | null;
  payloadFingerprint?: string | null;
}

export interface AspSubmissionOutboxDraft {
  tenantId: string;
  providerKey: AspProviderKey;
  documentId: string;
  operation: AspProviderOperation;
  idempotencyKey: string;
  status: "DRAFT_ONLY" | "READY_FOR_FUTURE_PROVIDER";
  noNetwork: true;
  productionCompliance: false;
}

export interface AspWebhookSignatureInput {
  payload: unknown;
  signature: string | null | undefined;
  secret: string | null | undefined;
}

export interface AspWebhookReplayResult {
  accepted: boolean;
  eventId: string;
  reason: "RECORDED" | "DUPLICATE" | "MISSING_EVENT_ID" | "STALE_TIMESTAMP" | "INVALID_TIMESTAMP";
}

export interface AspWebhookReplayGuard {
  checkAndRemember(eventId: string | null | undefined): AspWebhookReplayResult;
}

export interface AspProviderErrorInput {
  providerKey?: AspProviderKey | null;
  statusCode?: number | null;
  code?: string | null;
  message?: string | null;
  retryable?: boolean | null;
  details?: Record<string, unknown> | null;
}

export interface AspProviderNormalizedError {
  providerKey: AspProviderKey;
  status: Extract<AspProviderNormalizedStatus, "RETRYABLE_ERROR" | "TERMINAL_ERROR">;
  retryable: boolean;
  code: string;
  message: string;
  details: Record<string, unknown> | null;
  noNetwork: true;
  productionCompliance: false;
}

export interface AspProviderOperationInput {
  tenantId: string;
  documentId?: string | null;
  documentNumber?: string | null;
  payload?: unknown;
  scenario?: "VALIDATION_SUCCESS" | "VALIDATION_FAILURE" | "SUBMISSION_ACCEPTED" | "SUBMISSION_REJECTED" | null;
  explicitMockMode?: boolean | null;
}

export interface AspProviderBaseResult {
  providerKey: AspProviderKey;
  mode: AspProviderMode;
  status: AspProviderNormalizedStatus;
  ok: boolean;
  mockOnly: boolean;
  noNetwork: true;
  productionCompliance: false;
  message: string;
  issues: string[];
}

export interface AspProviderValidationResult extends AspProviderBaseResult {
  validatorKey: string;
}

export interface AspProviderSubmissionResult extends AspProviderBaseResult {
  externalReference: string | null;
}

export interface AspProviderStatusResult extends AspProviderBaseResult {
  timeline: Array<{ status: AspProviderNormalizedStatus; message: string }>;
}

export interface AspProviderWebhookResult extends AspProviderBaseResult {
  accepted: boolean;
}

export interface AspProviderEvidenceResult extends AspProviderBaseResult {
  available: boolean;
  filename: string | null;
}

export interface AspProviderHealthResult extends AspProviderBaseResult {
  capabilities: AspProviderCapability[];
}

export interface AspProviderAdapter {
  readonly providerKey: AspProviderKey;
  readonly mode: AspProviderMode;
  getProviderId(): AspProviderKey;
  getDisplayName(): string;
  listCapabilities(): AspProviderCapability[];
  getCapabilities(): UaeAspProviderCapabilityFlags;
  validateConfig(config?: AspProviderConfig | null): AspProviderValidationResult;
  prepareSubmission(input: AspProviderOperationInput): Promise<AspProviderSubmissionResult>;
  submitInvoice(input: AspProviderOperationInput): Promise<AspProviderSubmissionResult>;
  submitCreditNote(input: AspProviderOperationInput): Promise<AspProviderSubmissionResult>;
  validateDocument(input: AspProviderOperationInput): Promise<AspProviderValidationResult>;
  submitDocument(input: AspProviderOperationInput): Promise<AspProviderSubmissionResult>;
  getTransmissionStatus(input: AspProviderOperationInput): Promise<AspProviderStatusResult>;
  getDocumentStatus(input: AspProviderOperationInput): Promise<AspProviderStatusResult>;
  parseWebhook(payload: unknown): Promise<AspProviderWebhookResult>;
  verifyWebhookSignature(payload: unknown, signature: string | null | undefined): Promise<boolean>;
  normalizeWebhookEvent(payload: unknown): NormalizedUaeWebhookEvent;
  normalizeError(input: AspProviderErrorInput): UaeProviderNormalizedError;
  redactConfig(config?: AspProviderConfig | null): Record<string, unknown>;
  isNetworkEnabled(): false;
  downloadEvidence(input: AspProviderOperationInput): Promise<AspProviderEvidenceResult>;
  healthCheck(): Promise<AspProviderHealthResult>;
}

export const ASP_PROVIDER_KEYS: AspProviderKey[] = ["DISABLED", "MOCK", "FUTURE_COMPLYANCE", "FUTURE_CLEARTAX", "FUTURE_EDICOM", "FUTURE_GENERIC_ASP"];
export const ASP_PROVIDER_STATUSES: AspProviderNormalizedStatus[] = [
  "DISABLED",
  "NOT_CONFIGURED",
  "READY_FOR_LOCAL_VALIDATION",
  "LOCAL_VALIDATION_FAILED",
  "READY_LOCAL_ONLY",
  "BLOCKED_NO_ASP",
  "QUEUED_MOCK",
  "SUBMITTED_MOCK",
  "ACCEPTED_MOCK",
  "REJECTED_MOCK",
  "FAILED_MOCK",
  "PROVIDER_PENDING",
  "PROVIDER_REJECTED",
  "PROVIDER_ACCEPTED",
  "FTA_REPORTED",
  "INBOUND_RECEIVED",
  "RETRYABLE_ERROR",
  "TERMINAL_ERROR",
  "ARCHIVED",
];
export const DISABLED_PROVIDER_EMITTED_STATUSES: AspProviderNormalizedStatus[] = ["DISABLED", "NOT_CONFIGURED"];

export interface UaeEndpointSchemeValidationResult {
  valid: boolean;
  schemeId: typeof UAE_ELECTRONIC_ADDRESS_SCHEME_ID | "";
  normalizedEndpointId: string;
  issues: string[];
}

export interface UaeSerializerBoundaryResult {
  mode: UaePintAeSerializerMode;
  xml: string;
  validation: UaeValidationReport | ReturnType<typeof serializeUaePintAeDocument>["validation"];
  productionCompliance: false;
  networkReady: false;
  aspSubmissionReady: false;
  officialSerializerComplete: false;
}

export interface UaeOfficialDraftPayload extends UaeSerializerBoundaryResult {
  mode: "OFFICIAL_DRAFT_LOCAL_ONLY";
  metadata: ReturnType<typeof serializeUaePintAeDocument>["metadata"];
  submission: {
    mode: "PROVIDER_SUBMISSION_BLOCKED";
    canSubmit: false;
    reason: "ASP_ACCESS_REQUIRED";
  };
}

export interface UaeBusinessProcessMetadata {
  customizationId: typeof UAE_PINT_AE_CUSTOMIZATION_ID;
  profileId: typeof UAE_PINT_AE_PROFILE_ID;
  endpointSchemeId: typeof UAE_ELECTRONIC_ADDRESS_SCHEME_ID;
  endpoint: {
    scenario: UaePintAePredefinedEndpointScenario | null;
    value: string | null;
  };
  transactionTypeFlagCode: string;
  productionCompliance: false;
  noNetwork: true;
  noFtaReporting: true;
}

export interface UaeTransmissionDraft {
  tenantId: string;
  documentId: string;
  documentNumber?: string | null;
  providerKey: AspProviderKey;
  status: Extract<UaeTransmissionStatus, "DRAFT">;
  idempotencyKey: string;
  noNetwork: true;
  productionCompliance: false;
}

export interface UaeTransmissionAttemptDraft {
  draftIdempotencyKey: string;
  attemptNumber: number;
  status: UaeTransmissionStatus;
  noNetwork: true;
  productionCompliance: false;
}

export interface UaeTransmissionTimelineEvent {
  status: UaeTransmissionStatus;
  providerKey: AspProviderKey;
  message: string;
  mockOnly: boolean;
  productionCompliance: false;
  noNetwork: true;
}

export interface UaeWebhookReplayGuardInput {
  eventId: string | null | undefined;
  timestamp: string | Date | null | undefined;
  signatureHash: string | null | undefined;
}

export interface UaeWebhookReplayGuardOptions {
  now?: Date;
  maxAgeSeconds?: number;
  initialEventKeys?: string[];
}

export interface UaeWebhookReplayGuard {
  checkAndRemember(input: UaeWebhookReplayGuardInput): AspWebhookReplayResult;
}

export interface ParsedUaeWebhookEvent {
  providerKey: AspProviderKey;
  eventId: string;
  status: UaeTransmissionStatus;
  documentId: string | null;
  receivedAt: string;
  payload: Record<string, unknown>;
}

export interface NormalizedUaeWebhookEvent {
  providerKey: AspProviderKey;
  eventId: string;
  status: UaeTransmissionStatus;
  documentId: string | null;
  rawBodyHash: string;
  signatureHash: string;
  redactedPayload: Record<string, unknown>;
  productionCompliance: false;
  noNetwork: true;
}

export interface UaeProviderNormalizedError {
  providerKey: AspProviderKey;
  code: AspProviderErrorCode;
  retryable: boolean;
  userMessage: string;
  details: Record<string, unknown> | null;
  noNetwork: true;
  productionCompliance: false;
}

export function isOfficialUaeCustomizationId(value: string | null | undefined): boolean {
  return String(value ?? "").trim() === UAE_PINT_AE_CUSTOMIZATION_ID;
}

export function isOfficialUaeProfileId(value: string | null | undefined): boolean {
  return String(value ?? "").trim() === UAE_PINT_AE_PROFILE_ID;
}

export function normalizeUaeEndpointId(value: string | null | undefined): string {
  const raw = String(value ?? "").trim();
  if (!raw) {
    return "";
  }
  const digits = raw.replace(/\D/g, "");
  return digits.startsWith(UAE_ELECTRONIC_ADDRESS_SCHEME_ID) ? digits : raw;
}

export function deriveUaeParticipantIdFromTin(tin: string | null | undefined): string {
  return deriveUaePintAeEndpointId(tin);
}

export function validateUaeEndpointScheme(value: string | null | undefined): UaeEndpointSchemeValidationResult {
  const normalizedEndpointId = normalizeUaeEndpointId(value);
  const valid = isValidUaePintAeEndpointId(normalizedEndpointId);
  return {
    valid,
    schemeId: valid ? UAE_ELECTRONIC_ADDRESS_SCHEME_ID : "",
    normalizedEndpointId,
    issues: valid ? [] : ["UAE_ENDPOINT_SCHEME_0235_REQUIRED"],
  };
}

export function validateCreditNoteReferenceRequirement(input: { kind: UaePintDocumentKind; creditNoteReason?: string | null; originalInvoiceNumber?: string | null }): { valid: boolean; issues: string[] } {
  if (input.kind !== "credit-note") {
    return { valid: true, issues: [] };
  }
  const issues = [
    String(input.creditNoteReason ?? "").trim() ? null : "CREDIT_NOTE_REASON_REQUIRED",
    String(input.originalInvoiceNumber ?? "").trim() ? null : "CREDIT_NOTE_ORIGINAL_REFERENCE_REQUIRED",
  ].filter((issue): issue is string => Boolean(issue));
  return { valid: issues.length === 0, issues };
}

export function validateNoNegativeInvoice(input: { kind: UaePintDocumentKind; total: string | number }): { valid: boolean; issues: string[] } {
  const invalid = input.kind === "invoice" && Number(input.total) < 0;
  return { valid: !invalid, issues: invalid ? ["NEGATIVE_INVOICE_TOTAL_BLOCKED"] : [] };
}

export function classifyUaePredefinedEndpointScenario(value: string | null | undefined): UaePintAePredefinedEndpointScenario | null {
  const normalized = String(value ?? "").trim();
  const found = Object.entries(UAE_PINT_AE_PREDEFINED_ENDPOINT_VALUES).find(([, endpointValue]) => endpointValue === normalized);
  return found ? (found[0] as UaePintAePredefinedEndpointScenario) : null;
}

export function buildUaeBusinessProcessMetadata(input: { predefinedEndpointScenario?: UaePintAePredefinedEndpointScenario | null; transactionTypeFlags?: UaePintAeTransactionTypeFlag[] | null; transactionTypeFlagCode?: string | null }): UaeBusinessProcessMetadata {
  const scenario = input.predefinedEndpointScenario ?? null;
  return {
    customizationId: UAE_PINT_AE_CUSTOMIZATION_ID,
    profileId: UAE_PINT_AE_PROFILE_ID,
    endpointSchemeId: UAE_ELECTRONIC_ADDRESS_SCHEME_ID,
    endpoint: {
      scenario,
      value: scenario ? UAE_PINT_AE_PREDEFINED_ENDPOINT_VALUES[scenario] : null,
    },
    transactionTypeFlagCode: input.transactionTypeFlagCode?.trim() || buildUaePintAeTransactionTypeFlagCode(input.transactionTypeFlags),
    productionCompliance: false,
    noNetwork: true,
    noFtaReporting: true,
  };
}

export function buildReadinessXml(input: UaePintDocumentInput): UaeSerializerBoundaryResult {
  const result = buildUaePintXml(input);
  return {
    mode: UAE_PINT_AE_SERIALIZER_MODES.READINESS_ONLY,
    xml: result.xml,
    validation: result.validation,
    productionCompliance: false,
    networkReady: false,
    aspSubmissionReady: false,
    officialSerializerComplete: false,
  };
}

export function buildOfficialPintAeDraftPayload(input: UaePintAeDocumentInput): UaeOfficialDraftPayload {
  const result = serializeUaePintAeDocument(input);
  return {
    mode: UAE_PINT_AE_SERIALIZER_MODES.OFFICIAL_DRAFT_LOCAL_ONLY,
    xml: result.xml,
    validation: result.validation,
    metadata: result.metadata,
    productionCompliance: false,
    networkReady: false,
    aspSubmissionReady: false,
    officialSerializerComplete: false,
    submission: {
      mode: UAE_PINT_AE_SERIALIZER_MODES.PROVIDER_SUBMISSION_BLOCKED,
      canSubmit: false,
      reason: "ASP_ACCESS_REQUIRED",
    },
  };
}

export function isUaeMockTransmissionStatus(status: string): boolean {
  return status === "QUEUED_MOCK" || status === "SUBMITTED_MOCK" || status === "ACCEPTED_MOCK" || status === "REJECTED_MOCK" || status === "FAILED_MOCK";
}

export function isProductionProviderSuccessStatus(status: string): boolean {
  return status === "PROVIDER_ACCEPTED" || status === "FTA_REPORTED" || status === "INBOUND_RECEIVED";
}

export function assertUaeTransmissionStatusAllowedForProviderMode(mode: AspProviderMode, status: UaeTransmissionStatus): { allowed: boolean; reason: string | null } {
  if (mode === "DISABLED") {
    return status === "BLOCKED_NO_ASP" || status === "DRAFT" || status === "VALIDATION_FAILED" || status === "READY_LOCAL_ONLY"
      ? { allowed: true, reason: null }
      : { allowed: false, reason: "DISABLED_PROVIDER_CANNOT_EMIT_PROVIDER_OR_MOCK_STATUS" };
  }
  if (mode === "MOCK") {
    return isProductionProviderSuccessStatus(status) || status === "PROVIDER_PENDING" || status === "PROVIDER_REJECTED"
      ? { allowed: false, reason: "MOCK_PROVIDER_CANNOT_EMIT_REAL_PROVIDER_STATUS" }
      : { allowed: true, reason: null };
  }
  return { allowed: false, reason: "REAL_PROVIDER_MODE_REQUIRES_APPROVED_ASP_ACCESS" };
}

export function createUaeTransmissionDraft(input: { tenantId: string; documentId: string; documentNumber?: string | null; providerKey: AspProviderKey; payloadFingerprint?: string | null }): UaeTransmissionDraft {
  return {
    tenantId: input.tenantId,
    documentId: input.documentId,
    documentNumber: input.documentNumber ?? null,
    providerKey: input.providerKey,
    status: "DRAFT",
    idempotencyKey: buildAspIdempotencyKey({
      tenantId: input.tenantId,
      providerKey: input.providerKey,
      operation: "submit",
      documentId: input.documentId,
      documentNumber: input.documentNumber ?? null,
      payloadFingerprint: input.payloadFingerprint ?? null,
    }),
    noNetwork: true,
    productionCompliance: false,
  };
}

export function createUaeTransmissionAttemptDraft(input: { draft: UaeTransmissionDraft; attemptNumber: number; status?: UaeTransmissionStatus }): UaeTransmissionAttemptDraft {
  return {
    draftIdempotencyKey: input.draft.idempotencyKey,
    attemptNumber: input.attemptNumber,
    status: input.status ?? "QUEUED_MOCK",
    noNetwork: true,
    productionCompliance: false,
  };
}

export function createUaeTransmissionTimelineEvent(input: { status: UaeTransmissionStatus; providerKey: AspProviderKey; message: string }): UaeTransmissionTimelineEvent {
  return {
    status: input.status,
    providerKey: input.providerKey,
    message: input.message,
    mockOnly: isUaeMockTransmissionStatus(input.status),
    noNetwork: true,
    productionCompliance: false,
  };
}

export function buildAspIdempotencyKey(input: AspIdempotencyKeyInput): string {
  const material = [
    input.tenantId,
    input.providerKey,
    input.operation,
    input.documentId ?? "",
    input.documentNumber ?? "",
    input.payloadFingerprint ?? "",
  ].join("|");
  return `aspidem_${createHash("sha256").update(material).digest("hex").slice(0, 48)}`;
}

export function createAspSubmissionOutboxDraft(input: Omit<AspSubmissionOutboxDraft, "idempotencyKey" | "status" | "noNetwork" | "productionCompliance">): AspSubmissionOutboxDraft {
  return {
    ...input,
    idempotencyKey: buildAspIdempotencyKey({
      tenantId: input.tenantId,
      providerKey: input.providerKey,
      operation: input.operation,
      documentId: input.documentId,
    }),
    status: "DRAFT_ONLY",
    noNetwork: true,
    productionCompliance: false,
  };
}

export function signLocalAspWebhookPayload(payload: unknown, secret: string): string {
  return `sha256=${createHmac("sha256", secret).update(stableJson(payload)).digest("hex")}`;
}

export function signFakeWebhookPayload(input: { payload: unknown; secret: string; timestamp: string }): string {
  return `sha256=${createHmac("sha256", input.secret).update(`${input.timestamp}.${stableJson(input.payload)}`).digest("hex")}`;
}

export function verifyLocalAspWebhookSignature(input: AspWebhookSignatureInput): boolean {
  const webhookSecretValue = String(input.secret ?? "");
  const signature = String(input.signature ?? "");
  if (!webhookSecretValue || !signature) {
    return false;
  }
  const expected = signLocalAspWebhookPayload(input.payload, webhookSecretValue);
  const normalizedSignature = signature.startsWith("sha256=") ? signature : `sha256=${signature}`;
  const expectedBytes = Buffer.from(expected);
  const signatureBytes = Buffer.from(normalizedSignature);
  return expectedBytes.length === signatureBytes.length && timingSafeEqual(expectedBytes, signatureBytes);
}

export function verifyWebhookSignature(input: { payload: unknown; signature: string | null | undefined; secret: string | null | undefined; timestamp: string | null | undefined }): boolean {
  const webhookSecretValue = String(input.secret ?? "");
  const signature = String(input.signature ?? "");
  const timestamp = String(input.timestamp ?? "");
  if (!webhookSecretValue || !signature || !timestamp) {
    return false;
  }
  const expected = signFakeWebhookPayload({ payload: input.payload, secret: webhookSecretValue, timestamp });
  const normalizedSignature = signature.startsWith("sha256=") ? signature : `sha256=${signature}`;
  const expectedBytes = Buffer.from(expected);
  const signatureBytes = Buffer.from(normalizedSignature);
  return expectedBytes.length === signatureBytes.length && timingSafeEqual(expectedBytes, signatureBytes);
}

export function createInMemoryAspWebhookReplayGuard(initialEventIds: string[] = []): AspWebhookReplayGuard {
  const seen = new Set(initialEventIds.filter((eventId) => eventId.trim()));
  return {
    checkAndRemember(eventId: string | null | undefined): AspWebhookReplayResult {
      const normalizedEventId = String(eventId ?? "").trim();
      if (!normalizedEventId) {
        return { accepted: false, eventId: "", reason: "MISSING_EVENT_ID" };
      }
      if (seen.has(normalizedEventId)) {
        return { accepted: false, eventId: normalizedEventId, reason: "DUPLICATE" };
      }
      seen.add(normalizedEventId);
      return { accepted: true, eventId: normalizedEventId, reason: "RECORDED" };
    },
  };
}

export function createInMemoryUaeWebhookReplayGuard(options: UaeWebhookReplayGuardOptions = {}): UaeWebhookReplayGuard {
  const seen = new Set(options.initialEventKeys ?? []);
  const now = options.now ?? new Date();
  const maxAgeSeconds = options.maxAgeSeconds ?? 300;
  return {
    checkAndRemember(input: UaeWebhookReplayGuardInput): AspWebhookReplayResult {
      const eventId = String(input.eventId ?? "").trim();
      if (!eventId) {
        return { accepted: false, eventId: "", reason: "MISSING_EVENT_ID" };
      }
      const timestamp = input.timestamp instanceof Date ? input.timestamp : new Date(String(input.timestamp ?? ""));
      if (Number.isNaN(timestamp.getTime())) {
        return { accepted: false, eventId, reason: "INVALID_TIMESTAMP" };
      }
      const ageSeconds = Math.abs(now.getTime() - timestamp.getTime()) / 1000;
      if (ageSeconds > maxAgeSeconds) {
        return { accepted: false, eventId, reason: "STALE_TIMESTAMP" };
      }
      const key = `${eventId}:${String(input.signatureHash ?? "")}`;
      if (seen.has(key)) {
        return { accepted: false, eventId, reason: "DUPLICATE" };
      }
      seen.add(key);
      return { accepted: true, eventId, reason: "RECORDED" };
    },
  };
}

export function parseWebhookEvent(payload: unknown): ParsedUaeWebhookEvent {
  const record = isRecord(payload) ? payload : {};
  const providerKey = record.provider === "MOCK" ? "MOCK" : "DISABLED";
  const status = typeof record.status === "string" && UAE_TRANSMISSION_STATUSES.includes(record.status as UaeTransmissionStatus) ? (record.status as UaeTransmissionStatus) : "FAILED_MOCK";
  return {
    providerKey,
    eventId: String(record.eventId ?? ""),
    status,
    documentId: typeof record.documentId === "string" ? record.documentId : null,
    receivedAt: typeof record.receivedAt === "string" ? record.receivedAt : "1970-01-01T00:00:00.000Z",
    payload: record,
  };
}

export function normalizeWebhookEvent(event: ParsedUaeWebhookEvent): NormalizedUaeWebhookEvent {
  const rawBody = typeof event.payload.rawBody === "string" ? event.payload.rawBody : stableJson(event.payload);
  const signatureSource = `${event.eventId}:${event.status}:${rawBody}`;
  return {
    providerKey: event.providerKey,
    eventId: event.eventId,
    status: event.status,
    documentId: event.documentId,
    rawBodyHash: createHash("sha256").update(rawBody).digest("hex"),
    signatureHash: createHash("sha256").update(signatureSource).digest("hex"),
    redactedPayload: redactObject(event.payload) ?? {},
    productionCompliance: false,
    noNetwork: true,
  };
}

export function normalizeAspProviderError(input: AspProviderErrorInput): AspProviderNormalizedError {
  const retryable = input.retryable ?? isRetryableStatusCode(input.statusCode ?? null);
  return baseResult({
    providerKey: input.providerKey ?? "DISABLED",
    status: retryable ? "RETRYABLE_ERROR" : "TERMINAL_ERROR",
    retryable,
    code: String(input.code ?? "ASP_PROVIDER_ERROR"),
    message: String(input.message ?? "ASP provider error normalized locally; no production provider call was attempted."),
    details: redactObject(input.details ?? null),
  });
}

export function normalizeUaeProviderError(input: AspProviderErrorInput): UaeProviderNormalizedError {
  const code = classifyProviderErrorCode(input);
  return {
    providerKey: input.providerKey ?? "DISABLED",
    code,
    retryable: code === "RATE_LIMITED" || code === "PROVIDER_UNAVAILABLE" || isRetryableStatusCode(input.statusCode ?? null),
    userMessage: providerUserMessage(code),
    details: redactObject(input.details ?? null),
    noNetwork: true,
    productionCompliance: false,
  };
}

export class DisabledAspProviderAdapter implements AspProviderAdapter {
  readonly providerKey = "DISABLED" as const;
  readonly mode = "DISABLED" as const;

  getProviderId(): AspProviderKey {
    return this.providerKey;
  }

  getDisplayName(): string {
    return "Disabled UAE ASP provider";
  }

  listCapabilities(): AspProviderCapability[] {
    return ["LOCAL_READINESS_VALIDATION"];
  }

  getCapabilities(): UaeAspProviderCapabilityFlags {
    return UAE_ASP_PROVIDER_CAPABILITY_FLAGS.disabled;
  }

  validateConfig(config?: AspProviderConfig | null): AspProviderValidationResult {
    const hasEndpoint = Boolean(String(config?.endpointUrl ?? "").trim());
    return baseResult({
      providerKey: this.providerKey,
      mode: this.mode,
      status: hasEndpoint ? "TERMINAL_ERROR" : "BLOCKED_NO_ASP",
      ok: !hasEndpoint,
      valid: !hasEndpoint,
      mockOnly: false,
      message: hasEndpoint ? "External ASP provider URLs are blocked until ASP access is approved." : "ASP access is required before provider configuration can be enabled.",
      issues: hasEndpoint ? ["EXTERNAL_PROVIDER_URL_BLOCKED"] : ["ASP_ACCESS_REQUIRED"],
      validatorKey: "uae-asp-disabled-config",
    });
  }

  async prepareSubmission(): Promise<AspProviderSubmissionResult> {
    return baseResult({
      providerKey: this.providerKey,
      mode: this.mode,
      status: "BLOCKED_NO_ASP",
      ok: false,
      mockOnly: false,
      message: "Provider submission is blocked until approved UAE ASP access exists.",
      issues: ["ASP_ACCESS_REQUIRED"],
      externalReference: null,
    });
  }

  submitInvoice(input: AspProviderOperationInput): Promise<AspProviderSubmissionResult> {
    return this.submitDocument(input);
  }

  submitCreditNote(input: AspProviderOperationInput): Promise<AspProviderSubmissionResult> {
    return this.submitDocument(input);
  }

  async validateDocument(_input: AspProviderOperationInput): Promise<AspProviderValidationResult> {
    return baseResult({
      providerKey: this.providerKey,
      mode: this.mode,
      status: "NOT_CONFIGURED",
      ok: false,
      mockOnly: false,
      message: "UAE ASP connectivity is disabled; only local readiness validation is available.",
      issues: ["ASP_PROVIDER_DISABLED"],
      validatorKey: "uae-asp-disabled",
    });
  }

  async submitDocument(_input: AspProviderOperationInput): Promise<AspProviderSubmissionResult> {
    return baseResult({
      providerKey: this.providerKey,
      mode: this.mode,
      status: "DISABLED",
      ok: false,
      mockOnly: false,
      message: "ASP submission is blocked because no provider is configured.",
      issues: ["ASP_SUBMISSION_DISABLED"],
      externalReference: null,
    });
  }

  async getDocumentStatus(_input: AspProviderOperationInput): Promise<AspProviderStatusResult> {
    return baseResult({
      providerKey: this.providerKey,
      mode: this.mode,
      status: "BLOCKED_NO_ASP",
      ok: false,
      mockOnly: false,
      message: "No ASP status is available while the provider is disabled.",
      issues: ["ASP_PROVIDER_DISABLED"],
      timeline: [{ status: "BLOCKED_NO_ASP", message: "Provider disabled; no ASP timeline exists." }],
    });
  }

  getTransmissionStatus(input: AspProviderOperationInput): Promise<AspProviderStatusResult> {
    return this.getDocumentStatus(input);
  }

  async parseWebhook(): Promise<AspProviderWebhookResult> {
    return baseResult({
      providerKey: this.providerKey,
      mode: this.mode,
      status: "DISABLED",
      ok: false,
      mockOnly: false,
      message: "Webhook parsing is disabled for non-mock ASP providers.",
      issues: ["ASP_WEBHOOK_DISABLED"],
      accepted: false,
    });
  }

  async verifyWebhookSignature(): Promise<boolean> {
    return false;
  }

  normalizeWebhookEvent(payload: unknown): NormalizedUaeWebhookEvent {
    return normalizeWebhookEvent(parseWebhookEvent(payload));
  }

  normalizeError(input: AspProviderErrorInput): UaeProviderNormalizedError {
    return normalizeUaeProviderError(input);
  }

  redactConfig(config?: AspProviderConfig | null): Record<string, unknown> {
    return redactAspProviderConfig(config);
  }

  isNetworkEnabled(): false {
    return false;
  }

  async downloadEvidence(): Promise<AspProviderEvidenceResult> {
    return baseResult({
      providerKey: this.providerKey,
      mode: this.mode,
      status: "NOT_CONFIGURED",
      ok: false,
      mockOnly: false,
      message: "ASP evidence is not available because no provider is configured.",
      issues: ["ASP_EVIDENCE_NOT_AVAILABLE"],
      available: false,
      filename: null,
    });
  }

  async healthCheck(): Promise<AspProviderHealthResult> {
    return baseResult({
      providerKey: this.providerKey,
      mode: this.mode,
      status: "DISABLED",
      ok: false,
      mockOnly: false,
      message: "ASP connector disabled; no network health check was attempted.",
      issues: ["ASP_PROVIDER_DISABLED"],
      capabilities: this.listCapabilities(),
    });
  }
}

export class MockAspProviderAdapter implements AspProviderAdapter {
  readonly providerKey = "MOCK" as const;
  readonly mode = "MOCK" as const;

  getProviderId(): AspProviderKey {
    return this.providerKey;
  }

  getDisplayName(): string {
    return "Local mock UAE ASP provider";
  }

  listCapabilities(): AspProviderCapability[] {
    return ["LOCAL_READINESS_VALIDATION", "MOCK_VALIDATION", "MOCK_SUBMISSION", "STATUS_LOOKUP", "WEBHOOK_SIGNATURE_VERIFICATION", "EVIDENCE_DOWNLOAD"];
  }

  getCapabilities(): UaeAspProviderCapabilityFlags {
    return UAE_ASP_PROVIDER_CAPABILITY_FLAGS.mock;
  }

  validateConfig(config?: AspProviderConfig | null): AspProviderValidationResult {
    const valid = config?.providerKey === "MOCK" && config.mode === "MOCK" && config.mockModeEnabled === true && !String(config.endpointUrl ?? "").trim();
    return baseResult({
      providerKey: this.providerKey,
      mode: this.mode,
      status: valid ? "READY_LOCAL_ONLY" : "LOCAL_VALIDATION_FAILED",
      ok: valid,
      valid,
      mockOnly: true,
      message: valid ? "Mock ASP configuration is valid for local contract tests only." : "Mock ASP configuration requires explicit local mock mode and no endpoint URL.",
      issues: valid ? [] : ["MOCK_CONFIG_NOT_LOCAL_ONLY"],
      validatorKey: "uae-asp-mock-config",
    });
  }

  async prepareSubmission(input: AspProviderOperationInput): Promise<AspProviderSubmissionResult> {
    if (input.explicitMockMode !== true) {
      return baseResult({
        providerKey: this.providerKey,
        mode: this.mode,
        status: "BLOCKED_NO_ASP",
        ok: false,
        mockOnly: true,
        message: "Mock submission preparation requires explicit mock mode.",
        issues: ["MOCK_MODE_NOT_EXPLICIT"],
        externalReference: null,
      });
    }
    return baseResult({
      providerKey: this.providerKey,
      mode: this.mode,
      status: "QUEUED_MOCK",
      ok: true,
      mockOnly: true,
      message: "Mock submission prepared locally; no provider network call is available.",
      issues: [],
      externalReference: `mock-asp-${stableMockReference(input.tenantId, String(input.documentId ?? input.documentNumber ?? "document"))}`,
    });
  }

  submitInvoice(input: AspProviderOperationInput): Promise<AspProviderSubmissionResult> {
    return this.submitDocument(input);
  }

  submitCreditNote(input: AspProviderOperationInput): Promise<AspProviderSubmissionResult> {
    return this.submitDocument(input);
  }

  async validateDocument(input: AspProviderOperationInput): Promise<AspProviderValidationResult> {
    const failed = input.scenario === "VALIDATION_FAILURE";
    return baseResult({
      providerKey: this.providerKey,
      mode: this.mode,
      status: failed ? "LOCAL_VALIDATION_FAILED" : "READY_LOCAL_ONLY",
      ok: !failed,
      mockOnly: true,
      message: failed ? "Mock ASP validation failed for local contract testing only." : "Mock ASP validation passed for local contract testing only.",
      issues: failed ? ["MOCK_VALIDATION_FAILURE"] : [],
      validatorKey: "uae-asp-mock",
    });
  }

  async submitDocument(input: AspProviderOperationInput): Promise<AspProviderSubmissionResult> {
    if (input.explicitMockMode !== true) {
      return baseResult({
        providerKey: this.providerKey,
        mode: this.mode,
        status: "NOT_CONFIGURED",
        ok: false,
        mockOnly: true,
        message: "Mock ASP submission requires explicit mock mode for local tests.",
        issues: ["MOCK_MODE_NOT_EXPLICIT"],
        externalReference: null,
      });
    }
    const rejected = input.scenario === "SUBMISSION_REJECTED";
    const documentId = String(input.documentId ?? input.documentNumber ?? "document");
    return baseResult({
      providerKey: this.providerKey,
      mode: this.mode,
      status: rejected ? "REJECTED_MOCK" : "ACCEPTED_MOCK",
      ok: !rejected,
      mockOnly: true,
      message: rejected ? "Mock ASP rejected the document for local contract testing only." : "Mock ASP accepted the document for local contract testing only.",
      issues: rejected ? ["MOCK_SUBMISSION_REJECTED"] : [],
      externalReference: rejected ? null : `mock-asp-${stableMockReference(input.tenantId, documentId)}`,
    });
  }

  async getDocumentStatus(input: AspProviderOperationInput): Promise<AspProviderStatusResult> {
    const documentId = String(input.documentId ?? input.documentNumber ?? "document");
    return baseResult({
      providerKey: this.providerKey,
      mode: this.mode,
      status: "SUBMITTED_MOCK",
      ok: true,
      mockOnly: true,
      message: "Mock ASP status is deterministic and local-only.",
      issues: [],
      timeline: [
        { status: "READY_LOCAL_ONLY", message: "Local readiness prepared." },
        { status: "SUBMITTED_MOCK", message: `Mock status reference ${stableMockReference(input.tenantId, documentId)}.` },
      ],
    });
  }

  getTransmissionStatus(input: AspProviderOperationInput): Promise<AspProviderStatusResult> {
    return this.getDocumentStatus(input);
  }

  async parseWebhook(payload: unknown): Promise<AspProviderWebhookResult> {
    const isMockPayload = isRecord(payload) && payload.provider === "MOCK" && payload.mockOnly === true;
    return baseResult({
      providerKey: this.providerKey,
      mode: this.mode,
      status: isMockPayload ? "ACCEPTED_MOCK" : "TERMINAL_ERROR",
      ok: isMockPayload,
      mockOnly: true,
      message: isMockPayload ? "Mock webhook parsed for local tests only." : "Only explicit mock webhook payloads are accepted.",
      issues: isMockPayload ? [] : ["NON_MOCK_WEBHOOK_REJECTED"],
      accepted: isMockPayload,
    });
  }

  async verifyWebhookSignature(_payload: unknown, signature: string | null | undefined): Promise<boolean> {
    return signature === "mock-signature";
  }

  normalizeWebhookEvent(payload: unknown): NormalizedUaeWebhookEvent {
    return normalizeWebhookEvent(parseWebhookEvent(payload));
  }

  normalizeError(input: AspProviderErrorInput): UaeProviderNormalizedError {
    return normalizeUaeProviderError(input);
  }

  redactConfig(config?: AspProviderConfig | null): Record<string, unknown> {
    return redactAspProviderConfig(config);
  }

  isNetworkEnabled(): false {
    return false;
  }

  async downloadEvidence(input: AspProviderOperationInput): Promise<AspProviderEvidenceResult> {
    return baseResult({
      providerKey: this.providerKey,
      mode: this.mode,
      status: "READY_LOCAL_ONLY",
      ok: true,
      mockOnly: true,
      message: "Mock evidence metadata is available for local contract testing only.",
      issues: [],
      available: true,
      filename: `${String(input.documentNumber ?? input.documentId ?? "document")}.mock-asp-evidence.json`,
    });
  }

  async healthCheck(): Promise<AspProviderHealthResult> {
    return baseResult({
      providerKey: this.providerKey,
      mode: this.mode,
      status: "READY_LOCAL_ONLY",
      ok: true,
      mockOnly: true,
      message: "Mock ASP adapter is healthy; no network health check was attempted.",
      issues: [],
      capabilities: this.listCapabilities(),
    });
  }
}

export class FutureAspProviderAdapter implements AspProviderAdapter {
  readonly mode = "FUTURE" as const;

  constructor(readonly providerKey: Exclude<AspProviderKey, "DISABLED" | "MOCK">) {}

  getProviderId(): AspProviderKey {
    return this.providerKey;
  }

  getDisplayName(): string {
    return `${this.providerKey} placeholder`;
  }

  listCapabilities(): AspProviderCapability[] {
    return [];
  }

  getCapabilities(): UaeAspProviderCapabilityFlags {
    return UAE_ASP_PROVIDER_CAPABILITY_FLAGS.future;
  }

  validateConfig(config?: AspProviderConfig | null): AspProviderValidationResult {
    const hasEndpoint = Boolean(String(config?.endpointUrl ?? "").trim());
    return baseResult({
      providerKey: this.providerKey,
      mode: this.mode,
      status: "BLOCKED_NO_ASP",
      ok: false,
      valid: false,
      mockOnly: false,
      message: hasEndpoint ? "Future ASP provider URLs require approved ASP access and security review first." : "Future ASP provider remains blocked until API documentation and access exist.",
      issues: hasEndpoint ? ["EXTERNAL_PROVIDER_URL_BLOCKED"] : ["ASP_ACCESS_REQUIRED"],
      validatorKey: `uae-asp-${this.providerKey.toLowerCase()}-config`,
    });
  }

  prepareSubmission(_input: AspProviderOperationInput): Promise<AspProviderSubmissionResult> {
    return this.notImplemented("prepareSubmission", { status: "BLOCKED_NO_ASP" as const, externalReference: null });
  }

  submitInvoice(input: AspProviderOperationInput): Promise<AspProviderSubmissionResult> {
    return this.submitDocument(input);
  }

  submitCreditNote(input: AspProviderOperationInput): Promise<AspProviderSubmissionResult> {
    return this.submitDocument(input);
  }

  async validateDocument(_input: AspProviderOperationInput): Promise<AspProviderValidationResult> {
    return this.notImplemented("validateDocument", { validatorKey: `uae-asp-${this.providerKey.toLowerCase()}` });
  }

  async submitDocument(_input: AspProviderOperationInput): Promise<AspProviderSubmissionResult> {
    return this.notImplemented("submitDocument", { externalReference: null });
  }

  async getDocumentStatus(_input: AspProviderOperationInput): Promise<AspProviderStatusResult> {
    return this.notImplemented("getDocumentStatus", { timeline: [] });
  }

  getTransmissionStatus(input: AspProviderOperationInput): Promise<AspProviderStatusResult> {
    return this.getDocumentStatus(input);
  }

  async parseWebhook(): Promise<AspProviderWebhookResult> {
    return this.notImplemented("parseWebhook", { accepted: false });
  }

  async verifyWebhookSignature(): Promise<boolean> {
    return false;
  }

  normalizeWebhookEvent(payload: unknown): NormalizedUaeWebhookEvent {
    return normalizeWebhookEvent(parseWebhookEvent(payload));
  }

  normalizeError(input: AspProviderErrorInput): UaeProviderNormalizedError {
    return normalizeUaeProviderError(input);
  }

  redactConfig(config?: AspProviderConfig | null): Record<string, unknown> {
    return redactAspProviderConfig(config);
  }

  isNetworkEnabled(): false {
    return false;
  }

  async downloadEvidence(): Promise<AspProviderEvidenceResult> {
    return this.notImplemented("downloadEvidence", { available: false, filename: null });
  }

  async healthCheck(): Promise<AspProviderHealthResult> {
    return this.notImplemented("healthCheck", { capabilities: [] });
  }

  private notImplemented<T extends object>(operation: string, extra: T): Promise<AspProviderBaseResult & T> {
    return Promise.resolve(
      baseResult({
        providerKey: this.providerKey,
        mode: this.mode,
        status: "BLOCKED_NO_ASP",
        ok: false,
        mockOnly: false,
        message: `${this.providerKey} ${operation} is not implemented; provider selection and API review are required first.`,
        issues: ["ASP_PROVIDER_NOT_IMPLEMENTED"],
        ...extra,
      }),
    );
  }
}

export function createAspProviderAdapter(config?: AspProviderConfig | null): AspProviderAdapter {
  assertNoExternalProviderUrl(config);
  const providerKey = config?.providerKey ?? "DISABLED";
  if (providerKey === "DISABLED") {
    return new DisabledAspProviderAdapter();
  }
  if (providerKey === "MOCK") {
    return config?.mode === "MOCK" && config.mockModeEnabled === true ? new MockAspProviderAdapter() : new DisabledAspProviderAdapter();
  }
  return new FutureAspProviderAdapter(providerKey);
}

export function redactAspProviderConfig(config?: AspProviderConfig | null): Record<string, unknown> {
  return {
    providerKey: config?.providerKey ?? "DISABLED",
    mode: config?.mode ?? "DISABLED",
    mockModeEnabled: config?.mockModeEnabled === true,
    endpointUrlConfigured: Boolean(config?.endpointUrl),
    apiKey: config?.apiKey ? "[REDACTED]" : null,
    secret: config?.secret ? "[REDACTED]" : null,
    webhookSecret: config?.webhookSecret ? "[REDACTED]" : null,
    metadata: redactObject(config?.metadata ?? null),
  };
}

export interface UaeParty {
  legalName?: string | null;
  peppolParticipantId?: string | null;
  tin?: string | null;
  trn?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  emirate?: string | null;
  countryCode?: string | null;
}

export interface UaePintLine {
  id: string;
  description: string;
  quantity: string | number;
  unitCode?: string | null;
  unitPrice: string | number;
  taxableAmount: string | number;
  taxAmount: string | number;
  lineTotal: string | number;
  taxCategory?: string | null;
}

export interface UaePintDocumentInput {
  kind: UaePintDocumentKind;
  documentNumber: string;
  issueDate: string;
  currency: string;
  paymentDueDate?: string | null;
  supplier: UaeParty;
  buyer: UaeParty;
  lines: UaePintLine[];
  subtotal: string | number;
  taxTotal: string | number;
  total: string | number;
  creditNoteReason?: string | null;
  originalInvoiceNumber?: string | null;
}

export interface UaeReadinessInput {
  organization: UaeParty & {
    tradeLicenseNumber?: string | null;
    vatRegistrationStatus?: string | null;
    aspSelected?: string | null;
    aspOnboardingStatus?: string | null;
    businessActivity?: string | null;
  };
  buyer?: UaeParty & {
    peppolEndpointStatus?: string | null;
    preferredEinvoiceDeliveryMethod?: string | null;
  };
}

export interface UaeReadinessCheck {
  key: string;
  label: string;
  status: "PASS" | "WARNING" | "FAIL";
  detail: string;
}

export interface UaeReadinessReport {
  status: "READY_FOR_VALIDATION" | "NEEDS_DATA" | "BLOCKED";
  checks: UaeReadinessCheck[];
  warnings: string[];
}

export interface UaeValidationIssue {
  code: string;
  severity: "ERROR" | "WARNING";
  message: string;
}

export interface UaeValidationReport {
  valid: boolean;
  issues: UaeValidationIssue[];
}

export interface UaePartyReadinessReport {
  label: string;
  status: UaeReadinessReport["status"];
  checks: UaeReadinessCheck[];
}

export interface UaeDocumentReadinessReport {
  kind: UaePintDocumentKind;
  status: UaeReadinessReport["status"];
  seller: UaePartyReadinessReport;
  buyer: UaePartyReadinessReport;
  invoiceFields: UaePartyReadinessReport;
  taxIdentity: UaePartyReadinessReport;
  peppolParticipant: UaePartyReadinessReport;
  originalReference?: UaePartyReadinessReport;
  canAttemptLocalXmlGeneration: boolean;
  validation: UaeValidationReport;
  warnings: string[];
}

export function normalizeDigits(value: string | null | undefined): string {
  return String(value ?? "").replace(/\D/g, "");
}

export function deriveUaePeppolParticipantId(tin: string | null | undefined): string {
  const normalized = normalizeDigits(tin);
  if (!/^\d{10}$/.test(normalized)) {
    throw new Error("UAE TIN must be exactly 10 digits to derive a Peppol participant identifier.");
  }
  return `0235${normalized}`;
}

export function isValidUaeTin(value: string | null | undefined): boolean {
  return /^\d{10}$/.test(normalizeDigits(value));
}

export function isValidUaeTrn(value: string | null | undefined): boolean {
  return /^\d{15}$/.test(normalizeDigits(value));
}

export function isValidUaePeppolParticipantId(value: string | null | undefined): boolean {
  return /^0235\d{10}$/.test(String(value ?? "").trim());
}

export function buildUaePartyReadinessReport(label: string, party: UaeParty & { peppolEndpointStatus?: string | null; preferredEinvoiceDeliveryMethod?: string | null }): UaePartyReadinessReport {
  const checks = [
    required(`${label.toUpperCase()}_LEGAL_NAME`, `${label} legal name`, party.legalName),
    identityCheck(`${label.toUpperCase()}_TIN`, `${label} 10-digit TIN`, party.tin, isValidUaeTin),
    identityCheck(`${label.toUpperCase()}_TRN`, `${label} TRN`, party.trn, isValidUaeTrn),
    required(`${label.toUpperCase()}_UAE_ADDRESS`, `${label} UAE address`, party.addressLine1),
    required(`${label.toUpperCase()}_EMIRATE`, `${label} emirate`, party.emirate),
    participantCheck(`${label.toUpperCase()}_PEPPOL_ID`, `${label} Peppol participant ID`, party.peppolParticipantId, party.tin),
  ];

  if (party.peppolEndpointStatus !== undefined) {
    checks.push(required(`${label.toUpperCase()}_ENDPOINT_STATUS`, `${label} endpoint status`, party.peppolEndpointStatus));
  }
  if (party.preferredEinvoiceDeliveryMethod !== undefined) {
    checks.push(required(`${label.toUpperCase()}_EINVOICE_DELIVERY_METHOD`, `${label} preferred eInvoice delivery method`, party.preferredEinvoiceDeliveryMethod));
  }

  return { label, status: readinessStatus(checks), checks };
}

export function buildUaeDocumentReadinessReport(input: UaePintDocumentInput): UaeDocumentReadinessReport {
  const validation = validateUaePintInput(input);
  const seller = buildUaePartyReadinessReport("Seller", input.supplier);
  const buyer = buildUaePartyReadinessReport("Buyer", input.buyer);
  const invoiceFields = reportSection("Required invoice fields", [
    required("DOCUMENT_NUMBER", "Document number", input.documentNumber),
    required("ISSUE_DATE", "Issue date", input.issueDate),
    required("CURRENCY", "Currency", input.currency),
    input.lines.length > 0
      ? { key: "LINES_PRESENT", label: "Invoice or credit-note lines", status: "PASS", detail: "At least one line is present." }
      : { key: "LINES_PRESENT", label: "Invoice or credit-note lines", status: "FAIL", detail: "At least one line is required." },
  ]);
  const taxIdentity = reportSection("Tax identity", [
    identityCheck("SELLER_TIN", "Seller 10-digit TIN", input.supplier.tin, isValidUaeTin),
    identityCheck("SELLER_TRN", "Seller TRN", input.supplier.trn, isValidUaeTrn),
    identityCheck("BUYER_TIN", "Buyer 10-digit TIN", input.buyer.tin, isValidUaeTin),
    identityCheck("BUYER_TRN", "Buyer TRN", input.buyer.trn, isValidUaeTrn),
  ]);
  const peppolParticipant = reportSection("Peppol participant readiness", [
    participantCheck("SELLER_PEPPOL_ID", "Seller Peppol participant ID", input.supplier.peppolParticipantId, input.supplier.tin),
    participantCheck("BUYER_PEPPOL_ID", "Buyer Peppol participant ID", input.buyer.peppolParticipantId, input.buyer.tin),
  ]);
  const originalReference =
    input.kind === "credit-note"
      ? reportSection("Original invoice/reference readiness", [
          required("CREDIT_NOTE_REASON", "Credit-note reason", input.creditNoteReason),
          required("ORIGINAL_INVOICE_REFERENCE", "Original invoice reference", input.originalInvoiceNumber),
        ])
      : undefined;
  const sections = [seller, buyer, invoiceFields, taxIdentity, peppolParticipant, ...(originalReference ? [originalReference] : [])];
  const canAttemptLocalXmlGeneration = validation.valid && sections.every((section) => section.status !== "NEEDS_DATA");

  const report: UaeDocumentReadinessReport = {
    kind: input.kind,
    status: canAttemptLocalXmlGeneration ? "READY_FOR_VALIDATION" : "NEEDS_DATA",
    seller,
    buyer,
    invoiceFields,
    taxIdentity,
    peppolParticipant,
    canAttemptLocalXmlGeneration,
    validation,
    warnings: [
      "Local UAE eInvoicing readiness only; no ASP submission, FTA reporting, or production Peppol claim is made.",
      "PDFs are not treated as UAE compliance artifacts in this readiness check.",
    ],
  };
  if (originalReference) {
    report.originalReference = originalReference;
  }
  return report;
}

export function buildUaeReadinessReport(input: UaeReadinessInput): UaeReadinessReport {
  const org = input.organization;
  const buyer = input.buyer;
  const checks: UaeReadinessCheck[] = [
    required("ORG_LEGAL_NAME", "Organization legal name", org.legalName),
    required("ORG_TRADE_LICENSE", "Trade license number", org.tradeLicenseNumber),
    identityCheck("ORG_TIN", "Organization 10-digit TIN", org.tin, isValidUaeTin),
    identityCheck("ORG_TRN", "Organization TRN", org.trn, isValidUaeTrn),
    required("ORG_ADDRESS", "UAE address", org.addressLine1),
    required("ORG_EMIRATE", "Emirate", org.emirate),
    participantCheck("ORG_PEPPOL_ID", "Organization Peppol participant ID", org.peppolParticipantId, org.tin),
    required("ORG_ASP_SELECTED", "ASP selected", org.aspSelected),
    required("ORG_ASP_ONBOARDING", "ASP onboarding status", org.aspOnboardingStatus),
  ];

  if (buyer) {
    checks.push(
      required("BUYER_LEGAL_NAME", "Buyer legal name", buyer.legalName),
      identityCheck("BUYER_TIN", "Buyer 10-digit TIN", buyer.tin, isValidUaeTin),
      required("BUYER_ADDRESS", "Buyer UAE address", buyer.addressLine1),
      participantCheck("BUYER_PEPPOL_ID", "Buyer Peppol participant ID", buyer.peppolParticipantId, buyer.tin),
      required("BUYER_ENDPOINT_STATUS", "Buyer endpoint status", buyer.peppolEndpointStatus),
    );
  }

  const failures = checks.filter((check) => check.status === "FAIL");
  const warnings = [
    "UAE readiness is local validation only; it is not ASP accreditation, FTA certification, or production submission.",
    "Real ASP payload contracts and retention/legal guarantees must be re-verified before provider-specific integration.",
  ];

  return {
    status: failures.length ? "NEEDS_DATA" : "READY_FOR_VALIDATION",
    checks,
    warnings,
  };
}

export function validateUaePintInput(input: UaePintDocumentInput): UaeValidationReport {
  const issues: UaeValidationIssue[] = [];
  requireText(issues, "DOCUMENT_NUMBER_REQUIRED", input.documentNumber, "Document number is required.");
  requireText(issues, "ISSUE_DATE_REQUIRED", input.issueDate, "Issue date is required.");
  requireText(issues, "CURRENCY_REQUIRED", input.currency, "Currency is required.");
  validateParty(issues, "SUPPLIER", input.supplier);
  validateParty(issues, "BUYER", input.buyer);

  if (!input.lines.length) {
    issues.push({ code: "LINES_REQUIRED", severity: "ERROR", message: "At least one invoice or credit-note line is required." });
  }
  for (const line of input.lines) {
    requireText(issues, "LINE_DESCRIPTION_REQUIRED", line.description, `Line ${line.id} description is required.`);
  }
  if (input.kind === "credit-note") {
    requireText(issues, "CREDIT_NOTE_REASON_REQUIRED", input.creditNoteReason, "Credit notes require a reason.");
    requireText(issues, "CREDIT_NOTE_ORIGINAL_REFERENCE_REQUIRED", input.originalInvoiceNumber, "Credit notes require an original invoice reference.");
  }

  return { valid: issues.every((issue) => issue.severity !== "ERROR"), issues };
}

export function buildUaePintXml(input: UaePintDocumentInput): { xml: string; validation: UaeValidationReport } {
  const validation = validateUaePintInput(input);
  if (!validation.valid) {
    return { xml: "", validation };
  }

  const root = input.kind === "credit-note" ? "CreditNote" : "Invoice";
  const lines = input.lines
    .map(
      (line) => `
    <cac:${root}Line>
      <cbc:ID>${escapeXml(line.id)}</cbc:ID>
      <cbc:InvoicedQuantity>${formatAmount(line.quantity)}</cbc:InvoicedQuantity>
      <cbc:LineExtensionAmount currencyID="${escapeXml(input.currency)}">${formatAmount(line.taxableAmount)}</cbc:LineExtensionAmount>
      <cac:Item><cbc:Name>${escapeXml(line.description)}</cbc:Name></cac:Item>
      <cac:Price><cbc:PriceAmount currencyID="${escapeXml(input.currency)}">${formatAmount(line.unitPrice)}</cbc:PriceAmount></cac:Price>
    </cac:${root}Line>`,
    )
    .join("");

  const creditNoteReference =
    input.kind === "credit-note"
      ? `
  <cac:BillingReference><cac:InvoiceDocumentReference><cbc:ID>${escapeXml(input.originalInvoiceNumber ?? "")}</cbc:ID></cac:InvoiceDocumentReference></cac:BillingReference>
  <cbc:Note>${escapeXml(input.creditNoteReason ?? "")}</cbc:Note>`
      : "";

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<${root} xmlns="urn:oasis:names:specification:ubl:schema:xsd:${root}-2" xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2" xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:CustomizationID>urn:peppol:pint:ae:billing-1@ledgerbyte-readiness</cbc:CustomizationID>
  <cbc:ProfileID>urn:peppol:bis:billing</cbc:ProfileID>
  <cbc:ID>${escapeXml(input.documentNumber)}</cbc:ID>
  <cbc:IssueDate>${escapeXml(input.issueDate)}</cbc:IssueDate>
  <cbc:DocumentCurrencyCode>${escapeXml(input.currency)}</cbc:DocumentCurrencyCode>${creditNoteReference}
${partyXml("AccountingSupplierParty", input.supplier)}
${partyXml("AccountingCustomerParty", input.buyer)}
  <cac:TaxTotal><cbc:TaxAmount currencyID="${escapeXml(input.currency)}">${formatAmount(input.taxTotal)}</cbc:TaxAmount></cac:TaxTotal>
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="${escapeXml(input.currency)}">${formatAmount(input.subtotal)}</cbc:LineExtensionAmount>
    <cbc:TaxInclusiveAmount currencyID="${escapeXml(input.currency)}">${formatAmount(input.total)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="${escapeXml(input.currency)}">${formatAmount(input.total)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>${lines}
</${root}>`;

  return { xml, validation };
}

function validateParty(issues: UaeValidationIssue[], prefix: string, party: UaeParty): void {
  requireText(issues, `${prefix}_LEGAL_NAME_REQUIRED`, party.legalName, `${prefix.toLowerCase()} legal name is required.`);
  requireText(issues, `${prefix}_ENDPOINT_REQUIRED`, party.peppolParticipantId, `${prefix.toLowerCase()} Peppol participant ID is required.`);
  if (party.peppolParticipantId && !isValidUaePeppolParticipantId(party.peppolParticipantId)) {
    issues.push({ code: `${prefix}_ENDPOINT_INVALID`, severity: "ERROR", message: `${prefix.toLowerCase()} Peppol participant ID must use scheme 0235 followed by a 10-digit UAE TIN.` });
  }
  requireText(issues, `${prefix}_ADDRESS_REQUIRED`, party.addressLine1, `${prefix.toLowerCase()} UAE address is required.`);
  if (party.tin && !isValidUaeTin(party.tin)) {
    issues.push({ code: `${prefix}_TIN_INVALID`, severity: "ERROR", message: `${prefix.toLowerCase()} TIN must be 10 digits.` });
  }
  if (party.trn && !isValidUaeTrn(party.trn)) {
    issues.push({ code: `${prefix}_TRN_INVALID`, severity: "ERROR", message: `${prefix.toLowerCase()} TRN must be 15 digits.` });
  }
}

function partyXml(role: "AccountingSupplierParty" | "AccountingCustomerParty", party: UaeParty): string {
  return `  <cac:${role}>
    <cac:Party>
      <cbc:EndpointID schemeID="0235">${escapeXml(party.peppolParticipantId ?? "")}</cbc:EndpointID>
      <cac:PartyName><cbc:Name>${escapeXml(party.legalName ?? "")}</cbc:Name></cac:PartyName>
      <cac:PostalAddress>
        <cbc:StreetName>${escapeXml(party.addressLine1 ?? "")}</cbc:StreetName>
        <cbc:AdditionalStreetName>${escapeXml(party.addressLine2 ?? "")}</cbc:AdditionalStreetName>
        <cbc:CityName>${escapeXml(party.city ?? party.emirate ?? "")}</cbc:CityName>
        <cac:Country><cbc:IdentificationCode>${escapeXml(party.countryCode ?? "AE")}</cbc:IdentificationCode></cac:Country>
      </cac:PostalAddress>
      <cac:PartyTaxScheme><cbc:CompanyID>${escapeXml(party.trn ?? party.tin ?? "")}</cbc:CompanyID><cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:PartyTaxScheme>
    </cac:Party>
  </cac:${role}>`;
}

function required(key: string, label: string, value: string | null | undefined): UaeReadinessCheck {
  const present = Boolean(String(value ?? "").trim());
  return { key, label, status: present ? "PASS" : "FAIL", detail: present ? "Configured." : `${label} is missing.` };
}

function identityCheck(key: string, label: string, value: string | null | undefined, validator: (value: string | null | undefined) => boolean): UaeReadinessCheck {
  if (!String(value ?? "").trim()) {
    return { key, label, status: "FAIL", detail: `${label} is missing.` };
  }
  return validator(value) ? { key, label, status: "PASS", detail: "Configured." } : { key, label, status: "FAIL", detail: `${label} has an invalid format.` };
}

function participantCheck(key: string, label: string, participantId: string | null | undefined, tin: string | null | undefined): UaeReadinessCheck {
  const expected = isValidUaeTin(tin) ? deriveUaePeppolParticipantId(tin) : null;
  if (!String(participantId ?? "").trim()) {
    return { key, label, status: "FAIL", detail: expected ? `${label} is missing; expected ${expected}.` : `${label} is missing.` };
  }
  if (!isValidUaePeppolParticipantId(participantId)) {
    return { key, label, status: "FAIL", detail: `${label} must use scheme 0235 followed by a 10-digit UAE TIN.` };
  }
  return expected && participantId !== expected
    ? { key, label, status: "WARNING", detail: `${label} is configured but does not match expected ${expected}.` }
    : { key, label, status: "PASS", detail: "Configured." };
}

function reportSection(label: string, checks: UaeReadinessCheck[]): UaePartyReadinessReport {
  return { label, status: readinessStatus(checks), checks };
}

function readinessStatus(checks: UaeReadinessCheck[]): UaeReadinessReport["status"] {
  return checks.some((check) => check.status === "FAIL") ? "NEEDS_DATA" : "READY_FOR_VALIDATION";
}

function requireText(issues: UaeValidationIssue[], code: string, value: string | null | undefined, message: string): void {
  if (!String(value ?? "").trim()) {
    issues.push({ code, severity: "ERROR", message });
  }
}

function formatAmount(value: string | number): string {
  return Number(value).toFixed(2);
}

function escapeXml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

function baseResult<T extends object>(result: T): T & { noNetwork: true; productionCompliance: false } {
  return { ...result, noNetwork: true, productionCompliance: false };
}

function assertNoExternalProviderUrl(config?: AspProviderConfig | null): void {
  if (String(config?.endpointUrl ?? "").trim()) {
    throw new Error("External ASP provider URLs are disabled in this branch.");
  }
}

function stableMockReference(tenantId: string, documentId: string): string {
  let hash = 0;
  for (const character of `${tenantId}:${documentId}`) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableJson(item)).join(",")}]`;
  }
  if (isRecord(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function isRetryableStatusCode(statusCode: number | null): boolean {
  return statusCode === 408 || statusCode === 429 || (statusCode !== null && statusCode >= 500 && statusCode <= 599);
}

function classifyProviderErrorCode(input: AspProviderErrorInput): AspProviderErrorCode {
  const code = String(input.code ?? "").toLowerCase();
  const message = String(input.message ?? "").toLowerCase();
  if (input.statusCode === 401 || input.statusCode === 403 || /auth|credential/.test(code)) {
    return "AUTHENTICATION_FAILED";
  }
  if (input.statusCode === 429 || /rate/.test(code)) {
    return "RATE_LIMITED";
  }
  if (input.statusCode === 409 || /duplicate/.test(code)) {
    return "DUPLICATE_DOCUMENT";
  }
  if (/receiver.*not.*found|receiver_not_found/.test(`${code} ${message}`)) {
    return "RECEIVER_NOT_FOUND";
  }
  if (/endpoint.*not.*registered|endpoint_not_registered/.test(`${code} ${message}`)) {
    return "ENDPOINT_NOT_REGISTERED";
  }
  if (/signature/.test(`${code} ${message}`)) {
    return "SIGNATURE_INVALID";
  }
  if (/replay/.test(`${code} ${message}`)) {
    return "REPLAY_DETECTED";
  }
  if (/configuration|missing_config|config/.test(`${code} ${message}`)) {
    return "CONFIGURATION_MISSING";
  }
  if (/asp.*access|required|access_required/.test(`${code} ${message}`)) {
    return "ASP_ACCESS_REQUIRED";
  }
  if (input.statusCode === 400 || input.statusCode === 422 || /validation/.test(code)) {
    return "VALIDATION_FAILED";
  }
  if (isRetryableStatusCode(input.statusCode ?? null)) {
    return "PROVIDER_UNAVAILABLE";
  }
  return "UNKNOWN_PROVIDER_ERROR";
}

function providerUserMessage(code: AspProviderErrorCode): string {
  switch (code) {
    case "AUTHENTICATION_FAILED":
      return "Provider authentication failed in local normalization; review credentials only after ASP access is approved.";
    case "RATE_LIMITED":
      return "Provider rate limit was normalized locally; retry policy must be provider-reviewed.";
    case "VALIDATION_FAILED":
      return "Provider validation failed; review the local payload and official PINT-AE gaps.";
    case "DUPLICATE_DOCUMENT":
      return "Provider duplicate-document response was normalized; check idempotency and document references.";
    case "RECEIVER_NOT_FOUND":
      return "Receiver endpoint was not found or not available in provider evidence.";
    case "ENDPOINT_NOT_REGISTERED":
      return "Receiver endpoint registration is missing or unverified.";
    case "PROVIDER_UNAVAILABLE":
      return "Provider unavailable; no production submission state is inferred.";
    case "SIGNATURE_INVALID":
      return "Webhook signature validation failed.";
    case "REPLAY_DETECTED":
      return "Webhook replay was detected by local replay protection.";
    case "CONFIGURATION_MISSING":
      return "ASP provider configuration is missing.";
    case "ASP_ACCESS_REQUIRED":
      return "Approved ASP access is required before real provider behavior can run.";
    case "UNKNOWN_PROVIDER_ERROR":
    default:
      return "Unknown provider error normalized safely; no provider success or compliance state is inferred.";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function redactObject(value: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!value) {
    return null;
  }
  return Object.fromEntries(
    Object.entries(value).map(([key, nestedValue]) => {
      return /api|key|secret|token|password|credential|raw.*body|body|payload/i.test(key) ? [key, nestedValue ? "[REDACTED]" : nestedValue] : [key, nestedValue];
    }),
  );
}
