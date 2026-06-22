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
  LedgerSelect,
  LedgerStatCard,
  LedgerStatusBadge,
  LedgerSummaryBand,
  type LedgerStatusTone,
} from "@/components/ui/ledger-system";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { cardSettlementStatusLabel, cardSettlementTypeLabel, validateCardSettlementInput } from "@/lib/card-settlements";
import { formatOptionalDate } from "@/lib/invoice-display";
import { formatMoneyAmount } from "@/lib/money";
import { PERMISSIONS } from "@/lib/permissions";
import type { BankAccountSummary, CardSettlement, CardSettlementStatus, CardSettlementType } from "@/lib/types";

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
    <LedgerPage>
      <LedgerPageHeader
        eyebrow="Banking"
        title="Card settlements"
        description={profile ? `${profile.displayName} settlement workflow` : "Credit and prepaid card settlement workflow"}
        actions={
          <>
            <LedgerButton href={`/bank-accounts/${params.id}/statement-transactions?status=UNMATCHED`}>Statement rows</LedgerButton>
            <LedgerButton href={`/bank-accounts/${params.id}`}>Back</LedgerButton>
          </>
        }
      />

      <LedgerSummaryBand tone="warning">
        Card settlement records support explicit paydown, credit/refund, and prepaid top-up review without changing provider or payment behavior.
      </LedgerSummaryBand>

      <LedgerPageBody>
        {!organizationId ? <LedgerAlert tone="info">Log in and select an organization to load card settlements.</LedgerAlert> : null}
        {loading ? <LedgerLoadingState title="Loading card settlements" /> : null}
        {error ? <LedgerAlert tone="danger">{error}</LedgerAlert> : null}
        {success ? <LedgerAlert tone="success">{success}</LedgerAlert> : null}
        {!canManage ? <LedgerAlert tone="info">You can view card settlements, but creating or editing drafts requires bank statement manage permission.</LedgerAlert> : null}

        <CardSettlementGuidance />

        <LedgerMetricGrid className="md:grid-cols-3 xl:grid-cols-3">
          <LedgerStatCard label="Settlements" value={totals.count} />
          <LedgerStatCard label="Total amount" value={<LedgerMoney>{formatMoneyAmount(totals.amount.toFixed(4), currency)}</LedgerMoney>} />
          <LedgerStatCard label="Currency" value={currency} />
        </LedgerMetricGrid>

        {canManage ? (
          <LedgerSection title="Create draft settlement" description="Settlement records remain manual until explicitly posted, matched, or voided.">
            <form onSubmit={createSettlement} className="grid grid-cols-1 gap-3 lg:grid-cols-3">
              <LedgerFieldLabel>
                <LedgerFieldText>Settlement type</LedgerFieldText>
                <LedgerSelect value={settlementType} onChange={(event) => setSettlementType(event.target.value as CardSettlementType)}>
                  {SETTLEMENT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {cardSettlementTypeLabel(type)}
                    </option>
                  ))}
                </LedgerSelect>
              </LedgerFieldLabel>
              {settlementType !== "CREDIT_CARD_CREDIT" ? (
                <LedgerFieldLabel>
                  <LedgerFieldText>Funding bank account</LedgerFieldText>
                  <LedgerSelect value={fundingBankAccountProfileId} onChange={(event) => setFundingBankAccountProfileId(event.target.value)}>
                    <option value="">Select funding account</option>
                    {fundingAccounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.displayName} - {account.currency}
                      </option>
                    ))}
                  </LedgerSelect>
                </LedgerFieldLabel>
              ) : null}
              <LedgerFieldLabel>
                <LedgerFieldText>Card/prepaid account</LedgerFieldText>
                <LedgerSelect value={cardAccountProfileId} onChange={(event) => setCardAccountProfileId(event.target.value)}>
                  <option value="">Select card account</option>
                  {cardAccounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.displayName} - {account.type} - {account.currency}
                    </option>
                  ))}
                </LedgerSelect>
              </LedgerFieldLabel>
              <LedgerFieldLabel>
                <LedgerFieldText>Settlement date</LedgerFieldText>
                <LedgerInput type="date" value={settlementDate} onChange={(event) => setSettlementDate(event.target.value)} required />
              </LedgerFieldLabel>
              <LedgerFieldLabel>
                <LedgerFieldText>Amount</LedgerFieldText>
                <LedgerInput inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} required />
              </LedgerFieldLabel>
              <LedgerFieldLabel>
                <LedgerFieldText>Reference</LedgerFieldText>
                <LedgerInput value={reference} onChange={(event) => setReference(event.target.value)} />
              </LedgerFieldLabel>
              <LedgerFieldLabel className="lg:col-span-2">
                <LedgerFieldText>Memo</LedgerFieldText>
                <LedgerInput value={memo} onChange={(event) => setMemo(event.target.value)} />
              </LedgerFieldLabel>
              <div className="flex items-end">
                <LedgerButton type="submit" disabled={creating} variant="primary" className="w-full">
                  {creating ? "Creating..." : "Create draft"}
                </LedgerButton>
              </div>
            </form>
          </LedgerSection>
        ) : null}

        <LedgerSection title="Card settlement register" description="Operational settlement status and statement matching remain explicit.">
          <LedgerDataTable minWidth="1040px">
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
                  <td className="px-4 py-3"><LedgerDate>{formatOptionalDate(settlement.settlementDate, "-")}</LedgerDate></td>
                  <td className="px-4 py-3 text-ink">{cardSettlementTypeLabel(settlement.settlementType)}</td>
                  <td className="px-4 py-3">
                    <LedgerStatusBadge tone={cardSettlementStatusTone(settlement.status)}>{cardSettlementStatusLabel(settlement.status)}</LedgerStatusBadge>
                  </td>
                  <td className="px-4 py-3 text-steel">{settlement.fundingBankAccountProfile?.displayName ?? "-"}</td>
                  <td className="px-4 py-3 text-steel">{settlement.cardAccountProfile?.displayName ?? "-"}</td>
                  <td className="px-4 py-3 text-right"><LedgerMoney>{formatMoneyAmount(settlement.amount, settlement.currency)}</LedgerMoney></td>
                  <td className="px-4 py-3 text-steel">
                    {settlement.statementTransaction
                      ? `${formatOptionalDate(settlement.statementTransaction.transactionDate, "-")} - ${settlement.statementTransaction.description}`
                      : "Not matched"}
                  </td>
                  <td className="px-4 py-3">
                    <LedgerButton href={`/bank-accounts/${params.id}/card-settlements/${settlement.id}`} size="sm">Open</LedgerButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </LedgerDataTable>
          {!loading && settlements.length === 0 ? (
            <div className="mt-4">
              <LedgerEmptyState title="No card settlements yet." />
            </div>
          ) : null}
        </LedgerSection>
      </LedgerPageBody>
    </LedgerPage>
  );
}

export function CardSettlementGuidance() {
  return (
    <LedgerPanel>
      <h2 className="text-base font-semibold text-ink">Manual card settlement workflow</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-steel">
        Card settlement records help reconcile credit card paydowns, credit/refund rows, and prepaid card top-ups. This is manual banking only: no live bank feed, no bank API call, no card credentials are collected, and no bank payment is sent.
      </p>
      <p className="mt-2 max-w-3xl text-xs leading-5 text-steel">
        Journal-backed card settlement posting is deferred until card liability, prepaid asset, and clearing-account classifications are explicitly confirmed. Posting a settlement here changes only operational settlement status.
      </p>
    </LedgerPanel>
  );
}

function cardSettlementStatusTone(status: CardSettlementStatus): LedgerStatusTone {
  if (status === "MATCHED") return "success";
  if (status === "POSTED") return "info";
  if (status === "VOIDED") return "neutral";
  return "draft";
}
