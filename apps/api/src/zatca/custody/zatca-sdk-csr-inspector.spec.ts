import { generateKeyPairSync, sign } from "node:crypto";
import {
  inspectZatcaSdkSimulationCsr,
  type ZatcaSdkCsrExpectedSubject,
  type ZatcaSdkCsrInspectionResult,
} from "./zatca-sdk-csr-inspector";

const OIDS = {
  commonName: "2.5.4.3",
  countryName: "2.5.4.6",
  organizationName: "2.5.4.10",
  organizationalUnitName: "2.5.4.11",
  surname: "2.5.4.4",
  uid: "0.9.2342.19200300.100.1.1",
  title: "2.5.4.12",
  registeredAddress: "2.5.4.26",
  businessCategory: "2.5.4.15",
  extensionRequest: "1.2.840.113549.1.9.14",
  subjectAltName: "2.5.29.17",
  certificateTemplateName: "1.3.6.1.4.1.311.20.2",
  ecPublicKey: "1.2.840.10045.2.1",
  secp256k1: "1.3.132.0.10",
  ecdsaSha256: "1.2.840.10045.4.3.2",
} as const;

const expectedSubject: ZatcaSdkCsrExpectedSubject = {
  commonName: "TST-886431145-399999999900003",
  serialNumber: "1-TST|2-TST|3-ed22f1d8-e6a2-1118-9b58-d9a8f11e445f",
  organizationIdentifier: "399999999900003",
  organizationalUnitName: "Synthetic Riyadh Branch",
  organizationName: "Synthetic LedgerByte Taxpayer",
  countryName: "SA",
  invoiceType: "1100",
  locationAddress: "RRRD2929",
  businessCategory: "Synthetic accounting software",
};

type RdnDefinition = {
  oid: string;
  value: string;
  tag?: number;
};

type ExtensionDefinition = {
  oid: string;
  value: Buffer;
  critical?: boolean;
};

type BuildOptions = {
  version?: number;
  subjectRdns?: RdnDefinition[];
  altNameRdns?: RdnDefinition[];
  extensions?: ExtensionDefinition[];
  attributes?: Buffer[];
  signatureOid?: string;
  signatureParameters?: Buffer[];
  keyCurve?: "secp256k1" | "prime256v1";
  templateValue?: string;
  templateTag?: number;
  signatureMutation?: (signature: Buffer) => Buffer;
};

type BuiltCsr = {
  csrDer: Buffer;
  publicKeySpkiDer: Buffer;
};

