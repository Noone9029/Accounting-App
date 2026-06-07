export type ZatcaCustodyProviderBoundaryKind =
  | "DISABLED"
  | "LOCAL_REFERENCE"
  | "MOCK_REFERENCE"
  | "FUTURE_EXTERNAL_KMS"
  | "FUTURE_EXTERNAL_HSM"
  | "FUTURE_MANAGED_SECRET_REFERENCE";

export type ZatcaCustodyReferencePurpose = "SANDBOX_CSID_RESPONSE" | "SECRET_MATERIAL_REFERENCE" | "SIGNING_HANDLE";

export type ZatcaCustodySecretMaterialKind = "COMPLIANCE_TOKEN" | "COMPLIANCE_SECRET" | "COMPLIANCE_CERTIFICATE" | "SIGNING_HANDLE";

export type ZatcaCustodyReferenceStatus =
  | "DISABLED"
  | "ACTIVE_REFERENCE"
  | "REFERENCE_STORED"
  | "REFERENCE_PRESENT"
  | "HANDLE_AVAILABLE"
  | "REVOKED"
  | "ROTATED"
  | "ERROR";

export const ZATCA_LEGACY_RAW_PEM_AND_PAYLOAD_BLOCKERS = [
  "ZatcaEgsUnit.csrPem",
  "ZatcaEgsUnit.privateKeyPem",
  "ZatcaEgsUnit.complianceCsidPem",
  "ZatcaEgsUnit.productionCsidPem",
  "ZatcaSubmissionLog.requestPayloadBase64",
  "ZatcaSubmissionLog.responsePayloadBase64",
] as const;

export interface ZatcaCustodyProviderBoundaryReadiness {
  provider: ZatcaCustodyProviderBoundaryKind;
  configuredProvider: ZatcaCustodyProviderBoundaryKind;
  defaultProvider: "DISABLED";
  enabled: false;
  testOnly: boolean;
  interfaceAvailable: true;
  referenceOperationsAvailable: boolean;
  localReferenceProviderAvailableForTests: boolean;
  mockReferenceProviderAvailableForTests: boolean;
  realProviderImplementationReady: false;
  providerConfigurationReady: false;
  bodyStorageAllowed: false;
  networkCallsEnabled: false;
  signingEnabled: false;
  clearanceReportingEnabled: false;
  pdfA3Enabled: false;
  productionCompliance: false;
  metadataOnly: true;
  noOtp: true;
  noCsidRequest: true;
  noPrivateKey: true;
  noRawCertificate: true;
  noRawCsr: true;
  noRequestBody: true;
  noResponseBody: true;
  legacyRawPemBlockers: readonly string[];
  blockers: string[];
  warnings: string[];
  recommendedNextSteps: string[];
}

export interface ZatcaCustodyProviderBoundaryPlan extends ZatcaCustodyProviderBoundaryReadiness {
  runtimeProvider: "DISABLED";
  providerConfigPresent: boolean;
  redactedConfigurationSummary: {
    requestedProvider: ZatcaCustodyProviderBoundaryKind;
    referenceAlias: string;
  };
}

export interface ZatcaCustodyReferenceInput {
  organizationId: string;
  egsUnitId: string;
  environment?: string | null;
  lifecycleStatus?: string | null;
  materialKind?: ZatcaCustodySecretMaterialKind;
  referenceId?: string | null;
  referenceAlias?: string | null;
  referenceVersionId?: string | null;
  certificateFingerprint?: string | null;
  certificateSerialNumber?: string | null;
  certificateIssuer?: string | null;
  certificateSubject?: string | null;
  certificateNotBefore?: string | null;
  certificateExpiresAt?: string | null;
  certificateRequestId?: string | null;
  hasToken?: boolean;
  hasSecret?: boolean;
  hasCertificate?: boolean;
  statusReason?: string | null;
}

export interface ZatcaCustodyReferenceActionInput {
  organizationId: string;
  egsUnitId: string;
  referenceId: string;
  referenceAlias?: string | null;
  nextReferenceId?: string | null;
  statusReason?: string | null;
}

