const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const {
  buildSignedXmlPlan,
  parseJavaMajorVersion,
  parseJavaVersion,
} = require("./zatca-local-signed-xml-plan.cjs");

const SCRIPT_PATH = path.join(__dirname, "zatca-local-signed-xml-plan.cjs");

test("refuses to run without --no-network", () => {
  const repo = createRepo();
  const result = spawnSync(process.execPath, [SCRIPT_PATH, "--json"], {
    cwd: repo,
    encoding: "utf8",
    windowsHide: true,
  });

  assert.equal(result.status, 2);
  const payload = JSON.parse(result.stderr);
  assert.equal(payload.status, "BLOCKED_NO_NETWORK_FLAG_REQUIRED");
  assert.equal(payload.networkCallsMade, false);
  assert.equal(payload.signingExecutionEnabled, false);
});

test("emits metadata-only JSON without XML, QR, private key, certificate body, token, or header content", () => {
  const repo = createRepo({
    fixtureBody: "<Invoice><cbc:ID>SHOULD_NOT_APPEAR</cbc:ID><QR>QR_PAYLOAD_BODY</QR></Invoice>",
    privateKeyBody: "-----BEGIN EC PRIVATE KEY-----SHOULD_NOT_APPEAR-----END EC PRIVATE KEY-----",
    certificateBody: "-----BEGIN CERTIFICATE-----CERT_BODY_SHOULD_NOT_APPEAR-----END CERTIFICATE-----",
  });
  const plan = buildSignedXmlPlan({
    cwd: repo,
    args: { plan: true },
    runCommand: fakeRunCommand({ javaVersion: "11.0.26" }),
  });
  const output = JSON.stringify(plan);

  assert.equal(plan.noNetworkOnly, true);
  assert.equal(plan.networkCallsMade, false);
  assert.equal(plan.redaction.xmlBodyPrinted, false);
  assert.equal(plan.redaction.qrPayloadPrinted, false);
  assert.equal(plan.redaction.privateKeyPrinted, false);
  assert.equal(plan.redaction.certificateBodyPrinted, false);
  assert.equal(plan.sdk.dummyCertificateBodyRead, false);
  assert.equal(plan.sdk.dummyPrivateKeyBodyRead, false);
  assert.equal(plan.fixtures.fixtureBodiesRead, false);
  assert.doesNotMatch(output, /<Invoice>/);
  assert.doesNotMatch(output, /SHOULD_NOT_APPEAR/);
  assert.doesNotMatch(output, /QR_PAYLOAD_BODY/);
  assert.doesNotMatch(output, /CERT_BODY/);
  assert.doesNotMatch(output, /PRIVATE KEY/);
  assert.doesNotMatch(output, /Authorization/i);
  assert.doesNotMatch(output, /Bearer/i);
});

test("keeps signing, production compliance, clearance, and PDF-A3 disabled", () => {
  const repo = createRepo();
  const plan = buildSignedXmlPlan({
    cwd: repo,
    runCommand: fakeRunCommand({ javaVersion: "11.0.26" }),
  });

  assert.equal(plan.status, "BLOCKED_SIGNING_EXECUTION_DISABLED");
  assert.equal(plan.signingExecutionEnabled, false);
  assert.equal(plan.localSignedXmlExecutionEnabled, false);
  assert.equal(plan.localDummySigningAllowed, false);
  assert.equal(plan.productionComplianceEnabled, false);
  assert.equal(plan.productionCompliance, false);
  assert.equal(plan.clearanceReportingEnabled, false);
  assert.equal(plan.pdfA3Enabled, false);
});

test("reports unsupported Java 17 as blocked", () => {
  const repo = createRepo();
  const plan = buildSignedXmlPlan({
    cwd: repo,
    runCommand: fakeRunCommand({ javaVersion: "17.0.16" }),
  });

  assert.equal(plan.status, "BLOCKED_UNSUPPORTED_JAVA");
  assert.equal(plan.java.version, "17.0.16");
  assert.equal(plan.java.supported, false);
  assert.ok(plan.blockers.some((blocker) => blocker.startsWith("BLOCKED_UNSUPPORTED_JAVA")));
});

test("reports Java 11 through 14 as metadata-supported but still does not enable signing", () => {
  for (const version of ["11.0.26", "14.0.2"]) {
    const repo = createRepo();
    const plan = buildSignedXmlPlan({
      cwd: repo,
      runCommand: fakeRunCommand({ javaVersion: version }),
    });

    assert.equal(plan.java.version, version);
    assert.equal(plan.java.supported, true);
    assert.equal(plan.signingExecutionEnabled, false);
    assert.equal(plan.status, "BLOCKED_SIGNING_EXECUTION_DISABLED");
  }
});

