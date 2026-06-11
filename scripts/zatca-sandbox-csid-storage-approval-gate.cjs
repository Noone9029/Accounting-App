#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");

const GATE_DOC_PATH = "docs/zatca/SANDBOX_CSID_STORAGE_APPROVAL_GATE.md";
const ENVIRONMENT = "LOCAL_SANDBOX_CSID_STORAGE_APPROVAL_GATE_METADATA_ONLY";
const APPROVAL_PHRASE =
  "I approve ZATCA sandbox CSID storage planning only. No real OTP, no CSID request, no request body creation, no sandbox network request execution, no adapter execution, no response body processing, no response custody, no custody provider execution, no CSID storage, no binary security token storage, no CSID secret storage, no certificate storage, no private key storage, no CSR storage, no database write, no secret manager write, no KMS write, no HSM write, no object storage write, no backup write, no log write, no docs write, no screenshots, no signing, no clearance, no reporting, no PDF-A3, and no production compliance are authorized.";

const REQUIRED_SECTIONS = [
  "Purpose",
  "Sandbox CSID Storage Boundary",
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
  "approval phrase recognized: yes/no",
  "custody provider selected: yes/no",
  "custody provider approved: yes/no",
  "custody provider executed: no",
  "CSID stored: no",
  "binary security token stored: no",
  "CSID secret stored: no",
  "certificate stored: no",
  "private key stored: no",
  "CSR stored: no",
  "database write executed: no",
  "secret manager write executed: no",
  "KMS write executed: no",
  "HSM write executed: no",
  "object storage write executed: no",
  "backup write executed: no",
  "network request executed: no",
  "adapter executed: no",
  "request body created: no",
  "response body processed: no",
  "response custody stored: no",
  "real OTP included: no",
  "CSID requested: no",
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
  "CSID secret",
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
  "provider credential",
  "endpoint credential or API key",
  "secret-manager payload",
  "database payload",
  "KMS payload",
  "HSM payload",
  "object-storage payload",
  "backup payload",
];

const REQUIRED_APPROVAL_LADDER = [
  "sandbox access confirmation",
  "manual OTP capture approval metadata",
  "request body creation approval metadata",
  "real sandbox network request approval metadata",
  "response processing approval metadata",
  "response custody approval metadata",
  "sandbox CSID storage by approved custody provider",
];

const REQUIRED_SAFETY_PHRASES = [
  "This phrase does not authorize execution.",
  "Even when the exact approval phrase is recognized, execution remains blocked.",
  "No CSID storage is authorized in this lane.",
  "No binary security token, CSID secret, certificate, private key, or CSR storage is authorized in this lane.",
  "No custody provider execution is authorized in this lane.",
  "No database, secret-manager, KMS, HSM, object-storage, backup, log, docs, or screenshot writes are authorized in this lane.",
  "No response body processing or response custody is authorized in this lane.",
  "Sandbox network request execution remains blocked in this lane.",
  "Adapter execution remains blocked in this lane.",
  "Request body creation remains blocked in this lane.",
  "Production compliance remains disabled and not claimed.",
];

