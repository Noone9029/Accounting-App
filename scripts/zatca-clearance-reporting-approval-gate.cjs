#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");

const GATE_DOC_PATH = "docs/zatca/CLEARANCE_REPORTING_APPROVAL_GATE.md";
const ENVIRONMENT = "LOCAL_CLEARANCE_REPORTING_APPROVAL_GATE_METADATA_ONLY";
const APPROVAL_PHRASE =
  "I approve ZATCA clearance and reporting planning only. No clearance execution, no reporting execution, no invoice submission, no credit note submission, no debit note submission, no ZATCA API call, no request body creation, no response body processing, no CSID use, no token or secret use, no certificate or private key use, no signed XML use, no QR use, no PDF-A3, no invoice or accounting mutation, no customer-data mutation, no payload storage, and no production compliance are authorized.";

const REQUIRED_SECTIONS = [
  "Purpose",
  "Clearance Reporting Boundary",
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
  "clearance approval phrase recognized: yes/no",
  "reporting approval phrase recognized: yes/no",
  "clearance executed: no",
  "reporting executed: no",
  "invoice submitted: no",
  "note submitted: no",
  "ZATCA network call: no",
  "request body created: no",
  "response body processed: no",
  "CSID used: no",
  "token/secret/certificate/private key used: no",
  "signed XML used: no",
  "QR used: no",
  "PDF-A3 created: no",
  "production compliance: no",
  "next boundary",
];

const REQUIRED_FORBIDDEN_FIELDS = [
  "OTP value",
  "CSID",
  "binary security token",
  "token",
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
  "clearance payload",
  "reporting payload",
  "production credential",
  "endpoint credential or API key",
];

const REQUIRED_APPROVAL_LADDER = [
  "sandbox access confirmation",
  "manual OTP capture approval metadata",
  "request body creation approval metadata",
  "real sandbox network request approval metadata",
  "response processing approval metadata",
  "response custody approval metadata",
  "sandbox CSID storage by approved custody provider",
  "signing and Phase 2 QR approval metadata",
  "clearance reporting approval metadata",
  "PDF-A3 approval metadata",
];

const REQUIRED_SAFETY_PHRASES = [
  "This phrase does not authorize execution.",
  "Even when the exact approval phrase is recognized, execution remains blocked.",
  "No clearance execution is authorized in this lane.",
  "No reporting execution is authorized in this lane.",
  "No invoice or note submission is authorized in this lane.",
  "No ZATCA API call is authorized in this lane.",
  "No request body creation or response body processing is authorized in this lane.",
  "No CSID, token, secret, certificate, or private-key use is authorized in this lane.",
  "No signed XML use, QR use, or PDF-A3 generation is authorized in this lane.",
  "No clearance/reporting payload is stored in this lane.",
  "Production compliance remains disabled and not claimed.",
];

const DANGEROUS_ALLOWANCES = [
  {
    label: "DANGEROUS_ALLOWANCE_CLEARANCE_EXECUTION",
    pattern: /clearance\s+(?:may|can|should|will|is allowed to)\s+(?:be\s+)?(?:executed|run|performed|enabled)/i,
  },
  {
    label: "DANGEROUS_ALLOWANCE_REPORTING_EXECUTION",
    pattern: /reporting\s+(?:may|can|should|will|is allowed to)\s+(?:be\s+)?(?:executed|run|performed|enabled)/i,
  },
  {
    label: "DANGEROUS_ALLOWANCE_INVOICE_SUBMISSION",
    pattern: /invoice(?:s)?\s+(?:may|can|should|will|are allowed to)\s+(?:be\s+)?submitted/i,
  },
  {
    label: "DANGEROUS_ALLOWANCE_NOTE_SUBMISSION",
    pattern: /(?:credit|debit)\s+notes?\s+(?:may|can|should|will|are allowed to)\s+(?:be\s+)?submitted/i,
  },
  {
    label: "DANGEROUS_ALLOWANCE_ZATCA_API_CALL",
    pattern: /zatca\s+(?:api\s+calls?|network\s+calls?)\s+(?:may|can|should|will|are allowed to)\s+(?:be\s+)?(?:executed|made|sent|performed)/i,
  },
  {
    label: "DANGEROUS_ALLOWANCE_REQUEST_BODY",
    pattern: /request\s+bod(?:y|ies)\s+(?:may|can|should|will|are allowed to)\s+(?:be\s+)?(?:created|generated|sent|stored|persisted)/i,
  },
  {
    label: "DANGEROUS_ALLOWANCE_RESPONSE_BODY",
    pattern: /response\s+bod(?:y|ies)\s+(?:may|can|should|will|are allowed to)\s+(?:be\s+)?(?:processed|parsed|stored|persisted|summarized)/i,
  },
  {
    label: "DANGEROUS_ALLOWANCE_CSID_USE",
    pattern: /csid\s+(?:may|can|should|will|is allowed to)\s+(?:be\s+)?used/i,
  },
  {
    label: "DANGEROUS_ALLOWANCE_TOKEN_OR_SECRET_USE",
    pattern: /(?:token|secret)\s+(?:may|can|should|will|is allowed to)\s+(?:be\s+)?used/i,
  },
  {
    label: "DANGEROUS_ALLOWANCE_CERTIFICATE_USE",
    pattern: /certificate(?:\s+body)?\s+(?:may|can|should|will|is allowed to)\s+(?:be\s+)?used/i,
  },
  {
    label: "DANGEROUS_ALLOWANCE_PRIVATE_KEY_USE",
    pattern: /private\s+key\s+(?:may|can|should|will|is allowed to)\s+(?:be\s+)?used/i,
  },
  {
    label: "DANGEROUS_ALLOWANCE_SIGNED_XML_USE",
    pattern: /signed\s+xml\s+(?:may|can|should|will|is allowed to)\s+(?:be\s+)?(?:used|generated|stored|persisted)/i,
  },
  {
    label: "DANGEROUS_ALLOWANCE_QR_USE",
    pattern: /qr(?:\s+payload)?\s+(?:may|can|should|will|is allowed to)\s+(?:be\s+)?(?:used|generated|stored|persisted)/i,
  },
  {
    label: "DANGEROUS_ALLOWANCE_PDFA3",
    pattern: /pdf-a-?3\s+(?:may|can|should|will|is allowed to)\s+(?:be\s+)?(?:generated|created|enabled)/i,
  },
  {
    label: "DANGEROUS_ALLOWANCE_PAYLOAD_STORAGE",
    pattern: /(?:clearance|reporting)\s+payloads?\s+(?:may|can|should|will|are allowed to)\s+(?:be\s+)?(?:stored|persisted|archived|exported)/i,
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
    "  node scripts/zatca-clearance-reporting-approval-gate.cjs --json",
    "  node scripts/zatca-clearance-reporting-approval-gate.cjs --json --strict",
    '  node scripts/zatca-clearance-reporting-approval-gate.cjs --json --approval-phrase "<text>" --metadata-only',
    "  node scripts/zatca-clearance-reporting-approval-gate.cjs --gate-doc <path> --json",
    "",
    "This guard validates committed policy text only.",
    "It never executes clearance, reporting, invoice submission, API calls, request or response body handling, signing, QR generation, PDF-A3 generation, DB access, or env secret reads.",
  ].join("\n");
}

