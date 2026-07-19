import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.security.MessageDigest;
import java.util.Base64;
import javax.xml.XMLConstants;
import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import org.apache.xml.security.Init;
import org.apache.xml.security.c14n.Canonicalizer;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;

/**
 * Local-only C14N 1.1 hash helper. Compile/run only with the configured official
 * SDK JAR on the classpath; it reads XML from stdin and writes a Base64 digest.
 */
final class ZatcaC14n11Helper {
  private static final String EXT_NS = "urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2";
  private static final String CAC_NS = "urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2";
  private static final String CBC_NS = "urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2";

  private ZatcaC14n11Helper() {}

  public static void main(String[] args) throws Exception {
    if (args.length != 1 || !("--hash-stdin".equals(args[0]) || "--canonicalize-stdin".equals(args[0]))) {
      throw new IllegalArgumentException("Usage: ZatcaC14n11Helper --hash-stdin|--canonicalize-stdin");
    }
    byte[] xml = readAll();
    Document document = parseSecurely(xml);
    Init.init();
    Canonicalizer canonicalizer = Canonicalizer.getInstance(Canonicalizer.ALGO_ID_C14N11_OMIT_COMMENTS);
    if ("--canonicalize-stdin".equals(args[0])) {
      System.out.print(Base64.getEncoder().encodeToString(canonicalizer.canonicalizeSubtree(document)));
      return;
    }
    removeExcludedNodes(document);
    byte[] canonical = canonicalizer.canonicalizeSubtree(document);
    byte[] digest = MessageDigest.getInstance("SHA-256").digest(canonical);
    System.out.print(Base64.getEncoder().encodeToString(digest));
  }

  private static Document parseSecurely(byte[] xml) throws Exception {
    DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
    factory.setNamespaceAware(true);
    factory.setFeature(XMLConstants.FEATURE_SECURE_PROCESSING, true);
    factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
    factory.setFeature("http://xml.org/sax/features/external-general-entities", false);
    factory.setFeature("http://xml.org/sax/features/external-parameter-entities", false);
    factory.setAttribute(XMLConstants.ACCESS_EXTERNAL_DTD, "");
    factory.setAttribute(XMLConstants.ACCESS_EXTERNAL_SCHEMA, "");
    factory.setXIncludeAware(false);
    factory.setExpandEntityReferences(false);
    DocumentBuilder builder = factory.newDocumentBuilder();
    return builder.parse(new ByteArrayInputStream(xml));
  }

  private static void removeExcludedNodes(Document document) {
    removeAll(document.getElementsByTagNameNS(EXT_NS, "UBLExtensions"));
    removeAll(document.getElementsByTagNameNS(CAC_NS, "Signature"));
    NodeList references = document.getElementsByTagNameNS(CAC_NS, "AdditionalDocumentReference");
    for (int index = references.getLength() - 1; index >= 0; index--) {
      Element reference = (Element) references.item(index);
      NodeList ids = reference.getElementsByTagNameNS(CBC_NS, "ID");
      for (int idIndex = 0; idIndex < ids.getLength(); idIndex++) {
        if ("QR".equals(ids.item(idIndex).getTextContent().trim())) {
          remove(reference);
          break;
        }
      }
    }
  }

  private static void removeAll(NodeList nodes) {
    for (int index = nodes.getLength() - 1; index >= 0; index--) remove(nodes.item(index));
  }

  private static void remove(Node node) {
    Node parent = node.getParentNode();
    if (parent != null) parent.removeChild(node);
  }

  private static byte[] readAll() throws Exception {
    ByteArrayOutputStream output = new ByteArrayOutputStream();
    byte[] buffer = new byte[8192];
    for (int read; (read = System.in.read(buffer)) != -1;) output.write(buffer, 0, read);
    return output.toByteArray();
  }
}
