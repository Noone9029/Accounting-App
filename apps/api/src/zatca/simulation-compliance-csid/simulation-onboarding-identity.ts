import { createHash, generateKeyPairSync } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { SandboxLocalDpapiComplianceCsidCustodyProvider } from "../custody/compliance-csid-secret-custody.provider";
import {
  inspectZatcaSdkSimulationCsr,
  type ZatcaSdkCsrExpectedSubject,
} from "../custody/zatca-sdk-csr-inspector";

export type SimulationOnboardingCsrSubject = ZatcaSdkCsrExpectedSubject;

export class SimulationOnboardingIdentityError extends Error {
  constructor(
    readonly code:
      | "IDENTITY_EXTERNAL_PATH_REJECTED"
      | "IDENTITY_INPUT_REJECTED"
      | "IDENTITY_PREPARATION_FAILED"
      | "IDENTITY_CLEANUP_FAILED",
  ) {
    super("Synthetic Simulation onboarding identity preparation failed.");
    this.name = "SimulationOnboardingIdentityError";
  }
}

export interface SyntheticSimulationOnboardingIdentityResult {
  identityReferenceId: string;
  keyReferenceId: string;
  csrSha256: string;
  publicKeyFingerprint: string;
  csrVerified: boolean;
  publicKeyMatchesCustody: boolean;
  syntheticDataOnly: true;
  privateKeyReturned: false;
  csrBodyReturned: false;
  identityMetadataPath?: never;
  productionCompliance: false;
}