function buildClearanceReportingApprovalGate(options = {}) {
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

  let status = "CLEARANCE_REPORTING_APPROVAL_BLOCKED";
  if (!docsPolicyPassed) {
    status = "CLEARANCE_REPORTING_APPROVAL_POLICY_BLOCKED";
  } else if (approvalPhraseProvided && !approvalPhraseMatched) {
    status = "CLEARANCE_REPORTING_APPROVAL_INVALID_PHRASE";
    blockers.push("BLOCKED_INVALID_APPROVAL_PHRASE");
  } else if (approvalPhraseMatched && !metadataOnlyFlagProvided) {
    status = "CLEARANCE_REPORTING_APPROVAL_METADATA_ONLY_FLAG_REQUIRED";
    blockers.push("BLOCKED_METADATA_ONLY_FLAG_REQUIRED");
  } else if (approvalPhraseMatched && metadataOnlyFlagProvided) {
    status = "CLEARANCE_REPORTING_APPROVAL_RECOGNIZED_BUT_EXECUTION_BLOCKED";
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
    clearanceApprovalPhraseRecognized: approvalPhraseMatched,
    reportingApprovalPhraseRecognized: approvalPhraseMatched,
    clearanceExecuted: false,
    reportingExecuted: false,
    invoiceSubmitted: false,
    noteSubmitted: false,
    zatcaNetworkCallExecuted: false,
    requestBodyCreated: false,
    responseBodyProcessed: false,
    csidUsed: false,
    tokenSecretCertificatePrivateKeyUsed: false,
    signedXmlUsed: false,
    qrUsed: false,
    pdfA3Created: false,
    productionComplianceClaimed: false,
    envSecretsRead: false,
    dbAccessAttempted: false,
    networkAccessAttempted: false,
    fileWritesAttempted: false,
    apiCallAttempted: false,
    sdkInvocationAttempted: false,
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
    nextApprovalBoundary: "ZATCA PDF-A3 approval gate",
    recommendedNextPrompt: "ZATCA PDF-A3 approval gate",
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
    `ZATCA clearance reporting approval gate: ${result.status}`,
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
      status: "CLEARANCE_REPORTING_APPROVAL_INVALID_ARGUMENT",
      environment: ENVIRONMENT,
      metadataOnly: true,
      envSecretsRead: false,
      dbAccessAttempted: false,
      networkAccessAttempted: false,
      fileWritesAttempted: false,
      apiCallAttempted: false,
      sdkInvocationAttempted: false,
      error: error instanceof Error ? error.message : "Invalid argument.",
    };
    io.stderr.write(`${JSON.stringify(payload, null, 2)}\n`);
    return 2;
  }

  if (args.help) {
    io.stdout.write(`${usage()}\n`);
    return 0;
  }

  const result = buildClearanceReportingApprovalGate({
    cwd: process.cwd(),
    gateDoc: args.gateDoc,
    approvalPhrase: args.approvalPhrase,
    metadataOnly: args.metadataOnly,
  });
  io.stdout.write(`${args.json ? JSON.stringify(result, null, 2) : renderText(result)}\n`);
  return args.strict ? 1 : 0;
}

if (require.main === module) {
  process.exitCode = main();
}

module.exports = {
  APPROVAL_PHRASE,
  buildClearanceReportingApprovalGate,
  parseArgs,
};
