const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { compareWithOfficialSdkHash, computeZatcaC14n11Hash, createZatcaC14n11HashProvider, canonicalizeZatcaXmlC14n11 } = require("./zatca-c14n11-hash.cjs");

test("skips without configured external SDK/JDK and never exposes XML", () => {
  const result = computeZatcaC14n11Hash({ xml: "<Invoice>secret</Invoice>", env: {}, cwd: path.resolve(__dirname, "..") });
  assert.equal(result.status, "SKIPPED_EXTERNAL_ORACLE");
  assert.equal(result.xmlBodyPrinted, false);
  assert.equal(JSON.stringify(result).includes("secret"), false);
});

test("defaults to a disabled C14N11 provider when the external helper is not configured", () => {
  const provider = createZatcaC14n11HashProvider({ env: {}, cwd: path.resolve(__dirname, "..") });
  const result = provider.computeHash("<Invoice>secret</Invoice>");

  assert.equal(provider.kind, "DISABLED");
  assert.equal(result.status, "SKIPPED_EXTERNAL_ORACLE");
  assert.equal(JSON.stringify(result).includes("secret"), false);
});

test("does not expose canonical XML when the external C14N11 helper is unavailable", () => {
  const result = canonicalizeZatcaXmlC14n11({ xml: "<Invoice>secret</Invoice>", env: {}, cwd: path.resolve(__dirname, "..") });
  assert.equal(result.status, "SKIPPED_EXTERNAL_ORACLE");
  assert.equal(result.canonicalBytes, null);
  assert.equal(JSON.stringify(result).includes("secret"), false);
});

test("matches the official SDK hash oracle for every current LedgerByte-generated fixture", (t) => {
  const root = path.resolve(__dirname, "..");
  if (!process.env.ZATCA_SDK_ROOT || !process.env.ZATCA_SDK_JAVA_BIN) {
    t.skip("external SDK/JDK are not configured");
    return;
  }
  const fixtures = [
    "local-standard-tax-invoice.expected.xml",
    "ledgerbyte-generated-standard-invoice.expected.xml",
    "ledgerbyte-generated-credit-note.expected.xml",
    "ledgerbyte-generated-debit-note.expected.xml",
    "ledgerbyte-generated-allowance-invoice.expected.xml",
    "ledgerbyte-generated-arabic-simplified-invoice.expected.xml",
    "ledgerbyte-generated-multiline-invoice.expected.xml",
  ];
  for (const fixture of fixtures) {
    const result = compareWithOfficialSdkHash({ xml: fs.readFileSync(path.join(root, "packages", "zatca-core", "fixtures", fixture), "utf8"), cwd: root, env: process.env });
    assert.equal(result.status, "PASSED", fixture);
    assert.equal(result.hashesEqual, true, fixture);
    assert.equal(result.xmlBodyPrinted, false, fixture);
    assert.equal(result.networkCallsMade, false, fixture);
  }
});

test("computes a C14N 1.1 digest through the local helper without XML output", (t) => {
  const root = path.resolve(__dirname, "..");
  if (!process.env.ZATCA_SDK_ROOT || !process.env.ZATCA_SDK_JAVA_BIN) {
    t.skip("external SDK/JDK are not configured");
    return;
  }
  const xml = fs.readFileSync(path.join(root, "packages", "zatca-core", "fixtures", "ledgerbyte-generated-standard-invoice.expected.xml"), "utf8");
  const result = computeZatcaC14n11Hash({
    xml,
    cwd: root,
    env: process.env,
  });
  assert.equal(result.status, "PASSED");
  assert.match(result.hash, /^[A-Za-z0-9+/]{43}=$/);
  assert.equal(result.xmlBodyPrinted, false);
});

test("returns C14N 1.1 bytes only in memory for signing callers", (t) => {
  const root = path.resolve(__dirname, "..");
  if (!process.env.ZATCA_SDK_ROOT || !process.env.ZATCA_SDK_JAVA_BIN) {
    t.skip("external SDK/JDK are not configured");
    return;
  }
  const xml = '<SignedInfo xmlns="http://www.w3.org/2000/09/xmldsig#"><Reference URI=""/></SignedInfo>';
  const canonical = canonicalizeZatcaXmlC14n11({ xml, cwd: root, env: process.env });
  const hash = computeZatcaC14n11Hash({ xml, cwd: root, env: process.env });

  assert.equal(canonical.status, "PASSED");
  assert.ok(Buffer.isBuffer(canonical.canonicalBytes));
  assert.ok(canonical.canonicalBytes.length > 0);
  assert.equal(createHash("sha256").update(canonical.canonicalBytes).digest("base64"), hash.hash);
  assert.equal(canonical.xmlBodyPrinted, false);
});

test("changes the canonical hash for required invoice mutations but not line-ending-only formatting", (t) => {
  const root = path.resolve(__dirname, "..");
  if (!process.env.ZATCA_SDK_ROOT || !process.env.ZATCA_SDK_JAVA_BIN) {
    t.skip("external SDK/JDK are not configured");
    return;
  }
  const xml = fs.readFileSync(path.join(root, "packages", "zatca-core", "fixtures", "ledgerbyte-generated-standard-invoice.expected.xml"), "utf8");
  const original = computeZatcaC14n11Hash({ xml, cwd: root, env: process.env });
  assert.equal(original.status, "PASSED");
  const mutations = {
    monetaryValue: xml.replace('>115.00</cbc:TaxInclusiveAmount>', '>116.00</cbc:TaxInclusiveAmount>'),
    invoiceUuid: xml.replace('22222222-2222-4222-8222-222222222222', '33333333-3333-4333-8333-333333333333'),
    invoiceCounterValue: xml.replace('<cbc:UUID>1001</cbc:UUID>', '<cbc:UUID>1002</cbc:UUID>'),
    previousInvoiceHash: xml.replace('NWZlY2ViNjZmZmM4NmYzOGQ5NTI3ODZjNmQ2OTZjNzljMmRiYzIzOWRkNGU5MWI0NjcyOWQ3M2EyN2ZiNTdlOQ==', 'QUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUE='),
    invoiceLine: xml.replace('VAT 15%', 'VAT 15 percent'),
    sellerIdentifier: xml.replace('399999999900003', '399999999900004'),
  };
  for (const [name, mutatedXml] of Object.entries(mutations)) {
    const result = computeZatcaC14n11Hash({ xml: mutatedXml, cwd: root, env: process.env });
    assert.equal(result.status, "PASSED", name);
    assert.notEqual(result.hash, original.hash, name);
  }
  const lfFormattedXml = xml.replace(/\r\n/g, "\n");
  const lfFormatted = computeZatcaC14n11Hash({ xml: lfFormattedXml, cwd: root, env: process.env });
  const formatted = computeZatcaC14n11Hash({ xml: lfFormattedXml.replace(/\n/g, "\r\n"), cwd: root, env: process.env });
  assert.equal(lfFormatted.status, "PASSED");
  assert.equal(formatted.status, "PASSED");
  assert.equal(formatted.hash, lfFormatted.hash);
});
