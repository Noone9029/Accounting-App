import {
  createPublicKey,
  timingSafeEqual,
  verify as verifySignature,
  type KeyObject,
} from "node:crypto";
import { TextDecoder } from "node:util";

export type ZatcaSdkCsrInspectionStatus =
  | "VALID"
  | "MALFORMED_DER"
  | "UNSUPPORTED_STRUCTURE"
  | "UNSUPPORTED_ALGORITHM"
  | "SUBJECT_INVALID"
  | "EXTENSIONS_INVALID"
  | "TEMPLATE_INVALID"
  | "PUBLIC_KEY_INVALID"
  | "KEY_MISMATCH"
  | "SIGNATURE_INVALID";

export type ZatcaSdkCsrSafeErrorCode =
  | "ZATCA_CSR_MALFORMED_DER"
  | "ZATCA_CSR_DER_SIZE_INVALID"
  | "ZATCA_CSR_STRUCTURE_INVALID"
  | "ZATCA_CSR_VERSION_INVALID"
  | "ZATCA_CSR_SIGNATURE_ALGORITHM_UNSUPPORTED"
  | "ZATCA_CSR_PUBLIC_KEY_ALGORITHM_UNSUPPORTED"
  | "ZATCA_CSR_CURVE_UNSUPPORTED"
  | "ZATCA_CSR_SUBJECT_FIELD_SET_INVALID"
  | "ZATCA_CSR_SUBJECT_VALUE_INVALID"
  | "ZATCA_CSR_EXTENSION_REQUEST_INVALID"
  | "ZATCA_CSR_EXTENSION_SET_INVALID"
  | "ZATCA_CSR_SAN_INVALID"
  | "ZATCA_CSR_SAN_VALUE_INVALID"
  | "ZATCA_CSR_SIMULATION_TEMPLATE_INVALID"
  | "ZATCA_CSR_PUBLIC_KEY_INVALID"
  | "ZATCA_CSR_EXPECTED_PUBLIC_KEY_INVALID"
  | "ZATCA_CSR_PUBLIC_KEY_MISMATCH"
  | "ZATCA_CSR_SIGNATURE_INVALID";

export interface ZatcaSdkCsrExpectedSubject {
  commonName: string;
  serialNumber: string;
  organizationIdentifier: string;
  organizationalUnitName: string;
  organizationName: string;
  countryName: string;
  invoiceType: string;
  locationAddress: string;
  businessCategory: string;
}

export interface ZatcaSdkCsrInspectionInput {
  csrDer: Buffer;
  expectedSubject: ZatcaSdkCsrExpectedSubject;
  expectedPublicKeySpkiDer: Buffer;
}

export interface ZatcaSdkCsrInspectionChecks {
  boundedDer: boolean;
  structureValid: boolean;
  signatureAlgorithmValid: boolean;
  curveValid: boolean;
  subjectValid: boolean;
  extensionsValid: boolean;
  simulationTemplateValid: boolean;
  expectedPublicKeyMatch: boolean;
  signatureValid: boolean;
}

export interface ZatcaSdkCsrInspectionResult {
  valid: boolean;
  status: ZatcaSdkCsrInspectionStatus;
  safeErrorCodes: ZatcaSdkCsrSafeErrorCode[];
  checks: ZatcaSdkCsrInspectionChecks;
  sensitiveBodiesReturned: false;
}

const MAX_DER_BYTES = 65_536;
const MAX_DER_DEPTH = 16;
const MAX_DER_NODES = 256;
const MAX_DER_CHILDREN = 64;
const MAX_PRIMITIVE_BYTES = 4_096;
const MAX_OID_ARCS = 32;
const MAX_STRING_BYTES = 1_024;
const SIMULATION_TEMPLATE = "PREZATCA-Code-Signing";
const SECP256K1_ORDER = BigInt(
  "0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141",
);

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

const SUBJECT_EXPECTATIONS: ReadonlyArray<
  readonly [oid: string, field: keyof ZatcaSdkCsrExpectedSubject]
> = [
  [OIDS.commonName, "commonName"],
  [OIDS.organizationalUnitName, "organizationalUnitName"],
  [OIDS.organizationName, "organizationName"],
  [OIDS.countryName, "countryName"],
];

