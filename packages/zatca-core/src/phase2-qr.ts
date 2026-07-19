import { createPublicKey, verify } from "node:crypto";

export type ZatcaPhase2QrArtifactStatus = "CLEARED" | "REPORTED";
export type ZatcaPhase2QrInvoiceType =
  | "STANDARD_TAX_INVOICE"
  | "SIMPLIFIED_TAX_INVOICE"
  | "CREDIT_NOTE"
  | "DEBIT_NOTE";

export interface ZatcaPhase2QrInput {
  invoiceType: ZatcaPhase2QrInvoiceType;
  artifactStatus: ZatcaPhase2QrArtifactStatus;
  sellerName: string;
  vatNumber: string;
  timestamp: string;
  invoiceTotal: string;
  vatTotal: string;
  invoiceHashBase64: string;
  ecdsaSignatureDerBase64: string;
  publicKeyDerBase64: string;
  authoritySignatureDerBase64: string;
}

export interface ZatcaPhase2QrResult {
  status: "PHASE_2_CRYPTOGRAPHIC";
  base64: string;
  tagOrder: readonly [1, 2, 3, 4, 5, 6, 7, 8, 9];
}

export interface ZatcaPhase2QrDecoded {
  sellerName: string;
  vatNumber: string;
  timestamp: string;
  invoiceTotal: string;
  vatTotal: string;
  invoiceHashBase64: string;
  ecdsaSignatureDer: Buffer;
  publicKeyDer: Buffer;
  authoritySignatureDer: Buffer;
  tagOrder: number[];
}

export class ZatcaPhase2QrError extends Error {
  constructor(readonly code: "ZATCA_QR_MISSING_TAG" | "ZATCA_QR_DUPLICATE_TAG" | "ZATCA_QR_INVALID_ENCODING" | "ZATCA_QR_INVALID_CERTIFICATE" | "ZATCA_QR_ARTIFACT_STATE") {
    super(messageForQrError(code));
    this.name = "ZatcaPhase2QrError";
  }
}

export function encodeZatcaPhase2Qr(input: ZatcaPhase2QrInput): ZatcaPhase2QrResult {
  assertArtifactState(input.invoiceType, input.artifactStatus);
  if (!isSha256Base64(input.invoiceHashBase64)) {
    throw new ZatcaPhase2QrError("ZATCA_QR_INVALID_ENCODING");
  }

  const values: Array<[number, Buffer]> = [
    [1, requiredUtf8(input.sellerName)],
    [2, requiredUtf8(input.vatNumber)],
    [3, requiredUtf8(input.timestamp)],
    [4, requiredUtf8(input.invoiceTotal)],
    [5, requiredUtf8(input.vatTotal)],
    [6, Buffer.from(input.invoiceHashBase64, "utf8")],
    [7, requiredDerBase64(input.ecdsaSignatureDerBase64)],
    [8, requiredDerBase64(input.publicKeyDerBase64)],
    [9, requiredDerBase64(input.authoritySignatureDerBase64)],
  ];

  return {
    status: "PHASE_2_CRYPTOGRAPHIC",
    base64: Buffer.concat(values.map(([tag, value]) => encodeTlv(tag, value))).toString("base64"),
    tagOrder: [1, 2, 3, 4, 5, 6, 7, 8, 9],
  };
}

export function decodeZatcaPhase2Qr(base64: string): ZatcaPhase2QrDecoded {
  const bytes = decodeStrictBase64(base64);
  if (!bytes.length) {
    throw new ZatcaPhase2QrError("ZATCA_QR_INVALID_ENCODING");
  }

  const values = new Map<number, Buffer>();
  const tagOrder: number[] = [];
  let offset = 0;
  while (offset < bytes.length) {
    const tag = bytes[offset++];
    if (!tag) {
      throw new ZatcaPhase2QrError("ZATCA_QR_INVALID_ENCODING");
    }

    const length = decodeLength(bytes, offset);
    offset += length.consumed;
    if (values.has(tag)) {
      throw new ZatcaPhase2QrError("ZATCA_QR_DUPLICATE_TAG");
    }
    if (offset + length.value > bytes.length) {
      throw new ZatcaPhase2QrError("ZATCA_QR_INVALID_ENCODING");
    }

    values.set(tag, bytes.subarray(offset, offset + length.value));
    tagOrder.push(tag);
    offset += length.value;
  }

  for (const tag of [1, 2, 3, 4, 5, 6, 7, 8, 9]) {
    if (!values.has(tag)) {
      throw new ZatcaPhase2QrError("ZATCA_QR_MISSING_TAG");
    }
  }
  if (tagOrder.join(",") !== "1,2,3,4,5,6,7,8,9") {
    throw new ZatcaPhase2QrError("ZATCA_QR_INVALID_ENCODING");
  }

  return {
    sellerName: utf8(values.get(1)!),
    vatNumber: utf8(values.get(2)!),
    timestamp: utf8(values.get(3)!),
    invoiceTotal: utf8(values.get(4)!),
    vatTotal: utf8(values.get(5)!),
    invoiceHashBase64: utf8(values.get(6)!),
    ecdsaSignatureDer: values.get(7)!,
    publicKeyDer: values.get(8)!,
    authoritySignatureDer: values.get(9)!,
    tagOrder,
  };
}

