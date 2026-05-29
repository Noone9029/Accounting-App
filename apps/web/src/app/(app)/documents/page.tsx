"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { StatusMessage } from "@/components/common/status-message";
import { ArchiveDocumentGuidance } from "@/components/documents/document-guidance";
import { usePermissions } from "@/components/permissions/permission-provider";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { canCreateApGeneratedDocumentEmail, documentSourceTypeLabel, documentTypeLabel, generatedDocumentStatusBadgeClass, generatedDocumentStatusLabel } from "@/lib/documents";
import { apGeneratedDocumentOutboxPath } from "@/lib/email";
import { formatOptionalDate } from "@/lib/invoice-display";
import { downloadPdf, generatedDocumentDownloadPath } from "@/lib/pdf-download";
import { PERMISSIONS } from "@/lib/permissions";
import type { DocumentType, GeneratedDocument, GeneratedDocumentStatus } from "@/lib/types";

const documentTypes: Array<"" | DocumentType> = [
  "",
  "SALES_INVOICE",
  "CREDIT_NOTE",
  "CUSTOMER_PAYMENT_RECEIPT",
  "CUSTOMER_REFUND",
  "CUSTOMER_STATEMENT",
  "SUPPLIER_STATEMENT",
  "PURCHASE_ORDER",
  "PURCHASE_BILL",
  "PURCHASE_DEBIT_NOTE",
  "SUPPLIER_PAYMENT_RECEIPT",
  "SUPPLIER_REFUND",
  "CASH_EXPENSE",
  "REPORT_GENERAL_LEDGER",
  "REPORT_TRIAL_BALANCE",
  "REPORT_PROFIT_AND_LOSS",
  "REPORT_BALANCE_SHEET",
  "REPORT_VAT_SUMMARY",
  "REPORT_AGED_RECEIVABLES",
  "REPORT_AGED_PAYABLES",
  "BANK_RECONCILIATION_REPORT",
];
const statuses: Array<"" | GeneratedDocumentStatus> = ["", "GENERATED", "FAILED", "SUPERSEDED"];

