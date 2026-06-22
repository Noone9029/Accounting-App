"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { usePermissions } from "@/components/permissions/permission-provider";
import {
  LedgerAlert,
  LedgerButton,
  LedgerEmptyState,
  LedgerFieldLabel,
  LedgerFieldText,
  LedgerInput,
  LedgerLoadingState,
  LedgerMetadataRow,
  LedgerPage,
  LedgerPageBody,
  LedgerPageHeader,
  LedgerPanel,
  LedgerToolbar,
} from "@/components/ui/ledger-system";
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
    <LedgerPage>
      <LedgerPageHeader
        eyebrow="Administration"
        title="Audit logs"
        description="Review high-risk accounting, security, document, bank, inventory, and ZATCA actions."
      />

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">Log in and select an organization to review audit logs.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading audit logs...</StatusMessage> : null}
        {retentionLoading ? <StatusMessage type="loading">Loading retention settings...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {notice ? <StatusMessage type="success">{notice}</StatusMessage> : null}
        <StatusMessage type="info">List/detail reads are not logged. CSV export and retention previews use sanitized metadata only.</StatusMessage>
      </div>

      <form onSubmit={applyFilters}>
        <LedgerToolbar
          title="Filter evidence"
          description="Filters drive both the on-screen log list and the CSV export."
          actions={
            <>
              <LedgerButton type="submit" variant="primary">
                Apply filters
              </LedgerButton>
              <LedgerButton type="button" onClick={resetFilters}>
                Reset
              </LedgerButton>
              {canExport ? (
                <LedgerButton type="button" onClick={exportCsv} disabled={exporting}>
                  {exporting ? "Exporting..." : "Export CSV"}
                </LedgerButton>
              ) : null}
            </>
          }
        >
          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
            <FilterInput label="Action" value={filters.action} onChange={(value) => setFilters((current) => ({ ...current, action: value }))} placeholder="COGS_POSTED" />
            <FilterInput label="Entity type" value={filters.entityType} onChange={(value) => setFilters((current) => ({ ...current, entityType: value }))} placeholder="SalesInvoice" />
            <FilterInput label="Actor user ID" value={filters.actorUserId} onChange={(value) => setFilters((current) => ({ ...current, actorUserId: value }))} placeholder="user id" />
            <FilterInput label="Search" value={filters.search} onChange={(value) => setFilters((current) => ({ ...current, search: value }))} placeholder="action, entity, actor" />
            <FilterInput label="From" type="date" value={filters.from} onChange={(value) => setFilters((current) => ({ ...current, from: value }))} />
            <FilterInput label="To" type="date" value={filters.to} onChange={(value) => setFilters((current) => ({ ...current, to: value }))} />
          </div>
          {pagination ? (
            <div className="mt-3 text-sm text-steel">
              {pagination.total} matching log{pagination.total === 1 ? "" : "s"}
            </div>
          ) : null}
        </LedgerToolbar>
      </form>

      <LedgerPageBody>
        <div className="grid gap-5 xl:grid-cols-2">
        <form onSubmit={saveRetentionSettings}>
          <LedgerPanel>
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
              <LedgerButton type="submit" disabled={retentionSaving} variant="primary">
                {retentionSaving ? "Saving..." : "Save retention settings"}
              </LedgerButton>
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
          </LedgerPanel>
        </form>

        <LedgerPanel>
          <div className="mb-4">
            <h2 className="text-base font-semibold text-ink">Retention preview</h2>
            <p className="mt-1 text-sm text-steel">Dry-run only. No audit logs are deleted from this panel.</p>
          </div>
          {canManageRetention && retentionPreview ? (
            <div className="grid gap-3 text-sm">
              <LedgerMetadataRow
                items={[
                  { label: "Cutoff date", value: formatDate(retentionPreview.cutoffDate) },
                  { label: "Older than cutoff", value: String(retentionPreview.logsOlderThanCutoff) },
                  { label: "Total audit logs", value: String(retentionPreview.totalAuditLogs) },
                  { label: "Dry run only", value: retentionPreview.dryRunOnly ? "Yes" : "No" },
                  { label: "Oldest log", value: formatOptionalDate(retentionPreview.oldestLogDate) },
                  { label: "Newest log", value: formatOptionalDate(retentionPreview.newestLogDate) },
                ]}
              />
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
        </LedgerPanel>
        </div>

        <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <LedgerPanel className="p-0">
          <div aria-label="Audit log table" className="overflow-x-auto">
          <div className="grid min-w-[760px] grid-cols-[170px_180px_160px_1fr] border-b border-line bg-mist px-4 py-2 text-xs font-semibold uppercase text-steel">
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
              className={`ledger-focus grid w-full min-w-[760px] grid-cols-[170px_180px_160px_1fr] items-start border-b border-slate-100 px-4 py-3 text-left text-sm hover:bg-slate-50 ${
                selectedId === log.id ? "bg-blue-50/60" : ""
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
          </div>
          {!loading && logs.length === 0 ? <LedgerEmptyState title="No audit logs found" description="Adjust filters or review activity after high-risk actions are recorded." /> : null}
        </LedgerPanel>

        <LedgerPanel>
          {detailLoading ? <StatusMessage type="loading">Loading audit detail...</StatusMessage> : null}
          {selected && !detailLoading ? (
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-semibold text-ink">{auditActionLabel(selected.action)}</h2>
                <p className="mt-1 text-sm text-steel">
                  {auditEntityTypeLabel(selected.entityType)} / {selected.entityId}
                </p>
              </div>
              <LedgerMetadataRow
                items={[
                  { label: "Actor", value: actorLabel(selected) },
                  { label: "Timestamp", value: formatDate(selected.createdAt) },
                  { label: "IP address", value: selected.ipAddress ?? "-" },
                  { label: "User agent", value: selected.userAgent ?? "-" },
                ]}
              />
              <MetadataBlock title="Before" value={selected.before} />
              <MetadataBlock title="After" value={selected.after} />
            </div>
          ) : null}
          {!selected && !detailLoading ? <StatusMessage type="empty">Select an audit log to inspect sanitized metadata.</StatusMessage> : null}
        </LedgerPanel>
        </div>
      </LedgerPageBody>
    </LedgerPage>
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
    <LedgerFieldLabel>
      <LedgerFieldText>{label}</LedgerFieldText>
      <LedgerInput
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        disabled={disabled}
      />
    </LedgerFieldLabel>
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
    <label className="flex items-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-sm text-ink">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} disabled={disabled} className="h-4 w-4" />
      <span>{label}</span>
    </label>
  );
}

function MetadataBlock({ title, value }: { title: string; value: unknown }) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-steel">{title}</h3>
      <pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap rounded-md bg-ink p-3 text-xs text-white">
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

function StatusMessage({ children, type }: Readonly<{ children: React.ReactNode; type: "empty" | "error" | "info" | "loading" | "success" }>) {
  if (type === "loading") {
    return <LedgerLoadingState title="Loading" description={children} />;
  }
  if (type === "empty") {
    return <LedgerEmptyState title="No audit detail selected" description={children} />;
  }
  if (type === "error") {
    return <LedgerAlert tone="danger">{children}</LedgerAlert>;
  }
  return <LedgerAlert tone={type === "success" ? "success" : "info"}>{children}</LedgerAlert>;
}
