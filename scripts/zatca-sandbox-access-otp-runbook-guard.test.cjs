const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const Module = require("node:module");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const SCRIPT_PATH = path.join(__dirname, "zatca-sandbox-access-otp-runbook-guard.cjs");

test("passes against the repository runbook", () => {
  const result = spawnSync(process.execPath, [SCRIPT_PATH, "--json", "--strict"], {
    cwd: path.resolve(__dirname, ".."),
    encoding: "utf8",
    windowsHide: true,
  });

  assert.equal(result.status, 0);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.status, "RUNBOOK_GUARD_PASSED");
  assert.equal(payload.metadataOnly, true);
  assert.equal(payload.envSecretsRead, false);
  assert.equal(payload.portalLoginAttempted, false);
  assert.equal(payload.otpCaptured, false);
  assert.equal(payload.csidRequested, false);
  assert.equal(payload.zatcaNetworkCallsMade, false);
  assert.deepEqual(payload.blockers, []);
});

test("blocks when required sections are missing", () => {
  const { buildSandboxAccessOtpRunbookGuard } = loadScriptWithNetworkTrap();
  const repo = createRepo("# Incomplete Runbook\n\nNo required sections.\n");
  const result = buildSandboxAccessOtpRunbookGuard({ cwd: repo });

  assert.equal(result.status, "RUNBOOK_GUARD_BLOCKED");
  assert.ok(result.blockers.some((blocker) => blocker.startsWith("BLOCKED_MISSING_RUNBOOK_SECTIONS")));
  assert.equal(result.envSecretsRead, false);
  assert.equal(result.portalLoginAttempted, false);
  assert.equal(result.otpCaptured, false);
  assert.equal(result.zatcaNetworkCallsMade, false);
});

test("blocks when forbidden-data boundaries are missing", () => {
  const { buildSandboxAccessOtpRunbookGuard } = loadScriptWithNetworkTrap();
  const repo = createRepo(completeRunbook().replace("- OTP values\n", ""));
  const result = buildSandboxAccessOtpRunbookGuard({ cwd: repo });

  assert.equal(result.status, "RUNBOOK_GUARD_BLOCKED");
  assert.ok(result.forbiddenBoundaries.missing.includes("OTP values"));
  assert.ok(result.blockers.some((blocker) => blocker.startsWith("BLOCKED_MISSING_FORBIDDEN_BOUNDARIES")));
});

test("blocks when approval ladder is incomplete", () => {
  const { buildSandboxAccessOtpRunbookGuard } = loadScriptWithNetworkTrap();
  const repo = createRepo(completeRunbook().replace("4. real sandbox network request approved\n", ""));
  const result = buildSandboxAccessOtpRunbookGuard({ cwd: repo });

  assert.equal(result.status, "RUNBOOK_GUARD_BLOCKED");
  assert.ok(result.approvalLadder.missing.includes("real sandbox network request approved"));
  assert.ok(result.blockers.some((blocker) => blocker.startsWith("BLOCKED_MISSING_APPROVAL_LADDER")));
});

test("custom runbook path is supported", () => {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), "zatca-access-otp-runbook-custom-"));
  fs.writeFileSync(path.join(repo, "package.json"), "{}\n");
  writeText(repo, "custom/RUNBOOK.md", completeRunbook());

  const result = spawnSync(process.execPath, [SCRIPT_PATH, "--runbook", "custom/RUNBOOK.md", "--json", "--strict"], {
    cwd: repo,
    encoding: "utf8",
    windowsHide: true,
  });

  assert.equal(result.status, 0);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.status, "RUNBOOK_GUARD_PASSED");
  assert.equal(payload.runbookPath, "custom/RUNBOOK.md");
});

test("no network modules are requested", () => {
  const { buildSandboxAccessOtpRunbookGuard } = loadScriptWithNetworkTrap();
  const result = buildSandboxAccessOtpRunbookGuard({ cwd: createRepo(completeRunbook()) });

  assert.equal(result.status, "RUNBOOK_GUARD_PASSED");
  assert.equal(result.zatcaNetworkCallsMade, false);
});

