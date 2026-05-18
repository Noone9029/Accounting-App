export type ComplianceCsidSecretCustodyProviderKind = "DISABLED" | "FUTURE_SECRETS_MANAGER" | "FUTURE_KMS" | "FUTURE_ENCRYPTED_DB";

export interface ComplianceCsidCustodyProviderConfigurationPlan {
  configuredProvider: ComplianceCsidSecretCustodyProviderKind;
  providerEnabled: false;
  providerConfigPresent: boolean;
  providerConfigurationReady: false;
  configurationPresent: {
    provider: boolean;
    kmsKeyId: boolean;
    secretPrefix: boolean;
    region: boolean;
    encryptedDbApproval: boolean;
    allowBodyStorage: boolean;
  };
  redactedConfigurationSummary: {
    provider: ComplianceCsidSecretCustodyProviderKind;
    kmsKeyId: string;
    secretPrefix: string;
    region: string;
    encryptedDbApproved: boolean;
    allowBodyStorageRequested: boolean;
  };
  tokenStorageReady: false;
  secretStorageReady: false;
  certificateStorageReady: false;
  kmsConfigured: boolean;
  secretsManagerConfigured: boolean;
  encryptedDbApproved: boolean;
  bodyStorageAllowed: false;
  productionCompliance: false;
  futureProviderModes: Exclude<ComplianceCsidSecretCustodyProviderKind, "DISABLED">[];
  blockers: string[];
  warnings: string[];
  recommendedNextSteps: string[];
}

export interface CustodyProviderReadiness {
  provider: ComplianceCsidSecretCustodyProviderKind;
  enabled: boolean;
  configuredProvider: ComplianceCsidSecretCustodyProviderKind;
  providerConfigPresent: boolean;
  providerEnabled: false;
  providerConfigurationReady: false;
  configurationPlanSummary: Pick<
    ComplianceCsidCustodyProviderConfigurationPlan,
    | "configuredProvider"
    | "providerEnabled"
    | "providerConfigPresent"
    | "providerConfigurationReady"
    | "redactedConfigurationSummary"
    | "bodyStorageAllowed"
  >;
  tokenStorageReady: boolean;
  secretStorageReady: boolean;
  certificateStorageReady: boolean;
  kmsConfigured: boolean;
  secretsManagerConfigured: boolean;
  encryptedDbApproved: boolean;
  productionCompliance: false;
  blockers: string[];
  warnings: string[];
  recommendedNextSteps: string[];
}

export interface StoredSecretReference {
  provider: ComplianceCsidSecretCustodyProviderKind;
  referenceId: string;
  versionId: string | null;
  createdAt: Date;
  bodyReturned: false;
}

export interface StoreComplianceCsidSecretInput {
  organizationId: string;
  egsUnitId: string;
  certificateRequestId?: string | null;
  value: string;
}

export interface RevokeStoredSecretReferenceInput {
  organizationId: string;
  egsUnitId: string;
  referenceId: string;
}

export interface ComplianceCsidSecretCustodyProvider {
  getReadiness(): CustodyProviderReadiness;
  storeComplianceToken(input: StoreComplianceCsidSecretInput): Promise<StoredSecretReference>;
  storeComplianceSecret(input: StoreComplianceCsidSecretInput): Promise<StoredSecretReference>;
  storeComplianceCertificate(input: StoreComplianceCsidSecretInput): Promise<StoredSecretReference>;
  revokeReference(input: RevokeStoredSecretReferenceInput): Promise<void>;
}

function normalizeProvider(value: string | undefined): ComplianceCsidSecretCustodyProviderKind {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "secrets-manager" || normalized === "secret-manager" || normalized === "secrets_manager") {
    return "FUTURE_SECRETS_MANAGER";
  }
  if (normalized === "kms") {
    return "FUTURE_KMS";
  }
  if (normalized === "encrypted-db" || normalized === "encrypted_db") {
    return "FUTURE_ENCRYPTED_DB";
  }
  return "DISABLED";
}

function isTruthy(value: string | undefined): boolean {
  return ["1", "true", "yes", "y"].includes(value?.trim().toLowerCase() ?? "");
}

function redactConfigValue(value: string | undefined, label: string): string {
  const trimmed = value?.trim();
  if (!trimmed) {
    return "NOT_CONFIGURED";
  }
  return `[redacted:${label}:length-${trimmed.length}]`;
}

