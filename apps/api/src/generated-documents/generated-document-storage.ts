import { Injectable, NotFoundException } from "@nestjs/common";
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
