export type ObjectStorageProviderName = "database" | "s3";

export interface SaveObjectInput {
  buffer: Buffer;
  key?: string | null;
  filename?: string | null;
  contentType?: string | null;
  contentHash?: string | null;
}

export interface SaveObjectResult {
  provider: ObjectStorageProviderName;
  storageKey?: string | null;
  contentBase64?: string | null;
}

export interface GetObjectInput {
  storageKey?: string | null;
  contentBase64?: string | null;
}

export interface DeleteObjectInput {
  storageKey?: string | null;
}

export interface StorageProviderReadiness {
  provider: ObjectStorageProviderName;
  ready: boolean;
  blockingReasons: string[];
  warnings: string[];
}

export abstract class StorageProvider {
  abstract readonly provider: ObjectStorageProviderName;
  abstract saveObject(input: SaveObjectInput): Promise<SaveObjectResult>;
  abstract getObject(input: GetObjectInput): Promise<Buffer>;
  abstract deleteObject(input: DeleteObjectInput): Promise<void>;
  getReadUrl?(_input: GetObjectInput): Promise<string | null>;
  abstract readiness(): StorageProviderReadiness;
}