export function readComplianceCsidCustodyProviderConfig(env: NodeJS.ProcessEnv = process.env): ComplianceCsidCustodyProviderConfigurationPlan {
  const configuredProvider = normalizeProvider(env.ZATCA_CSID_CUSTODY_PROVIDER);
  const kmsKeyId = env.ZATCA_CSID_CUSTODY_KMS_KEY_ID?.trim();
  const secretPrefix = env.ZATCA_CSID_CUSTODY_SECRET_PREFIX?.trim();
  const region = env.ZATCA_CSID_CUSTODY_REGION?.trim();
  const encryptedDbApproved = isTruthy(env.ZATCA_CSID_CUSTODY_ENCRYPTED_DB_APPROVED);
  const allowBodyStorageRequested = isTruthy(env.ZATCA_CSID_CUSTODY_ALLOW_BODY_STORAGE);
  const providerConfigPresent = Boolean(
    env.ZATCA_CSID_CUSTODY_PROVIDER?.trim() ||
      kmsKeyId ||
      secretPrefix ||
      region ||
      env.ZATCA_CSID_CUSTODY_ENCRYPTED_DB_APPROVED?.trim() ||
      env.ZATCA_CSID_CUSTODY_ALLOW_BODY_STORAGE?.trim(),
  );
  const kmsConfigured = Boolean(kmsKeyId || configuredProvider === "FUTURE_KMS");
  const secretsManagerConfigured = Boolean(secretPrefix || configuredProvider === "FUTURE_SECRETS_MANAGER");
  const warnings = [
    "Provider configuration is inspected locally only; no secrets-manager, KMS, cloud provider, database, or ZATCA network call is made.",
    "Raw provider configuration values are redacted and must not be used as proof of secure custody.",
  ];
  if (allowBodyStorageRequested) {
    warnings.push("ZATCA_CSID_CUSTODY_ALLOW_BODY_STORAGE was requested but is ignored in this phase.");
  }

  return {
    configuredProvider,
    providerEnabled: false,
    providerConfigPresent,
    providerConfigurationReady: false,
    configurationPresent: {
      provider: Boolean(env.ZATCA_CSID_CUSTODY_PROVIDER?.trim()),
      kmsKeyId: Boolean(kmsKeyId),
      secretPrefix: Boolean(secretPrefix),
      region: Boolean(region),
      encryptedDbApproval: Boolean(env.ZATCA_CSID_CUSTODY_ENCRYPTED_DB_APPROVED?.trim()),
      allowBodyStorage: Boolean(env.ZATCA_CSID_CUSTODY_ALLOW_BODY_STORAGE?.trim()),
    },
    redactedConfigurationSummary: {
      provider: configuredProvider,
      kmsKeyId: redactConfigValue(kmsKeyId, "kmsKeyId"),
      secretPrefix: redactConfigValue(secretPrefix, "secretPrefix"),
      region: redactConfigValue(region, "region"),
      encryptedDbApproved,
      allowBodyStorageRequested,
    },
    tokenStorageReady: false,
    secretStorageReady: false,
    certificateStorageReady: false,
    kmsConfigured,
    secretsManagerConfigured,
    encryptedDbApproved,
    bodyStorageAllowed: false,
    productionCompliance: false,
    futureProviderModes: ["FUTURE_SECRETS_MANAGER", "FUTURE_KMS", "FUTURE_ENCRYPTED_DB"],
    blockers: [
      "provider configuration not approved",
      "provider implementation disabled",
      "body storage explicitly blocked",
      "real secure storage not tested",
      "reference ID strategy not approved",
      "rotation/renewal not implemented",
      "production compliance false",
    ],
    warnings,
    recommendedNextSteps: [
      "Approve a non-production custody provider configuration plan before implementing any real provider.",
      "Define redacted reference IDs, version handling, access review, audit logging, rotation, renewal, backup, and recovery controls.",
      "Keep token, secret, certificate, CSR, OTP, private key, signed XML, and QR bodies out of API/UI responses.",
    ],
  };
}

export class ComplianceCsidSecretCustodyDisabledError extends Error {
  constructor() {
    super("CSID secret custody provider is disabled. No token, secret, certificate, CSR, OTP, or private key body was stored.");
    this.name = "ComplianceCsidSecretCustodyDisabledError";
  }
}

export class DisabledComplianceCsidSecretCustodyProvider implements ComplianceCsidSecretCustodyProvider {
  getReadiness(): CustodyProviderReadiness {
    const configurationPlan = readComplianceCsidCustodyProviderConfig();
    return {
      provider: "DISABLED",
      enabled: false,
      configuredProvider: configurationPlan.configuredProvider,
      providerConfigPresent: configurationPlan.providerConfigPresent,
      providerEnabled: false,
      providerConfigurationReady: false,
      configurationPlanSummary: {
        configuredProvider: configurationPlan.configuredProvider,
        providerEnabled: false,
        providerConfigPresent: configurationPlan.providerConfigPresent,
        providerConfigurationReady: false,
        redactedConfigurationSummary: configurationPlan.redactedConfigurationSummary,
        bodyStorageAllowed: false,
      },
      tokenStorageReady: false,
      secretStorageReady: false,
      certificateStorageReady: false,
      kmsConfigured: configurationPlan.kmsConfigured,
      secretsManagerConfigured: configurationPlan.secretsManagerConfigured,
      encryptedDbApproved: configurationPlan.encryptedDbApproved,
      productionCompliance: false,
      blockers: [
        ...configurationPlan.blockers,
        "custody provider disabled",
        "token storage not ready",
        "secret storage not ready",
        "certificate storage not ready",
        "KMS/secrets manager not configured",
        "encrypted DB custody not approved",
      ],
      warnings: [
        ...configurationPlan.warnings,
        "No real secrets-manager, KMS, or encrypted DB custody provider is configured.",
        "This provider boundary is metadata-only and must not receive real ZATCA CSID response bodies in normal application paths.",
      ],
      recommendedNextSteps: [
        "Select and approve a secrets-manager/KMS custody provider before real sandbox CSID response persistence.",
        "Define redacted reference IDs, rotation, renewal, audit logging, and disaster recovery before enabling any provider.",
      ],
    };
  }

  async storeComplianceToken(_input: StoreComplianceCsidSecretInput): Promise<StoredSecretReference> {
    throw new ComplianceCsidSecretCustodyDisabledError();
  }

  async storeComplianceSecret(_input: StoreComplianceCsidSecretInput): Promise<StoredSecretReference> {
    throw new ComplianceCsidSecretCustodyDisabledError();
  }

  async storeComplianceCertificate(_input: StoreComplianceCsidSecretInput): Promise<StoredSecretReference> {
    throw new ComplianceCsidSecretCustodyDisabledError();
  }

  async revokeReference(_input: RevokeStoredSecretReferenceInput): Promise<void> {
    throw new ComplianceCsidSecretCustodyDisabledError();
  }
}
