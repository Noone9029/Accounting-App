const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const { buildReadiness, parseJavaMajorVersion, parseJavaVersion } = require("./zatca-sdk-ci-readiness.cjs");

const SCRIPT_PATH = path.join(__dirname, "zatca-sdk-ci-readiness.cjs");

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
});

test("emits metadata-only JSON and never includes fixture XML or secrets", () => {
  const repo = createRepo({
    fixtureBody: "<Invoice>SHOULD_NOT_APPEAR Authorization: Bearer token -----BEGIN PRIVATE KEY-----x-----END PRIVATE KEY-----</Invoice>",
  });
  const readiness = buildReadiness({
    cwd: repo,
    args: { plan: true },
    runCommand: fakeRunCommand({ javaVersion: "11.0.26" }),
  });
  const output = JSON.stringify(readiness);

  assert.equal(readiness.noNetworkOnly, true);
  assert.equal(readiness.networkCallsMade, false);
  assert.equal(readiness.redaction.xmlBodyPrinted, false);
  assert.equal(readiness.redaction.privateKeyPrinted, false);
  assert.doesNotMatch(output, /<Invoice>/);
  assert.doesNotMatch(output, /SHOULD_NOT_APPEAR/);
  assert.doesNotMatch(output, /Bearer token/);
  assert.doesNotMatch(output, /BEGIN PRIVATE KEY/);
});

test("reports unsupported Java 17 as blocked", () => {
  const repo = createRepo();
  const readiness = buildReadiness({
    cwd: repo,
    runCommand: fakeRunCommand({ javaVersion: "17.0.16" }),
  });

  assert.equal(readiness.status, "CI_BLOCKED_JAVA_RUNTIME");
  assert.equal(readiness.java.version, "17.0.16");
  assert.equal(readiness.java.supported, false);
  assert.ok(readiness.ci.blockers.some((blocker) => blocker.startsWith("CI_BLOCKED_JAVA_RUNTIME")));
});

test("reports Java 11 through 14 as supported when mocked", () => {
  for (const version of ["11.0.26", "14.0.2"]) {
    const repo = createRepo();
    const readiness = buildReadiness({
      cwd: repo,
      runCommand: fakeRunCommand({ javaVersion: version }),
    });

    assert.equal(readiness.java.version, version);
    assert.equal(readiness.java.supported, true);
    assert.equal(readiness.status, "LOCAL_ONLY_READY");
  }
});

test("reports missing SDK reference as blocked", () => {
  const repo = createRepo({ includeSdk: false });
  const readiness = buildReadiness({
    cwd: repo,
    runCommand: fakeRunCommand({ javaVersion: "11.0.26" }),
  });

  assert.equal(readiness.status, "CI_BLOCKED_MISSING_SDK_REFERENCE");
  assert.equal(readiness.sdk.referenceFound, false);
  assert.ok(readiness.ci.blockers.some((blocker) => blocker.startsWith("CI_BLOCKED_MISSING_SDK_REFERENCE")));
});

test("reports missing generated fixture as blocked metadata", () => {
  const repo = createRepo({ includeGeneratedCreditFixture: false });
  const readiness = buildReadiness({
    cwd: repo,
    runCommand: fakeRunCommand({ javaVersion: "11.0.26" }),
  });

  assert.equal(readiness.fixtures.generatedStandardInvoiceFound, true);
  assert.equal(readiness.fixtures.generatedCreditNoteFound, false);
  assert.ok(readiness.ci.blockers.some((blocker) => blocker.startsWith("CI_BLOCKED_MISSING_GENERATED_FIXTURE")));
});

test("reports generated fixtures present by relative path only", () => {
  const repo = createRepo();
  const readiness = buildReadiness({
    cwd: repo,
    runCommand: fakeRunCommand({ javaVersion: "11.0.26" }),
  });
  const output = JSON.stringify(readiness);

  assert.equal(readiness.fixtures.generatedStandardInvoiceFound, true);
  assert.equal(readiness.fixtures.generatedCreditNoteFound, true);
  assert.equal(
    readiness.fixtures.generatedStandardInvoicePath,
    "packages/zatca-core/fixtures/ledgerbyte-generated-standard-invoice.expected.xml",
  );
  assert.equal(
    readiness.fixtures.generatedCreditNotePath,
    "packages/zatca-core/fixtures/ledgerbyte-generated-credit-note.expected.xml",
  );
  assert.doesNotMatch(output, /<Invoice>/);
});

test("--strict exits nonzero on blocked state", () => {
  const repo = createRepo({ includeSdk: false });
  const result = spawnSync(process.execPath, [SCRIPT_PATH, "--plan", "--no-network", "--json", "--strict"], {
    cwd: repo,
    encoding: "utf8",
    windowsHide: true,
  });

  assert.equal(result.status, 1);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.status, "CI_BLOCKED_MISSING_SDK_REFERENCE");
});

