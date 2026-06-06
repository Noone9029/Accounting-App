const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const {
  parseArgs,
  runValidationSet,
  sanitizeText,
  summarizeSdkOutput,
} = require("./zatca-sdk-validate-local-lib.cjs");

test("parses explicit fixture and all-fixture arguments", () => {
  const explicit = parseArgs(["--fixture", "official-standard-invoice", "--no-network", "--json"]);
  assert.deepEqual(explicit.fixtures, ["official-standard-invoice"]);
  assert.equal(explicit.noNetworkEnforced, true);
  assert.equal(explicit.json, true);

  const all = parseArgs(["--all", "--no-network"]);
  assert.equal(all.fixtures.includes("official-standard-invoice"), true);
  assert.equal(all.fixtures.includes("ledgerbyte-generated-standard-invoice"), true);
  assert.equal(all.fixtures.includes("ledgerbyte-generated-credit-note"), true);
  assert.equal(all.fixtures.includes("ledgerbyte-credit-note"), true);

  const withPnpmSeparator = parseArgs(["--", "--all", "--no-network"]);
  assert.equal(withPnpmSeparator.fixtures.includes("official-simplified-invoice"), true);
});

test("uses a configured Java 11-14 binary path without changing global Java", () => {
  const repo = makeRepo();
  writeFixture(repo, "packages/zatca-core/fixtures/ledgerbyte-generated-standard-invoice.expected.xml", "<Invoice />");
  writeFakeSdk(repo);
  const javaBin = path.join(repo, "java11", "bin", process.platform === "win32" ? "java.exe" : "java");
  const calls = [];
  const evidence = runValidationSet({
    cwd: repo,
    parsed: parseArgs(["--fixture", "ledgerbyte-generated-standard-invoice", "--no-network", "--json"]),
    env: { ZATCA_SDK_JAVA_BIN: javaBin },
    spawnSync: (command, args) => {
      calls.push({ command, args });
      if (args.includes("-version")) {
        return { status: 0, stdout: "", stderr: 'openjdk version "11.0.26"' };
      }
      return { status: 0, stdout: "GLOBAL VALIDATION RESULT = PASSED", stderr: "" };
    },
    validationRunId: "test-run",
    timestamp: "2026-06-06T00:00:00.000Z",
  });

  assert.equal(calls[0].command, path.resolve(javaBin));
  assert.equal(evidence.runs[0].status, "PASSED");
  assert.equal(evidence.runs[0].javaVersion, "11.0.26");
  assert.equal(evidence.runs[0].networkCallsMade, false);
});

test("returns a metadata blocker when the SDK is missing", () => {
  const repo = makeRepo();
  const evidence = runValidationSet({
    cwd: repo,
    parsed: parseArgs(["--fixture", "official-standard-invoice", "--no-network", "--json"]),
    spawnSync: fakeJava("11.0.26"),
    validationRunId: "test-run",
    timestamp: "2026-06-06T00:00:00.000Z",
  });

  const run = evidence.runs[0];
  assert.equal(run.status, "BLOCKED");
  assert.equal(run.networkCallsMade, false);
  assert.equal(run.xmlBodyPrinted, false);
  assert.equal(run.qrPayloadPrinted, false);
  assert.equal(run.privateKeyPrinted, false);
  assert.equal(run.safeErrorCodes.includes("SDK_NOT_FOUND"), true);
});

test("returns a metadata blocker when Java is missing", () => {
  const repo = makeRepo();
  writeFixture(repo, "packages/zatca-core/fixtures/local-standard-tax-invoice.expected.xml", "<Invoice />");
  writeFakeSdk(repo);
  const evidence = runValidationSet({
    cwd: repo,
    parsed: parseArgs(["--fixture", "ledgerbyte-standard-invoice", "--no-network", "--json"]),
    spawnSync: () => ({ status: null, stdout: "", stderr: "", error: new Error("not found") }),
    validationRunId: "test-run",
    timestamp: "2026-06-06T00:00:00.000Z",
  });

  const run = evidence.runs[0];
  assert.equal(run.status, "BLOCKED");
  assert.equal(run.validationAttempted, false);
  assert.equal(run.safeErrorCodes.includes("JAVA_NOT_FOUND"), true);
  assert.equal(JSON.stringify(evidence).includes("<Invoice"), false);
});

