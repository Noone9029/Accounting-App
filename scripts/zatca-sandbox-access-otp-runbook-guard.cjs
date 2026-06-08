#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");

const RUNBOOK_PATH = "docs/zatca/SANDBOX_ACCESS_AND_MANUAL_OTP_RUNBOOK.md";
const ENVIRONMENT = "LOCAL_SANDBOX_ACCESS_OTP_RUNBOOK_GUARD_METADATA_ONLY";

const REQUIRED_SECTIONS = [
  "Manual Access Steps",
  "Manual OTP Handling Policy",
  "Forbidden Data",
  "Safe Metadata",
  "Screenshots Policy",
  "Evidence Policy",
  "Human Operator Checklist",
  "Approval Ladder Before Execution",
  "Rollback And Abort Conditions",
  "Remaining Blockers",
  "Recommended Next Lane",
];

const REQUIRED_FORBIDDEN_BOUNDARIES = [
  "login credentials",
  "OTP values",
  "CSID values",
  "binary security tokens",
  "secrets",
  "certificates",
  "private keys",
  "CSR bodies",
  "request bodies",
  "response bodies",
  "auth headers",
  "cookies",
  "portal session data",
  "raw private keys",
  "raw certificates",
  "raw CSRs",
  "binary security token bodies",
  "CSID secret bodies",
  "tokens",
  "signed XML",
  "QR payloads",
  "provider payloads",
  "customer/vendor data",
  "bank account data",
  "email bodies",
  "production credentials",
];

const REQUIRED_SAFE_METADATA = [
  "sandbox access confirmed: yes/no",
  "operator role confirmed: yes/no",
  "portal URL used",
  "date/time of manual check",
  "environment: sandbox only",
  "whether OTP flow is visible: yes/no",
  "whether CSID request flow is visible: yes/no",
  "blocker list",
  "next required approval boundary",
  "OTP obtained manually: yes/no",
];

const REQUIRED_APPROVAL_LADDER = [
  "sandbox access confirmed",
  "manual OTP capture approved",
  "request body creation approved",
  "real sandbox network request approved",
  "response body processing approved",
  "response custody approved",
  "sandbox CSID stored by approved custody provider",
];

const REQUIRED_SAFETY_PHRASES = [
  "Codex must not log in to the portal",
  "OTP entry into the app requires a future explicit approval lane",
  "Screenshots are discouraged for sandbox portal evidence",
  "Evidence for this lane is metadata-only",
  "Real ZATCA production compliance is not enabled",
  "Sandbox portal reference only",
];

function parseArgs(argv) {
  const parsed = {
    json: false,
    strict: false,
    help: false,
    runbook: RUNBOOK_PATH,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--json") {
      parsed.json = true;
    } else if (arg === "--strict") {
      parsed.strict = true;
    } else if (arg === "--runbook") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error("--runbook requires a path.");
      }
      parsed.runbook = value;
      index += 1;
    } else if (arg === "--help" || arg === "-h") {
      parsed.help = true;
    } else if (arg === "--") {
      continue;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return parsed;
}

function usage() {
  return [
    "Usage:",
    "  node scripts/zatca-sandbox-access-otp-runbook-guard.cjs --json",
    "  node scripts/zatca-sandbox-access-otp-runbook-guard.cjs --json --strict",
    "  node scripts/zatca-sandbox-access-otp-runbook-guard.cjs --runbook <path> --json",
    "",
    "This guard validates committed runbook text only.",
    "It does not read env secrets, log in to portals, request OTPs, request CSIDs, call ZATCA, create request bodies, process response bodies, sign, clear/report, create PDF-A-3, mutate data, migrate, seed, reset, delete, deploy, or execute browser automation.",
  ].join("\n");
}

