"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { ArchiveDocumentGuidance } from "@/components/documents/document-guidance";
import { usePermissions } from "@/components/permissions/permission-provider";
import {
  LedgerAlert,
  LedgerButton,
  LedgerDataTable,
  LedgerDate,
  LedgerEmptyState,
  LedgerFieldHelp,
  LedgerFieldLabel,
  LedgerFieldText,
  LedgerFilterBar,
  LedgerInput,
  LedgerLoadingState,
  LedgerPage,
  LedgerPageBody,
  LedgerPageHeader,
  LedgerSelect,
  LedgerStatusBadge,
  LedgerToolbar,
} from "@/components/ui/ledger-system";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import {
  GENERATED_DOCUMENT_TYPES,
  canCreateApGeneratedDocumentEmail,
  canDownloadGeneratedDocument,
  documentSourceTypeLabel,
  documentTypeLabel,
  generatedDocumentStatusBadgeClass,
  generatedDocumentStatusLabel,
} from "@/lib/documents";
import { apGeneratedDocumentOutboxPath } from "@/lib/email";
import { formatOptionalDate } from "@/lib/invoice-display";
import { downloadPdf, generatedDocumentDownloadPath } from "@/lib/pdf-download";
import { PERMISSIONS } from "@/lib/permissions";
import type { DocumentType, GeneratedDocument, GeneratedDocumentStatus } from "@/lib/types";

const documentTypes: Array<"" | DocumentType> = ["", ...GENERATED_DOCUMENT_TYPES];
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
    <LedgerPage>
      <LedgerPageHeader
        eyebrow="Document archive"
        title="Documents"
        badge={<LedgerStatusBadge tone="draft">Generated PDFs only</LedgerStatusBadge>}
        description={
          <>
            Generated PDF archive for invoices, receipts, statements, bills, debit notes, credit notes, and report PDFs.
            <span className="mt-1 block">Uploaded supporting attachments stay on each source record; this page is for generated PDF outputs only.</span>
          </>
        }
      />

      <ArchiveDocumentGuidance />

      <LedgerPageBody>
        {!organizationId ? <LedgerAlert tone="info">Log in and select an organization to load generated documents.</LedgerAlert> : null}
        {loading ? <LedgerLoadingState title="Loading generated documents" /> : null}
        {error ? <LedgerAlert tone="danger">{error}</LedgerAlert> : null}
        {success ? (
          <LedgerAlert tone="success">
            <span>{success}</span>{" "}
            <Link href="/settings/email-outbox" className="font-semibold underline underline-offset-2">
              Open email outbox
            </Link>
          </LedgerAlert>
        ) : null}

      <form onSubmit={loadDocuments}>
        <LedgerToolbar
          title="Archive filters"
          description="Filter by document type or generation status. Failed rows mean PDF generation did not complete; retry from the source record after correcting source data."
          actions={<LedgerButton type="submit" disabled={loading} variant="primary">Apply filters</LedgerButton>}
        >
          <LedgerFilterBar>
            <LedgerFieldLabel>
              <LedgerFieldText>Document type</LedgerFieldText>
              <LedgerSelect value={documentType} onChange={(event) => setDocumentType(event.target.value as "" | DocumentType)}>
            {documentTypes.map((type) => (
              <option key={type || "all"} value={type}>
                {type ? documentTypeLabel(type) : "All types"}
              </option>
            ))}
              </LedgerSelect>
            </LedgerFieldLabel>
            <LedgerFieldLabel>
              <LedgerFieldText>Status</LedgerFieldText>
              <LedgerSelect value={status} onChange={(event) => setStatus(event.target.value as "" | GeneratedDocumentStatus)}>
            {statuses.map((item) => (
              <option key={item || "all"} value={item}>
                {item ? generatedDocumentStatusLabel(item) : "All statuses"}
              </option>
            ))}
              </LedgerSelect>
            </LedgerFieldLabel>
          </LedgerFilterBar>
        </LedgerToolbar>
      </form>

      <LedgerDataTable minWidth="980px">
          <thead className="ledger-table-header">
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
                  <span className={`rounded-md px-2 py-1 text-xs font-semibold ${generatedDocumentStatusBadgeClass(document.status)}`}>{generatedDocumentStatusLabel(document.status)}</span>
                </td>
                <td className="px-4 py-3"><LedgerDate>{formatOptionalDate(document.generatedAt, "-")}</LedgerDate></td>
                <td className="px-4 py-3 font-mono text-xs">{formatBytes(document.sizeBytes)}</td>
                <td className="px-4 py-3">
                  <div className="flex min-w-[250px] flex-col gap-2">
                    {canDownloadGeneratedDocuments ? (
                      <GeneratedDocumentDownloadAction
                        document={document}
                        loading={downloadingId === document.id}
                        onDownload={() => void downloadDocument(document)}
                      />
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
        </LedgerDataTable>
        {documents.length === 0 && !loading ? (
          <LedgerEmptyState
            title="No generated documents found"
            description="Generate a PDF from an invoice, payment receipt, bill, debit note, credit note, customer or supplier statement, or report to create the first archive record."
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <LedgerButton href="/settings/documents">Review document settings</LedgerButton>
                <LedgerButton href="/settings/number-sequences">Review number sequences</LedgerButton>
              </div>
            }
          />
        ) : null}
      </LedgerPageBody>
    </LedgerPage>
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

interface GeneratedDocumentDownloadActionProps {
  document: GeneratedDocument;
  loading: boolean;
  onDownload: () => void;
}

export function GeneratedDocumentDownloadAction({ document, loading, onDownload }: GeneratedDocumentDownloadActionProps) {
  if (!canDownloadGeneratedDocument(document)) {
    return <span className="text-xs text-steel">PDF unavailable until generation succeeds</span>;
  }

  return (
    <LedgerButton type="button" onClick={onDownload} disabled={loading} size="sm">
      {loading ? "Downloading..." : "Download archived PDF"}
    </LedgerButton>
  );
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
      className="rounded-md border border-line bg-mist p-2"
    >
      <LedgerFieldLabel htmlFor={recipientInputId}>
        <LedgerFieldText>Recipient email</LedgerFieldText>
      </LedgerFieldLabel>
      <LedgerInput
        id={recipientInputId}
        type="email"
        required
        maxLength={320}
        autoComplete="off"
        value={recipientEmail}
        onChange={(event) => onRecipientChange(event.target.value)}
        placeholder="ap-review@example.test"
        className="text-xs"
        disabled={loading}
      />
      <LedgerFieldHelp>Local mock outbox only. No real email or provider send. PDF body is not shown.</LedgerFieldHelp>
      <LedgerButton type="submit" disabled={loading} className="mt-2 w-full" size="sm" variant="primary">
        {loading ? "Creating local outbox..." : "Create local email outbox"}
      </LedgerButton>
    </form>
  );
}

function formatBytes(value: number): string {
  if (value < 1024) {
    return `${value} B`;
  }
  return `${(value / 1024).toFixed(1)} KB`;
}