export async function prepareSyntheticSimulationOnboardingIdentity(input: {
  custody: SandboxLocalDpapiComplianceCsidCustodyProvider;
  repositoryRoot: string;
  externalDirectory: string;
  organizationId: string;
  egsUnitId: string;
  identityReferenceId: string;
  subject: SimulationOnboardingCsrSubject;
}): Promise<SyntheticSimulationOnboardingIdentityResult> {
  assertInput(input);
  const externalDirectory = resolve(input.externalDirectory);
  if (isInside(externalDirectory, resolve(input.repositoryRoot))) {
    throw new SimulationOnboardingIdentityError("IDENTITY_EXTERNAL_PATH_REJECTED");
  }
  const keyReferenceId = `simulation-signing-key-${input.identityReferenceId}`;
  const csrPath = join(externalDirectory, `${input.identityReferenceId}.csr`);
  const metadataPath = join(externalDirectory, `${input.identityReferenceId}.json`);
  const pair = generateKeyPairSync("ec", { namedCurve: "secp256k1" });
  let privateKey = Buffer.from(
    pair.privateKey.export({ type: "sec1", format: "pem" }).toString(),
    "utf8",
  );
  let publicKey: Buffer | undefined;
  let certificationRequestInfo: Buffer | undefined;
  let signature: Buffer | undefined;
  let csr: Buffer | undefined;
  let custodySpki: Buffer | undefined;
  let stored = false;
  let csrWritten = false;
  let metadataWritten = false;
  try {
    await mkdir(externalDirectory, { recursive: true });
    await input.custody.storeComplianceSecret({
      organizationId: input.organizationId,
      egsUnitId: input.egsUnitId,
      referenceId: keyReferenceId,
      environment: "SANDBOX",
      value: privateKey.toString("utf8"),
    });
    stored = true;
    publicKey = Buffer.from(pair.publicKey.export({ type: "spki", format: "der" }));
    certificationRequestInfo = derSequence(
      derInteger(0),
      encodeDistinguishedSubject(input.subject),
      publicKey,
      der(0xa0, extensionRequestAttributes(input.subject)),
    );
    signature = await input.custody.signSha256ForOperation(
      {
        organizationId: input.organizationId,
        egsUnitId: input.egsUnitId,
        referenceId: keyReferenceId,
        environment: "SANDBOX",
      },
      certificationRequestInfo,
    );
    csr = derSequence(
      certificationRequestInfo,
      derSequence(derOid("1.2.840.10045.4.3.2")),
      derBitString(signature),
    );
    custodySpki = await input.custody.deriveSpkiPublicKeyForOperation({
      organizationId: input.organizationId,
      egsUnitId: input.egsUnitId,
      referenceId: keyReferenceId,
      environment: "SANDBOX",
    });
    const inspection = inspectZatcaSdkSimulationCsr({
      csrDer: csr,
      expectedSubject: input.subject,
      expectedPublicKeySpkiDer: custodySpki,
    });
    if (!inspection.valid) {
      throw new SimulationOnboardingIdentityError("IDENTITY_PREPARATION_FAILED");
    }
    const publicKeyMatchesCustody = publicKey.equals(custodySpki);
    if (!publicKeyMatchesCustody) {
      throw new SimulationOnboardingIdentityError("IDENTITY_PREPARATION_FAILED");
    }
    await writeFile(csrPath, csr.toString("base64"), {
      encoding: "utf8",
      flag: "wx",
      mode: 0o600,
    });
    csrWritten = true;
    const csrSha256 = createHash("sha256").update(csr).digest("hex");
    const publicKeyFingerprint = createHash("sha256").update(publicKey).digest("hex");
    await writeFile(
      metadataPath,
      JSON.stringify({
        schemaVersion: 1,
        environment: "FATOORA_SIMULATION",
        identityReferenceId: input.identityReferenceId,
        organizationReference: input.organizationId,
        egsReference: input.egsUnitId,
        keyReferenceId,
        csrPath,
        csrSha256,
        publicKeyFingerprint,
        subject: input.subject,
        syntheticDataOnly: true,
        productionAllowed: false,
      }),
      { encoding: "utf8", flag: "wx", mode: 0o600 },
    );
    metadataWritten = true;
    return {
      identityReferenceId: input.identityReferenceId,
      keyReferenceId,
      csrSha256,
      publicKeyFingerprint,
      csrVerified: true,
      publicKeyMatchesCustody,
      syntheticDataOnly: true,
      privateKeyReturned: false,
      csrBodyReturned: false,
      productionCompliance: false,
    };
  } catch (error) {
    const cleanupOk = await cleanupFailure({
      custody: input.custody,
      organizationId: input.organizationId,
      egsUnitId: input.egsUnitId,
      keyReferenceId,
      csrPath,
      metadataPath,
      stored,
      csrWritten,
      metadataWritten,
    });
    if (!cleanupOk) {
      throw new SimulationOnboardingIdentityError("IDENTITY_CLEANUP_FAILED");
    }
    if (error instanceof SimulationOnboardingIdentityError) {
      throw error;
    }
    throw new SimulationOnboardingIdentityError("IDENTITY_PREPARATION_FAILED");
  } finally {
    privateKey.fill(0);
    publicKey?.fill(0);
    certificationRequestInfo?.fill(0);
    signature?.fill(0);
    csr?.fill(0);
    custodySpki?.fill(0);
  }
}

async function cleanupFailure(input: {
  custody: SandboxLocalDpapiComplianceCsidCustodyProvider;
  organizationId: string;
  egsUnitId: string;
  keyReferenceId: string;
  csrPath: string;
  metadataPath: string;
  stored: boolean;
  csrWritten: boolean;
  metadataWritten: boolean;
}): Promise<boolean> {
  try {
    if (input.metadataWritten) await rm(input.metadataPath, { force: true });
    if (input.csrWritten) await rm(input.csrPath, { force: true });
    if (input.stored) {
      const reference = {
        organizationId: input.organizationId,
        egsUnitId: input.egsUnitId,
        referenceId: input.keyReferenceId,
        environment: "SANDBOX" as const,
      };
      await input.custody.revokeReference(reference);
      await input.custody.deleteReference(reference);
    }
    return true;
  } catch {
    return false;
  }
}

