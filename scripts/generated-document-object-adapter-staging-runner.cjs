#!/usr/bin/env node
"use strict";

const path = require("node:path");
const {
  ENV_KEYS,
  buildGeneratedDocumentObjectAdapterStagingPreflight,
} = require("./generated-document-object-adapter-staging-preflight.cjs");

const MODE = "generated-document-object-adapter-staging-runner";

const ACTIVE_MODES = new Set(["plan", "preflight", "dry-run"]);
const FUTURE_GATED_MODES = new Set([
  "read-only-check",
  "synthetic-write-plan",
  "synthetic-write-proof",
  "cleanup-plan",
  "cleanup-proof",
  "evidence-summary",
]);
const ALL_MODES = new Set([...ACTIVE_MODES, ...FUTURE_GATED_MODES]);

const RUNNER_STATES = [
  "NOT_READY",
  "PREFLIGHT_FAILED",
  "PREFLIGHT_PASSED",
  "PLAN_READY",
  "READ_ONLY_APPROVED",
  "SYNTHETIC_WRITE_APPROVED",
  "PROOF_RUNNING",
  "PROOF_FAILED",
  "PROOF_CLEANUP_REQUIRED",
  "PROOF_CLEANED_UP",
  "PROOF_EVIDENCE_READY",
];

function parseArgs(argv) {
  const parsed = {
    mode: "plan",
    json: false,
    strict: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") {
      parsed.help = true;
      continue;
    }
    if (arg === "--json") {
      parsed.json = true;
      continue;
    }
    if (arg === "--strict") {
      parsed.strict = true;
      continue;
    }
    if (arg === "--mode") {
      const value = argv[index + 1];
      if (!value) {
        throw new Error("Missing value for --mode");
      }
      parsed.mode = normalizeMode(value);
      index += 1;
      continue;
    }
    if (arg.startsWith("--mode=")) {
      parsed.mode = normalizeMode(arg.slice("--mode=".length));
      continue;
    }
    if (arg === "--dry-run") {
      parsed.mode = "dry-run";
      continue;
    }
    if (arg === "--") {
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!ALL_MODES.has(parsed.mode)) {
    throw new Error(`Unsupported runner mode: ${parsed.mode}`);
  }

  return parsed;
}

function usage() {
  return [
    "Usage:",
    `  node scripts/${MODE}.cjs --help`,
    `  node scripts/${MODE}.cjs --mode plan --json`,
    `  node scripts/${MODE}.cjs --mode dry-run --json --strict`,
    `  node scripts/${MODE}.cjs --mode preflight --json --strict`,
    `  node scripts/${MODE}.cjs --mode read-only-check --json`,
    "",
    "Local-only generated-document object adapter staging proof runner skeleton.",
    "Active modes now: help, plan, preflight, dry-run.",
    "Future modes are blocked placeholders: read-only-check, synthetic-write-plan, synthetic-write-proof, cleanup-plan, cleanup-proof, evidence-summary.",
    "This runner does not connect to hosted storage, connect to a database, write/list/delete objects, generate signed URLs, mutate hosted/customer data, enable object storage, change schema, or switch runtime storage defaults.",
    "",
    "Preflight env keys:",
    ...Object.entries(ENV_KEYS).map(([name, key]) => `  ${key} (${name})`),
  ].join("\n");
}

