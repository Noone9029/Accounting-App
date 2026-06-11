#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");

const GATE_DOC_PATH = "docs/zatca/MANUAL_OTP_CAPTURE_APPROVAL_GATE.md";
const ENVIRONMENT = "LOCAL_MANUAL_OTP_CAPTURE_APPROVAL_GATE_METADATA_ONLY";
const APPROVAL_PHRASE =
  "I confirm that an authorized human operator handled ZATCA sandbox OTP capture manually, no OTP value was shared with Codex, and this approval is metadata only. No request body creation, no ZATCA network call, no response processing, no response custody, no CSID request, no signing, no clearance, no reporting, no PDF-A3, and no production compliance are authorized.";

const REQUIRED_SECTIONS = [
  "Purpose",
  "Human-Only OTP Capture Boundary",
  "Exact Approval Phrase",
  "Metadata-Only Evidence Format",
  "Forbidden Fields",
  "Safety Assertions",
  "Explicit Blocker Statuses",
  "Approval Ladder",
  "Abort Conditions",
  "Current Blockers",
  "Recommended Next Prompt",
];

const REQUIRED_EVIDENCE_FIELDS = [
  "sandbox access confirmed: yes/no",
  "human operator role confirmed: yes/no",
  "OTP flow visible: yes/no",
  "OTP obtained manually: yes/no",
  "OTP value stored: no",
  "OTP value shared with Codex: no",
  "CSID requested: no",
  "ZATCA network call made: no",
  "request body created: no",
  "response body processed: no",
];

const REQUIRED_FORBIDDEN_FIELDS = [
  "OTP value",
  "credentials",
  "cookies",
  "session data",
  "auth headers",
  "CSID",
  "tokens",
  "certificates",
  "private keys",
  "CSR body",
  "request body",
  "response body",
  "signed XML",
  "QR payload",
  "customer/vendor data",
];

const REQUIRED_APPROVAL_LADDER = [
  "sandbox access confirmation",
  "manual OTP capture approval metadata",
  "request body creation approval",
  "real sandbox network request approval",
  "response processing approval",
  "response custody approval",
  "sandbox CSID storage by approved custody provider",
];

const REQUIRED_SAFETY_PHRASES = [
  "Codex must never capture, view, store, paste, transform, validate, screenshot, log, or transmit OTP values.",
  "This phrase does not authorize execution.",
  "Even when the exact approval phrase is recognized, execution remains blocked.",
  "Production compliance remains disabled and not claimed.",
  "Request body creation remains blocked.",
  "Real sandbox network request execution remains blocked.",
];

const DANGEROUS_ALLOWANCES = [
  {
    label: "DANGEROUS_ALLOWANCE_CODEX_OTP_CAPTURE",
    pattern: /codex\s+(?:may|can|should|will|is allowed to)\s+(?:capture|view|store|paste|transform|validate|screenshot|log|transmit)\s+otp/i,
  },
  {
    label: "DANGEROUS_ALLOWANCE_OTP_STORAGE",
    pattern: /otp\s+values?\s+(?:may|can|should|will|are allowed to)\s+(?:be\s+)?(?:stored|shared|logged|pasted|transmitted|validated)/i,
  },
  {
    label: "DANGEROUS_ALLOWANCE_CSID_REQUEST",
    pattern: /csid\s+(?:may|can|should|will|is allowed to)\s+(?:be\s+)?requested/i,
  },
  {
    label: "DANGEROUS_ALLOWANCE_ZATCA_NETWORK",
    pattern: /zatca\s+network\s+calls?\s+(?:may|can|should|will|are allowed to)\s+(?:be\s+)?made/i,
  },
  {
    label: "DANGEROUS_ALLOWANCE_REQUEST_BODY",
    pattern: /request\s+bodies?\s+(?:may|can|should|will|are allowed to)\s+(?:be\s+)?(?:created|processed|stored|printed)/i,
  },
  {
    label: "DANGEROUS_ALLOWANCE_RESPONSE_BODY",
    pattern: /response\s+bodies?\s+(?:may|can|should|will|are allowed to)\s+(?:be\s+)?(?:processed|stored|printed)/i,
  },
  {
    label: "DANGEROUS_ALLOWANCE_SIGNING",
    pattern: /signing\s+(?:may|can|should|will|is allowed to)\s+(?:be\s+)?enabled/i,
  },
  {
    label: "DANGEROUS_ALLOWANCE_CLEARANCE_REPORTING",
    pattern: /clearance\/reporting\s+(?:may|can|should|will|is allowed to)\s+(?:be\s+)?enabled/i,
  },
  {
    label: "DANGEROUS_ALLOWANCE_PDFA3",
    pattern: /pdf-a-?3\s+(?:may|can|should|will|is allowed to)\s+(?:be\s+)?enabled/i,
  },
  {
    label: "DANGEROUS_ALLOWANCE_PRODUCTION_COMPLIANCE",
    pattern: /production\s+compliance\s+(?:may|can|should|will|is allowed to)\s+(?:be\s+)?claimed/i,
  },
];