function assertInput(input: {
  organizationId: string;
  egsUnitId: string;
  identityReferenceId: string;
  subject: SimulationOnboardingCsrSubject;
}): void {
  if (
    !/^[A-Za-z0-9_-]{8,128}$/u.test(input.identityReferenceId) ||
    !input.organizationId.startsWith("synthetic-") ||
    !input.egsUnitId.startsWith("synthetic-") ||
    input.subject.countryName !== "SA"
  ) {
    throw new SimulationOnboardingIdentityError("IDENTITY_INPUT_REJECTED");
  }
  for (const [field, value] of Object.entries(input.subject)) {
    if (!value.trim() || /[\r\n\u0000]/u.test(value)) {
      throw new SimulationOnboardingIdentityError("IDENTITY_INPUT_REJECTED");
    }
    if (field === "invoiceType") {
      if (!/^[01]{4}$/u.test(value)) throw new SimulationOnboardingIdentityError("IDENTITY_INPUT_REJECTED");
    } else if (field !== "countryName" && !/synthetic|riyadh|sa/iu.test(value)) {
      throw new SimulationOnboardingIdentityError("IDENTITY_INPUT_REJECTED");
    }
  }
}

function encodeDistinguishedSubject(subject: SimulationOnboardingCsrSubject): Buffer {
  return derSequence(
    rdn("2.5.4.6", subject.countryName, 0x13),
    rdn("2.5.4.11", subject.organizationalUnitName),
    rdn("2.5.4.10", subject.organizationName),
    rdn("2.5.4.3", subject.commonName),
  );
}

function extensionRequestAttributes(subject: SimulationOnboardingCsrSubject): Buffer {
  const directoryName = der(
    0xa4,
    derSequence(
      rdn("2.5.4.4", subject.serialNumber),
      rdn("0.9.2342.19200300.100.1.1", subject.organizationIdentifier),
      rdn("2.5.4.12", subject.invoiceType),
      rdn("2.5.4.26", subject.locationAddress),
      rdn("2.5.4.15", subject.businessCategory),
    ),
  );
  const extensions = derSequence(
    derSequence(
      derOid("1.3.6.1.4.1.311.20.2"),
      der(0x04, der(0x13, Buffer.from("PREZATCA-Code-Signing", "ascii"))),
    ),
    derSequence(
      derOid("2.5.29.17"),
      der(0x04, derSequence(directoryName)),
    ),
  );
  return derSequence(derOid("1.2.840.113549.1.9.14"), derSet(extensions));
}

function rdn(oid: string, value: string, tag = 0x0c): Buffer {
  return derSet(derSequence(derOid(oid), der(tag, Buffer.from(value, tag === 0x13 ? "ascii" : "utf8"))));
}
function isInside(candidate: string, parent: string): boolean {
  const value = relative(parent, candidate);
  return value === "" || (!value.startsWith("..") && !value.includes("..\\") && !value.includes("../"));
}
function derSequence(...values: Buffer[]): Buffer { return der(0x30, Buffer.concat(values)); }
function derSet(...values: Buffer[]): Buffer { return der(0x31, Buffer.concat(values)); }
function derInteger(value: number): Buffer { return der(0x02, Buffer.from([value])); }
function derBitString(value: Buffer): Buffer { return der(0x03, Buffer.concat([Buffer.from([0]), value])); }
function der(tag: number, value: Buffer): Buffer { return Buffer.concat([Buffer.from([tag]), derLength(value.length), value]); }
function derLength(length: number): Buffer {
  if (length < 128) return Buffer.from([length]);
  const bytes: number[] = [];
  for (let value = length; value > 0; value >>>= 8) bytes.unshift(value & 0xff);
  return Buffer.from([0x80 | bytes.length, ...bytes]);
}
function derOid(oid: string): Buffer {
  const parts = oid.split(".").map(Number);
  const bytes = [40 * parts[0]! + parts[1]!];
  for (const value of parts.slice(2)) {
    const encoded = [value & 0x7f];
    for (let current = value >>> 7; current > 0; current >>>= 7) encoded.unshift((current & 0x7f) | 0x80);
    bytes.push(...encoded);
  }
  return der(0x06, Buffer.from(bytes));
}
