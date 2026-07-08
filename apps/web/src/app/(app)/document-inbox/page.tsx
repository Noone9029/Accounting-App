"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { CheckCircle2, FileSearch, RefreshCw, Upload, XCircle } from "lucide-react";
import { StatusMessage } from "@/components/common/status-message";
import { usePermissions } from "@/components/permissions/permission-provider";
import {
  LedgerActionBar,
  LedgerAlert,
  LedgerButton,
  LedgerEmptyState,
  LedgerFieldHelp,
  LedgerFieldLabel,
  LedgerFieldText,
  LedgerInput,
  LedgerPage,
  LedgerPageBody,
  LedgerPageHeader,
  LedgerPanel,
  LedgerSelect,
  LedgerStatusBadge,
  LedgerSummaryBand,
} from "@/components/ui/ledger-system";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { PERMISSIONS } from "@/lib/permissions";

type DocumentInboxStatus = "UPLOADED" | "EXTRACTION_DISABLED" | "EXTRACTION_FAILED" | "REVIEW_REQUIRED" | "REVIEWED" | "REJECTED";
type DocumentInboxSourceType = "BILL" | "RECEIPT" | "OTHER";
type DocumentReviewDecisionType = "MARK_REVIEWED" | "REJECT" | "CREATE_DRAFT_PURCHASE_BILL" | "CREATE_DRAFT_CASH_EXPENSE";

type DocumentInboxItem = {
  id: string;
  attachmentId: string;
  sourceType: DocumentInboxSourceType;
  status: DocumentInboxStatus;
  title: string;
  supplierName?: string | null;
  documentDate?: string | null;
  currency?: string | null;
  totalAmount?: string | number | null;
  taxAmount?: string | number | null;
  notes?: string | null;
  createdAt: string;
  reviewedAt?: string | null;
  reviewRequired?: boolean;
  provider?: string;
  providerConfigured?: boolean;
  conservativeCopy?: string;
  attachment?: {
    filename: string;
    originalFilename: string;
    mimeType: string;
    sizeBytes: number;
  };
  extractionResults?: Array<{
    id: string;
    provider: string;
    status: string;
    confidence?: string | number | null;
    blockers: string[];
    createdAt: string;
  }>;
  reviewDecisions?: Array<{
    id: string;
    decisionType: DocumentReviewDecisionType;
    targetType?: string | null;
    reviewerNote?: string | null;
    reviewedAt: string;
  }>;
};

const statuses: Array<"" | DocumentInboxStatus> = ["", "UPLOADED", "EXTRACTION_DISABLED", "EXTRACTION_FAILED", "REVIEW_REQUIRED", "REVIEWED", "REJECTED"];
const sourceTypes: Array<"" | DocumentInboxSourceType> = ["", "BILL", "RECEIPT", "OTHER"];

