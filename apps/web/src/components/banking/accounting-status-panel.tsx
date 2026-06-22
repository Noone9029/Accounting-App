import Link from "next/link";
import { LedgerAlert, LedgerButton, LedgerDataTable, LedgerEmptyState, LedgerLoadingState, LedgerPanel, LedgerStatusBadge, LedgerSummaryBand, type LedgerStatusTone } from "@/components/ui/ledger-system";
import { accountingPreflightLabel } from "@/lib/banking-accounting";
import { formatOptionalDate } from "@/lib/invoice-display";
import { formatMoneyAmount } from "@/lib/money";
import type { BankingAccountingPreflight } from "@/lib/types";

export function AccountingStatusPanel({
  preflight,
  loading,
  action,
  canPost,
  onPost,
  postLabel,
}: Readonly<{
  preflight: BankingAccountingPreflight | null;
  loading: boolean;
  action: string;
  canPost: boolean;
  onPost: () => void;
  postLabel: string;
}>) {
  return (
    <LedgerPanel>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-ink">Accounting status</h2>
          <p className="mt-1 text-sm text-steel">Journal posting is explicit and only available for configured clearing-account cases.</p>
        </div>
        {preflight ? (
          <LedgerStatusBadge tone={accountingPreflightTone(preflight.status)}>{accountingPreflightLabel(preflight.status)}</LedgerStatusBadge>
        ) : null}
      </div>

      <div className="mt-3">
        <LedgerSummaryBand>
          Manual banking remains manual-only. No live bank feed is connected, no bank API is called, no bank credentials are collected, and no bank payment is sent.
        </LedgerSummaryBand>
      </div>

      {loading ? <div className="mt-3"><LedgerLoadingState title="Checking accounting preflight" /></div> : null}
      {!loading && !preflight ? <div className="mt-3"><LedgerEmptyState title="Accounting preflight is not available yet" /></div> : null}

      {preflight?.journalEntryId ? (
        <p className="mt-3 text-sm text-ink">
          Linked journal entry:{" "}
          <Link href="/journal-entries" className="font-medium text-palm hover:underline">
            {preflight.journalEntryNumber ?? preflight.journalEntryId}
          </Link>
        </p>
      ) : null}

      {preflight?.reasons.length ? (
        <LedgerAlert tone="warning" title="Posting limits">
          <ul className="mt-2 space-y-1 text-sm text-amber-900">
            {preflight.reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </LedgerAlert>
      ) : null}

      {preflight?.warnings.length ? (
        <div className="mt-4">
        <LedgerAlert tone="info" title="Warnings">
          <ul className="mt-2 space-y-1 text-sm text-sky-800">
            {preflight.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </LedgerAlert>
        </div>
      ) : null}

      {preflight?.journalPreview ? (
        <div className="mt-4">
          <div className="grid gap-3 border-b border-slate-200 bg-slate-50 px-3 py-3 text-sm md:grid-cols-3">
            <Detail label="Entry date" value={formatOptionalDate(preflight.journalPreview.entryDate, "-")} />
            <Detail label="Total debit" value={formatMoneyAmount(preflight.journalPreview.totalDebit, preflight.journalPreview.currency)} />
            <Detail label="Total credit" value={formatMoneyAmount(preflight.journalPreview.totalCredit, preflight.journalPreview.currency)} />
          </div>
          <LedgerDataTable minWidth="680px">
            <tbody className="divide-y divide-slate-100">
              {preflight.journalPreview.lines.map((line, index) => (
                <tr key={`${line.accountId}-${index}`}>
                  <td className="px-3 py-3 font-medium text-steel">{line.side}</td>
                  <td className="px-3 py-3 text-ink">
                    {line.accountCode} - {line.accountName}
                  </td>
                  <td className="px-3 py-3 font-mono text-ink md:text-right">{formatMoneyAmount(line.amount, preflight.journalPreview?.currency ?? "")}</td>
                </tr>
              ))}
            </tbody>
          </LedgerDataTable>
        </div>
      ) : null}

      {canPost && preflight?.ready ? (
        <LedgerButton
          type="button"
          disabled={Boolean(action)}
          onClick={onPost}
          variant="primary"
          className="mt-4"
        >
          {action === "post-journal" ? "Posting journal..." : postLabel}
        </LedgerButton>
      ) : null}
    </LedgerPanel>
  );
}

function Detail({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-steel">{label}</p>
      <p className="mt-1 text-sm text-ink">{value}</p>
    </div>
  );
}

function accountingPreflightTone(status: BankingAccountingPreflight["status"]): LedgerStatusTone {
  if (status === "READY") {
    return "success";
  }
  if (status === "POSTED") {
    return "info";
  }
  if (status === "OPERATIONAL_ONLY") {
    return "warning";
  }
  return "danger";
}