const SAN_EXPECTATIONS: ReadonlyArray<
  readonly [oid: string, field: keyof ZatcaSdkCsrExpectedSubject]
> = [
  [OIDS.surname, "serialNumber"],
  [OIDS.uid, "organizationIdentifier"],
  [OIDS.title, "invoiceType"],
  [OIDS.registeredAddress, "locationAddress"],
  [OIDS.businessCategory, "businessCategory"],
];

const fatalUtf8Decoder = new TextDecoder("utf-8", {
  fatal: true,
  ignoreBOM: true,
});

class DerParseError extends Error {}

class InspectionFailure extends Error {
  constructor(
    readonly status: Exclude<ZatcaSdkCsrInspectionStatus, "VALID">,
    readonly code: ZatcaSdkCsrSafeErrorCode,
  ) {
    super(code);
  }
}

interface DerElement {
  tag: number;
  start: number;
  contentStart: number;
  contentEnd: number;
  end: number;
  depth: number;
}

interface ParsedExtensions {
  templateValue: DerElement;
}

/**
 * Independently inspects an SDK-produced Simulation PKCS#10 CSR.
 *
 * This boundary accepts DER and expected metadata only. It never returns the
 * CSR, subject values, public key, signature, hashes, or raw parser errors.
 */
export function inspectZatcaSdkSimulationCsr(
  input: ZatcaSdkCsrInspectionInput,
): ZatcaSdkCsrInspectionResult {
  const checks = emptyChecks();

  if (
    !Buffer.isBuffer(input?.csrDer) ||
    input.csrDer.length === 0 ||
    input.csrDer.length > MAX_DER_BYTES
  ) {
    return invalidResult(
      "MALFORMED_DER",
      input?.csrDer?.length > MAX_DER_BYTES
        ? "ZATCA_CSR_DER_SIZE_INVALID"
        : "ZATCA_CSR_MALFORMED_DER",
      checks,
    );
  }
  checks.boundedDer = true;

  const parser = new BoundedDerParser(input.csrDer);

  try {
    const outer = parser.readElement(0, 0);
    if (outer.end !== input.csrDer.length) {
      throw new DerParseError("trailing bytes");
    }
    requireTag(outer, 0x30, "UNSUPPORTED_STRUCTURE", "ZATCA_CSR_STRUCTURE_INVALID");
    const outerChildren = parser.readChildren(outer);
    if (outerChildren.length !== 3) {
      fail("UNSUPPORTED_STRUCTURE", "ZATCA_CSR_STRUCTURE_INVALID");
    }

    const certificationRequestInfo = outerChildren[0]!;
    const signatureAlgorithm = outerChildren[1]!;
    const signatureValue = outerChildren[2]!;
    requireTag(
      certificationRequestInfo,
      0x30,
      "UNSUPPORTED_STRUCTURE",
      "ZATCA_CSR_STRUCTURE_INVALID",
    );
    requireTag(
      signatureAlgorithm,
      0x30,
      "UNSUPPORTED_STRUCTURE",
      "ZATCA_CSR_STRUCTURE_INVALID",
    );
    requireTag(
      signatureValue,
      0x03,
      "UNSUPPORTED_STRUCTURE",
      "ZATCA_CSR_STRUCTURE_INVALID",
    );

    const requestInfoChildren = parser.readChildren(certificationRequestInfo);
    if (requestInfoChildren.length !== 4) {
      fail("UNSUPPORTED_STRUCTURE", "ZATCA_CSR_STRUCTURE_INVALID");
    }
    const [version, subject, subjectPublicKeyInfo, attributes] =
      requestInfoChildren as [DerElement, DerElement, DerElement, DerElement];
    if (
      version.tag !== 0x02 ||
      !bufferEquals(parser.content(version), Buffer.from([0]))
    ) {
      fail("UNSUPPORTED_STRUCTURE", "ZATCA_CSR_VERSION_INVALID");
    }
    if (
      subject.tag !== 0x30 ||
      subjectPublicKeyInfo.tag !== 0x30 ||
      attributes.tag !== 0xa0
    ) {
      fail("UNSUPPORTED_STRUCTURE", "ZATCA_CSR_STRUCTURE_INVALID");
    }
    checks.structureValid = true;

    validateSignatureAlgorithm(parser, signatureAlgorithm);
    checks.signatureAlgorithmValid = true;

    const csrPublicKey = validateAndImportCsrPublicKey(
      parser,
      subjectPublicKeyInfo,
      input.csrDer,
    );
    checks.curveValid = true;

    validateName(
      parser,
      subject,
      SUBJECT_EXPECTATIONS,
      input.expectedSubject,
      "SUBJECT_INVALID",
      "ZATCA_CSR_SUBJECT_FIELD_SET_INVALID",
      "ZATCA_CSR_SUBJECT_VALUE_INVALID",
      true,
    );
    checks.subjectValid = true;

    const parsedExtensions = validateRequestedExtensions(
      parser,
      attributes,
      input.expectedSubject,
    );
    checks.extensionsValid = true;

    validateSimulationTemplate(parser, parsedExtensions.templateValue);
    checks.simulationTemplateValid = true;

    const expectedPublicKey = importExpectedPublicKey(
      input.expectedPublicKeySpkiDer,
    );
    if (!sameEcPublicPoint(csrPublicKey, expectedPublicKey)) {
      fail("KEY_MISMATCH", "ZATCA_CSR_PUBLIC_KEY_MISMATCH");
    }
    checks.expectedPublicKeyMatch = true;

    validateCsrSignature(
      parser,
      certificationRequestInfo,
      signatureValue,
      input.csrDer,
      csrPublicKey,
    );
    checks.signatureValid = true;

    return {
      valid: true,
      status: "VALID",
      safeErrorCodes: [],
      checks,
      sensitiveBodiesReturned: false,
    };
  } catch (error) {
    if (error instanceof InspectionFailure) {
      return invalidResult(error.status, error.code, checks);
    }
    return invalidResult(
      "MALFORMED_DER",
      "ZATCA_CSR_MALFORMED_DER",
      checks,
    );
  }
}