export interface ZatcaCustodyReferenceMetadata {
  provider: ZatcaCustodyProviderBoundaryKind;
  purpose: ZatcaCustodyReferencePurpose;
  materialKind: ZatcaCustodySecretMaterialKind | null;
  status: ZatcaCustodyReferenceStatus;
  organizationId: string;
  egsUnitId: string;
  environment: string | null;
  lifecycleStatus: string | null;
  referenceId: string;
  previousReferenceId: string | null;
  referenceAlias: string | null;
  referenceVersionId: string | null;
  certificateFingerprint: string | null;
  certificateSerialNumber: string | null;
  certificateIssuer: string | null;
  certificateSubject: string | null;
  certificateNotBefore: string | null;
  certificateExpiresAt: string | null;
  certificateRequestId: string | null;
  hasToken: boolean;
  hasSecret: boolean;
  hasCertificate: boolean;
  metadataOnly: true;
  bodyReturned: false;
  secretBodyStored: false;
  tokenBodyStored: false;
  certificateBodyStored: false;
  privateKeyReturned: false;
  csrBodyStored: false;
  requestBodyStored: false;
  responseBodyStored: false;
  providerPayloadStored: false;
  signedXmlStored: false;
  qrPayloadStored: false;
  signingEnabled: false;
  clearanceReportingEnabled: false;
  pdfA3Enabled: false;
  networkCallsMade: false;
  productionCompliance: false;
  createdAt: Date;
  statusReason: string | null;
}

export interface ZatcaCustodyReferenceHealth {
  provider: ZatcaCustodyProviderBoundaryKind;
  status: "REFERENCE_PRESENT" | "DISABLED";
  organizationId: string;
  egsUnitId: string;
  referenceId: string;
  referencePresent: boolean;
  realProviderChecked: false;
  networkCallsMade: false;
  bodyReturned: false;
  signingEnabled: false;
  productionCompliance: false;
  checkedAt: Date;
  blockers: string[];
}

export interface ZatcaCustodyProviderBoundary {
  getReadiness(): ZatcaCustodyProviderBoundaryReadiness;
  storeSandboxCsidResponseMetadataOnly(input: ZatcaCustodyReferenceInput): Promise<ZatcaCustodyReferenceMetadata>;
  storeSecretMaterialReferenceOnly(input: ZatcaCustodyReferenceInput & { materialKind: ZatcaCustodySecretMaterialKind }): Promise<ZatcaCustodyReferenceMetadata>;
  retrieveSigningHandleNotPrivateKey(input: ZatcaCustodyReferenceInput): Promise<ZatcaCustodyReferenceMetadata>;
  revokeReference(input: ZatcaCustodyReferenceActionInput): Promise<ZatcaCustodyReferenceMetadata>;
  rotateReference(input: ZatcaCustodyReferenceActionInput & { nextReferenceId: string }): Promise<ZatcaCustodyReferenceMetadata>;
  verifyReferenceHealth(input: ZatcaCustodyReferenceActionInput): Promise<ZatcaCustodyReferenceHealth>;
}

export interface ZatcaCustodyProviderBoundaryFactoryOptions {
  provider?: ZatcaCustodyProviderBoundaryKind | string | null;
  allowTestOnlyLocalReferenceProvider?: boolean;
  now?: () => Date;
}

export class ZatcaCustodyProviderBoundaryDisabledError extends Error {
  constructor() {
    super("ZATCA custody provider boundary is disabled. No OTP, CSID, private key, certificate, CSR, request body, response body, signing, or provider body was stored.");
    this.name = "ZatcaCustodyProviderBoundaryDisabledError";
  }
}

export function redactZatcaCustodyReference(rawReference: string | null | undefined): string {
  const trimmed = rawReference?.trim();
  if (!trimmed) {
    return "[redacted-reference:empty]";
  }
  return `[redacted-reference:length-${trimmed.length}]`;
}

export function assertZatcaCustodyMetadataSafe(value: unknown, path = "metadata"): void {
  const forbiddenKeyPattern =
    /^(otp|otpValue|rawOtp|privateKey|rawPrivateKey|privateKeyPem|pem|csr|csrPem|csrBody|rawCsr|certificate|certificateBody|certificatePem|rawCertificate|rawCertificatePem|binarySecurityToken|binarySecurityTokenBody|token|tokenBody|secret|secretBody|password|signedXml|signedXmlBody|qrPayload|qrPayloadBody|requestBody|responseBody|providerPayload|pdfBody|authHeader|authorization|cookie|customerData|vendorData|bankAccount|generatedDocumentBody)$/i;
  const forbiddenValuePattern =
    /-----BEGIN [A-Z ]+-----|<\?xml|<Invoice\b|<\w+:Invoice\b|<cbc:EmbeddedDocumentBinaryObject\b|binarySecurityToken\s*=|privateKey\s*=|certificate\s*=|csr\s*=|secret\s*=|token\s*=|\bOTP\s*\d{4,8}\b|Bearer\s+[A-Za-z0-9._-]+|AKIA[0-9A-Z]{16}|signedXml\s*=|qrPayload\s*=|requestBody\s*=|responseBody\s*=|providerPayload\s*=/i;

  if (value === null || value === undefined) {
    return;
  }
  if (typeof value === "string") {
    if (forbiddenValuePattern.test(value)) {
      throw new Error(`Sensitive ZATCA custody material is not allowed in ${path}.`);
    }
    return;
  }
  if (typeof value !== "object") {
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertZatcaCustodyMetadataSafe(item, `${path}[${index}]`));
    return;
  }

  for (const [key, nestedValue] of Object.entries(value as Record<string, unknown>)) {
    if (forbiddenKeyPattern.test(key)) {
      throw new Error(`Sensitive ZATCA custody material is not allowed in ${path}.${key}.`);
    }
    assertZatcaCustodyMetadataSafe(nestedValue, `${path}.${key}`);
  }
}