test("script source does not read env, spawn commands, or import network modules", () => {
  const source = fs.readFileSync(SCRIPT_PATH, "utf8");

  assert.doesNotMatch(source, /process\.env/);
  assert.doesNotMatch(source, /child_process|spawnSync|execFile|execSync/);
  assert.doesNotMatch(source, /require\(["'](?:node:)?(?:http|https|net|tls|dns)["']\)/);
});

function loadScriptWithNetworkTrap() {
  delete require.cache[require.resolve(SCRIPT_PATH)];
  const originalLoad = Module._load;
  const networkModules = new Set(["node:http", "node:https", "node:net", "node:tls", "node:dns", "http", "https", "net", "tls", "dns"]);
  Module._load = function guardedLoad(request, parent, isMain) {
    if (networkModules.has(request)) {
      throw new Error(`Network module should not be loaded by runbook guard: ${request}`);
    }
    return originalLoad.call(this, request, parent, isMain);
  };
  try {
    return require(SCRIPT_PATH);
  } finally {
    Module._load = originalLoad;
  }
}

function createRepo(runbookText) {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), "zatca-access-otp-runbook-"));
  fs.writeFileSync(path.join(repo, "package.json"), "{}\n");
  writeText(repo, "docs/zatca/SANDBOX_ACCESS_AND_MANUAL_OTP_RUNBOOK.md", runbookText);
  return repo;
}

function writeText(repo, relativePath, text) {
  const fullPath = path.join(repo, ...relativePath.split("/"));
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, text);
}

function completeRunbook() {
  return [
    "# ZATCA Sandbox Access And Manual OTP Runbook",
    "",
    "Sandbox portal reference only: `https://sandbox.zatca.gov.sa/IntegrationSandbox`",
    "Real ZATCA production compliance is not enabled.",
    "",
    "## Manual Access Steps",
    "Codex must not log in to the portal.",
    "",
    "## Manual OTP Handling Policy",
    "OTP entry into the app requires a future explicit approval lane.",
    "",
    "## Forbidden Data",
    "- login credentials",
    "- OTP values",
    "- CSID values",
    "- binary security tokens",
    "- secrets",
    "- certificates",
    "- private keys",
    "- CSR bodies",
    "- request bodies",
    "- response bodies",
    "- auth headers",
    "- cookies",
    "- portal session data",
    "- raw private keys",
    "- raw certificates",
    "- raw CSRs",
    "- binary security token bodies",
    "- CSID secret bodies",
    "- tokens",
    "- signed XML",
    "- QR payloads",
    "- provider payloads",
    "- customer/vendor data",
    "- bank account data",
    "- email bodies",
    "- production credentials",
    "",
    "## Safe Metadata",
    "- sandbox access confirmed: yes/no",
    "- operator role confirmed: yes/no",
    "- portal URL used",
    "- date/time of manual check",
    "- environment: sandbox only",
    "- whether OTP flow is visible: yes/no",
    "- whether CSID request flow is visible: yes/no",
    "- blocker list",
    "- next required approval boundary",
    "- OTP obtained manually: yes/no",
    "",
    "## Screenshots Policy",
    "Screenshots are discouraged for sandbox portal evidence.",
    "",
    "## Evidence Policy",
    "Evidence for this lane is metadata-only.",
    "",
    "## Human Operator Checklist",
    "- [ ] Sandbox only.",
    "",
    "## Approval Ladder Before Execution",
    "1. sandbox access confirmed",
    "2. manual OTP capture approved",
    "3. request body creation approved",
    "4. real sandbox network request approved",
    "5. response body processing approved",
    "6. response custody approved",
    "7. sandbox CSID stored by approved custody provider",
    "",
    "## Rollback And Abort Conditions",
    "Abort if unsafe.",
    "",
    "## Remaining Blockers",
    "- Approval remains blocked.",
    "",
    "## Recommended Next Lane",
    "`LedgerByte approve and merge ZATCA sandbox access OTP runbook PR.`",
    "",
  ].join("\n");
}
