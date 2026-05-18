export type ComplianceCsidSecretCustodyProviderKind = "DISABLED" | "FUTURE_SECRETS_MANAGER" | "FUTURE_KMS" | "FUTURE_ENCRYPTED_DB";

export interface CustodyProviderReadiness {
  provider: ComplianceCsidSecretCustodyProviderKind;
  enabled: boolean;
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

export class ComplianceCsidSecretCustodyDisabledError extends Error {
  constructor() {
    super("CSID secret custody provider is disabled. No token, secret, certificate, CSR, OTP, or private key body was stored.");
    this.name = "ComplianceCsidSecretCustodyDisabledError";
  }
}

export class DisabledComplianceCsidSecretCustodyProvider implements ComplianceCsidSecretCustodyProvider {
  getReadiness(): CustodyProviderReadiness {
    return {
      provider: "DISABLED",
      enabled: false,
      tokenStorageReady: false,
      secretStorageReady: false,
      certificateStorageReady: false,
      kmsConfigured: false,
      secretsManagerConfigured: false,
      encryptedDbApproved: false,
      productionCompliance: false,
      blockers: [
        "custody provider disabled",
        "token storage not ready",
        "secret storage not ready",
        "certificate storage not ready",
        "KMS/secrets manager not configured",
        "encrypted DB custody not approved",
      ],
      warnings: [
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