function parseArgs(argv) {
  const parsed = {
    json: false,
    strict: false,
    help: false,
    metadataOnly: false,
    approvalPhrase: null,
    gateDoc: GATE_DOC_PATH,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--json") {
      parsed.json = true;
    } else if (arg === "--strict") {
      parsed.strict = true;
    } else if (arg === "--metadata-only") {
      parsed.metadataOnly = true;
    } else if (arg === "--approval-phrase") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error("--approval-phrase requires a value.");
      }
      parsed.approvalPhrase = value;
      index += 1;
    } else if (arg === "--gate-doc") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error("--gate-doc requires a path.");
      }
      parsed.gateDoc = value;
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
    "  node scripts/zatca-manual-otp-capture-approval-gate.cjs --json",
    "  node scripts/zatca-manual-otp-capture-approval-gate.cjs --json --strict",
    "  node scripts/zatca-manual-otp-capture-approval-gate.cjs --json --approval-phrase \"<text>\" --metadata-only",
    "  node scripts/zatca-manual-otp-capture-approval-gate.cjs --gate-doc <path> --json",
    "",
    "This guard validates committed policy text only.",
    "It never requests OTPs, requests CSIDs, reads env secrets, opens network connections, writes files, creates request bodies, processes response bodies, signs XML, enables clearance/reporting, enables PDF-A3, or claims production compliance.",
  ].join("\n");
}

