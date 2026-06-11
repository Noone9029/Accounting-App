#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");

const GATE_DOC_PATH = "docs/zatca/SIGNING_AND_PHASE2_QR_APPROVAL_GATE.md";
const ENVIRONMENT = "LOCAL_SIGNING_PHASE2_QR_APPROVAL_GATE_METADATA_ONLY";
const APPROVAL_PHRASE =
  "I approve ZATCA signing and Phase 2 QR planning only. No signing execution, no Phase 2 QR generation, no signed XML generation, no signature generation, no private key use, no certificate use, no CSID use, no token or secret use, no SDK signing command execution, no ZATCA network call, no clearance, no reporting, no PDF-A3, no invoice or accounting mutation, no customer-data mutation, and no production compliance are authorized.";

const REQUIRED_SECTIONS = [
  "Purpose",
  "Signing And Phase 2 QR Boundary",
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
  "signing approval phrase recognized: yes/no",
  "Phase 2 QR approval phrase recognized: yes/no",
  "signing executed: no",
  "QR generated: no",
  "signed XML generated: no",
  "signature generated: no",
  "private key used: no",
  "certificate used: no",
  "CSID used: no",
  "ZATCA network call: no",
  "clearance/reporting: no",
  "PDF-A3: no",
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
  "signature value",
  "QR payload",
  "auth header",
  "cookie",
  "portal session data",
  "taxpayer/customer/vendor data",
  "invoice payload/body",
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
];

const REQUIRED_SAFETY_PHRASES = [
  "This phrase does not authorize execution.",
  "Even when the exact approval phrase is recognized, execution remains blocked.",
  "No signing execution is authorized in this lane.",
  "No Phase 2 QR generation is authorized in this lane.",
  "No signed XML or signature generation is authorized in this lane.",
  "No private key, certificate, CSID, token, or secret use is authorized in this lane.",
  "No SDK signing command execution is authorized in this lane.",
  "No ZATCA network call is authorized in this lane.",
  "No clearance/reporting is authorized in this lane.",
  "No PDF-A3 generation is authorized in this lane.",
  "No invoice, accounting, or customer data is mutated in this lane.",
  "Production compliance remains disabled and not claimed.",
];

const DANGEROUS_ALLOWANCES = [
  {
    label: "DANGEROUS_ALLOWANCE_SIGNING_EXECUTION",
    pattern: /signing\s+(?:may|can|should|will|is allowed to)\s+(?:be\s+)?(?:executed|run|performed|enabled)/i,
  },
  {
    label: "DANGEROUS_ALLOWANCE_QR_GENERATION",
    pattern: /(?:phase\s*2\s+)?qr\s+(?:may|can|should|will|is allowed to)\s+(?:be\s+)?(?:generated|created|produced|enabled)/i,
  },
  {
    label: "DANGEROUS_ALLOWANCE_SIGNED_XML_GENERATION",
    pattern: /signed\s+xml\s+(?:may|can|should|will|is allowed to)\s+(?:be\s+)?(?:generated|created|produced|stored|persisted)/i,
  },
  {
    label: "DANGEROUS_ALLOWANCE_SIGNATURE_GENERATION",
    pattern: /signature(?:\s+value)?\s+(?:may|can|should|will|is allowed to)\s+(?:be\s+)?(?:generated|created|produced|stored)/i,
  },
  {
    label: "DANGEROUS_ALLOWANCE_PRIVATE_KEY_USE",
    pattern: /private\s+key\s+(?:may|can|should|will|is allowed to)\s+(?:be\s+)?used/i,
  },
  {
    label: "DANGEROUS_ALLOWANCE_CERTIFICATE_USE",
    pattern: /certificate(?:\s+body)?\s+(?:may|can|should|will|is allowed to)\s+(?:be\s+)?used/i,
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
    label: "DANGEROUS_ALLOWANCE_SDK_SIGNING_INVOCATION",
    pattern: /sdk\s+signing\s+commands?\s+(?:may|can|should|will|are allowed to)\s+(?:be\s+)?(?:executed|run|invoked|called)/i,
  },
  {
    label: "DANGEROUS_ALLOWANCE_ZATCA_NETWORK_CALL",
    pattern: /zatca\s+network\s+calls?\s+(?:may|can|should|will|are allowed to)\s+(?:be\s+)?(?:executed|made|sent|performed)/i,
  },
  {
    label: "DANGEROUS_ALLOWANCE_CLEARANCE_REPORTING",
    pattern: /clearance\/reporting\s+(?:may|can|should|will|is allowed to)\s+(?:be\s+)?(?:executed|enabled|performed)/i,
  },
  {
    label: "DANGEROUS_ALLOWANCE_PDFA3",
    pattern: /pdf-a-?3\s+(?:may|can|should|will|is allowed to)\s+(?:be\s+)?(?:generated|created|enabled)/i,
  },
  {
    label: "DANGEROUS_ALLOWANCE_DATA_MUTATION",
    pattern: /(?:invoice|accounting|customer)\s+data\s+(?:may|can|should|will|is allowed to)\s+(?:be\s+)?mutated/i,
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
    "  node scripts/zatca-signing-phase2-qr-approval-gate.cjs --json",
    "  node scripts/zatca-signing-phase2-qr-approval-gate.cjs --json --strict",
    '  node scripts/zatca-signing-phase2-qr-approval-gate.cjs --json --approval-phrase "<text>" --metadata-only',
    "  node scripts/zatca-signing-phase2-qr-approval-gate.cjs --gate-doc <path> --json",
    "",
    "This guard validates committed policy text only.",
    "It never executes signing, QR generation, signed XML generation, SDK signing commands, network calls, DB access, env secret reads, certificate reads, or private-key reads.",
  ].join("\n");
}