function buildSandboxAccessOtpRunbookGuard(options = {}) {
  const repoRoot = resolveRepoRoot(options.cwd || process.cwd());
  const runbookPath = normalizeRunbookPath(options.runbook || RUNBOOK_PATH);
  const fullRunbookPath = path.join(repoRoot, ...runbookPath.split("/"));
  const blockers = [];
  const warnings = [];

  let text = "";
  if (!fs.existsSync(fullRunbookPath)) {
    blockers.push(`BLOCKED_RUNBOOK_MISSING: ${runbookPath}`);
  } else {
    text = fs.readFileSync(fullRunbookPath, "utf8");
  }

  const missingSections = REQUIRED_SECTIONS.filter((section) => !hasHeading(text, section));
  const missingForbiddenBoundaries = missingItems(text, REQUIRED_FORBIDDEN_BOUNDARIES);
  const missingSafeMetadata = missingItems(text, REQUIRED_SAFE_METADATA);
  const missingApprovalLadder = missingItems(text, REQUIRED_APPROVAL_LADDER);
  const missingSafetyPhrases = missingItems(text, REQUIRED_SAFETY_PHRASES);

  if (missingSections.length > 0) {
    blockers.push(`BLOCKED_MISSING_RUNBOOK_SECTIONS: ${missingSections.join(", ")}`);
  }
  if (missingForbiddenBoundaries.length > 0) {
    blockers.push(`BLOCKED_MISSING_FORBIDDEN_BOUNDARIES: ${missingForbiddenBoundaries.join(", ")}`);
  }
  if (missingSafeMetadata.length > 0) {
    blockers.push(`BLOCKED_MISSING_SAFE_METADATA: ${missingSafeMetadata.join(", ")}`);
  }
  if (missingApprovalLadder.length > 0) {
    blockers.push(`BLOCKED_MISSING_APPROVAL_LADDER: ${missingApprovalLadder.join(", ")}`);
  }
  if (missingSafetyPhrases.length > 0) {
    blockers.push(`BLOCKED_MISSING_SAFETY_PHRASES: ${missingSafetyPhrases.join(", ")}`);
  }

  const status = blockers.length > 0 ? "RUNBOOK_GUARD_BLOCKED" : "RUNBOOK_GUARD_PASSED";

  return {
    status,
    environment: ENVIRONMENT,
    runbookPath,
    metadataOnly: true,
    runbookRead: text.length > 0,
    envSecretsRead: false,
    portalDataRead: false,
    portalLoginAttempted: false,
    otpRequested: false,
    otpCaptured: false,
    otpValueStored: false,
    csidRequested: false,
    zatcaNetworkCallsMade: false,
    requestBodyCreated: false,
    responseBodyProcessed: false,
    privateKeyGenerated: false,
    signingEnabled: false,
    clearanceReportingEnabled: false,
    pdfA3Enabled: false,
    productionComplianceEnabled: false,
    sections: {
      required: REQUIRED_SECTIONS,
      missing: missingSections,
    },
    forbiddenBoundaries: {
      required: REQUIRED_FORBIDDEN_BOUNDARIES,
      missing: missingForbiddenBoundaries,
    },
    safeMetadata: {
      required: REQUIRED_SAFE_METADATA,
      missing: missingSafeMetadata,
    },
    approvalLadder: {
      required: REQUIRED_APPROVAL_LADDER,
      missing: missingApprovalLadder,
    },
    safetyPhrases: {
      required: REQUIRED_SAFETY_PHRASES,
      missing: missingSafetyPhrases,
    },
    blockers,
    warnings,
    recommendedNextPrompt: "LedgerByte approve and merge ZATCA sandbox access OTP runbook PR.",
  };
}

function hasHeading(text, heading) {
  const pattern = new RegExp(`^##\\s+${escapeRegExp(heading)}\\s*$`, "im");
  return pattern.test(text);
}

function missingItems(text, required) {
  const lowerText = text.toLowerCase();
  return required.filter((item) => !lowerText.includes(item.toLowerCase()));
}

function normalizeRunbookPath(runbookPath) {
  return runbookPath.replace(/\\/g, "/").replace(/^\.?\//, "");
}

function resolveRepoRoot(cwd) {
  let current = path.resolve(cwd);
  for (;;) {
    if (fs.existsSync(path.join(current, "package.json"))) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      return path.resolve(cwd);
    }
    current = parent;
  }
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function renderText(result) {
  return [
    `ZATCA sandbox access OTP runbook guard: ${result.status}`,
    `Runbook read: ${result.runbookRead ? "true" : "false"}`,
    `Metadata only: ${result.metadataOnly ? "true" : "false"}`,
    `Portal login attempted: ${result.portalLoginAttempted ? "true" : "false"}`,
    `OTP captured: ${result.otpCaptured ? "true" : "false"}`,
    `CSID requested: ${result.csidRequested ? "true" : "false"}`,
    `ZATCA network calls made: ${result.zatcaNetworkCallsMade ? "true" : "false"}`,
    ...result.blockers.map((blocker) => `- ${blocker}`),
  ].join("\n");
}

function main(argv = process.argv.slice(2), io = { stdout: process.stdout, stderr: process.stderr }) {
  let args;
  try {
    args = parseArgs(argv);
  } catch (error) {
    const payload = {
      status: "RUNBOOK_GUARD_INVALID_ARGUMENT",
      environment: ENVIRONMENT,
      metadataOnly: true,
      envSecretsRead: false,
      portalLoginAttempted: false,
      otpCaptured: false,
      csidRequested: false,
      zatcaNetworkCallsMade: false,
      error: error instanceof Error ? error.message : "Invalid argument.",
    };
    io.stderr.write(`${JSON.stringify(payload, null, 2)}\n`);
    return 2;
  }

  if (args.help) {
    io.stdout.write(`${usage()}\n`);
    return 0;
  }

  const result = buildSandboxAccessOtpRunbookGuard({
    cwd: process.cwd(),
    runbook: args.runbook,
  });
  io.stdout.write(`${args.json ? JSON.stringify(result, null, 2) : renderText(result)}\n`);
  return args.strict && result.status !== "RUNBOOK_GUARD_PASSED" ? 1 : 0;
}

if (require.main === module) {
  process.exitCode = main();
}

module.exports = {
  buildSandboxAccessOtpRunbookGuard,
  parseArgs,
  REQUIRED_APPROVAL_LADDER,
  REQUIRED_FORBIDDEN_BOUNDARIES,
  REQUIRED_SAFE_METADATA,
  REQUIRED_SECTIONS,
};
