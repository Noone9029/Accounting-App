const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const {
  buildDummySigningDryRunGuard,
  parseJavaMajorVersion,
  parseJavaVersion,
} = require("./zatca-local-dummy-signing-dry-run.cjs");

const SCRIPT_PATH = path.join(__dirname, "zatca-local-dummy-signing-dry-run.cjs");

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
  assert.equal(payload.qrExecutionEnabled, false);
});

test("emits JSON metadata only and never prints XML, signed XML, QR, key, certificate, token, or header bodies", () => {
  const repo = createRepo({
    fixtureBody: "<Invoice><cbc:ID>SHOULD_NOT_APPEAR</cbc:ID><QR>QR_PAYLOAD_BODY</QR></Invoice>",
    privateKeyBody: "-----BEGIN EC PRIVATE KEY-----SHOULD_NOT_APPEAR-----END EC PRIVATE KEY-----",
    certificateBody: "-----BEGIN CERTIFICATE-----CERT_BODY_SHOULD_NOT_APPEAR-----END CERTIFICATE-----",
  });
  const guard = buildDummySigningDryRunGuard({
    cwd: repo,
    args: { plan: true },
    runCommand: fakeRunCommand({ javaVersion: "11.0.26" }),
  });
  const output = JSON.stringify(guard);

  assert.equal(guard.noNetworkOnly, true);
  assert.equal(guard.networkCallsMade, false);
  assert.equal(guard.fixtures.fixtureBodiesRead, false);
  assert.equal(guard.dummyMaterial.bodyRead, false);
  assert.equal(guard.dummyMaterial.bodyPrinted, false);
  assert.equal(guard.dummyMaterial.bodyPersisted, false);
  assert.equal(guard.redaction.xmlBodyPrinted, false);
  assert.equal(guard.redaction.signedXmlBodyPrinted, false);
  assert.equal(guard.redaction.qrPayloadPrinted, false);
  assert.equal(guard.redaction.privateKeyPrinted, false);
  assert.equal(guard.redaction.certificateBodyPrinted, false);
  assert.equal(guard.redaction.tokenPrinted, false);
  assert.equal(guard.redaction.headerPrinted, false);
  assert.equal(guard.redaction.requestResponseBodyPrinted, false);
  assert.doesNotMatch(output, /<Invoice>/);
  assert.doesNotMatch(output, /SHOULD_NOT_APPEAR/);
  assert.doesNotMatch(output, /QR_PAYLOAD_BODY/);
  assert.doesNotMatch(output, /CERT_BODY_SHOULD_NOT_APPEAR/);
  assert.doesNotMatch(output, /-----BEGIN/);
  assert.doesNotMatch(output, /Authorization/i);
  assert.doesNotMatch(output, /Bearer/i);
});

test("default status is blocked and all execution/compliance flags remain disabled", () => {
  const repo = createRepo();
  const guard = buildDummySigningDryRunGuard({
    cwd: repo,
    runCommand: fakeRunCommand({ javaVersion: "11.0.26" }),
  });

  assert.equal(guard.status, "BLOCKED_PENDING_DUMMY_SIGNING_APPROVAL");
  assert.equal(guard.environment, "LOCAL_DUMMY_SIGNING_DRY_RUN_GUARD");
  assert.equal(guard.signingExecutionEnabled, false);
  assert.equal(guard.dummySigningAllowed, false);
  assert.equal(guard.qrExecutionEnabled, false);
  assert.equal(guard.signedValidationExecutionEnabled, false);
  assert.equal(guard.productionComplianceEnabled, false);
  assert.equal(guard.pdfA3Enabled, false);
  assert.equal(guard.clearanceReportingEnabled, false);
  assert.equal(guard.signedXmlGenerated, false);
  assert.equal(guard.signedXmlPersisted, false);
});

test("reports unsupported Java 17 as blocked", () => {
  const repo = createRepo();
  const guard = buildDummySigningDryRunGuard({
    cwd: repo,
    runCommand: fakeRunCommand({ javaVersion: "17.0.16" }),
  });

  assert.equal(guard.status, "BLOCKED_UNSUPPORTED_JAVA");
  assert.equal(guard.java.version, "17.0.16");
  assert.equal(guard.java.supportedForSdk, false);
  assert.ok(guard.blockers.some((blocker) => blocker.startsWith("BLOCKED_UNSUPPORTED_JAVA")));
});

