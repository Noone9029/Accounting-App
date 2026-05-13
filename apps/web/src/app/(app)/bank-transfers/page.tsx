"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { usePermissions } from "@/components/permissions/permission-provider";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { bankTransferStatusBadgeClass, bankTransferStatusLabel } from "@/lib/bank-accounts";
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
    <section>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Bank transfers</h1>
          <p className="mt-1 text-sm text-steel">Posted cash and bank movements between active bank account profiles.</p>
        </div>
        {canCreate ? (
          <Link href="/bank-transfers/new" className="rounded-md bg-palm px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800">
            New transfer
          </Link>
        ) : null}
      </div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">Log in and select an organization to load bank transfers.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading bank transfers...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {!loading && organizationId && transfers.length === 0 ? <StatusMessage type="empty">No bank transfers found.</StatusMessage> : null}
      </div>

      {transfers.length > 0 ? (
        <div className="mt-5 overflow-x-auto rounded-md border border-slate-200 bg-white shadow-panel">
          <table className="w-full min-w-[940px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
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
                  <td className="px-4 py-3 text-steel">{formatOptionalDate(transfer.transferDate, "-")}</td>
                  <td className="px-4 py-3 text-ink">{transfer.fromBankAccountProfile?.displayName ?? transfer.fromAccount?.name ?? "-"}</td>
                  <td className="px-4 py-3 text-ink">{transfer.toBankAccountProfile?.displayName ?? transfer.toAccount?.name ?? "-"}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs">{formatMoneyAmount(transfer.amount, transfer.currency)}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-md px-2 py-1 text-xs font-medium ${bankTransferStatusBadgeClass(transfer.status)}`}>
                      {bankTransferStatusLabel(transfer.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{transfer.journalEntry?.entryNumber ?? "-"}</td>
                  <td className="px-4 py-3">
                    <Link href={`/bank-transfers/${transfer.id}`} className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
