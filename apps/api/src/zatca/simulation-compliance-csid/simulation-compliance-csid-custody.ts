import { createHash } from "node:crypto";
import type { ComplianceCsidSecretCustodyProvider } from "../custody/compliance-csid-secret-custody.provider";

export class SimulationComplianceCsidCustodyError extends Error {
  constructor(readonly code: "CUSTODY_PARTIAL_STORAGE_ROLLED_BACK" | "CUSTODY_PARTIAL_ROLLBACK_FAILED" | "CUSTODY_STORAGE_REJECTED") {
    super("Simulation compliance-CSID custody operation failed.");
    this.name = "SimulationComplianceCsidCustodyError";
  }
}

type RequiredCustodyProvider = Pick<ComplianceCsidSecretCustodyProvider, "storeComplianceCertificate" | "storeComplianceSecret" | "revokeReference"> & {
  deleteReference?: (input: { organizationId: string; egsUnitId: string; referenceId: string; environment: "SANDBOX" }) => Promise<void>;
};

export interface StoredSimulationComplianceCredentialMetadata {
  certificateReferenceId: string;
  secretReferenceId: string;
  certificateFingerprint: string;
  certificateIssuer: string;
  certificateSerialNumber: string;
  certificateExpiresAt: string;
  requestHash: string;
  responseHash: string;
  plaintextValuesRetained: false;
}

export async function storeSimulationComplianceCredentialAtomically(input: {
  provider: RequiredCustodyProvider;
  organizationId: string;
  egsUnitId: string;
  requestId: string;
  certificate: Buffer;
  secret: Buffer;
  certificateMetadata: { fingerprint: string; issuer: string; serialNumber: string; expiresAt: string };
  requestHash?: string;
  responseHash?: string;
}): Promise<StoredSimulationComplianceCredentialMetadata> {
  const storedReferenceIds: string[] = [];
  const referenceBase = createHash("sha256").update(`${input.organizationId}\u0000${input.egsUnitId}\u0000${input.requestId}`).digest("hex").slice(0, 32);
  const certificateReferenceId = `simulation-compliance-certificate-${referenceBase}`;
  const secretReferenceId = `simulation-compliance-secret-${referenceBase}`;
  try {
    const certificate = await input.provider.storeComplianceCertificate({
      organizationId: input.organizationId, egsUnitId: input.egsUnitId, referenceId: certificateReferenceId,
      environment: "SANDBOX", certificateRequestId: input.requestId, certificateFingerprint: input.certificateMetadata.fingerprint,
      certificateIssuer: input.certificateMetadata.issuer, certificateSerialNumber: input.certificateMetadata.serialNumber,
      expiresAt: input.certificateMetadata.expiresAt, value: input.certificate.toString("base64"),
    });
    storedReferenceIds.push(certificateReferenceId);
    const secret = await input.provider.storeComplianceSecret({
      organizationId: input.organizationId, egsUnitId: input.egsUnitId, referenceId: secretReferenceId,
      environment: "SANDBOX", certificateRequestId: input.requestId, certificateFingerprint: input.certificateMetadata.fingerprint,
      certificateIssuer: input.certificateMetadata.issuer, certificateSerialNumber: input.certificateMetadata.serialNumber,
      expiresAt: input.certificateMetadata.expiresAt, value: input.secret.toString("utf8"),
    });
    storedReferenceIds.push(secretReferenceId);
    return {
      certificateReferenceId: certificate.referenceId, secretReferenceId: secret.referenceId,
      certificateFingerprint: input.certificateMetadata.fingerprint, certificateIssuer: input.certificateMetadata.issuer,
      certificateSerialNumber: input.certificateMetadata.serialNumber, certificateExpiresAt: input.certificateMetadata.expiresAt,
      requestHash: input.requestHash ?? "", responseHash: input.responseHash ?? "", plaintextValuesRetained: false,
    };
  } catch {
    const rollbackSucceeded = await rollback(input, storedReferenceIds);
    throw new SimulationComplianceCsidCustodyError(rollbackSucceeded ? "CUSTODY_PARTIAL_STORAGE_ROLLED_BACK" : "CUSTODY_PARTIAL_ROLLBACK_FAILED");
  } finally {
    input.certificate.fill(0);
    input.secret.fill(0);
  }
}

async function rollback(input: { provider: RequiredCustodyProvider; organizationId: string; egsUnitId: string }, storedReferenceIds: readonly string[]): Promise<boolean> {
  try {
    for (const referenceId of [...storedReferenceIds].reverse()) {
      const revokeInput = { organizationId: input.organizationId, egsUnitId: input.egsUnitId, referenceId };
      await input.provider.revokeReference(revokeInput);
      if (input.provider.deleteReference) await input.provider.deleteReference({ ...revokeInput, environment: "SANDBOX" });
    }
    return true;
  } catch {
    return false;
  }
}
