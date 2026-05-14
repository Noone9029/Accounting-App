import { PERMISSIONS, type Permission } from "./permissions";
import type { Attachment, AttachmentLinkedEntityType } from "./types";

export const attachmentAccept = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "text/csv",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
].join(",");

export function attachmentDownloadPath(id: string): string {
  return `/attachments/${encodeURIComponent(id)}/download`;
}

export function attachmentListPath(linkedEntityType: AttachmentLinkedEntityType, linkedEntityId: string): string {
  const query = new URLSearchParams({ linkedEntityType, linkedEntityId });
  return `/attachments?${query.toString()}`;
}

export function attachmentTypeLabel(mimeType: string): string {
  switch (mimeType) {
    case "application/pdf":
      return "PDF";
    case "image/png":
      return "PNG image";
    case "image/jpeg":
      return "JPEG image";
    case "image/webp":
      return "WebP image";
    case "text/csv":
      return "CSV";
    case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
      return "Excel workbook";
    case "application/vnd.ms-excel":
      return "Excel";
    default:
      return mimeType || "File";
  }
}

export function formatAttachmentSize(sizeBytes: number): string {
  if (!Number.isFinite(sizeBytes) || sizeBytes < 0) {
    return "-";
  }
  if (sizeBytes < 1024) {
    return `${sizeBytes} B`;
  }
  const kb = sizeBytes / 1024;
  if (kb < 1024) {
    return `${trimSize(kb)} KB`;
  }
  return `${trimSize(kb / 1024)} MB`;
}

export function canUploadAttachment(hasPermission: boolean, allowUpload = true): boolean {
  return allowUpload && hasPermission;
}

export function canDeleteAttachment(attachment: Pick<Attachment, "status"> | null, hasPermission: boolean, allowDelete = true): boolean {
  return allowDelete && hasPermission && attachment?.status === "ACTIVE";
}

export function canManageAttachmentNotes(hasPermission: boolean): boolean {
  return hasPermission;
}

export const attachmentPanelPermissions = {
  view: PERMISSIONS.attachments.view,
  upload: PERMISSIONS.attachments.upload,
  download: PERMISSIONS.attachments.download,
  delete: PERMISSIONS.attachments.delete,
  manage: PERMISSIONS.attachments.manage,
} satisfies Record<string, Permission>;

function trimSize(value: number): string {
  return value >= 10 ? value.toFixed(1).replace(/\.0$/, "") : value.toFixed(2).replace(/0$/, "").replace(/\.0$/, "");
}
