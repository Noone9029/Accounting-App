export type UaePintAeDocumentKind = "invoice" | "credit-note";

export type UaePintAeDocumentType = "tax-invoice" | "commercial-invoice" | "credit-note" | "tax-credit-note";

export type UaePintAeRuleSeverity = "error" | "warning" | "info";

export type UaePintAeRuleSource = "local-rule" | "official-doc-required" | "provider-required-later";

export interface UaePintAeRuleResult {
  code: string;
  severity: UaePintAeRuleSeverity;
  message: string;
  fieldPath: string;
  source: UaePintAeRuleSource;
}

export interface UaePintAeValidationResult {
  valid: boolean;
  issues: UaePintAeRuleResult[];
}

export interface UaePintAeParty {
  legalName?: string | null;
  peppolParticipantId?: string | null;
  endpointId?: string | null;
  tin?: string | null;
  trn?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  emirate?: string | null;
  countryCode?: string | null;
}

export interface UaePintAeLine {
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

export type UaePintAePredefinedEndpointScenario = "deemed-supply" | "export-receiver-not-registered" | "buyer-not-subject";

export type UaePintAeTransactionTypeFlag =
  | "free-trade-zone"
  | "deemed-supply"
  | "profit-margin-scheme"
  | "summary-invoice"
  | "continuous-supply"
  | "agent-billing"
  | "e-commerce"
  | "exports"
  | "self-billing"
  | "third-party"
  | "nominal-invoice"
  | "unknown";

export interface UaePintAeDocumentInput {
  kind: UaePintAeDocumentKind;
  documentType?: UaePintAeDocumentType | null;
  documentNumber: string;
  issueDate: string;
  invoiceTypeCode?: string | null;
  currency: string;
  paymentDueDate?: string | null;
  supplier: UaePintAeParty;
  buyer: UaePintAeParty;
  lines: UaePintAeLine[];
  subtotal: string | number;
  taxTotal: string | number;
  total: string | number;
  creditNoteReason?: string | null;
  originalInvoiceNumber?: string | null;
  predefinedEndpointScenario?: UaePintAePredefinedEndpointScenario | null;
  transactionTypeFlags?: UaePintAeTransactionTypeFlag[] | null;
  transactionTypeFlagCode?: string | null;
}

export interface UaePintAeSerializationMetadata {
  customizationId: string;
  profileId: string;
  endpointSchemeId: string;
  documentKind: UaePintAeDocumentKind;
  documentType: UaePintAeDocumentType;
  localOnly: true;
  noNetwork: true;
  noAspValidation: true;
  noFtaReporting: true;
  productionCompliance: false;
  unknownOfficialMappings: string[];
}

export interface UaePintAeSerializationResult {
  ok: boolean;
  xml: string;
  validation: UaePintAeValidationResult;
  metadata: UaePintAeSerializationMetadata;
}
