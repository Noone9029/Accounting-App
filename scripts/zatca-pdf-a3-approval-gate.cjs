#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");

const GATE_DOC_PATH = "docs/zatca/PDF_A3_APPROVAL_GATE.md";
const ENVIRONMENT = "LOCAL_PDF_A3_APPROVAL_GATE_METADATA_ONLY";
const APPROVAL_PHRASE =
  "I approve ZATCA PDF-A3 planning only. No PDF-A3 generation, no XML generation, no XML attachment, no signed XML embedding, no invoice archive creation, no invoice PDF body handling, no XML body handling, no PDF library invocation, no file persistence, no object-storage write, no database or document-store write, no signing, no QR generation, no ZATCA network call, no clearance, no reporting, no invoice or accounting mutation, no customer-data read, and no production compliance are authorized.";

const REQUIRED_SECTIONS = [
  "Purpose",
  "PDF-A3 Boundary",
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
  "PDF-A3 approval phrase recognized: yes/no",
  "PDF-A3 generated: no",
  "XML embedded: no",
  "signed XML embedded: no",
  "file persisted: no",
  "object storage write: no",
  "DB/document write: no",
  "invoice/customer data read: no",
  "ZATCA network call: no",
  "clearance/reporting: no",
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
  "invoice PDF body",
  "XML body",
  "signed XML",
  "QR payload",
  "auth header",
  "cookie",
  "portal session data",
  "taxpayer/customer/vendor data",
  "invoice payload/body",
  "object-storage payload",
  "database payload",
  "document-store payload",
  "archive payload",
  "backup payload",
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
  "production compliance launch gate",
];

const REQUIRED_SAFETY_PHRASES = [
  "This phrase does not authorize execution.",
  "Even when the exact approval phrase is recognized, execution remains blocked.",
  "No PDF-A3 generation is authorized in this lane.",
  "No XML embedding or signed XML embedding is authorized in this lane.",
  "No invoice archive file creation or file persistence is authorized in this lane.",
  "No invoice PDF or XML body handling is authorized in this lane.",
  "No PDF library invocation, object-storage write, database write, or document-store write is authorized in this lane.",
  "No signing, QR generation, ZATCA network call, or clearance/reporting is authorized in this lane.",
  "No invoice, accounting, or customer data is mutated or read in this lane.",
  "Production compliance remains disabled and not claimed.",
];

const DANGEROUS_ALLOWANCES = [
  {
    label: "DANGEROUS_ALLOWANCE_PDFA3_GENERATION",
    pattern: /pdf-a-?3\s+(?:may|can|should|will|is allowed to)\s+(?:be\s+)?(?:generated|created|produced|enabled)/i,
  },
  {
    label: "DANGEROUS_ALLOWANCE_XML_EMBEDDING",
    pattern: /xml\s+(?:may|can|should|will|is allowed to)\s+(?:be\s+)?(?:embedded|attached|included)/i,
  },
  {
    label: "DANGEROUS_ALLOWANCE_SIGNED_XML_EMBEDDING",
    pattern: /signed\s+xml\s+(?:may|can|should|will|is allowed to)\s+(?:be\s+)?(?:embedded|attached|included|handled)/i,
  },
  {
    label: "DANGEROUS_ALLOWANCE_ARCHIVE_CREATION",
    pattern: /invoice\s+archive\s+(?:files?\s+)?(?:may|can|should|will|are allowed to)\s+(?:be\s+)?(?:created|generated|persisted|stored)/i,
  },
  {
    label: "DANGEROUS_ALLOWANCE_PDF_BODY_HANDLING",
    pattern: /invoice\s+pdf\s+bodies?\s+(?:may|can|should|will|are allowed to)\s+(?:be\s+)?(?:read|written|handled|stored|persisted)/i,
  },
  {
    label: "DANGEROUS_ALLOWANCE_XML_BODY_HANDLING",
    pattern: /xml\s+bodies?\s+(?:may|can|should|will|are allowed to)\s+(?:be\s+)?(?:read|written|handled|stored|persisted)/i,
  },
  {
    label: "DANGEROUS_ALLOWANCE_PDF_LIBRARY_INVOCATION",
    pattern: /pdf\s+libraries?\s+(?:may|can|should|will|are allowed to)\s+(?:be\s+)?(?:called|invoked|used)/i,
  },
  {
    label: "DANGEROUS_ALLOWANCE_FILE_PERSISTENCE",
    pattern: /files?\s+(?:may|can|should|will|are allowed to)\s+(?:be\s+)?(?:persisted|stored|written|archived|backed up)/i,
  },
  {
    label: "DANGEROUS_ALLOWANCE_OBJECT_STORAGE",
    pattern: /object-?storage\s+writes?\s+(?:may|can|should|will|are allowed to)\s+(?:be\s+)?(?:executed|performed|made)/i,
  },
  {
    label: "DANGEROUS_ALLOWANCE_DB_DOCUMENT_WRITE",
    pattern: /(?:database|db|document-?store)\s+writes?\s+(?:may|can|should|will|are allowed to)\s+(?:be\s+)?(?:executed|performed|made)/i,
  },
  {
    label: "DANGEROUS_ALLOWANCE_SIGNING",
    pattern: /signing\s+(?:may|can|should|will|is allowed to)\s+(?:be\s+)?(?:executed|run|performed|enabled)/i,
  },
  {
    label: "DANGEROUS_ALLOWANCE_QR_GENERATION",
    pattern: /qr\s+(?:may|can|should|will|is allowed to)\s+(?:be\s+)?(?:generated|created|produced|enabled)/i,
  },
  {
    label: "DANGEROUS_ALLOWANCE_ZATCA_NETWORK",
    pattern: /zatca\s+(?:network\s+calls?|api\s+calls?)\s+(?:may|can|should|will|are allowed to)\s+(?:be\s+)?(?:executed|made|sent|performed)/i,
  },
  {
    label: "DANGEROUS_ALLOWANCE_CLEARANCE_REPORTING",
    pattern: /clearance\/reporting\s+(?:may|can|should|will|is allowed to)\s+(?:be\s+)?(?:executed|enabled|performed)/i,
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
    "  node scripts/zatca-pdf-a3-approval-gate.cjs --json",
    "  node scripts/zatca-pdf-a3-approval-gate.cjs --json --strict",
    '  node scripts/zatca-pdf-a3-approval-gate.cjs --json --approval-phrase "<text>" --metadata-only',
    "  node scripts/zatca-pdf-a3-approval-gate.cjs --gate-doc <path> --json",
    "",
    "This guard validates committed policy text only.",
    "It never generates PDF-A3, embeds XML, handles PDF/XML bodies, calls PDF libraries, persists files, accesses object storage, writes documents, runs signing, generates QR, or calls ZATCA.",
  ].join("\n");
}

