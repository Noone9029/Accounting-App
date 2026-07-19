import { createPrivateKey, createPublicKey, sign, X509Certificate, type KeyObject } from "node:crypto";
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
  /** Internal signing use only. Never expose certificate bytes through an API response. */
  getCertificateDerForSigning(): Promise<Buffer>;
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
  certificatePath?: string;
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
  constructor(readonly code: "ZATCA_SIGNING_LOCAL_ONLY" | "ZATCA_SIGNING_INVALID_KEY" | "ZATCA_SIGNING_CERTIFICATE_UNAVAILABLE" | "ZATCA_SIGNING_FAILED") {
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

  async getCertificateDerForSigning(): Promise<Buffer> {
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
    if (!this.options.certificatePath?.trim()) {
      return { ...this.metadata };
    }
    try {
      const certificate = loadExternalCertificate(this.options.certificatePath);
      return {
        ...this.metadata,
        certificateFingerprint: certificate.fingerprint256.replace(/:/g, "").toLowerCase(),
        certificateSerialNumber: certificate.serialNumber,
        certificateIssuer: certificate.issuer,
        certificateExpiresAt: new Date(certificate.validTo).toISOString(),
      };
    } catch {
      throw new ZatcaSigningProviderError("ZATCA_SIGNING_CERTIFICATE_UNAVAILABLE");
    }
  }

  async getPublicKey(): Promise<Buffer> {
    const privateKey = this.loadSecp256k1PrivateKey();
    return Buffer.from(createPublicKey(privateKey).export({ type: "spki", format: "der" }));
  }

  async getCertificateDerForSigning(): Promise<Buffer> {
    if (!this.options.certificatePath?.trim()) {
      throw new ZatcaSigningProviderError("ZATCA_SIGNING_CERTIFICATE_UNAVAILABLE");
    }
    try {
      const certificate = loadExternalCertificate(this.options.certificatePath);
      const certificatePublicKey = Buffer.from(certificate.publicKey.export({ type: "spki", format: "der" }));
      if (!certificatePublicKey.equals(await this.getPublicKey())) {
        throw new ZatcaSigningProviderError("ZATCA_SIGNING_CERTIFICATE_UNAVAILABLE");
      }
      return Buffer.from(certificate.raw);
    } catch (error) {
      if (error instanceof ZatcaSigningProviderError) throw error;
      throw new ZatcaSigningProviderError("ZATCA_SIGNING_CERTIFICATE_UNAVAILABLE");
    }
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
      const key = loadExternalPrivateKey(this.options.privateKeyPath);
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

function loadExternalCertificate(path: string): X509Certificate {
  const raw = readFileSync(path);
  const text = raw.toString("utf8").trim();
  return new X509Certificate(text.startsWith("-----BEGIN CERTIFICATE-----") ? text : Buffer.from(text, "base64"));
}

function loadExternalPrivateKey(path: string): KeyObject {
  const raw = readFileSync(path);
  const text = raw.toString("utf8").trim();
  return text.startsWith("-----BEGIN")
    ? createPrivateKey(text)
    : createPrivateKey({ key: Buffer.from(text, "base64"), format: "der", type: "sec1" });
}

function messageForSigningProviderError(code: ZatcaSigningProviderError["code"]): string {
  switch (code) {
    case "ZATCA_SIGNING_LOCAL_ONLY":
      return "The local dummy ZATCA signing provider is local-only and is rejected outside LOCAL_TEST.";
    case "ZATCA_SIGNING_INVALID_KEY":
      return "ZATCA signing requires an externally configured EC secp256k1 private key.";
    case "ZATCA_SIGNING_CERTIFICATE_UNAVAILABLE":
      return "ZATCA signing requires an externally configured certificate matching the signing key.";
    case "ZATCA_SIGNING_FAILED":
      return "ZATCA signing provider operation failed. Sensitive key details were redacted.";
  }
}