function buildSigningPhase2QrApprovalGate(options = {}) {
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

  let status = "SIGNING_PHASE2_QR_APPROVAL_BLOCKED";
  if (!docsPolicyPassed) {
    status = "SIGNING_PHASE2_QR_APPROVAL_POLICY_BLOCKED";
  } else if (approvalPhraseProvided && !approvalPhraseMatched) {
    status = "SIGNING_PHASE2_QR_APPROVAL_INVALID_PHRASE";
    blockers.push("BLOCKED_INVALID_APPROVAL_PHRASE");
  } else if (approvalPhraseMatched && !metadataOnlyFlagProvided) {
    status = "SIGNING_PHASE2_QR_APPROVAL_METADATA_ONLY_FLAG_REQUIRED";
    blockers.push("BLOCKED_METADATA_ONLY_FLAG_REQUIRED");
  } else if (approvalPhraseMatched && metadataOnlyFlagProvided) {
    status = "SIGNING_PHASE2_QR_APPROVAL_RECOGNIZED_BUT_EXECUTION_BLOCKED";
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
    signingApprovalPhraseRecognized: approvalPhraseMatched,
    phase2QrApprovalPhraseRecognized: approvalPhraseMatched,
    signingExecuted: false,
    qrGenerated: false,
    signedXmlGenerated: false,
    signatureGenerated: false,
    privateKeyUsed: false,
    certificateUsed: false,
    csidUsed: false,
    sdkSigningCommandExecuted: false,
    zatcaNetworkCallExecuted: false,
    clearanceReportingExecuted: false,
    pdfA3Generated: false,
    productionComplianceClaimed: false,
    dataMutationAttempted: false,
    envSecretsRead: false,
    dbAccessAttempted: false,
    networkAccessAttempted: false,
    fileWritesAttempted: false,
    privateKeyReadAttempted: false,
    certificateReadAttempted: false,
    sdkSigningInvocationAttempted: false,
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
    nextApprovalBoundary: "ZATCA clearance reporting approval gate",
    recommendedNextPrompt: "ZATCA clearance reporting approval gate",
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
    `ZATCA signing and Phase 2 QR approval gate: ${result.status}`,
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
      status: "SIGNING_PHASE2_QR_APPROVAL_INVALID_ARGUMENT",
      environment: ENVIRONMENT,
      metadataOnly: true,
      envSecretsRead: false,
      dbAccessAttempted: false,
      networkAccessAttempted: false,
      fileWritesAttempted: false,
      privateKeyReadAttempted: false,
      certificateReadAttempted: false,
      sdkSigningInvocationAttempted: false,
      error: error instanceof Error ? error.message : "Invalid argument.",
    };
    io.stderr.write(`${JSON.stringify(payload, null, 2)}\n`);
    return 2;
  }

  if (args.help) {
    io.stdout.write(`${usage()}\n`);
    return 0;
  }

  const result = buildSigningPhase2QrApprovalGate({
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
  buildSigningPhase2QrApprovalGate,
  parseArgs,
};
