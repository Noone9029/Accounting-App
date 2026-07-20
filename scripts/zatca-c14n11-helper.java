import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.math.BigInteger;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.PublicKey;
import java.security.Signature;
import java.security.cert.CertificateFactory;
import java.security.cert.X509Certificate;
import java.security.interfaces.ECPublicKey;
import java.util.Base64;
import java.util.HashSet;
import java.util.Set;
import javax.security.auth.x500.X500Principal;
import javax.xml.XMLConstants;
import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import org.apache.xml.security.Init;
import org.apache.xml.security.c14n.Canonicalizer;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.NamedNodeMap;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;

/**
 * Local-only C14N 1.1 and LedgerByte-owned serialized XAdES verifier. It never
 * invokes the SDK validator and emits metadata/status only.
 */
final class ZatcaC14n11Helper {
  private static final String EXT_NS = "urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2";
  private static final String CAC_NS = "urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2";
  private static final String CBC_NS = "urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2";
  private static final String DS_NS = "http://www.w3.org/2000/09/xmldsig#";
  private static final String XADES_NS = "http://uri.etsi.org/01903/v1.3.2#";
  private static final String C14N11 = "http://www.w3.org/2006/12/xml-c14n11";
  private static final String SHA256 = "http://www.w3.org/2001/04/xmlenc#sha256";
  private static final String ECDSA_SHA256 = "http://www.w3.org/2001/04/xmldsig-more#ecdsa-sha256";
  private static final BigInteger SECP256K1_ORDER = new BigInteger("FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141", 16);

  private ZatcaC14n11Helper() {}

  public static void main(String[] args) throws Exception {
    if (args.length != 1 || !("--hash-stdin".equals(args[0]) || "--canonicalize-stdin".equals(args[0]) || "--verify-signed-stdin".equals(args[0]))) {
      throw new IllegalArgumentException("Usage: ZatcaC14n11Helper --hash-stdin|--canonicalize-stdin|--verify-signed-stdin");
    }
    byte[] xml = readAll();
    if ("--verify-signed-stdin".equals(args[0])) {
      System.out.print(verifySerialized(xml).json());
      return;
    }
    Document document = parseSecurely(xml);
    Init.init();
    Canonicalizer canonicalizer = Canonicalizer.getInstance(Canonicalizer.ALGO_ID_C14N11_OMIT_COMMENTS);
    if ("--canonicalize-stdin".equals(args[0])) {
      System.out.print(Base64.getEncoder().encodeToString(canonicalizer.canonicalizeSubtree(document)));
      return;
    }
    removeExcludedNodes(document);
    byte[] digest = MessageDigest.getInstance("SHA-256").digest(canonicalizer.canonicalizeSubtree(document));
    System.out.print(Base64.getEncoder().encodeToString(digest));
  }

