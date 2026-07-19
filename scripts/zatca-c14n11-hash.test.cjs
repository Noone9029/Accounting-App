const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { compareWithOfficialSdkHash, computeZatcaC14n11Hash, createZatcaC14n11HashProvider } = require("./zatca-c14n11-hash.cjs");

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

test("matches the official SDK hash oracle for every current LedgerByte-generated fixture", (t) => {
  const root = path.resolve(__dirname, "..");
  if (!process.env.ZATCA_SDK_ROOT || !process.env.ZATCA_SDK_JAVA_BIN) {
    t.skip("external SDK/JDK are not configured");
    return;
  }
  const fixtures = ["local-standard-tax-invoice.expected.xml", "ledgerbyte-generated-standard-invoice.expected.xml", "ledgerbyte-generated-credit-note.expected.xml"];
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
