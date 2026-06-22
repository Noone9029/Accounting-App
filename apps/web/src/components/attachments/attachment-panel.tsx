"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { Download, Save, Trash2, Upload } from "lucide-react";
import { usePermissions } from "@/components/permissions/permission-provider";
import {
  LedgerButton,
  LedgerDataTable,
  LedgerEmptyState,
  LedgerErrorState,
  LedgerFieldLabel,
  LedgerFieldText,
  LedgerInput,
  LedgerLoadingState,
  LedgerPanel,
  LedgerStatusBadge,
  LedgerAlert,
} from "@/components/ui/ledger-system";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import {
  attachmentAccept,
  attachmentDownloadPath,
  attachmentListPath,
  attachmentTypeLabel,
  canDeleteAttachment,
  canManageAttachmentNotes,
  canUploadAttachment,
  formatAttachmentSize,
} from "@/lib/attachments";
import { downloadAuthenticatedFile } from "@/lib/pdf-download";
import { PERMISSIONS } from "@/lib/permissions";
import type { Attachment, AttachmentLinkedEntityType } from "@/lib/types";

interface AttachmentPanelProps {
  linkedEntityType: AttachmentLinkedEntityType;
  linkedEntityId: string;
  title?: string;
  allowUpload?: boolean;
  allowDelete?: boolean;
}