  private static Result verifySerialized(byte[] xml) {
    Result result = new Result();
    try {
      if (xml.length == 0 || xml.length > 2 * 1024 * 1024) return result.fail("MALFORMED_XML", "XML_SIZE_INVALID");
      String source = new String(xml, StandardCharsets.UTF_8);
      if (source.contains("<!DOCTYPE") || source.contains("<!ENTITY")) return result.fail("UNSAFE_XML", "XML_DTD_OR_ENTITY_REJECTED");
      Document document = parseSecurely(xml);
      result.safeXml = true;
      if (hasDuplicateIds(document)) return result.fail("DUPLICATE_ID", "DUPLICATE_XML_ID");
      result.uniqueIds = true;
      Init.init();
      Canonicalizer canonicalizer = Canonicalizer.getInstance(Canonicalizer.ALGO_ID_C14N11_OMIT_COMMENTS);
      Element signature = exactlyOne(document.getElementsByTagNameNS(DS_NS, "Signature"));
      if (signature == null) return document.getElementsByTagNameNS(DS_NS, "Signature").getLength() == 0 ? result.fail("SIGNATURE_MISSING", "SIGNATURE_NOT_FOUND") : result.fail("MULTIPLE_SIGNATURES", "SIGNATURE_COUNT_INVALID");
      if (!"signature".equals(signature.getAttribute("Id"))) return result.fail("SIGNATURE_MISSING", "INTENDED_SIGNATURE_NOT_FOUND");
      Element signedInfo = direct(signature, DS_NS, "SignedInfo");
      Element signatureValue = direct(signature, DS_NS, "SignatureValue");
      if (signedInfo == null || signatureValue == null) return result.fail("REFERENCE_INVALID", "SIGNED_INFO_OR_VALUE_MISSING");
      Element canonicalization = direct(signedInfo, DS_NS, "CanonicalizationMethod");
      Element signatureMethod = direct(signedInfo, DS_NS, "SignatureMethod");
      if (canonicalization == null || !C14N11.equals(canonicalization.getAttribute("Algorithm"))) return result.fail("UNSUPPORTED_ALGORITHM", "UNSUPPORTED_CANONICALIZATION_ALGORITHM");
      if (signatureMethod == null || !ECDSA_SHA256.equals(signatureMethod.getAttribute("Algorithm"))) return result.fail("UNSUPPORTED_ALGORITHM", "UNSUPPORTED_SIGNATURE_ALGORITHM");
      Element documentReference = null;
      Element propertiesReference = null;
      NodeList references = signedInfo.getElementsByTagNameNS(DS_NS, "Reference");
      if (references.getLength() != 2) return result.fail("REFERENCE_INVALID", "REFERENCE_COUNT_INVALID");
      for (int index = 0; index < references.getLength(); index++) {
        Element reference = (Element) references.item(index);
        String uri = reference.getAttribute("URI");
        if (uri.startsWith("http:") || uri.startsWith("https:") || uri.startsWith("file:") || uri.contains(":")) return result.fail("REFERENCE_INVALID", "EXTERNAL_REFERENCE_URI");
        if (uri.length() == 0) documentReference = reference;
        else if (uri.startsWith("#")) propertiesReference = reference;
        else return result.fail("REFERENCE_INVALID", "UNSUPPORTED_REFERENCE_URI");
      }
      if (documentReference == null || propertiesReference == null) return result.fail("REFERENCE_INVALID", "REQUIRED_REFERENCE_MISSING");
      String propertiesId = propertiesReference.getAttribute("URI").substring(1);
      Element signedProperties = uniqueIdElement(document, propertiesId, XADES_NS, "SignedProperties");
      if (signedProperties == null) return result.fail("REFERENCE_INVALID", "SIGNED_PROPERTIES_REFERENCE_INVALID");
      if (!approvedDigest(documentReference) || !approvedDigest(propertiesReference)) return result.fail("UNSUPPORTED_ALGORITHM", "UNSUPPORTED_DIGEST_ALGORITHM");
      if (!approvedDocumentTransforms(documentReference)) return result.fail("UNSUPPORTED_ALGORITHM", "UNSUPPORTED_DOCUMENT_TRANSFORM");
      result.referencesResolved = true;
      Document unsignedDocument = (Document) document.cloneNode(true);
      removeExcludedNodes(unsignedDocument);
      if (!constantEquals(digest(canonicalizer.canonicalizeSubtree(unsignedDocument)), base64(direct(documentReference, DS_NS, "DigestValue")))) return result.fail("DIGEST_MISMATCH", "DOCUMENT_DIGEST_MISMATCH");
      result.documentDigestValid = true;
      if (!constantEquals(digest(canonicalizer.canonicalizeSubtree(signedProperties)), base64(direct(propertiesReference, DS_NS, "DigestValue")))) return result.fail("SIGNED_PROPERTIES_INVALID", "SIGNED_PROPERTIES_DIGEST_MISMATCH");
      result.signedPropertiesDigestValid = true;
      X509Certificate certificate = certificate(signature);
      if (certificate == null || !isSecp256k1(certificate.getPublicKey())) return result.fail("CERTIFICATE_INVALID", "CERTIFICATE_OR_CURVE_INVALID");
      String certificateProblem = certificateProblem(certificate, signedProperties);
      if (certificateProblem != null) return result.fail("CERTIFICATE_INVALID", certificateProblem);
      result.certificateDigestValid = true;
      byte[] canonicalSignedInfo = canonicalizer.canonicalizeSubtree(signedInfo);
      Signature verifier = Signature.getInstance("SHA256withECDSA");
      verifier.initVerify(certificate.getPublicKey());
      verifier.update(canonicalSignedInfo);
      boolean signatureMatches;
      try { signatureMatches = verifier.verify(base64(signatureValue)); }
      catch (Exception exception) { return result.fail("SIGNATURE_INVALID", "ECDSA_SIGNATURE_INVALID"); }
      if (!signatureMatches) return result.fail("SIGNATURE_INVALID", "ECDSA_SIGNATURE_INVALID");
      result.signatureValid = true;
      String qrProblem;
      try { qrProblem = qrProblem(document, certificate, digest(canonicalizer.canonicalizeSubtree(unsignedDocument)), base64(signatureValue)); }
      catch (Exception exception) { return result.fail("QR_BINDING_INVALID", "QR_TLV_OR_BINDING_INVALID"); }
      if (qrProblem != null) return result.fail("QR_BINDING_INVALID", qrProblem);
      result.qrBindingValid = true;
      result.valid = true;
      result.status = "VALID";
      return result;
    } catch (javax.xml.parsers.ParserConfigurationException exception) {
      return result.fail("UNSAFE_XML", "XML_PARSER_SECURITY_UNAVAILABLE");
    } catch (org.xml.sax.SAXException exception) {
      return result.fail("MALFORMED_XML", safeParseCode(exception.getMessage()));
    } catch (IllegalArgumentException exception) {
      return result.fail("REFERENCE_INVALID", "ENCODING_OR_REFERENCE_INVALID");
    } catch (Exception exception) {
      return result.fail("CERTIFICATE_INVALID", "VERIFICATION_FAILED_CLOSED");
    }
  }