test("evidence excludes XML, QR payloads, private keys, tokens, and headers", () => {
  const repo = makeRepo();
  writeFixture(repo, "packages/zatca-core/fixtures/local-standard-tax-invoice.expected.xml", "<Invoice><cbc:ID>SENSITIVE-CUSTOMER</cbc:ID></Invoice>");
  writeFakeSdk(repo);

  const evidence = runValidationSet({
    cwd: repo,
    parsed: parseArgs(["--fixture", "ledgerbyte-standard-invoice", "--no-network", "--json"]),
    spawnSync: fakeSdkExecution(
      "11.0.26",
      [
        "GLOBAL VALIDATION RESULT = PASSED",
        "<Invoice><cbc:ID>SENSITIVE-CUSTOMER</cbc:ID></Invoice>",
        "QR_PAYLOAD=secret",
        "-----BEGIN EC PRIVATE KEY-----\nsecret\n-----END EC PRIVATE KEY-----",
        "authorization=Bearer-secret",
      ].join("\n"),
    ),
    validationRunId: "test-run",
    timestamp: "2026-06-06T00:00:00.000Z",
  });

  const serialized = JSON.stringify(evidence);
  assert.equal(evidence.runs[0].status, "PASSED");
  assert.equal(evidence.runs[0].networkCallsMade, false);
  assert.equal(serialized.includes("SENSITIVE-CUSTOMER"), false);
  assert.equal(serialized.includes("BEGIN EC PRIVATE KEY"), false);
  assert.equal(serialized.includes("Bearer-secret"), false);
  assert.equal(serialized.includes("QR_PAYLOAD=secret"), false);
});

test("generated fixture evidence stays metadata-only", () => {
  const repo = makeRepo();
  writeFixture(repo, "packages/zatca-core/fixtures/ledgerbyte-generated-credit-note.expected.xml", "<Invoice><cbc:ID>LB-GEN-CN-0001</cbc:ID></Invoice>");
  writeFakeSdk(repo);

  const evidence = runValidationSet({
    cwd: repo,
    parsed: parseArgs(["--fixture", "ledgerbyte-generated-credit-note", "--no-network", "--json"]),
    spawnSync: fakeSdkExecution("11.0.26", "GLOBAL VALIDATION RESULT = PASSED"),
    validationRunId: "test-run",
    timestamp: "2026-06-06T00:00:00.000Z",
  });

  const serialized = JSON.stringify(evidence);
  assert.equal(evidence.runs[0].fixtureId, "ledgerbyte-generated-credit-note");
  assert.equal(evidence.runs[0].status, "PASSED");
  assert.equal(evidence.runs[0].xmlBodyPrinted, false);
  assert.equal(evidence.runs[0].qrPayloadPrinted, false);
  assert.equal(evidence.runs[0].networkCallsMade, false);
  assert.equal(serialized.includes("LB-GEN-CN-0001"), false);
  assert.equal(serialized.includes("<Invoice"), false);
});

test("fixture registry documents generated invoice and credit-note fixtures", () => {
  const repo = path.resolve(__dirname, "..");
  const registry = fs.readFileSync(path.join(repo, "docs", "zatca", "ZATCA_SDK_FIXTURE_REGISTRY.md"), "utf8");

  assert.match(registry, /ledgerbyte-generated-standard-invoice/);
  assert.match(registry, /ledgerbyte-generated-credit-note/);
  assert.match(registry, /productionCompliance.*false/i);
  assert.match(registry, /no-network/i);
});

test("sanitizes SDK output summaries without retaining full bodies", () => {
  const summary = summarizeSdkOutput("ERROR BR-KSA-63\nCODE : BR-KSA-17\n<Invoice>body</Invoice>\npassword=secret");
  assert.deepEqual(summary.errorCodes, ["BR-KSA-63", "BR-KSA-17"]);
  assert.equal(summary.textForInference.includes("<Invoice>"), false);
  assert.equal(sanitizeText("token=abc").includes("abc"), false);
});

function makeRepo() {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), "ledgerbyte-zatca-sdk-test-"));
  fs.writeFileSync(path.join(repo, "package.json"), JSON.stringify({ private: true }), "utf8");
  return repo;
}

function writeFixture(repo, relativePath, body) {
  const target = path.join(repo, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, body, "utf8");
}

function writeFakeSdk(repo) {
  const sdkRoot = path.join(repo, "reference", "zatca-einvoicing-sdk-Java-238-R3.4.8");
  const apps = path.join(sdkRoot, "Apps");
  const config = path.join(sdkRoot, "Configuration");
  fs.mkdirSync(apps, { recursive: true });
  fs.mkdirSync(config, { recursive: true });
  fs.writeFileSync(path.join(apps, "zatca-einvoicing-sdk-238-R3.4.8.jar"), "jar", "utf8");
  fs.writeFileSync(path.join(apps, process.platform === "win32" ? "fatoora.bat" : "fatoora"), "launcher", "utf8");
  fs.writeFileSync(path.join(apps, process.platform === "win32" ? "jq.exe" : "jq"), "jq", "utf8");
  fs.writeFileSync(path.join(config, "config.json"), "{}", "utf8");
}

function fakeJava(version) {
  return (_command, args) => {
    if (args.includes("-version")) {
      return { status: 0, stdout: "", stderr: `openjdk version "${version}"` };
    }
    return { status: 0, stdout: "GLOBAL VALIDATION RESULT = PASSED", stderr: "" };
  };
}

function fakeSdkExecution(version, stdout) {
  return (_command, args) => {
    if (args.includes("-version")) {
      return { status: 0, stdout: "", stderr: `openjdk version "${version}"` };
    }
    return { status: 0, stdout, stderr: "" };
  };
}
