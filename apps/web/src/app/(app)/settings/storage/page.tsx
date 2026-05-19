"use client";

import { type FormEvent, useEffect, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { usePermissions } from "@/components/permissions/permission-provider";
import { BackupReadinessSafeStatus } from "@/components/storage/backup-readiness-safe-status";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { PERMISSIONS } from "@/lib/permissions";
import {
  backupEvidenceStatusLabel,
  backupEvidenceTypeLabel,
  formatStorageBytes,
  s3ConfigRows,
  storageProviderLabel,
  storageReadinessLabel,
  storageReadinessTone,
} from "@/lib/storage";
import type {
  BackupReadinessResponse,
  BackupRestoreEvidence,
  BackupRestoreEvidenceListResponse,
  BackupRestoreEvidenceResponse,
  BackupRestoreEvidenceScope,
  BackupRestoreEvidenceType,
  RestoreDrillPlanResponse,
  S3ConfigReadiness,
  StorageMigrationPlanResponse,
  StorageReadinessResponse,
  StorageReadinessSection,
} from "@/lib/types";

const backupEvidenceTypes: BackupRestoreEvidenceType[] = [
  "DATABASE_BACKUP",
  "POINT_IN_TIME_RECOVERY",
  "MIGRATION_HISTORY",
  "OBJECT_STORAGE_BACKUP",
  "GENERATED_DOCUMENT_BACKUP",
  "ATTACHMENT_BACKUP",
  "RESTORE_DRILL",
  "RESTORE_VERIFICATION",
  "RPO_RTO_REVIEW",
  "OTHER",
];

const backupEvidenceFormInitial = {
  evidenceType: "DATABASE_BACKUP" as BackupRestoreEvidenceType,
  scope: "ORGANIZATION" as BackupRestoreEvidenceScope,
  provider: "",
  evidenceSummaryJson: "{\n  \"summary\": \"metadata-only backup evidence\"\n}",
  note: "",
};

export default function StorageSettingsPage() {
  const organizationId = useActiveOrganizationId();
  const { can } = usePermissions();
  const canManageBackupReadiness = can(PERMISSIONS.auditLogs.manageRetention);
  const [readiness, setReadiness] = useState<StorageReadinessResponse | null>(null);
  const [migrationPlan, setMigrationPlan] = useState<StorageMigrationPlanResponse | null>(null);
  const [backupReadiness, setBackupReadiness] = useState<BackupReadinessResponse | null>(null);
  const [restorePlan, setRestorePlan] = useState<RestoreDrillPlanResponse | null>(null);
  const [backupEvidence, setBackupEvidence] = useState<BackupRestoreEvidence[]>([]);
  const [backupEvidenceForm, setBackupEvidenceForm] = useState(backupEvidenceFormInitial);
  const [loading, setLoading] = useState(false);
  const [backupActionLoading, setBackupActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [backupNotice, setBackupNotice] = useState("");

  useEffect(() => {
    if (!organizationId) {
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError("");
    const baseRequests: [
      Promise<StorageReadinessResponse>,
      Promise<StorageMigrationPlanResponse>,
      Promise<BackupReadinessResponse | null>,
      Promise<RestoreDrillPlanResponse | null>,
      Promise<BackupRestoreEvidenceListResponse | null>,
    ] = [
      apiRequest<StorageReadinessResponse>("/storage/readiness"),
      apiRequest<StorageMigrationPlanResponse>("/storage/migration-plan"),
      canManageBackupReadiness ? apiRequest<BackupReadinessResponse>("/system/backup-readiness") : Promise.resolve(null),
      canManageBackupReadiness ? apiRequest<RestoreDrillPlanResponse>("/system/restore-drill-plan") : Promise.resolve(null),
      canManageBackupReadiness ? apiRequest<BackupRestoreEvidenceListResponse>("/system/backup-evidence") : Promise.resolve(null),
    ];

    Promise.all(baseRequests)
      .then(([nextReadiness, nextPlan, nextBackupReadiness, nextRestorePlan, nextBackupEvidence]) => {
        if (!cancelled) {
          setReadiness(nextReadiness);
          setMigrationPlan(nextPlan);
          setBackupReadiness(nextBackupReadiness);
          setRestorePlan(nextRestorePlan);
          setBackupEvidence(nextBackupEvidence?.evidence ?? []);
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
  }, [canManageBackupReadiness, organizationId]);

  async function refreshBackupReadiness() {
    const [nextBackupReadiness, nextRestorePlan, nextBackupEvidence] = await Promise.all([
      apiRequest<BackupReadinessResponse>("/system/backup-readiness"),
      apiRequest<RestoreDrillPlanResponse>("/system/restore-drill-plan"),
      apiRequest<BackupRestoreEvidenceListResponse>("/system/backup-evidence"),
    ]);
    setBackupReadiness(nextBackupReadiness);
    setRestorePlan(nextRestorePlan);
    setBackupEvidence(nextBackupEvidence.evidence);
  }

  async function createBackupEvidence(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBackupActionLoading(true);
    setBackupNotice("");
    setError("");
    try {
      const summary = JSON.parse(backupEvidenceForm.evidenceSummaryJson) as Record<string, unknown>;
      await apiRequest<BackupRestoreEvidenceResponse>("/system/backup-evidence", {
        method: "POST",
        body: {
          evidenceType: backupEvidenceForm.evidenceType,
          scope: backupEvidenceForm.scope,
          provider: backupEvidenceForm.provider || undefined,
          evidenceSummaryJson: summary,
          note: backupEvidenceForm.note || undefined,
        },
      });
      setBackupEvidenceForm(backupEvidenceFormInitial);
      setBackupNotice("Backup evidence metadata captured.");
      await refreshBackupReadiness();
    } catch (actionError: unknown) {
      setError(actionError instanceof Error ? actionError.message : "Unable to save backup evidence.");
    } finally {
      setBackupActionLoading(false);
    }
  }

  async function verifyBackupEvidence(id: string) {
    await mutateBackupEvidence(`/system/backup-evidence/${id}/verify`, { productionReadyContribution: true });
  }

  async function revokeBackupEvidence(id: string) {
    await mutateBackupEvidence(`/system/backup-evidence/${id}/revoke`, { note: "Revoked from storage settings readiness review." });
  }

  async function mutateBackupEvidence(path: string, body: Record<string, unknown>) {
    setBackupActionLoading(true);
    setBackupNotice("");
    setError("");
    try {
      await apiRequest<BackupRestoreEvidenceResponse>(path, { method: "POST", body });
      setBackupNotice("Backup evidence metadata updated.");
      await refreshBackupReadiness();
    } catch (actionError: unknown) {
      setError(actionError instanceof Error ? actionError.message : "Unable to update backup evidence.");
    } finally {
      setBackupActionLoading(false);
    }
  }

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
        {backupNotice ? <StatusMessage type="success">{backupNotice}</StatusMessage> : null}
        {readiness?.warnings.map((warning) => <StatusMessage key={warning} type="info">{warning}</StatusMessage>)}
        <StatusMessage type="info">Migration execution is not implemented yet. This page is readiness and dry-run planning only.</StatusMessage>
        <StatusMessage type="info">Backup and restore controls are metadata-only. There is no run backup or restore action in LedgerByte.</StatusMessage>
      </div>

      {readiness ? (
        <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
          <StorageCard title="Uploaded attachments" section={readiness.attachmentStorage} extra={`${readiness.attachmentStorage.maxSizeMb} MB max upload`} />
          <StorageCard title="Generated documents" section={readiness.generatedDocumentStorage} />
          <S3ConfigCard config={readiness.s3Config} />
          {migrationPlan ? <MigrationPlanCard plan={migrationPlan} /> : null}
          {backupReadiness ? <BackupReadinessSafeStatus readiness={backupReadiness} restorePlan={restorePlan} /> : null}
          {canManageBackupReadiness ? (
            <BackupEvidenceCard
              evidence={backupEvidence}
              form={backupEvidenceForm}
              setForm={setBackupEvidenceForm}
              onSubmit={createBackupEvidence}
              onVerify={verifyBackupEvidence}
              onRevoke={revokeBackupEvidence}
              loading={backupActionLoading}
            />
          ) : (
            <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
              <h2 className="text-base font-semibold text-ink">Backup readiness</h2>
              <p className="mt-1 text-sm text-steel">Backup and restore evidence requires audit retention administration permission.</p>
            </div>
          )}
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
          <p className="mt-1 text-sm text-steel">
            Target provider: {storageProviderLabel(plan.targetProvider ?? "database")}. No content is moved by this plan.
          </p>
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

function BackupEvidenceCard({
  evidence,
  form,
  setForm,
  onSubmit,
  onVerify,
  onRevoke,
  loading,
}: {
  evidence: BackupRestoreEvidence[];
  form: typeof backupEvidenceFormInitial;
  setForm: (next: typeof backupEvidenceFormInitial) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onVerify: (id: string) => void;
  onRevoke: (id: string) => void;
  loading: boolean;
}) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel lg:col-span-2">
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
        <div>
          <h2 className="text-base font-semibold text-ink">Backup evidence</h2>
          <p className="mt-1 text-sm text-steel">
            Metadata only. Do not paste database URLs, service role keys, storage credentials, signed XML/QR bodies, document bodies, or attachment contents.
          </p>
          <div className="mt-4 space-y-2">
            {evidence.length === 0 ? <p className="text-sm text-steel">No backup evidence has been captured yet.</p> : null}
            {evidence.map((entry) => (
              <div key={entry.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-slate-200 px-3 py-2 text-sm">
                <div>
                  <p className="font-semibold text-ink">{backupEvidenceTypeLabel(entry.evidenceType)}</p>
                  <p className="text-xs text-steel">
                    {backupEvidenceStatusLabel(entry.status)} / {entry.scope === "GLOBAL" ? "Global" : "Organization"} / {entry.provider ?? "No provider"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {entry.status === "DRAFT" ? (
                    <button
                      type="button"
                      onClick={() => onVerify(entry.id)}
                      disabled={loading}
                      className="rounded-md border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-700 disabled:opacity-60"
                    >
                      Verify
                    </button>
                  ) : null}
                  {entry.status !== "REVOKED" ? (
                    <button
                      type="button"
                      onClick={() => onRevoke(entry.id)}
                      disabled={loading}
                      className="rounded-md border border-rose-200 px-3 py-1 text-xs font-semibold text-rosewood disabled:opacity-60"
                    >
                      Revoke
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={onSubmit} className="rounded-md border border-slate-200 p-4">
          <h3 className="text-sm font-semibold text-ink">Capture metadata</h3>
          <label className="mt-3 block text-sm font-medium text-ink">
            Evidence type
            <select
              value={form.evidenceType}
              onChange={(event) => setForm({ ...form, evidenceType: event.target.value as BackupRestoreEvidenceType })}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              {backupEvidenceTypes.map((type) => <option key={type} value={type}>{backupEvidenceTypeLabel(type)}</option>)}
            </select>
          </label>
          <label className="mt-3 block text-sm font-medium text-ink">
            Scope
            <select
              value={form.scope}
              onChange={(event) => setForm({ ...form, scope: event.target.value as BackupRestoreEvidenceScope })}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="ORGANIZATION">Organization</option>
              <option value="GLOBAL">Global</option>
            </select>
          </label>
          <label className="mt-3 block text-sm font-medium text-ink">
            Provider
            <input
              value={form.provider}
              onChange={(event) => setForm({ ...form, provider: event.target.value })}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              placeholder="Supabase, S3-compatible storage, runbook"
            />
          </label>
          <label className="mt-3 block text-sm font-medium text-ink">
            Evidence summary JSON
            <textarea
              value={form.evidenceSummaryJson}
              onChange={(event) => setForm({ ...form, evidenceSummaryJson: event.target.value })}
              rows={5}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-xs"
            />
          </label>
          <label className="mt-3 block text-sm font-medium text-ink">
            Note
            <textarea
              value={form.note}
              onChange={(event) => setForm({ ...form, note: event.target.value })}
              rows={2}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            className="mt-4 rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            Capture evidence
          </button>
        </form>
      </div>
    </div>
  );
}
