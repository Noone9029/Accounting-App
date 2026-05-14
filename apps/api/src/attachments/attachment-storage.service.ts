import { Injectable, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
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

  constructor(private readonly storageConfig: StorageConfigurationService) {
    super();
  }

  async save(_input: AttachmentStorageSaveInput): Promise<AttachmentStorageSaveResult> {
    throw new ServiceUnavailableException("S3 attachment storage is not enabled in this groundwork build.");
  }

  async read(_payload: StoredAttachmentPayload): Promise<Buffer> {
    throw new ServiceUnavailableException("S3 attachment storage is not enabled in this groundwork build.");
  }

  async deleteObject(_input: DeleteObjectInput): Promise<void> {
    throw new ServiceUnavailableException("S3 attachment storage is not enabled in this groundwork build.");
  }

  readiness() {
    return {
      provider: this.provider,
      ready: false,
      blockingReasons: [
        ...this.storageConfig.s3BlockingReasons(),
        "S3 attachment storage writes are not enabled in this groundwork build.",
      ],
      warnings: ["S3-compatible attachment storage is a stub only; no external upload is active."],
    };
  }
}