function buildGeneratedDocumentObjectAdapterStagingRunner(options = {}) {
  const mode = normalizeMode(options.mode || "plan");
  const repoRoot = resolveRepoRoot(options.repoRoot || options.cwd || process.cwd());
  const env = options.env || process.env;
  const preflight = buildGeneratedDocumentObjectAdapterStagingPreflight({
    repoRoot,
    env,
    strict: options.strict,
  });
  const preflightState = preflight.stagingProofReady ? "PREFLIGHT_PASSED" : "PREFLIGHT_FAILED";
  const base = {
    mode: MODE,
    requestedMode: mode,
    strictMode: Boolean(options.strict),
    repoRoot,
    status: "local-runner-design-only",
    currentState: "NOT_READY",
    activeModes: [...ACTIVE_MODES],
    futureGatedModes: [...FUTURE_GATED_MODES],
    runnerStateMachine: RUNNER_STATES,
    networkEnabled: false,
    mutationEnabled: false,
    mutationAllowed: false,
    proofExecuted: false,
    hostedStorageTouched: false,
    signedUrlsGenerated: false,
    databaseTouched: false,
    schemaMigrationRequired: false,
    runtimeDefaultStorage: "database",
    disabledAdapterFailClosed: true,
    fakeLocalAdapterLocalOnly: true,
    realObjectAdapterImplemented: false,
    realObjectStorageEnabled: false,
    hostedObjectStorageProven: false,
    signedUrlSupportImplemented: false,
    secretsRedacted: true,
    preflight,
    safetyBoundaries: [
      "No hosted proof execution.",
      "No hosted object-storage connection.",
      "No hosted/customer data mutation.",
      "No signed URL generation.",
      "No database writes.",
      "No schema or migration changes.",
      "No runtime default switch away from database-backed generated documents.",
    ],
  };

  if (mode === "plan") {
    return {
      ...base,
      status: "PLAN_READY",
      currentState: "PLAN_READY",
      futureExecutionSequence: buildFutureExecutionSequence(),
      approvalsRequired: buildApprovalRequirements(),
      evidenceContract: buildEvidenceContract(),
      rollbackContract: buildRollbackContract(),
      nextActions: [
        "Keep this runner in plan/dry-run/preflight mode until a real object adapter, dedicated staging bucket, synthetic tenants, and written approvals exist.",
        "Run the preflight helper before any future hosted execution design is promoted.",
      ],
    };
  }

  if (mode === "dry-run") {
    return {
      ...base,
      status: "DRY_RUN_ONLY",
      currentState: "PLAN_READY",
      dryRun: true,
      wouldRun: buildFutureExecutionSequence(),
      wouldNotRun: [
        "No bucket reachability probe.",
        "No object list/read/write/delete.",
        "No database read or write.",
        "No signed URL issuance.",
        "No cleanup execution.",
      ],
      nextActions: [
        "Use preflight mode to inspect gate status without hosted connections.",
        "Treat dry-run output as a plan, not evidence that storage isolation is proven.",
      ],
    };
  }

  if (mode === "preflight") {
    return {
      ...base,
      status: preflight.stagingProofReady ? "PREFLIGHT_PASSED_RUNNER_STILL_NOT_READY" : "PREFLIGHT_FAILED",
      currentState: "NOT_READY",
      preflightState,
      runnerProofExecutionReady: false,
      preflightExecutionAllowed: preflight.executionAllowed,
      nextActions: [
        ...(preflight.stagingProofReady
          ? ["Preflight gates are locally clean; hosted proof remains future-gated by this runner skeleton."]
          : ["Resolve missing or unsafe preflight gates before requesting a future staging proof execution sprint."]),
        "Do not connect to hosted object storage from this runner skeleton.",
      ],
    };
  }

  return {
    ...base,
    status: "FUTURE_GATED_NOT_IMPLEMENTED",
    currentState: "NOT_READY",
    blockedMode: mode,
    blockedReason: `${mode} is intentionally not implemented in this runner-design pass.`,
    requiredBeforeActivation: [
      "real generated-document object adapter implementation",
      "approved staging/proof credentials",
      "dedicated staging bucket",
      "synthetic Tenant A/B ids",
      "proofRunId",
      "rollback plan",
      "evidence capture approval",
      "owner/security/accounting/legal sign-off",
    ],
    nextActions: [
      "Open a separate approval sprint before implementing this mode.",
      "Keep runtime generated-document storage database-backed.",
    ],
  };
}

