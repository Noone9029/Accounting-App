import { createHash } from "node:crypto";
import type { ZatcaSigningProvider } from "./signing-provider.js";

export interface ZatcaXmlCanonicalizationProvider {
  canonicalize(xml: string): Promise<Buffer>;
}

export interface ZatcaXadesSigningInput {
  unsignedXml: string;
  invoiceHashBase64: string;
  certificateDerBase64: string;
  signingTime: string;
  canonicalize: ZatcaXmlCanonicalizationProvider["canonicalize"];
  signingProvider: ZatcaSigningProvider;
}

export interface ZatcaXadesSignedInvoice {
  xml: string;
  invoiceHashBase64: string;
  signedInfoCanonicalBytes: Buffer;
  signatureP1363: Buffer;
  signatureDerBase64: string;
  localOnly: true;
  sdkGenerated: false;
}

export class ZatcaXadesSigningError extends Error {
  constructor(readonly code: "ZATCA_XADES_INVALID_INPUT" | "ZATCA_XADES_CERTIFICATE_METADATA" | "ZATCA_XADES_SIGNATURE_FAILED") {
    super(messageForXadesError(code));
    this.name = "ZatcaXadesSigningError";
  }
}

export async function createZatcaXadesSignedInvoice(input: ZatcaXadesSigningInput): Promise<ZatcaXadesSignedInvoice> {
  assertUnsignedUblInput(input.unsignedXml);
  const certificateDer = decodeBase64(input.certificateDerBase64);
  const metadata = await input.signingProvider.getCertificateMetadata();
  if (!metadata.signingEnabled || metadata.certificateStatus !== "ACTIVE" || !metadata.certificateIssuer || !metadata.certificateSerialNumber) {
    throw new ZatcaXadesSigningError("ZATCA_XADES_CERTIFICATE_METADATA");
  }
  if (!isSha256Base64(input.invoiceHashBase64) || !isIsoDateTime(input.signingTime)) {
    throw new ZatcaXadesSigningError("ZATCA_XADES_INVALID_INPUT");
  }

  const certificateDigest = base64OfSha256Hex(certificateDer);
  const signedProperties = signedPropertiesXml({ signingTime: input.signingTime, certificateDigest, issuer: metadata.certificateIssuer, serialNumber: metadata.certificateSerialNumber });
  const signedPropertiesDigest = base64OfSha256Hex(await canonicalizeSafely(input.canonicalize, signedProperties));
  const signedInfo = signedInfoXml({ invoiceHashBase64: input.invoiceHashBase64, signedPropertiesDigest });
  const signedInfoCanonicalBytes = await canonicalizeSafely(input.canonicalize, signedInfo);
  const signatureP1363 = await input.signingProvider.signCanonicalizedData(signedInfoCanonicalBytes);
  if (signatureP1363.length !== 64) {
    throw new ZatcaXadesSigningError("ZATCA_XADES_SIGNATURE_FAILED");
  }
  const signatureDerBase64 = p1363ToDer(signatureP1363).toString("base64");
  const extension = xadesExtensionXml({ signedInfo, signatureDerBase64, certificateDerBase64: input.certificateDerBase64.trim(), signedProperties });
  const xml = injectXadesXml(input.unsignedXml, extension);
  return { xml, invoiceHashBase64: input.invoiceHashBase64, signedInfoCanonicalBytes, signatureP1363, signatureDerBase64, localOnly: true, sdkGenerated: false };
}