export function readZatcaCustodyProviderBoundaryPlan(env: NodeJS.ProcessEnv = process.env): ZatcaCustodyProviderBoundaryPlan {
  const requestedProvider = normalizeBoundaryProvider(env.ZATCA_CUSTODY_PROVIDER_BOUNDARY);
  const referenceAlias = env.ZATCA_CUSTODY_PROVIDER_REFERENCE_ALIAS;
  const providerConfigPresent = Boolean(env.ZATCA_CUSTODY_PROVIDER_BOUNDARY?.trim() || referenceAlias?.trim());
  const base = createReadiness({
    provider: "DISABLED",
    configuredProvider: requestedProvider,
    referenceOperationsAvailable: false,
    testOnly: false,
    extraBlockers: providerConfigPresent ? ["provider configuration inspected but runtime provider remains disabled"] : [],
  });

  return {
    ...base,
    runtimeProvider: "DISABLED",
    providerConfigPresent,
    redactedConfigurationSummary: {
      requestedProvider,
      referenceAlias: redactZatcaCustodyReference(referenceAlias),
    },
  };
}

export class DisabledZatcaCustodyProviderBoundary implements ZatcaCustodyProviderBoundary {
  getReadiness(): ZatcaCustodyProviderBoundaryReadiness {
    return createReadiness({ provider: "DISABLED", configuredProvider: "DISABLED", referenceOperationsAvailable: false, testOnly: false });
  }

  async storeSandboxCsidResponseMetadataOnly(_input: ZatcaCustodyReferenceInput): Promise<ZatcaCustodyReferenceMetadata> {
    throw new ZatcaCustodyProviderBoundaryDisabledError();
  }

  async storeSecretMaterialReferenceOnly(_input: ZatcaCustodyReferenceInput & { materialKind: ZatcaCustodySecretMaterialKind }): Promise<ZatcaCustodyReferenceMetadata> {
    throw new ZatcaCustodyProviderBoundaryDisabledError();
  }

  async retrieveSigningHandleNotPrivateKey(_input: ZatcaCustodyReferenceInput): Promise<ZatcaCustodyReferenceMetadata> {
    throw new ZatcaCustodyProviderBoundaryDisabledError();
  }

  async revokeReference(_input: ZatcaCustodyReferenceActionInput): Promise<ZatcaCustodyReferenceMetadata> {
    throw new ZatcaCustodyProviderBoundaryDisabledError();
  }

  async rotateReference(_input: ZatcaCustodyReferenceActionInput & { nextReferenceId: string }): Promise<ZatcaCustodyReferenceMetadata> {
    throw new ZatcaCustodyProviderBoundaryDisabledError();
  }

  async verifyReferenceHealth(_input: ZatcaCustodyReferenceActionInput): Promise<ZatcaCustodyReferenceHealth> {
    throw new ZatcaCustodyProviderBoundaryDisabledError();
  }
}

export class LocalReferenceZatcaCustodyProviderBoundary implements ZatcaCustodyProviderBoundary {
  private readonly now: () => Date;

  constructor(options: { now?: () => Date } = {}) {
    this.now = options.now ?? (() => new Date());
  }

  getReadiness(): ZatcaCustodyProviderBoundaryReadiness {
    return createReadiness({
      provider: "LOCAL_REFERENCE",
      configuredProvider: "LOCAL_REFERENCE",
      referenceOperationsAvailable: true,
      testOnly: true,
      extraWarnings: ["Local-reference custody provider is for tests and no-network dry-runs only."],
    });
  }

  async storeSandboxCsidResponseMetadataOnly(input: ZatcaCustodyReferenceInput): Promise<ZatcaCustodyReferenceMetadata> {
    assertZatcaCustodyMetadataSafe(input);
    return this.createReferenceMetadata(input, {
      purpose: "SANDBOX_CSID_RESPONSE",
      materialKind: null,
      status: "ACTIVE_REFERENCE",
    });
  }

