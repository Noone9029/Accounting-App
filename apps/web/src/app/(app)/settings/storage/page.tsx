"use client";

import { useEffect, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { formatStorageBytes, s3ConfigRows, storageProviderLabel, storageReadinessLabel, storageReadinessTone } from "@/lib/storage";
import type { S3ConfigReadiness, StorageMigrationPlanResponse, StorageReadinessResponse, StorageReadinessSection } from "@/lib/types";

export default function StorageSettingsPage() {
  const organizationId = useActiveOrganizationId();
  const [readiness, setReadiness] = useState<StorageReadinessResponse | null>(null);
  const [migrationPlan, setMigrationPlan] = useState<StorageMigrationPlanResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!organizationId) {
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError("");
    Promise.all([
      apiRequest<StorageReadinessResponse>("/storage/readiness"),
      apiRequest<StorageMigrationPlanResponse>("/storage/migration-plan"),
    ])
      .then(([nextReadiness, nextPlan]) => {
        if (!cancelled) {
          setReadiness(nextReadiness);
          setMigrationPlan(nextPlan);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load storage readiness.");
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
  }, [organizationId]);

  return (
    <section>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-ink">Storage</h1>
        <p className="mt-1 text-sm text-steel">Attachment and generated-document storage readiness.</p>
      </div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">Log in and select an organization to review storage readiness.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading storage readiness...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {readiness?.warnings.map((warning) => <StatusMessage key={warning} type="info">{warning}</StatusMessage>)}
        <StatusMessage type="info">Migration execution is not implemented yet. This page is readiness and dry-run planning only.</StatusMessage>
      </div>

      {readiness ? (
        <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
          <StorageCard title="Uploaded attachments" section={readiness.attachmentStorage} extra={`${readiness.attachmentStorage.maxSizeMb} MB max upload`} />
          <StorageCard title="Generated documents" section={readiness.generatedDocumentStorage} />
          <S3ConfigCard config={readiness.s3Config} />
          {migrationPlan ? <MigrationPlanCard plan={migrationPlan} /> : null}
        </div>
      ) : null}
    </section>
  );
}

function StorageCard({ title, section, extra }: { title: string; section: StorageReadinessSection; extra?: string }) {
  const tone = storageReadinessTone(section);
  return (
    <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-ink">{title}</h2>
          <p className="mt-1 text-sm text-steel">{storageProviderLabel(section.activeProvider)}</p>
        </div>
        <span className={`rounded-md px-2 py-1 text-xs font-semibold ${tone === "success" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
          {storageReadinessLabel(section)}
        </span>
      </div>
      {extra ? <p className="mt-3 text-sm text-steel">{extra}</p> : null}
      {section.blockingReasons.length > 0 ? (
        <div className="mt-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-steel">Blocking reasons</h3>
          <ul className="mt-2 space-y-1 text-sm text-rosewood">
            {section.blockingReasons.map((reason) => <li key={reason}>{reason}</li>)}
          </ul>
        </div>
      ) : null}
      {section.warnings.length > 0 ? (
        <div className="mt-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-steel">Warnings</h3>
          <ul className="mt-2 space-y-1 text-sm text-steel">
            {section.warnings.map((warning) => <li key={warning}>{warning}</li>)}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function S3ConfigCard({ config }: { config: S3ConfigReadiness }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
      <h2 className="text-base font-semibold text-ink">S3-compatible configuration</h2>
      <p className="mt-1 text-sm text-steel">Only boolean checks are shown. Secret values are never returned by the API.</p>
      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {s3ConfigRows(config).map((row) => (
          <div key={row.label} className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2 text-sm">
            <span className="text-steel">{row.label}</span>
            <span className={row.configured ? "font-semibold text-emerald-700" : "font-semibold text-amber-700"}>
              {row.configured ? "Configured" : "Missing"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MigrationPlanCard({ plan }: { plan: StorageMigrationPlanResponse }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-ink">Migration dry run</h2>
          <p className="mt-1 text-sm text-steel">No content is moved by this plan.</p>
        </div>
        <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
          {plan.estimatedMigrationRequired ? "Migration required" : "No migration needed"}
        </span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <Metric label="Attachments" value={`${plan.attachmentCount} / ${formatStorageBytes(plan.attachmentTotalBytes)}`} />
        <Metric label="Generated documents" value={`${plan.generatedDocumentCount} / ${formatStorageBytes(plan.generatedDocumentTotalBytes)}`} />
        <Metric label="Database records" value={String(plan.databaseStorageCount)} />
        <Metric label="S3 records" value={String(plan.s3StorageCount)} />
      </div>
      <ul className="mt-4 space-y-1 text-sm text-steel">
        {plan.notes.map((note) => <li key={note}>{note}</li>)}
      </ul>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-slate-50 px-3 py-2">
      <div className="text-xs uppercase tracking-wide text-steel">{label}</div>
      <div className="mt-1 font-semibold text-ink">{value}</div>
    </div>
  );
}
