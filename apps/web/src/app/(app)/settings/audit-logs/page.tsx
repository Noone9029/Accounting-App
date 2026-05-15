"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { usePermissions } from "@/components/permissions/permission-provider";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiBaseUrl, apiRequest, getAccessToken } from "@/lib/api";
import {
  auditActionLabel,
  auditEntityTypeLabel,
  auditLogSummary,
  auditRetentionDaysLabel,
  buildAuditLogExportPath,
  buildAuditLogQuery,
  retentionPreviewSummary,
  sanitizeMetadataForDisplay,
} from "@/lib/audit-logs";
import { PERMISSIONS } from "@/lib/permissions";
import type { AuditLogEntry, AuditLogListResponse, AuditLogRetentionPreview, AuditLogRetentionSettings } from "@/lib/types";

const defaultFilters = {
  action: "",
  entityType: "",
  actorUserId: "",
  search: "",
  from: "",
  to: "",
};

const defaultRetentionForm = {
  retentionDays: "2555",
  autoPurgeEnabled: false,
  exportBeforePurgeRequired: true,
};

export default function AuditLogsPage() {
  const organizationId = useActiveOrganizationId();
  const { can } = usePermissions();
  const canExport = can(PERMISSIONS.auditLogs.export);
  const canManageRetention = can(PERMISSIONS.auditLogs.manageRetention);
  const [filters, setFilters] = useState(defaultFilters);
  const [appliedFilters, setAppliedFilters] = useState(defaultFilters);
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [pagination, setPagination] = useState<AuditLogListResponse["pagination"] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<AuditLogEntry | null>(null);
  const [retentionSettings, setRetentionSettings] = useState<AuditLogRetentionSettings | null>(null);
  const [retentionPreview, setRetentionPreview] = useState<AuditLogRetentionPreview | null>(null);
  const [retentionForm, setRetentionForm] = useState(defaultRetentionForm);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [retentionLoading, setRetentionLoading] = useState(false);
  const [retentionSaving, setRetentionSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const listPath = useMemo(() => buildAuditLogQuery({ ...appliedFilters, limit: "100" }), [appliedFilters]);

  useEffect(() => {
    if (!organizationId) {
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError("");
    apiRequest<AuditLogListResponse>(listPath)
      .then((response) => {
        if (!cancelled) {
          setLogs(response.data);
          setPagination(response.pagination);
          setSelectedId(response.data[0]?.id ?? null);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load audit logs.");
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
  }, [listPath, organizationId]);

  useEffect(() => {
    if (!organizationId || !selectedId) {
      setSelected(null);
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    setError("");
    apiRequest<AuditLogEntry>(`/audit-logs/${selectedId}`)
      .then((log) => {
        if (!cancelled) {
          setSelected(log);
        }
      })
      .catch((detailError: unknown) => {
        if (!cancelled) {
          setError(detailError instanceof Error ? detailError.message : "Unable to load audit log detail.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setDetailLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId, organizationId]);

  useEffect(() => {
    if (!organizationId) {
      return;
    }
    let cancelled = false;
    setRetentionLoading(true);
    setError("");
    Promise.all([
      apiRequest<AuditLogRetentionSettings>("/audit-logs/retention-settings"),
      canManageRetention ? apiRequest<AuditLogRetentionPreview>("/audit-logs/retention-preview") : Promise.resolve(null),
    ])
      .then(([settings, preview]) => {
        if (!cancelled) {
          setRetentionSettings(settings);
          setRetentionPreview(preview);
          setRetentionForm({
            retentionDays: String(settings.retentionDays),
            autoPurgeEnabled: settings.autoPurgeEnabled,
            exportBeforePurgeRequired: settings.exportBeforePurgeRequired,
          });
        }
      })
      .catch((retentionError: unknown) => {
        if (!cancelled) {
          setError(retentionError instanceof Error ? retentionError.message : "Unable to load audit retention settings.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setRetentionLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [canManageRetention, organizationId]);

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAppliedFilters(filters);
  }

  function resetFilters() {
    setFilters(defaultFilters);
    setAppliedFilters(defaultFilters);
  }

  async function exportCsv() {
    if (!organizationId || !canExport) {
      return;
    }
    setExporting(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`${apiBaseUrl}${buildAuditLogExportPath(appliedFilters)}`, {
        headers: {
          authorization: `Bearer ${getAccessToken() ?? ""}`,
          "x-organization-id": organizationId,
          "cache-control": "no-store",
          pragma: "no-cache",
        },
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error(`Audit export failed with ${response.status}.`);
      }
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = readDownloadFilename(response.headers.get("content-disposition"));
      link.click();
      URL.revokeObjectURL(objectUrl);
      setNotice("Audit CSV export generated from the current filters.");
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : "Unable to export audit logs.");
    } finally {
      setExporting(false);
    }
  }

  async function saveRetentionSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManageRetention) {
      return;
    }
    setRetentionSaving(true);
    setError("");
    setNotice("");
    try {
      const settings = await apiRequest<AuditLogRetentionSettings>("/audit-logs/retention-settings", {
        method: "PATCH",
        body: {
          retentionDays: Number(retentionForm.retentionDays),
          autoPurgeEnabled: retentionForm.autoPurgeEnabled,
          exportBeforePurgeRequired: retentionForm.exportBeforePurgeRequired,
        },
      });
      const preview = await apiRequest<AuditLogRetentionPreview>("/audit-logs/retention-preview");
      setRetentionSettings(settings);
      setRetentionPreview(preview);
      setNotice("Audit retention settings saved. No audit logs were deleted.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save audit retention settings.");
    } finally {
      setRetentionSaving(false);
    }
  }

  return (
    <section>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-ink">Audit logs</h1>
        <p className="mt-1 text-sm text-steel">Review high-risk accounting, security, document, bank, inventory, and ZATCA actions.</p>
      </div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">Log in and select an organization to review audit logs.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading audit logs...</StatusMessage> : null}
        {retentionLoading ? <StatusMessage type="loading">Loading retention settings...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {notice ? <StatusMessage type="success">{notice}</StatusMessage> : null}
        <StatusMessage type="info">List/detail reads are not logged. CSV export and retention previews use sanitized metadata only.</StatusMessage>
      </div>

      <form onSubmit={applyFilters} className="mt-5 grid gap-3 rounded-md border border-slate-200 bg-white p-4 md:grid-cols-3 xl:grid-cols-6">
        <FilterInput label="Action" value={filters.action} onChange={(value) => setFilters((current) => ({ ...current, action: value }))} placeholder="COGS_POSTED" />
        <FilterInput label="Entity type" value={filters.entityType} onChange={(value) => setFilters((current) => ({ ...current, entityType: value }))} placeholder="SalesInvoice" />
        <FilterInput label="Actor user ID" value={filters.actorUserId} onChange={(value) => setFilters((current) => ({ ...current, actorUserId: value }))} placeholder="user id" />
        <FilterInput label="Search" value={filters.search} onChange={(value) => setFilters((current) => ({ ...current, search: value }))} placeholder="action, entity, actor" />
        <FilterInput label="From" type="date" value={filters.from} onChange={(value) => setFilters((current) => ({ ...current, from: value }))} />
        <FilterInput label="To" type="date" value={filters.to} onChange={(value) => setFilters((current) => ({ ...current, to: value }))} />
        <div className="flex flex-wrap items-end gap-2 md:col-span-3 xl:col-span-6">
          <button type="submit" className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-white">
            Apply filters
          </button>
          <button type="button" onClick={resetFilters} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-ink">
            Reset
          </button>
          {canExport ? (
            <button type="button" onClick={exportCsv} disabled={exporting} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-ink disabled:opacity-60">
              {exporting ? "Exporting..." : "Export CSV"}
            </button>
          ) : null}
          {pagination ? <span className="text-sm text-steel">{pagination.total} matching log{pagination.total === 1 ? "" : "s"}</span> : null}
        </div>
      </form>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <form onSubmit={saveRetentionSettings} className="rounded-md border border-slate-200 bg-white p-5">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-ink">Retention settings</h2>
            <p className="mt-1 text-sm text-steel">Retention is configuration-only. There is no automatic purge job in this release.</p>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <FilterInput
              label="Retention days"
              type="text"
              value={retentionForm.retentionDays}
              onChange={(value) => setRetentionForm((current) => ({ ...current, retentionDays: value }))}
              placeholder="2555"
              disabled={!canManageRetention}
            />
            <CheckboxInput
              label="Auto purge enabled"
              checked={retentionForm.autoPurgeEnabled}
              onChange={(checked) => setRetentionForm((current) => ({ ...current, autoPurgeEnabled: checked }))}
              disabled={!canManageRetention}
            />
            <CheckboxInput
              label="Export before purge"
              checked={retentionForm.exportBeforePurgeRequired}
              onChange={(checked) => setRetentionForm((current) => ({ ...current, exportBeforePurgeRequired: checked }))}
              disabled={!canManageRetention}
            />
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {canManageRetention ? (
              <button type="submit" disabled={retentionSaving} className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
                {retentionSaving ? "Saving..." : "Save retention settings"}
              </button>
            ) : (
              <span className="text-sm text-steel">Retention changes require audit retention management permission.</span>
            )}
            {retentionSettings ? <span className="text-sm text-steel">Current: {auditRetentionDaysLabel(retentionSettings.retentionDays)}</span> : null}
          </div>
          {retentionSettings?.warnings.map((warning) => (
            <p key={warning} className="mt-3 text-sm text-amber-700">
              {warning}
            </p>
          ))}
        </form>

        <section className="rounded-md border border-slate-200 bg-white p-5">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-ink">Retention preview</h2>
            <p className="mt-1 text-sm text-steel">Dry-run only. No audit logs are deleted from this panel.</p>
          </div>
          {canManageRetention && retentionPreview ? (
            <div className="grid gap-3 text-sm md:grid-cols-2">
              <Detail label="Cutoff date" value={formatDate(retentionPreview.cutoffDate)} />
              <Detail label="Older than cutoff" value={String(retentionPreview.logsOlderThanCutoff)} />
              <Detail label="Total audit logs" value={String(retentionPreview.totalAuditLogs)} />
              <Detail label="Dry run only" value={retentionPreview.dryRunOnly ? "Yes" : "No"} />
              <Detail label="Oldest log" value={formatOptionalDate(retentionPreview.oldestLogDate)} />
              <Detail label="Newest log" value={formatOptionalDate(retentionPreview.newestLogDate)} />
              <p className="md:col-span-2 text-sm text-steel">{retentionPreviewSummary(retentionPreview.logsOlderThanCutoff)}</p>
              {retentionPreview.warnings.map((warning) => (
                <p key={warning} className="md:col-span-2 text-sm text-amber-700">
                  {warning}
                </p>
              ))}
            </div>
          ) : (
            <StatusMessage type="info">Retention preview requires audit retention management permission.</StatusMessage>
          )}
        </section>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <section className="overflow-x-auto rounded-md border border-slate-200 bg-white">
          <div className="grid min-w-[760px] grid-cols-[170px_180px_160px_1fr] border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase text-slate-500">
            <div>Timestamp</div>
            <div>Actor</div>
            <div>Action</div>
            <div>Entity / summary</div>
          </div>
          {logs.map((log) => (
            <button
              key={log.id}
              type="button"
              onClick={() => setSelectedId(log.id)}
              className={`grid w-full min-w-[760px] grid-cols-[170px_180px_160px_1fr] items-start border-b border-slate-100 px-4 py-3 text-left text-sm hover:bg-slate-50 ${
                selectedId === log.id ? "bg-slate-50" : ""
              }`}
            >
              <span className="text-xs text-steel">{formatDate(log.createdAt)}</span>
              <span className="truncate text-steel">{actorLabel(log)}</span>
              <span className="font-medium text-ink">{auditActionLabel(log.action)}</span>
              <span className="min-w-0">
                <span className="block font-medium text-ink">{auditEntityTypeLabel(log.entityType)}</span>
                <span className="block truncate text-xs text-steel">{auditLogSummary(log.after, log.before)}</span>
              </span>
            </button>
          ))}
          {!loading && logs.length === 0 ? <div className="px-4 py-6 text-sm text-steel">No audit logs found.</div> : null}
        </section>

        <section className="rounded-md border border-slate-200 bg-white p-5">
          {detailLoading ? <StatusMessage type="loading">Loading audit detail...</StatusMessage> : null}
          {selected && !detailLoading ? (
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-semibold text-ink">{auditActionLabel(selected.action)}</h2>
                <p className="mt-1 text-sm text-steel">
                  {auditEntityTypeLabel(selected.entityType)} / {selected.entityId}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <Detail label="Actor" value={actorLabel(selected)} />
                <Detail label="Timestamp" value={formatDate(selected.createdAt)} />
                <Detail label="IP address" value={selected.ipAddress ?? "-"} />
                <Detail label="User agent" value={selected.userAgent ?? "-"} />
              </div>
              <MetadataBlock title="Before" value={selected.before} />
              <MetadataBlock title="After" value={selected.after} />
            </div>
          ) : null}
          {!selected && !detailLoading ? <StatusMessage type="empty">Select an audit log to inspect sanitized metadata.</StatusMessage> : null}
        </section>
      </div>
    </section>
  );
}

function FilterInput({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: "text" | "date";
  disabled?: boolean;
}) {
  return (
    <label className="text-sm">
      <span className="block text-xs font-semibold uppercase tracking-wide text-steel">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-ink disabled:bg-slate-100 disabled:text-slate-500"
      />
    </label>
  );
}

function CheckboxInput({
  label,
  checked,
  onChange,
  disabled = false,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm text-ink">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} disabled={disabled} className="h-4 w-4" />
      <span>{label}</span>
    </label>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-slate-50 px-3 py-2">
      <div className="text-xs uppercase tracking-wide text-steel">{label}</div>
      <div className="mt-1 break-words font-medium text-ink">{value}</div>
    </div>
  );
}

function MetadataBlock({ title, value }: { title: string; value: unknown }) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-steel">{title}</h3>
      <pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap rounded-md bg-slate-950 p-3 text-xs text-slate-50">
        {JSON.stringify(sanitizeMetadataForDisplay(value), null, 2)}
      </pre>
    </div>
  );
}

function actorLabel(log: AuditLogEntry): string {
  return log.actorUser ? `${log.actorUser.name} (${log.actorUser.email})` : log.actorUserId ?? "System";
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function formatOptionalDate(value: string | null): string {
  return value ? formatDate(value) : "-";
}

function readDownloadFilename(contentDisposition: string | null): string {
  const match = contentDisposition?.match(/filename="?([^";]+)"?/i);
  return match?.[1] ?? `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
}
