import { createHash, timingSafeEqual, X509Certificate } from "node:crypto";
import { isPlainRecord, parseStrictJson, StrictJsonError } from "./strict-json";

export class SimulationComplianceCsidResponseError extends Error {
  constructor(readonly code: string) {
    super("Simulation compliance-CSID response was rejected.");
    this.name = "SimulationComplianceCsidResponseError";
  }
}

export interface SimulationComplianceCertificateMetadata {
  fingerprint: string;
  issuer: string;
  serialNumber: string;
  expiresAt: string;
  publicKeyFingerprint: string;
  curve: "secp256k1";
}

export interface SimulationComplianceCertificateInspector {
  inspect(certificate: Buffer): SimulationComplianceCertificateMetadata;
}

export interface ParsedSimulationComplianceCsidMaterial {
  requestId: string;
  dispositionMessage: string;
  certificate: Buffer;
  secret: Buffer;
  certificateMetadata: Omit<SimulationComplianceCertificateMetadata, "publicKeyFingerprint" | "curve">;
}

export async function withParsedSimulationComplianceCsidResponse<T>(
  input: { body: Buffer; expectedPublicKeyFingerprint: string; requiredResponseFields: readonly string[]; inspector?: SimulationComplianceCertificateInspector; now?: Date },
  callback: (material: ParsedSimulationComplianceCsidMaterial) => Promise<T> | T,
): Promise<T> {
  let certificate: Buffer | undefined;
  let secret: Buffer | undefined;
  let parsing = true;
  try {
    const parsed = parseStrictJson(input.body);
    if (!isPlainRecord(parsed)) throw new SimulationComplianceCsidResponseError("RESPONSE_STRUCTURE_REJECTED");
    const required = assertRequiredResponseFields(input.requiredResponseFields);
    if (Object.keys(parsed).length !== required.size || Object.keys(parsed).some((key) => !required.has(key))) throw new SimulationComplianceCsidResponseError("RESPONSE_STRUCTURE_REJECTED");
    const requestId = safeResponseString(parsed.requestID, 128);
    const dispositionMessage = safeResponseString(parsed.dispositionMessage, 512);
    const token = safeResponseString(parsed.binarySecurityToken, 64 * 1024);
    const secretText = safeResponseString(parsed.secret, 4096);
    if (!requestId || !dispositionMessage || !token || !secretText || !isCanonicalBase64(token) || containsProductionMarker(dispositionMessage)) throw new SimulationComplianceCsidResponseError("RESPONSE_REQUIRED_FIELD_MISSING");
    certificate = Buffer.from(token, "base64");
    secret = Buffer.from(secretText, "utf8");
    if (!certificate.length || certificate.length > 48 * 1024 || !secret.length) throw new SimulationComplianceCsidResponseError("RESPONSE_VALUE_REJECTED");
    const metadata = (input.inspector ?? defaultInspector).inspect(certificate);
    if (metadata.curve !== "secp256k1" || !sameDigest(metadata.publicKeyFingerprint, input.expectedPublicKeyFingerprint)) throw new SimulationComplianceCsidResponseError("RESPONSE_CERTIFICATE_KEY_MISMATCH");
    if (!isSafeCertificateMetadata(metadata) || Date.parse(metadata.expiresAt) <= (input.now ?? new Date()).getTime()) throw new SimulationComplianceCsidResponseError("RESPONSE_CERTIFICATE_INVALID");
    const material = {
      requestId,
      dispositionMessage,
      certificate,
      secret,
      certificateMetadata: { fingerprint: metadata.fingerprint, issuer: metadata.issuer, serialNumber: metadata.serialNumber, expiresAt: metadata.expiresAt },
    };
    parsing = false;
    return await callback(material);
  } catch (error) {
    if (!parsing) throw error;
    if (error instanceof SimulationComplianceCsidResponseError) throw error;
    if (error instanceof StrictJsonError) throw new SimulationComplianceCsidResponseError(error.code === "JSON_DUPLICATE_MEMBER" ? "RESPONSE_DUPLICATE_JSON_MEMBER" : "RESPONSE_JSON_INVALID");
    throw new SimulationComplianceCsidResponseError("RESPONSE_CERTIFICATE_INVALID");
  } finally {
    certificate?.fill(0);
    secret?.fill(0);
    input.body.fill(0);
  }
}

