"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { usePermissions } from "@/components/permissions/permission-provider";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { cardSettlementStatusBadgeClass, cardSettlementStatusLabel, cardSettlementTypeLabel, validateCardSettlementInput } from "@/lib/card-settlements";
import { formatOptionalDate } from "@/lib/invoice-display";
import { formatMoneyAmount } from "@/lib/money";
import { PERMISSIONS } from "@/lib/permissions";
import type { BankAccountSummary, CardSettlement, CardSettlementType } from "@/lib/types";

const SETTLEMENT_TYPES: CardSettlementType[] = ["CREDIT_CARD_PAYDOWN", "CREDIT_CARD_CREDIT", "PREPAID_CARD_TOP_UP"];

function todayInputValue(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function CardSettlementsPage() {
  const params = useParams<{ id: string }>();
  const organizationId = useActiveOrganizationId();
  const { can } = usePermissions();
  const canManage = can(PERMISSIONS.bankStatements.manage);
  const [profile, setProfile] = useState<BankAccountSummary | null>(null);
  const [bankAccounts, setBankAccounts] = useState<BankAccountSummary[]>([]);
  const [settlements, setSettlements] = useState<CardSettlement[]>([]);
  const [settlementType, setSettlementType] = useState<CardSettlementType>("CREDIT_CARD_PAYDOWN");
  const [fundingBankAccountProfileId, setFundingBankAccountProfileId] = useState("");
  const [cardAccountProfileId, setCardAccountProfileId] = useState("");
  const [settlementDate, setSettlementDate] = useState(todayInputValue());
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [memo, setMemo] = useState("");
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
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
      apiRequest<BankAccountSummary[]>("/bank-accounts"),
      apiRequest<CardSettlement[]>(`/card-settlements?bankAccountProfileId=${params.id}`),
    ])
      .then(([profileResult, bankAccountResult, settlementResult]) => {
        if (cancelled) {
          return;
        }
        setProfile(profileResult);
        setBankAccounts(bankAccountResult);
        setSettlements(settlementResult);
        setFundingBankAccountProfileId((current) => current || (profileResult.type === "CARD" || profileResult.type === "WALLET" ? "" : profileResult.id));
        setCardAccountProfileId((current) => current || (profileResult.type === "CARD" || profileResult.type === "WALLET" ? profileResult.id : ""));
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load card settlements.");
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
  }, [organizationId, params.id]);

  const activeAccounts = useMemo(() => bankAccounts.filter((account) => account.status === "ACTIVE"), [bankAccounts]);
  const cardAccounts = useMemo(
    () => activeAccounts.filter((account) => account.type === "CARD" || account.type === "WALLET"),
    [activeAccounts],
  );
  const fundingAccounts = useMemo(() => activeAccounts.filter((account) => account.account.type === "ASSET"), [activeAccounts]);
  const totals = useMemo(
    () =>
      settlements.reduce(
        (summary, settlement) => {
          summary.count += 1;
          summary.amount += Number(settlement.amount);
          return summary;
        },
        { count: 0, amount: 0 },
      ),
    [settlements],
  );

  async function createSettlement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationError = validateCardSettlementInput({
      settlementType,
      fundingBankAccountProfileId: settlementType === "CREDIT_CARD_CREDIT" ? undefined : fundingBankAccountProfileId,
      cardAccountProfileId,
      amount,
      currency,
    });
    if (validationError) {
      setError(validationError);
      return;
    }

    setCreating(true);
    setError("");
    setSuccess("");
    try {
      const created = await apiRequest<CardSettlement>("/card-settlements", {
        method: "POST",
        body: {
          settlementType,
          fundingBankAccountProfileId: settlementType === "CREDIT_CARD_CREDIT" ? undefined : fundingBankAccountProfileId,
          cardAccountProfileId,
          settlementDate: `${settlementDate}T00:00:00.000Z`,
          currency,
          amount,
          reference: reference.trim() || undefined,
          memo: memo.trim() || undefined,
        },
      });
      setSettlements((current) => [created, ...current]);
      setSuccess("Draft card settlement created.");
      setAmount("");
      setReference("");
      setMemo("");
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Unable to create card settlement.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <section>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Card settlements</h1>
          <p className="mt-1 text-sm text-steel">{profile ? `${profile.displayName} settlement workflow` : "Credit and prepaid card settlement workflow"}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/bank-accounts/${params.id}/statement-transactions?status=UNMATCHED`} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Statement rows
          </Link>
          <Link href={`/bank-accounts/${params.id}`} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Back
          </Link>
        </div>
      </div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">Log in and select an organization to load card settlements.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading card settlements...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {success ? <StatusMessage type="success">{success}</StatusMessage> : null}
        {!canManage ? <StatusMessage type="info">You can view card settlements, but creating or editing drafts requires bank statement manage permission.</StatusMessage> : null}
      </div>

      <CardSettlementGuidance />

      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
        <SummaryCard label="Settlements" value={String(totals.count)} />
        <SummaryCard label="Total amount" value={formatMoneyAmount(totals.amount.toFixed(4), currency)} />
        <SummaryCard label="Currency" value={currency} />
      </div>

      {canManage ? (
        <form onSubmit={createSettlement} className="mt-5 rounded-md border border-slate-200 bg-white p-5 shadow-panel">
          <h2 className="text-base font-semibold text-ink">Create draft settlement</h2>
          <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wide text-steel">Settlement type</span>
              <select value={settlementType} onChange={(event) => setSettlementType(event.target.value as CardSettlementType)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm">
                {SETTLEMENT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {cardSettlementTypeLabel(type)}
                  </option>
                ))}
              </select>
            </label>
            {settlementType !== "CREDIT_CARD_CREDIT" ? (
              <label className="block">
                <span className="text-xs font-medium uppercase tracking-wide text-steel">Funding bank account</span>
                <select value={fundingBankAccountProfileId} onChange={(event) => setFundingBankAccountProfileId(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm">
                  <option value="">Select funding account</option>
                  {fundingAccounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.displayName} - {account.currency}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wide text-steel">Card/prepaid account</span>
              <select value={cardAccountProfileId} onChange={(event) => setCardAccountProfileId(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm">
                <option value="">Select card account</option>
                {cardAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.displayName} - {account.type} - {account.currency}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wide text-steel">Settlement date</span>
              <input type="date" value={settlementDate} onChange={(event) => setSettlementDate(event.target.value)} required className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
            </label>
            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wide text-steel">Amount</span>
              <input inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} required className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
            </label>
            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wide text-steel">Reference</span>
              <input value={reference} onChange={(event) => setReference(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
            </label>
            <label className="block lg:col-span-2">
              <span className="text-xs font-medium uppercase tracking-wide text-steel">Memo</span>
              <input value={memo} onChange={(event) => setMemo(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
            </label>
            <div className="flex items-end">
              <button type="submit" disabled={creating} className="w-full rounded-md bg-palm px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400">
                {creating ? "Creating..." : "Create draft"}
              </button>
            </div>
          </div>
        </form>
      ) : null}

      <div className="mt-5 overflow-x-auto rounded-md border border-slate-200 bg-white shadow-panel">
        <table className="w-full min-w-[1040px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Funding account</th>
              <th className="px-4 py-3">Card account</th>
              <th className="px-4 py-3 text-right">Amount</th>
              <th className="px-4 py-3">Statement row</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {settlements.map((settlement) => (
              <tr key={settlement.id}>
                <td className="px-4 py-3 text-steel">{formatOptionalDate(settlement.settlementDate, "-")}</td>
                <td className="px-4 py-3 text-ink">{cardSettlementTypeLabel(settlement.settlementType)}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-md px-2 py-1 text-xs font-medium ${cardSettlementStatusBadgeClass(settlement.status)}`}>
                    {cardSettlementStatusLabel(settlement.status)}
                  </span>
                </td>
                <td className="px-4 py-3 text-steel">{settlement.fundingBankAccountProfile?.displayName ?? "-"}</td>
                <td className="px-4 py-3 text-steel">{settlement.cardAccountProfile?.displayName ?? "-"}</td>
                <td className="px-4 py-3 text-right font-mono text-xs">{formatMoneyAmount(settlement.amount, settlement.currency)}</td>
                <td className="px-4 py-3 text-steel">
                  {settlement.statementTransaction
                    ? `${formatOptionalDate(settlement.statementTransaction.transactionDate, "-")} - ${settlement.statementTransaction.description}`
                    : "Not matched"}
                </td>
                <td className="px-4 py-3">
                  <Link href={`/bank-accounts/${params.id}/card-settlements/${settlement.id}`} className="rounded-md border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50">
                    Open
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && settlements.length === 0 ? (
          <div className="p-4">
            <StatusMessage type="empty">No card settlements yet.</StatusMessage>
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function CardSettlementGuidance() {
  return (
    <div className="mt-5 rounded-md border border-slate-200 bg-slate-50 p-4">
      <h2 className="text-base font-semibold text-ink">Manual card settlement workflow</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-steel">
        Card settlement records help reconcile credit card paydowns, credit/refund rows, and prepaid card top-ups. This is manual banking only: no live bank feed, no bank API call, no card credentials are collected, and no bank payment is sent.
      </p>
      <p className="mt-2 max-w-3xl text-xs leading-5 text-steel">
        Journal-backed card settlement posting is deferred until card liability, prepaid asset, and clearing-account classifications are explicitly confirmed. Posting a settlement here changes only operational settlement status.
      </p>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-4 shadow-panel">
      <p className="text-xs font-medium uppercase tracking-wide text-steel">{label}</p>
      <p className="mt-2 font-mono text-sm font-semibold text-ink">{value}</p>
    </div>
  );
}
