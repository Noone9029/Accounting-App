#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");

const GATE_DOC_PATH = "docs/zatca/SANDBOX_REQUEST_BODY_CREATION_APPROVAL_GATE.md";
const ENVIRONMENT = "LOCAL_SANDBOX_REQUEST_BODY_CREATION_APPROVAL_GATE_METADATA_ONLY";
const APPROVAL_PHRASE =
  "I approve ZATCA sandbox request body creation planning only. No real OTP, no CSID request, no CSR body, no private key, no certificate, no token or secret, no taxpayer/customer/vendor data, no invoice body, no ZATCA network call, no response processing, no signing, no clearance, no reporting, no PDF-A3, and no production compliance are authorized.";

const REQUIRED_SECTIONS = [
  "Purpose",
  "Request Body Creation Boundary",
  "Exact Approval Phrase",
  "Metadata-Only Evidence Format",
  "Forbidden Evidence And Body Fields",
  "Safety Assertions",
  "Explicit Blocker Statuses",
  "Approval Ladder",
  "Abort Conditions",
  "Current Blockers",
  "Recommended Next Prompt",
];

const REQUIRED_EVIDENCE_FIELDS = [
  "sandbox access confirmed: yes/no",
  "manual OTP capture approval metadata recognized: yes/no",
  "request body creation approval phrase recognized: yes/no",
  "request body created: no",
  "real OTP included: no",
  "CSID requested: no",
  "ZATCA network call made: no",
  "response body processed: no",
  "signing enabled: no",
  "clearance/reporting enabled: no",
  "PDF-A3 enabled: no",
  "production compliance claimed: no",
  "next approval boundary",
];

const REQUIRED_FORBIDDEN_FIELDS = [
  "OTP value",
  "CSID",
  "binary security token",
  "secret",
  "private key",
  "certificate body",
  "CSR body",
  "request body",
  "response body",
  "signed XML",
  "QR payload",
  "auth header",
  "cookie",
  "portal session data",
  "taxpayer/customer/vendor data",
  "invoice payload/body",
  "production credential",
];

const REQUIRED_APPROVAL_LADDER = [
  "sandbox access confirmation",
  "manual OTP capture approval metadata",
  "request body creation approval metadata",
  "real sandbox network request approval",
  "response processing approval",
  "response custody approval",
  "sandbox CSID storage by approved custody provider",
];

const REQUIRED_SAFETY_PHRASES = [
  "This phrase does not authorize execution.",
  "Even when the exact approval phrase is recognized, execution remains blocked.",
  "No actual request body creation is authorized in this lane.",
  "Request body creation remains blocked pending a separate future execution lane.",
  "Real sandbox network request execution remains blocked.",
  "Production compliance remains disabled and not claimed.",
];

const DANGEROUS_ALLOWANCES = [
  {
    label: "DANGEROUS_ALLOWANCE_REQUEST_BODY_CREATION",
    pattern: /(?:real\s+)?request\s+b(?:ody|odies)\s+(?:may|can|should|will|are allowed to)\s+(?:be\s+)?(?:created|generated|built|printed|persisted|transmitted)/i,
  },
  {
    label: "DANGEROUS_ALLOWANCE_OTP_INCLUSION",
    pattern: /(?:real\s+)?otp\s+(?:may|can|should|will|is allowed to)\s+(?:be\s+)?(?:included|inserted|embedded|stored|printed|transmitted)/i,
  },
  {
    label: "DANGEROUS_ALLOWANCE_CSID_REQUEST",
    pattern: /csid\s+(?:may|can|should|will|is allowed to)\s+(?:be\s+)?requested/i,
  },
  {
    label: "DANGEROUS_ALLOWANCE_CSR_BODY",
    pattern: /csr\s+body\s+(?:may|can|should|will|is allowed to)\s+(?:be\s+)?(?:included|stored|printed|transmitted)/i,
  },
  {
    label: "DANGEROUS_ALLOWANCE_PRIVATE_KEY",
    pattern: /private\s+key\s+(?:may|can|should|will|is allowed to)\s+(?:be\s+)?(?:included|stored|printed|transmitted)/i,
  },
  {
    label: "DANGEROUS_ALLOWANCE_CERTIFICATE",
    pattern: /certificate\s+body\s+(?:may|can|should|will|is allowed to)\s+(?:be\s+)?(?:included|stored|printed|transmitted)/i,
  },
  {
    label: "DANGEROUS_ALLOWANCE_ZATCA_NETWORK",
    pattern: /zatca\s+network\s+calls?\s+(?:may|can|should|will|are allowed to)\s+(?:be\s+)?made/i,
  },
  {
    label: "DANGEROUS_ALLOWANCE_RESPONSE_BODY",
    pattern: /response\s+bodies?\s+(?:may|can|should|will|are allowed to)\s+(?:be\s+)?(?:processed|stored|printed|transmitted)/i,
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
    "  node scripts/zatca-sandbox-request-body-creation-approval-gate.cjs --json",
    "  node scripts/zatca-sandbox-request-body-creation-approval-gate.cjs --json --strict",
    '  node scripts/zatca-sandbox-request-body-creation-approval-gate.cjs --json --approval-phrase "<text>" --metadata-only',
    "  node scripts/zatca-sandbox-request-body-creation-approval-gate.cjs --gate-doc <path> --json",
    "",
    "This guard validates committed policy text only.",
    "It never creates request bodies, accepts OTP values, requests CSIDs, reads env secrets, opens network connections, writes files, processes responses, signs XML, enables clearance/reporting, enables PDF-A3, or claims production compliance.",
  ].join("\n");
}

