export * from "./pint-ae/constants";
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
  | "READY_FOR_ASP"
  | "QUEUED_FOR_ASP"
  | "SENT_TO_ASP"
  | "ASP_ACCEPTED"
  | "ASP_REJECTED"
  | "REPORTED_TO_FTA"
  | "FTA_REJECTED"
  | "DELIVERED_TO_BUYER"
  | "BUYER_REJECTED"
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
  listCapabilities(): AspProviderCapability[];
  validateDocument(input: AspProviderOperationInput): Promise<AspProviderValidationResult>;
  submitDocument(input: AspProviderOperationInput): Promise<AspProviderSubmissionResult>;
  getDocumentStatus(input: AspProviderOperationInput): Promise<AspProviderStatusResult>;
  parseWebhook(payload: unknown): Promise<AspProviderWebhookResult>;
  verifyWebhookSignature(payload: unknown, signature: string | null | undefined): Promise<boolean>;
  downloadEvidence(input: AspProviderOperationInput): Promise<AspProviderEvidenceResult>;
  healthCheck(): Promise<AspProviderHealthResult>;
}

export const ASP_PROVIDER_KEYS: AspProviderKey[] = ["DISABLED", "MOCK", "FUTURE_COMPLYANCE", "FUTURE_CLEARTAX", "FUTURE_EDICOM", "FUTURE_GENERIC_ASP"];
export const ASP_PROVIDER_STATUSES: AspProviderNormalizedStatus[] = [
  "DISABLED",
  "NOT_CONFIGURED",
  "READY_FOR_LOCAL_VALIDATION",
  "LOCAL_VALIDATION_FAILED",
  "READY_FOR_ASP",
  "QUEUED_FOR_ASP",
  "SENT_TO_ASP",
  "ASP_ACCEPTED",
  "ASP_REJECTED",
  "REPORTED_TO_FTA",
  "FTA_REJECTED",
  "DELIVERED_TO_BUYER",
  "BUYER_REJECTED",
  "RETRYABLE_ERROR",
  "TERMINAL_ERROR",
  "ARCHIVED",
];
export const DISABLED_PROVIDER_EMITTED_STATUSES: AspProviderNormalizedStatus[] = ["DISABLED", "NOT_CONFIGURED"];

export class DisabledAspProviderAdapter implements AspProviderAdapter {
  readonly providerKey = "DISABLED" as const;
  readonly mode = "DISABLED" as const;

  listCapabilities(): AspProviderCapability[] {
    return ["LOCAL_READINESS_VALIDATION"];
  }

  async validateDocument(): Promise<AspProviderValidationResult> {
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

  async submitDocument(): Promise<AspProviderSubmissionResult> {
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

  async getDocumentStatus(): Promise<AspProviderStatusResult> {
    return baseResult({
      providerKey: this.providerKey,
      mode: this.mode,
      status: "NOT_CONFIGURED",
      ok: false,
      mockOnly: false,
      message: "No ASP status is available while the provider is disabled.",
      issues: ["ASP_PROVIDER_DISABLED"],
      timeline: [{ status: "NOT_CONFIGURED", message: "Provider disabled; no ASP timeline exists." }],
    });
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

  listCapabilities(): AspProviderCapability[] {
    return ["LOCAL_READINESS_VALIDATION", "MOCK_VALIDATION", "MOCK_SUBMISSION", "STATUS_LOOKUP", "WEBHOOK_SIGNATURE_VERIFICATION", "EVIDENCE_DOWNLOAD"];
  }

  async validateDocument(input: AspProviderOperationInput): Promise<AspProviderValidationResult> {
    const failed = input.scenario === "VALIDATION_FAILURE";
    return baseResult({
      providerKey: this.providerKey,
      mode: this.mode,
      status: failed ? "LOCAL_VALIDATION_FAILED" : "READY_FOR_ASP",
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
      status: rejected ? "ASP_REJECTED" : "ASP_ACCEPTED",
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
      status: "READY_FOR_ASP",
      ok: true,
      mockOnly: true,
      message: "Mock ASP status is deterministic and local-only.",
      issues: [],
      timeline: [
        { status: "READY_FOR_LOCAL_VALIDATION", message: "Local readiness prepared." },
        { status: "READY_FOR_ASP", message: `Mock status reference ${stableMockReference(input.tenantId, documentId)}.` },
      ],
    });
  }

  async parseWebhook(payload: unknown): Promise<AspProviderWebhookResult> {
    const isMockPayload = isRecord(payload) && payload.provider === "MOCK" && payload.mockOnly === true;
    return baseResult({
      providerKey: this.providerKey,
      mode: this.mode,
      status: isMockPayload ? "READY_FOR_ASP" : "TERMINAL_ERROR",
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

  async downloadEvidence(input: AspProviderOperationInput): Promise<AspProviderEvidenceResult> {
    return baseResult({
      providerKey: this.providerKey,
      mode: this.mode,
      status: "READY_FOR_ASP",
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
      status: "READY_FOR_ASP",
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

  listCapabilities(): AspProviderCapability[] {
    return [];
  }

  async validateDocument(): Promise<AspProviderValidationResult> {
    return this.notImplemented("validateDocument", { validatorKey: `uae-asp-${this.providerKey.toLowerCase()}` });
  }

  async submitDocument(): Promise<AspProviderSubmissionResult> {
    return this.notImplemented("submitDocument", { externalReference: null });
  }

  async getDocumentStatus(): Promise<AspProviderStatusResult> {
    return this.notImplemented("getDocumentStatus", { timeline: [] });
  }

  async parseWebhook(): Promise<AspProviderWebhookResult> {
    return this.notImplemented("parseWebhook", { accepted: false });
  }

  async verifyWebhookSignature(): Promise<boolean> {
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
        status: "NOT_CONFIGURED",
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function redactObject(value: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!value) {
    return null;
  }
  return Object.fromEntries(
    Object.entries(value).map(([key, nestedValue]) => {
      return /api|key|secret|token|password|credential/i.test(key) ? [key, nestedValue ? "[REDACTED]" : nestedValue] : [key, nestedValue];
    }),
  );
}