  private static boolean approvedDigest(Element reference) {
    Element method = direct(reference, DS_NS, "DigestMethod");
    return method != null && SHA256.equals(method.getAttribute("Algorithm")) && direct(reference, DS_NS, "DigestValue") != null;
  }

  private static String safeParseCode(String message) {
    String normalized = message == null ? "" : message.toLowerCase();
    if (normalized.contains("prefix") || normalized.contains("namespace")) return "XML_NAMESPACE_INVALID";
    if (normalized.contains("end-tag") || normalized.contains("terminated")) {
      java.util.regex.Matcher matcher = java.util.regex.Pattern.compile("[\\\"']([A-Za-z0-9:_-]+)[\\\"']").matcher(message == null ? "" : message);
      return matcher.find() ? "XML_TAG_STRUCTURE_" + matcher.group(1).replace(':', '_').toUpperCase() : "XML_TAG_STRUCTURE_INVALID";
    }
    if (normalized.contains("entity") || normalized.contains("doctype")) return "XML_ENTITY_OR_DTD_REJECTED";
    if (normalized.contains("content")) return "XML_CONTENT_INVALID";
    return "XML_PARSE_FAILED";
  }

  private static boolean approvedDocumentTransforms(Element reference) {
    Element transforms = direct(reference, DS_NS, "Transforms");
    if (transforms == null) return false;
    NodeList nodes = transforms.getElementsByTagNameNS(DS_NS, "Transform");
    String[] expected = {"http://www.w3.org/TR/1999/REC-xpath-19991116", "http://www.w3.org/TR/1999/REC-xpath-19991116", "http://www.w3.org/TR/1999/REC-xpath-19991116", C14N11};
    if (nodes.getLength() != expected.length) return false;
    for (int index = 0; index < expected.length; index++) if (!expected[index].equals(((Element) nodes.item(index)).getAttribute("Algorithm"))) return false;
    return true;
  }

