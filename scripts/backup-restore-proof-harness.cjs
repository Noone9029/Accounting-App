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

const STATUS_DRY_RUN_READY = "BACKUP_RESTORE_PROOF_DRY_RUN_READY";
const STATUS_MOCK_CYCLE_PASSED = "BACKUP_RESTORE_MOCK_CYCLE_PASSED";
const STATUS_BLOCKED_UNSAFE_PATH = "BACKUP_RESTORE_PROOF_BLOCKED_UNSAFE_PATH";
const STATUS_BLOCKED_MISSING_DOCS = "BACKUP_RESTORE_PROOF_BLOCKED_MISSING_DOCS";
const STATUS_BLOCKED_REAL_DATA_REQUESTED = "BACKUP_RESTORE_PROOF_BLOCKED_REAL_DATA_REQUESTED";

const ARTIFACT_TYPE = "ledgerbyte-backup-restore-proof";
const MANIFEST_VERSION = 1;
const MANIFEST_FILENAME = "backup-manifest.json";
const PAYLOAD_FILENAME = "synthetic-backup.payload.json";

const REQUIRED_SURFACES = [
  { path: "README.md", label: "README posture" },
  { path: "docs/BACKUP_AND_RESTORE_READINESS_PLAN.md", label: "backup and restore readiness plan" },
  { path: "docs/production/PRODUCTION_TRUST_FOUNDATION_AUDIT.md", label: "production trust audit" },
  { path: "docs/production/OBJECT_STORAGE_PROOF_PLAN.md", label: "object storage proof plan" },
  { path: "scripts/production-trust-foundation-gate.cjs", label: "production trust static gate" },
  { path: "scripts/object-storage-proof-validate.cjs", label: "object storage proof harness" },
];

const FORBIDDEN_TEXT_PATTERNS = [
  /postgres:\/\//i,
  /supabase\.co/i,
  /service[_-]?role/i,
  /authorization/i,
  /bearer\s+[a-z0-9._-]+/i,
  /secret/i,
  /private\s+key/i,
  /begin\s+certificate/i,
  /customer@/i,
  /vendor@/i,
  /real[-_\s]?data/i,
  /production[-_\s]?data/i,
];

