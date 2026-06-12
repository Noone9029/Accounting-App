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
const SAMPLE_GENERATED_DOCUMENT_SOURCE_ID = "sales-invoice-proof";
const SAMPLE_ATTACHMENT_FILENAME = "Quarterly Attachment (proof).txt";
const SAMPLE_GENERATED_DOCUMENT_FILENAME = "Sales Invoice 1001 (proof).pdf";
const ATTACHMENT_SAMPLE_CONTENT_TYPE = "text/plain";
const GENERATED_DOCUMENT_SAMPLE_CONTENT_TYPE = "application/pdf";
const ATTACHMENT_SAMPLE_BUFFER = Buffer.from("LedgerByte object-storage proof attachment. Synthetic only.\n", "utf8");
const GENERATED_DOCUMENT_SAMPLE_BUFFER = Buffer.from("%PDF-1.4\n% LedgerByte generated-document proof only.\n", "utf8");

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
      status: "not_proven",
      note: "The current storage groundwork does not implement signed URL generation.",
    },
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
    distinctDomains: attachment.domain !== generatedDocument.domain,
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
  const providerPath = path.join(repoRoot, "apps", "api", "src", "storage", "storage-provider.ts");

  const attachmentStorageSource = safeReadFile(attachmentStoragePath);
  const generatedDocumentSource = safeReadFile(generatedDocumentPath);

  return {
    storageProviderInterfaceDetected: fs.existsSync(providerPath),
    attachmentS3GroundworkDetected:
      attachmentStorageSource.includes("class S3AttachmentStorageService") &&
      attachmentStorageSource.includes("PutObjectCommand") &&
      attachmentStorageSource.includes("GetObjectCommand"),
    generatedDocumentDatabaseDefaultDetected:
      generatedDocumentSource.includes('storageProvider: "database"') &&
      generatedDocumentSource.includes("contentBase64"),
    generatedDocumentS3WritesImplemented: generatedDocumentSource.includes('storageProvider: "s3"'),
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

function buildGeneratedDocumentObjectKey({ organizationId, sourceType, sourceId, documentType, filename }) {
  return `org/${safeSegment(organizationId)}/generated-documents/${safeSegment(sourceType)}/${safeSegment(sourceId)}/${safeSegment(documentType.toLowerCase())}/${sanitizeFilename(filename)}`;
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
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-");
  return cleaned || "object.bin";
}

function safeSegment(value) {
  return String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-") || "segment";
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
  sanitizeFilename,
  normalizeProofProvider,
  normalizeConfiguredProvider,
  normalizeAttachmentMaxSizeMb,
  isWithinSizeLimit,
  runLocalMockCycle,
  detectRepoSurface,
  formatResult,
};
