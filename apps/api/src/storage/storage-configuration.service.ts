import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { ObjectStorageProviderName } from "./storage-provider";

export interface S3ConfigStatus {
  endpointConfigured: boolean;
  regionConfigured: boolean;
  bucketConfigured: boolean;
  accessKeyConfigured: boolean;
  secretConfigured: boolean;
  forcePathStyle: boolean;
  publicBaseUrlConfigured: boolean;
}

@Injectable()
export class StorageConfigurationService {
  constructor(private readonly configService: ConfigService) {}

  get attachmentProvider(): ObjectStorageProviderName {
    return normalizeProvider(this.configService.get<string>("ATTACHMENT_STORAGE_PROVIDER"));
  }

  get generatedDocumentProvider(): ObjectStorageProviderName {
    return normalizeProvider(this.configService.get<string>("GENERATED_DOCUMENT_STORAGE_PROVIDER"));
  }

  get attachmentMaxSizeMb(): number {
    const raw = Number(this.configService.get<string>("ATTACHMENT_MAX_SIZE_MB") ?? "10");
    return Number.isFinite(raw) && raw > 0 ? raw : 10;
  }

  get s3Status(): S3ConfigStatus {
    return {
      endpointConfigured: Boolean(clean(this.configService.get<string>("S3_ENDPOINT"))),
      regionConfigured: Boolean(clean(this.configService.get<string>("S3_REGION"))),
      bucketConfigured: Boolean(clean(this.configService.get<string>("S3_BUCKET"))),
      accessKeyConfigured: Boolean(clean(this.configService.get<string>("S3_ACCESS_KEY_ID"))),
      secretConfigured: Boolean(clean(this.configService.get<string>("S3_SECRET_ACCESS_KEY"))),
      forcePathStyle: parseBoolean(this.configService.get<string>("S3_FORCE_PATH_STYLE"), true),
      publicBaseUrlConfigured: Boolean(clean(this.configService.get<string>("S3_PUBLIC_BASE_URL"))),
    };
  }

  get s3Endpoint(): string {
    return clean(this.configService.get<string>("S3_ENDPOINT"));
  }

  get s3Region(): string {
    return clean(this.configService.get<string>("S3_REGION"));
  }

  get s3Bucket(): string {
    return clean(this.configService.get<string>("S3_BUCKET"));
  }

  get s3AccessKeyId(): string {
    return clean(this.configService.get<string>("S3_ACCESS_KEY_ID"));
  }

  get s3SecretAccessKey(): string {
    return clean(this.configService.get<string>("S3_SECRET_ACCESS_KEY"));
  }

  get s3ForcePathStyle(): boolean {
    return parseBoolean(this.configService.get<string>("S3_FORCE_PATH_STYLE"), true);
  }

  s3BlockingReasons(): string[] {
    const status = this.s3Status;
    const reasons: string[] = [];
    if (!status.endpointConfigured) reasons.push("S3_ENDPOINT is not configured.");
    if (!status.regionConfigured) reasons.push("S3_REGION is not configured.");
    if (!status.bucketConfigured) reasons.push("S3_BUCKET is not configured.");
    if (!status.accessKeyConfigured) reasons.push("S3_ACCESS_KEY_ID is not configured.");
    if (!status.secretConfigured) reasons.push("S3_SECRET_ACCESS_KEY is not configured.");
    return reasons;
  }
}

function normalizeProvider(value?: string | null): ObjectStorageProviderName {
  return value?.trim().toLowerCase() === "s3" ? "s3" : "database";
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value.trim() === "") {
    return fallback;
  }
  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

function clean(value?: string | null): string {
  return value?.trim() ?? "";
}