function buildSandboxRequestBodyCreationApprovalGate(options = {}) {
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

  let status = "REQUEST_BODY_CREATION_APPROVAL_BLOCKED";
  if (!docsPolicyPassed) {
    status = "REQUEST_BODY_CREATION_APPROVAL_POLICY_BLOCKED";
  } else if (approvalPhraseProvided && !approvalPhraseMatched) {
    status = "REQUEST_BODY_CREATION_APPROVAL_INVALID_PHRASE";
    blockers.push("BLOCKED_INVALID_APPROVAL_PHRASE");
  } else if (approvalPhraseMatched && !metadataOnlyFlagProvided) {
    status = "REQUEST_BODY_CREATION_APPROVAL_METADATA_ONLY_FLAG_REQUIRED";
    blockers.push("BLOCKED_METADATA_ONLY_FLAG_REQUIRED");
  } else if (approvalPhraseMatched && metadataOnlyFlagProvided) {
    status = "REQUEST_BODY_CREATION_APPROVAL_RECOGNIZED_BUT_EXECUTION_BLOCKED";
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
    requestBodyCreationAuthorizedNow: false,
    envSecretsRead: false,
    dbAccessAttempted: false,
    networkAccessAttempted: false,
    fileWritesAttempted: false,
    requestBodyCreated: false,
    realOtpIncluded: false,
    csidRequested: false,
    csrBodyIncluded: false,
    privateKeyIncluded: false,
    certificateIncluded: false,
    tokenOrSecretIncluded: false,
    taxpayerCustomerVendorDataIncluded: false,
    invoiceBodyIncluded: false,
    zatcaNetworkCallMade: false,
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
    nextApprovalBoundary: "ZATCA sandbox network request approval gate",
    recommendedNextPrompt: "ZATCA sandbox network request approval gate",
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
    `ZATCA sandbox request body creation approval gate: ${result.status}`,
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
      status: "REQUEST_BODY_CREATION_APPROVAL_INVALID_ARGUMENT",
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

  const result = buildSandboxRequestBodyCreationApprovalGate({
    cwd: process.cwd(),
    gateDoc: args.gateDoc,
    approvalPhrase: args.approvalPhrase,
    metadataOnly: args.metadataOnly,
  });
  io.stdout.write(`${args.json ? JSON.stringify(result, null, 2) : renderText(result)}\n`);
  return args.strict && result.status !== "REQUEST_BODY_CREATION_APPROVAL_RECOGNIZED_BUT_EXECUTION_BLOCKED" ? 1 : args.strict ? 1 : 0;
}

if (require.main === module) {
  process.exitCode = main();
}

module.exports = {
  APPROVAL_PHRASE,
  buildSandboxRequestBodyCreationApprovalGate,
  parseArgs,
};
