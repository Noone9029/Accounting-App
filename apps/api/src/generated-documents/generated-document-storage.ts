import { ConflictException, Injectable, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import { DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { createHash } from "node:crypto";
import { Readable } from "node:stream";
import { StorageConfigurationService } from "../storage/storage-configuration.service";

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

@Injectable()
export class S3GeneratedDocumentStorageAdapter extends GeneratedDocumentStorageAdapter {
  private client?: S3Client;
  constructor(private readonly storageConfig: StorageConfigurationService) {
    super();
  }

  getStorageBackendName(): string {
    return "s3";
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

    try {
      const existing = await this.tryHead(storageKey);
      if (existing) {
        if (
          existing.sizeBytes !== sizeBytes ||
          existing.contentHash !== contentHash ||
          existing.organizationId !== input.organizationId ||
          existing.generatedDocumentId !== input.generatedDocumentId
        ) {
          throw new ConflictException("Generated-document object already exists with different immutable metadata or content.");
        }
      } else {
        await this.send(
          new PutObjectCommand({
            Bucket: this.storageConfig.s3Bucket,
            Key: storageKey,
            Body: input.buffer,
            ContentType: input.mimeType,
            Metadata: {
              contenthash: contentHash,
              organizationid: input.organizationId,
              generateddocumentid: input.generatedDocumentId,
            },
          }),
        );
      }
    } catch (error) {
      if (error instanceof ConflictException) throw error;
      throw normalizeS3Error(error);
    }

    return { storageProvider: "s3", storageKey, contentBase64: null, contentHash, sizeBytes };
  }

  async readGeneratedDocumentContent(payload: StoredGeneratedDocumentContent): Promise<Buffer> {
    this.assertPayloadBelongsToExpectedObject(payload);
    try {
      const head = await this.head(payload.storageKey!);
      if (
        (payload.sizeBytes != null && head.sizeBytes !== payload.sizeBytes) ||
        head.contentHash !== payload.contentHash ||
        head.organizationId !== payload.organizationId ||
        head.generatedDocumentId !== payload.generatedDocumentId
      ) {
        throw new NotFoundException("Generated document object metadata verification failed.");
      }
      const result = await this.send<{ Body?: unknown }>(new GetObjectCommand({ Bucket: this.storageConfig.s3Bucket, Key: payload.storageKey! }));
      const buffer = await bodyToBuffer(result.Body);
      if ((payload.sizeBytes != null && buffer.byteLength !== payload.sizeBytes) || !this.verifyGeneratedDocumentContentHash(buffer, payload.contentHash)) {
        throw new NotFoundException("Generated document content hash verification failed.");
      }
      return buffer;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw normalizeS3Error(error);
    }
  }

  async getGeneratedDocumentReadUrl(_payload: StoredGeneratedDocumentContent): Promise<string> {
    throw disabledGeneratedDocumentSignedUrlError();
  }

  async deleteGeneratedDocumentContent(payload: StoredGeneratedDocumentContent): Promise<void> {
    this.assertPayloadBelongsToExpectedObject(payload);
    try {
      await this.send(new DeleteObjectCommand({ Bucket: this.storageConfig.s3Bucket, Key: payload.storageKey! }));
    } catch (error) {
      throw normalizeS3Error(error);
    }
  }

  async headGeneratedDocumentContent(storageKey: string): Promise<{ sizeBytes: number; contentHash: string | null }> {
    const result = await this.head(storageKey);
    if (!result) throw new NotFoundException("Generated document object was not found.");
    return { sizeBytes: result.sizeBytes, contentHash: result.contentHash };
  }

  verifyGeneratedDocumentContentHash(buffer: Buffer, expectedHash: string): boolean {
    return sha256(buffer) === expectedHash;
  }

  deriveGeneratedDocumentObjectKey(input: GeneratedDocumentObjectKeyInput): string {
    return buildGeneratedDocumentObjectKey(input);
  }

  private assertPayloadBelongsToExpectedObject(payload: StoredGeneratedDocumentContent): void {
    if (payload.storageProvider !== "s3" || !payload.storageKey || !payload.organizationId || !payload.generatedDocumentId) {
      throw new NotFoundException("Generated document content is not available from the configured storage provider.");
    }
    const expectedKey = this.deriveGeneratedDocumentObjectKey({
      organizationId: payload.organizationId,
      generatedDocumentId: payload.generatedDocumentId,
      filename: payload.storageKey.split("/").pop() || "document.pdf",
    });
    if (expectedKey !== payload.storageKey) {
      throw new NotFoundException("Generated document content is not available from the configured storage provider.");
    }
  }

  private async tryHead(storageKey: string): Promise<S3ObjectHead | null> {
    try {
      return await this.head(storageKey);
    } catch (error) {
      if (isS3NotFound(error)) return null;
      throw error;
    }
  }

  private async head(storageKey: string): Promise<S3ObjectHead> {
    try {
      const result = await this.send<{ ContentLength?: number; Metadata?: Record<string, string> }>(
        new HeadObjectCommand({ Bucket: this.storageConfig.s3Bucket, Key: storageKey }),
      );
      return {
        sizeBytes: Number(result.ContentLength ?? 0),
        contentHash: result.Metadata?.contenthash ?? null,
        organizationId: result.Metadata?.organizationid ?? null,
        generatedDocumentId: result.Metadata?.generateddocumentid ?? null,
      };
    } catch (error) {
      throw normalizeS3Error(error);
    }
  }

  private clientForProof(): S3Client {
    const blockers = this.storageConfig.s3BlockingReasons();
    if (blockers.length) {
      throw new ServiceUnavailableException(`S3 generated-document storage is not configured: ${blockers.join(" ")}`);
    }
    return (this.client ??= new S3Client({
      endpoint: this.storageConfig.s3Endpoint,
      region: this.storageConfig.s3Region,
      forcePathStyle: this.storageConfig.s3ForcePathStyle,
      maxAttempts: 3,
      credentials: {
        accessKeyId: this.storageConfig.s3AccessKeyId,
        secretAccessKey: this.storageConfig.s3SecretAccessKey,
      },
    }));
  }

  private async send<T = void>(command: unknown): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    try {
      return (await this.clientForProof().send(command as never, { abortSignal: controller.signal })) as T;
    } finally {
      clearTimeout(timeout);
    }
  }
}

@Injectable()
export class GeneratedDocumentStorageAdapterRouter extends GeneratedDocumentStorageAdapter {
  constructor(
    private readonly storageConfig: StorageConfigurationService,
    private readonly databaseAdapter: DatabaseGeneratedDocumentStorageAdapter,
    private readonly s3Adapter: S3GeneratedDocumentStorageAdapter,
  ) {
    super();
  }

  getStorageBackendName(): string {
    return this.activeWriteAdapter().getStorageBackendName();
  }

  async writeGeneratedDocumentContent(input: GeneratedDocumentContentWriteInput): Promise<GeneratedDocumentContentWriteResult> {
    return this.activeWriteAdapter().writeGeneratedDocumentContent(input);
  }

  async readGeneratedDocumentContent(payload: StoredGeneratedDocumentContent): Promise<Buffer> {
    return this.adapterForStoredProvider(payload.storageProvider).readGeneratedDocumentContent(payload);
  }

  async getGeneratedDocumentReadUrl(payload: StoredGeneratedDocumentContent): Promise<string> {
    return this.adapterForStoredProvider(payload.storageProvider).getGeneratedDocumentReadUrl(payload);
  }

  verifyGeneratedDocumentContentHash(buffer: Buffer, expectedHash: string): boolean {
    return sha256(buffer) === expectedHash;
  }

  deriveGeneratedDocumentObjectKey(input: GeneratedDocumentObjectKeyInput): string {
    return this.activeWriteAdapter().deriveGeneratedDocumentObjectKey(input);
  }

  private activeWriteAdapter(): GeneratedDocumentStorageAdapter {
    return this.storageConfig.generatedDocumentProvider === "s3" ? this.s3Adapter : this.databaseAdapter;
  }

  private adapterForStoredProvider(provider: string): GeneratedDocumentStorageAdapter {
    if (provider === "database") return this.databaseAdapter;
    if (provider === "s3") return this.s3Adapter;
    throw new NotFoundException("Generated document content is not available from the stored provider.");
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
  if (mode === "object" || mode === "object-storage" || mode === "disabled-object") {
    return new DisabledGeneratedDocumentObjectStorageAdapter();
  }
  throw new ServiceUnavailableException(`Unsupported generated-document storage adapter mode: ${mode}`);
}

interface S3ObjectHead {
  sizeBytes: number;
  contentHash: string | null;
  organizationId: string | null;
  generatedDocumentId: string | null;
}

async function bodyToBuffer(body: unknown): Promise<Buffer> {
  if (Buffer.isBuffer(body)) return body;
  if (body instanceof Uint8Array) return Buffer.from(body);
  if (body instanceof Readable) {
    const chunks: Buffer[] = [];
    for await (const chunk of body) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    return Buffer.concat(chunks);
  }
  throw new NotFoundException("Generated document object body is unavailable.");
}

function isS3NotFound(error: unknown): boolean {
  if (error instanceof NotFoundException) return true;
  const name = error && typeof error === "object" && "name" in error ? String(error.name) : "";
  return name === "NoSuchKey" || name === "NotFound" || name === "NoSuchBucket";
}

function normalizeS3Error(error: unknown): ServiceUnavailableException | NotFoundException {
  return isS3NotFound(error)
    ? new NotFoundException("Generated document object was not found.")
    : new ServiceUnavailableException("Generated document object storage request failed.");
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