class BoundedDerParser {
  private nodeCount = 0;

  constructor(private readonly bytes: Buffer) {}

  readElement(offset: number, depth: number): DerElement {
    if (
      depth > MAX_DER_DEPTH ||
      !Number.isSafeInteger(offset) ||
      offset < 0 ||
      offset >= this.bytes.length
    ) {
      throw new DerParseError("invalid DER offset");
    }
    this.nodeCount += 1;
    if (this.nodeCount > MAX_DER_NODES) {
      throw new DerParseError("too many DER nodes");
    }

    const tag = this.bytes[offset]!;
    if ((tag & 0x1f) === 0x1f) {
      throw new DerParseError("high-tag-number form is unsupported");
    }
    const firstLength = this.bytes[offset + 1];
    if (firstLength === undefined || firstLength === 0x80) {
      throw new DerParseError("invalid DER length");
    }

    let contentStart = offset + 2;
    let contentLength: number;
    if (firstLength < 0x80) {
      contentLength = firstLength;
    } else {
      const lengthBytes = firstLength & 0x7f;
      if (
        lengthBytes < 1 ||
        lengthBytes > 4 ||
        contentStart + lengthBytes > this.bytes.length ||
        this.bytes[contentStart] === 0
      ) {
        throw new DerParseError("invalid DER long length");
      }
      contentLength = 0;
      for (let index = 0; index < lengthBytes; index += 1) {
        contentLength =
          contentLength * 256 + this.bytes[contentStart + index]!;
      }
      if (
        !Number.isSafeInteger(contentLength) ||
        contentLength < 0x80
      ) {
        throw new DerParseError("non-minimal DER length");
      }
      contentStart += lengthBytes;
    }

    const contentEnd = contentStart + contentLength;
    if (
      !Number.isSafeInteger(contentEnd) ||
      contentEnd < contentStart ||
      contentEnd > this.bytes.length
    ) {
      throw new DerParseError("truncated DER value");
    }
    return {
      tag,
      start: offset,
      contentStart,
      contentEnd,
      end: contentEnd,
      depth,
    };
  }