function signedInfoXml(input: { invoiceHashBase64: string; signedPropertiesDigest: string }): string {
  return `<ds:SignedInfo xmlns:ds="http://www.w3.org/2000/09/xmldsig#" xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2" xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2" xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"><ds:CanonicalizationMethod Algorithm="http://www.w3.org/2006/12/xml-c14n11"/><ds:SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#ecdsa-sha256"/><ds:Reference Id="invoiceSignedData" URI=""><ds:Transforms><ds:Transform Algorithm="http://www.w3.org/TR/1999/REC-xpath-19991116"><ds:XPath>not(//ancestor-or-self::ext:UBLExtensions)</ds:XPath></ds:Transform><ds:Transform Algorithm="http://www.w3.org/TR/1999/REC-xpath-19991116"><ds:XPath>not(//ancestor-or-self::cac:Signature)</ds:XPath></ds:Transform><ds:Transform Algorithm="http://www.w3.org/TR/1999/REC-xpath-19991116"><ds:XPath>not(//ancestor-or-self::cac:AdditionalDocumentReference[cbc:ID='QR'])</ds:XPath></ds:Transform><ds:Transform Algorithm="http://www.w3.org/2006/12/xml-c14n11"/></ds:Transforms><ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/><ds:DigestValue>${input.invoiceHashBase64}</ds:DigestValue></ds:Reference><ds:Reference Type="http://www.w3.org/2000/09/xmldsig#SignatureProperties" URI="#xadesSignedProperties"><ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/><ds:DigestValue>${input.signedPropertiesDigest}</ds:DigestValue></ds:Reference></ds:SignedInfo>`;
}

function signedPropertiesXml(input: { signingTime: string; certificateDigest: string; issuer: string; serialNumber: string }): string {
  return `<xades:SignedProperties xmlns:xades="http://uri.etsi.org/01903/v1.3.2#" xmlns:ds="http://www.w3.org/2000/09/xmldsig#" Id="xadesSignedProperties"><xades:SignedSignatureProperties><xades:SigningTime>${escapeXml(input.signingTime)}</xades:SigningTime><xades:SigningCertificate><xades:Cert><xades:CertDigest><ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/><ds:DigestValue>${input.certificateDigest}</ds:DigestValue></xades:CertDigest><xades:IssuerSerial><ds:X509IssuerName>${escapeXml(input.issuer)}</ds:X509IssuerName><ds:X509SerialNumber>${escapeXml(input.serialNumber)}</ds:X509SerialNumber></xades:IssuerSerial></xades:Cert></xades:SigningCertificate></xades:SignedSignatureProperties></xades:SignedProperties>`;
}

function xadesExtensionXml(input: { signedInfo: string; signatureDerBase64: string; certificateDerBase64: string; signedProperties: string }): string {
  return `<ext:UBLExtensions xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2"><ext:UBLExtension><ext:ExtensionURI>urn:oasis:names:specification:ubl:dsig:enveloped:xades</ext:ExtensionURI><ext:ExtensionContent><sig:UBLDocumentSignatures xmlns:sig="urn:oasis:names:specification:ubl:schema:xsd:CommonSignatureComponents-2" xmlns:sac="urn:oasis:names:specification:ubl:schema:xsd:SignatureAggregateComponents-2" xmlns:sbc="urn:oasis:names:specification:ubl:schema:xsd:SignatureBasicComponents-2"><sac:SignatureInformation><cbc:ID xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">urn:oasis:names:specification:ubl:signature:1</cbc:ID><sbc:ReferencedSignatureID>urn:oasis:names:specification:ubl:signature:Invoice</sbc:ReferencedSignatureID><ds:Signature xmlns:ds="http://www.w3.org/2000/09/xmldsig#" Id="signature">${input.signedInfo}<ds:SignatureValue>${input.signatureDerBase64}</ds:SignatureValue><ds:KeyInfo><ds:X509Data><ds:X509Certificate>${input.certificateDerBase64}</ds:X509Certificate></ds:X509Data></ds:KeyInfo><ds:Object><xades:QualifyingProperties xmlns:xades="http://uri.etsi.org/01903/v1.3.2#" Target="signature">${input.signedProperties}</xades:QualifyingProperties></ds:Object></ds:Signature></sac:SignatureInformation></sig:UBLDocumentSignatures></ext:ExtensionContent></ext:UBLExtension></ext:UBLEExtensions>`;
}