describe("inspectZatcaSdkSimulationCsr", () => {
  it("independently verifies an official-shaped Simulation CSR without returning sensitive bodies", () => {
    const artifact = buildCsr();

    const result = inspect(artifact);

    expect(result).toEqual({
      valid: true,
      status: "VALID",
      safeErrorCodes: [],
      checks: {
        boundedDer: true,
        structureValid: true,
        signatureAlgorithmValid: true,
        curveValid: true,
        subjectValid: true,
        extensionsValid: true,
        simulationTemplateValid: true,
        expectedPublicKeyMatch: true,
        signatureValid: true,
      },
      sensitiveBodiesReturned: false,
    });
    expect(JSON.stringify(result)).not.toMatch(
      /BEGIN CERTIFICATE REQUEST|PRIVATE KEY|publicKeySpkiDer|publicKeyBody|signatureValue|subjectValue|csrDer/i,
    );
  });

  it.each([
    {
      id: "DER-EMPTY",
      mutate: () => Buffer.alloc(0),
      expectedStatus: "MALFORMED_DER",
      expectedCode: "ZATCA_CSR_MALFORMED_DER",
    },
    {
      id: "DER-TRUNCATED",
      mutate: (csr: Buffer) => csr.subarray(0, csr.length - 1),
      expectedStatus: "MALFORMED_DER",
      expectedCode: "ZATCA_CSR_MALFORMED_DER",
    },
    {
      id: "DER-TRAILING",
      mutate: (csr: Buffer) => Buffer.concat([csr, Buffer.from([0])]),
      expectedStatus: "MALFORMED_DER",
      expectedCode: "ZATCA_CSR_MALFORMED_DER",
    },
    {
      id: "DER-INDEFINITE-LENGTH",
      mutate: (csr: Buffer) => Buffer.concat([Buffer.from([0x30, 0x80]), csr.subarray(2), Buffer.from([0, 0])]),
      expectedStatus: "MALFORMED_DER",
      expectedCode: "ZATCA_CSR_MALFORMED_DER",
    },
    {
      id: "DER-NON-MINIMAL-LENGTH",
      mutate: (csr: Buffer) => {
        const outer = readTestElement(csr, 0);
        return Buffer.concat([Buffer.from([0x30, 0x82, 0x00, outer.contentLength]), csr.subarray(outer.contentStart)]);
      },
      expectedStatus: "MALFORMED_DER",
      expectedCode: "ZATCA_CSR_MALFORMED_DER",
    },
    {
      id: "DER-HIGH-TAG-NUMBER",
      mutate: (csr: Buffer) => Buffer.concat([Buffer.from([0x3f]), csr.subarray(1)]),
      expectedStatus: "MALFORMED_DER",
      expectedCode: "ZATCA_CSR_MALFORMED_DER",
    },
  ])("$id fails closed with a bounded DER classification", ({ mutate, expectedStatus, expectedCode }) => {
    const artifact = buildCsr();
    const result = inspect({ ...artifact, csrDer: mutate(artifact.csrDer) });

    expect(result.valid).toBe(false);
    expect(result.status).toBe(expectedStatus);
    expect(result.safeErrorCodes).toEqual([expectedCode]);
    expect(result.checks.signatureValid).toBe(false);
  });

  it("rejects an oversized input before structural or cryptographic processing", () => {
    const artifact = buildCsr();
    const result = inspect({ ...artifact, csrDer: Buffer.alloc(65_537, 0x30) });

    expect(result.status).toBe("MALFORMED_DER");
    expect(result.safeErrorCodes).toEqual(["ZATCA_CSR_DER_SIZE_INVALID"]);
    expect(result.checks).toEqual({
      boundedDer: false,
      structureValid: false,
      signatureAlgorithmValid: false,
      curveValid: false,
      subjectValid: false,
      extensionsValid: false,
      simulationTemplateValid: false,
      expectedPublicKeyMatch: false,
      signatureValid: false,
    });
  });

  it("rejects a non-zero PKCS#10 version as unsupported structure", () => {
    const result = inspect(buildCsr({ version: 1 }));

    expect(result.status).toBe("UNSUPPORTED_STRUCTURE");
    expect(result.safeErrorCodes).toEqual(["ZATCA_CSR_VERSION_INVALID"]);
    expect(result.checks.boundedDer).toBe(true);
    expect(result.checks.structureValid).toBe(false);
    expect(result.checks.signatureAlgorithmValid).toBe(false);
  });

  it.each([
    {
      id: "SIGNATURE-OID",
      artifact: () => buildCsr({ signatureOid: "1.2.840.10045.4.3.3" }),
      expectedCode: "ZATCA_CSR_SIGNATURE_ALGORITHM_UNSUPPORTED",
    },
    {
      id: "SIGNATURE-PARAMETERS",
      artifact: () => buildCsr({ signatureParameters: [der(0x05, Buffer.alloc(0))] }),
      expectedCode: "ZATCA_CSR_SIGNATURE_ALGORITHM_UNSUPPORTED",
    },
    {
      id: "CURVE",
      artifact: () => buildCsr({ keyCurve: "prime256v1" }),
      expectedCode: "ZATCA_CSR_CURVE_UNSUPPORTED",
    },
  ])("$id rejects algorithm substitution before subject and signature verification", ({ artifact, expectedCode }) => {
    const result = inspect(artifact());

    expect(result.status).toBe("UNSUPPORTED_ALGORITHM");
    expect(result.safeErrorCodes).toEqual([expectedCode]);
    expect(result.checks.subjectValid).toBe(false);
    expect(result.checks.signatureValid).toBe(false);
  });

  it.each([
    {
      id: "SUBJECT-MISSING",
      mutate: (rdns: RdnDefinition[]) => rdns.filter((entry) => entry.oid !== OIDS.commonName),
      code: "ZATCA_CSR_SUBJECT_FIELD_SET_INVALID",
    },
    {
      id: "SUBJECT-DUPLICATE",
      mutate: (rdns: RdnDefinition[]) => [...rdns, { ...rdns[0]! }],
      code: "ZATCA_CSR_SUBJECT_FIELD_SET_INVALID",
    },
    {
      id: "SUBJECT-UNKNOWN",
      mutate: (rdns: RdnDefinition[]) => [...rdns, { oid: "2.5.4.7", value: "Riyadh" }],
      code: "ZATCA_CSR_SUBJECT_FIELD_SET_INVALID",
    },
    {
      id: "SUBJECT-VALUE",
      mutate: (rdns: RdnDefinition[]) =>
        rdns.map((entry) => (entry.oid === OIDS.organizationName ? { ...entry, value: "Altered taxpayer" } : entry)),
      code: "ZATCA_CSR_SUBJECT_VALUE_INVALID",
    },
  ])("$id rejects an invalid subject with a safe classification", ({ mutate, code }) => {
    const result = inspect(buildCsr({ subjectRdns: mutate(defaultSubjectRdns()) }));

    expect(result.status).toBe("SUBJECT_INVALID");
    expect(result.safeErrorCodes).toEqual([code]);
    expect(result.checks.subjectValid).toBe(false);
    expect(result.checks.extensionsValid).toBe(false);
    expect(result.checks.signatureValid).toBe(false);
  });

  it.each([
    {
      id: "EXTENSION-REQUEST-MISSING",
      artifact: () => buildCsr({ attributes: [] }),
      code: "ZATCA_CSR_EXTENSION_REQUEST_INVALID",
    },
    {
      id: "EXTENSION-REQUEST-DUPLICATE",
      artifact: () => {
        const request = extensionRequestAttribute(defaultExtensions());
        return buildCsr({ attributes: [request, request] });
      },
      code: "ZATCA_CSR_EXTENSION_REQUEST_INVALID",
    },
    {
      id: "ATTRIBUTE-UNKNOWN",
      artifact: () => buildCsr({ attributes: [derSequence(derOid("1.2.840.113549.1.9.7"), derSet(derUtf8("challenge"))) ] }),
      code: "ZATCA_CSR_EXTENSION_REQUEST_INVALID",
    },
    {
      id: "SAN-MISSING",
      artifact: () => buildCsr({ extensions: defaultExtensions().filter((entry) => entry.oid !== OIDS.subjectAltName) }),
      code: "ZATCA_CSR_EXTENSION_SET_INVALID",
    },
    {
      id: "SAN-DUPLICATE",
      artifact: () => {
        const extensions = defaultExtensions();
        return buildCsr({ extensions: [...extensions, extensions.find((entry) => entry.oid === OIDS.subjectAltName)!] });
      },
      code: "ZATCA_CSR_EXTENSION_SET_INVALID",
    },
    {
      id: "EXTENSION-UNKNOWN",
      artifact: () => buildCsr({ extensions: [...defaultExtensions(), { oid: "2.5.29.19", value: derSequence() }] }),
      code: "ZATCA_CSR_EXTENSION_SET_INVALID",
    },
    {
      id: "SAN-FIELD-MISSING",
      artifact: () =>
        buildCsr({
          altNameRdns: defaultAltNameRdns().filter((entry) => entry.oid !== OIDS.registeredAddress),
        }),
      code: "ZATCA_CSR_SAN_INVALID",
    },
    {
      id: "SAN-FIELD-DUPLICATE",
      artifact: () => {
        const entries = defaultAltNameRdns();
        return buildCsr({ altNameRdns: [...entries, { ...entries[0]! }] });
      },
      code: "ZATCA_CSR_SAN_INVALID",
    },
    {
      id: "SAN-VALUE",
      artifact: () =>
        buildCsr({
          altNameRdns: defaultAltNameRdns().map((entry) =>
            entry.oid === OIDS.title ? { ...entry, value: "0100" } : entry,
          ),
        }),
      code: "ZATCA_CSR_SAN_VALUE_INVALID",
    },
  ])("$id rejects invalid requested extensions without reaching signature verification", ({ artifact, code }) => {
    const result = inspect(artifact());

    expect(result.status).toBe("EXTENSIONS_INVALID");
    expect(result.safeErrorCodes).toEqual([code]);
    expect(result.checks.subjectValid).toBe(true);
    expect(result.checks.extensionsValid).toBe(false);
    expect(result.checks.signatureValid).toBe(false);
  });

  it.each([
    {
      id: "PRODUCTION-TEMPLATE",
      options: { templateValue: "ZATCA-Code-Signing" },
      code: "ZATCA_CSR_SIMULATION_TEMPLATE_INVALID",
    },
    {
      id: "TEMPLATE-TAG",
      options: { templateTag: 0x16 },
      code: "ZATCA_CSR_SIMULATION_TEMPLATE_INVALID",
    },
  ])("$id rejects a non-Simulation certificate template", ({ options, code }) => {
    const result = inspect(buildCsr(options));

    expect(result.status).toBe("TEMPLATE_INVALID");
    expect(result.safeErrorCodes).toEqual([code]);
    expect(result.checks.extensionsValid).toBe(true);
    expect(result.checks.simulationTemplateValid).toBe(false);
    expect(result.checks.expectedPublicKeyMatch).toBe(false);
  });

  it("accepts the official SDK UTF8String encoding for the exact Simulation template", () => {
    const result = inspect(
      buildCsr({
        templateTag: 0x0c,
        templateValue: "PREZATCA-Code-Signing",
      }),
    );

    expect(result.status).toBe("VALID");
    expect(result.safeErrorCodes).toEqual([]);
    expect(result.checks.simulationTemplateValid).toBe(true);
    expect(result.checks.expectedPublicKeyMatch).toBe(true);
    expect(result.checks.signatureValid).toBe(true);
  });

  it("rejects a public key that does not match the SDK-generated private key", () => {
    const artifact = buildCsr();
    const replacement = buildCsr();
    const result = inspect({ ...artifact, publicKeySpkiDer: replacement.publicKeySpkiDer });

    expect(result.status).toBe("KEY_MISMATCH");
    expect(result.safeErrorCodes).toEqual(["ZATCA_CSR_PUBLIC_KEY_MISMATCH"]);
    expect(result.checks.simulationTemplateValid).toBe(true);
    expect(result.checks.expectedPublicKeyMatch).toBe(false);
    expect(result.checks.signatureValid).toBe(false);
  });

  it("rejects an altered DER-encoded ECDSA signature", () => {
    const result = inspect(
      buildCsr({
        signatureMutation: (signature) => {
          const changed = Buffer.from(signature);
          changed[changed.length - 1] = changed[changed.length - 1]! ^ 0x01;
          return changed;
        },
      }),
    );

    expect(result.status).toBe("SIGNATURE_INVALID");
    expect(result.safeErrorCodes).toEqual(["ZATCA_CSR_SIGNATURE_INVALID"]);
    expect(result.checks.expectedPublicKeyMatch).toBe(true);
    expect(result.checks.signatureValid).toBe(false);
  });

  it("returns a consistent fail-closed result for a bounded malformed corpus without exposing raw parser errors", () => {
    const artifact = buildCsr();
    const corpus = [
      ...Array.from({ length: Math.min(80, artifact.csrDer.length) }, (_, index) =>
        artifact.csrDer.subarray(0, index),
      ),
      Buffer.from([0x30]),
      Buffer.from([0x30, 0x81]),
      Buffer.from([0x30, 0xff, 0, 0, 0]),
      Buffer.alloc(512, 0xff),
      Buffer.from(Array.from({ length: 256 }, (_, index) => (index * 31) & 0xff)),
    ];

    for (const csrDer of corpus) {
      expect(() => inspect({ ...artifact, csrDer })).not.toThrow();
      const result = inspect({ ...artifact, csrDer });
      assertResultInvariant(result);
      expect(result.valid).toBe(false);
      expect(result.safeErrorCodes).not.toHaveLength(0);
      expect(JSON.stringify(result)).not.toMatch(
        /truncated|offset|asn|BEGIN CERTIFICATE REQUEST|PRIVATE KEY|[A-Za-z0-9+/]{100}/i,
      );
    }
  });
});