test("reports missing SDK reference as blocked", () => {
  const repo = createRepo({ includeSdk: false });
  const plan = buildSignedXmlPlan({
    cwd: repo,
    runCommand: fakeRunCommand({ javaVersion: "11.0.26" }),
  });

  assert.equal(plan.status, "BLOCKED_MISSING_SDK_REFERENCE");
  assert.equal(plan.sdk.referenceFound, false);
  assert.ok(plan.blockers.some((blocker) => blocker.startsWith("BLOCKED_MISSING_SDK_REFERENCE")));
});

test("reports missing generated fixture as blocked", () => {
  const repo = createRepo({ includeCreditFixture: false });
  const plan = buildSignedXmlPlan({
    cwd: repo,
    runCommand: fakeRunCommand({ javaVersion: "11.0.26" }),
  });

  assert.equal(plan.status, "BLOCKED_MISSING_GENERATED_FIXTURE");
  assert.equal(plan.fixtures.generatedStandardInvoiceFound, true);
  assert.equal(plan.fixtures.generatedCreditNoteFound, false);
});

test("reports generated fixture paths only", () => {
  const repo = createRepo();
  const plan = buildSignedXmlPlan({
    cwd: repo,
    runCommand: fakeRunCommand({ javaVersion: "11.0.26" }),
  });
  const output = JSON.stringify(plan);

  assert.equal(plan.fixtures.generatedStandardInvoicePath, "packages/zatca-core/fixtures/ledgerbyte-generated-standard-invoice.expected.xml");
  assert.equal(plan.fixtures.generatedCreditNotePath, "packages/zatca-core/fixtures/ledgerbyte-generated-credit-note.expected.xml");
  assert.equal(plan.fixtures.fixtureBodiesPrinted, false);
  assert.doesNotMatch(output, /<Invoice>/);
});

test("--strict exits nonzero because signed XML planning remains blocked", () => {
  const repo = createRepo();
  const result = spawnSync(process.execPath, [SCRIPT_PATH, "--plan", "--no-network", "--json", "--strict"], {
    cwd: repo,
    encoding: "utf8",
    windowsHide: true,
  });

  assert.equal(result.status, 1);
  const payload = JSON.parse(result.stdout);
  assert.match(payload.status, /^BLOCKED_/);
  assert.equal(payload.sdkSignCommandExecuted, false);
});

test("does not execute SDK sign, QR, hash, or validation commands", () => {
  const repo = createRepo();
  const calls = [];
  const plan = buildSignedXmlPlan({
    cwd: repo,
    runCommand: (command, args) => {
      calls.push([command, args]);
      return fakeRunCommand({ javaVersion: "11.0.26" })(command, args);
    },
  });

  assert.equal(plan.sdkSignCommandExecuted, false);
  assert.equal(plan.sdkQrCommandExecuted, false);
  assert.equal(plan.sdkHashCommandExecuted, false);
  assert.equal(calls.length, 1);
  assert.match(String(calls[0][0]).toLowerCase(), /java/);
  assert.doesNotMatch(JSON.stringify(calls), /fatoora|-sign|-qr|-generateHash|-validate/);
});

test("uses metadata-only evidence body policy", () => {
  const repo = createRepo();
  const plan = buildSignedXmlPlan({
    cwd: repo,
    runCommand: fakeRunCommand({ javaVersion: "11.0.26" }),
  });

  assert.equal(plan.localSignedXmlEvidenceBodyPolicy, "metadata-only");
  assert.equal(plan.evidencePolicy.bodyPolicy, "metadata-only");
  assert.equal(plan.evidencePolicy.signedXmlBodyCommitted, false);
  assert.equal(plan.evidencePolicy.signedXmlBodyUploaded, false);
  assert.equal(plan.evidencePolicy.privateMaterialPersisted, false);
});

test("parses Java versions", () => {
  assert.equal(parseJavaVersion('openjdk version "11.0.26" 2025-01-21'), "11.0.26");
  assert.equal(parseJavaMajorVersion("11.0.26"), 11);
  assert.equal(parseJavaMajorVersion("1.8.0_402"), 8);
});

