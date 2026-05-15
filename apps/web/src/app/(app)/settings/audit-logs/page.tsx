"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import {
  auditActionLabel,
  auditEntityTypeLabel,
  auditLogSummary,
  buildAuditLogQuery,
  sanitizeMetadataForDisplay,
} from "@/lib/audit-logs";
import type { AuditLogEntry, AuditLogListResponse } from "@/lib/types";

const defaultFilters = {
  action: "",
  entityType: "",
  actorUserId: "",
  search: "",
  from: "",
  to: "",
};

export default function AuditLogsPage() {
  const organizationId = useActiveOrganizationId();
  const [filters, setFilters] = useState(defaultFilters);
  const [appliedFilters, setAppliedFilters] = useState(defaultFilters);
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [pagination, setPagination] = useState<AuditLogListResponse["pagination"] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<AuditLogEntry | null>(null);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState("");

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

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAppliedFilters(filters);
  }

  function resetFilters() {
    setFilters(defaultFilters);
    setAppliedFilters(defaultFilters);
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
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        <StatusMessage type="info">List/detail reads are not logged. Sensitive metadata is redacted before display.</StatusMessage>
      </div>

      <form onSubmit={applyFilters} className="mt-5 grid gap-3 rounded-md border border-slate-200 bg-white p-4 md:grid-cols-3 xl:grid-cols-6">
        <FilterInput label="Action" value={filters.action} onChange={(value) => setFilters((current) => ({ ...current, action: value }))} placeholder="COGS_POSTED" />
        <FilterInput label="Entity type" value={filters.entityType} onChange={(value) => setFilters((current) => ({ ...current, entityType: value }))} placeholder="SalesInvoice" />
        <FilterInput label="Actor user ID" value={filters.actorUserId} onChange={(value) => setFilters((current) => ({ ...current, actorUserId: value }))} placeholder="user id" />
        <FilterInput label="Search" value={filters.search} onChange={(value) => setFilters((current) => ({ ...current, search: value }))} placeholder="action, entity, actor" />
        <FilterInput label="From" type="date" value={filters.from} onChange={(value) => setFilters((current) => ({ ...current, from: value }))} />
        <FilterInput label="To" type="date" value={filters.to} onChange={(value) => setFilters((current) => ({ ...current, to: value }))} />
        <div className="flex items-end gap-2 md:col-span-3 xl:col-span-6">
          <button type="submit" className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-white">
            Apply filters
          </button>
          <button type="button" onClick={resetFilters} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-ink">
            Reset
          </button>
          {pagination ? <span className="text-sm text-steel">{pagination.total} matching log{pagination.total === 1 ? "" : "s"}</span> : null}
        </div>
      </form>

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
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: "text" | "date";
}) {
  return (
    <label className="text-sm">
      <span className="block text-xs font-semibold uppercase tracking-wide text-steel">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-ink"
      />
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
