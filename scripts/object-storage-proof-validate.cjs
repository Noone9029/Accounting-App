#!/usr/bin/env node
"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const http = require("node:http");
const https = require("node:https");
const net = require("node:net");
const os = require("node:os");
const path = require("node:path");
const tls = require("node:tls");

const STATUS_DRY_RUN_READY = "OBJECT_STORAGE_PROOF_DRY_RUN_READY";
const STATUS_MOCK_CYCLE_PASSED = "OBJECT_STORAGE_MOCK_CYCLE_PASSED";
const STATUS_S3_CONFIG_VALIDATED_NO_NETWORK = "OBJECT_STORAGE_S3_CONFIG_VALIDATED_NO_NETWORK";
const STATUS_BLOCKED_MISSING_CONFIG = "OBJECT_STORAGE_PROOF_BLOCKED_MISSING_CONFIG";
const STATUS_BLOCKED_UNSAFE_MODE = "OBJECT_STORAGE_PROOF_BLOCKED_UNSAFE_MODE";

const DEFAULT_ATTACHMENT_MAX_SIZE_MB = 10;
const SUPPORTED_PROVIDERS = ["local", "s3-compatible"];
const REQUIRED_S3_KEYS = ["S3_ENDPOINT", "S3_REGION", "S3_BUCKET", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY"];
const SAMPLE_ORGANIZATION_ID = "00000000-0000-0000-0000-000000000001";
const SAMPLE_ATTACHMENT_ID = "attachment-proof";
const SAMPLE_GENERATED_DOCUMENT_ID = "generated-document-proof";
const SAMPLE_GENERATED_DOCUMENT_SOURCE_ID = "sales-invoice-proof";
const SAMPLE_ATTACHMENT_FILENAME = "Quarterly Attachment (proof).txt";
const SAMPLE_GENERATED_DOCUMENT_FILENAME = "Sales Invoice 1001 (proof).pdf";
const ATTACHMENT_SAMPLE_CONTENT_TYPE = "text/plain";
const GENERATED_DOCUMENT_SAMPLE_CONTENT_TYPE = "application/pdf";
const ATTACHMENT_SAMPLE_BUFFER = Buffer.from("LedgerByte object-storage proof attachment. Synthetic only.\n", "utf8");
const GENERATED_DOCUMENT_SAMPLE_BUFFER = Buffer.from("%PDF-1.4\n% LedgerByte generated-document proof only.\n", "utf8");
const SUPPORTED_OBJECT_KEY_TYPES = new Set(["attachments", "generated-documents", "archives"]);

const PRODUCTION_LOOKING_PATTERNS = [
  /(^|[.\-_/])prod(?:uction)?($|[.\-_/])/i,
  /(^|[.\-_/])live($|[.\-_/])/i,
  /(^|[.\-_/])customer($|[.\-_/])/i,
  /(^|[.\-_/])customers($|[.\-_/])/i,
  /ledgerbyte\.com$/i,
];

const STAGING_LOOKING_PATTERNS = [
  /(^|[.\-_/])stag(?:e|ing)?($|[.\-_/])/i,
  /(^|[.\-_/])proof($|[.\-_/])/i,
  /(^|[.\-_/])test($|[.\-_/])/i,
  /(^|[.\-_/])sandbox($|[.\-_/])/i,
];

function parseArgs(argv) {
  const parsed = {
    json: false,
    strict: false,
    dryRun: false,
    mockCycle: false,
    provider: null,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
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
    if (arg === "--mock-cycle") {
      parsed.mockCycle = true;
      continue;
    }
    if (arg === "--provider") {
      const value = argv[index + 1];
      if (!value) {
        throw new Error("Missing value for --provider");
      }
      parsed.provider = normalizeProofProvider(value);
      index += 1;
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

  if (!parsed.mockCycle && !parsed.dryRun) {
    parsed.dryRun = true;
  }

  return parsed;
}

function usage() {
  return [
    "Usage:",
    "  node scripts/object-storage-proof-validate.cjs --json --strict --dry-run",
    "  node scripts/object-storage-proof-validate.cjs --json --strict --mock-cycle --provider local",
    "  node scripts/object-storage-proof-validate.cjs --json --strict --dry-run --provider s3-compatible",
    "",
    "This validator is safe and non-production by default.",
    "It does not connect to object storage, create buckets, upload real files, download real files, delete real objects,",
    "or print secret values. The only write-capable mode is --mock-cycle with --provider local, which uses a temporary",
    "local directory and synthetic non-customer payloads only.",
  ].join("\n");
}

function buildObjectStorageProof(options = {}) {
  const repoRoot = resolveRepoRoot(options.repoRoot || options.cwd || process.cwd());
  const environment = options.env || process.env;
  const parsed = {
    json: Boolean(options.json),
    strict: Boolean(options.strict),
    dryRun: Boolean(options.dryRun),
    mockCycle: Boolean(options.mockCycle),
    provider: options.provider ? normalizeProofProvider(options.provider) : null,
  };

  const selectedProvider =
    parsed.provider ?? (normalizeConfiguredProvider(environment.ATTACHMENT_STORAGE_PROVIDER) === "s3-compatible" ? "s3-compatible" : "local");
  const mode = parsed.mockCycle ? "mock-cycle" : "dry-run";
  const repoSurface = detectRepoSurface(repoRoot);
  const pathPolicy = buildPathPolicy();
  const sizeLimitValidation = buildSizeLimitValidation(environment);
  const s3ConfigValidation = buildS3ConfigValidation(environment);
  const signedUrlProofPlan = buildSignedUrlProofPlan({
    environment: environment.LEDGERBYTE_STORAGE_PROOF_ENVIRONMENT || "local",
    proofRunId: environment.LEDGERBYTE_STORAGE_PROOF_RUN_ID || "",
    allow: environment.LEDGERBYTE_STORAGE_PROOF_ALLOW,
    stagingAllow: environment.LEDGERBYTE_STORAGE_PROOF_STAGING_ALLOW,
    bucket: environment.S3_BUCKET || "",
    endpoint: environment.S3_ENDPOINT || "",
  });
  const networkGuard = installNetworkGuards();

  const baseResult = {
    status: STATUS_DRY_RUN_READY,
    strictMode: parsed.strict,
    mode,
    selectedProvider,
    repoRoot,
    repoSurface,
    currentStorageProviders: {
      attachmentProvider: normalizeConfiguredProvider(environment.ATTACHMENT_STORAGE_PROVIDER),
      generatedDocumentProvider: normalizeConfiguredProvider(environment.GENERATED_DOCUMENT_STORAGE_PROVIDER),
    },
    providerSelection: {
      selectedProvider,
      supportedProviders: [...SUPPORTED_PROVIDERS],
      mockCycleAllowed: selectedProvider === "local",
    },
    pathPolicy,
    contentTypeHandling: {
      attachment: ATTACHMENT_SAMPLE_CONTENT_TYPE,
      generatedDocument: GENERATED_DOCUMENT_SAMPLE_CONTENT_TYPE,
      validated: true,
    },
    sizeLimitValidation,
    signedUrlCapability: {
      implemented: false,
      realSignedUrlsGenerated: false,
      status: "not_proven",
      note: "The current storage groundwork does not implement signed URL generation.",
    },
    signedUrlProofPlan,
    generatedDocumentObjectStorageContract: buildGeneratedDocumentObjectStorageContract(),
    generatedDocumentStorageAdapterInterface: buildGeneratedDocumentStorageAdapterInterface(repoSurface),
    generatedDocumentObjectAdapterStagingProofGates: buildGeneratedDocumentObjectAdapterStagingProofGates({
      repoRoot,
      environment,
    }),
    lifecycleRetention: {
      implemented: false,
      status: "not_proven",
      note: "Lifecycle, retention, legal hold, and immutable-archive controls are not proven by this validator.",
    },
    s3CompatibleConfig: s3ConfigValidation,
    networkGuardsInstalled: true,
    networkAccessAttempted: false,
    fileWritesAttempted: false,
    writesScopedToTempDirectory: false,
    secretValuesPrinted: false,
    operations: {
      uploaded: false,
      downloaded: false,
      deleted: false,
      cleanupVerified: false,
    },
    blockers: [],
    warnings: [],
    notes: [
      "Generated documents remain database-backed in the current runtime implementation.",
      "Attachment S3 support exists as groundwork only; this validator does not connect to any real object store.",
      "Validation output reports configuration by key name only and never returns secret values.",
    ],
  };

  try {
    if (!SUPPORTED_PROVIDERS.includes(selectedProvider)) {
      baseResult.status = STATUS_BLOCKED_UNSAFE_MODE;
      baseResult.blockers.push(`Unsupported provider: ${selectedProvider}`);
      return finalizeResult(baseResult);
    }

    if (parsed.mockCycle && selectedProvider !== "local") {
      baseResult.status = STATUS_BLOCKED_UNSAFE_MODE;
      baseResult.blockers.push("Mock-cycle mode is allowed only with --provider local.");
      return finalizeResult(baseResult);
    }

    if (parsed.mockCycle) {
      const cycle = runLocalMockCycle();
      baseResult.status = STATUS_MOCK_CYCLE_PASSED;
      baseResult.fileWritesAttempted = true;
      baseResult.writesScopedToTempDirectory = true;
      baseResult.operations = cycle.operations;
      baseResult.mockCycle = cycle;
      return finalizeResult(baseResult);
    }

    if (selectedProvider === "s3-compatible") {
      if (s3ConfigValidation.missingKeys.length > 0) {
        baseResult.status = STATUS_BLOCKED_MISSING_CONFIG;
        baseResult.blockers.push(`Missing required S3-compatible config keys: ${s3ConfigValidation.missingKeys.join(", ")}`);
        return finalizeResult(baseResult);
      }
      baseResult.status = STATUS_S3_CONFIG_VALIDATED_NO_NETWORK;
      baseResult.warnings.push("S3-compatible provider validation is configuration-only. No network call or object lifecycle proof was attempted.");
      return finalizeResult(baseResult);
    }

    baseResult.status = STATUS_DRY_RUN_READY;
    baseResult.warnings.push("Dry-run mode validates provider selection, key policy, content-type policy, and safety posture only.");
    return finalizeResult(baseResult);
  } finally {
    networkGuard.restore();
  }
}

function buildPathPolicy() {
  const attachment = {
    filename: SAMPLE_ATTACHMENT_FILENAME,
    sanitizedFilename: sanitizeFilename(SAMPLE_ATTACHMENT_FILENAME),
    objectKey: buildAttachmentObjectKey({
      organizationId: SAMPLE_ORGANIZATION_ID,
      attachmentId: SAMPLE_ATTACHMENT_ID,
      filename: SAMPLE_ATTACHMENT_FILENAME,
    }),
    tenantScoped: true,
    domain: "attachments",
  };
  const generatedDocument = {
    filename: SAMPLE_GENERATED_DOCUMENT_FILENAME,
    sanitizedFilename: sanitizeFilename(SAMPLE_GENERATED_DOCUMENT_FILENAME),
    objectKey: buildGeneratedDocumentObjectKey({
      organizationId: SAMPLE_ORGANIZATION_ID,
      generatedDocumentId: SAMPLE_GENERATED_DOCUMENT_ID,
      sourceType: "sales-invoice",
      sourceId: SAMPLE_GENERATED_DOCUMENT_SOURCE_ID,
      documentType: "SALES_INVOICE",
      filename: SAMPLE_GENERATED_DOCUMENT_FILENAME,
    }),
    tenantScoped: true,
    domain: "generated-documents",
    currentRuntimeStorage: "database",
    futureProviderProofOnly: true,
  };

  return {
    attachment,
    generatedDocument,
    archive: {
      exampleObjectKey: buildArchiveObjectKey({
        organizationId: SAMPLE_ORGANIZATION_ID,
        archiveId: "archive-proof",
        filename: "Archive Export (proof).zip",
      }),
      futureProviderProofOnly: true,
    },
    distinctDomains: attachment.domain !== generatedDocument.domain,
    objectKeyPolicyChecks: [
      validateObjectKeyPolicy(attachment.objectKey, SAMPLE_ORGANIZATION_ID),
      validateObjectKeyPolicy(generatedDocument.objectKey, SAMPLE_ORGANIZATION_ID),
    ],
  };
}

function buildGeneratedDocumentObjectStorageContract() {
  return {
    currentRuntimeStorage: "database",
    objectStorageEnabled: false,
    hostedObjectStorageTouched: false,
    realSignedUrlsGenerated: false,
    schemaMigrationRequired: false,
    metadataRequired: [
      "organizationId",
      "generatedDocumentId",
      "sourceType",
      "sourceId",
      "documentType",
      "mimeType",
      "fileName",
      "storageBackend",
      "objectKey",
      "sha256",
      "contentLength",
    ],
    objectKey: {
      example: buildGeneratedDocumentObjectKey({
        organizationId: SAMPLE_ORGANIZATION_ID,
        generatedDocumentId: SAMPLE_GENERATED_DOCUMENT_ID,
        sourceType: "sales-invoice",
        sourceId: SAMPLE_GENERATED_DOCUMENT_SOURCE_ID,
        documentType: "SALES_INVOICE",
        filename: SAMPLE_GENERATED_DOCUMENT_FILENAME,
      }),
      requiresTenantPrefix: true,
      requiresObjectTypePrefix: true,
      requiresGeneratedDocumentId: true,
      normalizedFilenameRequired: true,
      acceptsUserControlledKey: false,
      globalFlatPathAllowed: false,
      customerSensitiveDataInKeyAllowed: false,
      providerSecretInKeyAllowed: false,
    },
    authorization: {
      requestByGeneratedDocumentIdOnly: true,
      authorizeBeforeObjectKeyResolution: true,
      authorizeBeforeSignedUrlGeneration: true,
      requireOrganizationMembership: true,
      requirePermissionCheck: true,
      requireSourceRecordOwnership: true,
      directObjectKeyInputAllowed: false,
      unauthorizedErrorsMayExposeObjectKey: false,
    },
    hashIntegrity: {
      sha256Required: true,
      contentLengthRequired: true,
      mimeTypeRequired: true,
      generationTimestampRequired: true,
      restoreVerificationRequired: true,
    },
    migration: {
      stagingFirstRequired: true,
      hashEquivalenceRequired: true,
      dualReadOrFeatureFlagRequired: true,
      rollbackToDatabaseContentRequired: true,
      deleteDatabaseContentBeforeRestoreProofAllowed: false,
      backupRestoreProofRequired: true,
    },
    editionSafety: {
      genericActiveComplianceClaimsAllowed: false,
      futureKsaArtifactsEditionGated: true,
      futureUaeArtifactsEditionGated: true,
      providerNeutralArtifactsRequired: true,
    },
    implementationPlan: buildGeneratedDocumentObjectStorageImplementationPlan(),
  };
}

function buildGeneratedDocumentObjectStorageImplementationPlan() {
  return {
    currentBehaviorPreserved: true,
    objectStorageDisabledByDefault: true,
    dbBackedFallbackRequired: true,
    signedUrlsRequiredForInitialImplementation: false,
    objectKeyAnchor: "generatedDocumentId",
    objectKeyExample: buildGeneratedDocumentObjectKey({
      organizationId: SAMPLE_ORGANIZATION_ID,
      generatedDocumentId: SAMPLE_GENERATED_DOCUMENT_ID,
      sourceType: "sales-invoice",
      sourceId: SAMPLE_GENERATED_DOCUMENT_SOURCE_ID,
      documentType: "SALES_INVOICE",
      filename: SAMPLE_GENERATED_DOCUMENT_FILENAME,
    }),
    featureFlags: [
      {
        name: "LEDGERBYTE_GENERATED_DOCUMENT_OBJECT_STORAGE_ENABLED",
        default: "disabled",
        purpose: "Allow object-backed writes only after local and staging proof.",
      },
      {
        name: "LEDGERBYTE_GENERATED_DOCUMENT_OBJECT_STORAGE_DRY_RUN",
        default: "enabled for planning/proof only",
        purpose: "Exercise key and metadata decisions without writing hosted objects.",
      },
      {
        name: "LEDGERBYTE_GENERATED_DOCUMENT_DUAL_WRITE_ENABLED",
        default: "disabled",
        purpose: "Allow staging dual-write rehearsal while keeping database content.",
      },
      {
        name: "LEDGERBYTE_GENERATED_DOCUMENT_OBJECT_READ_ENABLED",
        default: "disabled",
        purpose: "Allow staged object reads only after write/hash proof.",
      },
    ],
    metadataDecision: {
      existingFields: ["organizationId", "id", "sourceType", "sourceId", "documentType", "filename", "mimeType", "storageProvider", "storageKey", "contentHash", "sizeBytes", "contentBase64", "status", "generatedById", "generatedAt"],
      futureMigrationFields: [
        "bucket or logicalBucket",
        "retentionClass",
        "archiveState",
        "legalHold",
        "generationVersion",
        "sourceSnapshotHash",
        "objectUploadedAt",
        "objectVerifiedAt",
      ],
      migrationImplementationIncluded: false,
      explicitApprovalRequiredForMigration: true,
    },
    phases: [
      "Phase A: local interface and adapter design only.",
      "Phase B: generated-document storage interface with database adapter as default.",
      "Phase C: fake local object-storage adapter for tests only.",
      "Phase D: object-storage adapter behind disabled feature flag.",
      "Phase E: metadata migration decision and explicit approval if fields are required.",
      "Phase F: staging proof with synthetic tenants and dedicated bucket.",
      "Phase G: backfill rehearsal from database content to object storage.",
      "Phase H: signed URLs only if required and after proof.",
      "Phase I: production rollout after backup/restore, retention, legal hold, malware scan, and owner approval.",
    ],
    adapterContract: {
      requiredMethods: [
        "writeGeneratedDocument",
        "readGeneratedDocument",
        "verifyGeneratedDocumentHash",
        "deriveGeneratedDocumentObjectKey",
        "getGeneratedDocumentMetadata",
        "migrateGeneratedDocumentToObjectStorage",
        "restoreGeneratedDocumentFromObjectStorage",
      ],
      deleteMethodAllowedOnlyAfterRetentionReview: true,
      databaseAdapterDefault: true,
      fakeAdapterLocalTestsOnly: true,
      s3AdapterFutureDisabledByDefault: true,
    },
    rollbackRequirements: {
      keepDatabaseContentThroughProof: true,
      dualWriteStagingOnly: true,
      objectReadStagingOnly: true,
      hashMismatchBlocksCutover: true,
      fallbackToDatabaseRequired: true,
      cleanupProofRunScopedOnly: true,
    },
    stagingProofRequirements: {
      syntheticTenantsRequired: true,
      dedicatedBucketRequired: true,
      customerDataAllowed: false,
      hostedStorageMutationAllowedByThisValidator: false,
      bucketPolicyProofRequired: true,
      backupRestoreProofRequired: true,
    },
  };
}

function buildGeneratedDocumentStorageAdapterInterface(repoSurface) {
  return {
    interfaceDetected: repoSurface.generatedDocumentStorageAdapterInterfaceDetected,
    databaseAdapterDetected: repoSurface.generatedDocumentDatabaseStorageAdapterDetected,
    disabledObjectAdapterDetected: repoSurface.generatedDocumentDisabledObjectAdapterDetected,
    selectorDetected: repoSurface.generatedDocumentStorageAdapterSelectorDetected,
    fakeLocalObjectAdapterDetected: repoSurface.generatedDocumentFakeLocalObjectAdapterDetected,
    serviceUsesAdapterBoundary: repoSurface.generatedDocumentServiceUsesAdapterBoundary,
    moduleRegistersDatabaseAdapterDefault: repoSurface.generatedDocumentModuleRegistersDatabaseAdapterDefault,
    defaultRuntimeStorage: "database",
    explicitObjectModeSelection: repoSurface.generatedDocumentDisabledObjectAdapterDetected ? "disabled-adapter" : "not-implemented",
    unknownModeBehavior: repoSurface.generatedDocumentStorageAdapterSelectorDetected ? "fail-closed" : "not-implemented",
    objectStorageEnabledByDefault: false,
    hostedObjectStorageTouched: false,
    realSignedUrlsGenerated: false,
    fakeAdapterRuntimeRegistered: false,
    fakeAdapterLocalTestsOnly: true,
    fakeLocalSelectionRequiresSafeEnvironment: repoSurface.generatedDocumentFakeLocalSelectionRequiresSafeEnvironment,
    fakeLocalProofStatus: repoSurface.generatedDocumentFakeLocalObjectAdapterDetected ? "local-test-only" : "not-implemented",
    realObjectAdapterImplemented: false,
    schemaMigrationRequired: false,
    notes: [
      "Generated-document storage now has a local adapter boundary.",
      "The Nest module registers the database adapter as the generated-document runtime default.",
      "Explicit object-storage selection resolves to a disabled generated-document adapter that throws before reads or writes.",
      "The fake local object adapter is exported for tests, requires explicit local/test selection, and is not registered for production runtime selection.",
      "Unknown generated-document storage adapter modes fail closed.",
      "This validator does not enable generated-document object storage or signed URLs.",
    ],
  };
}

function buildGeneratedDocumentObjectAdapterStagingProofGates(options = {}) {
  const environment = options.environment || process.env;
  const repoRoot = resolveRepoRoot(options.repoRoot || options.cwd || process.cwd());
  const gatesDocumentPath = path.join(repoRoot, "docs", "storage", "GENERATED_DOCUMENT_OBJECT_ADAPTER_STAGING_PROOF_GATES.md");
  const runnerDesignDocumentPath = path.join(repoRoot, "docs", "storage", "GENERATED_DOCUMENT_OBJECT_ADAPTER_STAGING_PROOF_RUNNER_DESIGN.md");
  const preflightHelperPath = path.join(repoRoot, "scripts", "generated-document-object-adapter-staging-preflight.cjs");
  const preflightHelperTestPath = path.join(repoRoot, "scripts", "generated-document-object-adapter-staging-preflight.test.cjs");
  const runnerHelperPath = path.join(repoRoot, "scripts", "generated-document-object-adapter-staging-runner.cjs");
  const runnerHelperTestPath = path.join(repoRoot, "scripts", "generated-document-object-adapter-staging-runner.test.cjs");
  const proofRunId = String(environment.LEDGERBYTE_GENERATED_DOCUMENT_OBJECT_ADAPTER_PROOF_RUN_ID || "").trim();
  const targetEnvironment = normalizeProofEnvironment(
    environment.LEDGERBYTE_GENERATED_DOCUMENT_OBJECT_ADAPTER_PROOF_ENVIRONMENT ||
      environment.LEDGERBYTE_STORAGE_PROOF_ENVIRONMENT ||
      "local",
  );
  const bucket = String(environment.LEDGERBYTE_GENERATED_DOCUMENT_OBJECT_ADAPTER_PROOF_BUCKET || environment.S3_BUCKET || "").trim();
  const endpoint = String(environment.LEDGERBYTE_GENERATED_DOCUMENT_OBJECT_ADAPTER_PROOF_ENDPOINT || environment.S3_ENDPOINT || "").trim();
  const databaseUrl = String(environment.LEDGERBYTE_GENERATED_DOCUMENT_OBJECT_ADAPTER_PROOF_DATABASE_URL || environment.DATABASE_URL || "").trim();
  const allow = environment.LEDGERBYTE_GENERATED_DOCUMENT_OBJECT_ADAPTER_PROOF_ALLOW;
  const stagingAllow = environment.LEDGERBYTE_GENERATED_DOCUMENT_OBJECT_ADAPTER_STAGING_ALLOW;
  const tenantA = String(environment.LEDGERBYTE_GENERATED_DOCUMENT_OBJECT_ADAPTER_TENANT_A_ID || "").trim();
  const tenantB = String(environment.LEDGERBYTE_GENERATED_DOCUMENT_OBJECT_ADAPTER_TENANT_B_ID || "").trim();
  const bucketProductionLooking = isProductionLookingTarget(bucket) || isProductionLookingTarget(endpoint);
  const databaseProductionLooking = isProductionLookingTarget(databaseUrl);
  const environmentProductionLooking = targetEnvironment === "production";
  const productionLooking = bucketProductionLooking || databaseProductionLooking || environmentProductionLooking;
  const approvalProvided = environment.LEDGERBYTE_GENERATED_DOCUMENT_OBJECT_ADAPTER_OWNER_APPROVED === "1";
  const credentialPresenceOnly =
    hasConfiguredValue(environment.LEDGERBYTE_GENERATED_DOCUMENT_OBJECT_ADAPTER_ACCESS_KEY_ID) &&
    hasConfiguredValue(environment.LEDGERBYTE_GENERATED_DOCUMENT_OBJECT_ADAPTER_SECRET_ACCESS_KEY);

  const blockers = [
    ...(approvalProvided ? [] : ["Missing explicit owner/security/storage approval evidence."]),
    ...(targetEnvironment === "staging" ? [] : ["Generated-document object adapter proof target is not classified as staging/proof."]),
    ...(hasConfiguredValue(bucket) ? [] : ["Missing dedicated staging/proof bucket name."]),
    ...(bucketProductionLooking ? ["Bucket or endpoint is production-looking and refused."] : []),
    ...(databaseProductionLooking ? ["Database URL is production-looking and refused."] : []),
    ...(environmentProductionLooking ? ["Production environment is refused for generated-document object adapter proof."] : []),
    ...(credentialPresenceOnly ? [] : ["Missing staging-only object-storage credential presence."]),
    ...(isValidProofRunId(proofRunId) ? [] : ["Missing or invalid proofRunId."]),
    ...(allow === "1" && stagingAllow === "1" ? [] : ["Missing explicit generated-document object adapter staging allow flags."]),
    ...(hasConfiguredValue(tenantA) && hasConfiguredValue(tenantB) ? [] : ["Missing synthetic Tenant A/B identifiers."]),
  ];

  return {
    generatedDocumentObjectAdapterStagingGatesDocumented: fs.existsSync(gatesDocumentPath),
    generatedDocumentObjectAdapterStagingRunnerDesignDocumented: fs.existsSync(runnerDesignDocumentPath),
    generatedDocumentObjectAdapterStagingRunnerHelperDetected: fs.existsSync(runnerHelperPath),
    generatedDocumentObjectAdapterStagingRunnerTestsDetected: fs.existsSync(runnerHelperTestPath),
    generatedDocumentObjectAdapterStagingRunnerStillLocalOnly: true,
    generatedDocumentObjectAdapterStagingRunnerProofExecutionReady: false,
    generatedDocumentObjectAdapterStagingPreflightHelperDetected: fs.existsSync(preflightHelperPath),
    generatedDocumentObjectAdapterStagingPreflightHelperTestsDetected: fs.existsSync(preflightHelperTestPath),
    generatedDocumentObjectAdapterStagingPreflightStillLocalOnly: true,
    generatedDocumentObjectAdapterStagingProofRequiresDedicatedBucket: true,
    generatedDocumentObjectAdapterStagingProofRequiresSyntheticTenants: true,
    generatedDocumentObjectAdapterStagingProofRequiresProofRunId: true,
    generatedDocumentObjectAdapterStagingProofRequiresExplicitAllowFlags: true,
    generatedDocumentObjectAdapterStagingProofRequiresNoProductionTargets: true,
    generatedDocumentObjectAdapterStagingProofRequiresRollbackPlan: true,
    generatedDocumentObjectAdapterStagingProofReady: false,
    status: "blocked_until_all_gates_pass",
    networkEnabled: false,
    mutationEnabled: false,
    hostedObjectStorageTouched: false,
    realObjectAdapterImplemented: false,
    realSignedUrlsGenerated: false,
    schemaMigrationRequired: false,
    targetClassification: {
      environment: targetEnvironment,
      stagingLooking: targetEnvironment === "staging" || STAGING_LOOKING_PATTERNS.some((pattern) => pattern.test([bucket, endpoint].join(" "))),
      productionLooking,
      bucketProductionLooking,
      databaseProductionLooking,
      environmentProductionLooking,
    },
    requiredApprovals: {
      ownerApprovalRequired: true,
      securityApprovalRequired: true,
      storageOwnerApprovalRequired: true,
      accountingLegalReviewRequiredForComplianceArtifacts: true,
      productionExcluded: true,
    },
    requiredInputs: {
      proofRunIdRequired: true,
      dedicatedStagingBucketRequired: true,
      stagingOnlyCredentialsRequired: true,
      syntheticTenantARequired: true,
      syntheticTenantBRequired: true,
      dryRunFirstRequired: true,
      readOnlyValidationFirstRequired: true,
      rollbackPlanRequired: true,
    },
    refusedOperations: {
      hostedNetworkCallsByThisValidator: true,
      hostedObjectMutationByThisValidator: true,
      productionTargets: true,
      customerData: true,
      signedUrlGeneration: true,
      schemaOrMigrationChanges: true,
      broadCleanup: true,
    },
    evidenceRequirements: [
      "approval evidence",
      "proofRunId",
      "dedicated staging bucket",
      "synthetic Tenant A/B ids",
      "redacted object keys",
      "hash and size verification",
      "tenant isolation result",
      "proofRunId-scoped cleanup result",
      "rollback confirmation",
      "secret-free logs",
    ],
    blockers,
    notes: [
      "This local validator only reports staging gate status. It does not connect to hosted object storage.",
      "The generated-document object adapter staging preflight helper is local-only and does not execute staging proof.",
      "Generated-document object adapter staging proof remains blocked until every required gate is satisfied.",
      "The generated-document object adapter staging runner skeleton is local-only and does not execute hosted proof.",
      "Production rollout remains blocked after staging proof until backup/restore, retention/legal-hold, observability, and owner approvals are complete.",
    ],
  };
}

function buildSignedUrlProofPlan(options = {}) {
  const environment = normalizeProofEnvironment(options.environment);
  const proofRunId = String(options.proofRunId || "").trim();
  const bucket = String(options.bucket || "").trim();
  const endpoint = String(options.endpoint || "").trim();
  const refusedReasons = [];
  const warnings = [];
  const proofRunIdValid = isValidProofRunId(proofRunId);
  const targetText = `${bucket} ${endpoint}`;
  const productionLooking = PRODUCTION_LOOKING_PATTERNS.some((pattern) => pattern.test(targetText));
  const stagingLooking = STAGING_LOOKING_PATTERNS.some((pattern) => pattern.test(targetText));
  const executionMode = environment === "staging" ? "staging-plan" : environment === "production" ? "production-refused-plan" : "local-plan";

  if (environment === "staging") {
    if (options.allow !== "1") {
      refusedReasons.push("Set LEDGERBYTE_STORAGE_PROOF_ALLOW=1 before staging signed URL/object-storage proof planning.");
    }
    if (options.stagingAllow !== "1") {
      refusedReasons.push("Set LEDGERBYTE_STORAGE_PROOF_STAGING_ALLOW=1 before staging signed URL/object-storage proof planning.");
    }
    if (!proofRunIdValid) {
      refusedReasons.push("Provide a proofRunId of 8-128 characters using letters, numbers, dot, dash, underscore, or colon.");
    }
    if (!stagingLooking) {
      refusedReasons.push("Staging signed URL proof requires a staging, sandbox, test, or dedicated proof bucket/endpoint.");
    }
  }

  if (environment === "production") {
    refusedReasons.push("Production signed URL/object-storage proof is refused by this local harness.");
  }
  if (productionLooking) {
    refusedReasons.push("Bucket or endpoint is production-looking; this harness refuses production-looking storage targets.");
  }
  if (environment === "local" && !proofRunIdValid) {
    warnings.push("Local dry-run did not receive a proofRunId; staging proof modes remain blocked until one is supplied.");
  }

  return {
    safety: refusedReasons.length > 0 ? "refused" : "ready-for-plan",
    executionMode,
    environment,
    proofRunId: proofRunId || null,
    networkRequired: environment === "staging",
    mutationRequired: environment === "staging",
    networkEnabled: false,
    mutationEnabled: false,
    cleanupScope: proofRunIdValid ? "proofRunId-only" : "blocked",
    realSignedUrlsGenerated: false,
    hostedObjectStorageTouched: false,
    productionLooking,
    stagingLooking,
    refusedReasons,
    warnings,
    authorizationContract: {
      authorizeBeforeUrl: true,
      requireOrganizationMembership: true,
      requirePermissionCheck: true,
      requireSourceRecordOwnership: true,
      attachmentOwnershipRequired: true,
      generatedDocumentOwnershipRequired: true,
      archiveOwnershipRequired: true,
      acceptDirectObjectKeyInput: false,
      resolveObjectKeyFromAuthorizedMetadata: true,
    },
    urlShapeRequirements: {
      shortTtlRequired: true,
      downloadOnlyPreferred: true,
      publicBucketAssumptionAllowed: false,
      secretsInLogsAllowed: false,
      unauthorizedErrorsMayExposeObjectKey: false,
      contentDispositionSafetyRequired: true,
      auditContextRequired: ["organizationId", "userId", "proofRunId"],
    },
    proofScenarios: [
      "Tenant A cannot request a signed URL for Tenant B attachment.",
      "Tenant A cannot request a signed URL for Tenant B generated document.",
      "Tenant A cannot request a signed URL for Tenant B archive object.",
      "Tenant A cannot guess an object key and receive a signed URL.",
      "Tenant A cannot use Tenant B source record ID to receive a signed URL.",
      "Read-only users are constrained by permission rules before URL issuance.",
      "Expired URL and stale-permission behavior is documented before hosted proof.",
      "Signed URL issuance is audited before production use.",
    ],
  };
}

function buildSizeLimitValidation(environment) {
  const attachmentMaxSizeMb = normalizeAttachmentMaxSizeMb(environment.ATTACHMENT_MAX_SIZE_MB);
  const attachmentMaxSizeBytes = attachmentMaxSizeMb * 1024 * 1024;
  return {
    attachmentMaxSizeMb,
    attachmentMaxSizeBytes,
    attachmentSampleBytes: ATTACHMENT_SAMPLE_BUFFER.byteLength,
    attachmentSampleWithinLimit: ATTACHMENT_SAMPLE_BUFFER.byteLength <= attachmentMaxSizeBytes,
    oversizedAttachmentRejected: !isWithinSizeLimit(attachmentMaxSizeBytes + 1, attachmentMaxSizeBytes),
  };
}

function buildS3ConfigValidation(environment) {
  const keys = REQUIRED_S3_KEYS.map((name) => ({
    name,
    configured: hasConfiguredValue(environment[name]),
  }));
  return {
    requiredKeys: keys,
    missingKeys: keys.filter((item) => !item.configured).map((item) => item.name),
    validatedByNameOnly: true,
    noNetwork: true,
  };
}

function detectRepoSurface(repoRoot) {
  const attachmentStoragePath = path.join(repoRoot, "apps", "api", "src", "attachments", "attachment-storage.service.ts");
  const generatedDocumentPath = path.join(repoRoot, "apps", "api", "src", "generated-documents", "generated-document.service.ts");
  const generatedDocumentModulePath = path.join(repoRoot, "apps", "api", "src", "generated-documents", "generated-document.module.ts");
  const generatedDocumentStoragePath = path.join(repoRoot, "apps", "api", "src", "generated-documents", "generated-document-storage.ts");
  const providerPath = path.join(repoRoot, "apps", "api", "src", "storage", "storage-provider.ts");

  const attachmentStorageSource = safeReadFile(attachmentStoragePath);
  const generatedDocumentSource = safeReadFile(generatedDocumentPath);
  const generatedDocumentModuleSource = safeReadFile(generatedDocumentModulePath);
  const generatedDocumentStorageSource = safeReadFile(generatedDocumentStoragePath);

  return {
    storageProviderInterfaceDetected: fs.existsSync(providerPath),
    attachmentS3GroundworkDetected:
      attachmentStorageSource.includes("class S3AttachmentStorageService") &&
      attachmentStorageSource.includes("PutObjectCommand") &&
      attachmentStorageSource.includes("GetObjectCommand"),
    generatedDocumentDatabaseDefaultDetected:
      (generatedDocumentSource.includes('storageProvider: "database"') || generatedDocumentStorageSource.includes('storageProvider: "database"')) &&
      generatedDocumentStorageSource.includes("contentBase64") &&
      generatedDocumentModuleSource.includes("useExisting: DatabaseGeneratedDocumentStorageAdapter"),
    generatedDocumentS3WritesImplemented: generatedDocumentSource.includes('storageProvider: "s3"'),
    generatedDocumentStorageAdapterInterfaceDetected:
      generatedDocumentStorageSource.includes("abstract class GeneratedDocumentStorageAdapter") &&
      generatedDocumentStorageSource.includes("writeGeneratedDocumentContent") &&
      generatedDocumentStorageSource.includes("readGeneratedDocumentContent"),
    generatedDocumentDatabaseStorageAdapterDetected: generatedDocumentStorageSource.includes("class DatabaseGeneratedDocumentStorageAdapter"),
    generatedDocumentDisabledObjectAdapterDetected: generatedDocumentStorageSource.includes("class DisabledGeneratedDocumentObjectStorageAdapter"),
    generatedDocumentStorageAdapterSelectorDetected:
      generatedDocumentStorageSource.includes("function createGeneratedDocumentStorageAdapter") &&
      generatedDocumentStorageSource.includes("Unsupported generated-document storage adapter mode"),
    generatedDocumentFakeLocalObjectAdapterDetected: generatedDocumentStorageSource.includes("class FakeLocalGeneratedDocumentObjectStorageAdapter"),
    generatedDocumentFakeLocalSelectionRequiresSafeEnvironment:
      generatedDocumentStorageSource.includes("isLocalTestGeneratedDocumentStorageEnvironment") &&
      generatedDocumentStorageSource.includes("refused for production-looking environments"),
    generatedDocumentServiceUsesAdapterBoundary:
      generatedDocumentSource.includes("writeGeneratedDocumentContent") &&
      generatedDocumentSource.includes("readGeneratedDocumentContent"),
    generatedDocumentModuleRegistersDatabaseAdapterDefault:
      generatedDocumentModuleSource.includes("DatabaseGeneratedDocumentStorageAdapter") &&
      generatedDocumentModuleSource.includes("useExisting: DatabaseGeneratedDocumentStorageAdapter"),
  };
}

function runLocalMockCycle() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ledgerbyte-object-storage-proof-"));
  const provider = new LocalMockObjectStorageProvider(tempRoot);
  const attachmentKey = buildAttachmentObjectKey({
    organizationId: SAMPLE_ORGANIZATION_ID,
    attachmentId: SAMPLE_ATTACHMENT_ID,
    filename: SAMPLE_ATTACHMENT_FILENAME,
  });
  const generatedDocumentKey = buildGeneratedDocumentObjectKey({
    organizationId: SAMPLE_ORGANIZATION_ID,
    generatedDocumentId: SAMPLE_GENERATED_DOCUMENT_ID,
    sourceType: "sales-invoice",
    sourceId: SAMPLE_GENERATED_DOCUMENT_SOURCE_ID,
    documentType: "SALES_INVOICE",
    filename: SAMPLE_GENERATED_DOCUMENT_FILENAME,
  });

  const attachmentWrite = provider.saveObject({
    key: attachmentKey,
    buffer: ATTACHMENT_SAMPLE_BUFFER,
    contentType: ATTACHMENT_SAMPLE_CONTENT_TYPE,
  });
  const generatedDocumentWrite = provider.saveObject({
    key: generatedDocumentKey,
    buffer: GENERATED_DOCUMENT_SAMPLE_BUFFER,
    contentType: GENERATED_DOCUMENT_SAMPLE_CONTENT_TYPE,
  });

  const attachmentRead = provider.getObject({ key: attachmentKey });
  const generatedDocumentRead = provider.getObject({ key: generatedDocumentKey });

  verifyBufferMatch(attachmentRead.buffer, ATTACHMENT_SAMPLE_BUFFER, "attachment");
  verifyBufferMatch(generatedDocumentRead.buffer, GENERATED_DOCUMENT_SAMPLE_BUFFER, "generated-document");

  if (attachmentRead.metadata.contentType !== ATTACHMENT_SAMPLE_CONTENT_TYPE) {
    throw new Error("Attachment content type metadata verification failed.");
  }
  if (generatedDocumentRead.metadata.contentType !== GENERATED_DOCUMENT_SAMPLE_CONTENT_TYPE) {
    throw new Error("Generated document content type metadata verification failed.");
  }

  provider.deleteObject({ key: attachmentKey });
  provider.deleteObject({ key: generatedDocumentKey });

  const attachmentAbsolutePath = path.join(tempRoot, ...attachmentKey.split("/"));
  const generatedDocumentAbsolutePath = path.join(tempRoot, ...generatedDocumentKey.split("/"));
  const attachmentDeleted = !fs.existsSync(attachmentAbsolutePath);
  const generatedDocumentDeleted = !fs.existsSync(generatedDocumentAbsolutePath);
  fs.rmSync(tempRoot, { recursive: true, force: true });
  const tempDirectoryRemoved = !fs.existsSync(tempRoot);

  return {
    tempRoot,
    tempDirectoryRemoved,
    attachment: {
      objectKey: attachmentKey,
      sha256: sha256(ATTACHMENT_SAMPLE_BUFFER),
      bytes: ATTACHMENT_SAMPLE_BUFFER.byteLength,
      contentType: ATTACHMENT_SAMPLE_CONTENT_TYPE,
      deleted: attachmentDeleted,
    },
    generatedDocument: {
      objectKey: generatedDocumentKey,
      sha256: sha256(GENERATED_DOCUMENT_SAMPLE_BUFFER),
      bytes: GENERATED_DOCUMENT_SAMPLE_BUFFER.byteLength,
      contentType: GENERATED_DOCUMENT_SAMPLE_CONTENT_TYPE,
      deleted: generatedDocumentDeleted,
    },
    operations: {
      uploaded: true,
      downloaded: true,
      deleted: attachmentDeleted && generatedDocumentDeleted,
      cleanupVerified: tempDirectoryRemoved,
    },
  };
}

class LocalMockObjectStorageProvider {
  constructor(rootDir) {
    this.rootDir = rootDir;
    this.metadata = new Map();
  }

  saveObject(input) {
    const absolutePath = path.join(this.rootDir, ...input.key.split("/"));
    fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
    fs.writeFileSync(absolutePath, input.buffer);
    this.metadata.set(input.key, {
      contentType: input.contentType,
      sizeBytes: input.buffer.byteLength,
      sha256: sha256(input.buffer),
      absolutePath,
    });
    return {
      key: input.key,
      absolutePath,
      sizeBytes: input.buffer.byteLength,
      sha256: sha256(input.buffer),
    };
  }

  getObject(input) {
    const meta = this.metadata.get(input.key);
    if (!meta) {
      throw new Error(`Missing metadata for ${input.key}`);
    }
    return {
      buffer: fs.readFileSync(meta.absolutePath),
      metadata: meta,
    };
  }

  deleteObject(input) {
    const meta = this.metadata.get(input.key);
    if (!meta) {
      return;
    }
    fs.rmSync(meta.absolutePath, { force: true });
    this.metadata.delete(input.key);
  }
}

function buildAttachmentObjectKey({ organizationId, attachmentId, filename }) {
  return `org/${safeSegment(organizationId)}/attachments/${safeSegment(attachmentId)}/${sanitizeFilename(filename)}`;
}

function buildGeneratedDocumentObjectKey({ organizationId, generatedDocumentId, sourceType, sourceId, documentType, filename }) {
  const documentId = generatedDocumentId || `${sourceType}-${sourceId}-${documentType}`;
  return `org/${safeSegment(organizationId)}/generated-documents/${safeSegment(documentId)}/${sanitizeFilename(filename)}`;
}

function buildArchiveObjectKey({ organizationId, archiveId, filename }) {
  return `org/${safeSegment(organizationId)}/archives/${safeSegment(archiveId)}/${sanitizeFilename(filename)}`;
}

function validateObjectKeyPolicy(objectKey, organizationId) {
  const key = String(objectKey || "");
  const authorizedPrefix = `org/${safeSegment(organizationId)}/`;
  const parts = key.split("/");
  const reasons = [];
  if (!key.startsWith(authorizedPrefix)) {
    reasons.push("Object key does not start with the authorized tenant prefix.");
  }
  if (parts.some((part) => part === ".." || part === ".")) {
    reasons.push("Object key contains a path traversal segment.");
  }
  if (!SUPPORTED_OBJECT_KEY_TYPES.has(parts[2])) {
    reasons.push("Object key is missing a supported object type prefix.");
  }
  if (key.includes("//") || key.startsWith("/") || key.endsWith("/")) {
    reasons.push("Object key has an unsafe slash shape.");
  }
  return {
    valid: reasons.length === 0,
    reasons,
  };
}

function normalizeProofProvider(value) {
  if (!value) {
    return value;
  }
  const normalized = String(value).trim().toLowerCase();
  if (normalized === "s3" || normalized === "s3-compatible" || normalized === "s3_compatible") {
    return "s3-compatible";
  }
  if (normalized === "local") {
    return "local";
  }
  return normalized;
}

function normalizeConfiguredProvider(value) {
  return String(value || "").trim().toLowerCase() === "s3" ? "s3-compatible" : "database";
}

function normalizeProofEnvironment(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "staging" || normalized === "stage" || normalized === "sandbox" || normalized === "test" || normalized === "proof") {
    return "staging";
  }
  if (normalized === "production" || normalized === "prod" || normalized === "live" || normalized === "customer" || normalized === "customers") {
    return "production";
  }
  return "local";
}

function isValidProofRunId(value) {
  return /^[a-zA-Z0-9][a-zA-Z0-9._:-]{7,127}$/.test(value);
}

function isProductionLookingTarget(value) {
  const normalized = String(value || "").trim();
  if (!normalized) {
    return false;
  }
  return PRODUCTION_LOOKING_PATTERNS.some((pattern) => pattern.test(normalized));
}

function normalizeAttachmentMaxSizeMb(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_ATTACHMENT_MAX_SIZE_MB;
}

function isWithinSizeLimit(sizeBytes, limitBytes) {
  return sizeBytes <= limitBytes;
}

function hasConfiguredValue(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function sanitizeFilename(value) {
  const cleaned = String(value || "")
    .trim()
    .replace(/\.\.+/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
  return cleaned || "object.bin";
}

function safeSegment(value) {
  return String(value || "")
    .trim()
    .replace(/\.\.+/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "") || "segment";
}

function sha256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function verifyBufferMatch(actual, expected, label) {
  if (sha256(actual) !== sha256(expected)) {
    throw new Error(`Checksum verification failed for ${label}.`);
  }
  if (!actual.equals(expected)) {
    throw new Error(`Content verification failed for ${label}.`);
  }
}

function resolveRepoRoot(start) {
  let current = path.resolve(start);
  while (true) {
    if (fs.existsSync(path.join(current, "package.json")) || fs.existsSync(path.join(current, ".git"))) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      return path.resolve(start);
    }
    current = parent;
  }
}

function safeReadFile(targetPath) {
  if (!fs.existsSync(targetPath)) {
    return "";
  }
  return fs.readFileSync(targetPath, "utf8");
}

function installNetworkGuards() {
  const original = {
    httpRequest: http.request,
    httpGet: http.get,
    httpsRequest: https.request,
    httpsGet: https.get,
    netConnect: net.connect,
    netCreateConnection: net.createConnection,
    tlsConnect: tls.connect,
    fetch: globalThis.fetch,
  };

  const blocked = () => {
    throw new Error("OBJECT_STORAGE_PROOF_NETWORK_BLOCKED");
  };

  http.request = blocked;
  http.get = blocked;
  https.request = blocked;
  https.get = blocked;
  net.connect = blocked;
  net.createConnection = blocked;
  tls.connect = blocked;
  if (typeof globalThis.fetch === "function") {
    globalThis.fetch = blocked;
  }

  return {
    restore() {
      http.request = original.httpRequest;
      http.get = original.httpGet;
      https.request = original.httpsRequest;
      https.get = original.httpsGet;
      net.connect = original.netConnect;
      net.createConnection = original.netCreateConnection;
      tls.connect = original.tlsConnect;
      if (typeof original.fetch === "function") {
        globalThis.fetch = original.fetch;
      } else {
        delete globalThis.fetch;
      }
    },
  };
}

function finalizeResult(result) {
  if (
    result.status === STATUS_DRY_RUN_READY ||
    result.status === STATUS_BLOCKED_MISSING_CONFIG ||
    result.status === STATUS_BLOCKED_UNSAFE_MODE ||
    result.status === STATUS_S3_CONFIG_VALIDATED_NO_NETWORK
  ) {
    delete result.mockCycle;
  }
  return result;
}

function formatResult(result) {
  const lines = [
    `status: ${result.status}`,
    `mode: ${result.mode}`,
    `provider: ${result.selectedProvider}`,
    `attachmentProviderConfigured: ${result.currentStorageProviders.attachmentProvider}`,
    `generatedDocumentProviderConfigured: ${result.currentStorageProviders.generatedDocumentProvider}`,
    `networkAccessAttempted: ${result.networkAccessAttempted}`,
    `fileWritesAttempted: ${result.fileWritesAttempted}`,
  ];

  if (result.blockers.length > 0) {
    lines.push("", "Blockers:", ...result.blockers.map((item) => `- ${item}`));
  }
  if (result.warnings.length > 0) {
    lines.push("", "Warnings:", ...result.warnings.map((item) => `- ${item}`));
  }
  lines.push(
    "",
    "Path policy:",
    `- Attachment: ${result.pathPolicy.attachment.objectKey}`,
    `- Generated document: ${result.pathPolicy.generatedDocument.objectKey}`,
    "",
    "S3-compatible config validation:",
    `- Missing keys: ${result.s3CompatibleConfig.missingKeys.length === 0 ? "none" : result.s3CompatibleConfig.missingKeys.join(", ")}`,
    `- Validated by key name only: ${result.s3CompatibleConfig.validatedByNameOnly}`,
  );
  return lines.join("\n");
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

  const result = buildObjectStorageProof({
    cwd: process.cwd(),
    env: process.env,
    json: parsed.json,
    strict: parsed.strict,
    dryRun: parsed.dryRun,
    mockCycle: parsed.mockCycle,
    provider: parsed.provider,
  });

  if (parsed.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(formatResult(result));
  }

  if (result.status === STATUS_BLOCKED_MISSING_CONFIG || result.status === STATUS_BLOCKED_UNSAFE_MODE) {
    process.exitCode = 1;
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  STATUS_DRY_RUN_READY,
  STATUS_MOCK_CYCLE_PASSED,
  STATUS_S3_CONFIG_VALIDATED_NO_NETWORK,
  STATUS_BLOCKED_MISSING_CONFIG,
  STATUS_BLOCKED_UNSAFE_MODE,
  REQUIRED_S3_KEYS,
  parseArgs,
  usage,
  buildObjectStorageProof,
  buildAttachmentObjectKey,
  buildGeneratedDocumentObjectKey,
  buildArchiveObjectKey,
  buildGeneratedDocumentObjectStorageContract,
  buildGeneratedDocumentObjectStorageImplementationPlan,
  buildGeneratedDocumentStorageAdapterInterface,
  buildGeneratedDocumentObjectAdapterStagingProofGates,
  buildSignedUrlProofPlan,
  validateObjectKeyPolicy,
  sanitizeFilename,
  normalizeProofProvider,
  normalizeConfiguredProvider,
  normalizeAttachmentMaxSizeMb,
  isWithinSizeLimit,
  runLocalMockCycle,
  detectRepoSurface,
  formatResult,
};
