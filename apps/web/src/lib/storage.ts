import type { BackupRestoreEvidenceStatus, BackupRestoreEvidenceType, ObjectStorageProviderName, S3ConfigReadiness, StorageReadinessSection } from "./types";

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

export function backupReadinessLabel(productionReady: boolean): string {
  return productionReady ? "Backup metadata review complete" : "Backup metadata review incomplete";
}

export function backupEvidenceTypeLabel(type: BackupRestoreEvidenceType): string {
  const labels: Record<BackupRestoreEvidenceType, string> = {
    DATABASE_BACKUP: "Database backup",
    POINT_IN_TIME_RECOVERY: "Point-in-time recovery",
    MIGRATION_HISTORY: "Migration history",
    OBJECT_STORAGE_BACKUP: "Object storage backup",
    GENERATED_DOCUMENT_BACKUP: "Generated document backup",
    ATTACHMENT_BACKUP: "Attachment backup",
    RESTORE_DRILL: "Restore drill",
    RESTORE_VERIFICATION: "Restore verification",
    RPO_RTO_REVIEW: "RPO/RTO review",
    OTHER: "Other evidence",
  };
  return labels[type] ?? type;
}

export function backupEvidenceStatusLabel(status: BackupRestoreEvidenceStatus): string {
  const labels: Record<BackupRestoreEvidenceStatus, string> = {
    DRAFT: "Draft",
    VERIFIED: "Verified",
    REVOKED: "Revoked",
    SUPERSEDED: "Superseded",
  };
  return labels[status] ?? status;
}

function trim(value: number): string {
  return value >= 10 ? value.toFixed(1).replace(/\.0$/, "") : value.toFixed(2).replace(/0$/, "").replace(/\.0$/, "");
}
