import { Injectable, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import { createHash } from "node:crypto";

export interface GeneratedDocumentContentWriteInput {
  organizationId: string;
  generatedDocumentId?: string | null;
  filename: string;
  mimeType: string;
  buffer: Buffer;
}

export interface GeneratedDocumentContentWriteResult {
  storageProvider: string;
  storageKey?: string | null;
  contentBase64?: string | null;
  contentHash: string;
  sizeBytes: number;
}

export interface StoredGeneratedDocumentContent {
  storageProvider: string;
  storageKey?: string | null;
  contentBase64?: string | null;
  contentHash: string;
}

export interface GeneratedDocumentObjectKeyInput {
  organizationId: string;
  generatedDocumentId: string;
  filename: string;
}

export abstract class GeneratedDocumentStorageAdapter {
  abstract getStorageBackendName(): string;
  abstract writeGeneratedDocumentContent(input: GeneratedDocumentContentWriteInput): Promise<GeneratedDocumentContentWriteResult>;
  abstract readGeneratedDocumentContent(payload: StoredGeneratedDocumentContent): Promise<Buffer>;
  abstract verifyGeneratedDocumentContentHash(buffer: Buffer, expectedHash: string): boolean;
  abstract deriveGeneratedDocumentObjectKey(input: GeneratedDocumentObjectKeyInput): string;
}

export interface GeneratedDocumentStorageAdapterSelectionOptions {
  mode?: string | null;
  allowLocalTestObjectAdapter?: boolean;
}

@Injectable()
export class DatabaseGeneratedDocumentStorageAdapter extends GeneratedDocumentStorageAdapter {
  getStorageBackendName(): string {
    return "database";
  }

  async writeGeneratedDocumentContent(input: GeneratedDocumentContentWriteInput): Promise<GeneratedDocumentContentWriteResult> {
    return {
      storageProvider: "database",
      storageKey: null,
      contentBase64: input.buffer.toString("base64"),
      contentHash: sha256(input.buffer),
      sizeBytes: input.buffer.byteLength,
    };
  }

  async readGeneratedDocumentContent(payload: StoredGeneratedDocumentContent): Promise<Buffer> {
    if (payload.storageProvider !== "database" || !payload.contentBase64) {
      throw new NotFoundException("Generated document content is not available from the configured storage provider.");
    }
    return Buffer.from(payload.contentBase64, "base64");
  }

  verifyGeneratedDocumentContentHash(buffer: Buffer, expectedHash: string): boolean {
    return sha256(buffer) === expectedHash;
  }

  deriveGeneratedDocumentObjectKey(input: GeneratedDocumentObjectKeyInput): string {
    return buildGeneratedDocumentObjectKey(input);
  }
}

export class FakeLocalGeneratedDocumentObjectStorageAdapter extends GeneratedDocumentStorageAdapter {
  private readonly objects = new Map<string, Buffer>();
  private readonly hashes = new Map<string, string>();

  getStorageBackendName(): string {
    return "local-test-object";
  }

  async writeGeneratedDocumentContent(input: GeneratedDocumentContentWriteInput): Promise<GeneratedDocumentContentWriteResult> {
    if (!input.generatedDocumentId) {
      throw new NotFoundException("Generated document object storage requires a generatedDocumentId.");
    }
    const storageKey = this.deriveGeneratedDocumentObjectKey({
      organizationId: input.organizationId,
      generatedDocumentId: input.generatedDocumentId,
      filename: input.filename,
    });
    const contentHash = sha256(input.buffer);
    this.objects.set(storageKey, Buffer.from(input.buffer));
    this.hashes.set(storageKey, contentHash);
    return {
      storageProvider: this.getStorageBackendName(),
      storageKey,
      contentBase64: null,
      contentHash,
      sizeBytes: input.buffer.byteLength,
    };
  }

  async readGeneratedDocumentContent(payload: StoredGeneratedDocumentContent): Promise<Buffer> {
    if (payload.storageProvider !== this.getStorageBackendName() || !payload.storageKey) {
      throw new NotFoundException("Generated document content is not available from the configured storage provider.");
    }
    const buffer = this.objects.get(payload.storageKey);
    if (!buffer) {
      throw new NotFoundException("Generated document content is not available from the configured storage provider.");
    }
    if (!this.verifyGeneratedDocumentContentHash(buffer, payload.contentHash)) {
      throw new NotFoundException("Generated document content hash verification failed.");
    }
    return Buffer.from(buffer);
  }

  verifyGeneratedDocumentContentHash(buffer: Buffer, expectedHash: string): boolean {
    return sha256(buffer) === expectedHash;
  }

  deriveGeneratedDocumentObjectKey(input: GeneratedDocumentObjectKeyInput): string {
    return buildGeneratedDocumentObjectKey(input);
  }
}

export class DisabledGeneratedDocumentObjectStorageAdapter extends GeneratedDocumentStorageAdapter {
  getStorageBackendName(): string {
    return "object-storage-unavailable";
  }

  async writeGeneratedDocumentContent(_input: GeneratedDocumentContentWriteInput): Promise<GeneratedDocumentContentWriteResult> {
    throw disabledGeneratedDocumentObjectStorageError();
  }

  async readGeneratedDocumentContent(_payload: StoredGeneratedDocumentContent): Promise<Buffer> {
    throw disabledGeneratedDocumentObjectStorageError();
  }

  verifyGeneratedDocumentContentHash(_buffer: Buffer, _expectedHash: string): boolean {
    return false;
  }

  deriveGeneratedDocumentObjectKey(input: GeneratedDocumentObjectKeyInput): string {
    return buildGeneratedDocumentObjectKey(input);
  }
}

export function createGeneratedDocumentStorageAdapter(
  options: GeneratedDocumentStorageAdapterSelectionOptions = {},
): GeneratedDocumentStorageAdapter {
  const mode = normalizeGeneratedDocumentStorageMode(options.mode);
  if (!mode || mode === "database") {
    return new DatabaseGeneratedDocumentStorageAdapter();
  }
  if (mode === "local-test-object") {
    if (options.allowLocalTestObjectAdapter !== true) {
      throw new ServiceUnavailableException("Fake generated-document object storage is available only for explicit local tests.");
    }
    return new FakeLocalGeneratedDocumentObjectStorageAdapter();
  }
  if (mode === "object" || mode === "object-storage" || mode === "s3" || mode === "s3-compatible" || mode === "disabled-object") {
    return new DisabledGeneratedDocumentObjectStorageAdapter();
  }
  throw new ServiceUnavailableException(`Unsupported generated-document storage adapter mode: ${mode}`);
}

function normalizeGeneratedDocumentStorageMode(value: string | null | undefined): string {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "db") {
    return "database";
  }
  if (normalized === "fake-local-object" || normalized === "test-object" || normalized === "local-object") {
    return "local-test-object";
  }
  if (normalized === "s3_compatible") {
    return "s3-compatible";
  }
  if (normalized === "object-storage-unavailable") {
    return "disabled-object";
  }
  return normalized;
}

function disabledGeneratedDocumentObjectStorageError(): ServiceUnavailableException {
  return new ServiceUnavailableException("Generated-document object storage is disabled and has no configured runtime adapter.");
}

function buildGeneratedDocumentObjectKey(input: GeneratedDocumentObjectKeyInput): string {
  assertSafeSegmentInput(input.organizationId);
  assertSafeSegmentInput(input.generatedDocumentId);
  return `org/${safeSegment(input.organizationId)}/generated-documents/${safeSegment(input.generatedDocumentId)}/${sanitizeObjectKeyFilename(input.filename)}`;
}

function assertSafeSegmentInput(value: string): void {
  const parts = String(value || "").split(/[\\/]+/);
  if (parts.some((part) => part === "." || part === "..")) {
    throw new Error("Generated document object keys must not contain traversal segments.");
  }
}

function safeSegment(value: string): string {
  return (
    String(value || "")
      .trim()
      .replace(/\.\.+/g, "")
      .replace(/[^a-zA-Z0-9._-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "") || "segment"
  );
}

function sanitizeObjectKeyFilename(value: string): string {
  const cleaned = String(value || "")
    .trim()
    .replace(/\.\.+/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
  return cleaned || "document.pdf";
}

function sha256(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}
