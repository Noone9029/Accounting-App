"use client";

import { useEffect, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { usePermissions } from "@/components/permissions/permission-provider";
import {
  LedgerButton,
  LedgerDataTable,
  LedgerDate,
  LedgerEmptyState,
  LedgerMoney,
  LedgerPage,
  LedgerPageBody,
  LedgerPageHeader,
  LedgerStatusBadge,
  LedgerSummaryBand,
  type LedgerStatusTone,
} from "@/components/ui/ledger-system";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { bankTransferStatusLabel } from "@/lib/bank-accounts";
import { formatOptionalDate } from "@/lib/invoice-display";
import { formatMoneyAmount } from "@/lib/money";
import { PERMISSIONS } from "@/lib/permissions";
import type { BankTransfer } from "@/lib/types";

export default function BankTransfersPage() {
  const organizationId = useActiveOrganizationId();
  const { can } = usePermissions();
  const [transfers, setTransfers] = useState<BankTransfer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const canCreate = can(PERMISSIONS.bankTransfers.create);

  useEffect(() => {
    if (!organizationId) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    apiRequest<BankTransfer[]>("/bank-transfers")
      .then((result) => {
        if (!cancelled) {
          setTransfers(result);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load bank transfers.");
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
  }, [organizationId]);

  return (
    <LedgerPage>
      <LedgerPageHeader
        eyebrow="Banking / Manual transfers"
        title="Bank transfers"
        description="Posted cash and bank movements between active bank account profiles."
        actions={
          canCreate ? (
            <LedgerButton href="/bank-transfers/new" variant="primary">
              New transfer
            </LedgerButton>
          ) : null
        }
      />

      <LedgerSummaryBand tone="info">
        Transfers are explicit internal cash movements. This list does not move money through a bank provider, import statements, or auto-match reconciliation rows.
      </LedgerSummaryBand>

      <LedgerPageBody>
        {!organizationId ? <StatusMessage type="info">Log in and select an organization to load bank transfers.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading bank transfers...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {!loading && organizationId && transfers.length === 0 ? (
          <LedgerEmptyState
            title="No bank transfers found"
            description="Use transfers for money moved between your own cash and bank profiles. Transfers post a source decrease and destination increase, then can be matched to imported statement rows later."
            action={
              <div className="flex flex-wrap justify-center gap-2">
                {canCreate ? (
                  <LedgerButton href="/bank-transfers/new" variant="primary">
                    Create transfer
                  </LedgerButton>
                ) : null}
                <LedgerButton href="/bank-accounts">Bank accounts</LedgerButton>
                <LedgerButton href="/dashboard">Dashboard</LedgerButton>
              </div>
            }
          />
        ) : null}

        {transfers.length > 0 ? (
          <LedgerDataTable minWidth="940px">
            <thead className="ledger-table-header">
              <tr>
                <th className="px-4 py-3">Transfer</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">From</th>
                <th className="px-4 py-3">To</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Journal</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transfers.map((transfer) => (
                <tr key={transfer.id}>
                  <td className="px-4 py-3 font-mono text-xs">{transfer.transferNumber}</td>
                  <td className="px-4 py-3">
                    <LedgerDate>{formatOptionalDate(transfer.transferDate, "-")}</LedgerDate>
                  </td>
                  <td className="px-4 py-3 text-ink">{transfer.fromBankAccountProfile?.displayName ?? transfer.fromAccount?.name ?? "-"}</td>
                  <td className="px-4 py-3 text-ink">{transfer.toBankAccountProfile?.displayName ?? transfer.toAccount?.name ?? "-"}</td>
                  <td className="px-4 py-3 text-right">
                    <LedgerMoney>{formatMoneyAmount(transfer.amount, transfer.currency)}</LedgerMoney>
                  </td>
                  <td className="px-4 py-3">
                    <BankTransferStatusPill status={transfer.status} />
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{transfer.journalEntry?.entryNumber ?? "-"}</td>
                  <td className="px-4 py-3">
                    <LedgerButton href={`/bank-transfers/${transfer.id}`} size="sm">
                      View
                    </LedgerButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </LedgerDataTable>
        ) : null}
      </LedgerPageBody>
    </LedgerPage>
  );
}

function BankTransferStatusPill({ status }: Readonly<{ status: BankTransfer["status"] }>) {
  const tone: LedgerStatusTone = status === "POSTED" ? "success" : "neutral";
  return <LedgerStatusBadge tone={tone}>{bankTransferStatusLabel(status)}</LedgerStatusBadge>;
}