  readChildren(parent: DerElement): DerElement[] {
    if ((parent.tag & 0x20) === 0) {
      throw new DerParseError("primitive element cannot contain children");
    }
    const children: DerElement[] = [];
    let offset = parent.contentStart;
    while (offset < parent.contentEnd) {
      if (children.length >= MAX_DER_CHILDREN) {
        throw new DerParseError("too many DER children");
      }
      const child = this.readElement(offset, parent.depth + 1);
      if (child.end > parent.contentEnd) {
        throw new DerParseError("child exceeds parent");
      }
      children.push(child);
      offset = child.end;
    }
    if (offset !== parent.contentEnd) {
      throw new DerParseError("invalid child boundary");
    }
    return children;
  }

  content(element: DerElement, maxBytes = MAX_PRIMITIVE_BYTES): Buffer {
    const length = element.contentEnd - element.contentStart;
    if (length > maxBytes) {
      throw new DerParseError("DER primitive is too large");
    }
    return this.bytes.subarray(element.contentStart, element.contentEnd);
  }

  encoded(element: DerElement): Buffer {
    return this.bytes.subarray(element.start, element.end);
  }
}

function validateSignatureAlgorithm(
  parser: BoundedDerParser,
  algorithm: DerElement,
): void {
  const children = parser.readChildren(algorithm);
  if (
    children.length !== 1 ||
    children[0]!.tag !== 0x06 ||
    decodeOid(parser.content(children[0]!)) !== OIDS.ecdsaSha256
  ) {
    fail(
      "UNSUPPORTED_ALGORITHM",
      "ZATCA_CSR_SIGNATURE_ALGORITHM_UNSUPPORTED",
    );
  }
}

function validateAndImportCsrPublicKey(
  parser: BoundedDerParser,
  subjectPublicKeyInfo: DerElement,
  csrDer: Buffer,
): KeyObject {
  const spkiChildren = parser.readChildren(subjectPublicKeyInfo);
  if (spkiChildren.length !== 2) {
    fail(
      "UNSUPPORTED_ALGORITHM",
      "ZATCA_CSR_PUBLIC_KEY_ALGORITHM_UNSUPPORTED",
    );
  }
  const [algorithm, publicPoint] = spkiChildren as [DerElement, DerElement];
  if (algorithm.tag !== 0x30 || publicPoint.tag !== 0x03) {
    fail(
      "UNSUPPORTED_ALGORITHM",
      "ZATCA_CSR_PUBLIC_KEY_ALGORITHM_UNSUPPORTED",
    );
  }
  const algorithmChildren = parser.readChildren(algorithm);
  if (
    algorithmChildren.length !== 2 ||
    algorithmChildren[0]!.tag !== 0x06 ||
    algorithmChildren[1]!.tag !== 0x06 ||
    decodeOid(parser.content(algorithmChildren[0]!)) !== OIDS.ecPublicKey
  ) {
    fail(
      "UNSUPPORTED_ALGORITHM",
      "ZATCA_CSR_PUBLIC_KEY_ALGORITHM_UNSUPPORTED",
    );
  }
  if (
    decodeOid(parser.content(algorithmChildren[1]!)) !== OIDS.secp256k1
  ) {
    fail("UNSUPPORTED_ALGORITHM", "ZATCA_CSR_CURVE_UNSUPPORTED");
  }
  const point = parser.content(publicPoint);
  if (point.length < 2 || point[0] !== 0) {
    fail("PUBLIC_KEY_INVALID", "ZATCA_CSR_PUBLIC_KEY_INVALID");
  }

  try {
    const key = createPublicKey({
      key: csrDer.subarray(
        subjectPublicKeyInfo.start,
        subjectPublicKeyInfo.end,
      ),
      format: "der",
      type: "spki",
    });
    if (
      key.asymmetricKeyType !== "ec" ||
      key.asymmetricKeyDetails?.namedCurve !== "secp256k1"
    ) {
      fail("UNSUPPORTED_ALGORITHM", "ZATCA_CSR_CURVE_UNSUPPORTED");
    }
    return key;
  } catch (error) {
    if (error instanceof InspectionFailure) {
      throw error;
    }
    fail("PUBLIC_KEY_INVALID", "ZATCA_CSR_PUBLIC_KEY_INVALID");
  }
}