const DANGEROUS_ALLOWANCES = [
  {
    label: "DANGEROUS_ALLOWANCE_CSID_STORAGE",
    pattern: /csid\s+(?:may|can|should|will|is allowed to)\s+(?:be\s+)?stored/i,
  },
  {
    label: "DANGEROUS_ALLOWANCE_BINARY_SECURITY_TOKEN_STORAGE",
    pattern: /binary\s+security\s+token\s+(?:may|can|should|will|is allowed to)\s+(?:be\s+)?stored/i,
  },
  {
    label: "DANGEROUS_ALLOWANCE_CSID_SECRET_STORAGE",
    pattern: /csid\s+secret\s+(?:may|can|should|will|is allowed to)\s+(?:be\s+)?stored/i,
  },
  {
    label: "DANGEROUS_ALLOWANCE_CERTIFICATE_STORAGE",
    pattern: /certificate(?:\s+body)?\s+(?:may|can|should|will|is allowed to)\s+(?:be\s+)?stored/i,
  },
  {
    label: "DANGEROUS_ALLOWANCE_PRIVATE_KEY_STORAGE",
    pattern: /private\s+key\s+(?:may|can|should|will|is allowed to)\s+(?:be\s+)?stored/i,
  },
  {
    label: "DANGEROUS_ALLOWANCE_CSR_STORAGE",
    pattern: /csr(?:\s+body)?\s+(?:may|can|should|will|is allowed to)\s+(?:be\s+)?stored/i,
  },
  {
    label: "DANGEROUS_ALLOWANCE_CUSTODY_PROVIDER_EXECUTION",
    pattern: /custody\s+provider\s+(?:may|can|should|will|is allowed to)\s+(?:be\s+)?(?:executed|run|used|enabled)/i,
  },
  {
    label: "DANGEROUS_ALLOWANCE_RESPONSE_CUSTODY",
    pattern: /response\s+(?:body\s+)?custody\s+(?:may|can|should|will|is allowed to)\s+(?:be\s+)?(?:stored|persisted|executed|enabled)/i,
  },
  {
    label: "DANGEROUS_ALLOWANCE_RESPONSE_PROCESSING",
    pattern: /response\s+b(?:ody|odies)\s+(?:may|can|should|will|are allowed to)\s+(?:be\s+)?(?:parsed|transformed|validated|sanitized|processed)/i,
  },
  {
    label: "DANGEROUS_ALLOWANCE_NETWORK_REQUEST_EXECUTION",
    pattern: /(?:real\s+)?sandbox\s+network\s+requests?\s+(?:may|can|should|will|are allowed to)\s+(?:be\s+)?(?:executed|made|sent|performed|submitted)/i,
  },
  {
    label: "DANGEROUS_ALLOWANCE_ADAPTER_EXECUTION",
    pattern: /adapter\s+execution\s+(?:may|can|should|will|is allowed to)\s+(?:be\s+)?(?:run|executed|performed|enabled)/i,
  },
  {
    label: "DANGEROUS_ALLOWANCE_REQUEST_BODY_CREATION",
    pattern: /(?:real\s+)?request\s+b(?:ody|odies)\s+(?:may|can|should|will|are allowed to)\s+(?:be\s+)?(?:created|generated|built|printed|persisted|transmitted|inspected)/i,
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
    label: "DANGEROUS_ALLOWANCE_DB_WRITE",
    pattern: /database\s+writes?\s+(?:may|can|should|will|are allowed to)\s+(?:be\s+)?(?:executed|performed|written|enabled)/i,
  },
  {
    label: "DANGEROUS_ALLOWANCE_SECRET_MANAGER_WRITE",
    pattern: /secret\s+manager\s+writes?\s+(?:may|can|should|will|are allowed to)\s+(?:be\s+)?(?:executed|performed|written|enabled)/i,
  },
  {
    label: "DANGEROUS_ALLOWANCE_KMS_WRITE",
    pattern: /kms\s+writes?\s+(?:may|can|should|will|are allowed to)\s+(?:be\s+)?(?:executed|performed|written|enabled)/i,
  },
  {
    label: "DANGEROUS_ALLOWANCE_HSM_WRITE",
    pattern: /hsm\s+writes?\s+(?:may|can|should|will|are allowed to)\s+(?:be\s+)?(?:executed|performed|written|enabled)/i,
  },
  {
    label: "DANGEROUS_ALLOWANCE_OBJECT_STORAGE_WRITE",
    pattern: /object\s+storage\s+writes?\s+(?:may|can|should|will|are allowed to)\s+(?:be\s+)?(?:executed|performed|written|enabled)/i,
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
    "  node scripts/zatca-sandbox-csid-storage-approval-gate.cjs --json",
    "  node scripts/zatca-sandbox-csid-storage-approval-gate.cjs --json --strict",
    '  node scripts/zatca-sandbox-csid-storage-approval-gate.cjs --json --approval-phrase "<text>" --metadata-only',
    "  node scripts/zatca-sandbox-csid-storage-approval-gate.cjs --gate-doc <path> --json",
    "",
    "This guard validates committed policy text only.",
    "It never stores CSID material, executes custody providers, writes to databases, secret managers, KMS, HSM, or object storage, executes adapters, sends network requests, reads env secrets, or writes files beyond normal terminal output.",
  ].join("\n");
}

