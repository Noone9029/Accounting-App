import { createPrivateKey, createPublicKey, sign, type KeyObject } from "node:crypto";
import { readFileSync } from "node:fs";

export type ZatcaSigningProviderKind = "DISABLED" | "LOCAL_EXTERNAL_PATH" | "FUTURE_EXTERNAL_KMS" | "FUTURE_EXTERNAL_HSM";
export type ZatcaSigningEnvironment = "LOCAL_TEST" | "SANDBOX" | "SIMULATION" | "PRODUCTION";
export type ZatcaCertificateStatus = "UNAVAILABLE" | "ACTIVE" | "EXPIRED" | "REVOKED";
export type ZatcaKeyRotationStatus = "ACTIVE" | "ROTATED" | "REVOKED";

export interface ZatcaCertificateMetadata {
  provider: ZatcaSigningProviderKind;
  algorithm: "EC_SECP256K1";
  keyId: string;
  rotationStatus: ZatcaKeyRotationStatus;
  certificateStatus: ZatcaCertificateStatus;
  certificateFingerprint: string | null;
  certificateSerialNumber: string | null;
  certificateIssuer: string | null;
  certificateExpiresAt: string | null;
  certificateRevokedAt: string | null;
  signingEnabled: boolean;
  privateKeyReturned: false;
  certificateBodyReturned: false;
}

export interface ZatcaSigningProvider {
  getCertificateMetadata(): Promise<ZatcaCertificateMetadata>;
  getPublicKey(): Promise<Buffer>;
  /** Signs canonicalized SignedInfo bytes with ECDSA-SHA256 in IEEE P1363 form. */
  signCanonicalizedData(canonicalizedData: Buffer): Promise<Buffer>;
}

export interface ZatcaLocalCertificateMetadataInput {
  status: ZatcaCertificateStatus;
  fingerprint?: string | null;
  serialNumber?: string | null;
  issuer?: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
}

export interface LocalExternalPathZatcaSigningProviderOptions {
  environment: ZatcaSigningEnvironment;
  privateKeyPath: string;
  keyId: string;
  certificate: ZatcaLocalCertificateMetadataInput;
  rotationStatus?: ZatcaKeyRotationStatus;
}

export interface ZatcaSigningProviderFactoryOptions {
  provider?: ZatcaSigningProviderKind;
  localExternalPath?: LocalExternalPathZatcaSigningProviderOptions;
}

export class ZatcaSigningProviderDisabledError extends Error {
  readonly code = "ZATCA_SIGNING_PROVIDER_DISABLED";

  constructor() {
    super("ZATCA signing provider is disabled. No key material was loaded and no signature was created.");
    this.name = "ZatcaSigningProviderDisabledError";
  }
}

export class ZatcaSigningProviderError extends Error {
  constructor(readonly code: "ZATCA_SIGNING_LOCAL_ONLY" | "ZATCA_SIGNING_INVALID_KEY" | "ZATCA_SIGNING_FAILED") {
    super(messageForSigningProviderError(code));
    this.name = "ZatcaSigningProviderError";
  }
}

export class DisabledZatcaSigningProvider implements ZatcaSigningProvider {
  async getCertificateMetadata(): Promise<ZatcaCertificateMetadata> {
    throw new ZatcaSigningProviderDisabledError();
  }

  async getPublicKey(): Promise<Buffer> {
    throw new ZatcaSigningProviderDisabledError();
  }

  async signCanonicalizedData(_canonicalizedData: Buffer): Promise<Buffer> {
    throw new ZatcaSigningProviderDisabledError();
  }
}

/**
 * Test-only provider for explicitly configured, untracked local key paths.
 * It never returns the private key or certificate body and must not be used in
 * sandbox or production environments.
 */
export class LocalExternalPathZatcaSigningProvider implements ZatcaSigningProvider {
  private readonly metadata: ZatcaCertificateMetadata;

