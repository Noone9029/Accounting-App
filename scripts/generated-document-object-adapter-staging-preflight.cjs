#!/usr/bin/env node
"use strict";

const path = require("node:path");

const MODE = "generated-document-object-adapter-staging-preflight";

const ENV_KEYS = {
  ownerApproved: "LEDGERBYTE_GENERATED_DOCUMENT_OBJECT_ADAPTER_OWNER_APPROVED",
  environment: "LEDGERBYTE_GENERATED_DOCUMENT_OBJECT_ADAPTER_PROOF_ENVIRONMENT",
  baseUrl: "LEDGERBYTE_GENERATED_DOCUMENT_OBJECT_ADAPTER_PROOF_BASE_URL",
  proofRunId: "LEDGERBYTE_GENERATED_DOCUMENT_OBJECT_ADAPTER_PROOF_RUN_ID",
  bucket: "LEDGERBYTE_GENERATED_DOCUMENT_OBJECT_ADAPTER_PROOF_BUCKET",
  endpoint: "LEDGERBYTE_GENERATED_DOCUMENT_OBJECT_ADAPTER_PROOF_ENDPOINT",
  databaseUrl: "LEDGERBYTE_GENERATED_DOCUMENT_OBJECT_ADAPTER_PROOF_DATABASE_URL",
  tenantA: "LEDGERBYTE_GENERATED_DOCUMENT_OBJECT_ADAPTER_TENANT_A_ID",
  tenantB: "LEDGERBYTE_GENERATED_DOCUMENT_OBJECT_ADAPTER_TENANT_B_ID",
  proofAllow: "LEDGERBYTE_GENERATED_DOCUMENT_OBJECT_ADAPTER_PROOF_ALLOW",
  stagingAllow: "LEDGERBYTE_GENERATED_DOCUMENT_OBJECT_ADAPTER_STAGING_ALLOW",
  objectStorageAllow: "LEDGERBYTE_GENERATED_DOCUMENT_OBJECT_ADAPTER_OBJECT_STORAGE_ALLOW",
  rollbackConfirmed: "LEDGERBYTE_GENERATED_DOCUMENT_OBJECT_ADAPTER_ROLLBACK_CONFIRMED",
  evidenceCaptureConfirmed: "LEDGERBYTE_GENERATED_DOCUMENT_OBJECT_ADAPTER_EVIDENCE_CAPTURE_CONFIRMED",
  bucketPolicyReviewed: "LEDGERBYTE_GENERATED_DOCUMENT_OBJECT_ADAPTER_BUCKET_POLICY_REVIEWED",
  credentialScopeReviewed: "LEDGERBYTE_GENERATED_DOCUMENT_OBJECT_ADAPTER_CREDENTIAL_SCOPE_REVIEWED",
  noProductionTargetConfirmed: "LEDGERBYTE_GENERATED_DOCUMENT_OBJECT_ADAPTER_NO_PRODUCTION_TARGET_CONFIRMED",
  accessKeyId: "LEDGERBYTE_GENERATED_DOCUMENT_OBJECT_ADAPTER_ACCESS_KEY_ID",
  secretAccessKey: "LEDGERBYTE_GENERATED_DOCUMENT_OBJECT_ADAPTER_SECRET_ACCESS_KEY",
};

const PRODUCTION_LOOKING_PATTERNS = [
  /(^|[.\-_/])prod(?:uction)?($|[.\-_/])/i,
  /(^|[.\-_/])live($|[.\-_/])/i,
  /(^|[.\-_/])customer($|[.\-_/])/i,
  /(^|[.\-_/])customers($|[.\-_/])/i,
  /(^|[.\-_/])main($|[.\-_/])/i,
  /(^|[.\-_/])primary($|[.\-_/])/i,
  /(^|[.\-_/])real($|[.\-_/])/i,
  /(^|[.\-_/])paid($|[.\-_/])/i,
  /ledgerbyte-prod/i,
  /ledgerbyte\.com$/i,
  /supabase\.co.*(?:prod|production|live|customer)/i,
  /vercel\.app.*(?:prod|production|live|customer)/i,
];