function buildSandboxCsidStorageApprovalGate(options = {}) {
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

  let status = "SANDBOX_CSID_STORAGE_APPROVAL_BLOCKED";
  if (!docsPolicyPassed) {
    status = "SANDBOX_CSID_STORAGE_APPROVAL_POLICY_BLOCKED";
  } else if (approvalPhraseProvided && !approvalPhraseMatched) {
    status = "SANDBOX_CSID_STORAGE_APPROVAL_INVALID_PHRASE";
    blockers.push("BLOCKED_INVALID_APPROVAL_PHRASE");
  } else if (approvalPhraseMatched && !metadataOnlyFlagProvided) {
    status = "SANDBOX_CSID_STORAGE_APPROVAL_METADATA_ONLY_FLAG_REQUIRED";
    blockers.push("BLOCKED_METADATA_ONLY_FLAG_REQUIRED");
  } else if (approvalPhraseMatched && metadataOnlyFlagProvided) {
    status = "SANDBOX_CSID_STORAGE_APPROVAL_RECOGNIZED_BUT_EXECUTION_BLOCKED";
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
    csidStorageAuthorizedNow: false,
    envSecretsRead: false,
    dbAccessAttempted: false,
    networkAccessAttempted: false,
    fileWritesAttempted: false,
    secretManagerAccessAttempted: false,
    kmsAccessAttempted: false,
    hsmAccessAttempted: false,
    objectStorageAccessAttempted: false,
    approvalPhraseRecognized: approvalPhraseMatched,
    custodyProviderSelected: false,
    custodyProviderApproved: false,
    custodyProviderExecuted: false,
    csidStored: false,
    binarySecurityTokenStored: false,
    csidSecretStored: false,
    certificateStored: false,
    privateKeyStored: false,
    csrStored: false,
    databaseWriteExecuted: false,
    secretManagerWriteExecuted: false,
    kmsWriteExecuted: false,
    hsmWriteExecuted: false,
    objectStorageWriteExecuted: false,
    backupWriteExecuted: false,
    networkRequestExecuted: false,
    adapterExecuted: false,
    requestBodyCreated: false,
    responseBodyProcessed: false,
    responseCustodyStored: false,
    realOtpIncluded: false,
    csidRequested: false,
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
    nextApprovalBoundary: "ZATCA signing and Phase 2 QR approval gate",
    recommendedNextPrompt: "ZATCA signing and Phase 2 QR approval gate",
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
    `ZATCA sandbox CSID storage approval gate: ${result.status}`,
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
      status: "SANDBOX_CSID_STORAGE_APPROVAL_INVALID_ARGUMENT",
      environment: ENVIRONMENT,
      metadataOnly: true,
      envSecretsRead: false,
      dbAccessAttempted: false,
      networkAccessAttempted: false,
      secretManagerAccessAttempted: false,
      kmsAccessAttempted: false,
      hsmAccessAttempted: false,
      objectStorageAccessAttempted: false,
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

  const result = buildSandboxCsidStorageApprovalGate({
    cwd: process.cwd(),
    gateDoc: args.gateDoc,
    approvalPhrase: args.approvalPhrase,
    metadataOnly: args.metadataOnly,
  });
  io.stdout.write(`${args.json ? JSON.stringify(result, null, 2) : renderText(result)}\n`);
  return args.strict && result.status !== "SANDBOX_CSID_STORAGE_APPROVAL_RECOGNIZED_BUT_EXECUTION_BLOCKED" ? 1 : args.strict ? 1 : 0;
}

if (require.main === module) {
  process.exitCode = main();
}

module.exports = {
  APPROVAL_PHRASE,
  buildSandboxCsidStorageApprovalGate,
  parseArgs,
};