export function verifyZatcaPhase2QrSignature(input: { qrBase64: string; signedInfoCanonicalBytes: Buffer }): boolean {
  try {
    const decoded = decodeZatcaPhase2Qr(input.qrBase64);
    return verify(
      "sha256",
      input.signedInfoCanonicalBytes,
      { key: createPublicKey({ key: decoded.publicKeyDer, format: "der", type: "spki" }), dsaEncoding: "der" },
      decoded.ecdsaSignatureDer,
    );
  } catch {
    return false;
  }
}

/**
 * Extracts the ECDSA authority signature from the outer X.509 Certificate
 * signatureValue BIT STRING. The certificate itself stays inside the signing
 * boundary; callers should never expose it through API responses.
 */
export function extractZatcaCertificateAuthoritySignatureDer(certificateDer: Buffer): Buffer {
  try {
    const outer = readDerElement(certificateDer, 0);
    if (outer.tag !== 0x30 || outer.next !== certificateDer.length) {
      throw new Error("invalid certificate sequence");
    }
    const tbsCertificate = readDerElement(certificateDer, outer.contentStart);
    const signatureAlgorithm = readDerElement(certificateDer, tbsCertificate.next);
    const signatureValue = readDerElement(certificateDer, signatureAlgorithm.next);
    if (signatureValue.tag !== 0x03 || signatureValue.contentStart >= signatureValue.end || certificateDer[signatureValue.contentStart] !== 0) {
      throw new Error("invalid certificate signature bit string");
    }
    const signatureDer = certificateDer.subarray(signatureValue.contentStart + 1, signatureValue.end);
    if (signatureDer.length === 0 || signatureDer[0] !== 0x30) {
      throw new Error("unsupported certificate signature");
    }
    return Buffer.from(signatureDer);
  } catch {
    throw new ZatcaPhase2QrError("ZATCA_QR_INVALID_CERTIFICATE");
  }
}

/**
 * QR is intentionally attached after SignedInfo is produced: ZATCA's invoice
 * transform excludes the QR AdditionalDocumentReference from the invoice
 * digest and signature reference.
 */
export function attachZatcaPhase2QrToSignedInvoice(signedXml: string, qrBase64: string): string {
  decodeZatcaPhase2Qr(qrBase64);
  if (!signedXml.includes("<Invoice") || !signedXml.includes("<ds:Signature") || signedXml.includes("<cbc:ID>QR</cbc:ID>")) {
    throw new ZatcaPhase2QrError("ZATCA_QR_INVALID_ENCODING");
  }
  const supplierOffset = signedXml.indexOf("<cac:AccountingSupplierParty");
  if (supplierOffset < 0) {
    throw new ZatcaPhase2QrError("ZATCA_QR_INVALID_ENCODING");
  }
  const reference = `<cac:AdditionalDocumentReference><cbc:ID>QR</cbc:ID><cac:Attachment><cbc:EmbeddedDocumentBinaryObject mimeCode="text/plain">${qrBase64}</cbc:EmbeddedDocumentBinaryObject></cac:Attachment></cac:AdditionalDocumentReference>`;
  return `${signedXml.slice(0, supplierOffset)}${reference}${signedXml.slice(supplierOffset)}`;
}

function assertArtifactState(type: ZatcaPhase2QrInvoiceType, status: ZatcaPhase2QrArtifactStatus): void {
  if (type === "STANDARD_TAX_INVOICE" && status !== "CLEARED") {
    throw new ZatcaPhase2QrError("ZATCA_QR_ARTIFACT_STATE");
  }
  if (type !== "STANDARD_TAX_INVOICE" && status !== "REPORTED") {
    throw new ZatcaPhase2QrError("ZATCA_QR_ARTIFACT_STATE");
  }
}