test("reports Java 11 through 14 as SDK-compatible metadata only", () => {
  for (const version of ["11.0.26", "14.0.2"]) {
    const repo = createRepo();
    const guard = buildDummySigningDryRunGuard({
      cwd: repo,
      runCommand: fakeRunCommand({ javaVersion: version }),
    });

    assert.equal(guard.java.version, version);
    assert.equal(guard.java.supportedForSdk, true);
    assert.equal(guard.signingExecutionEnabled, false);
    assert.equal(guard.status, "BLOCKED_PENDING_DUMMY_SIGNING_APPROVAL");
  }
});

test("detects explicit future approval flag without enabling execution", () => {
  const repo = createRepo();
  const guard = buildDummySigningDryRunGuard({
    cwd: repo,
    env: { ZATCA_LOCAL_DUMMY_SIGNING_APPROVAL: "future approval marker should not be printed" },
    runCommand: fakeRunCommand({ javaVersion: "11.0.26" }),
  });
  const output = JSON.stringify(guard);

  assert.equal(guard.approval.explicitFutureApprovalFlagPresent, true);
  assert.equal(guard.dummySigningAllowed, false);
  assert.equal(guard.signingExecutionEnabled, false);
  assert.equal(guard.status, "BLOCKED_SIGNING_EXECUTION_DISABLED");
  assert.doesNotMatch(output, /future approval marker/);
});

test("reports missing SDK reference as a safe blocker", () => {
  const repo = createRepo({ includeSdk: false });
  const guard = buildDummySigningDryRunGuard({
    cwd: repo,
    runCommand: fakeRunCommand({ javaVersion: "11.0.26" }),
  });

  assert.equal(guard.status, "BLOCKED_MISSING_SDK_REFERENCE");
  assert.equal(guard.sdk.referenceFound, false);
  assert.ok(guard.blockers.some((blocker) => blocker.startsWith("BLOCKED_MISSING_SDK_REFERENCE")));
});

test("reports missing generated fixture as a safe blocker", () => {
  const repo = createRepo({ includeCreditFixture: false });
  const guard = buildDummySigningDryRunGuard({
    cwd: repo,
    runCommand: fakeRunCommand({ javaVersion: "11.0.26" }),
  });

  assert.equal(guard.status, "BLOCKED_MISSING_GENERATED_FIXTURE");
  assert.equal(guard.fixtures.generatedStandardInvoiceFound, true);
  assert.equal(guard.fixtures.generatedCreditNoteFound, false);
});

test("reports missing dummy material path without reading or printing bodies", () => {
  const repo = createRepo({ includeDummyPrivateKey: false });
  const guard = buildDummySigningDryRunGuard({
    cwd: repo,
    runCommand: fakeRunCommand({ javaVersion: "11.0.26" }),
  });

  assert.equal(guard.status, "BLOCKED_DUMMY_MATERIAL_PATH_MISSING");
  assert.equal(guard.dummyMaterial.privateKeyPathFound, false);
  assert.equal(guard.dummyMaterial.bodyRead, false);
  assert.equal(guard.dummyMaterial.bodyPrinted, false);
});

test("plans sign, QR, and validate commands but never executes them", () => {
  const repo = createRepo();
  const calls = [];
  const guard = buildDummySigningDryRunGuard({
    cwd: repo,
    runCommand: (command, args) => {
      calls.push([command, args]);
      return fakeRunCommand({ javaVersion: "11.0.26" })(command, args);
    },
  });

  assert.match(guard.plannedCommands.sign, /fatoora -sign/);
  assert.match(guard.plannedCommands.qr, /fatoora -qr/);
  assert.match(guard.plannedCommands.validate, /fatoora -validate/);
  assert.equal(guard.sdkSignCommandExecuted, false);
  assert.equal(guard.sdkQrCommandExecuted, false);
  assert.equal(guard.sdkSignedValidationExecuted, false);
  assert.equal(calls.length, 1);
  assert.match(String(calls[0][0]).toLowerCase(), /java/);
  assert.doesNotMatch(JSON.stringify(calls), /fatoora|-sign|-qr|-validate/);
});

test("supports targeted fixture metadata by fixture id", () => {
  const repo = createRepo();
  const guard = buildDummySigningDryRunGuard({
    cwd: repo,
    args: { fixture: "ledgerbyte-generated-credit-note" },
    runCommand: fakeRunCommand({ javaVersion: "11.0.26" }),
  });

  assert.equal(guard.fixtures.selectedFixtureId, "ledgerbyte-generated-credit-note");
  assert.equal(guard.fixtures.selectedFixtureFound, true);
  assert.equal(guard.fixtures.fixtureBodiesRead, false);
});