export function AttachmentPanel({
  linkedEntityType,
  linkedEntityId,
  title = "Attachments",
  allowUpload = true,
  allowDelete = true,
}: AttachmentPanelProps) {
  const organizationId = useActiveOrganizationId();
  const { can } = usePermissions();
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [notes, setNotes] = useState("");
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const canView = can(PERMISSIONS.attachments.view);
  const canUpload = canUploadAttachment(can(PERMISSIONS.attachments.upload), allowUpload);
  const canDownload = can(PERMISSIONS.attachments.download);
  const canDelete = can(PERMISSIONS.attachments.delete);
  const canManage = canManageAttachmentNotes(can(PERMISSIONS.attachments.manage));

  useEffect(() => {
    if (!organizationId || !linkedEntityId || !canView) {
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError("");
    apiRequest<Attachment[]>(attachmentListPath(linkedEntityType, linkedEntityId))
      .then((result) => {
        if (!cancelled) {
          setAttachments(result);
          setNoteDrafts(Object.fromEntries(result.map((item) => [item.id, item.notes ?? ""])));
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load attachments.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [organizationId, linkedEntityId, linkedEntityType, canView]);

  async function refresh() {
    const result = await apiRequest<Attachment[]>(attachmentListPath(linkedEntityType, linkedEntityId));
    setAttachments(result);
    setNoteDrafts(Object.fromEntries(result.map((item) => [item.id, item.notes ?? ""])));
  }

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) {
      setError("Select a file to upload.");
      return;
    }
    setActionLoading("upload");
    setError("");
    setSuccess("");
    try {
      const contentBase64 = await fileToBase64(file);
      const created = await apiRequest<Attachment>("/attachments", {
        method: "POST",
        body: {
          linkedEntityType,
          linkedEntityId,
          filename: file.name,
          mimeType: file.type || "application/octet-stream",
          contentBase64,
          notes: notes || undefined,
        },
      });
      setFile(null);
      setNotes("");
      await refresh();
      setSuccess(`Uploaded ${created.filename}.`);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Unable to upload attachment.");
    } finally {
      setActionLoading("");
    }
  }

  async function download(attachment: Attachment) {
    setActionLoading(`download-${attachment.id}`);
    setError("");
    setSuccess("");
    try {
      await downloadAuthenticatedFile(attachmentDownloadPath(attachment.id), attachment.filename);
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : "Unable to download attachment.");
    } finally {
      setActionLoading("");
    }
  }

  async function saveNotes(attachment: Attachment) {
    setActionLoading(`notes-${attachment.id}`);
    setError("");
    setSuccess("");
    try {
      const updated = await apiRequest<Attachment>(`/attachments/${attachment.id}`, {
        method: "PATCH",
        body: { notes: noteDrafts[attachment.id] ?? "" },
      });
      setAttachments((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setSuccess(`Updated notes for ${updated.filename}.`);
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Unable to update attachment notes.");
    } finally {
      setActionLoading("");
    }
  }

  async function remove(attachment: Attachment) {
    if (!window.confirm(`Delete attachment ${attachment.filename}?`)) {
      return;
    }
    setActionLoading(`delete-${attachment.id}`);
    setError("");
    setSuccess("");
    try {
      await apiRequest<Attachment>(`/attachments/${attachment.id}`, { method: "DELETE" });
      await refresh();
      setSuccess(`Deleted ${attachment.filename}.`);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unable to delete attachment.");
    } finally {
      setActionLoading("");
    }
  }

  if (!canView) {
    return null;
  }

  return (
    <LedgerPanel>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-ink">{title}</h2>
          <p className="mt-1 text-sm text-steel">Supporting files linked to this record.</p>
        </div>
        <LedgerStatusBadge tone="draft">{attachments.length} active</LedgerStatusBadge>
      </div>

      <div className="mt-4 space-y-3">
        {loading ? <LedgerLoadingState title="Loading attachments" /> : null}
        {error ? <LedgerErrorState title="Attachment action failed" description={error} /> : null}
        {success ? <LedgerAlert tone="success">{success}</LedgerAlert> : null}
      </div>

      {canUpload ? (
        <form onSubmit={(event) => void upload(event)} className="mt-4 grid grid-cols-1 gap-3 rounded-md bg-mist p-3 md:grid-cols-[minmax(0,1fr)_minmax(220px,320px)_auto]">
          <LedgerFieldLabel>
            <LedgerFieldText>File</LedgerFieldText>
            <LedgerInput
              type="file"
              accept={attachmentAccept}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setFile(event.target.files?.[0] ?? null)}
            />
          </LedgerFieldLabel>
          <LedgerFieldLabel>
            <LedgerFieldText>Notes</LedgerFieldText>
            <LedgerInput type="text" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Notes" />
          </LedgerFieldLabel>
          <div className="flex items-end">
            <LedgerButton type="submit" disabled={!file || actionLoading === "upload"} variant="primary" icon={Upload} className="w-full">
              {actionLoading === "upload" ? "Uploading..." : "Upload"}
            </LedgerButton>
          </div>
        </form>
      ) : null}

      {attachments.length === 0 && !loading ? (
        <div className="mt-4">
          <LedgerEmptyState title="No attachments uploaded" />
        </div>
      ) : null}

      {attachments.length > 0 ? (
        <div className="mt-4">
          <LedgerDataTable minWidth="820px">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
              <tr>
                <th className="px-3 py-2">File</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Size</th>
                <th className="px-3 py-2">Uploaded</th>
                <th className="px-3 py-2">Notes</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {attachments.map((attachment) => (
                <tr key={attachment.id}>
                  <td className="px-3 py-2">
                    <div className="font-medium text-ink">{attachment.filename}</div>
                    <div className="font-mono text-xs text-steel">{attachment.contentHash.slice(0, 12)}</div>
                  </td>
                  <td className="px-3 py-2 text-steel">{attachmentTypeLabel(attachment.mimeType)}</td>
                  <td className="px-3 py-2 font-mono text-xs">{formatAttachmentSize(attachment.sizeBytes)}</td>
                  <td className="px-3 py-2 text-steel">
                    <div>{new Date(attachment.uploadedAt).toLocaleString()}</div>
                    <div className="text-xs">{attachment.uploadedBy?.name ?? attachment.uploadedBy?.email ?? "-"}</div>
                  </td>
                  <td className="px-3 py-2">
                    {canManage ? (
                      <div className="flex gap-2">
                        <LedgerInput
                          type="text"
                          value={noteDrafts[attachment.id] ?? ""}
                          onChange={(event) => setNoteDrafts((current) => ({ ...current, [attachment.id]: event.target.value }))}
                          className="min-w-[180px] flex-1 px-2 py-1 text-xs"
                        />
                        <LedgerButton
                          type="button"
                          onClick={() => void saveNotes(attachment)}
                          disabled={actionLoading === `notes-${attachment.id}`}
                          size="sm"
                          icon={Save}
                        >
                          Save
                        </LedgerButton>
                      </div>
                    ) : (
                      <span className="text-steel">{attachment.notes ?? "-"}</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-2">
                      {canDownload ? (
                        <LedgerButton
                          type="button"
                          onClick={() => void download(attachment)}
                          disabled={actionLoading === `download-${attachment.id}`}
                          size="sm"
                          icon={Download}
                        >
                          Download
                        </LedgerButton>
                      ) : null}
                      {canDeleteAttachment(attachment, canDelete, allowDelete) ? (
                        <LedgerButton
                          type="button"
                          onClick={() => void remove(attachment)}
                          disabled={actionLoading === `delete-${attachment.id}`}
                          variant="danger"
                          size="sm"
                          icon={Trash2}
                        >
                          Delete
                        </LedgerButton>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </LedgerDataTable>
        </div>
      ) : null}
    </LedgerPanel>
  );
}

async function fileToBase64(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return window.btoa(binary);
}