  private static String certificateProblem(X509Certificate certificate, Element properties) throws Exception {
    Element digestValue = descendant(properties, DS_NS, "DigestValue");
    Element issuer = descendant(properties, DS_NS, "X509IssuerName");
    Element serial = descendant(properties, DS_NS, "X509SerialNumber");
    if (digestValue == null || issuer == null || serial == null) return "CERTIFICATE_LINKAGE_MISSING";
    if (!constantEquals(digest(certificate.getEncoded()), base64(digestValue))) return "CERTIFICATE_DIGEST_MISMATCH";
    String issuerText = issuer.getTextContent().trim().replace('\n', ',').replace('\r', ',');
    if (!canonicalDn(certificate.getIssuerX500Principal()).equals(canonicalDn(new X500Principal(issuerText)))) return "CERTIFICATE_ISSUER_MISMATCH";
    return certificate.getSerialNumber().equals(serialNumber(serial.getTextContent().trim())) ? null : "CERTIFICATE_SERIAL_MISMATCH";
  }

  private static BigInteger serialNumber(String value) {
    String normalized = value.replace(":", "");
    if (!normalized.matches("[0-9A-Fa-f]+")) throw new IllegalArgumentException();
    return new BigInteger(normalized, 16);
  }

  private static String canonicalDn(X500Principal principal) {
    String[] components = principal.getName(X500Principal.RFC2253).toUpperCase().split(",");
    java.util.Arrays.sort(components);
    return String.join(",", components);
  }

  private static X509Certificate certificate(Element signature) throws Exception {
    Element encoded = descendant(signature, DS_NS, "X509Certificate");
    if (encoded == null) return null;
    return (X509Certificate) CertificateFactory.getInstance("X.509").generateCertificate(new ByteArrayInputStream(base64(encoded)));
  }

  private static boolean isSecp256k1(PublicKey key) {
    return key instanceof ECPublicKey && SECP256K1_ORDER.equals(((ECPublicKey) key).getParams().getOrder());
  }

  private static String qrProblem(Document document, X509Certificate certificate, byte[] invoiceHash, byte[] signature) throws Exception {
    Element qrReference = null;
    NodeList refs = document.getElementsByTagNameNS(CAC_NS, "AdditionalDocumentReference");
    for (int index = 0; index < refs.getLength(); index++) if ("QR".equals(text(direct((Element) refs.item(index), CBC_NS, "ID")))) { if (qrReference != null) return "QR_DUPLICATE_REFERENCE"; qrReference = (Element) refs.item(index); }
    if (qrReference == null) return "QR_REFERENCE_MISSING";
    Element payload = descendant(qrReference, CBC_NS, "EmbeddedDocumentBinaryObject");
    if (payload == null) return "QR_PAYLOAD_MISSING";
    byte[][] values = tlv(base64(payload));
    String timestamp = text(descendant(document.getDocumentElement(), CBC_NS, "IssueDate")) + "T" + text(descendant(document.getDocumentElement(), CBC_NS, "IssueTime"));
    Element seller = descendant(document.getDocumentElement(), CAC_NS, "AccountingSupplierParty");
    if (seller == null) return "QR_SELLER_MISSING";
    Element party = direct(seller, CAC_NS, "Party");
    Element partyLegalEntity = party == null ? null : direct(party, CAC_NS, "PartyLegalEntity");
    String sellerName = text(partyLegalEntity == null ? null : direct(partyLegalEntity, CBC_NS, "RegistrationName"));
    String vat = text(descendant(seller, CBC_NS, "CompanyID"));
    String total = text(descendant(document.getDocumentElement(), CBC_NS, "PayableAmount"));
    NodeList taxes = document.getDocumentElement().getElementsByTagNameNS(CBC_NS, "TaxAmount");
    String vatTotal = taxes.getLength() == 0 ? "" : text((Element) taxes.item(0));
    if (!sellerName.equals(utf8(values[1]))) return "QR_SELLER_MISMATCH";
    if (!vat.equals(utf8(values[2]))) return "QR_VAT_MISMATCH";
    if (!timestamp.equals(utf8(values[3]))) return "QR_TIMESTAMP_MISMATCH";
    if (!monetaryEquals(total, utf8(values[4]))) return "QR_TOTAL_MISMATCH";
    if (!monetaryEquals(vatTotal, utf8(values[5]))) return "QR_VAT_TOTAL_MISMATCH";
    if (!Base64.getEncoder().encodeToString(invoiceHash).equals(utf8(values[6]))) return "QR_HASH_MISMATCH";
    if (!constantEquals(signature, values[7])) return "QR_SIGNATURE_MISMATCH";
    if (!constantEquals(certificate.getPublicKey().getEncoded(), values[8])) return "QR_PUBLIC_KEY_MISMATCH";
    if (!constantEquals(authoritySignature(certificate.getEncoded()), values[9])) return "QR_AUTHORITY_SIGNATURE_MISMATCH";
    return null;
  }

