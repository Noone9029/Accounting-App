"use client";

import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { usePermissions } from "@/components/permissions/permission-provider";
import {
  LedgerAlert,
  LedgerButton,
  LedgerDataTable,
  LedgerDate,
  LedgerEmptyState,
  LedgerFieldLabel,
  LedgerFieldText,
  LedgerInput,
  LedgerLoadingState,
  LedgerMetricGrid,
  LedgerMoney,
  LedgerPage,
  LedgerPageBody,
  LedgerPageHeader,
  LedgerPanel,
  LedgerSection,
  LedgerStatCard,
  LedgerStatusBadge,
  LedgerSummaryBand,
  type LedgerStatusTone,
} from "@/components/ui/ledger-system";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import {
  bankReconciliationStatusLabel,
  bankStatementImportStatusLabel,
  closedThroughDateLabel,
  reconciliationDifferenceStatus,
} from "@/lib/bank-statements";
import { formatOptionalDate } from "@/lib/invoice-display";
import { formatMoneyAmount } from "@/lib/money";
import { PERMISSIONS } from "@/lib/permissions";
import type { BankReconciliationSummary, BankStatementImportStatus } from "@/lib/types";

function todayInputValue(offsetDays = 0): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

function statementImportStatusTone(status: BankStatementImportStatus): LedgerStatusTone {
  switch (status) {
    case "IMPORTED":
      return "warning";
    case "PARTIALLY_RECONCILED":
      return "info";
    case "RECONCILED":
      return "success";
    case "VOIDED":
      return "danger";
  }
}