test("keeps production, signing, clearance, and PDF-A3 flags disabled", () => {
  const repo = createRepo();
  const readiness = buildReadiness({
    cwd: repo,
    runCommand: fakeRunCommand({ javaVersion: "11.0.26" }),
  });

  assert.equal(readiness.productionComplianceEnabled, false);
  assert.equal(readiness.signingEnabled, false);
  assert.equal(readiness.clearanceReportingEnabled, false);
  assert.equal(readiness.pdfA3Enabled, false);
});

test("does not include tokens, auth headers, or request bodies in output", () => {
  const repo = createRepo({
    fixtureBody: "Authorization: Bearer abc token=secret requestBody=<Invoice>hidden</Invoice>",
  });
  const readiness = buildReadiness({
    cwd: repo,
    runCommand: fakeRunCommand({ javaVersion: "11.0.26" }),
  });
  const output = JSON.stringify(readiness);

  assert.doesNotMatch(output, /Authorization/i);
  assert.doesNotMatch(output, /Bearer/i);
  assert.doesNotMatch(output, /requestBody/i);
  assert.doesNotMatch(output, /hidden/);
});

test("reports Windows and Linux launcher compatibility as metadata", () => {
  const repo = createRepo({ includePosixLauncher: false });
  const readiness = buildReadiness({
    cwd: repo,
    platform: "linux",
    runCommand: fakeRunCommand({ javaVersion: "11.0.26" }),
  });

  assert.equal(readiness.launcher.osPlatform, "linux");
  assert.equal(readiness.launcher.windowsLauncherFound, true);
  assert.equal(readiness.launcher.posixLauncherFound, false);
  assert.equal(readiness.launcher.platformLauncherFound, false);
  assert.ok(readiness.ci.blockers.some((blocker) => blocker.startsWith("CI_BLOCKED_WINDOWS_LAUNCHER_ONLY")));
});

test("parses modern and legacy Java versions", () => {
  assert.equal(parseJavaVersion('openjdk version "11.0.26" 2025-01-21'), "11.0.26");
  assert.equal(parseJavaMajorVersion("11.0.26"), 11);
  assert.equal(parseJavaMajorVersion("1.8.0_402"), 8);
});

function createRepo(options = {}) {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), "ledgerbyte-zatca-ci-readiness-"));
  writeJson(repo, "package.json", {
    scripts: options.includePackageScripts === false ? {} : {
      "zatca:sdk-validate-local": "node scripts/zatca-sdk-validate-local.cjs",
      "zatca:generate-local-xml-fixtures": "node scripts/generate-zatca-local-xml-fixtures.cjs",
      "test:zatca-sdk-validate-local": "node --test scripts/zatca-sdk-validate-local.test.cjs",
      "zatca:sdk-ci-readiness": "node scripts/zatca-sdk-ci-readiness.cjs",
      "test:zatca-sdk-ci-readiness": "node --test scripts/zatca-sdk-ci-readiness.test.cjs",
    },
  });

  if (options.includeSdk !== false) {
    writeText(repo, "reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Readme/readme.md", "Java >=11 <15");
    writeText(repo, "reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Configuration/usage.txt", "-validate -invoice");
    writeText(repo, "reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Apps/zatca-einvoicing-sdk-238-R3.4.8.jar", "jar");
    writeText(repo, "reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Apps/fatoora.bat", "bat");
    if (options.includePosixLauncher !== false) {
      writeText(repo, "reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Apps/fatoora", "sh");
    }
    writeText(repo, "reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Configuration/config.json", "{}");
    writeText(repo, "reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Standard/Invoice/Standard_Invoice.xml", "<OfficialSample />");
    writeText(repo, "reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Standard/Credit/Standard_Credit_Note.xml", "<OfficialSample />");
    writeText(repo, "reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Rules/Schematrons/20210819_ZATCA_E-invoice_Validation_Rules.xsl", "<xsl />");
    writeText(repo, "reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Schemas/xsds/UBL2.1/xsd/maindoc/UBL-Invoice-2.1.xsd", "<xsd />");
  }

  writeText(repo, "docs/zatca/ZATCA_SDK_FIXTURE_REGISTRY.md", "metadata only");
  writeJson(repo, "packages/zatca-core/fixtures/ledgerbyte-generated-standard-invoice.input.json", { id: "demo" });
  writeJson(repo, "packages/zatca-core/fixtures/ledgerbyte-generated-credit-note.input.json", { id: "demo-credit" });
  writeText(repo, "packages/zatca-core/fixtures/ledgerbyte-generated-standard-invoice.expected.xml", options.fixtureBody || "<Invoice>demo</Invoice>");
  if (options.includeGeneratedCreditFixture !== false) {
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
