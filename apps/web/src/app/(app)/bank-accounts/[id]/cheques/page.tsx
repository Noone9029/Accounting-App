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
import { chequeStatusLabel, chequeTypeLabel, validateChequeInput } from "@/lib/cheques";
import { formatOptionalDate } from "@/lib/invoice-display";
import { formatMoneyAmount } from "@/lib/money";
import { PERMISSIONS } from "@/lib/permissions";
import type { BankAccountSummary, ChequeInstrument, ChequeInstrumentStatus, ChequeInstrumentType } from "@/lib/types";

function todayInputValue(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function ChequesPage() {
  const params = useParams<{ id: string }>();
  const organizationId = useActiveOrganizationId();
  const { can } = usePermissions();
  const canManage = can(PERMISSIONS.bankStatements.manage);
  const [profile, setProfile] = useState<BankAccountSummary | null>(null);
  const [cheques, setCheques] = useState<ChequeInstrument[]>([]);
  const [chequeType, setChequeType] = useState<ChequeInstrumentType>("RECEIVED");
  const [chequeNumber, setChequeNumber] = useState("");
  const [counterpartyName, setCounterpartyName] = useState("");
  const [drawerBankName, setDrawerBankName] = useState("");
  const [payeeName, setPayeeName] = useState("");
  const [issueDate, setIssueDate] = useState(todayInputValue());
  const [receivedDate, setReceivedDate] = useState(todayInputValue());
  const [dueDate, setDueDate] = useState(todayInputValue());
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
      apiRequest<ChequeInstrument[]>(`/cheques?bankAccountProfileId=${params.id}`),
    ])
      .then(([profileResult, chequeResult]) => {
        if (!cancelled) {
          setProfile(profileResult);
          setCheques(chequeResult);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load cheques.");
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

  const totals = useMemo(
    () =>
      cheques.reduce(
        (summary, cheque) => {
          summary.count += 1;
          summary.amount += Number(cheque.amount);
          return summary;
        },
        { count: 0, amount: 0 },
      ),
    [cheques],
  );

  async function createCheque(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationError = validateChequeInput({ chequeNumber, counterpartyName, amount, currency, chequeType, issueDate, receivedDate });
    if (validationError) {
      setError(validationError);
      return;
    }
    setCreating(true);
    setError("");
    setSuccess("");
    try {
      const created = await apiRequest<ChequeInstrument>("/cheques", {
        method: "POST",
        body: {
          chequeType,
          bankAccountProfileId: params.id,
          counterpartyType: "OTHER",
          counterpartyName: counterpartyName.trim(),
          chequeNumber: chequeNumber.trim(),
          drawerBankName: drawerBankName.trim() || undefined,
          payeeName: payeeName.trim() || undefined,
          issueDate: issueDate ? `${issueDate}T00:00:00.000Z` : undefined,
          receivedDate: chequeType === "RECEIVED" && receivedDate ? `${receivedDate}T00:00:00.000Z` : undefined,
          dueDate: dueDate ? `${dueDate}T00:00:00.000Z` : undefined,
          amount,
          currency,
          reference: reference.trim() || undefined,
          memo: memo.trim() || undefined,
        },
      });
      setCheques((current) => [created, ...current]);
      setSuccess("Draft cheque created.");
      setChequeNumber("");
      setCounterpartyName("");
      setDrawerBankName("");
      setPayeeName("");
      setAmount("");
      setReference("");
      setMemo("");
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Unable to create cheque.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <LedgerPage>
      <LedgerPageHeader
        eyebrow="Banking"
        title="Cheques"
        description={profile ? `${profile.displayName} manual cheque register` : "Manual cheque register"}
        actions={
          <>
            <LedgerButton href={`/bank-accounts/${params.id}/deposits`}>Deposits</LedgerButton>
            <LedgerButton href={`/bank-accounts/${params.id}/statement-transactions?status=UNMATCHED`}>Statement rows</LedgerButton>
            <LedgerButton href={`/bank-accounts/${params.id}`}>Back</LedgerButton>
          </>
        }
      />

      <LedgerSummaryBand tone="warning">
        Cheques remain manual received or issued treasury instruments with explicit lifecycle, deposit, and statement matching actions.
      </LedgerSummaryBand>

      <LedgerPageBody>
        {!organizationId ? <LedgerAlert tone="info">Log in and select an organization to load cheques.</LedgerAlert> : null}
        {loading ? <LedgerLoadingState title="Loading cheques" /> : null}
        {error ? <LedgerAlert tone="danger">{error}</LedgerAlert> : null}
        {success ? <LedgerAlert tone="success">{success}</LedgerAlert> : null}

        <ChequeGuidance />

        <LedgerMetricGrid className="md:grid-cols-3 xl:grid-cols-3">
          <LedgerStatCard label="Cheques" value={totals.count} />
          <LedgerStatCard label="Total amount" value={<LedgerMoney>{formatMoneyAmount(totals.amount.toFixed(4), currency)}</LedgerMoney>} />
          <LedgerStatCard label="Currency" value={currency} />
        </LedgerMetricGrid>

        {canManage ? (
          <LedgerSection title="Create draft cheque" description="Draft cheques remain operational records until explicit lifecycle actions are taken.">
            <form onSubmit={createCheque} className="grid grid-cols-1 gap-3 lg:grid-cols-3">
              <LedgerFieldLabel>
                <LedgerFieldText>Type</LedgerFieldText>
                <LedgerSelect value={chequeType} onChange={(event) => setChequeType(event.target.value as ChequeInstrumentType)}>
                  <option value="RECEIVED">Received cheque</option>
                  <option value="ISSUED">Issued cheque</option>
                </LedgerSelect>
              </LedgerFieldLabel>
              <LedgerFieldLabel>
                <LedgerFieldText>Cheque number</LedgerFieldText>
                <LedgerInput value={chequeNumber} onChange={(event) => setChequeNumber(event.target.value)} />
              </LedgerFieldLabel>
              <LedgerFieldLabel>
                <LedgerFieldText>Counterparty</LedgerFieldText>
                <LedgerInput value={counterpartyName} onChange={(event) => setCounterpartyName(event.target.value)} />
              </LedgerFieldLabel>
              <LedgerFieldLabel>
                <LedgerFieldText>Issue date</LedgerFieldText>
                <LedgerInput type="date" value={issueDate} onChange={(event) => setIssueDate(event.target.value)} />
              </LedgerFieldLabel>
              {chequeType === "RECEIVED" ? (
                <LedgerFieldLabel>
                  <LedgerFieldText>Received date</LedgerFieldText>
                  <LedgerInput type="date" value={receivedDate} onChange={(event) => setReceivedDate(event.target.value)} />
                </LedgerFieldLabel>
              ) : null}
              <LedgerFieldLabel>
                <LedgerFieldText>Due/clearing date</LedgerFieldText>
                <LedgerInput type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
              </LedgerFieldLabel>
              <LedgerFieldLabel>
                <LedgerFieldText>Amount</LedgerFieldText>
                <LedgerInput inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} />
              </LedgerFieldLabel>
              <LedgerFieldLabel>
                <LedgerFieldText>Drawer bank</LedgerFieldText>
                <LedgerInput value={drawerBankName} onChange={(event) => setDrawerBankName(event.target.value)} />
              </LedgerFieldLabel>
              <LedgerFieldLabel>
                <LedgerFieldText>Payee</LedgerFieldText>
                <LedgerInput value={payeeName} onChange={(event) => setPayeeName(event.target.value)} />
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

        <LedgerSection title="Cheque register" description="Cheque lifecycle, deposit, and statement matching actions stay explicit.">
          <LedgerDataTable minWidth="1040px">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
              <tr>
                <th className="px-4 py-3">Cheque</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Counterparty</th>
                <th className="px-4 py-3">Due date</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3">Deposit</th>
                <th className="px-4 py-3">Statement row</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cheques.map((cheque) => (
                <tr key={cheque.id}>
                  <td className="px-4 py-3 font-medium text-ink">{cheque.chequeNumber}</td>
                  <td className="px-4 py-3 text-steel">{chequeTypeLabel(cheque.chequeType)}</td>
                  <td className="px-4 py-3">
                    <LedgerStatusBadge tone={chequeStatusTone(cheque.status)}>{chequeStatusLabel(cheque.status)}</LedgerStatusBadge>
                  </td>
                  <td className="px-4 py-3 text-steel">{cheque.counterpartyName}</td>
                  <td className="px-4 py-3"><LedgerDate>{formatOptionalDate(cheque.dueDate, "-")}</LedgerDate></td>
                  <td className="px-4 py-3 text-right"><LedgerMoney>{formatMoneyAmount(cheque.amount, cheque.currency)}</LedgerMoney></td>
                  <td className="px-4 py-3 text-steel">{cheque.depositBatch ? `Batch ${formatOptionalDate(cheque.depositBatch.depositDate, "-")}` : "-"}</td>
                  <td className="px-4 py-3 text-steel">{cheque.statementTransaction ? cheque.statementTransaction.description : "Not matched"}</td>
                  <td className="px-4 py-3">
                    <LedgerButton href={`/bank-accounts/${params.id}/cheques/${cheque.id}`} size="sm">Open</LedgerButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </LedgerDataTable>
          {!loading && cheques.length === 0 ? (
            <div className="mt-4">
              <LedgerEmptyState title="No cheques yet." />
            </div>
          ) : null}
        </LedgerSection>
      </LedgerPageBody>
    </LedgerPage>
  );
}

export function ChequeGuidance() {
  return (
    <LedgerPanel>
      <h2 className="text-base font-semibold text-ink">Manual cheque lifecycle</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-steel">
        Cheques are tracked manually as received or issued treasury instruments. No live bank feed is added, no bank API is called, no bank credentials are collected, and no bank payment is sent.
      </p>
      <p className="mt-2 max-w-3xl text-xs leading-5 text-steel">
        Journal-backed cheque-in-hand, outstanding-cheque, and clearing-account posting is deferred to the clearing-account accounting design prompt. Cheque actions here update operational status and explicit statement/deposit links only.
      </p>
    </LedgerPanel>
  );
}

function chequeStatusTone(status: ChequeInstrumentStatus): LedgerStatusTone {
  if (status === "CLEARED") return "success";
  if (status === "BOUNCED") return "danger";
  if (status === "VOIDED") return "neutral";
  if (status === "DEPOSITED") return "warning";
  if (status === "RECEIVED" || status === "ISSUED") return "info";
  return "draft";
}