  async storeSecretMaterialReferenceOnly(input: ZatcaCustodyReferenceInput & { materialKind: ZatcaCustodySecretMaterialKind }): Promise<ZatcaCustodyReferenceMetadata> {
    assertZatcaCustodyMetadataSafe(input);
    return this.createReferenceMetadata(input, {
      purpose: "SECRET_MATERIAL_REFERENCE",
      materialKind: input.materialKind,
      status: "REFERENCE_STORED",
    });
  }

  async retrieveSigningHandleNotPrivateKey(input: ZatcaCustodyReferenceInput): Promise<ZatcaCustodyReferenceMetadata> {
    assertZatcaCustodyMetadataSafe(input);
    return this.createReferenceMetadata(input, {
      purpose: "SIGNING_HANDLE",
      materialKind: "SIGNING_HANDLE",
      status: "HANDLE_AVAILABLE",
    });
  }

  async revokeReference(input: ZatcaCustodyReferenceActionInput): Promise<ZatcaCustodyReferenceMetadata> {
    assertZatcaCustodyMetadataSafe(input);
    return this.createReferenceMetadata(input, {
      purpose: "SECRET_MATERIAL_REFERENCE",
      materialKind: null,
      status: "REVOKED",
    });
  }

  async rotateReference(input: ZatcaCustodyReferenceActionInput & { nextReferenceId: string }): Promise<ZatcaCustodyReferenceMetadata> {
    assertZatcaCustodyMetadataSafe(input);
    const metadata = this.createReferenceMetadata(
      {
        ...input,
        referenceId: input.nextReferenceId,
      },
      {
        purpose: "SECRET_MATERIAL_REFERENCE",
        materialKind: null,
        status: "ROTATED",
      },
    );
    return {
      ...metadata,
      previousReferenceId: redactZatcaCustodyReference(input.referenceId),
    };
  }

  async verifyReferenceHealth(input: ZatcaCustodyReferenceActionInput): Promise<ZatcaCustodyReferenceHealth> {
    assertZatcaCustodyMetadataSafe(input);
    return {
      provider: "LOCAL_REFERENCE",
      status: "REFERENCE_PRESENT",
      organizationId: input.organizationId,
      egsUnitId: input.egsUnitId,
      referenceId: redactZatcaCustodyReference(input.referenceId),
      referencePresent: Boolean(input.referenceId.trim()),
      realProviderChecked: false,
      networkCallsMade: false,
      bodyReturned: false,
      signingEnabled: false,
      productionCompliance: false,
      checkedAt: this.now(),
      blockers: ["real provider health check is not implemented", "local-reference provider is test-only"],
    };
  }

  private createReferenceMetadata(
    input: ZatcaCustodyReferenceInput | ZatcaCustodyReferenceActionInput,
    options: { purpose: ZatcaCustodyReferencePurpose; materialKind: ZatcaCustodySecretMaterialKind | null; status: ZatcaCustodyReferenceStatus },
  ): ZatcaCustodyReferenceMetadata {
    const referenceInput = input as ZatcaCustodyReferenceInput;
    const actionInput = input as ZatcaCustodyReferenceActionInput;
    return {
      provider: "LOCAL_REFERENCE",
      purpose: options.purpose,
      materialKind: options.materialKind,
      status: options.status,
      organizationId: input.organizationId,
      egsUnitId: input.egsUnitId,
      environment: normalizeOptionalText(referenceInput.environment),
      lifecycleStatus: normalizeOptionalText(referenceInput.lifecycleStatus),
      referenceId: redactZatcaCustodyReference(referenceInput.referenceId ?? actionInput.referenceId),
      previousReferenceId: null,
      referenceAlias: normalizeOptionalText(input.referenceAlias),
      referenceVersionId: redactZatcaCustodyReference(referenceInput.referenceVersionId),
      certificateFingerprint: normalizeOptionalText(referenceInput.certificateFingerprint),
      certificateSerialNumber: normalizeOptionalText(referenceInput.certificateSerialNumber),
      certificateIssuer: normalizeOptionalText(referenceInput.certificateIssuer),
      certificateSubject: normalizeOptionalText(referenceInput.certificateSubject),
      certificateNotBefore: normalizeOptionalText(referenceInput.certificateNotBefore),
      certificateExpiresAt: normalizeOptionalText(referenceInput.certificateExpiresAt),
      certificateRequestId: normalizeOptionalText(referenceInput.certificateRequestId),
      hasToken: Boolean(referenceInput.hasToken),
      hasSecret: Boolean(referenceInput.hasSecret),
      hasCertificate: Boolean(referenceInput.hasCertificate),
      metadataOnly: true,
      bodyReturned: false,
      secretBodyStored: false,
      tokenBodyStored: false,
      certificateBodyStored: false,
      privateKeyReturned: false,
      csrBodyStored: false,
      requestBodyStored: false,
      responseBodyStored: false,
      providerPayloadStored: false,
      signedXmlStored: false,
      qrPayloadStored: false,
      signingEnabled: false,
      clearanceReportingEnabled: false,
      pdfA3Enabled: false,
      networkCallsMade: false,
      productionCompliance: false,
      createdAt: this.now(),
      statusReason: normalizeOptionalText(referenceInput.statusReason ?? actionInput.statusReason),
    };
  }
}