function injectXadesXml(unsignedXml: string, extension: string): string {
  const rootStart = unsignedXml.indexOf("<Invoice");
  const rootEnd = unsignedXml.indexOf(">", rootStart);
  const supplier = unsignedXml.indexOf("<cac:AccountingSupplierParty");
  if (rootStart < 0 || rootEnd < 0 || supplier < 0) throw new ZatcaXadesSigningError("ZATCA_XADES_INVALID_INPUT");
  const withExtension = `${unsignedXml.slice(0, rootEnd + 1)}${extension}${unsignedXml.slice(rootEnd + 1)}`;
  const supplierOffset = withExtension.indexOf("<cac:AccountingSupplierParty");
  return `${withExtension.slice(0, supplierOffset)}<cac:Signature><cbc:ID>urn:oasis:names:specification:ubl:signature:Invoice</cbc:ID><cbc:SignatureMethod>urn:oasis:names:specification:ubl:dsig:enveloped:xades</cbc:SignatureMethod></cac:Signature>${withExtension.slice(supplierOffset)}`;
}

function assertUnsignedUblInput(xml: string): void {
  if (!xml.includes("<Invoice") || xml.includes("<ext:UBLExtensions") || xml.includes("<ds:Signature") || xml.includes("<cac:Signature")) throw new ZatcaXadesSigningError("ZATCA_XADES_INVALID_INPUT");
}

async function canonicalizeSafely(canonicalize: ZatcaXadesSigningInput["canonicalize"], xml: string): Promise<Buffer> {
  try {
    const bytes = await canonicalize(xml);
    if (!Buffer.isBuffer(bytes) || bytes.length === 0) throw new Error("empty");
    return bytes;
  } catch {
    throw new ZatcaXadesSigningError("ZATCA_XADES_SIGNATURE_FAILED");
  }
}

function decodeBase64(value: string): Buffer {
  const trimmed = value.trim();
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(trimmed)) throw new ZatcaXadesSigningError("ZATCA_XADES_INVALID_INPUT");
  const result = Buffer.from(trimmed, "base64");
  if (!result.length) throw new ZatcaXadesSigningError("ZATCA_XADES_INVALID_INPUT");
  return result;
}

function base64OfSha256Hex(bytes: Buffer): string { return Buffer.from(createHash("sha256").update(bytes).digest("hex"), "utf8").toString("base64"); }
function isSha256Base64(value: string): boolean { return /^[A-Za-z0-9+/]{43}=$/.test(value); }
function isIsoDateTime(value: string): boolean { return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value); }
function escapeXml(value: string): string { return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;"); }

function p1363ToDer(signature: Buffer): Buffer {
  const integer = (value: Buffer) => {
    const firstNonZero = value.findIndex((byte) => byte !== 0);
    const trimmed = value.subarray(firstNonZero < 0 ? value.length - 1 : firstNonZero);
    const firstByte = trimmed[0] ?? 0;
    const positive = firstByte & 0x80 ? Buffer.concat([Buffer.from([0]), trimmed]) : trimmed;
    return Buffer.concat([Buffer.from([0x02, positive.length]), positive]);
  };
  const body = Buffer.concat([integer(signature.subarray(0, 32)), integer(signature.subarray(32))]);
  return Buffer.concat([Buffer.from([0x30, body.length]), body]);
}

function messageForXadesError(code: ZatcaXadesSigningError["code"]): string {
  switch (code) {
    case "ZATCA_XADES_INVALID_INPUT": return "ZATCA XAdES signing input is incomplete or already signed.";
    case "ZATCA_XADES_CERTIFICATE_METADATA": return "ZATCA XAdES signing requires active certificate issuer and serial metadata.";
    case "ZATCA_XADES_SIGNATURE_FAILED": return "ZATCA XAdES signing failed without exposing sensitive signing material.";
  }
}