const STAGING_LOOKING_PATTERNS = [
  /(^|[.\-_/])stag(?:e|ing)?($|[.\-_/])/i,
  /(^|[.\-_/])test(?:ing)?($|[.\-_/])/i,
  /(^|[.\-_/])proof($|[.\-_/])/i,
  /(^|[.\-_/])sandbox($|[.\-_/])/i,
  /(^|[.\-_/])synthetic($|[.\-_/])/i,
  /ledgerbyte-staging/i,
  /ledgerbyte-proof/i,
];

const LOCAL_LOOKING_PATTERNS = [
  /^local$/i,
  /^localhost$/i,
  /^127\.0\.0\.1$/i,
  /^http:\/\/localhost(?::\d+)?(?:\/|$)/i,
  /^http:\/\/127\.0\.0\.1(?::\d+)?(?:\/|$)/i,
  /(^|[.\-_/])local($|[.\-_/])/i,
];

const REQUIRED_GATE_GROUPS = [
  "approval",
  "environment",
  "credential",
  "bucket",
  "application",
  "data",
  "migration",
  "execution",
  "evidence",
  "rollback",
];

function parseArgs(argv) {
  const parsed = {
    json: false,
    strict: false,
    dryRun: true,
    help: false,
  };

  for (const arg of argv) {
    if (arg === "--json") {
      parsed.json = true;
      continue;
    }
    if (arg === "--strict") {
      parsed.strict = true;
      continue;
    }
    if (arg === "--dry-run") {
      parsed.dryRun = true;
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      parsed.help = true;
      continue;
    }
    if (arg === "--") {
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return parsed;
}

function usage() {
  return [
    "Usage:",
    `  node scripts/${MODE}.cjs --help`,
    `  node scripts/${MODE}.cjs --json --dry-run`,
    `  node scripts/${MODE}.cjs --json --strict --dry-run`,
    "",
    "Local-only generated-document object adapter staging proof preflight.",
    "This helper checks explicit environment gates, target classification, allow flags, tenant ids, rollback, and evidence inputs.",
    "It does not connect to hosted storage, databases, Supabase, Vercel, or providers.",
    "It does not write objects, delete objects, generate signed URLs, mutate hosted/customer data, enable object storage, change schema, or switch runtime storage defaults.",
    "",
    "Required staging env keys:",
    ...Object.entries(ENV_KEYS).map(([name, key]) => `  ${key} (${name})`),
  ].join("\n");
}

function buildGeneratedDocumentObjectAdapterStagingPreflight(options = {}) {
  const environment = options.env || process.env;
  const repoRoot = resolveRepoRoot(options.repoRoot || options.cwd || process.cwd());
  const values = readValues(environment);
  const targetValues = {
    environment: values.environment,
    baseUrl: values.baseUrl,
    bucket: values.bucket,
    endpoint: values.endpoint,
    databaseUrl: values.databaseUrl,
  };
  const environmentClassification = classifyEnvironment(values.environment);
  const targetClassification = classifyCombinedTarget(targetValues);
  const missingGates = [];
  const unsafeGates = [];
  const satisfiedGates = [];
  const warnings = [];
  const errors = [];

  requireGate(values.ownerApproved === "1", "approval: owner/security/storage approval flag is required", missingGates, satisfiedGates);
  requireGate(values.environment.length > 0, "environment: proof environment is required", missingGates, satisfiedGates);
  requireGate(
    environmentClassification === "safe-staging",
    `environment: proof environment must be explicit staging/proof, not ${environmentClassification}`,
    unsafeGates,
    satisfiedGates,
  );
  requireGate(values.bucket.length > 0, "bucket: dedicated staging/proof bucket is required", missingGates, satisfiedGates);
  requireGate(
    classifyTargetValue(values.bucket, "bucket") === "safe-staging",
    `bucket: bucket must be staging/proof-looking, not ${classifyTargetValue(values.bucket, "bucket")}`,
    unsafeGates,
    satisfiedGates,
  );
  if (values.baseUrl.length > 0) {
    requireGate(
      ["safe-staging", "safe-local"].includes(classifyTargetValue(values.baseUrl, "url")),
      `base-url: target URL is ${classifyTargetValue(values.baseUrl, "url")}`,
      unsafeGates,
      satisfiedGates,
    );
  }
  if (values.endpoint.length > 0) {
    requireGate(
      ["safe-staging", "safe-local"].includes(classifyTargetValue(values.endpoint, "endpoint")),
      `endpoint: storage endpoint is ${classifyTargetValue(values.endpoint, "endpoint")}`,
      unsafeGates,
      satisfiedGates,
    );
  }
  if (values.databaseUrl.length > 0) {
    requireGate(
      ["safe-staging", "safe-local"].includes(classifyTargetValue(values.databaseUrl, "databaseUrl")),
      `database-url: database target is ${classifyTargetValue(values.databaseUrl, "databaseUrl")}`,
      unsafeGates,
      satisfiedGates,
    );
  }
  requireGate(values.accessKeyId.length > 0, "credential: access key id presence is required", missingGates, satisfiedGates);
  requireGate(values.secretAccessKey.length > 0, "credential: secret access key presence is required", missingGates, satisfiedGates);
  requireGate(values.credentialScopeReviewed === "1", "credential-scope: credential scope review confirmation is required", missingGates, satisfiedGates);
  requireGate(isValidProofRunId(values.proofRunId), "proofRunId: valid proofRunId is required", missingGates, satisfiedGates);
  requireGate(values.proofAllow === "1", "allow: proof allow flag is required", missingGates, satisfiedGates);
  requireGate(values.stagingAllow === "1", "allow: staging allow flag is required", missingGates, satisfiedGates);
  requireGate(values.objectStorageAllow === "1", "allow: object-storage allow flag is required", missingGates, satisfiedGates);
  requireGate(values.tenantA.length > 0, "tenant-a: synthetic Tenant A id is required", missingGates, satisfiedGates);
  requireGate(values.tenantB.length > 0, "tenant-b: synthetic Tenant B id is required", missingGates, satisfiedGates);
  if (values.tenantA.length > 0 && values.tenantB.length > 0) {
    requireGate(values.tenantA !== values.tenantB, "tenant-distinct: Tenant A and Tenant B must be distinct", unsafeGates, satisfiedGates);
  }
  requireGate(values.bucketPolicyReviewed === "1", "bucket-policy: bucket policy review confirmation is required", missingGates, satisfiedGates);
  requireGate(values.noProductionTargetConfirmed === "1", "no-production-target: no-production-target confirmation is required", missingGates, satisfiedGates);
  requireGate(values.evidenceCaptureConfirmed === "1", "evidence: evidence capture confirmation is required", missingGates, satisfiedGates);
  requireGate(values.rollbackConfirmed === "1", "rollback: rollback confirmation is required", missingGates, satisfiedGates);

  if (targetClassification === "unsafe-production") {
    errors.push("Production-looking targets are refused.");
  }
  if (targetClassification === "ambiguous") {
    warnings.push("Ambiguous targets do not pass strict preflight.");
  }
  if (environmentClassification === "safe-local") {
    unsafeGates.push("environment: local targets are allowed for dry-run classification only, not staging execution preflight.");
  }

  const ready = missingGates.length === 0 && unsafeGates.length === 0;

  return {
    mode: MODE,
    dryRun: true,
    strictMode: Boolean(options.strict),
    repoRoot,
    networkEnabled: false,
    mutationEnabled: false,
    mutationAllowed: false,
    executionAllowed: ready,
    stagingProofReady: ready,
    hostedObjectStorageTouched: false,
    signedUrlsGenerated: false,
    schemaMigrationRequired: false,
    runtimeDefaultStorage: "database",
    disabledAdapterFailClosed: true,
    fakeLocalAdapterLocalOnly: true,
    realObjectAdapterImplemented: false,
    environmentClassification,
    targetClassification,
    targetDetails: {
      environment: {
        value: redactValue(values.environment, "environment"),
        classification: environmentClassification,
      },
      baseUrl: {
        configured: values.baseUrl.length > 0,
        value: redactValue(values.baseUrl, "baseUrl"),
        classification: values.baseUrl ? classifyTargetValue(values.baseUrl, "url") : "missing",
      },
      bucket: {
        configured: values.bucket.length > 0,
        value: redactValue(values.bucket, "bucket"),
        classification: values.bucket ? classifyTargetValue(values.bucket, "bucket") : "missing",
      },
      endpoint: {
        configured: values.endpoint.length > 0,
        value: redactValue(values.endpoint, "endpoint"),
        classification: values.endpoint ? classifyTargetValue(values.endpoint, "endpoint") : "missing",
      },
      databaseUrl: {
        configured: values.databaseUrl.length > 0,
        value: redactValue(values.databaseUrl, "databaseUrl"),
        classification: values.databaseUrl ? classifyTargetValue(values.databaseUrl, "databaseUrl") : "missing",
      },
    },
    proofRunId: values.proofRunId || null,
    bucket: values.bucket ? redactValue(values.bucket, "bucket") : null,
    tenantAProvided: values.tenantA.length > 0,
    tenantBProvided: values.tenantB.length > 0,
    tenantIdsDistinct: values.tenantA.length > 0 && values.tenantB.length > 0 ? values.tenantA !== values.tenantB : false,
    credentials: {
      accessKeyId: {
        configured: values.accessKeyId.length > 0,
        value: redactValue(values.accessKeyId, "accessKeyId"),
      },
      secretAccessKey: {
        configured: values.secretAccessKey.length > 0,
        value: redactValue(values.secretAccessKey, "secretAccessKey"),
      },
      validatedByPresenceOnly: true,
      networkValidationAttempted: false,
    },
    requiredGates: REQUIRED_GATE_GROUPS,
    missingGates,
    unsafeGates,
    satisfiedGates: Array.from(new Set(satisfiedGates)).sort(),
    warnings,
    errors,
    nextActions: buildNextActions({ missingGates, unsafeGates, ready }),
  };
}

function readValues(environment) {
  return Object.fromEntries(
    Object.entries(ENV_KEYS).map(([name, key]) => [name, String(environment[key] || "").trim()]),
  );
}

function requireGate(condition, message, failureList, satisfiedList) {
  if (condition) {
    satisfiedList.push(message.split(":")[0]);
    return;
  }
  failureList.push(message);
}

function classifyEnvironment(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) {
    return "missing";
  }
  if (matchesAny(normalized, PRODUCTION_LOOKING_PATTERNS)) {
    return "unsafe-production";
  }
  if (["staging", "stage", "proof", "sandbox", "test", "testing"].includes(normalized)) {
    return "safe-staging";
  }
  if (["local", "localhost", "127.0.0.1"].includes(normalized)) {
    return "safe-local";
  }
  return "ambiguous";
}

function classifyTargetValue(value, kind) {
  const normalized = String(value || "").trim();
  if (!normalized) {
    return "missing";
  }
  if (isSecretLikeKind(kind)) {
    return "configured-redacted";
  }
  if (matchesAny(normalized, PRODUCTION_LOOKING_PATTERNS)) {
    return "unsafe-production";
  }
  if (matchesAny(normalized, LOCAL_LOOKING_PATTERNS)) {
    return "safe-local";
  }
  if (matchesAny(normalized, STAGING_LOOKING_PATTERNS)) {
    return "safe-staging";
  }
  return "ambiguous";
}

function classifyCombinedTarget(values) {
  const classifications = [
    classifyEnvironment(values.environment),
    classifyTargetValue(values.baseUrl, "url"),
    classifyTargetValue(values.bucket, "bucket"),
    classifyTargetValue(values.endpoint, "endpoint"),
    classifyTargetValue(values.databaseUrl, "databaseUrl"),
  ].filter((item) => item !== "missing");

  if (classifications.length === 0) {
    return "missing";
  }
  if (classifications.includes("unsafe-production")) {
    return "unsafe-production";
  }
  if (classifications.includes("ambiguous")) {
    return "ambiguous";
  }
  if (classifications.includes("safe-staging")) {
    return "safe-staging";
  }
  if (classifications.every((item) => item === "safe-local")) {
    return "safe-local";
  }
  return "ambiguous";
}

function redactValue(value, kind) {
  if (!value) {
    return null;
  }
  if (isSecretLikeKind(kind)) {
    return "[REDACTED]";
  }
  if (kind === "databaseUrl") {
    return "[REDACTED]";
  }
  return String(value);
}

function isSecretLikeKind(kind) {
  return ["accessKeyId", "secretAccessKey", "token", "password", "secret"].includes(kind);
}

function matchesAny(value, patterns) {
  return patterns.some((pattern) => pattern.test(value));
}

function isValidProofRunId(value) {
  return /^[a-zA-Z0-9][a-zA-Z0-9._:-]{7,127}$/.test(String(value || "").trim());
}

function buildNextActions({ missingGates, unsafeGates, ready }) {
  if (ready) {
    return [
      "Preflight gates are satisfied with local validation only.",
      "A separately approved staging proof runner is still required before any hosted object-storage connection or mutation.",
      "Keep runtime generated-document storage database-backed until a real adapter and staging proof are separately approved.",
    ];
  }

  const actions = [];
  if (missingGates.length > 0) {
    actions.push("Provide the missing explicit preflight inputs using staging/proof-only placeholder values for local validation.");
  }
  if (unsafeGates.length > 0) {
    actions.push("Replace unsafe or ambiguous targets with explicit staging/proof values; production-looking values are refused.");
  }
  actions.push("Do not run hosted object-storage proof until this preflight is clean and separately approved.");
  return actions;
}

function formatResult(result) {
  const lines = [
    `mode: ${result.mode}`,
    `dryRun: ${result.dryRun}`,
    `networkEnabled: ${result.networkEnabled}`,
    `mutationEnabled: ${result.mutationEnabled}`,
    `executionAllowed: ${result.executionAllowed}`,
    `mutationAllowed: ${result.mutationAllowed}`,
    `stagingProofReady: ${result.stagingProofReady}`,
    `environmentClassification: ${result.environmentClassification}`,
    `targetClassification: ${result.targetClassification}`,
    `proofRunId: ${result.proofRunId || "missing"}`,
    `bucket: ${result.bucket || "missing"}`,
    `tenantAProvided: ${result.tenantAProvided}`,
    `tenantBProvided: ${result.tenantBProvided}`,
    `tenantIdsDistinct: ${result.tenantIdsDistinct}`,
  ];

  if (result.missingGates.length > 0) {
    lines.push("", "Missing gates:", ...result.missingGates.map((item) => `- ${item}`));
  }
  if (result.unsafeGates.length > 0) {
    lines.push("", "Unsafe gates:", ...result.unsafeGates.map((item) => `- ${item}`));
  }
  if (result.warnings.length > 0) {
    lines.push("", "Warnings:", ...result.warnings.map((item) => `- ${item}`));
  }
  lines.push("", "Next actions:", ...result.nextActions.map((item) => `- ${item}`));
  return lines.join("\n");
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

  const result = buildGeneratedDocumentObjectAdapterStagingPreflight({
    cwd: process.cwd(),
    env: process.env,
    strict: parsed.strict,
  });

  if (parsed.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(formatResult(result));
  }

  if (parsed.strict && !result.stagingProofReady) {
    process.exitCode = 1;
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  ENV_KEYS,
  MODE,
  REQUIRED_GATE_GROUPS,
  parseArgs,
  usage,
  buildGeneratedDocumentObjectAdapterStagingPreflight,
  classifyEnvironment,
  classifyTargetValue,
  classifyCombinedTarget,
  redactValue,
  formatResult,
};
