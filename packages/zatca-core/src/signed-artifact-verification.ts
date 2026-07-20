import { resolve } from "node:path";

export type ZatcaSignedArtifactVerificationStatus =
  | "VALID"
  | "MALFORMED_XML"
  | "UNSAFE_XML"
  | "SIGNATURE_MISSING"
  | "MULTIPLE_SIGNATURES"
  | "DUPLICATE_ID"
  | "REFERENCE_INVALID"
  | "DIGEST_MISMATCH"
  | "SIGNED_PROPERTIES_INVALID"
  | "CERTIFICATE_INVALID"
  | "SIGNATURE_INVALID"
  | "QR_BINDING_INVALID"
  | "UNSUPPORTED_ALGORITHM";

export interface ZatcaSignedArtifactVerificationResult {
  valid: boolean;
  status: ZatcaSignedArtifactVerificationStatus;
  safeErrorCodes: string[];
  checks: {
    safeXml: boolean;
    uniqueIds: boolean;
    referencesResolved: boolean;
    documentDigestValid: boolean;
    signedPropertiesDigestValid: boolean;
    certificateDigestValid: boolean;
    signatureValid: boolean;
    qrBindingValid: boolean;
  };
}

/** A provider boundary keeps verification independent from a particular signing provider. */
export interface ZatcaSignedArtifactVerificationProvider {
  verifySerializedArtifact(xml: string): Promise<ZatcaSignedArtifactVerificationResult> | ZatcaSignedArtifactVerificationResult;
}

export interface VerifyZatcaSignedArtifactInput {
  xml: string;
  provider?: ZatcaSignedArtifactVerificationProvider;
}

/**
 * Verifies a serialized ZATCA XAdES artifact with LedgerByte-controlled DOM,
 * canonicalization, digest, certificate, ECDSA, and QR-binding checks. It does
 * not invoke the official SDK validator or expose signed material in its result.
 */
export async function verifyZatcaSignedArtifact(input: VerifyZatcaSignedArtifactInput): Promise<ZatcaSignedArtifactVerificationResult> {
  if (!input || typeof input.xml !== "string" || input.xml.length === 0) return failed("MALFORMED_XML", "XML_INPUT_INVALID");
  try {
    const result = await (input.provider ?? localProvider()).verifySerializedArtifact(input.xml);
    return normalize(result);
  } catch {
    return failed("MALFORMED_XML", "SIGNED_ARTIFACT_VERIFICATION_FAILED_CLOSED");
  }
}

function localProvider(): ZatcaSignedArtifactVerificationProvider {
  return {
    verifySerializedArtifact(xml) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const helper = require(resolve(__dirname, "../../..", "scripts", "zatca-c14n11-hash.cjs")) as { verifyZatcaSignedArtifactLocally(input: { xml: string; cwd: string; env: NodeJS.ProcessEnv }): unknown };
      return helper.verifyZatcaSignedArtifactLocally({ xml, cwd: resolve(__dirname, "../../.."), env: process.env }) as ZatcaSignedArtifactVerificationResult;
    },
  };
}

function normalize(value: unknown): ZatcaSignedArtifactVerificationResult {
  const candidate = value as Partial<ZatcaSignedArtifactVerificationResult>;
  const statuses: ZatcaSignedArtifactVerificationStatus[] = ["VALID", "MALFORMED_XML", "UNSAFE_XML", "SIGNATURE_MISSING", "MULTIPLE_SIGNATURES", "DUPLICATE_ID", "REFERENCE_INVALID", "DIGEST_MISMATCH", "SIGNED_PROPERTIES_INVALID", "CERTIFICATE_INVALID", "SIGNATURE_INVALID", "QR_BINDING_INVALID", "UNSUPPORTED_ALGORITHM"];
  const names = ["safeXml", "uniqueIds", "referencesResolved", "documentDigestValid", "signedPropertiesDigestValid", "certificateDigestValid", "signatureValid", "qrBindingValid"] as const;
  if (typeof candidate.valid !== "boolean" || !statuses.includes(candidate.status as ZatcaSignedArtifactVerificationStatus) || !Array.isArray(candidate.safeErrorCodes) || !candidate.safeErrorCodes.every((code) => typeof code === "string" && /^[A-Z0-9_]{1,96}$/.test(code)) || !candidate.checks || !names.every((name) => typeof candidate.checks?.[name] === "boolean")) return failed("MALFORMED_XML", "SIGNED_ARTIFACT_VERIFIER_OUTPUT_INVALID");
  return { valid: candidate.valid, status: candidate.status as ZatcaSignedArtifactVerificationStatus, safeErrorCodes: [...new Set(candidate.safeErrorCodes)].sort(), checks: Object.fromEntries(names.map((name) => [name, candidate.checks![name]])) as ZatcaSignedArtifactVerificationResult["checks"] };
}

function failed(status: ZatcaSignedArtifactVerificationStatus, code: string): ZatcaSignedArtifactVerificationResult {
  return { valid: false, status, safeErrorCodes: [code], checks: { safeXml: false, uniqueIds: false, referencesResolved: false, documentDigestValid: false, signedPropertiesDigestValid: false, certificateDigestValid: false, signatureValid: false, qrBindingValid: false } };
}