function validateName(
  parser: BoundedDerParser,
  name: DerElement,
  expectations: ReadonlyArray<
    readonly [oid: string, field: keyof ZatcaSdkCsrExpectedSubject]
  >,
  expectedSubject: ZatcaSdkCsrExpectedSubject,
  status: "SUBJECT_INVALID" | "EXTENSIONS_INVALID",
  setCode:
    | "ZATCA_CSR_SUBJECT_FIELD_SET_INVALID"
    | "ZATCA_CSR_SAN_INVALID",
  valueCode:
    | "ZATCA_CSR_SUBJECT_VALUE_INVALID"
    | "ZATCA_CSR_SAN_VALUE_INVALID",
  requirePrintableCountry: boolean,
): void {
  if (name.tag !== 0x30) {
    fail(status, setCode);
  }
  const expectedByOid = new Map(expectations);
  const values = new Map<string, { value: string; tag: number }>();
  const rdns = parser.readChildren(name);
  for (const rdn of rdns) {
    if (rdn.tag !== 0x31) {
      fail(status, setCode);
    }
    const rdnChildren = parser.readChildren(rdn);
    if (rdnChildren.length !== 1 || rdnChildren[0]!.tag !== 0x30) {
      fail(status, setCode);
    }
    const attributeChildren = parser.readChildren(rdnChildren[0]!);
    if (
      attributeChildren.length !== 2 ||
      attributeChildren[0]!.tag !== 0x06
    ) {
      fail(status, setCode);
    }
    const oid = decodeOid(parser.content(attributeChildren[0]!));
    const valueElement = attributeChildren[1]!;
    if (!expectedByOid.has(oid) || values.has(oid)) {
      fail(status, setCode);
    }
    values.set(oid, {
      value: decodeDirectoryString(parser, valueElement),
      tag: valueElement.tag,
    });
  }

  if (values.size !== expectedByOid.size) {
    fail(status, setCode);
  }
  for (const [oid, field] of expectations) {
    const actual = values.get(oid);
    if (!actual || actual.value !== expectedSubject[field]) {
      fail(status, valueCode);
    }
    if (
      requirePrintableCountry &&
      oid === OIDS.countryName &&
      actual.tag !== 0x13
    ) {
      fail(status, valueCode);
    }
  }
}

function validateRequestedExtensions(
  parser: BoundedDerParser,
  attributes: DerElement,
  expectedSubject: ZatcaSdkCsrExpectedSubject,
): ParsedExtensions {
  const attributeElements = parser.readChildren(attributes);
  if (
    attributeElements.length !== 1 ||
    attributeElements[0]!.tag !== 0x30
  ) {
    fail("EXTENSIONS_INVALID", "ZATCA_CSR_EXTENSION_REQUEST_INVALID");
  }
  const attributeChildren = parser.readChildren(attributeElements[0]!);
  if (
    attributeChildren.length !== 2 ||
    attributeChildren[0]!.tag !== 0x06 ||
    attributeChildren[1]!.tag !== 0x31 ||
    decodeOid(parser.content(attributeChildren[0]!)) !==
      OIDS.extensionRequest
  ) {
    fail("EXTENSIONS_INVALID", "ZATCA_CSR_EXTENSION_REQUEST_INVALID");
  }
  const attributeValues = parser.readChildren(attributeChildren[1]!);
  if (attributeValues.length !== 1 || attributeValues[0]!.tag !== 0x30) {
    fail("EXTENSIONS_INVALID", "ZATCA_CSR_EXTENSION_REQUEST_INVALID");
  }

  const extensionElements = parser.readChildren(attributeValues[0]!);
  if (extensionElements.length !== 2) {
    fail("EXTENSIONS_INVALID", "ZATCA_CSR_EXTENSION_SET_INVALID");
  }
  const extensions = new Map<string, DerElement>();
  for (const extensionElement of extensionElements) {
    if (extensionElement.tag !== 0x30) {
      fail("EXTENSIONS_INVALID", "ZATCA_CSR_EXTENSION_SET_INVALID");
    }
    const children = parser.readChildren(extensionElement);
    if (
      children.length !== 2 ||
      children[0]!.tag !== 0x06 ||
      children[1]!.tag !== 0x04
    ) {
      fail("EXTENSIONS_INVALID", "ZATCA_CSR_EXTENSION_SET_INVALID");
    }
    const oid = decodeOid(parser.content(children[0]!));
    if (
      (oid !== OIDS.subjectAltName &&
        oid !== OIDS.certificateTemplateName) ||
      extensions.has(oid)
    ) {
      fail("EXTENSIONS_INVALID", "ZATCA_CSR_EXTENSION_SET_INVALID");
    }
    extensions.set(oid, children[1]!);
  }

  const subjectAltName = extensions.get(OIDS.subjectAltName);
  const templateValue = extensions.get(OIDS.certificateTemplateName);
  if (!subjectAltName || !templateValue) {
    fail("EXTENSIONS_INVALID", "ZATCA_CSR_EXTENSION_SET_INVALID");
  }
  validateSubjectAltName(parser, subjectAltName, expectedSubject);
  return { templateValue };
}