export default function GeneratedDocumentsPage() {
  const organizationId = useActiveOrganizationId();
  const { can } = usePermissions();
  const canDownloadGeneratedDocuments = can(PERMISSIONS.generatedDocuments.download);
  const [documents, setDocuments] = useState<GeneratedDocument[]>([]);
  const [documentType, setDocumentType] = useState<"" | DocumentType>("");
  const [status, setStatus] = useState<"" | GeneratedDocumentStatus>("");
  const [loading, setLoading] = useState(false);
  const [downloadingId, setDownloadingId] = useState("");
  const [apEmailLoadingId, setApEmailLoadingId] = useState("");
  const [apEmailRecipients, setApEmailRecipients] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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
    setSuccess("");

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
    if (!canDownloadGeneratedDocuments) {
      return;
    }

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

  async function createApGeneratedDocumentEmail(document: GeneratedDocument, recipientEmail: string) {
    if (!canCreateApGeneratedDocumentEmail(document, can)) {
      return;
    }

    setApEmailLoadingId(document.id);
    setError("");
    setSuccess("");

    try {
      const response = await apiRequest<ApGeneratedDocumentEmailResponse>(apGeneratedDocumentOutboxPath(document.id), {
        method: "POST",
        body: { recipientEmail },
      });
      setApEmailRecipients((current) => {
        const next = { ...current };
        delete next[document.id];
        return next;
      });
      setSuccess(`Local AP email outbox row created for ${document.documentNumber}. No real email was sent. Provider ${response.provider}. Review it in email outbox.`);
    } catch (emailError) {
      setError(emailError instanceof Error ? emailError.message : "Unable to create local AP email outbox row.");
    } finally {
      setApEmailLoadingId("");
    }
  }

  return (
    <section>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-ink">Documents</h1>
        <p className="mt-1 text-sm text-steel">Generated PDF archive for invoices, receipts, statements, bills, debit notes, credit notes, and report PDFs.</p>
        <p className="mt-1 text-sm text-steel">Uploaded supporting attachments stay on each source record; this page is for generated PDF outputs only.</p>
      </div>

      <ArchiveDocumentGuidance />

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">Log in and select an organization to load generated documents.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading generated documents...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {success ? (
          <StatusMessage type="success">
            <span>{success}</span>{" "}
            <Link href="/settings/email-outbox" className="font-semibold underline underline-offset-2">
              Open email outbox
            </Link>
          </StatusMessage>
        ) : null}
      </div>

      <form onSubmit={loadDocuments} className="mt-5 flex flex-wrap items-end gap-3 rounded-md border border-slate-200 bg-white p-4 shadow-panel">
        <label className="block">
          <span className="text-xs font-medium uppercase tracking-wide text-steel">Document type</span>
          <select value={documentType} onChange={(event) => setDocumentType(event.target.value as "" | DocumentType)} className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm">
            {documentTypes.map((type) => (
              <option key={type || "all"} value={type}>
                {type ? documentTypeLabel(type) : "All types"}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-medium uppercase tracking-wide text-steel">Status</span>
          <select value={status} onChange={(event) => setStatus(event.target.value as "" | GeneratedDocumentStatus)} className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm">
            {statuses.map((item) => (
              <option key={item || "all"} value={item}>
                {item ? generatedDocumentStatusLabel(item) : "All statuses"}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" disabled={loading} className="rounded-md bg-palm px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400">
          Apply filters
        </button>
        <p className="basis-full text-xs leading-5 text-steel">
          Filter by document type or generation status. Failed rows mean PDF generation did not complete; retry from the source record after correcting the source data.
        </p>
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
                <td className="px-4 py-3 text-steel">{documentTypeLabel(document.documentType)}</td>
                <td className="px-4 py-3 font-mono text-xs">{document.documentNumber}</td>
                <td className="px-4 py-3 font-medium text-ink">{document.filename}</td>
                <td className="px-4 py-3 text-steel">{documentSourceTypeLabel(document.sourceType)}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-md px-2 py-1 text-xs font-semibold ${generatedDocumentStatusBadgeClass(document.status)}`}>
                    {generatedDocumentStatusLabel(document.status)}
                  </span>
                </td>
                <td className="px-4 py-3 text-steel">{formatOptionalDate(document.generatedAt, "-")}</td>
                <td className="px-4 py-3 font-mono text-xs">{formatBytes(document.sizeBytes)}</td>
                <td className="px-4 py-3">
                  <div className="flex min-w-[250px] flex-col gap-2">
                    {canDownloadGeneratedDocuments ? (
                      <button type="button" onClick={() => void downloadDocument(document)} disabled={downloadingId === document.id} className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400">
                        {downloadingId === document.id ? "Downloading..." : "Download archived PDF"}
                      </button>
                    ) : (
                      <span className="text-xs text-steel">Download permission required</span>
                    )}
                    <GeneratedDocumentApEmailAction
                      document={document}
                      visible={canCreateApGeneratedDocumentEmail(document, can)}
                      recipientEmail={apEmailRecipients[document.id] ?? ""}
                      loading={apEmailLoadingId === document.id}
                      onRecipientChange={(recipientEmail) =>
                        setApEmailRecipients((current) => ({
                          ...current,
                          [document.id]: recipientEmail,
                        }))
                      }
                      onSubmit={(recipientEmail) => void createApGeneratedDocumentEmail(document, recipientEmail)}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {documents.length === 0 && !loading ? (
          <div className="px-5 py-4">
            <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-4">
              <StatusMessage type="empty">No generated documents found.</StatusMessage>
              <p className="mt-3 text-sm leading-6 text-steel">
                Generate a PDF from an invoice, payment receipt, bill, debit note, credit note, customer or supplier statement, or report to create the first archive record.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link href="/settings/documents" className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                  Review document settings
                </Link>
                <Link href="/settings/number-sequences" className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                  Review number sequences
                </Link>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

interface ApGeneratedDocumentEmailResponse {
  localOnly: boolean;
  noEmailSent: boolean;
  providerCalled: boolean;
  provider: string;
  emailOutbox?: {
    id: string;
    status: string;
    provider: string;
    attachmentFilename?: string | null;
    attachmentMimeType?: string | null;
    attachmentSizeBytes?: number | null;
    attachmentContentHash?: string | null;
  };
  redaction?: {
    noBodyReturned: boolean;
    noPdfBodyReturned: boolean;
    noAttachmentBodyReturned: boolean;
    noProviderPayload: boolean;
  };
}

interface GeneratedDocumentApEmailActionProps {
  document: GeneratedDocument;
  visible: boolean;
  recipientEmail: string;
  loading: boolean;
  onRecipientChange: (recipientEmail: string) => void;
  onSubmit: (recipientEmail: string) => void;
}

export function GeneratedDocumentApEmailAction({ document, visible, recipientEmail, loading, onRecipientChange, onSubmit }: GeneratedDocumentApEmailActionProps) {
  if (!visible) {
    return null;
  }

  const recipientInputId = `ap-email-recipient-${document.id}`;

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(recipientEmail.trim());
      }}
      className="rounded-md border border-teal-100 bg-teal-50/60 p-2"
    >
      <label htmlFor={recipientInputId} className="block text-xs font-medium text-slate-700">
        Recipient email
      </label>
      <input
        id={recipientInputId}
        type="email"
        required
        maxLength={320}
        autoComplete="off"
        value={recipientEmail}
        onChange={(event) => onRecipientChange(event.target.value)}
        placeholder="ap-review@example.test"
        className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-xs outline-none focus:border-palm disabled:bg-slate-50"
        disabled={loading}
      />
      <p className="mt-1 text-xs leading-5 text-steel">Local mock outbox only. No real email or provider send. PDF body is not shown.</p>
      <button type="submit" disabled={loading} className="mt-2 w-full rounded-md bg-palm px-2 py-1 text-xs font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400">
        {loading ? "Creating local outbox..." : "Create local email outbox"}
      </button>
    </form>
  );
}

function formatBytes(value: number): string {
  if (value < 1024) {
    return `${value} B`;
  }
  return `${(value / 1024).toFixed(1)} KB`;
}