  constructor(private readonly options: LocalExternalPathZatcaSigningProviderOptions) {
    if (options.environment !== "LOCAL_TEST") {
      throw new ZatcaSigningProviderError("ZATCA_SIGNING_LOCAL_ONLY");
    }
    if (!options.privateKeyPath.trim() || !options.keyId.trim()) {
      throw new ZatcaSigningProviderError("ZATCA_SIGNING_INVALID_KEY");
    }
    this.metadata = {
      provider: "LOCAL_EXTERNAL_PATH",
      algorithm: "EC_SECP256K1",
      keyId: options.keyId.trim(),
      rotationStatus: options.rotationStatus ?? "ACTIVE",
      certificateStatus: options.certificate.status,
      certificateFingerprint: optionalSafeMetadata(options.certificate.fingerprint),
      certificateSerialNumber: optionalSafeMetadata(options.certificate.serialNumber),
      certificateIssuer: optionalSafeMetadata(options.certificate.issuer),
      certificateExpiresAt: optionalSafeMetadata(options.certificate.expiresAt),
      certificateRevokedAt: optionalSafeMetadata(options.certificate.revokedAt),
      signingEnabled: true,
      privateKeyReturned: false,
      certificateBodyReturned: false,
    };
  }

  async getCertificateMetadata(): Promise<ZatcaCertificateMetadata> {
    return { ...this.metadata };
  }

  async getPublicKey(): Promise<Buffer> {
    const privateKey = this.loadSecp256k1PrivateKey();
    return Buffer.from(createPublicKey(privateKey).export({ type: "spki", format: "der" }));
  }

  async signCanonicalizedData(canonicalizedData: Buffer): Promise<Buffer> {
    if (!Buffer.isBuffer(canonicalizedData) || canonicalizedData.length === 0) {
      throw new ZatcaSigningProviderError("ZATCA_SIGNING_FAILED");
    }
    const privateKey = this.loadSecp256k1PrivateKey();
    try {
      return sign("sha256", canonicalizedData, { key: privateKey, dsaEncoding: "ieee-p1363" });
    } catch {
      throw new ZatcaSigningProviderError("ZATCA_SIGNING_FAILED");
    }
  }

  private loadSecp256k1PrivateKey(): KeyObject {
    try {
      const key = createPrivateKey(readFileSync(this.options.privateKeyPath));
      if (key.asymmetricKeyType !== "ec" || key.asymmetricKeyDetails?.namedCurve !== "secp256k1") {
        throw new ZatcaSigningProviderError("ZATCA_SIGNING_INVALID_KEY");
      }
      return key;
    } catch (error) {
      if (error instanceof ZatcaSigningProviderError) {
        throw error;
      }
      throw new ZatcaSigningProviderError("ZATCA_SIGNING_INVALID_KEY");
    }
  }
}

export function createZatcaSigningProvider(options: ZatcaSigningProviderFactoryOptions = {}): ZatcaSigningProvider {
  if (options.provider === "LOCAL_EXTERNAL_PATH" && options.localExternalPath) {
    return new LocalExternalPathZatcaSigningProvider(options.localExternalPath);
  }
  return new DisabledZatcaSigningProvider();
}

function optionalSafeMetadata(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed || /-----BEGIN|-----END|<\?xml|<Invoice\b/i.test(trimmed)) {
    return null;
  }
  return trimmed;
}

function messageForSigningProviderError(code: ZatcaSigningProviderError["code"]): string {
  switch (code) {
    case "ZATCA_SIGNING_LOCAL_ONLY":
      return "The local dummy ZATCA signing provider is local-only and is rejected outside LOCAL_TEST.";
    case "ZATCA_SIGNING_INVALID_KEY":
      return "ZATCA signing requires an externally configured EC secp256k1 private key.";
    case "ZATCA_SIGNING_FAILED":
      return "ZATCA signing provider operation failed. Sensitive key details were redacted.";
  }
}