function validateSubjectAltName(
  parser: BoundedDerParser,
  extensionValue: DerElement,
  expectedSubject: ZatcaSdkCsrExpectedSubject,
): void {
  const generalNames = readSingleEmbeddedElement(
    parser,
    extensionValue,
    0x30,
    "EXTENSIONS_INVALID",
    "ZATCA_CSR_SAN_INVALID",
  );
  const names = parser.readChildren(generalNames);
  if (names.length !== 1 || names[0]!.tag !== 0xa4) {
    fail("EXTENSIONS_INVALID", "ZATCA_CSR_SAN_INVALID");
  }
  const directoryNameChildren = parser.readChildren(names[0]!);
  if (
    directoryNameChildren.length !== 1 ||
    directoryNameChildren[0]!.tag !== 0x30
  ) {
    fail("EXTENSIONS_INVALID", "ZATCA_CSR_SAN_INVALID");
  }
  validateName(
    parser,
    directoryNameChildren[0]!,
    SAN_EXPECTATIONS,
    expectedSubject,
    "EXTENSIONS_INVALID",
    "ZATCA_CSR_SAN_INVALID",
    "ZATCA_CSR_SAN_VALUE_INVALID",
    false,
  );
}

function validateSimulationTemplate(
  parser: BoundedDerParser,
  extensionValue: DerElement,
): void {
  const value = readSingleEmbeddedElement(
    parser,
    extensionValue,
    [0x13, 0x0c],
    "TEMPLATE_INVALID",
    "ZATCA_CSR_SIMULATION_TEMPLATE_INVALID",
  );
  const decoded = decodeDirectoryString(parser, value);
  if (decoded !== SIMULATION_TEMPLATE) {
    fail("TEMPLATE_INVALID", "ZATCA_CSR_SIMULATION_TEMPLATE_INVALID");
  }
}

function importExpectedPublicKey(spkiDer: Buffer): KeyObject {
  if (!Buffer.isBuffer(spkiDer) || spkiDer.length === 0 || spkiDer.length > 512) {
    fail("PUBLIC_KEY_INVALID", "ZATCA_CSR_EXPECTED_PUBLIC_KEY_INVALID");
  }
  try {
    const key = createPublicKey({
      key: spkiDer,
      format: "der",
      type: "spki",
    });
    if (
      key.asymmetricKeyType !== "ec" ||
      key.asymmetricKeyDetails?.namedCurve !== "secp256k1"
    ) {
      fail("PUBLIC_KEY_INVALID", "ZATCA_CSR_EXPECTED_PUBLIC_KEY_INVALID");
    }
    return key;
  } catch (error) {
    if (error instanceof InspectionFailure) {
      throw error;
    }
    fail("PUBLIC_KEY_INVALID", "ZATCA_CSR_EXPECTED_PUBLIC_KEY_INVALID");
  }
}

function sameEcPublicPoint(left: KeyObject, right: KeyObject): boolean {
  try {
    const leftJwk = left.export({ format: "jwk" });
    const rightJwk = right.export({ format: "jwk" });
    if (
      leftJwk.kty !== "EC" ||
      rightJwk.kty !== "EC" ||
      leftJwk.crv !== "secp256k1" ||
      rightJwk.crv !== "secp256k1" ||
      typeof leftJwk.x !== "string" ||
      typeof leftJwk.y !== "string" ||
      typeof rightJwk.x !== "string" ||
      typeof rightJwk.y !== "string"
    ) {
      return false;
    }
    return (
      safeEqual(decodeBase64Url(leftJwk.x), decodeBase64Url(rightJwk.x)) &&
      safeEqual(decodeBase64Url(leftJwk.y), decodeBase64Url(rightJwk.y))
    );
  } catch {
    return false;
  }
}

