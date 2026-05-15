import { Injectable, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { Readable } from "node:stream";
import { AttachmentStorageProvider } from "@prisma/client";
import { StorageConfigurationService } from "../storage/storage-configuration.service";
import {
  StorageProvider,
  type DeleteObjectInput,
  type GetObjectInput,
  type SaveObjectInput,
  type SaveObjectResult,
} from "../storage/storage-provider";

export interface AttachmentStorageSaveInput {
  buffer: Buffer;
  filename: string;
  contentHash: string;
  organizationId?: string;
  attachmentId?: string;
  mimeType?: string;
}

export interface AttachmentStorageSaveResult {
  storageProvider: AttachmentStorageProvider;
  storageKey?: string | null;
  contentBase64?: string | null;
}

export interface StoredAttachmentPayload {
  storageProvider: AttachmentStorageProvider;
  storageKey?: string | null;
  contentBase64?: string | null;
}

export abstract class AttachmentStorageService extends StorageProvider {
  abstract save(input: AttachmentStorageSaveInput): Promise<AttachmentStorageSaveResult>;
  abstract read(payload: StoredAttachmentPayload): Promise<Buffer>;

  async saveObject(input: SaveObjectInput): Promise<SaveObjectResult> {
    const saved = await this.save({
      buffer: input.buffer,
      filename: input.filename ?? input.key ?? "attachment",
      contentHash: input.contentHash ?? "",
      organizationId: input.organizationId ?? undefined,
      attachmentId: input.attachmentId ?? undefined,
      mimeType: input.contentType ?? undefined,
    });

    return {
      provider: this.provider,
      storageKey: saved.storageKey,
      contentBase64: saved.contentBase64,
    };
  }

  async getObject(input: GetObjectInput): Promise<Buffer> {
    return this.read({ storageProvider: AttachmentStorageProvider.DATABASE, ...input });
  }

  async deleteObject(_input: DeleteObjectInput): Promise<void> {
    return undefined;
  }
}

@Injectable()
export class DatabaseAttachmentStorageService extends AttachmentStorageService {
  readonly provider = "database" as const;

  async save(input: AttachmentStorageSaveInput): Promise<AttachmentStorageSaveResult> {
    return {
      storageProvider: AttachmentStorageProvider.DATABASE,
      storageKey: null,
      contentBase64: input.buffer.toString("base64"),
    };
  }

  async getObject(input: GetObjectInput): Promise<Buffer> {
    return this.read({ storageProvider: AttachmentStorageProvider.DATABASE, ...input });
  }

  async read(payload: StoredAttachmentPayload): Promise<Buffer> {
    if (payload.storageProvider !== AttachmentStorageProvider.DATABASE || !payload.contentBase64) {
      throw new NotFoundException("Attachment content is not available from the configured storage provider.");
    }
    return Buffer.from(payload.contentBase64, "base64");
  }

  readiness() {
    return {
      provider: this.provider,
      ready: true,
      blockingReasons: [],
      warnings: ["Database attachment storage is acceptable for local/dev but not production-scale."],
    };
  }
}

@Injectable()
export class S3AttachmentStorageService extends AttachmentStorageService {
  readonly provider = "s3" as const;
  private client?: S3Client;

  constructor(private readonly storageConfig: StorageConfigurationService) {
    super();
  }

  async save(input: AttachmentStorageSaveInput): Promise<AttachmentStorageSaveResult> {
    if (!input.organizationId || !input.attachmentId) {
      throw new ServiceUnavailableException("S3 attachment storage requires organization and attachment identifiers.");
    }
    const key = objectKey(input.organizationId, input.attachmentId, input.filename);
    await this.s3Client().send(
      new PutObjectCommand({
        Bucket: this.storageConfig.s3Bucket,
        Key: key,
        Body: input.buffer,
        ContentType: input.mimeType,
        Metadata: {
          contentHash: input.contentHash,
          organizationId: input.organizationId,
          attachmentId: input.attachmentId,
        },
      }),
    );

    return {
      storageProvider: AttachmentStorageProvider.S3,
      storageKey: key,
      contentBase64: null,
    };
  }

  async read(payload: StoredAttachmentPayload): Promise<Buffer> {
    if (!isS3Provider(payload.storageProvider) || !payload.storageKey) {
      throw new NotFoundException("Attachment content is not available from the configured storage provider.");
    }
    const result = await this.s3Client().send(
      new GetObjectCommand({
        Bucket: this.storageConfig.s3Bucket,
        Key: payload.storageKey,
      }),
    );
    return bodyToBuffer(result.Body);
  }

  async getObject(input: GetObjectInput): Promise<Buffer> {
    return this.read({ storageProvider: AttachmentStorageProvider.S3, ...input });
  }

  async deleteObject(_input: DeleteObjectInput): Promise<void> {
    return undefined;
  }

  readiness() {
    const blockingReasons = this.storageConfig.s3BlockingReasons();
    return {
      provider: this.provider,
      ready: blockingReasons.length === 0,
      blockingReasons,
      warnings:
        blockingReasons.length === 0
          ? ["S3-compatible attachment storage is configured. Verify bucket permissions, backups, retention, and malware scanning before production use."]
          : ["S3-compatible attachment storage is selected but configuration is incomplete."],
    };
  }

  private s3Client(): S3Client {
    const blockingReasons = this.storageConfig.s3BlockingReasons();
    if (blockingReasons.length > 0) {
      throw new ServiceUnavailableException(`S3 attachment storage is not configured: ${blockingReasons.join(" ")}`);
    }
    this.client ??= new S3Client({
      endpoint: this.storageConfig.s3Endpoint,
      region: this.storageConfig.s3Region,
      forcePathStyle: this.storageConfig.s3ForcePathStyle,
      credentials: {
        accessKeyId: this.storageConfig.s3AccessKeyId,
        secretAccessKey: this.storageConfig.s3SecretAccessKey,
      },
    });
    return this.client;
  }
}

function isS3Provider(provider: AttachmentStorageProvider): boolean {
  return provider === AttachmentStorageProvider.S3 || provider === AttachmentStorageProvider.S3_PLACEHOLDER;
}

function objectKey(organizationId: string, attachmentId: string, filename: string): string {
  return `org/${organizationId}/attachments/${attachmentId}/${sanitizeObjectKeyFilename(filename)}`;
}

function sanitizeObjectKeyFilename(value: string): string {
  const cleaned = value.trim().replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-");
  return cleaned || "attachment";
}

async function bodyToBuffer(body: unknown): Promise<Buffer> {
  if (!body) {
    throw new NotFoundException("Attachment content was empty.");
  }
  if (Buffer.isBuffer(body)) {
    return body;
  }
  if (body instanceof Uint8Array) {
    return Buffer.from(body);
  }
  if (typeof (body as { transformToByteArray?: unknown }).transformToByteArray === "function") {
    const bytes = await (body as { transformToByteArray: () => Promise<Uint8Array> }).transformToByteArray();
    return Buffer.from(bytes);
  }
  if (typeof (body as { arrayBuffer?: unknown }).arrayBuffer === "function") {
    const bytes = await (body as { arrayBuffer: () => Promise<ArrayBuffer> }).arrayBuffer();
    return Buffer.from(bytes);
  }
  if (body instanceof Readable || typeof (body as { on?: unknown }).on === "function") {
    const chunks: Buffer[] = [];
    for await (const chunk of body as AsyncIterable<Buffer | Uint8Array | string>) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }
  throw new NotFoundException("Attachment content could not be read from S3 storage.");
}
