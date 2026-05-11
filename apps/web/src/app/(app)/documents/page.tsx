"use client";

import { FormEvent, useEffect, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { formatOptionalDate } from "@/lib/invoice-display";
import { downloadPdf, generatedDocumentDownloadPath } from "@/lib/pdf-download";
import type { DocumentType, GeneratedDocument, GeneratedDocumentStatus } from "@/lib/types";

const documentTypes: Array<"" | DocumentType> = ["", "SALES_INVOICE", "CREDIT_NOTE", "CUSTOMER_PAYMENT_RECEIPT", "CUSTOMER_STATEMENT"];
const statuses: Array<"" | GeneratedDocumentStatus> = ["", "GENERATED", "FAILED", "SUPERSEDED"];

export default function GeneratedDocumentsPage() {
  const organizationId = useActiveOrganizationId();
  const [documents, setDocuments] = useState<GeneratedDocument[]>([]);
  const [documentType, setDocumentType] = useState<"" | DocumentType>("");
  const [status, setStatus] = useState<"" | GeneratedDocumentStatus>("");
  const [loading, setLoading] = useState(false);
  const [downloadingId, setDownloadingId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!organizationId) {
      return;
    }

    void loadDocuments();
  }, [organizationId]);

  async function loadDocuments(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setLoading(true);
    setError("");

    try {
      const query = new URLSearchParams();
      if (documentType) {
        query.set("documentType", documentType);
      }
      if (status) {
        query.set("status", status);
      }
      const suffix = query.toString();
      const result = await apiRequest<GeneratedDocument[]>(`/generated-documents${suffix ? `?${suffix}` : ""}`);
      setDocuments(result);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load generated documents.");
    } finally {
      setLoading(false);
    }
  }

  async function downloadDocument(document: GeneratedDocument) {
    setDownloadingId(document.id);
    setError("");
    try {
      await downloadPdf(generatedDocumentDownloadPath(document.id), document.filename);
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : "Unable to download generated document.");
    } finally {
      setDownloadingId("");
    }
  }

  return (
    <section>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-ink">Documents</h1>
        <p className="mt-1 text-sm text-steel">Generated PDF archive for invoices, receipts, and customer statements.</p>
      </div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">Log in and select an organization to load generated documents.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading generated documents...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
      </div>

      <form onSubmit={loadDocuments} className="mt-5 flex flex-wrap items-end gap-3 rounded-md border border-slate-200 bg-white p-4 shadow-panel">
        <label className="block">
          <span className="text-xs font-medium uppercase tracking-wide text-steel">Document type</span>
          <select value={documentType} onChange={(event) => setDocumentType(event.target.value as "" | DocumentType)} className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm">
            {documentTypes.map((type) => (
              <option key={type || "all"} value={type}>
                {type ? formatLabel(type) : "All types"}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-medium uppercase tracking-wide text-steel">Status</span>
          <select value={status} onChange={(event) => setStatus(event.target.value as "" | GeneratedDocumentStatus)} className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm">
            {statuses.map((item) => (
              <option key={item || "all"} value={item}>
                {item ? formatLabel(item) : "All statuses"}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" disabled={loading} className="rounded-md bg-palm px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400">
          Apply filters
        </button>
      </form>

      <div className="mt-5 overflow-x-auto rounded-md border border-slate-200 bg-white shadow-panel">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
            <tr>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Document number</th>
              <th className="px-4 py-3">Filename</th>
              <th className="px-4 py-3">Source</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Generated</th>
              <th className="px-4 py-3">Size</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {documents.map((document) => (
              <tr key={document.id}>
                <td className="px-4 py-3 text-steel">{formatLabel(document.documentType)}</td>
                <td className="px-4 py-3 font-mono text-xs">{document.documentNumber}</td>
                <td className="px-4 py-3 font-medium text-ink">{document.filename}</td>
                <td className="px-4 py-3 text-steel">{document.sourceType}</td>
                <td className="px-4 py-3 text-steel">{document.status}</td>
                <td className="px-4 py-3 text-steel">{formatOptionalDate(document.generatedAt, "-")}</td>
                <td className="px-4 py-3 font-mono text-xs">{formatBytes(document.sizeBytes)}</td>
                <td className="px-4 py-3">
                  <button type="button" onClick={() => void downloadDocument(document)} disabled={downloadingId === document.id} className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400">
                    {downloadingId === document.id ? "Downloading..." : "Download"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {documents.length === 0 && !loading ? (
          <div className="px-5 py-4">
            <StatusMessage type="empty">No generated documents found.</StatusMessage>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function formatLabel(value: string): string {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatBytes(value: number): string {
  if (value < 1024) {
    return `${value} B`;
  }
  return `${(value / 1024).toFixed(1)} KB`;
}