function validateCsrSignature(
  parser: BoundedDerParser,
  certificationRequestInfo: DerElement,
  signatureValue: DerElement,
  csrDer: Buffer,
  publicKey: KeyObject,
): void {
  const bitString = parser.content(signatureValue);
  if (bitString.length < 2 || bitString[0] !== 0) {
    fail("SIGNATURE_INVALID", "ZATCA_CSR_SIGNATURE_INVALID");
  }
  const signatureStart = signatureValue.contentStart + 1;
  let signatureSequence: DerElement;
  try {
    signatureSequence = parser.readElement(
      signatureStart,
      signatureValue.depth + 1,
    );
    if (
      signatureSequence.tag !== 0x30 ||
      signatureSequence.end !== signatureValue.contentEnd
    ) {
      fail("SIGNATURE_INVALID", "ZATCA_CSR_SIGNATURE_INVALID");
    }
    const integers = parser.readChildren(signatureSequence);
    if (
      integers.length !== 2 ||
      integers.some(
        (integer) =>
          integer.tag !== 0x02 ||
          !isValidEcdsaInteger(parser.content(integer)),
      )
    ) {
      fail("SIGNATURE_INVALID", "ZATCA_CSR_SIGNATURE_INVALID");
    }
  } catch (error) {
    if (error instanceof InspectionFailure) {
      throw error;
    }
    fail("SIGNATURE_INVALID", "ZATCA_CSR_SIGNATURE_INVALID");
  }

  const signatureDer = csrDer.subarray(
    signatureSequence.start,
    signatureSequence.end,
  );
  const requestInfoDer = csrDer.subarray(
    certificationRequestInfo.start,
    certificationRequestInfo.end,
  );
  let verified = false;
  try {
    verified = verifySignature(
      "sha256",
      requestInfoDer,
      { key: publicKey, dsaEncoding: "der" },
      signatureDer,
    );
  } catch {
    verified = false;
  }
  if (!verified) {
    fail("SIGNATURE_INVALID", "ZATCA_CSR_SIGNATURE_INVALID");
  }
}

function readSingleEmbeddedElement(
  parser: BoundedDerParser,
  octetString: DerElement,
  expectedTag: number | readonly number[],
  status: "EXTENSIONS_INVALID" | "TEMPLATE_INVALID",
  code:
    | "ZATCA_CSR_SAN_INVALID"
    | "ZATCA_CSR_SIMULATION_TEMPLATE_INVALID",
): DerElement {
  try {
    const embedded = parser.readElement(
      octetString.contentStart,
      octetString.depth + 1,
    );
    const expectedTags = Array.isArray(expectedTag)
      ? expectedTag
      : [expectedTag];
    if (
      !expectedTags.includes(embedded.tag) ||
      embedded.end !== octetString.contentEnd
    ) {
      fail(status, code);
    }
    return embedded;
  } catch (error) {
    if (error instanceof InspectionFailure) {
      throw error;
    }
    fail(status, code);
  }
}

function decodeDirectoryString(
  parser: BoundedDerParser,
  element: DerElement,
): string {
  const bytes = parser.content(element, MAX_STRING_BYTES);
  if (bytes.length === 0) {
    throw new DerParseError("empty DirectoryString");
  }
  if (element.tag === 0x13) {
    return decodePrintableString(bytes);
  }
  if (element.tag !== 0x0c) {
    throw new DerParseError("unsupported DirectoryString");
  }
  let value: string;
  try {
    value = fatalUtf8Decoder.decode(bytes);
  } catch {
    throw new DerParseError("malformed UTF-8");
  }
  if (/[\u0000-\u001f\u007f]/u.test(value)) {
    throw new DerParseError("unsafe string control character");
  }
  return value;
}