function inspect(artifact: BuiltCsr): ZatcaSdkCsrInspectionResult {
  return inspectZatcaSdkSimulationCsr({
    csrDer: artifact.csrDer,
    expectedSubject,
    expectedPublicKeySpkiDer: artifact.publicKeySpkiDer,
  });
}

function assertResultInvariant(result: ZatcaSdkCsrInspectionResult): void {
  const checks = Object.values(result.checks);
  expect(result.valid).toBe(result.status === "VALID");
  if (result.valid) {
    expect(checks.every(Boolean)).toBe(true);
    expect(result.safeErrorCodes).toEqual([]);
  } else {
    expect(result.safeErrorCodes).toHaveLength(1);
    expect(result.checks.signatureValid && result.status !== "VALID").toBe(false);
  }
  expect(result.sensitiveBodiesReturned).toBe(false);
}

function buildCsr(options: BuildOptions = {}): BuiltCsr {
  const keyPair = generateKeyPairSync("ec", {
    namedCurve: options.keyCurve ?? "secp256k1",
  });
  const publicKeySpkiDer = Buffer.from(
    keyPair.publicKey.export({ format: "der", type: "spki" }),
  );
  const subject = buildName(options.subjectRdns ?? defaultSubjectRdns());
  const extensions =
    options.extensions ??
    defaultExtensions({
      altNameRdns: options.altNameRdns,
      templateValue: options.templateValue,
      templateTag: options.templateTag,
    });
  const attributes =
    options.attributes ?? [extensionRequestAttribute(extensions)];
  const certificationRequestInfo = derSequence(
    derInteger(options.version ?? 0),
    subject,
    publicKeySpkiDer,
    der(0xa0, Buffer.concat(attributes)),
  );
  const signature = sign("sha256", certificationRequestInfo, {
    key: keyPair.privateKey,
    dsaEncoding: "der",
  });
  const serializedSignature =
    options.signatureMutation?.(signature) ?? signature;
  const signatureAlgorithm = derSequence(
    derOid(options.signatureOid ?? OIDS.ecdsaSha256),
    ...(options.signatureParameters ?? []),
  );
  return {
    csrDer: derSequence(
      certificationRequestInfo,
      signatureAlgorithm,
      derBitString(serializedSignature),
    ),
    publicKeySpkiDer,
  };
}