function createRepo(options = {}) {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), "ledgerbyte-zatca-signed-plan-"));
  writeJson(repo, "package.json", {
    scripts: {
      "zatca:sdk-ci-readiness": "node scripts/zatca-sdk-ci-readiness.cjs",
      "zatca:sdk-validate-local": "node scripts/zatca-sdk-validate-local.cjs",
      "zatca:local-signed-xml-plan": "node scripts/zatca-local-signed-xml-plan.cjs",
      "test:zatca-local-signed-xml-plan": "node --test scripts/zatca-local-signed-xml-plan.test.cjs",
    },
  });

  if (options.includeSdk !== false) {
    const readme = [
      "fatoora -sign -invoice <filename> -signedInvoice <filename>",
      "fatoora -qr -invoice <filename>",
      "fatoora -generateHash -invoice <filename>",
      "fatoora -validate -invoice <filename>",
      "provided certificate and private key in the SDK are dummy and for testing purposes only",
      "Java >=11 <15",
    ].join("\n");
    const usage = [
      "[-sign]: flag used to sign invoice.",
      "[-signedInvoice <fileName>]: The name of the signed invoice output file.",
      "[-qr]: flag used to generate qr.",
      "[-generateHash]: flag used to generate new hash for the provided invoice.",
      "[-validate]: flag used to validate invoice.",
      "[-csr]: flag used to generate csr and private key.",
    ].join("\n");

    writeText(repo, "reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Readme/readme.md", readme);
    writeText(repo, "reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Configuration/usage.txt", usage);
    writeText(repo, "reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Configuration/config.json", "{}");
    writeText(repo, "reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Apps/zatca-einvoicing-sdk-238-R3.4.8.jar", "jar");
    writeText(repo, "reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Certificates/cert.pem", options.certificateBody || "dummy certificate body");
    writeText(repo, "reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Certificates/ec-secp256k1-priv-key.pem", options.privateKeyBody || "dummy private key body");
    writeText(repo, "reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Input/csr-config-template.properties", "csr.common.name=");
    writeText(repo, "reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Standard/Invoice/Standard_Invoice.xml", "<Invoice>official</Invoice>");
    writeText(repo, "reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Simplified/Invoice/Simplified_Invoice.xml", "<Invoice>official</Invoice>");
    writeText(repo, "reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Standard/Credit/Standard_Credit_Note.xml", "<Invoice>official</Invoice>");
    writeText(repo, "reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Standard/Debit/Standard_Debit_Note.xml", "<Invoice>official</Invoice>");
    writeText(repo, "reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Rules/Schematrons/20210819_ZATCA_E-invoice_Validation_Rules.xsl", "<xsl />");
    writeText(repo, "reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Rules/Schematrons/CEN-EN16931-UBL.xsl", "<xsl />");
    writeText(repo, "reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Schemas/xsds/UBL2.1/xsd/maindoc/UBL-Invoice-2.1.xsd", "<xsd />");
    writeText(repo, "reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Schemas/xsds/UBL2.1/xsd/common/UBL-CommonSignatureComponents-2.1.xsd", "<xsd />");
    writeText(repo, "reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Schemas/xsds/UBL2.1/xsd/common/UBL-SignatureAggregateComponents-2.1.xsd", "<xsd />");
    writeText(repo, "reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Schemas/xsds/UBL2.1/xsd/common/UBL-SignatureBasicComponents-2.1.xsd", "<xsd />");
    writeText(repo, "reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Schemas/xsds/UBL2.1/xsd/common/UBL-XAdESv132-2.1.xsd", "<xsd />");
    writeText(repo, "reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Schemas/xsds/UBL2.1/xsd/common/UBL-XAdESv141-2.1.xsd", "<xsd />");
    writeText(repo, "reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Schemas/xsds/UBL2.1/xsd/common/UBL-xmldsig-core-schema-2.1.xsd", "<xsd />");
    writeText(repo, "reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_XML_Implementation_Standard_vF.pdf", "pdf");
    writeText(repo, "reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_Security_Features_Implementation_Standards.pdf", "pdf");
    writeText(repo, "reference/zatca-docs/EInvoice_Data_Dictionary.xlsx", "xlsx");
    writeText(repo, "reference/zatca-docs/compliance_csid.pdf", "pdf");
    writeText(repo, "reference/zatca-docs/onboarding.pdf", "pdf");
    writeText(repo, "reference/zatca-docs/renewal.pdf", "pdf");
  }

  writeText(repo, "packages/zatca-core/fixtures/ledgerbyte-generated-standard-invoice.expected.xml", options.fixtureBody || "<Invoice>standard</Invoice>");
  if (options.includeCreditFixture !== false) {
    writeText(repo, "packages/zatca-core/fixtures/ledgerbyte-generated-credit-note.expected.xml", options.fixtureBody || "<Invoice>credit</Invoice>");
  }

  return repo;
}

function fakeRunCommand({ javaVersion }) {
  return (command) => {
    if (String(command).toLowerCase().includes("java")) {
      return {
        status: 0,
        stdout: "",
        stderr: `openjdk version "${javaVersion}" 2026-01-01`,
      };
    }
    return { status: 1, stdout: "", stderr: "" };
  };
}

function writeJson(repo, relativePath, value) {
  writeText(repo, relativePath, `${JSON.stringify(value, null, 2)}\n`);
}

function writeText(repo, relativePath, value) {
  const fullPath = path.join(repo, ...relativePath.split("/"));
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, value);
}