  private static boolean monetaryEquals(String one, String two) { try { return new java.math.BigDecimal(one).compareTo(new java.math.BigDecimal(two)) == 0; } catch (NumberFormatException exception) { return false; } }

  private static byte[][] tlv(byte[] bytes) {
    byte[][] values = new byte[10][]; int offset = 0;
    while (offset < bytes.length) { int tag = bytes[offset++] & 255; if (tag < 1 || tag > 9 || values[tag] != null || offset >= bytes.length) throw new IllegalArgumentException(); int first = bytes[offset++] & 255; int length = first; if (first >= 128) { int count = first & 127; if (count < 1 || count > 2 || offset + count > bytes.length) throw new IllegalArgumentException(); length = 0; for (int i = 0; i < count; i++) length = (length << 8) | (bytes[offset++] & 255); } if (length < 0 || offset + length > bytes.length) throw new IllegalArgumentException(); values[tag] = new byte[length]; System.arraycopy(bytes, offset, values[tag], 0, length); offset += length; }
    for (int tag = 1; tag <= 9; tag++) if (values[tag] == null) throw new IllegalArgumentException(); return values;
  }

  private static byte[] authoritySignature(byte[] certificate) { int[] outer = derElement(certificate, 0); int[] tbs = derElement(certificate, outer[1]); int[] algorithm = derElement(certificate, tbs[2]); int[] bit = derElement(certificate, algorithm[2]); if (bit[0] != 3 || bit[2] != outer[2] || bit[1] >= bit[2] || certificate[bit[1]] != 0) throw new IllegalArgumentException(); byte[] value = new byte[bit[2] - bit[1] - 1]; System.arraycopy(certificate, bit[1] + 1, value, 0, value.length); return value; }
  private static int[] derElement(byte[] bytes, int offset) { if (offset + 2 > bytes.length) throw new IllegalArgumentException(); int tag = bytes[offset] & 255; int first = bytes[offset + 1] & 255; int cursor = offset + 2; int length = first; if (first >= 128) { int count = first & 127; if (count < 1 || count > 4 || cursor + count > bytes.length) throw new IllegalArgumentException(); length = 0; for (int i = 0; i < count; i++) length = (length << 8) | (bytes[cursor++] & 255); } if (length < 0 || cursor + length > bytes.length) throw new IllegalArgumentException(); return new int[] { tag, cursor, cursor + length }; }
  private static String utf8(byte[] bytes) { return new String(bytes, StandardCharsets.UTF_8); }
  private static byte[] digest(byte[] value) throws Exception { return MessageDigest.getInstance("SHA-256").digest(value); }
  private static byte[] base64(Element value) { if (value == null) throw new IllegalArgumentException(); return Base64.getDecoder().decode(value.getTextContent().trim()); }
  private static boolean constantEquals(byte[] one, byte[] two) { return one != null && two != null && MessageDigest.isEqual(one, two); }
  private static String text(Element element) { return element == null ? "" : element.getTextContent().trim(); }

