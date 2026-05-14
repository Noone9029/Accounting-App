import { Injectable, NotFoundException } from "@nestjs/common";
import { AttachmentStorageProvider } from "@prisma/client";

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

export abstract class AttachmentStorageService {
  abstract save(input: AttachmentStorageSaveInput): Promise<AttachmentStorageSaveResult>;
  abstract read(payload: StoredAttachmentPayload): Promise<Buffer>;
}

@Injectable()
export class DatabaseAttachmentStorageService extends AttachmentStorageService {
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
}