test("--strict exits nonzero on blocked status", () => {
  const repo = createRepo();
  const result = spawnSync(process.execPath, [SCRIPT_PATH, "--plan", "--no-network", "--json", "--strict"], {
    cwd: repo,
    encoding: "utf8",
    windowsHide: true,
  });

  assert.equal(result.status, 1);
  const payload = JSON.parse(result.stdout);
  assert.match(payload.status, /^BLOCKED_/);
  assert.equal(payload.signingExecutionEnabled, false);
});

test("does not create temp signed XML or network behavior", () => {
  const repo = createRepo();
  const before = listFiles(repo);
  const guard = buildDummySigningDryRunGuard({
    cwd: repo,
    runCommand: fakeRunCommand({ javaVersion: "11.0.26" }),
  });
  const after = listFiles(repo);

  assert.deepEqual(after, before);
  assert.equal(guard.networkCallsMade, false);
  assert.equal(guard.networkEndpointsConfigured, false);
  assert.equal(guard.tempFilesCreated, false);
  assert.equal(guard.tempSignedXmlCreated, false);
});

test("parses Java versions", () => {
  assert.equal(parseJavaVersion('openjdk version "11.0.26" 2025-01-21'), "11.0.26");
  assert.equal(parseJavaVersion("openjdk 14.0.2 2020-07-14"), "14.0.2");
  assert.equal(parseJavaMajorVersion("11.0.26"), 11);
  assert.equal(parseJavaMajorVersion("1.8.0_402"), 8);
});

function createRepo(options = {}) {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), "ledgerbyte-zatca-dummy-guard-"));
  writeJson(repo, "package.json", {
    scripts: {
      "zatca:sdk-ci-readiness": "node scripts/zatca-sdk-ci-readiness.cjs",
      "zatca:sdk-validate-local": "node scripts/zatca-sdk-validate-local.cjs",
      "zatca:local-signed-xml-plan": "node scripts/zatca-local-signed-xml-plan.cjs",
      "test:zatca-local-signed-xml-plan": "node --test scripts/zatca-local-signed-xml-plan.test.cjs",
      "zatca:local-dummy-signing-dry-run": "node scripts/zatca-local-dummy-signing-dry-run.cjs",
      "test:zatca-local-dummy-signing-dry-run": "node --test scripts/zatca-local-dummy-signing-dry-run.test.cjs",
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
    writeText(repo, "reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Apps/fatoora", "launcher");
    writeText(repo, "reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Apps/fatoora.bat", "launcher");
    writeText(repo, "reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Certificates/cert.pem", options.certificateBody || "dummy certificate body");
    if (options.includeDummyPrivateKey !== false) {
      writeText(repo, "reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Certificates/ec-secp256k1-priv-key.pem", options.privateKeyBody || "dummy private key body");
    }
    writeText(repo, "reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Input/csr-config-template.properties", "csr.common.name=");
    writeText(repo, "reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Standard/Invoice/Standard_Invoice.xml", "<Invoice>official</Invoice>");
    writeText(repo, "reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Simplified/Invoice/Simplified_Invoice.xml", "<Invoice>official</Invoice>");
    writeText(repo, "reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Standard/Credit/Standard_Credit_Note.xml", "<Invoice>official</Invoice>");
    writeText(repo, "reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Standard/Debit/Standard_Debit_Note.xml", "<Invoice>official</Invoice>");
    writeText(repo, "reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Rules/Schematrons/20210819_ZATCA_E-invoice_Validation_Rules.xsl", "<xsl />");
    writeText(repo, "reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Rules/Schematrons/CEN-EN16931-UBL.xsl", "<xsl />");
    writeText(repo, "reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Schemas/xsds/UBL2.1/xsd/maindoc/UBL-Invoice-2.1.xsd", "<xsd />");
    writeText(repo, "reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Schemas/xsds/UBL2.1/xsd/common/UBL-CommonExtensionComponents-2.1.xsd", "<xsd />");
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
  return (command, args) => {
    assert.deepEqual(args, ["-version"]);
    return {
      status: 0,
      stdout: "",
      stderr: `openjdk version "${javaVersion}" 2026-01-01`,
      error: null,
    };
  };
}

function writeJson(repo, relativePath, data) {
  writeText(repo, relativePath, `${JSON.stringify(data, null, 2)}\n`);
}

function writeText(repo, relativePath, content) {
  const fullPath = path.join(repo, ...relativePath.split("/"));
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content);
}

function listFiles(root) {
  const results = [];
  walk(root, results, root);
  return results.sort();
}

function walk(current, results, root) {
  for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
    const fullPath = path.join(current, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, results, root);
    } else {
      results.push(path.relative(root, fullPath).replace(/\\/g, "/"));
    }
  }
}