function decodePrintableString(bytes: Buffer): string {
  if (
    bytes.length === 0 ||
    bytes.length > MAX_STRING_BYTES ||
    bytes.some((byte) => byte > 0x7f)
  ) {
    throw new DerParseError("invalid PrintableString");
  }
  const value = bytes.toString("ascii");
  if (!/^[A-Za-z0-9 '()+,\-./:=?]+$/u.test(value)) {
    throw new DerParseError("invalid PrintableString alphabet");
  }
  return value;
}

function decodeOid(bytes: Buffer): string {
  if (bytes.length === 0 || bytes.length > 128) {
    throw new DerParseError("invalid OID length");
  }
  const subidentifiers: bigint[] = [];
  let value = 0n;
  let inArc = false;
  for (let index = 0; index < bytes.length; index += 1) {
    const byte = bytes[index]!;
    if (!inArc && byte === 0x80) {
      throw new DerParseError("non-minimal OID arc");
    }
    inArc = true;
    value = value * 128n + BigInt(byte & 0x7f);
    if (value > BigInt(Number.MAX_SAFE_INTEGER)) {
      throw new DerParseError("OID arc overflow");
    }
    if ((byte & 0x80) === 0) {
      subidentifiers.push(value);
      if (subidentifiers.length > MAX_OID_ARCS) {
        throw new DerParseError("too many OID arcs");
      }
      value = 0n;
      inArc = false;
    }
  }
  if (inArc || subidentifiers.length === 0) {
    throw new DerParseError("truncated OID");
  }
  const firstSubidentifier = subidentifiers.shift()!;
  const firstArc =
    firstSubidentifier < 40n ? 0n : firstSubidentifier < 80n ? 1n : 2n;
  const secondArc =
    firstArc === 0n
      ? firstSubidentifier
      : firstArc === 1n
        ? firstSubidentifier - 40n
        : firstSubidentifier - 80n;
  return [firstArc, secondArc, ...subidentifiers]
    .map((arc) => arc.toString(10))
    .join(".");
}

function isValidEcdsaInteger(bytes: Buffer): boolean {
  if (bytes.length === 0 || bytes.length > 33) {
    return false;
  }
  if ((bytes[0]! & 0x80) !== 0) {
    return false;
  }
  if (
    bytes.length > 1 &&
    bytes[0] === 0 &&
    (bytes[1]! & 0x80) === 0
  ) {
    return false;
  }
  const hex = bytes.toString("hex");
  const value = hex.length === 0 ? 0n : BigInt(`0x${hex}`);
  return value > 0n && value < SECP256K1_ORDER;
}

function decodeBase64Url(value: string): Buffer {
  if (!/^[A-Za-z0-9_-]+$/u.test(value)) {
    throw new Error("invalid base64url");
  }
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(
    Math.ceil(value.length / 4) * 4,
    "=",
  );
  const decoded = Buffer.from(padded, "base64");
  const canonical = decoded
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/u, "");
  if (canonical !== value) {
    throw new Error("non-canonical base64url");
  }
  return decoded;
}

function requireTag(
  element: DerElement,
  tag: number,
  status: "UNSUPPORTED_STRUCTURE",
  code: "ZATCA_CSR_STRUCTURE_INVALID",
): void {
  if (element.tag !== tag) {
    fail(status, code);
  }
}

function fail(
  status: Exclude<ZatcaSdkCsrInspectionStatus, "VALID">,
  code: ZatcaSdkCsrSafeErrorCode,
): never {
  throw new InspectionFailure(status, code);
}

function emptyChecks(): ZatcaSdkCsrInspectionChecks {
  return {
    boundedDer: false,
    structureValid: false,
    signatureAlgorithmValid: false,
    curveValid: false,
    subjectValid: false,
    extensionsValid: false,
    simulationTemplateValid: false,
    expectedPublicKeyMatch: false,
    signatureValid: false,
  };
}

function invalidResult(
  status: Exclude<ZatcaSdkCsrInspectionStatus, "VALID">,
  code: ZatcaSdkCsrSafeErrorCode,
  checks: ZatcaSdkCsrInspectionChecks,
): ZatcaSdkCsrInspectionResult {
  return {
    valid: false,
    status,
    safeErrorCodes: [code],
    checks,
    sensitiveBodiesReturned: false,
  };
}

function bufferEquals(left: Buffer, right: Buffer): boolean {
  return left.length === right.length && timingSafeEqual(left, right);
}

function safeEqual(left: Buffer, right: Buffer): boolean {
  return left.length === right.length && timingSafeEqual(left, right);
}