function buildPdfA3ApprovalGate(options = {}) {
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

  let status = "PDF_A3_APPROVAL_BLOCKED";
  if (!docsPolicyPassed) {
    status = "PDF_A3_APPROVAL_POLICY_BLOCKED";
  } else if (approvalPhraseProvided && !approvalPhraseMatched) {
    status = "PDF_A3_APPROVAL_INVALID_PHRASE";
    blockers.push("BLOCKED_INVALID_APPROVAL_PHRASE");
  } else if (approvalPhraseMatched && !metadataOnlyFlagProvided) {
    status = "PDF_A3_APPROVAL_METADATA_ONLY_FLAG_REQUIRED";
    blockers.push("BLOCKED_METADATA_ONLY_FLAG_REQUIRED");
  } else if (approvalPhraseMatched && metadataOnlyFlagProvided) {
    status = "PDF_A3_APPROVAL_RECOGNIZED_BUT_EXECUTION_BLOCKED";
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
    pdfA3ApprovalPhraseRecognized: approvalPhraseMatched,
    pdfA3Generated: false,
    xmlEmbedded: false,
    signedXmlEmbedded: false,
    filePersisted: false,
    objectStorageWriteExecuted: false,
    dbDocumentWriteExecuted: false,
    invoiceCustomerDataRead: false,
    zatcaNetworkCallExecuted: false,
    clearanceReportingExecuted: false,
    productionComplianceClaimed: false,
    envSecretsRead: false,
    dbAccessAttempted: false,
    networkAccessAttempted: false,
    fileWritesAttempted: false,
    pdfLibraryInvocationAttempted: false,
    objectStorageAccessAttempted: false,
    documentStoreAccessAttempted: false,
    sdkInvocationAttempted: false,
    signingAttempted: false,
    qrGenerationAttempted: false,
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
    nextApprovalBoundary: "ZATCA production compliance launch gate",
    recommendedNextPrompt: "ZATCA production compliance launch gate",
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
    `ZATCA PDF-A3 approval gate: ${result.status}`,
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
      status: "PDF_A3_APPROVAL_INVALID_ARGUMENT",
      environment: ENVIRONMENT,
      metadataOnly: true,
      envSecretsRead: false,
      dbAccessAttempted: false,
      networkAccessAttempted: false,
      fileWritesAttempted: false,
      pdfLibraryInvocationAttempted: false,
      objectStorageAccessAttempted: false,
      documentStoreAccessAttempted: false,
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

  const result = buildPdfA3ApprovalGate({
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
  buildPdfA3ApprovalGate,
  parseArgs,
};