function buildFutureExecutionSequence() {
  return [
    "plan",
    "preflight",
    "dry-run",
    "read-only-check after separate approval",
    "synthetic-write-plan after separate approval",
    "synthetic-write-proof after real adapter and mutation approval",
    "cleanup-plan proofRunId-scoped only",
    "cleanup-proof after separate approval",
    "evidence-summary with redacted metadata only",
  ];
}

function buildApprovalRequirements() {
  return [
    "owner/security/storage approval",
    "staging/proof-only target confirmation",
    "credential scope review",
    "bucket policy review",
    "synthetic tenant approval",
    "rollback approval",
    "metadata-only evidence approval",
    "schema/migration approval if future adapter metadata requires it",
  ];
}

function buildEvidenceContract() {
  return {
    redactsSecrets: true,
    requiredFields: [
      "proofRunId",
      "command",
      "mode",
      "target classification",
      "redacted object keys",
      "hash checks",
      "size checks",
      "tenant isolation result",
      "cleanup result",
      "blockers",
    ],
    forbiddenFields: [
      "database URLs",
      "auth headers",
      "cookies",
      "access keys",
      "secret keys",
      "signed URLs",
      "document bodies",
      "contentBase64",
      "provider payload bodies",
      "customer identifiers",
    ],
  };
}

function buildRollbackContract() {
  return {
    cleanupScope: "proofRunId-only",
    broadCleanupAllowed: false,
    databaseDefaultMustRemain: "database",
    objectWritesMustBeProofRunScoped: true,
    deleteDatabaseContentBeforeRestoreProofAllowed: false,
  };
}

function formatResult(result) {
  const lines = [
    `mode: ${result.mode}`,
    `requestedMode: ${result.requestedMode}`,
    `status: ${result.status}`,
    `currentState: ${result.currentState}`,
    `networkEnabled: ${result.networkEnabled}`,
    `mutationEnabled: ${result.mutationEnabled}`,
    `mutationAllowed: ${result.mutationAllowed}`,
    `proofExecuted: ${result.proofExecuted}`,
    `hostedStorageTouched: ${result.hostedStorageTouched}`,
    `signedUrlsGenerated: ${result.signedUrlsGenerated}`,
    `runtimeDefaultStorage: ${result.runtimeDefaultStorage}`,
  ];
  if (result.blockedReason) {
    lines.push(`blockedReason: ${result.blockedReason}`);
  }
  if (result.preflight) {
    lines.push(`preflightStagingProofReady: ${result.preflight.stagingProofReady}`);
    lines.push(`preflightTargetClassification: ${result.preflight.targetClassification}`);
  }
  if (result.nextActions?.length) {
    lines.push("", "Next actions:", ...result.nextActions.map((item) => `- ${item}`));
  }
  return lines.join("\n");
}

function normalizeMode(value) {
  return String(value || "").trim().toLowerCase();
}

function resolveRepoRoot(start) {
  let current = path.resolve(start);
  while (true) {
    try {
      require("node:fs").accessSync(path.join(current, "package.json"));
      return current;
    } catch (_error) {
      const parent = path.dirname(current);
      if (parent === current) {
        return path.resolve(start);
      }
      current = parent;
    }
  }
}

function main() {
  let parsed;
  try {
    parsed = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
    return;
  }

  if (parsed.help) {
    console.log(usage());
    return;
  }

  const result = buildGeneratedDocumentObjectAdapterStagingRunner({
    cwd: process.cwd(),
    env: process.env,
    mode: parsed.mode,
    strict: parsed.strict,
  });

  if (parsed.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(formatResult(result));
  }

  if (parsed.strict && parsed.mode === "preflight" && result.status === "PREFLIGHT_FAILED") {
    process.exitCode = 1;
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  MODE,
  ACTIVE_MODES,
  FUTURE_GATED_MODES,
  RUNNER_STATES,
  parseArgs,
  usage,
  buildGeneratedDocumentObjectAdapterStagingRunner,
  buildFutureExecutionSequence,
  buildEvidenceContract,
  buildRollbackContract,
  formatResult,
};
