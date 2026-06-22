"use client";

import { useParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
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
import { bankDepositStatusLabel } from "@/lib/bank-deposits";
import { formatOptionalDate } from "@/lib/invoice-display";
import { formatMoneyAmount } from "@/lib/money";
import { PERMISSIONS } from "@/lib/permissions";
import type { BankAccountSummary, BankDepositBatch, BankDepositBatchStatus } from "@/lib/types";

function todayInputValue(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function BankDepositsPage() {
  const params = useParams<{ id: string }>();
  const organizationId = useActiveOrganizationId();
  const { can } = usePermissions();
  const canManage = can(PERMISSIONS.bankStatements.manage);
  const [profile, setProfile] = useState<BankAccountSummary | null>(null);
  const [deposits, setDeposits] = useState<BankDepositBatch[]>([]);
  const [depositDate, setDepositDate] = useState(todayInputValue());
  const [memo, setMemo] = useState("");
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const currency = profile?.currency ?? "SAR";

  useEffect(() => {
    if (!organizationId || !params.id) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    Promise.all([
      apiRequest<BankAccountSummary>(`/bank-accounts/${params.id}`),
      apiRequest<BankDepositBatch[]>(`/bank-deposits?bankAccountProfileId=${params.id}`),
    ])
      .then(([profileResult, depositResult]) => {
        if (!cancelled) {
          setProfile(profileResult);
          setDeposits(depositResult);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load bank deposits.");
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
  }, [organizationId, params.id, reloadToken]);

  const totals = useMemo(
    () =>
      deposits.reduce(
        (summary, deposit) => {
          summary.count += 1;
          summary.amount += Number(deposit.totalAmount);
          return summary;
        },
        { count: 0, amount: 0 },
      ),
    [deposits],
  );

  async function createDeposit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile) {
      return;
    }
    setCreating(true);
    setError("");
    setSuccess("");
    try {
      const created = await apiRequest<BankDepositBatch>("/bank-deposits", {
        method: "POST",
        body: {
          bankAccountProfileId: profile.id,
          depositDate: `${depositDate}T00:00:00.000Z`,
          currency: profile.currency,
          memo: memo.trim() || undefined,
        },
      });
      setSuccess("Draft bank deposit batch created.");
      setMemo("");
      setDeposits((current) => [created, ...current]);
      setReloadToken((current) => current + 1);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Unable to create bank deposit batch.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <LedgerPage>
      <LedgerPageHeader
        eyebrow="Banking"
        title="Bank deposit batches"
        description={profile ? `${profile.displayName} grouped receipt deposits` : "Grouped receipt deposits"}
        actions={
          <>
            <LedgerButton href={`/bank-accounts/${params.id}/statement-transactions?status=UNMATCHED`}>Statement rows</LedgerButton>
            <LedgerButton href={`/bank-accounts/${params.id}`}>Back</LedgerButton>
          </>
        }
      />

      <LedgerSummaryBand tone="warning">
        Deposit batches are operational grouping records for explicit statement-credit matching and accountant-reviewed clearing-account posture.
      </LedgerSummaryBand>

      <LedgerPageBody>
        {!organizationId ? <LedgerAlert tone="info">Log in and select an organization to load bank deposits.</LedgerAlert> : null}
        {loading ? <LedgerLoadingState title="Loading bank deposits" /> : null}
        {error ? <LedgerAlert tone="danger">{error}</LedgerAlert> : null}
        {success ? <LedgerAlert tone="success">{success}</LedgerAlert> : null}
        {!canManage ? <LedgerAlert tone="info">You can view deposit batches, but creating or editing drafts requires bank statement manage permission.</LedgerAlert> : null}

        <BankDepositGuidance />

        <LedgerMetricGrid className="md:grid-cols-3 xl:grid-cols-3">
          <LedgerStatCard label="Batches" value={totals.count} />
          <LedgerStatCard label="Total grouped" value={<LedgerMoney>{formatMoneyAmount(totals.amount.toFixed(4), currency)}</LedgerMoney>} />
          <LedgerStatCard label="Currency" value={currency} />
        </LedgerMetricGrid>

        {canManage && profile ? (
          <LedgerSection title="Create draft deposit" description="Draft batches are operational grouping records until explicitly posted and matched.">
            <form onSubmit={createDeposit} className="grid grid-cols-1 gap-3 md:grid-cols-[220px_1fr_auto] md:items-end">
              <LedgerFieldLabel>
                <LedgerFieldText>Deposit date</LedgerFieldText>
                <LedgerInput type="date" value={depositDate} onChange={(event) => setDepositDate(event.target.value)} required />
              </LedgerFieldLabel>
              <LedgerFieldLabel>
                <LedgerFieldText>Memo</LedgerFieldText>
                <LedgerInput value={memo} onChange={(event) => setMemo(event.target.value)} />
              </LedgerFieldLabel>
              <LedgerButton type="submit" disabled={creating} variant="primary">
                {creating ? "Creating..." : "Create draft"}
              </LedgerButton>
            </form>
          </LedgerSection>
        ) : null}

        <LedgerSection title="Deposit batches" description="Posted batches can be matched explicitly to imported statement credit rows.">
          <LedgerDataTable minWidth="900px">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Memo</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3">Statement row</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {deposits.map((deposit) => (
                <tr key={deposit.id}>
                  <td className="px-4 py-3"><LedgerDate>{formatOptionalDate(deposit.depositDate, "-")}</LedgerDate></td>
                  <td className="px-4 py-3 text-ink">{deposit.memo ?? "-"}</td>
                  <td className="px-4 py-3">
                    <LedgerStatusBadge tone={bankDepositStatusTone(deposit.status)}>{bankDepositStatusLabel(deposit.status)}</LedgerStatusBadge>
                  </td>
                  <td className="px-4 py-3 text-right"><LedgerMoney>{formatMoneyAmount(deposit.totalAmount, deposit.currency)}</LedgerMoney></td>
                  <td className="px-4 py-3 text-steel">
                    {deposit.statementTransaction
                      ? `${formatOptionalDate(deposit.statementTransaction.transactionDate, "-")} - ${deposit.statementTransaction.description}`
                      : "Not matched"}
                  </td>
                  <td className="px-4 py-3">
                    <LedgerButton href={`/bank-accounts/${params.id}/deposits/${deposit.id}`} size="sm">Open</LedgerButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </LedgerDataTable>
          {!loading && deposits.length === 0 ? (
            <div className="mt-4">
              <LedgerEmptyState title="No bank deposit batches yet." />
            </div>
          ) : null}
        </LedgerSection>
      </LedgerPageBody>
    </LedgerPage>
  );
}

export function BankDepositGuidance() {
  return (
    <LedgerPanel>
      <h2 className="text-base font-semibold text-ink">Manual treasury grouping</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-steel">
        Deposit batches group receipt-like items so one posted batch can be explicitly matched to one imported bank statement credit row. This is manual banking only: no live bank feed, no bank API call, no bank payment is sent, and no payment initiation is enabled.
      </p>
      <p className="mt-2 max-w-3xl text-xs leading-5 text-steel">
        Ledger-backed undeposited-funds movement is deferred until a clearing-account model is confirmed. Posting a deposit batch here changes only the operational deposit status and does not duplicate revenue, AR settlement, VAT, ZATCA, or bank journal behavior.
      </p>
    </LedgerPanel>
  );
}

function bankDepositStatusTone(status: BankDepositBatchStatus): LedgerStatusTone {
  if (status === "MATCHED") return "success";
  if (status === "POSTED") return "info";
  if (status === "VOIDED") return "neutral";
  return "draft";
}
