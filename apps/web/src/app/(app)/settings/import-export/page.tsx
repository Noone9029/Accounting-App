"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, FileSpreadsheet, RefreshCw, Upload } from "lucide-react";
import { StatusMessage } from "@/components/common/status-message";
import {
  LedgerAlert,
  LedgerButton,
  LedgerMetadataRow,
  LedgerPage,
  LedgerPageBody,
  LedgerPageHeader,
  LedgerPanel,
  LedgerStatCard,
  LedgerStatusBadge,
  LedgerSummaryBand,
} from "@/components/ui/ledger-system";
import { Textarea } from "@/components/ui/textarea";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiBaseUrl, apiRequest } from "@/lib/api";
import type { ImportEntityType, ImportJob, MigrationToolkitTemplatesResponse } from "@/lib/types";

const ENTITY_OPTIONS: Array<{ value: ImportEntityType; label: string }> = [
  { value: "CUSTOMERS", label: "Customers" },
  { value: "SUPPLIERS", label: "Suppliers" },
  { value: "PRODUCTS_SERVICES", label: "Products and services" },
  { value: "CHART_OF_ACCOUNTS", label: "Chart of accounts" },
];

export default function ImportExportSettingsPage() {
  const organizationId = useActiveOrganizationId();
  const [templates, setTemplates] = useState<MigrationToolkitTemplatesResponse | null>(null);
  const [jobs, setJobs] = useState<ImportJob[]>([]);
  const [selectedEntity, setSelectedEntity] = useState<ImportEntityType>("CUSTOMERS");
  const [csvContent, setCsvContent] = useState("name,displayName,email,phone,taxNumber,countryCode,isActive\nAcme Trading,Acme,accounts@example.test,+971500000000,,AE,true");
  const [preview, setPreview] = useState<ImportJob | null>(null);
  const [reviewed, setReviewed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!organizationId) {
      return;
    }
    void loadToolkit();
  }, [organizationId]);

  const selectedTemplate = useMemo(() => templates?.supportedImports.find((template) => template.entityType === selectedEntity), [selectedEntity, templates]);
  const previewErrorCount = preview?.validationIssues.filter((issue) => issue.severity === "ERROR").length ?? 0;
  const canCommit = Boolean(preview && preview.status === "READY_FOR_REVIEW" && previewErrorCount === 0 && reviewed);

  async function loadToolkit() {
    setLoading(true);
    setError("");
    try {
      const [templateResponse, jobResponse] = await Promise.all([
        apiRequest<MigrationToolkitTemplatesResponse>("/migration-toolkit/templates"),
        apiRequest<ImportJob[]>("/migration-toolkit/import-jobs"),
      ]);
      setTemplates(templateResponse);
      setJobs(jobResponse);
      setPreview((current) => current ?? jobResponse[0] ?? null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load import and export toolkit.");
    } finally {
      setLoading(false);
    }
  }

  async function createPreview() {
    setLoading(true);
    setError("");
    setReviewed(false);
    try {
      const result = await apiRequest<ImportJob>("/migration-toolkit/import-jobs", {
        method: "POST",
        body: {
          entityType: selectedEntity,
          filename: `${selectedEntity.toLowerCase()}-preview.csv`,
          csvContent,
          previewOnly: true,
        },
      });
      setPreview(result);
      setJobs((current) => [result, ...current.filter((job) => job.id !== result.id)]);
    } catch (previewError) {
      setError(previewError instanceof Error ? previewError.message : "Unable to create import preview.");
    } finally {
      setLoading(false);
    }
  }

  async function commitPreview() {
    if (!preview) {
      return;
    }
    setLoading(true);
    setError("");
    try {
      const result = await apiRequest<ImportJob>(`/migration-toolkit/import-jobs/${preview.id}/commit`, {
        method: "POST",
        body: { confirmReviewed: true },
      });
      setPreview(result);
      setJobs((current) => [result, ...current.filter((job) => job.id !== result.id)]);
    } catch (commitError) {
      setError(commitError instanceof Error ? commitError.message : "Unable to commit import preview.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <LedgerPage>
      <LedgerPageHeader
        eyebrow="Migration toolkit"
        title="Import and export"
        badge={<LedgerStatusBadge tone="warning">Local CSV only</LedgerStatusBadge>}
        description="Local master-data CSV templates, preview validation, guarded import commits, and safe exports for accountants preparing migrations."
        actions={<LedgerButton icon={RefreshCw} onClick={() => void loadToolkit()} disabled={loading}>Refresh</LedgerButton>}
      />

      <LedgerPageBody>
        <LedgerSummaryBand tone="warning">
          This toolkit does not upload to external providers, run hosted migrations, import posted accounting transactions, store bank credentials, or prove production recovery. Review is required before any local commit.
        </LedgerSummaryBand>

        {!organizationId ? <StatusMessage type="info">Log in and select an organization to use local import/export tools.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading import/export toolkit...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(340px,0.7fr)]">
          <LedgerPanel>
            <div className="flex items-start gap-3">
              <FileSpreadsheet className="mt-1 h-5 w-5 text-palm" aria-hidden="true" />
              <div>
                <h2 className="text-base font-semibold text-ink">Preview import</h2>
                <p className="mt-1 text-sm leading-6 text-steel">Paste a local CSV, review row validation, then commit only clean master-data rows after explicit approval.</p>
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-[220px_minmax(0,1fr)]">
              <label className="text-sm font-medium text-ink" htmlFor="import-entity">Import type</label>
              <select
                id="import-entity"
                className="rounded-md border border-line bg-white px-3 py-2 text-sm text-ink"
                value={selectedEntity}
                onChange={(event) => setSelectedEntity(event.target.value as ImportEntityType)}
              >
                {ENTITY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>

              <label className="text-sm font-medium text-ink" htmlFor="csv-content">CSV content</label>
              <Textarea id="csv-content" value={csvContent} onChange={(event) => setCsvContent(event.target.value)} rows={8} />
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <LedgerButton icon={Upload} onClick={() => void createPreview()} disabled={loading || !organizationId}>Preview CSV</LedgerButton>
              <LedgerButton icon={Download} variant="secondary" href={`${apiBaseUrl}/migration-toolkit/templates/${selectedEntity}.csv`}>Download template</LedgerButton>
              <LedgerButton icon={Download} variant="secondary" href={`${apiBaseUrl}/migration-toolkit/exports/${selectedEntity}.csv`}>Export CSV</LedgerButton>
            </div>

            {selectedTemplate ? (
              <div className="mt-4 rounded-md border border-line bg-mist p-3">
                <p className="text-sm font-semibold text-ink">{selectedTemplate.label}</p>
                <p className="mt-1 break-words text-sm text-steel">Headers: {selectedTemplate.headers.join(", ")}</p>
                <ul className="mt-2 list-disc pl-5 text-sm text-steel">
                  {selectedTemplate.notes.map((note) => <li key={note}>{note}</li>)}
                </ul>
              </div>
            ) : null}

            {preview ? (
              <div className="mt-5 space-y-4">
                <div className="grid gap-3 sm:grid-cols-4">
                  <LedgerStatCard label="Rows" value={String(preview.rows.length)} />
                  <LedgerStatCard label="Errors" value={String(previewErrorCount)} />
                  <LedgerStatCard label="Status" value={preview.status.replace(/_/g, " ")} />
                  <LedgerStatCard label="Request ID" value={preview.requestId ?? "Not captured"} />
                </div>

                {preview.validationIssues.length ? (
                  <LedgerAlert tone="danger" title="Validation issues">
                    <ul className="list-disc pl-5">
                      {preview.validationIssues.map((issue) => (
                        <li key={issue.id}>Row {issue.rowNumber ?? "file"}: {issue.message}</li>
                      ))}
                    </ul>
                  </LedgerAlert>
                ) : (
                  <LedgerAlert tone="success" title="Ready for review">No blocking validation issues were returned. Confirm review before local commit.</LedgerAlert>
                )}

                <label className="flex items-center gap-2 text-sm font-medium text-ink">
                  <input type="checkbox" checked={reviewed} onChange={(event) => setReviewed(event.target.checked)} />
                  I reviewed the preview rows and understand this is a local master-data commit only.
                </label>
                <LedgerButton onClick={() => void commitPreview()} disabled={!canCommit || loading}>Commit reviewed local import</LedgerButton>
              </div>
            ) : null}
          </LedgerPanel>

          <LedgerPanel>
            <h2 className="text-base font-semibold text-ink">Safety boundaries</h2>
            <div className="mt-4">
              <LedgerMetadataRow
                items={[
                  { label: "External provider upload", value: "Not implemented" },
                  { label: "Posted transactions", value: "Unsupported" },
                  { label: "Hosted production migration", value: "Unproven" },
                  { label: "Commit behavior", value: "Explicit reviewed local action" },
                  { label: "CSV injection protection", value: "Enabled on exports" },
                ]}
              />
            </div>

            <div className="mt-5">
              <h3 className="text-sm font-semibold text-ink">Recent import jobs</h3>
              <div className="mt-3 space-y-2">
                {jobs.length === 0 ? <p className="text-sm text-steel">No import jobs loaded.</p> : null}
                {jobs.slice(0, 5).map((job) => (
                  <button key={job.id} type="button" onClick={() => setPreview(job)} className="w-full rounded-md border border-line bg-white p-3 text-left">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold text-ink">{job.filename}</span>
                      <LedgerStatusBadge tone={job.status === "COMMITTED_LOCAL" ? "success" : "warning"}>{job.status.replace(/_/g, " ")}</LedgerStatusBadge>
                    </div>
                    <p className="mt-1 text-xs text-steel">{job.entityType.replace(/_/g, " ")} · {job.rows.length} rows</p>
                  </button>
                ))}
              </div>
            </div>

            {templates ? (
              <div className="mt-5">
                <h3 className="text-sm font-semibold text-ink">Unsupported imports</h3>
                <ul className="mt-2 list-disc pl-5 text-sm text-steel">
                  {templates.unsupportedImports.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </div>
            ) : null}
          </LedgerPanel>
        </section>
      </LedgerPageBody>
    </LedgerPage>
  );
}