function defaultSubjectRdns(): RdnDefinition[] {
  return [
    { oid: OIDS.countryName, value: expectedSubject.countryName, tag: 0x13 },
    { oid: OIDS.organizationalUnitName, value: expectedSubject.organizationalUnitName },
    { oid: OIDS.organizationName, value: expectedSubject.organizationName },
    { oid: OIDS.commonName, value: expectedSubject.commonName },
  ];
}

function defaultAltNameRdns(): RdnDefinition[] {
  return [
    { oid: OIDS.surname, value: expectedSubject.serialNumber },
    { oid: OIDS.uid, value: expectedSubject.organizationIdentifier },
    { oid: OIDS.title, value: expectedSubject.invoiceType },
    { oid: OIDS.registeredAddress, value: expectedSubject.locationAddress },
    { oid: OIDS.businessCategory, value: expectedSubject.businessCategory },
  ];
}

function defaultExtensions(
  options: Pick<
    BuildOptions,
    "altNameRdns" | "templateValue" | "templateTag"
  > = {},
): ExtensionDefinition[] {
  const directoryName = der(0xa4, buildName(options.altNameRdns ?? defaultAltNameRdns()));
  return [
    {
      oid: OIDS.certificateTemplateName,
      value: der(
        options.templateTag ?? 0x13,
        Buffer.from(options.templateValue ?? "PREZATCA-Code-Signing", "ascii"),
      ),
    },
    {
      oid: OIDS.subjectAltName,
      value: derSequence(directoryName),
    },
  ];
}