export function createZatcaCustodyProviderBoundary(options: ZatcaCustodyProviderBoundaryFactoryOptions = {}): ZatcaCustodyProviderBoundary {
  const provider = normalizeBoundaryProvider(options.provider);
  if (provider === "LOCAL_REFERENCE" && options.allowTestOnlyLocalReferenceProvider === true) {
    return new LocalReferenceZatcaCustodyProviderBoundary({ now: options.now });
  }
  return new DisabledZatcaCustodyProviderBoundary();
}

function createReadiness(input: {
  provider: ZatcaCustodyProviderBoundaryKind;
  configuredProvider: ZatcaCustodyProviderBoundaryKind;
  referenceOperationsAvailable: boolean;
  testOnly: boolean;
  extraBlockers?: string[];
  extraWarnings?: string[];
}): ZatcaCustodyProviderBoundaryReadiness {
  return {
    provider: input.provider,
    configuredProvider: input.configuredProvider,
    defaultProvider: "DISABLED",
    enabled: false,
    testOnly: input.testOnly,
    interfaceAvailable: true,
    referenceOperationsAvailable: input.referenceOperationsAvailable,
    localReferenceProviderAvailableForTests: true,
    mockReferenceProviderAvailableForTests: true,
    realProviderImplementationReady: false,
    providerConfigurationReady: false,
    bodyStorageAllowed: false,
    networkCallsEnabled: false,
    signingEnabled: false,
    clearanceReportingEnabled: false,
    pdfA3Enabled: false,
    productionCompliance: false,
    metadataOnly: true,
    noOtp: true,
    noCsidRequest: true,
    noPrivateKey: true,
    noRawCertificate: true,
    noRawCsr: true,
    noRequestBody: true,
    noResponseBody: true,
    legacyRawPemBlockers: ZATCA_LEGACY_RAW_PEM_AND_PAYLOAD_BLOCKERS,
    blockers: [
      "runtime provider remains disabled",
      "real provider implementation not enabled",
      "real ZATCA network not approved",
      "request/response body handling not approved",
      "signing not implemented",
      "clearance/reporting not implemented",
      "PDF-A-3 not implemented",
      "production compliance false",
      ...ZATCA_LEGACY_RAW_PEM_AND_PAYLOAD_BLOCKERS.map((field) => `legacy blocker present: ${field}`),
      ...(input.extraBlockers ?? []),
    ],
    warnings: [
      "This boundary accepts references, handles, and metadata only.",
      "No raw private key, certificate, CSR, OTP, token, secret, request body, response body, signed XML, QR payload, or provider payload is accepted.",
      ...(input.extraWarnings ?? []),
    ],
    recommendedNextSteps: [
      "Keep disabled provider as the runtime default.",
      "Use local-reference and mock-reference providers for unit contracts only.",
      "Quarantine legacy raw PEM and payload-capable fields before any real sandbox response body processing.",
      "Approve a real KMS/HSM/managed-secret provider in a later lane before custody execution.",
    ],
  };
}

function normalizeBoundaryProvider(value: string | null | undefined): ZatcaCustodyProviderBoundaryKind {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "local-reference" || normalized === "local_reference") {
    return "LOCAL_REFERENCE";
  }
  if (normalized === "mock-reference" || normalized === "mock_reference") {
    return "MOCK_REFERENCE";
  }
  if (normalized === "external-kms" || normalized === "external_kms" || normalized === "kms") {
    return "FUTURE_EXTERNAL_KMS";
  }
  if (normalized === "external-hsm" || normalized === "external_hsm" || normalized === "hsm") {
    return "FUTURE_EXTERNAL_HSM";
  }
  if (normalized === "managed-secret-reference" || normalized === "managed_secret_reference" || normalized === "secrets-manager") {
    return "FUTURE_MANAGED_SECRET_REFERENCE";
  }
  return "DISABLED";
}

function normalizeOptionalText(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}