const defaultInspector: SimulationComplianceCertificateInspector = {
  inspect(certificate): SimulationComplianceCertificateMetadata {
    const value = new X509Certificate(certificate);
    const rawCertificate = Buffer.from(value.raw);
    const key = value.publicKey;
    const curve = key.asymmetricKeyType === "ec" && key.asymmetricKeyDetails?.namedCurve === "secp256k1" ? "secp256k1" : null;
    if (!curve) throw new SimulationComplianceCsidResponseError("RESPONSE_CERTIFICATE_INVALID");
    const spki = key.export({ type: "spki", format: "der" });
    try {
      if (!sameBuffer(certificate, rawCertificate)) throw new SimulationComplianceCsidResponseError("RESPONSE_CERTIFICATE_INVALID");
      return {
        fingerprint: value.fingerprint256.replace(/:/gu, "").toLowerCase(),
        issuer: value.issuer,
        serialNumber: value.serialNumber,
        expiresAt: new Date(value.validTo).toISOString(),
        publicKeyFingerprint: createHash("sha256").update(spki).digest("hex"),
        curve,
      };
    } finally {
      spki.fill(0);
      rawCertificate.fill(0);
    }
  },
};

function safeResponseString(value: unknown, maxBytes: number): string | null {
  return typeof value === "string" && value.length > 0 && Buffer.byteLength(value, "utf8") <= maxBytes && !/[\u0000\r\n]/u.test(value) ? value : null;
}

function isCanonicalBase64(value: string): boolean {
  if (value.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/u.test(value)) return false;
  const decoded = Buffer.from(value, "base64");
  try { return decoded.length > 0 && decoded.toString("base64") === value; } finally { decoded.fill(0); }
}

function sameDigest(left: string, right: string): boolean {
  if (!/^[a-f0-9]{64}$/iu.test(left) || !/^[a-f0-9]{64}$/iu.test(right)) return false;
  const leftValue = Buffer.from(left, "hex");
  const rightValue = Buffer.from(right, "hex");
  try {
    return leftValue.length === rightValue.length && timingSafeEqual(leftValue, rightValue);
  } finally {
    leftValue.fill(0);
    rightValue.fill(0);
  }
}

function sameBuffer(left: Buffer, right: Buffer): boolean {
  return left.length === right.length && timingSafeEqual(left, right);
}

function assertRequiredResponseFields(fields: readonly string[]): Set<string> {
  const required = new Set(fields);
  const expected = ["requestID", "dispositionMessage", "binarySecurityToken", "secret"];
  if (fields.length !== expected.length || required.size !== expected.length || expected.some((field) => !required.has(field))) throw new SimulationComplianceCsidResponseError("RESPONSE_STRUCTURE_REJECTED");
  return required;
}

function isSafeCertificateMetadata(value: SimulationComplianceCertificateMetadata): boolean {
  return /^[a-f0-9]{64}$/iu.test(value.fingerprint) && /^[a-f0-9]{64}$/iu.test(value.publicKeyFingerprint) && value.issuer.length > 0 && value.issuer.length <= 1024 && value.serialNumber.length > 0 && value.serialNumber.length <= 256 && !containsProductionMarker(value.issuer) && !containsProductionMarker(value.serialNumber) && Number.isFinite(Date.parse(value.expiresAt));
}

function containsProductionMarker(value: string): boolean {
  return /(?:^|[^a-z])(?:production|prod|developer-portal|\/core)(?:[^a-z]|$)/iu.test(value);
}
