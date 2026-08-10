import { ArchiveX, DatabaseZap, FileJson, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";

import { PanelSection } from "@/components/ui-ledger/panel-section";
import { StatusBadge } from "@/components/ui-ledger/status-badge";
import type { DataExportManifest, DataExportManifestScope } from "@/lib/types";

interface ExportManifestPanelProps {
  manifest: DataExportManifest;
}

export function ExportManifestPanel({ manifest }: ExportManifestPanelProps) {
  const totalRecords = manifest.scopes.reduce((sum, scope) => sum + scope.recordCount, 0);

  return (
    <PanelSection
      title="Data export manifest"
      description="Plan-only metadata for export coverage, permissions, exclusions, and blocked data-management actions."
      action={
        <div className="flex flex-wrap justify-end gap-2">
          <StatusBadge tone="muted">Plan only</StatusBadge>
          <StatusBadge tone="info">No export started</StatusBadge>
          <StatusBadge tone="warning">No backup or restore</StatusBadge>
        </div>
      }
      contentClassName="space-y-4"
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <ManifestMetric icon={<FileJson className="size-4" aria-hidden="true" />} label="Scopes planned" value={manifest.scopes.length} />
        <ManifestMetric icon={<DatabaseZap className="size-4" aria-hidden="true" />} label="Records counted" value={totalRecords} />
        <ManifestMetric icon={<ArchiveX className="size-4" aria-hidden="true" />} label="Blocked actions" value={manifest.blockedActions.length} />
        <ManifestMetric icon={<ShieldCheck className="size-4" aria-hidden="true" />} label="Generated" value={formatDateTime(manifest.generatedAt)} />
      </div>

      {manifest.scopes.length > 0 ? (
        <div className="overflow-hidden rounded-md border border-border">
          <div className="grid grid-cols-[1.2fr_0.55fr_0.7fr_1fr] gap-3 border-b bg-muted/50 px-3 py-2 text-xs font-medium uppercase text-muted-foreground">
            <span>Scope</span>
            <span>Records</span>
            <span>Format</span>
            <span>Permission</span>
          </div>
          <ul className="divide-y divide-border" aria-label="Planned export scopes">
            {manifest.scopes.map((scope) => (
              <li key={scope.key} className="space-y-2 px-3 py-3">
                <div className="grid grid-cols-[1.2fr_0.55fr_0.7fr_1fr] gap-3 text-sm">
                  <span className="min-w-0 truncate font-medium text-foreground">{scope.label}</span>
                  <span className="tabular-nums text-muted-foreground">{scope.recordCount}</span>
                  <span className="text-muted-foreground">{scope.exportFormat}</span>
                  <span className="min-w-0 truncate text-muted-foreground">{scope.requiresPermission}</span>
                </div>
                <ScopeDetails scope={scope} />
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
          <div className="font-medium text-foreground">No export scopes planned</div>
          <div className="mt-1">Metadata planning can continue after export scopes are approved.</div>
        </div>
      )}

      {manifest.blockedActions.length > 0 ? (
        <div className="rounded-md bg-amber-50 p-3 text-sm leading-6 text-amber-800">
          <div className="font-medium text-amber-900">Blocked actions</div>
          {manifest.blockedActions.slice(0, 4).map((blockedAction) => (
            <div key={`${blockedAction.action}-${blockedAction.reason}`} className="mt-1">
              {blockedAction.reason}
            </div>
          ))}
        </div>
      ) : null}

      {manifest.notes.length > 0 ? (
        <div className="space-y-1 text-sm leading-6 text-muted-foreground">
          {manifest.notes.slice(0, 3).map((note) => (
            <p key={note}>{note}</p>
          ))}
        </div>
      ) : null}
    </PanelSection>
  );
}

function ScopeDetails({ scope }: { scope: DataExportManifestScope }) {
  return (
    <div className="grid gap-2 text-xs text-muted-foreground md:grid-cols-2">
      <div>
        <span className="font-medium text-foreground">Includes: </span>
        {scope.includes.join(", ")}
      </div>
      <div>
        <span className="font-medium text-foreground">Excludes: </span>
        {scope.excludes.join(", ")}
      </div>
    </div>
  );
}

function ManifestMetric({ icon, label, value }: { icon: ReactNode; label: string; value: ReactNode }) {
  return (
    <div className="rounded-md border border-border bg-muted/30 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs font-medium uppercase text-muted-foreground">{label}</div>
        <span className="grid size-8 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">{icon}</span>
      </div>
      <div className="mt-2 truncate text-xl font-semibold tabular-nums text-foreground">{value}</div>
    </div>
  );
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
  return date.toLocaleString();
}