function extensionRequestAttribute(extensions: ExtensionDefinition[]): Buffer {
  return derSequence(
    derOid(OIDS.extensionRequest),
    derSet(
      derSequence(
        ...extensions.map((extension) =>
          derSequence(
            derOid(extension.oid),
            ...(extension.critical === undefined
              ? []
              : [der(0x01, Buffer.from([extension.critical ? 0xff : 0]))]),
            der(0x04, extension.value),
          ),
        ),
      ),
    ),
  );
}

function buildName(rdns: RdnDefinition[]): Buffer {
  return derSequence(
    ...rdns.map((entry) =>
      derSet(
        derSequence(
          derOid(entry.oid),
          der(
            entry.tag ?? 0x0c,
            Buffer.from(entry.value, entry.tag === 0x13 ? "ascii" : "utf8"),
          ),
        ),
      ),
    ),
  );
}

function derSequence(...values: Buffer[]): Buffer {
  return der(0x30, Buffer.concat(values));
}

function derSet(...values: Buffer[]): Buffer {
  return der(0x31, Buffer.concat(values));
}

function derUtf8(value: string): Buffer {
  return der(0x0c, Buffer.from(value, "utf8"));
}

function derInteger(value: number): Buffer {
  return der(0x02, Buffer.from([value]));
}