export default function DocumentInboxPage() {
  const organizationId = useActiveOrganizationId();
  const { can } = usePermissions();
  const canUpload = can(PERMISSIONS.documentInbox.upload);
  const canReview = can(PERMISSIONS.documentInbox.review);
  const [items, setItems] = useState<DocumentInboxItem[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [status, setStatus] = useState<"" | DocumentInboxStatus>("");
  const [sourceType, setSourceType] = useState<"" | DocumentInboxSourceType>("");
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!organizationId) {
      return;
    }
    void loadItems();
  }, [organizationId]);

  const selected = useMemo(() => items.find((item) => item.id === selectedId) ?? items[0] ?? null, [items, selectedId]);
  const openCount = items.filter((item) => item.status === "UPLOADED" || item.status === "REVIEW_REQUIRED" || item.status === "EXTRACTION_DISABLED" || item.status === "EXTRACTION_FAILED").length;

  async function loadItems(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const query = new URLSearchParams();
      if (status) {
        query.set("status", status);
      }
      if (sourceType) {
        query.set("sourceType", sourceType);
      }
      const suffix = query.toString();
      const result = await apiRequest<DocumentInboxItem[]>(`/document-inbox${suffix ? `?${suffix}` : ""}`);
      setItems(result);
      setSelectedId((current) => (current && result.some((item) => item.id === current) ? current : result[0]?.id ?? ""));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load document inbox.");
    } finally {
      setLoading(false);
    }
  }

  async function createInboxItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canUpload) {
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);
    setActionLoading("create");
    setError("");
    setSuccess("");

    try {
      const created = await apiRequest<DocumentInboxItem>("/document-inbox", {
        method: "POST",
        body: {
          attachmentId: String(formData.get("attachmentId") ?? "").trim(),
          title: String(formData.get("title") ?? "").trim(),
          sourceType: String(formData.get("sourceType") ?? "BILL"),
          notes: String(formData.get("notes") ?? "").trim() || undefined,
        },
      });
      form.reset();
      setItems((current) => [created, ...current.filter((item) => item.id !== created.id)]);
      setSelectedId(created.id);
      setSuccess("Document inbox item created. Extraction remains disabled unless a provider is configured.");
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Unable to create document inbox item.");
    } finally {
      setActionLoading("");
    }
  }

  async function refreshSelected(itemId: string) {
    const refreshed = await apiRequest<DocumentInboxItem>(`/document-inbox/${itemId}`);
    setItems((current) => current.map((item) => (item.id === refreshed.id ? refreshed : item)));
    setSelectedId(refreshed.id);
    return refreshed;
  }

  async function extract(itemId: string) {
    if (!canReview) {
      return;
    }
    setActionLoading("extract");
    setError("");
    setSuccess("");
    try {
      const updated = await apiRequest<DocumentInboxItem>(`/document-inbox/${itemId}/extract`, { method: "POST", body: {} });
      setItems((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setSuccess(updated.providerConfigured ? "Extraction result created. Review required before posting." : "Provider not configured. Review required before any draft action.");
    } catch (extractError) {
      setError(extractError instanceof Error ? extractError.message : "Unable to run extraction.");
    } finally {
      setActionLoading("");
    }
  }

  async function review(itemId: string, decisionType: DocumentReviewDecisionType, reviewerNote?: string) {
    if (!canReview) {
      return;
    }
    setActionLoading(decisionType);
    setError("");
    setSuccess("");
    try {
      await apiRequest<DocumentInboxItem>(`/document-inbox/${itemId}/review`, {
        method: "POST",
        body: { decisionType, reviewerNote },
      });
      const updated = await refreshSelected(itemId);
      setSuccess(
        decisionType === "REJECT"
          ? "Document rejected. No bill or cash expense was created."
          : updated.reviewDecisions?.[0]?.targetType
            ? `Review decision recorded for draft ${updated.reviewDecisions[0].targetType}.`
            : "Document marked reviewed.",
      );
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : "Unable to record review decision.");
    } finally {
      setActionLoading("");
    }
  }

  return (
    <LedgerPage>
      <LedgerPageHeader
        eyebrow="Payables capture"
        title="Document inbox"
        badge={<LedgerStatusBadge tone="warning">Review required</LedgerStatusBadge>}
        description="Uploaded bills and receipts are reviewed here before any draft bill or cash expense action. OCR is beta readiness and disabled unless a provider is explicitly configured."
        actions={<LedgerButton icon={RefreshCw} onClick={() => void loadItems()} disabled={loading}>Refresh</LedgerButton>}
      />

      <LedgerPageBody>
        <LedgerSummaryBand tone="warning">
          No provider call, posting, tax filing, or customer-data processing runs by default. Use this queue to inspect immutable attachments, extraction confidence, and accountant decisions.
        </LedgerSummaryBand>

        {!organizationId ? <StatusMessage type="info">Log in and select an organization to review the document inbox.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading document inbox...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {success ? <StatusMessage type="success">{success}</StatusMessage> : null}

        <section className="grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(420px,1.25fr)]">
          <div className="space-y-4">
            <LedgerPanel>
              <form onSubmit={loadItems} className="grid gap-3 sm:grid-cols-3">
                <LedgerFieldLabel>
                  <LedgerFieldText>Status</LedgerFieldText>
                  <LedgerSelect value={status} onChange={(event) => setStatus(event.target.value as "" | DocumentInboxStatus)}>
                    {statuses.map((value) => (
                      <option key={value || "all"} value={value}>{value ? statusLabel(value) : "All statuses"}</option>
                    ))}
                  </LedgerSelect>
                </LedgerFieldLabel>
                <LedgerFieldLabel>
                  <LedgerFieldText>Source</LedgerFieldText>
                  <LedgerSelect value={sourceType} onChange={(event) => setSourceType(event.target.value as "" | DocumentInboxSourceType)}>
                    {sourceTypes.map((value) => (
                      <option key={value || "all"} value={value}>{value ? sourceTypeLabel(value) : "All sources"}</option>
                    ))}
                  </LedgerSelect>
                </LedgerFieldLabel>
                <div className="flex items-end">
                  <LedgerButton type="submit" icon={FileSearch} variant="primary" disabled={loading}>Apply filters</LedgerButton>
                </div>
              </form>
              <div className="mt-3 text-xs text-steel">{openCount} open review items in the current filter.</div>
            </LedgerPanel>

            {canUpload ? (
              <LedgerPanel>
                <form onSubmit={createInboxItem} className="space-y-3">
                  <div>
                    <h2 className="text-base font-semibold text-ink">Intake from attachment</h2>
                    <p className="mt-1 text-sm leading-6 text-steel">Create an inbox row from an existing immutable attachment. The file itself stays attached to its original record.</p>
                  </div>
                  <LedgerFieldLabel>
                    <LedgerFieldText>Attachment ID</LedgerFieldText>
                    <LedgerInput name="attachmentId" required placeholder="Existing attachment UUID" />
                  </LedgerFieldLabel>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <LedgerFieldLabel>
                      <LedgerFieldText>Title</LedgerFieldText>
                      <LedgerInput name="title" required placeholder="Supplier receipt or bill title" />
                    </LedgerFieldLabel>
                    <LedgerFieldLabel>
                      <LedgerFieldText>Source type</LedgerFieldText>
                      <LedgerSelect name="sourceType" defaultValue="BILL">
                        <option value="BILL">Bill</option>
                        <option value="RECEIPT">Receipt</option>
                        <option value="OTHER">Other</option>
                      </LedgerSelect>
                    </LedgerFieldLabel>
                  </div>
                  <LedgerFieldLabel>
                    <LedgerFieldText>Notes</LedgerFieldText>
                    <LedgerInput name="notes" placeholder="Optional review note" />
                  </LedgerFieldLabel>
                  <LedgerButton type="submit" icon={Upload} variant="primary" disabled={actionLoading === "create"}>Create inbox item</LedgerButton>
                </form>
              </LedgerPanel>
            ) : null}

            <DocumentQueue items={items} selectedId={selected?.id ?? ""} onSelect={setSelectedId} />
          </div>

          <DocumentReviewPane
            item={selected}
            canReview={canReview}
            actionLoading={actionLoading}
            onExtract={extract}
            onReview={review}
          />
        </section>
      </LedgerPageBody>
    </LedgerPage>
  );
}

export function DocumentQueue({ items, selectedId, onSelect }: { items: DocumentInboxItem[]; selectedId: string; onSelect: (id: string) => void }) {
  if (items.length === 0) {
    return <LedgerEmptyState title="No document inbox items" description="Uploaded bills and receipts will appear here after an attachment is added to the review inbox." />;
  }

  return (
    <div className="overflow-hidden rounded-md border border-line bg-panel shadow-panel">
      <div className="border-b border-line px-4 py-3">
        <h2 className="text-base font-semibold text-ink">Review queue</h2>
        <p className="mt-1 text-sm text-steel">Select a row to inspect extraction fields and reviewer actions.</p>
      </div>
      <div className="divide-y divide-slate-100">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            className={`block w-full px-4 py-3 text-left transition-colors hover:bg-slate-50 ${item.id === selectedId ? "bg-blue-50/60" : "bg-white"}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-ink">{item.title}</div>
                <div className="mt-1 truncate text-xs text-steel">{item.supplierName || item.attachment?.originalFilename || item.attachmentId}</div>
              </div>
              <LedgerStatusBadge tone={statusTone(item.status)}>{statusLabel(item.status)}</LedgerStatusBadge>
            </div>
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-steel">
              <span>{sourceTypeLabel(item.sourceType)}</span>
              <span>{formatMoney(item.totalAmount, item.currency)}</span>
              <span>{formatDate(item.createdAt)}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function DocumentReviewPane({
  item,
  canReview,
  actionLoading,
  onExtract,
  onReview,
}: {
  item: DocumentInboxItem | null;
  canReview: boolean;
  actionLoading: string;
  onExtract: (itemId: string) => Promise<void>;
  onReview: (itemId: string, decisionType: DocumentReviewDecisionType, reviewerNote?: string) => Promise<void>;
}) {
  const [reviewerNote, setReviewerNote] = useState("");

  useEffect(() => {
    setReviewerNote("");
  }, [item?.id]);

  if (!item) {
    return <LedgerEmptyState title="Select a document" description="The review pane shows attachment preview metadata, extracted fields, confidence, and accountant actions." icon={FileSearch} />;
  }

  const latestExtraction = item.extractionResults?.[0];

  return (
    <LedgerPanel className="xl:sticky xl:top-4">
      <div className="flex flex-col gap-3 border-b border-line pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold text-ink">{item.title}</h2>
          <p className="mt-1 text-sm leading-6 text-steel">{item.conservativeCopy ?? "Extraction is beta readiness only. Review required before posting."}</p>
        </div>
        <LedgerStatusBadge tone={statusTone(item.status)}>{statusLabel(item.status)}</LedgerStatusBadge>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-ink">
            <FileSearch className="h-4 w-4 text-palm" aria-hidden="true" />
            Attachment preview
          </div>
          <dl className="mt-3 space-y-2 text-sm">
            <Metadata label="Filename" value={item.attachment?.originalFilename ?? item.attachment?.filename ?? "Attachment metadata unavailable"} />
            <Metadata label="MIME type" value={item.attachment?.mimeType ?? "-"} />
            <Metadata label="Size" value={item.attachment?.sizeBytes ? formatBytes(item.attachment.sizeBytes) : "-"} />
            <Metadata label="Attachment ID" value={item.attachmentId} monospace />
          </dl>
          <LedgerAlert tone={item.providerConfigured ? "info" : "warning"} title={item.providerConfigured ? "Provider configured" : "Provider not configured"}>
            {item.providerConfigured ? "Extraction still requires accountant review before a draft action." : "OCR is disabled unless configuration explicitly enables a provider."}
          </LedgerAlert>
        </div>

        <div className="space-y-4">
          <section>
            <h3 className="text-sm font-semibold text-ink">Extracted fields</h3>
            <dl className="mt-3 grid gap-2 sm:grid-cols-2">
              <Field label="Supplier" value={item.supplierName || "-"} />
              <Field label="Date" value={formatDate(item.documentDate)} />
              <Field label="Total" value={formatMoney(item.totalAmount, item.currency)} />
              <Field label="Tax" value={formatMoney(item.taxAmount, item.currency)} />
            </dl>
          </section>

          <section className="rounded-md border border-line p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-ink">Extraction confidence</h3>
                <p className="mt-1 text-xs leading-5 text-steel">Review required before posting or draft creation.</p>
              </div>
              <LedgerStatusBadge tone={latestExtraction?.confidence ? "info" : "warning"}>
                {latestExtraction?.confidence ? `${Math.round(Number(latestExtraction.confidence) * 100)}%` : "No extraction"}
              </LedgerStatusBadge>
            </div>
            {latestExtraction?.blockers?.length ? (
              <ul className="mt-3 list-disc space-y-1 pl-5 text-xs leading-5 text-amber-800">
                {latestExtraction.blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}
              </ul>
            ) : null}
          </section>

          <LedgerFieldLabel>
            <LedgerFieldText>Reviewer note</LedgerFieldText>
            <textarea
              value={reviewerNote}
              onChange={(event) => setReviewerNote(event.target.value)}
              rows={3}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-ink outline-none transition-colors placeholder:text-slate-400 focus:border-palm focus:ring-2 focus:ring-palm/10"
              placeholder="Add a note for the review decision"
            />
            <LedgerFieldHelp>Draft bill and cash expense actions record the target decision in this beta surface.</LedgerFieldHelp>
          </LedgerFieldLabel>

          <LedgerActionBar>
            <LedgerButton icon={RefreshCw} onClick={() => void onExtract(item.id)} disabled={!canReview || Boolean(actionLoading)}>
              {actionLoading === "extract" ? "Extracting..." : "Run extraction"}
            </LedgerButton>
            <LedgerButton icon={CheckCircle2} variant="primary" onClick={() => void onReview(item.id, "MARK_REVIEWED", reviewerNote)} disabled={!canReview || Boolean(actionLoading)}>
              Mark reviewed
            </LedgerButton>
            <LedgerButton onClick={() => void onReview(item.id, "CREATE_DRAFT_PURCHASE_BILL", reviewerNote)} disabled={!canReview || Boolean(actionLoading)}>
              Draft bill target
            </LedgerButton>
            <LedgerButton onClick={() => void onReview(item.id, "CREATE_DRAFT_CASH_EXPENSE", reviewerNote)} disabled={!canReview || Boolean(actionLoading)}>
              Cash expense target
            </LedgerButton>
            <LedgerButton icon={XCircle} variant="danger" onClick={() => void onReview(item.id, "REJECT", reviewerNote)} disabled={!canReview || Boolean(actionLoading)}>
              Reject
            </LedgerButton>
          </LedgerActionBar>
        </div>
      </div>
    </LedgerPanel>
  );
}

function Metadata({ label, value, monospace = false }: { label: string; value: string; monospace?: boolean }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-steel">{label}</dt>
      <dd className={`mt-1 break-words text-ink ${monospace ? "font-mono text-xs" : ""}`}>{value}</dd>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-mist px-3 py-2">
      <dt className="text-xs font-semibold uppercase tracking-wide text-steel">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-ink">{value}</dd>
    </div>
  );
}

function statusLabel(status: DocumentInboxStatus) {
  return status.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function sourceTypeLabel(sourceType: DocumentInboxSourceType) {
  return sourceType === "BILL" ? "Bill" : sourceType === "RECEIPT" ? "Receipt" : "Other";
}

function statusTone(status: DocumentInboxStatus): "neutral" | "success" | "warning" | "danger" | "info" | "draft" {
  if (status === "REVIEWED") {
    return "success";
  }
  if (status === "REJECTED" || status === "EXTRACTION_FAILED") {
    return "danger";
  }
  if (status === "REVIEW_REQUIRED" || status === "EXTRACTION_DISABLED") {
    return "warning";
  }
  return "draft";
}

function formatDate(value?: string | null) {
  if (!value) {
    return "-";
  }
  return new Intl.DateTimeFormat("en", { year: "numeric", month: "short", day: "2-digit" }).format(new Date(value));
}

function formatMoney(value?: string | number | null, currency?: string | null) {
  if (value === undefined || value === null || value === "") {
    return "-";
  }
  return `${currency ?? "SAR"} ${Number(value).toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatBytes(size: number) {
  if (size < 1024) {
    return `${size} B`;
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}
