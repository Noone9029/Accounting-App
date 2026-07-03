import Link from "next/link";
import { useAppLocale } from "@/components/app-locale-provider";
import { accountingPreflightBadgeClass, accountingPreflightLabel } from "@/lib/banking-accounting";
import { formatAppDate, formatAppMoney } from "@/lib/app-i18n";
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
  const { locale, tc } = useAppLocale();
  return (
    <section className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-ink">{tc("Accounting status")}</h2>
          <p className="mt-1 text-sm text-steel">{tc("Journal posting is explicit and only available for configured clearing-account cases.")}</p>
        </div>
        {preflight ? (
          <span className={`rounded-md border px-2 py-1 text-xs font-semibold ${accountingPreflightBadgeClass(preflight.status)}`}>
            {tc(accountingPreflightLabel(preflight.status))}
          </span>
        ) : null}
      </div>

      <p className="mt-3 text-sm leading-6 text-steel">
        {tc("Manual banking remains manual-only. No live bank feed is connected, no bank API is called, no bank credentials are collected, and no bank payment is sent.")}
      </p>

      {loading ? <p className="mt-3 text-sm text-steel">{tc("Checking accounting preflight...")}</p> : null}
      {!loading && !preflight ? <p className="mt-3 text-sm text-steel">{tc("Accounting preflight is not available yet.")}</p> : null}

      {preflight?.journalEntryId ? (
        <p className="mt-3 text-sm text-ink">
          {tc("Linked journal entry")}:{" "}
          <Link href="/journal-entries" className="font-medium text-palm hover:underline">
            {preflight.journalEntryNumber ?? preflight.journalEntryId}
          </Link>
        </p>
      ) : null}

      {preflight?.reasons.length ? (
        <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3">
          <h3 className="text-sm font-semibold text-amber-900">{tc("Posting limits")}</h3>
          <ul className="mt-2 space-y-1 text-sm text-amber-900">
            {preflight.reasons.map((reason) => (
              <li key={reason}>{tc(reason)}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {preflight?.warnings.length ? (
        <div className="mt-4 rounded-md border border-sky-200 bg-sky-50 p-3">
          <h3 className="text-sm font-semibold text-sky-950">{tc("Warnings")}</h3>
          <ul className="mt-2 space-y-1 text-sm text-sky-800">
            {preflight.warnings.map((warning) => (
              <li key={warning}>{tc(warning)}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {preflight?.journalPreview ? (
        <div className="mt-4 overflow-hidden rounded-md border border-slate-200">
          <div className="grid gap-3 border-b border-slate-200 bg-slate-50 px-3 py-3 text-sm md:grid-cols-3">
            <Detail label={tc("Entry date")} value={formatAppDate(preflight.journalPreview.entryDate, locale, "-")} />
            <Detail label={tc("Total debit")} value={formatAppMoney(preflight.journalPreview.totalDebit, preflight.journalPreview.currency, locale)} />
            <Detail label={tc("Total credit")} value={formatAppMoney(preflight.journalPreview.totalCredit, preflight.journalPreview.currency, locale)} />
          </div>
          <div className="divide-y divide-slate-100">
            {preflight.journalPreview.lines.map((line, index) => (
              <div key={`${line.accountId}-${index}`} className="grid gap-2 px-3 py-3 text-sm md:grid-cols-[100px_1fr_140px]">
                <span className="font-medium text-steel">{line.side}</span>
                <span className="text-ink">
                  {line.accountCode} - {line.accountName}
                </span>
                <span className="font-mono text-ink md:text-end">{formatAppMoney(line.amount, preflight.journalPreview?.currency ?? "", locale)}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {canPost && preflight?.ready ? (
        <button
          type="button"
          disabled={Boolean(action)}
          onClick={onPost}
          className="mt-4 rounded-md border border-palm px-3 py-2 text-sm font-medium text-palm hover:bg-emerald-50 disabled:cursor-not-allowed disabled:text-slate-400"
        >
          {action === "post-journal" ? tc("Posting journal...") : tc(postLabel)}
        </button>
      ) : null}
    </section>
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
