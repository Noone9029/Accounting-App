"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { usePermissions } from "@/components/permissions/permission-provider";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import {
  bankTransferStatusBadgeClass,
  bankTransferStatusLabel,
  canVoidBankTransfer,
} from "@/lib/bank-accounts";
import { formatOptionalDate } from "@/lib/invoice-display";
import { formatMoneyAmount } from "@/lib/money";
import { PERMISSIONS } from "@/lib/permissions";
import type { BankTransfer } from "@/lib/types";

export default function BankTransferDetailPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const organizationId = useActiveOrganizationId();
  const { can } = usePermissions();
  const [transfer, setTransfer] = useState<BankTransfer | null>(null);
  const [loading, setLoading] = useState(false);
  const [voiding, setVoiding] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const canVoid = can(PERMISSIONS.bankTransfers.void);
  const wasJustCreated = searchParams.get("created") === "1";

  useEffect(() => {
    if (!organizationId || !params.id) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    apiRequest<BankTransfer>(`/bank-transfers/${params.id}`)
      .then((result) => {
        if (!cancelled) {
          setTransfer(result);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load bank transfer.");
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

  async function voidTransfer() {
    if (!transfer) {
      return;
    }
    setVoiding(true);
    setError("");
    setSuccess("");
    try {
      const updated = await apiRequest<BankTransfer>(`/bank-transfers/${transfer.id}/void`, { method: "POST" });
      setTransfer(updated);
      setSuccess(`${updated.transferNumber} has been voided.`);
      setReloadToken((current) => current + 1);
    } catch (voidError) {
      setError(voidError instanceof Error ? voidError.message : "Unable to void bank transfer.");
    } finally {
      setVoiding(false);
    }
  }

  return (
    <section>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">{transfer?.transferNumber ?? "Bank transfer"}</h1>
          <p className="mt-1 text-sm text-steel">Balanced transfer journal and reversal status.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/bank-transfers" className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Back
          </Link>
          {transfer && canVoid && canVoidBankTransfer(transfer.status) ? (
            <button type="button" disabled={voiding} onClick={() => void voidTransfer()} className="rounded-md border border-rose-300 px-3 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:text-slate-400">
              {voiding ? "Voiding..." : "Void"}
            </button>
          ) : null}
        </div>
      </div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">Log in and select an organization to load bank transfer details.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading bank transfer...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {success ? <StatusMessage type="success">{success}</StatusMessage> : null}
      </div>

      {transfer ? (
        <div className="mt-5 space-y-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <SummaryCard label="Amount" value={formatMoneyAmount(transfer.amount, transfer.currency)} />
            <SummaryCard label="Date" value={formatOptionalDate(transfer.transferDate, "-")} />
            <SummaryCard label="Status" value={bankTransferStatusLabel(transfer.status)} />
            <SummaryCard label="Journal" value={transfer.journalEntry?.entryNumber ?? "-"} />
          </div>

          <BankTransferWorkflowGuidance
            transfer={transfer}
            wasJustCreated={wasJustCreated}
            canVoidTransfer={canVoid && canVoidBankTransfer(transfer.status)}
            onVoid={() => void voidTransfer()}
            voiding={voiding}
          />

          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Detail
                label="From"
                value={transfer.fromBankAccountProfile?.displayName ?? transfer.fromAccount?.name ?? "-"}
                href={transfer.fromBankAccountProfileId ? `/bank-accounts/${transfer.fromBankAccountProfileId}` : undefined}
              />
              <Detail
                label="To"
                value={transfer.toBankAccountProfile?.displayName ?? transfer.toAccount?.name ?? "-"}
                href={transfer.toBankAccountProfileId ? `/bank-accounts/${transfer.toBankAccountProfileId}` : undefined}
              />
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-steel">Status</p>
                <span className={`mt-1 inline-block rounded-md px-2 py-1 text-xs font-medium ${bankTransferStatusBadgeClass(transfer.status)}`}>
                  {bankTransferStatusLabel(transfer.status)}
                </span>
              </div>
              <Detail label="Posted journal" value={transfer.journalEntry?.entryNumber ?? "-"} />
              <Detail label="Void reversal journal" value={transfer.voidReversalJournalEntry?.entryNumber ?? "-"} />
              <Detail label="Posted at" value={formatOptionalDate(transfer.postedAt, "-")} />
            </div>
            {transfer.description ? <p className="mt-4 text-sm text-steel">{transfer.description}</p> : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}

export function BankTransferWorkflowGuidance({
  transfer,
  wasJustCreated,
  canVoidTransfer,
  onVoid,
  voiding,
}: {
  transfer: BankTransfer;
  wasJustCreated: boolean;
  canVoidTransfer: boolean;
  onVoid: () => void;
  voiding: boolean;
}) {
  const fromHref = transfer.fromBankAccountProfileId ? `/bank-accounts/${transfer.fromBankAccountProfileId}` : undefined;
  const toHref = transfer.toBankAccountProfileId ? `/bank-accounts/${transfer.toBankAccountProfileId}` : undefined;
  const ledgerHref = transfer.fromAccountId ? `/reports/general-ledger?accountId=${transfer.fromAccountId}` : "/reports/general-ledger";
  const statusExplanation =
    transfer.status === "VOIDED"
      ? "This transfer has been voided. LedgerByte keeps the original transfer and shows the reversal journal so the audit trail stays visible."
      : "This transfer is posted. The source account decreased, the destination account increased, and the journal entry is available in the bank ledger.";

  return (
    <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
      {wasJustCreated ? (
        <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          Transfer posted. Review the source and destination accounts, then match imported statement rows when they arrive.
        </div>
      ) : null}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold text-ink">What happened?</h2>
            <span className={`rounded-md px-2 py-1 text-xs font-medium ${bankTransferStatusBadgeClass(transfer.status)}`}>
              {bankTransferStatusLabel(transfer.status)}
            </span>
          </div>
          <p className="mt-2 text-sm leading-6 text-steel">{statusExplanation}</p>
          <div className="mt-3 grid grid-cols-1 gap-2 text-sm text-steel md:grid-cols-2">
            <p>
              <span className="font-medium text-ink">Source:</span>{" "}
              {transfer.fromBankAccountProfile?.displayName ?? transfer.fromAccount?.name ?? "source account"} decreases.
            </p>
            <p>
              <span className="font-medium text-ink">Destination:</span>{" "}
              {transfer.toBankAccountProfile?.displayName ?? transfer.toAccount?.name ?? "destination account"} increases.
            </p>
          </div>
          {transfer.status === "POSTED" ? (
            <p className="mt-3 text-xs leading-5 text-steel">
              Voiding reverses the transfer movement. It does not delete the original journal.
            </p>
          ) : null}
        </div>
        <div className="min-w-full lg:min-w-[260px]">
          <p className="text-xs font-medium uppercase tracking-wide text-steel">Next actions</p>
          <div className="mt-2 flex flex-wrap gap-2 lg:flex-col">
            {fromHref ? (
              <Link href={fromHref} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                Source account
              </Link>
            ) : null}
            {toHref ? (
              <Link href={toHref} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                Destination account
              </Link>
            ) : null}
            <Link href={ledgerHref} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              View bank ledger
            </Link>
            <Link href="/bank-transfers" className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Transfer list
            </Link>
            <Link href="/dashboard" className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Dashboard
            </Link>
            {canVoidTransfer ? (
              <button type="button" onClick={onVoid} disabled={voiding} className="rounded-md border border-rose-300 px-3 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:text-slate-400">
                {voiding ? "Voiding..." : "Void transfer"}
              </button>
            ) : (
              <p className="text-xs leading-5 text-steel">Void is unavailable after the transfer is already voided or when permission is missing.</p>
            )}
          </div>
        </div>
      </div>
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

function Detail({ label, value, href }: { label: string; value: string; href?: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-steel">{label}</p>
      {href ? (
        <Link href={href} className="mt-1 inline-block text-sm font-medium text-palm hover:text-teal-800">
          {value}
        </Link>
      ) : (
        <p className="mt-1 text-sm text-ink">{value}</p>
      )}
    </div>
  );
}
