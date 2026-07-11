import {
  LedgerActionBar,
  LedgerButton,
  LedgerDataTable,
  LedgerPanel,
  LedgerStatusBadge,
} from "@/components/ui/ledger-system";
import { formatFxRate, type FxRevaluationRun, type FxRevaluationStatus } from "@/lib/foreign-exchange";
import { formatFxMoney, sumFxMoney } from "@/lib/fx-revaluation-display";

function statusTone(status: FxRevaluationStatus): "neutral" | "warning" | "success" | "danger" {
  if (status === "POSTED") return "success";
  if (status === "REVIEWED") return "warning";
  if (status === "FAILED") return "danger";
  return "neutral";
}

interface RevaluationDetailProps {
  run: FxRevaluationRun;
  canRun: boolean;
  canReverse: boolean;
  mutating: boolean;
  onAction: (action: "review" | "post" | "reverse") => void;
}

export function RevaluationDetail({ run, canRun, canReverse, mutating, onAction }: Readonly<RevaluationDetailProps>) {
  const totalGain = sumFxMoney(run.lines.map((line) => line.unrealizedGainAmount));
  const totalLoss = sumFxMoney(run.lines.map((line) => line.unrealizedLossAmount));
  const baseCurrency = run.lines[0]?.baseCurrencyCode ?? "BASE";

  return (
    <LedgerPanel>
      <div className="flex flex-col gap-3 border-b border-line pb-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold text-ink">Run {run.revaluationDate.slice(0, 10)}</h2>
            <LedgerStatusBadge tone={statusTone(run.status)}>{run.status}</LedgerStatusBadge>
          </div>
          <p className="mt-1 text-sm text-steel">Closing rates dated {run.rateDate.slice(0, 10)} · {run.lines.length} monetary balances</p>
        </div>
        <LedgerActionBar>
          {run.status === "DRAFT" && canRun ? <LedgerButton size="sm" onClick={() => onAction("review")} disabled={mutating}>Review run</LedgerButton> : null}
          {run.status === "REVIEWED" && canRun ? <LedgerButton size="sm" variant="primary" onClick={() => onAction("post")} disabled={mutating}>Post revaluation</LedgerButton> : null}
          {run.status === "POSTED" && canReverse ? <LedgerButton size="sm" variant="danger" onClick={() => onAction("reverse")} disabled={mutating}>Reverse revaluation</LedgerButton> : null}
        </LedgerActionBar>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 border-b border-line pb-3 text-sm sm:grid-cols-4">
        <Metric label="Unrealized gain" value={formatFxMoney(baseCurrency, totalGain)} />
        <Metric label="Unrealized loss" value={formatFxMoney(baseCurrency, totalLoss)} />
        <Metric label="Posted journal" value={run.postedJournalEntry?.entryNumber ?? "Not posted"} href={run.postedJournalEntry ? `/journal-entries/${run.postedJournalEntry.id}` : undefined} />
        <Metric label="Reversal journal" value={run.reversalJournalEntry?.entryNumber ?? "Not reversed"} href={run.reversalJournalEntry ? `/journal-entries/${run.reversalJournalEntry.id}` : undefined} />
      </div>

      <LedgerDataTable minWidth="1240px" className="mt-4 shadow-none [&_table]:text-start">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
          <tr>
            <th className="px-3 py-2">Source</th>
            <th className="px-3 py-2">Counterparty</th>
            <th className="px-3 py-2">Currency</th>
            <th className="px-3 py-2 text-end">Open foreign</th>
            <th className="px-3 py-2 text-end">Source basis</th>
            <th className="px-3 py-2 text-end">Carrying</th>
            <th className="px-3 py-2 text-end">Closing rate</th>
            <th className="px-3 py-2 text-end">Revalued</th>
            <th className="px-3 py-2 text-end">Gain</th>
            <th className="px-3 py-2 text-end">Loss</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {run.lines.map((line) => {
            const sourceNumber = line.salesInvoice?.invoiceNumber ?? line.purchaseBill?.billNumber ?? "Unknown source";
            const sourceHref = line.salesInvoice ? `/sales/invoices/${line.salesInvoice.id}` : `/purchases/bills/${line.purchaseBill?.id}`;
            return (
              <tr key={line.id}>
                <td className="px-3 py-2"><a href={sourceHref} className="font-semibold text-palm hover:underline">{sourceNumber}</a></td>
                <td className="px-3 py-2 text-ink">{line.counterparty?.displayName || line.counterparty?.name || "—"}</td>
                <td className="px-3 py-2 font-mono">{line.currencyCode}/{line.baseCurrencyCode}</td>
                <td className="px-3 py-2 text-end font-mono">{formatFxMoney(line.currencyCode, line.openTransactionAmount)}</td>
                <td className="px-3 py-2 text-end font-mono">{formatFxMoney(line.baseCurrencyCode, line.sourceBaseOpenAmount)}</td>
                <td className="px-3 py-2 text-end font-mono">{formatFxMoney(line.baseCurrencyCode, line.carryingBaseAmount)}</td>
                <td className="px-3 py-2 text-end font-mono">{formatFxRate(line.closingRate)}</td>
                <td className="px-3 py-2 text-end font-mono">{formatFxMoney(line.baseCurrencyCode, line.revaluedBaseAmount)}</td>
                <td className="px-3 py-2 text-end font-mono text-emerald-700">{formatFxMoney(line.baseCurrencyCode, line.unrealizedGainAmount)}</td>
                <td className="px-3 py-2 text-end font-mono text-rose-700">{formatFxMoney(line.baseCurrencyCode, line.unrealizedLossAmount)}</td>
              </tr>
            );
          })}
        </tbody>
      </LedgerDataTable>
    </LedgerPanel>
  );
}

function Metric({ label, value, href }: Readonly<{ label: string; value: string; href?: string }>) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wide text-steel">{label}</div>
      {href ? <a href={href} className="mt-1 block font-mono font-semibold text-palm hover:underline">{value}</a> : <div className="mt-1 font-mono font-semibold text-ink">{value}</div>}
    </div>
  );
}
