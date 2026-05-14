import type { ObjectStorageProviderName, S3ConfigReadiness, StorageReadinessSection } from "./types";

export function storageProviderLabel(provider: ObjectStorageProviderName | string): string {
  return provider === "s3" ? "S3-compatible object storage" : "Database storage";
}

export function storageReadinessLabel(section: Pick<StorageReadinessSection, "ready">): string {
  return section.ready ? "Ready" : "Not ready";
}

export function storageReadinessTone(section: Pick<StorageReadinessSection, "ready">): "success" | "warning" {
  return section.ready ? "success" : "warning";
}

export function formatStorageBytes(sizeBytes: number): string {
  if (!Number.isFinite(sizeBytes) || sizeBytes < 0) {
    return "-";
  }
  if (sizeBytes < 1024) {
    return `${sizeBytes} B`;
  }
  const kb = sizeBytes / 1024;
  if (kb < 1024) {
    return `${trim(kb)} KB`;
  }
  const mb = kb / 1024;
  if (mb < 1024) {
    return `${trim(mb)} MB`;
  }
  return `${trim(mb / 1024)} GB`;
}

export function s3ConfigRows(config: S3ConfigReadiness): Array<{ label: string; configured: boolean }> {
  return [
    { label: "Endpoint", configured: config.endpointConfigured },
    { label: "Region", configured: config.regionConfigured },
    { label: "Bucket", configured: config.bucketConfigured },
    { label: "Access key", configured: config.accessKeyConfigured },
    { label: "Secret key", configured: config.secretConfigured },
    { label: "Force path style", configured: config.forcePathStyle },
    { label: "Public base URL", configured: config.publicBaseUrlConfigured },
  ];
}

function trim(value: number): string {
  return value >= 10 ? value.toFixed(1).replace(/\.0$/, "") : value.toFixed(2).replace(/0$/, "").replace(/\.0$/, "");
}