  private static Element direct(Element parent, String namespace, String local) { if (parent == null) return null; for (Node node = parent.getFirstChild(); node != null; node = node.getNextSibling()) if (node instanceof Element && namespace.equals(node.getNamespaceURI()) && local.equals(node.getLocalName())) return (Element) node; return null; }
  private static Element descendant(Element parent, String namespace, String local) { if (parent == null) return null; NodeList nodes = parent.getElementsByTagNameNS(namespace, local); return nodes.getLength() == 1 ? (Element) nodes.item(0) : null; }
  private static Element exactlyOne(NodeList nodes) { return nodes.getLength() == 1 ? (Element) nodes.item(0) : null; }
  private static Element uniqueIdElement(Document document, String id, String namespace, String local) { NodeList nodes = document.getElementsByTagNameNS(namespace, local); Element found = null; for (int i = 0; i < nodes.getLength(); i++) if (id.equals(((Element) nodes.item(i)).getAttribute("Id"))) { if (found != null) return null; found = (Element) nodes.item(i); } return found; }
  private static boolean hasDuplicateIds(Document document) { Set<String> ids = new HashSet<String>(); NodeList all = document.getElementsByTagName("*"); for (int i = 0; i < all.getLength(); i++) { NamedNodeMap attrs = all.item(i).getAttributes(); for (int j = 0; j < attrs.getLength(); j++) { Node attr = attrs.item(j); String local = attr.getLocalName(); if ("Id".equals(local) || "ID".equals(local) || "id".equals(local)) if (!ids.add(attr.getNodeValue())) return true; } } return false; }

  private static Document parseSecurely(byte[] xml) throws Exception { DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance(); factory.setNamespaceAware(true); factory.setFeature(XMLConstants.FEATURE_SECURE_PROCESSING, true); factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true); factory.setFeature("http://xml.org/sax/features/external-general-entities", false); factory.setFeature("http://xml.org/sax/features/external-parameter-entities", false); factory.setAttribute(XMLConstants.ACCESS_EXTERNAL_DTD, ""); factory.setAttribute(XMLConstants.ACCESS_EXTERNAL_SCHEMA, ""); factory.setXIncludeAware(false); factory.setExpandEntityReferences(false); DocumentBuilder builder = factory.newDocumentBuilder(); return builder.parse(new ByteArrayInputStream(xml)); }
  private static void removeExcludedNodes(Document document) { removeAll(document.getElementsByTagNameNS(EXT_NS, "UBLExtensions")); removeAll(document.getElementsByTagNameNS(CAC_NS, "Signature")); NodeList refs = document.getElementsByTagNameNS(CAC_NS, "AdditionalDocumentReference"); for (int i = refs.getLength() - 1; i >= 0; i--) if ("QR".equals(text(direct((Element) refs.item(i), CBC_NS, "ID")))) remove(refs.item(i)); }
  private static void removeAll(NodeList nodes) { for (int i = nodes.getLength() - 1; i >= 0; i--) remove(nodes.item(i)); }
  private static void remove(Node node) { if (node.getParentNode() != null) node.getParentNode().removeChild(node); }
  private static byte[] readAll() throws Exception { ByteArrayOutputStream output = new ByteArrayOutputStream(); byte[] buffer = new byte[8192]; for (int read; (read = System.in.read(buffer)) != -1;) output.write(buffer, 0, read); return output.toByteArray(); }

  private static final class Result {
    boolean valid; String status = "MALFORMED_XML"; final Set<String> errors = new HashSet<String>(); boolean safeXml; boolean uniqueIds; boolean referencesResolved; boolean documentDigestValid; boolean signedPropertiesDigestValid; boolean certificateDigestValid; boolean signatureValid; boolean qrBindingValid;
    Result fail(String newStatus, String code) { valid = false; status = newStatus; errors.add(code); return this; }
    String json() { StringBuilder codes = new StringBuilder(); boolean first = true; for (String code : errors) { if (!first) codes.append(','); codes.append('\"').append(code).append('\"'); first = false; } return "{\"valid\":" + valid + ",\"status\":\"" + status + "\",\"safeErrorCodes\":[" + codes + "],\"checks\":{\"safeXml\":" + safeXml + ",\"uniqueIds\":" + uniqueIds + ",\"referencesResolved\":" + referencesResolved + ",\"documentDigestValid\":" + documentDigestValid + ",\"signedPropertiesDigestValid\":" + signedPropertiesDigestValid + ",\"certificateDigestValid\":" + certificateDigestValid + ",\"signatureValid\":" + signatureValid + ",\"qrBindingValid\":" + qrBindingValid + "}}"; }
  }
}