export default function BankReconciliationPage() {
  const params = useParams<{ id: string }>();
  const organizationId = useActiveOrganizationId();
  const { can } = usePermissions();
  const [summary, setSummary] = useState<BankReconciliationSummary | null>(null);
  const [from, setFrom] = useState(todayInputValue(-30));
  const [to, setTo] = useState(todayInputValue());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const path = useMemo(() => {
    const query = new URLSearchParams();
    if (from) query.set("from", from);
    if (to) query.set("to", to);
    const suffix = query.toString();
    return `/bank-accounts/${params.id}/reconciliation-summary${suffix ? `?${suffix}` : ""}`;
  }, [from, params.id, to]);

  useEffect(() => {
    if (!organizationId || !params.id) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    apiRequest<BankReconciliationSummary>(path)
      .then((result) => {
        if (!cancelled) setSummary(result);
      })
      .catch((loadError: unknown) => {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Unable to load reconciliation summary.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [organizationId, params.id, path]);

  const status = summary ? reconciliationDifferenceStatus(summary) : "NEEDS_REVIEW";
  const currency = summary?.profile.currency ?? "SAR";
  const canViewBankAccount = can(PERMISSIONS.bankAccounts.view);
  const canImportStatements = can(PERMISSIONS.bankStatements.import);
  const canViewReconciliations = can(PERMISSIONS.bankReconciliations.view);
  const canCreateReconciliation = can(PERMISSIONS.bankReconciliations.create);

  return (
    <LedgerPage>
      <LedgerPageHeader
        eyebrow="Banking"
        title="Reconciliation summary"
        description={summary ? `${summary.profile.displayName} statement and ledger review` : "Statement and ledger review"}
        actions={
          <>
            {canViewReconciliations ? <LedgerButton href={`/bank-accounts/${params.id}/reconciliations`}>Reconciliations</LedgerButton> : null}
            {canCreateReconciliation ? <LedgerButton href={`/bank-accounts/${params.id}/reconciliations/new`} variant="primary">New close</LedgerButton> : null}
            <LedgerButton href={`/bank-accounts/${params.id}/statement-transactions?status=UNMATCHED`}>Unmatched rows</LedgerButton>
            <LedgerButton href={`/bank-accounts/${params.id}`}>Back</LedgerButton>
          </>
        }
      />

      <LedgerSummaryBand tone="warning">
        Reconciliation remains a manual close workflow. Closing requires zero difference and no unmatched statement rows, then locks the statement period from further row changes.
      </LedgerSummaryBand>

      <LedgerPageBody>
        {!organizationId ? <LedgerAlert tone="info">Log in and select an organization to load reconciliation details.</LedgerAlert> : null}
        {loading ? <LedgerLoadingState title="Loading reconciliation summary" /> : null}
        {error ? <LedgerAlert tone="danger">{error}</LedgerAlert> : null}

        <LedgerSection title="Statement period" description="Choose the imported statement range to compare with the posted bank ledger.">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <LedgerFieldLabel>
              <LedgerFieldText>From</LedgerFieldText>
              <LedgerInput type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
            </LedgerFieldLabel>
            <LedgerFieldLabel>
              <LedgerFieldText>To</LedgerFieldText>
              <LedgerInput type="date" value={to} onChange={(event) => setTo(event.target.value)} />
            </LedgerFieldLabel>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-steel">Suggestion</p>
              <div className="mt-1">
                <LedgerStatusBadge tone={status === "RECONCILED" ? "success" : "warning"}>{status === "RECONCILED" ? "Reconciled" : "Needs review"}</LedgerStatusBadge>
              </div>
            </div>
          </div>
        </LedgerSection>

        {summary ? (
          <>
            <ReconciliationSummaryGuidance
              summary={summary}
              profileId={params.id}
              canImportStatements={canImportStatements}
              canCreateReconciliation={canCreateReconciliation}
              canViewBankAccount={canViewBankAccount}
            />

            <LedgerMetricGrid>
              <LedgerStatCard label="Ledger balance" value={<LedgerMoney>{formatMoneyAmount(summary.ledgerBalance, currency)}</LedgerMoney>} />
              <LedgerStatCard label="Statement closing" value={<LedgerMoney>{summary.statementClosingBalance ? formatMoneyAmount(summary.statementClosingBalance, currency) : "-"}</LedgerMoney>} />
              <LedgerStatCard label="Difference" value={<LedgerMoney>{summary.difference ? formatMoneyAmount(summary.difference, currency) : "-"}</LedgerMoney>} />
              <LedgerStatCard label="Unmatched rows" value={summary.totals.unmatched.count} />
              <LedgerStatCard label="Closed through" value={closedThroughDateLabel(summary)} />
              <LedgerStatCard label="Unreconciled rows" value={summary.unreconciledTransactionCount} />
              <LedgerStatCard label="Open draft" value={summary.hasOpenDraftReconciliation ? "Yes" : "No"} />
              <LedgerStatCard
                label="Latest close"
                value={summary.latestClosedReconciliation ? `${summary.latestClosedReconciliation.reconciliationNumber} ${bankReconciliationStatusLabel(summary.latestClosedReconciliation.status)}` : "-"}
              />
            </LedgerMetricGrid>

            <LedgerSection title="Statement row totals" description="Imported statement row totals by review state for this period.">
              <LedgerMetricGrid className="md:grid-cols-3 xl:grid-cols-3">
                <LedgerStatCard label="Credits" value={`${summary.totals.credits.count} / ${formatMoneyAmount(summary.totals.credits.total, currency)}`} />
                <LedgerStatCard label="Debits" value={`${summary.totals.debits.count} / ${formatMoneyAmount(summary.totals.debits.total, currency)}`} />
                <LedgerStatCard label="Matched" value={`${summary.totals.matched.count} / ${formatMoneyAmount(summary.totals.matched.total, currency)}`} />
                <LedgerStatCard label="Categorized" value={`${summary.totals.categorized.count} / ${formatMoneyAmount(summary.totals.categorized.total, currency)}`} />
                <LedgerStatCard label="Ignored" value={`${summary.totals.ignored.count} / ${formatMoneyAmount(summary.totals.ignored.total, currency)}`} />
                <LedgerStatCard label="Unmatched" value={`${summary.totals.unmatched.count} / ${formatMoneyAmount(summary.totals.unmatched.total, currency)}`} />
              </LedgerMetricGrid>
            </LedgerSection>

            <LedgerSection title="Statement imports" description="Imported statement files included in the selected period.">
              <LedgerDataTable minWidth="900px">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
                  <tr>
                    <th className="px-4 py-3">Filename</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Statement range</th>
                    <th className="px-4 py-3 text-right">Rows</th>
                    <th className="px-4 py-3 text-right">Closing balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {summary.imports.map((statementImport) => (
                    <tr key={statementImport.id}>
                      <td className="px-4 py-3 text-ink">{statementImport.filename}</td>
                      <td className="px-4 py-3"><LedgerStatusBadge tone={statementImportStatusTone(statementImport.status)}>{bankStatementImportStatusLabel(statementImport.status)}</LedgerStatusBadge></td>
                      <td className="px-4 py-3 text-steel">
                        <LedgerDate>{formatOptionalDate(statementImport.statementStartDate, "-")} to {formatOptionalDate(statementImport.statementEndDate, "-")}</LedgerDate>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs">{statementImport.rowCount}</td>
                      <td className="px-4 py-3 text-right"><LedgerMoney>{statementImport.closingStatementBalance ? formatMoneyAmount(statementImport.closingStatementBalance, currency) : "-"}</LedgerMoney></td>
                    </tr>
                  ))}
                </tbody>
              </LedgerDataTable>
              {summary.imports.length === 0 ? (
                <div className="mt-4">
                  <LedgerEmptyState title="No statement imports found for this date range." />
                </div>
              ) : null}
            </LedgerSection>
          </>
        ) : null}
      </LedgerPageBody>
    </LedgerPage>
  );
}

export function ReconciliationSummaryGuidance({
  summary,
  profileId,
  canImportStatements = true,
  canCreateReconciliation = true,
  canViewBankAccount = true,
}: {
  summary: BankReconciliationSummary;
  profileId: string;
  canImportStatements?: boolean;
  canCreateReconciliation?: boolean;
  canViewBankAccount?: boolean;
}) {
  const status = reconciliationDifferenceStatus(summary);
  const differenceText = summary.difference ? formatMoneyAmount(summary.difference, summary.profile.currency) : "-";
  return (
    <LedgerPanel>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold text-ink">How reconciliation works</h2>
            <LedgerStatusBadge tone={status === "RECONCILED" ? "success" : "warning"}>{status === "RECONCILED" ? "Ready to close" : "Needs review"}</LedgerStatusBadge>
          </div>
          <p className="mt-2 text-sm leading-6 text-steel">
            Reconciliation compares the posted bank ledger against imported statement rows for the selected period. You can close only when the difference is zero and no statement rows are unmatched.
          </p>
          <div className="mt-3 grid grid-cols-1 gap-2 text-sm text-steel md:grid-cols-3">
            <p><span className="font-medium text-ink">Difference:</span> {differenceText}</p>
            <p><span className="font-medium text-ink">Unmatched rows:</span> {summary.totals.unmatched.count}</p>
            <p><span className="font-medium text-ink">Closed through:</span> {closedThroughDateLabel(summary)}</p>
          </div>
          <p className="mt-3 text-xs leading-5 text-steel">
            Closed reconciliations lock statement rows in that period from matching, categorizing, ignoring, and overlapping imports.
          </p>
        </div>
        <div className="min-w-full lg:min-w-[260px]">
          <p className="text-xs font-semibold uppercase tracking-wide text-steel">Next actions</p>
          <div className="mt-2 flex flex-wrap gap-2 lg:flex-col">
            <LedgerButton href={`/bank-accounts/${profileId}/statement-transactions?status=UNMATCHED`}>Review unmatched rows</LedgerButton>
            {canImportStatements ? <LedgerButton href={`/bank-accounts/${profileId}/statement-imports`}>Import statement</LedgerButton> : null}
            {canCreateReconciliation ? <LedgerButton href={`/bank-accounts/${profileId}/reconciliations/new`}>Create close draft</LedgerButton> : null}
            {canViewBankAccount ? <LedgerButton href={`/bank-accounts/${profileId}`}>Bank account</LedgerButton> : null}
          </div>
        </div>
      </div>
    </LedgerPanel>
  );
}
