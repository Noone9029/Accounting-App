import { createHash, createPrivateKey, createPublicKey, generateKeyPairSync, sign, verify, type KeyObject } from "node:crypto";
import { SandboxLocalDpapiComplianceCsidCustodyProvider, redactSecretReference } from "./compliance-csid-secret-custody.provider";

export interface SandboxCsrSubject {
  commonName: string;
  serialNumber: string;
  organizationName: string;
  organizationalUnitName: string;
  countryName: string;
  localityName: string;
  solutionName: string;
  businessCategory: string;
}

export interface SandboxCsrReadinessResult {
  algorithm: "EC_SECP256K1";
  csrVerified: boolean;
  publicKeyMatchesCustody: boolean;
  csrReferenceId: string;
  csrSha256: string;
  publicKeyFingerprint: string;
  generatedAt: string;
  privateKeyReturned: false;
  csrBodyReturned: false;
  productionCompliance: false;
}

export class SandboxCsrReadinessError extends Error {
  constructor() {
    super("Sandbox CSR readiness operation failed. Sensitive key and CSR details were redacted.");
    this.name = "SandboxCsrReadinessError";
  }
}

export class SandboxCsrReadinessService {
  private readonly now: () => Date;

  constructor(private readonly options: { custody: SandboxLocalDpapiComplianceCsidCustodyProvider; now?: () => Date }) {
    this.now = options.now ?? (() => new Date());
  }

  async createSyntheticCsr(input: {
    organizationId: string;
    egsUnitId: string;
    keyReferenceId: string;
    csrReferenceId: string;
    subject: SandboxCsrSubject;
  }): Promise<SandboxCsrReadinessResult> {
    this.assertInput(input);
    const pair = generateKeyPairSync("ec", { namedCurve: "secp256k1" });
    let privateKeyPem = Buffer.from(pair.privateKey.export({ type: "sec1", format: "pem" }).toString(), "utf8");
    try {
      await this.options.custody.storeComplianceSecret({
        organizationId: input.organizationId,
        egsUnitId: input.egsUnitId,
        referenceId: input.keyReferenceId,
        environment: "SANDBOX",
        value: privateKeyPem.toString("utf8"),
      });
      const publicKey = Buffer.from(pair.publicKey.export({ type: "spki", format: "der" }));
      const subject = encodeSubject(input.subject);
      const certificationRequestInfo = derSequence(derInteger(0), subject, publicKey, Buffer.from([0xa0, 0x00]));
      const signature = await this.options.custody.readSecretForOperation(
        { organizationId: input.organizationId, egsUnitId: input.egsUnitId, referenceId: input.keyReferenceId, environment: "SANDBOX" },
        async (sealedKey) => sign("sha256", certificationRequestInfo, createPrivateKey(sealedKey)),
      );
      const csr = derSequence(certificationRequestInfo, derSequence(derOid("1.2.840.10045.4.3.2")), derBitString(signature));
      const verified = verify("sha256", certificationRequestInfo, createPublicKey({ key: publicKey, format: "der", type: "spki" }), signature);
      const custodyPublicKey = await this.options.custody.readSecretForOperation(
        { organizationId: input.organizationId, egsUnitId: input.egsUnitId, referenceId: input.keyReferenceId, environment: "SANDBOX" },
        async (sealedKey) => Buffer.from(createPublicKey(createPrivateKey(sealedKey)).export({ type: "spki", format: "der" })),
      );
      return {
        algorithm: "EC_SECP256K1",
        csrVerified: verified,
        publicKeyMatchesCustody: publicKey.equals(custodyPublicKey),
        csrReferenceId: redactSecretReference(input.csrReferenceId),
        csrSha256: createHash("sha256").update(csr).digest("hex"),
        publicKeyFingerprint: createHash("sha256").update(publicKey).digest("hex"),
        generatedAt: this.now().toISOString(),
        privateKeyReturned: false,
        csrBodyReturned: false,
        productionCompliance: false,
      };
    } catch {
      throw new SandboxCsrReadinessError();
    } finally {
      privateKeyPem.fill(0);
    }
  }

  private assertInput(input: { organizationId: string; egsUnitId: string; keyReferenceId: string; csrReferenceId: string; subject: SandboxCsrSubject }) {
    if (!input.organizationId?.trim() || !input.egsUnitId?.trim() || !input.keyReferenceId?.trim() || !input.csrReferenceId?.trim() || input.subject.countryName !== "SA") {
      throw new SandboxCsrReadinessError();
    }
    for (const value of Object.values(input.subject)) {
      if (!value?.trim() || /[\r\n\u0000]/.test(value)) throw new SandboxCsrReadinessError();
    }
  }
}

function encodeSubject(subject: SandboxCsrSubject): Buffer {
  return derSequence(
    rdn("2.5.4.3", subject.commonName), rdn("2.5.4.5", subject.serialNumber), rdn("2.5.4.10", subject.organizationName), rdn("2.5.4.11", subject.organizationalUnitName),
    rdn("2.5.4.6", subject.countryName), rdn("2.5.4.7", subject.localityName), rdn("2.5.4.12", subject.solutionName), rdn("2.5.4.13", subject.businessCategory),
  );
}

function rdn(oid: string, value: string): Buffer { return derSet(derSequence(derOid(oid), derUtf8(value))); }
function derSequence(...values: Buffer[]): Buffer { return der(0x30, Buffer.concat(values)); }
function derSet(...values: Buffer[]): Buffer { return der(0x31, Buffer.concat(values)); }
function derUtf8(value: string): Buffer { return der(0x0c, Buffer.from(value, "utf8")); }
function derInteger(value: number): Buffer { return der(0x02, Buffer.from([value])); }
function derBitString(value: Buffer): Buffer { return der(0x03, Buffer.concat([Buffer.from([0]), value])); }
function der(tag: number, value: Buffer): Buffer { return Buffer.concat([Buffer.from([tag]), derLength(value.length), value]); }
function derLength(length: number): Buffer {
  if (length < 128) return Buffer.from([length]);
  const octets: number[] = [];
  for (let value = length; value > 0; value >>>= 8) octets.unshift(value & 0xff);
  return Buffer.from([0x80 | octets.length, ...octets]);
}
function derOid(oid: string): Buffer {
  const parts = oid.split(".").map(Number); const bytes = [40 * parts[0]! + parts[1]!];
  for (const value of parts.slice(2)) { const encoded = [value & 0x7f]; for (let n = value >>> 7; n > 0; n >>>= 7) encoded.unshift((n & 0x7f) | 0x80); bytes.push(...encoded); }
  return der(0x06, Buffer.from(bytes));
}
