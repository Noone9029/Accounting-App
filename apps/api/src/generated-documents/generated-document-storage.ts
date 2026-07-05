import { ConflictException, Injectable, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
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
  organizationId?: string | null;
  generatedDocumentId?: string | null;
  storageProvider: string;
  storageKey?: string | null;
  contentBase64?: string | null;
  contentHash: string;
  sizeBytes?: number | null;
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
  abstract getGeneratedDocumentReadUrl(payload: StoredGeneratedDocumentContent): Promise<string>;
  abstract verifyGeneratedDocumentContentHash(buffer: Buffer, expectedHash: string): boolean;
  abstract deriveGeneratedDocumentObjectKey(input: GeneratedDocumentObjectKeyInput): string;
}

export interface GeneratedDocumentStorageAdapterSelectionOptions {
  mode?: string | null;
  allowLocalTestObjectAdapter?: boolean;
  environment?: string | null;
}

interface FakeLocalGeneratedDocumentObjectMetadata {
  organizationId: string;
  generatedDocumentId: string;
  contentHash: string;
  sizeBytes: number;
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

  async getGeneratedDocumentReadUrl(_payload: StoredGeneratedDocumentContent): Promise<string> {
    throw disabledGeneratedDocumentSignedUrlError();
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
  private readonly metadata = new Map<string, FakeLocalGeneratedDocumentObjectMetadata>();

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
    const sizeBytes = input.buffer.byteLength;
    const existing = this.metadata.get(storageKey);
    const result = {
      storageProvider: this.getStorageBackendName(),
      storageKey,
      contentBase64: null,
      contentHash,
      sizeBytes,
    };
    if (existing) {
      if (existing.contentHash !== contentHash || existing.sizeBytes !== sizeBytes) {
        throw new ConflictException("Fake local generated-document object already exists with different content.");
      }
      return result;
    }
    this.objects.set(storageKey, Buffer.from(input.buffer));
    this.metadata.set(storageKey, {
      organizationId: input.organizationId,
      generatedDocumentId: input.generatedDocumentId,
      contentHash,
      sizeBytes,
    });
    return result;
  }

  async readGeneratedDocumentContent(payload: StoredGeneratedDocumentContent): Promise<Buffer> {
    if (payload.storageProvider !== this.getStorageBackendName() || !payload.storageKey) {
      throw new NotFoundException("Generated document content is not available from the configured storage provider.");
    }
    const buffer = this.objects.get(payload.storageKey);
    const metadata = this.metadata.get(payload.storageKey);
    if (!buffer || !metadata) {
      throw new NotFoundException("Generated document content is not available from the configured storage provider.");
    }
    if (payload.organizationId != null && payload.organizationId !== metadata.organizationId) {
      throw new NotFoundException("Generated document content is not available from the configured storage provider.");
    }
    if (payload.generatedDocumentId != null && payload.generatedDocumentId !== metadata.generatedDocumentId) {
      throw new NotFoundException("Generated document content is not available from the configured storage provider.");
    }
    if (payload.sizeBytes != null && payload.sizeBytes !== metadata.sizeBytes) {
      throw new NotFoundException("Generated document content size verification failed.");
    }
    if (!this.verifyGeneratedDocumentContentHash(buffer, payload.contentHash)) {
      throw new NotFoundException("Generated document content hash verification failed.");
    }
    return Buffer.from(buffer);
  }

  async getGeneratedDocumentReadUrl(_payload: StoredGeneratedDocumentContent): Promise<string> {
    throw disabledGeneratedDocumentSignedUrlError();
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

  async getGeneratedDocumentReadUrl(_payload: StoredGeneratedDocumentContent): Promise<string> {
    throw disabledGeneratedDocumentSignedUrlError();
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
    if (!isLocalTestGeneratedDocumentStorageEnvironment(options.environment ?? process.env.NODE_ENV ?? "local")) {
      throw new ServiceUnavailableException("Fake generated-document object storage is refused for production-looking environments.");
    }
    return new FakeLocalGeneratedDocumentObjectStorageAdapter();
  }
  if (mode === "object" || mode === "object-storage" || mode === "s3" || mode === "s3-compatible" || mode === "disabled-object") {
    return new DisabledGeneratedDocumentObjectStorageAdapter();
  }
  throw new ServiceUnavailableException(`Unsupported generated-document storage adapter mode: ${mode}`);
}

function isLocalTestGeneratedDocumentStorageEnvironment(value: string | null | undefined): boolean {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized === "" || normalized === "local" || normalized === "test" || normalized === "development" || normalized === "dev" || normalized === "ci";
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

function disabledGeneratedDocumentSignedUrlError(): ServiceUnavailableException {
  return new ServiceUnavailableException("Generated-document signed URLs are disabled and require separate storage proof before use.");
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
