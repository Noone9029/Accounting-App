import { backupReadinessLabel } from "@/lib/storage";
import type { BackupReadinessResponse, RestoreDrillPlanResponse } from "@/lib/types";

export function BackupReadinessSafeStatus({
  readiness,
  restorePlan,
}: {
  readiness: BackupReadinessResponse;
  restorePlan?: RestoreDrillPlanResponse | null;
}) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-ink">Backup and restore readiness</h2>
          <p className="mt-1 text-sm text-steel">Metadata-only evidence and restore drill planning. No backup or restore is executed here.</p>
        </div>
        <span className="rounded-md bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">
          {backupReadinessLabel(readiness.productionReady)}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
        <StatusRow label="Database backup" ready={readiness.databaseBackupConfigured} />
        <StatusRow label="Point-in-time recovery" ready={readiness.pointInTimeRecoveryConfigured} />
        <StatusRow label="Migration history" ready={readiness.migrationHistoryAvailable} />
        <StatusRow label="Object storage backup" ready={readiness.objectStorageBackupConfigured} />
        <StatusRow label="Generated documents" ready={readiness.generatedDocumentBackupConfigured} />
        <StatusRow label="Attachments" ready={readiness.attachmentBackupConfigured} />
        <StatusRow label="Restore drill" ready={readiness.restoreDrillVerified} falseLabel="Restore drill unverified" />
        <StatusRow label="RPO/RTO" ready={readiness.rpoRtoReviewed} falseLabel="RPO/RTO review required" />
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
        <span className="rounded-md bg-slate-100 px-2 py-1 text-slate-700">No backup executed</span>
        <span className="rounded-md bg-slate-100 px-2 py-1 text-slate-700">No restore executed</span>
        <span className="rounded-md bg-slate-100 px-2 py-1 text-slate-700">No secrets returned</span>
      </div>

      {readiness.blockers.length > 0 ? (
        <div className="mt-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-steel">Blockers</h3>
          <ul className="mt-2 space-y-1 text-sm text-rosewood">
            {readiness.blockers.slice(0, 4).map((blocker) => <li key={blocker}>{blocker}</li>)}
          </ul>
        </div>
      ) : null}

      {restorePlan ? (
        <div className="mt-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-steel">Restore drill plan</h3>
          <ul className="mt-2 space-y-1 text-sm text-steel">
            {restorePlan.plannedSteps.slice(0, 4).map((step) => <li key={step}>{step}</li>)}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function StatusRow({ label, ready, falseLabel }: { label: string; ready: boolean; falseLabel?: string }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2">
      <span className="text-steel">{label}</span>
      <span className={ready ? "font-semibold text-emerald-700" : "font-semibold text-amber-700"}>
        {ready ? "Verified" : falseLabel ?? "Missing"}
      </span>
    </div>
  );
}