function requiredUtf8(value: string): Buffer {
  if (!value.trim()) {
    throw new ZatcaPhase2QrError("ZATCA_QR_MISSING_TAG");
  }
  return Buffer.from(value, "utf8");
}

function requiredDerBase64(value: string): Buffer {
  if (!value.trim()) {
    throw new ZatcaPhase2QrError("ZATCA_QR_MISSING_TAG");
  }
  const bytes = decodeStrictBase64(value);
  if (bytes[0] !== 0x30) {
    throw new ZatcaPhase2QrError("ZATCA_QR_INVALID_ENCODING");
  }
  return bytes;
}

function encodeTlv(tag: number, value: Buffer): Buffer {
  return Buffer.concat([Buffer.from([tag]), encodeLength(value.length), value]);
}

function encodeLength(length: number): Buffer {
  if (length < 0x80) {
    return Buffer.from([length]);
  }
  if (length <= 0xff) {
    return Buffer.from([0x81, length]);
  }
  if (length <= 0xffff) {
    return Buffer.from([0x82, length >> 8, length & 0xff]);
  }
  throw new ZatcaPhase2QrError("ZATCA_QR_INVALID_ENCODING");
}

function decodeLength(bytes: Buffer, offset: number): { value: number; consumed: number } {
  const first = bytes[offset];
  if (first === undefined) {
    throw new ZatcaPhase2QrError("ZATCA_QR_INVALID_ENCODING");
  }
  if (first < 0x80) {
    return { value: first, consumed: 1 };
  }

  const count = first & 0x7f;
  if (count < 1 || count > 2 || offset + count >= bytes.length) {
    throw new ZatcaPhase2QrError("ZATCA_QR_INVALID_ENCODING");
  }
  let value = 0;
  for (let index = 0; index < count; index += 1) {
    value = (value << 8) | (bytes[offset + 1 + index] ?? 0);
  }
  return { value, consumed: 1 + count };
}

function readDerElement(bytes: Buffer, offset: number): { tag: number; contentStart: number; end: number; next: number } {
  const tag = bytes[offset];
  const firstLength = bytes[offset + 1];
  if (tag === undefined || firstLength === undefined) {
    throw new Error("truncated DER");
  }
  let contentStart = offset + 2;
  let length = firstLength;
  if (firstLength >= 0x80) {
    const lengthBytes = firstLength & 0x7f;
    if (lengthBytes < 1 || lengthBytes > 4 || contentStart + lengthBytes > bytes.length) {
      throw new Error("invalid DER length");
    }
    length = 0;
    for (let index = 0; index < lengthBytes; index += 1) {
      length = (length << 8) | (bytes[contentStart + index] ?? 0);
    }
    contentStart += lengthBytes;
  }
  const end = contentStart + length;
  if (end > bytes.length) {
    throw new Error("truncated DER value");
  }
  return { tag, contentStart, end, next: end };
}

function decodeStrictBase64(value: string): Buffer {
  const trimmed = value.trim();
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(trimmed)) {
    throw new ZatcaPhase2QrError("ZATCA_QR_INVALID_ENCODING");
  }
  return Buffer.from(trimmed, "base64");
}

function utf8(value: Buffer): string {
  return value.toString("utf8");
}

function isSha256Base64(value: string): boolean {
  return /^[A-Za-z0-9+/]{43}=$/.test(value);
}

function messageForQrError(code: ZatcaPhase2QrError["code"]): string {
  switch (code) {
    case "ZATCA_QR_MISSING_TAG":
      return "ZATCA Phase 2 QR requires every cryptographic tag, including the authority signature.";
    case "ZATCA_QR_DUPLICATE_TAG":
      return "ZATCA Phase 2 QR rejects duplicate tags.";
    case "ZATCA_QR_INVALID_ENCODING":
      return "ZATCA Phase 2 QR encoding is invalid.";
    case "ZATCA_QR_INVALID_CERTIFICATE":
      return "ZATCA Phase 2 QR requires a supported X.509 certificate authority signature.";
    case "ZATCA_QR_ARTIFACT_STATE":
      return "Standard invoices require a cleared artifact and simplified invoices or notes require a reported artifact before Phase 2 QR generation.";
  }
}