function derBitString(value: Buffer): Buffer {
  return der(0x03, Buffer.concat([Buffer.from([0]), value]));
}

function der(tag: number, value: Buffer): Buffer {
  return Buffer.concat([Buffer.from([tag]), derLength(value.length), value]);
}

function derLength(length: number): Buffer {
  if (length < 0x80) {
    return Buffer.from([length]);
  }
  if (length <= 0xff) {
    return Buffer.from([0x81, length]);
  }
  return Buffer.from([0x82, (length >>> 8) & 0xff, length & 0xff]);
}

function derOid(value: string): Buffer {
  const arcs = value.split(".").map(Number);
  const bytes = [arcs[0]! * 40 + arcs[1]!];
  for (const arc of arcs.slice(2)) {
    const encoded = [arc & 0x7f];
    let remaining = Math.floor(arc / 128);
    while (remaining > 0) {
      encoded.unshift((remaining & 0x7f) | 0x80);
      remaining = Math.floor(remaining / 128);
    }
    bytes.push(...encoded);
  }
  return der(0x06, Buffer.from(bytes));
}

function readTestElement(
  bytes: Buffer,
  offset: number,
): { contentStart: number; contentLength: number } {
  const firstLength = bytes[offset + 1]!;
  if (firstLength < 0x80) {
    return { contentStart: offset + 2, contentLength: firstLength };
  }
  const count = firstLength & 0x7f;
  let length = 0;
  for (let index = 0; index < count; index += 1) {
    length = (length << 8) | bytes[offset + 2 + index]!;
  }
  return { contentStart: offset + 2 + count, contentLength: length };
}