function parseArgs(argv) {
  const parsed = {
    json: false,
    strict: false,
    dryRun: false,
    mockCycle: false,
    artifactDir: null,
    keepArtifacts: false,
    realData: false,
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
    if (arg === "--artifact-dir") {
      const value = argv[index + 1];
      if (!value) {
        throw new Error("Missing value for --artifact-dir");
      }
      parsed.artifactDir = value;
      index += 1;
      continue;
    }
    if (arg === "--keep-artifacts") {
      parsed.keepArtifacts = true;
      continue;
    }
    if (arg === "--real-data") {
      parsed.realData = true;
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

  if (parsed.dryRun && parsed.mockCycle) {
    throw new Error("Choose either --dry-run or --mock-cycle, not both.");
  }

  if (!parsed.dryRun && !parsed.mockCycle) {
    parsed.dryRun = true;
  }

  if (parsed.keepArtifacts && !parsed.mockCycle) {
    throw new Error("--keep-artifacts is allowed only with --mock-cycle.");
  }

  return parsed;
}

function usage() {
  return [
    "Usage:",
    "  node scripts/backup-restore-proof-harness.cjs --json --strict --dry-run",
    "  node scripts/backup-restore-proof-harness.cjs --json --strict --mock-cycle",
    "  node scripts/backup-restore-proof-harness.cjs --json --strict --mock-cycle --artifact-dir <safe-temp-path>",
    "",
    "This harness is synthetic, local, and non-production by default.",
    "It does not connect to databases, object storage, or networks, and it does not read secret env values.",
    "The only write-capable mode is --mock-cycle, which writes a synthetic payload and manifest inside a temp directory only.",
  ].join("\n");
}

function buildBackupRestoreProof(options = {}) {
  const repoRoot = resolveRepoRoot(options.repoRoot || options.cwd || process.cwd());
  const parsed = {
    json: Boolean(options.json),
    strict: Boolean(options.strict),
    dryRun: Boolean(options.dryRun),
    mockCycle: Boolean(options.mockCycle),
    artifactDir: options.artifactDir || null,
    keepArtifacts: Boolean(options.keepArtifacts),
    realData: Boolean(options.realData),
  };
  const networkGuard = installNetworkGuards();
  const repoSurface = detectRepoSurface(repoRoot);
  const artifactDirectory = describeArtifactDirectory(parsed.artifactDir);
  const baseResult = {
    status: STATUS_DRY_RUN_READY,
    strictMode: parsed.strict,
    mode: parsed.mockCycle ? "mock-cycle" : "dry-run",
    repoRoot,
    repoSurface,
    requiredSurfaceSummary: {
      allPresent: repoSurface.missing.length === 0,
      missing: [...repoSurface.missing],
    },
    artifactDirectoryPolicy: artifactDirectory,
    plannedBoundaries: buildPlannedBoundaries(),
    manifestSchema: plannedManifestSchema(),
    syntheticFixtureSummary: buildSyntheticFixtureSummary(),
    mockCycle: null,
    blockers: [],
    warnings: [],
    notes: [
      "This harness uses synthetic metadata only.",
      "No database, Supabase, Prisma, object-storage, or customer-data path is touched.",
      "Dry-run mode validates documentation and proof boundaries only.",
    ],
    networkGuardsInstalled: true,
    networkAccessAttempted: false,
    databaseAccessAttempted: false,
    envSecretReadsAttempted: false,
    fileWritesAttempted: false,
    writesScopedToTempDirectory: false,
    secretValuesPrinted: false,
    realDataRequested: parsed.realData,
  };

  try {
    if (parsed.realData) {
      baseResult.status = STATUS_BLOCKED_REAL_DATA_REQUESTED;
      baseResult.blockers.push("Real data was requested. This harness allows synthetic metadata only.");
      return finalizeResult(baseResult);
    }

    if (artifactDirectory.requested && !artifactDirectory.safe) {
      baseResult.status = STATUS_BLOCKED_UNSAFE_PATH;
      baseResult.blockers.push(`Artifact directory must stay inside the temp root: ${artifactDirectory.tempRoot}`);
      return finalizeResult(baseResult);
    }

    if (repoSurface.missing.length > 0) {
      baseResult.status = STATUS_BLOCKED_MISSING_DOCS;
      baseResult.blockers.push(...repoSurface.missing.map((item) => `Missing required surface: ${item.path}`));
      return finalizeResult(baseResult);
    }

    if (parsed.mockCycle) {
      const cycle = runMockCycle({
        requestedArtifactDir: artifactDirectory.resolvedPath,
        keepArtifacts: parsed.keepArtifacts,
      });
      baseResult.status = STATUS_MOCK_CYCLE_PASSED;
      baseResult.fileWritesAttempted = true;
      baseResult.writesScopedToTempDirectory = true;
      baseResult.mockCycle = cycle;
      return finalizeResult(baseResult);
    }

    baseResult.status = STATUS_DRY_RUN_READY;
    baseResult.warnings.push("Dry-run mode does not create artifacts. It validates proof boundaries and required surfaces only.");
    return finalizeResult(baseResult);
  } finally {
    networkGuard.restore();
  }
}

function detectRepoSurface(repoRoot) {
  const requiredSurfaces = REQUIRED_SURFACES.map((surface) => ({
    ...surface,
    exists: fs.existsSync(path.join(repoRoot, ...surface.path.split("/"))),
  }));
  const missing = requiredSurfaces.filter((item) => !item.exists);
  return {
    requiredSurfaces,
    missing,
    backupReadinessApiCatalogDetected: safeReadFile(path.join(repoRoot, "docs", "API_CATALOG.md")).includes("/system/backup-readiness"),
    restoreDrillPlanDetected: safeReadFile(path.join(repoRoot, "docs", "API_CATALOG.md")).includes("/system/restore-drill-plan"),
    objectStorageProofDetected: safeReadFile(path.join(repoRoot, "docs", "production", "OBJECT_STORAGE_PROOF_PLAN.md")).includes("OBJECT_STORAGE_PROOF_DRY_RUN_READY"),
  };
}

function buildPlannedBoundaries() {
  return [
    "Synthetic metadata only.",
    "No network calls.",
    "No database calls.",
    "No Prisma or Supabase access.",
    "No env secret reads.",
    "No real backup command execution.",
    "No real restore command execution.",
    "No object-storage provider calls.",
    "Temp-directory writes only during mock-cycle mode.",
  ];
}

function plannedManifestSchema() {
  return {
    manifestVersion: MANIFEST_VERSION,
    artifactType: ARTIFACT_TYPE,
    createdAt: "ISO-8601 timestamp",
    sourceMode: "synthetic-local",
    checksumAlgorithm: "sha256",
    payloadFile: PAYLOAD_FILENAME,
    payloadSha256: "hex sha256",
    recordCounts: {
      organizationMetadata: 1,
      documentMetadata: 3,
      attachmentMetadata: 2,
      generatedDocumentMetadata: 2,
      auditEventMetadata: 3,
      totalRecords: 11,
    },
  };
}

function buildSyntheticFixtureSummary() {
  const fixture = buildSyntheticFixture();
  return {
    organizationMetadata: fixture.organizationMetadata.length,
    documentMetadata: fixture.documentMetadata.length,
    attachmentMetadata: fixture.attachmentMetadata.length,
    generatedDocumentMetadata: fixture.generatedDocumentMetadata.length,
    auditEventMetadata: fixture.auditEventMetadata.length,
    sourceMode: "synthetic-local",
  };
}

function buildSyntheticFixture() {
  const createdAt = "2026-06-12T15:30:00.000Z";
  return {
    organizationMetadata: [
      {
        organizationId: "org-synth-001",
        organizationCode: "ORG-SYNTH-001",
        label: "Synthetic organization metadata",
        region: "sa",
        createdAt,
      },
    ],
    documentMetadata: [
      {
        documentId: "doc-synth-sales-001",
        organizationId: "org-synth-001",
        documentType: "SALES_INVOICE",
        reference: "SYN-SI-001",
        issuedOn: "2026-06-01",
      },
      {
        documentId: "doc-synth-purchase-001",
        organizationId: "org-synth-001",
        documentType: "PURCHASE_BILL",
        reference: "SYN-PB-001",
        issuedOn: "2026-06-02",
      },
      {
        documentId: "doc-synth-ledger-001",
        organizationId: "org-synth-001",
        documentType: "LEDGER_SNAPSHOT",
        reference: "SYN-LG-001",
        issuedOn: "2026-06-03",
      },
    ],
    attachmentMetadata: [
      {
        attachmentId: "att-synth-001",
        organizationId: "org-synth-001",
        storageMode: "synthetic-local",
        fileLabel: "synthetic-attachment-001.pdf",
        objectKey: "org/org-synth-001/attachments/att-synth-001/synthetic-attachment-001.pdf",
        sizeBytes: 2048,
      },
      {
        attachmentId: "att-synth-002",
        organizationId: "org-synth-001",
        storageMode: "synthetic-local",
        fileLabel: "synthetic-attachment-002.txt",
        objectKey: "org/org-synth-001/attachments/att-synth-002/synthetic-attachment-002.txt",
        sizeBytes: 512,
      },
    ],
    generatedDocumentMetadata: [
      {
        generatedDocumentId: "gdoc-synth-001",
        organizationId: "org-synth-001",
        sourceDocumentId: "doc-synth-sales-001",
        fileLabel: "synthetic-sales-invoice-001.pdf",
        objectKey: "org/org-synth-001/generated-documents/sales-invoice/doc-synth-sales-001/sales_invoice/synthetic-sales-invoice-001.pdf",
      },
      {
        generatedDocumentId: "gdoc-synth-002",
        organizationId: "org-synth-001",
        sourceDocumentId: "doc-synth-purchase-001",
        fileLabel: "synthetic-purchase-bill-001.pdf",
        objectKey: "org/org-synth-001/generated-documents/purchase-bill/doc-synth-purchase-001/purchase_bill/synthetic-purchase-bill-001.pdf",
      },
    ],
    auditEventMetadata: [
      {
        auditEventId: "audit-synth-001",
        organizationId: "org-synth-001",
        eventType: "BACKUP_MANIFEST_CREATED",
        actorType: "system",
        createdAt,
      },
      {
        auditEventId: "audit-synth-002",
        organizationId: "org-synth-001",
        eventType: "BACKUP_PAYLOAD_WRITTEN",
        actorType: "system",
        createdAt,
      },
      {
        auditEventId: "audit-synth-003",
        organizationId: "org-synth-001",
        eventType: "RESTORE_SIMULATION_VERIFIED",
        actorType: "system",
        createdAt,
      },
    ],
  };
}

function buildRecordCounts(payload) {
  const counts = {
    organizationMetadata: payload.organizationMetadata.length,
    documentMetadata: payload.documentMetadata.length,
    attachmentMetadata: payload.attachmentMetadata.length,
    generatedDocumentMetadata: payload.generatedDocumentMetadata.length,
    auditEventMetadata: payload.auditEventMetadata.length,
  };
  counts.totalRecords = Object.values(counts).reduce((sum, value) => sum + value, 0);
  return counts;
}

function buildManifest(payload, payloadSha256) {
  return {
    manifestVersion: MANIFEST_VERSION,
    artifactType: ARTIFACT_TYPE,
    createdAt: new Date().toISOString(),
    sourceMode: "synthetic-local",
    checksumAlgorithm: "sha256",
    payloadFile: PAYLOAD_FILENAME,
    payloadSha256,
    recordCounts: buildRecordCounts(payload),
  };
}

function runMockCycle(options = {}) {
  const artifactRoot = options.requestedArtifactDir
    ? path.resolve(options.requestedArtifactDir)
    : fs.mkdtempSync(path.join(os.tmpdir(), "ledgerbyte-backup-restore-proof-"));
  fs.mkdirSync(artifactRoot, { recursive: true });

  const payload = buildSyntheticFixture();
  const payloadJson = JSON.stringify(payload, null, 2);
  rejectForbiddenContent(payloadJson, "payload");

  const payloadPath = path.join(artifactRoot, PAYLOAD_FILENAME);
  const payloadSha256 = sha256(Buffer.from(payloadJson, "utf8"));
  fs.writeFileSync(payloadPath, payloadJson, "utf8");

  const manifest = buildManifest(payload, payloadSha256);
  const manifestJson = JSON.stringify(manifest, null, 2);
  const manifestPath = path.join(artifactRoot, MANIFEST_FILENAME);
  fs.writeFileSync(manifestPath, manifestJson, "utf8");

  const verification = verifyMockArtifact({ artifactRoot, manifestPath, payloadPath });
  const keepArtifacts = Boolean(options.keepArtifacts);

  if (!keepArtifacts) {
    fs.rmSync(artifactRoot, { recursive: true, force: true });
  }

  return {
    artifactRoot,
    manifestPath,
    payloadPath,
    keepArtifacts,
    artifactRootRemoved: keepArtifacts ? false : !fs.existsSync(artifactRoot),
    manifestExistsAfterRun: keepArtifacts ? fs.existsSync(manifestPath) : false,
    payloadExistsAfterRun: keepArtifacts ? fs.existsSync(payloadPath) : false,
    manifestSha256: sha256(Buffer.from(manifestJson, "utf8")),
    payloadSha256,
    restoreVerification: verification,
  };
}

function verifyMockArtifact(options) {
  const artifactRoot = path.resolve(options.artifactRoot);
  const manifestPath = path.resolve(options.manifestPath);
  const manifestRaw = fs.readFileSync(manifestPath, "utf8");
  const manifest = JSON.parse(manifestRaw);

  validateManifest(manifest);

  const payloadPath = options.payloadPath
    ? path.resolve(options.payloadPath)
    : path.resolve(artifactRoot, manifest.payloadFile);
  const payloadRelativePath = path.relative(artifactRoot, payloadPath);
  if (path.isAbsolute(manifest.payloadFile) || payloadRelativePath.startsWith("..")) {
    throw new Error("Payload path escaped the artifact root.");
  }

  const payloadRaw = fs.readFileSync(payloadPath, "utf8");
  rejectForbiddenContent(payloadRaw, "payload");
  rejectAbsoluteProductionPaths(payloadRaw);

  const payloadSha256 = sha256(Buffer.from(payloadRaw, "utf8"));
  if (payloadSha256 !== manifest.payloadSha256) {
    throw new Error("Payload checksum verification failed.");
  }

  const payload = JSON.parse(payloadRaw);
  const actualCounts = buildRecordCounts(payload);
  const expectedCounts = manifest.recordCounts || {};
  for (const [key, value] of Object.entries(actualCounts)) {
    if (expectedCounts[key] !== value) {
      throw new Error(`Record count verification failed for ${key}.`);
    }
  }

  return {
    manifestVersionValid: manifest.manifestVersion === MANIFEST_VERSION,
    artifactTypeValid: manifest.artifactType === ARTIFACT_TYPE,
    createdAtIsoValid: isIsoTimestamp(manifest.createdAt),
    sourceModeValid: manifest.sourceMode === "synthetic-local",
    payloadPathInsideArtifactRoot: true,
    checksumVerified: true,
    recordCountsVerified: true,
    noSecretsDetected: true,
    noCustomerDataMarkersDetected: true,
    actualCounts,
  };
}

function validateManifest(manifest) {
  if (!manifest || typeof manifest !== "object") {
    throw new Error("Manifest must be an object.");
  }
  if (manifest.manifestVersion !== MANIFEST_VERSION) {
    throw new Error("Unexpected manifest version.");
  }
  if (manifest.artifactType !== ARTIFACT_TYPE) {
    throw new Error("Unexpected artifact type.");
  }
  if (!isIsoTimestamp(manifest.createdAt)) {
    throw new Error("Manifest createdAt must be an ISO-8601 timestamp.");
  }
  if (manifest.sourceMode !== "synthetic-local") {
    throw new Error("Manifest sourceMode must stay synthetic-local.");
  }
  if (manifest.checksumAlgorithm !== "sha256") {
    throw new Error("Manifest checksumAlgorithm must be sha256.");
  }
  if (manifest.payloadFile !== PAYLOAD_FILENAME) {
    throw new Error("Manifest payloadFile must use the expected synthetic payload filename.");
  }
  if (!/^[a-f0-9]{64}$/i.test(String(manifest.payloadSha256 || ""))) {
    throw new Error("Manifest payloadSha256 must be a sha256 hex digest.");
  }
}

function describeArtifactDirectory(requestedArtifactDir) {
  const tempRoot = path.resolve(os.tmpdir());
  const resolvedPath = requestedArtifactDir ? path.resolve(requestedArtifactDir) : null;
  return {
    requested: Boolean(requestedArtifactDir),
    requestedPath: requestedArtifactDir,
    resolvedPath,
    tempRoot,
    safe: resolvedPath ? isWithinDirectory(tempRoot, resolvedPath) : true,
  };
}

function rejectForbiddenContent(value, label) {
  for (const pattern of FORBIDDEN_TEXT_PATTERNS) {
    if (pattern.test(value)) {
      throw new Error(`Forbidden ${label} marker detected: ${pattern}`);
    }
  }
}

function rejectAbsoluteProductionPaths(value) {
  const unsafePatterns = [
    /[A-Za-z]:\\\\Users\\\\/i,
    /[A-Za-z]:\\\\Program Files\\\\/i,
    /\/home\/[^/\s]+/i,
    /\/var\/lib\//i,
  ];
  for (const pattern of unsafePatterns) {
    if (pattern.test(value)) {
      throw new Error("Absolute production-style path detected in artifact payload.");
    }
  }
}

function isWithinDirectory(parentDir, candidatePath) {
  const relative = path.relative(parentDir, candidatePath);
  return relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative);
}

function isIsoTimestamp(value) {
  if (typeof value !== "string") {
    return false;
  }
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) && !Number.isNaN(Date.parse(value));
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
    throw new Error("BACKUP_RESTORE_PROOF_NETWORK_BLOCKED");
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

function sha256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
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

function finalizeResult(result) {
  if (result.status !== STATUS_MOCK_CYCLE_PASSED) {
    delete result.mockCycle;
  }
  return result;
}

function formatResult(result) {
  const lines = [
    `status: ${result.status}`,
    `mode: ${result.mode}`,
    `requiredSurfacesPresent: ${result.requiredSurfaceSummary.allPresent}`,
    `networkAccessAttempted: ${result.networkAccessAttempted}`,
    `databaseAccessAttempted: ${result.databaseAccessAttempted}`,
    `fileWritesAttempted: ${result.fileWritesAttempted}`,
  ];

  if (result.blockers.length > 0) {
    lines.push("", "Blockers:", ...result.blockers.map((item) => `- ${item}`));
  }
  if (result.warnings.length > 0) {
    lines.push("", "Warnings:", ...result.warnings.map((item) => `- ${item}`));
  }
  lines.push("", "Planned boundaries:", ...result.plannedBoundaries.map((item) => `- ${item}`));

  if (result.mockCycle) {
    lines.push(
      "",
      "Mock cycle:",
      `- artifactRoot: ${result.mockCycle.artifactRoot}`,
      `- payloadSha256: ${result.mockCycle.payloadSha256}`,
      `- cleanupVerified: ${result.mockCycle.keepArtifacts ? "artifacts kept" : result.mockCycle.artifactRootRemoved}`,
    );
  }

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

  const result = buildBackupRestoreProof({
    cwd: process.cwd(),
    json: parsed.json,
    strict: parsed.strict,
    dryRun: parsed.dryRun,
    mockCycle: parsed.mockCycle,
    artifactDir: parsed.artifactDir,
    keepArtifacts: parsed.keepArtifacts,
    realData: parsed.realData,
  });

  if (parsed.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(formatResult(result));
  }

  if (
    result.status === STATUS_BLOCKED_UNSAFE_PATH ||
    result.status === STATUS_BLOCKED_MISSING_DOCS ||
    result.status === STATUS_BLOCKED_REAL_DATA_REQUESTED
  ) {
    process.exitCode = 1;
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  ARTIFACT_TYPE,
  MANIFEST_FILENAME,
  MANIFEST_VERSION,
  PAYLOAD_FILENAME,
  STATUS_BLOCKED_MISSING_DOCS,
  STATUS_BLOCKED_REAL_DATA_REQUESTED,
  STATUS_BLOCKED_UNSAFE_PATH,
  STATUS_DRY_RUN_READY,
  STATUS_MOCK_CYCLE_PASSED,
  REQUIRED_SURFACES,
  buildBackupRestoreProof,
  buildManifest,
  buildRecordCounts,
  buildSyntheticFixture,
  describeArtifactDirectory,
  formatResult,
  parseArgs,
  plannedManifestSchema,
  runMockCycle,
  validateManifest,
  verifyMockArtifact,
};
