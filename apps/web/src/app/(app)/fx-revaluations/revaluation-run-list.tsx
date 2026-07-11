import { LedgerDataTable, LedgerEmptyState, LedgerStatusBadge } from "@/components/ui/ledger-system";
import type { FxRevaluationRun, FxRevaluationStatus } from "@/lib/foreign-exchange";

function statusTone(status: FxRevaluationStatus): "neutral" | "warning" | "success" | "danger" {
  if (status === "POSTED") return "success";
  if (status === "REVIEWED") return "warning";
  if (status === "FAILED") return "danger";
  return "neutral";
}

export function RevaluationRunList({ runs, selectedId, onSelect }: Readonly<{ runs: FxRevaluationRun[]; selectedId: string | null; onSelect: (id: string) => void }>) {
  if (!runs.length) {
    return <LedgerEmptyState title="No FX revaluation runs" description="Create a preview after capturing closing-rate evidence." />;
  }

  return (
    <LedgerDataTable minWidth="720px" className="[&_table]:text-start">
      <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
        <tr>
          <th className="px-3 py-2">Period end</th>
          <th className="px-3 py-2">Rate date</th>
          <th className="px-3 py-2">Status</th>
          <th className="px-3 py-2 text-end">Lines</th>
          <th className="px-3 py-2 text-end">Journal</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-line">
        {runs.map((run) => (
          <tr key={run.id} className={selectedId === run.id ? "bg-emerald-50/60" : "hover:bg-slate-50"}>
            <td className="px-3 py-2">
              <button type="button" className="ledger-focus font-semibold text-palm hover:underline" onClick={() => onSelect(run.id)}>
                {run.revaluationDate.slice(0, 10)}
              </button>
            </td>
            <td className="px-3 py-2 font-mono text-steel">{run.rateDate.slice(0, 10)}</td>
            <td className="px-3 py-2"><LedgerStatusBadge tone={statusTone(run.status)}>{run.status}</LedgerStatusBadge></td>
            <td className="px-3 py-2 text-end font-mono">{run._count?.lines ?? run.lines?.length ?? 0}</td>
            <td className="px-3 py-2 text-end font-mono text-steel">{run.postedJournalEntry?.entryNumber ?? "—"}</td>
          </tr>
        ))}
      </tbody>
    </LedgerDataTable>
  );
}