function buildManualOtpCaptureApprovalGate(options = {}) {
  const repoRoot = resolveRepoRoot(options.cwd || process.cwd());
  const gateDocPath = normalizeRelativePath(options.gateDoc || GATE_DOC_PATH);
  const fullGateDocPath = path.join(repoRoot, ...gateDocPath.split("/"));
  const blockers = [];
  const warnings = [];

  let text = "";
  if (!fs.existsSync(fullGateDocPath)) {
    blockers.push(`BLOCKED_GATE_DOC_MISSING: ${gateDocPath}`);
  } else {
    text = fs.readFileSync(fullGateDocPath, "utf8");
  }

  const missingSections = REQUIRED_SECTIONS.filter((section) => !hasHeading(text, section));
  const missingEvidenceFields = missingItems(text, REQUIRED_EVIDENCE_FIELDS);
  const missingForbiddenFields = missingItems(text, REQUIRED_FORBIDDEN_FIELDS);
  const missingApprovalLadder = missingItems(text, REQUIRED_APPROVAL_LADDER);
  const missingSafetyPhrases = missingItems(text, REQUIRED_SAFETY_PHRASES);
  const dangerousAllowances = DANGEROUS_ALLOWANCES.filter((entry) => entry.pattern.test(text)).map((entry) => entry.label);

  if (missingSections.length > 0) {
    blockers.push(`BLOCKED_MISSING_GATE_SECTIONS: ${missingSections.join(", ")}`);
  }
  if (missingEvidenceFields.length > 0) {
    blockers.push(`BLOCKED_MISSING_SAFE_EVIDENCE_FIELDS: ${missingEvidenceFields.join(", ")}`);
  }
  if (missingForbiddenFields.length > 0) {
    blockers.push(`BLOCKED_MISSING_FORBIDDEN_FIELDS: ${missingForbiddenFields.join(", ")}`);
  }
  if (missingApprovalLadder.length > 0) {
    blockers.push(`BLOCKED_MISSING_APPROVAL_LADDER: ${missingApprovalLadder.join(", ")}`);
  }
  if (missingSafetyPhrases.length > 0) {
    blockers.push(`BLOCKED_MISSING_SAFETY_PHRASES: ${missingSafetyPhrases.join(", ")}`);
  }
  if (dangerousAllowances.length > 0) {
    blockers.push(`BLOCKED_DANGEROUS_ALLOWANCE_TEXT: ${dangerousAllowances.join(", ")}`);
  }

  const approvalPhrase = typeof options.approvalPhrase === "string" ? options.approvalPhrase : "";
  const approvalPhraseProvided = approvalPhrase.length > 0;
  const approvalPhraseMatched = approvalPhraseProvided && approvalPhrase === APPROVAL_PHRASE;
  const metadataOnlyFlagProvided = Boolean(options.metadataOnly);
  const docsPolicyPassed = blockers.length === 0;

  let status = "MANUAL_OTP_CAPTURE_APPROVAL_BLOCKED";
  if (!docsPolicyPassed) {
    status = "MANUAL_OTP_CAPTURE_APPROVAL_POLICY_BLOCKED";
  } else if (approvalPhraseProvided && !approvalPhraseMatched) {
    status = "MANUAL_OTP_CAPTURE_APPROVAL_INVALID_PHRASE";
    blockers.push("BLOCKED_INVALID_APPROVAL_PHRASE");
  } else if (approvalPhraseMatched && !metadataOnlyFlagProvided) {
    status = "MANUAL_OTP_CAPTURE_APPROVAL_METADATA_ONLY_FLAG_REQUIRED";
    blockers.push("BLOCKED_METADATA_ONLY_FLAG_REQUIRED");
  } else if (approvalPhraseMatched && metadataOnlyFlagProvided) {
    status = "MANUAL_OTP_CAPTURE_APPROVAL_RECOGNIZED_BUT_EXECUTION_BLOCKED";
    blockers.push("BLOCKED_EXECUTION_NOT_AUTHORIZED");
  } else {
    blockers.push("BLOCKED_APPROVAL_PHRASE_REQUIRED");
  }

  return {
    status,
    environment: ENVIRONMENT,
    gateDocPath,
    metadataOnly: true,
    docsPolicyPassed,
    approvalPhraseProvided,
    approvalPhraseMatched,
    metadataOnlyFlagProvided,
    executionAuthorizedNow: false,
    humanOnlyBoundaryRequired: true,
    envSecretsRead: false,
    dbAccessAttempted: false,
    networkAccessAttempted: false,
    fileWritesAttempted: false,
    otpCapturedByCodex: false,
    otpValueStored: false,
    otpValueSharedWithCodex: false,
    csidRequested: false,
    zatcaNetworkCallMade: false,
    requestBodyCreated: false,
    responseBodyProcessed: false,
    signingEnabled: false,
    clearanceReportingEnabled: false,
    pdfA3Enabled: false,
    productionComplianceClaimed: false,
    requiredSections: {
      required: REQUIRED_SECTIONS,
      missing: missingSections,
    },
    safeEvidenceFields: {
      required: REQUIRED_EVIDENCE_FIELDS,
      missing: missingEvidenceFields,
    },
    forbiddenFields: {
      required: REQUIRED_FORBIDDEN_FIELDS,
      missing: missingForbiddenFields,
    },
    approvalLadder: {
      required: REQUIRED_APPROVAL_LADDER,
      missing: missingApprovalLadder,
    },
    safetyPhrases: {
      required: REQUIRED_SAFETY_PHRASES,
      missing: missingSafetyPhrases,
    },
    dangerousAllowances,
    blockers: [...new Set(blockers)],
    warnings,
    recommendedNextPrompt: "ZATCA sandbox request body creation approval gate",
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

function normalizeRelativePath(relativePath) {
  return relativePath.replace(/\\/g, "/").replace(/^\.?\//, "");
}

function resolveRepoRoot(startDirectory) {
  let current = path.resolve(startDirectory);
  for (;;) {
    if (fs.existsSync(path.join(current, "package.json"))) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      return path.resolve(startDirectory);
    }
    current = parent;
  }
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function renderText(result) {
  return [
    `ZATCA manual OTP capture approval gate: ${result.status}`,
    `Docs policy passed: ${result.docsPolicyPassed ? "true" : "false"}`,
    `Metadata only: ${result.metadataOnly ? "true" : "false"}`,
    `Approval phrase matched: ${result.approvalPhraseMatched ? "true" : "false"}`,
    `Metadata-only flag provided: ${result.metadataOnlyFlagProvided ? "true" : "false"}`,
    `Execution authorized now: ${result.executionAuthorizedNow ? "true" : "false"}`,
    ...result.blockers.map((blocker) => `- ${blocker}`),
  ].join("\n");
}

function main(argv = process.argv.slice(2), io = { stdout: process.stdout, stderr: process.stderr }) {
  let args;
  try {
    args = parseArgs(argv);
  } catch (error) {
    const payload = {
      status: "MANUAL_OTP_CAPTURE_APPROVAL_INVALID_ARGUMENT",
      environment: ENVIRONMENT,
      metadataOnly: true,
      envSecretsRead: false,
      dbAccessAttempted: false,
      networkAccessAttempted: false,
      fileWritesAttempted: false,
      error: error instanceof Error ? error.message : "Invalid argument.",
    };
    io.stderr.write(`${JSON.stringify(payload, null, 2)}\n`);
    return 2;
  }

  if (args.help) {
    io.stdout.write(`${usage()}\n`);
    return 0;
  }

  const result = buildManualOtpCaptureApprovalGate({
    cwd: process.cwd(),
    gateDoc: args.gateDoc,
    approvalPhrase: args.approvalPhrase,
    metadataOnly: args.metadataOnly,
  });
  io.stdout.write(`${args.json ? JSON.stringify(result, null, 2) : renderText(result)}\n`);
  return args.strict && result.status !== "MANUAL_OTP_CAPTURE_APPROVAL_RECOGNIZED_BUT_EXECUTION_BLOCKED" ? 1 : args.strict ? 1 : 0;
}

if (require.main === module) {
  process.exitCode = main();
}

module.exports = {
  APPROVAL_PHRASE,
  buildManualOtpCaptureApprovalGate,
  parseArgs,
};
