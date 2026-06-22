"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { usePermissions } from "@/components/permissions/permission-provider";
import {
  LedgerAlert,
  LedgerButton,
  LedgerDate,
  LedgerMetadataRow,
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
import { bankTransferStatusLabel, canVoidBankTransfer } from "@/lib/bank-accounts";
import { formatOptionalDate } from "@/lib/invoice-display";
import { formatMoneyAmount } from "@/lib/money";
import { PERMISSIONS } from "@/lib/permissions";
import type { BankTransfer } from "@/lib/types";

function bankTransferStatusTone(status: BankTransfer["status"]): LedgerStatusTone {
  return status === "POSTED" ? "success" : "draft";
}

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
    <LedgerPage>
      <LedgerPageHeader
        eyebrow="Banking"
        title={transfer?.transferNumber ?? "Bank transfer"}
        description="Balanced transfer journal and reversal status."
        badge={transfer ? <LedgerStatusBadge tone={bankTransferStatusTone(transfer.status)}>{bankTransferStatusLabel(transfer.status)}</LedgerStatusBadge> : null}
        actions={
          <>
            <LedgerButton href="/bank-transfers">Back</LedgerButton>
            {transfer && canVoid && canVoidBankTransfer(transfer.status) ? (
              <LedgerButton type="button" disabled={voiding} onClick={() => void voidTransfer()} variant="danger">
                {voiding ? "Voiding..." : "Void"}
              </LedgerButton>
            ) : null}
          </>
        }
      />

      <LedgerSummaryBand tone="warning">
        Bank transfers are posted journal movements between bank-linked accounts. Voiding reverses the transfer movement and keeps the original journal visible.
      </LedgerSummaryBand>

      <LedgerPageBody>
        {!organizationId ? <LedgerAlert tone="info">Log in and select an organization to load bank transfer details.</LedgerAlert> : null}
        {loading ? <LedgerAlert tone="info">Loading bank transfer...</LedgerAlert> : null}
        {error ? <LedgerAlert tone="danger">{error}</LedgerAlert> : null}
        {success ? <LedgerAlert tone="success">{success}</LedgerAlert> : null}

        {transfer ? (
          <>
            <LedgerMetricGrid>
              <LedgerStatCard label="Amount" value={<LedgerMoney>{formatMoneyAmount(transfer.amount, transfer.currency)}</LedgerMoney>} />
              <LedgerStatCard label="Date" value={<LedgerDate>{formatOptionalDate(transfer.transferDate, "-")}</LedgerDate>} />
              <LedgerStatCard label="Status" value={<LedgerStatusBadge tone={bankTransferStatusTone(transfer.status)}>{bankTransferStatusLabel(transfer.status)}</LedgerStatusBadge>} />
              <LedgerStatCard label="Journal" value={transfer.journalEntry?.entryNumber ?? "-"} />
            </LedgerMetricGrid>

            <BankTransferWorkflowGuidance
              transfer={transfer}
              wasJustCreated={wasJustCreated}
              canVoidTransfer={canVoid && canVoidBankTransfer(transfer.status)}
              onVoid={() => void voidTransfer()}
              voiding={voiding}
            />

            <LedgerSection title="Transfer detail" description="Source, destination, posted journal, and reversal references for this transfer.">
              <LedgerMetadataRow
                items={[
                  { label: "From", value: transfer.fromBankAccountProfile?.displayName ?? transfer.fromAccount?.name ?? "-" },
                  { label: "To", value: transfer.toBankAccountProfile?.displayName ?? transfer.toAccount?.name ?? "-" },
                  { label: "Posted journal", value: transfer.journalEntry?.entryNumber ?? "-" },
                  { label: "Void reversal journal", value: transfer.voidReversalJournalEntry?.entryNumber ?? "-" },
                  { label: "Posted at", value: <LedgerDate>{formatOptionalDate(transfer.postedAt, "-")}</LedgerDate> },
                  { label: "Status", value: <LedgerStatusBadge tone={bankTransferStatusTone(transfer.status)}>{bankTransferStatusLabel(transfer.status)}</LedgerStatusBadge> },
                ]}
              />
              {transfer.description ? <p className="mt-4 text-sm leading-6 text-steel">{transfer.description}</p> : null}
            </LedgerSection>
          </>
        ) : null}
      </LedgerPageBody>
    </LedgerPage>
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
    <LedgerPanel>
      {wasJustCreated ? (
        <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          Transfer posted. Review the source and destination accounts, then match imported statement rows when they arrive.
        </div>
      ) : null}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold text-ink">What happened?</h2>
            <LedgerStatusBadge tone={bankTransferStatusTone(transfer.status)}>{bankTransferStatusLabel(transfer.status)}</LedgerStatusBadge>
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
          <p className="text-xs font-semibold uppercase tracking-wide text-steel">Next actions</p>
          <div className="mt-2 flex flex-wrap gap-2 lg:flex-col">
            {fromHref ? <LedgerButton href={fromHref}>Source account</LedgerButton> : null}
            {toHref ? <LedgerButton href={toHref}>Destination account</LedgerButton> : null}
            <LedgerButton href={ledgerHref}>View bank ledger</LedgerButton>
            <LedgerButton href="/bank-transfers">Transfer list</LedgerButton>
            <LedgerButton href="/dashboard">Dashboard</LedgerButton>
            {canVoidTransfer ? (
              <LedgerButton type="button" onClick={onVoid} disabled={voiding} variant="danger">
                {voiding ? "Voiding..." : "Void transfer"}
              </LedgerButton>
            ) : (
              <p className="text-xs leading-5 text-steel">Void is unavailable after the transfer is already voided or when permission is missing.</p>
            )}
          </div>
        </div>
      </div>
    </LedgerPanel>
  );
}
