"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { useAppLocale } from "@/components/app-locale-provider";
import { StatusMessage } from "@/components/common/status-message";
import { usePermissions } from "@/components/permissions/permission-provider";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { formatAppDateTime } from "@/lib/app-i18n";
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
import { LedgerActionDialog } from "@/components/ui-ledger/action-dialog";

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
  const { locale, tc } = useAppLocale();
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [notes, setNotes] = useState("");
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Attachment | null>(null);

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
          setError(loadError instanceof Error ? loadError.message : tc("Unable to load attachments."));
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
  }, [organizationId, linkedEntityId, linkedEntityType, canView, tc]);

  async function refresh() {
    const result = await apiRequest<Attachment[]>(attachmentListPath(linkedEntityType, linkedEntityId));
    setAttachments(result);
    setNoteDrafts(Object.fromEntries(result.map((item) => [item.id, item.notes ?? ""])));
  }

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) {
      setError(tc("Select a file to upload."));
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
      setSuccess(tc("Uploaded {filename}.", { filename: created.filename }));
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : tc("Unable to upload attachment."));
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
      setError(downloadError instanceof Error ? downloadError.message : tc("Unable to download attachment."));
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
      setSuccess(tc("Updated notes for {filename}.", { filename: updated.filename }));
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : tc("Unable to update attachment notes."));
    } finally {
      setActionLoading("");
    }
  }

  function remove(attachment: Attachment) {
    setDeleteTarget(attachment);
  }

  async function confirmRemove(attachment: Attachment) {
    setActionLoading(`delete-${attachment.id}`);
    setError("");
    setSuccess("");
    try {
      await apiRequest<Attachment>(`/attachments/${attachment.id}`, { method: "DELETE" });
      await refresh();
      setSuccess(tc("Deleted {filename}.", { filename: attachment.filename }));
      setDeleteTarget(null);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : tc("Unable to delete attachment."));
    } finally {
      setActionLoading("");
    }
  }

  if (!canView) {
    return null;
  }

  return (
    <>
      <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-ink">{tc(title)}</h2>
          <p className="mt-1 text-sm text-steel">{tc("Supporting files linked to this record.")}</p>
        </div>
        <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">{tc("{count} active", { count: attachments.length })}</span>
      </div>

      <div className="mt-4 space-y-3">
        {loading ? <StatusMessage type="loading">{tc("Loading attachments...")}</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {success ? <StatusMessage type="success">{success}</StatusMessage> : null}
      </div>

      {canUpload ? (
        <form onSubmit={(event) => void upload(event)} className="mt-4 grid grid-cols-1 gap-3 rounded-md bg-slate-50 p-3 md:grid-cols-[minmax(0,1fr)_minmax(220px,320px)_auto]">
          <input
            type="file"
            accept={attachmentAccept}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setFile(event.target.files?.[0] ?? null)}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
          />
          <input
            type="text"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder={tc("Notes")}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm"
          />
          <button
            type="submit"
            disabled={!file || actionLoading === "upload"}
            className="rounded-md bg-palm px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {actionLoading === "upload" ? tc("Uploading...") : tc("Upload")}
          </button>
        </form>
      ) : null}

      {attachments.length === 0 && !loading ? (
        <div className="mt-4">
          <StatusMessage type="empty">{tc("No attachments uploaded.")}</StatusMessage>
        </div>
      ) : null}

      {attachments.length > 0 ? (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[820px] text-start text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
              <tr>
                <th className="px-3 py-2">{tc("File")}</th>
                <th className="px-3 py-2">{tc("Type")}</th>
                <th className="px-3 py-2">{tc("Size")}</th>
                <th className="px-3 py-2">{tc("Uploaded")}</th>
                <th className="px-3 py-2">{tc("Notes")}</th>
                <th className="px-3 py-2">{tc("Actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {attachments.map((attachment) => (
                <tr key={attachment.id}>
                  <td className="px-3 py-2">
                    <div className="font-medium text-ink">{attachment.filename}</div>
                    <div className="font-mono text-xs text-steel">{attachment.contentHash.slice(0, 12)}</div>
                  </td>
                  <td className="px-3 py-2 text-steel">{tc(attachmentTypeLabel(attachment.mimeType))}</td>
                  <td className="px-3 py-2 font-mono text-xs">{formatAttachmentSize(attachment.sizeBytes)}</td>
                  <td className="px-3 py-2 text-steel">
                    <div>{formatAppDateTime(attachment.uploadedAt, locale, "-")}</div>
                    <div className="text-xs">{attachment.uploadedBy?.name ?? attachment.uploadedBy?.email ?? "-"}</div>
                  </td>
                  <td className="px-3 py-2">
                    {canManage ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={noteDrafts[attachment.id] ?? ""}
                          onChange={(event) => setNoteDrafts((current) => ({ ...current, [attachment.id]: event.target.value }))}
                          className="min-w-[180px] flex-1 rounded-md border border-slate-300 px-2 py-1 text-xs outline-none focus:border-palm"
                        />
                        <button
                          type="button"
                          onClick={() => void saveNotes(attachment)}
                          disabled={actionLoading === `notes-${attachment.id}`}
                          className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
                        >
                          {tc("Save")}
                        </button>
                      </div>
                    ) : (
                      <span className="text-steel">{attachment.notes ?? "-"}</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-2">
                      {canDownload ? (
                        <button
                          type="button"
                          onClick={() => void download(attachment)}
                          disabled={actionLoading === `download-${attachment.id}`}
                          className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
                        >
                          {tc("Download")}
                        </button>
                      ) : null}
                      {canDeleteAttachment(attachment, canDelete, allowDelete) ? (
                        <button
                          type="button"
                          onClick={() => void remove(attachment)}
                          disabled={actionLoading === `delete-${attachment.id}`}
                          className="rounded-md border border-rosewood px-2 py-1 text-xs font-medium text-rosewood hover:bg-red-50 disabled:cursor-not-allowed disabled:text-slate-400"
                        >
                          {tc("Delete")}
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      </div>

      <LedgerActionDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open && !actionLoading.startsWith("delete-")) {
            setDeleteTarget(null);
          }
        }}
        tone="danger"
        title={tc("Delete attachment")}
        description={deleteTarget ? tc("Delete attachment {filename}?", { filename: deleteTarget.filename }) : ""}
        confirmLabel={tc("Delete")}
        busy={deleteTarget ? actionLoading === `delete-${deleteTarget.id}` : false}
        onConfirm={async () => {
          if (deleteTarget) {
            await confirmRemove(deleteTarget);
          }
        }}
      />
    </>
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
