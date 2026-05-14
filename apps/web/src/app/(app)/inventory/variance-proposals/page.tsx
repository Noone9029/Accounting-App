"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { usePermissions } from "@/components/permissions/permission-provider";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { formatOptionalDate } from "@/lib/invoice-display";
import {
  inventoryVarianceProposalStatusBadgeClass,
  inventoryVarianceProposalStatusLabel,
  inventoryVarianceReasonLabel,
} from "@/lib/inventory";
import { formatMoneyAmount } from "@/lib/money";
import { PERMISSIONS } from "@/lib/permissions";
import type { InventoryVarianceProposal } from "@/lib/types";

export default function InventoryVarianceProposalsPage() {
  const organizationId = useActiveOrganizationId();
  const { can } = usePermissions();
  const [proposals, setProposals] = useState<InventoryVarianceProposal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const canCreate = can(PERMISSIONS.inventory.varianceProposalsCreate);

  useEffect(() => {
    if (!organizationId) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    apiRequest<InventoryVarianceProposal[]>("/inventory/variance-proposals")
      .then((result) => {
        if (!cancelled) {
          setProposals(result);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load inventory variance proposals.");
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
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Inventory variance proposals</h1>
          <p className="mt-1 text-sm text-steel">Accountant-reviewed clearing variance proposals. Journals post only from explicit approval actions.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/inventory/reports/clearing-variance" className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Clearing variance
          </Link>
          {canCreate ? (
            <Link href="/inventory/variance-proposals/new" className="rounded-md bg-palm px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800">
              New proposal
            </Link>
          ) : null}
        </div>
      </div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">Log in and select an organization to load variance proposals.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading variance proposals...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {!loading && organizationId && proposals.length === 0 ? <StatusMessage type="empty">No inventory variance proposals found.</StatusMessage> : null}
      </div>

      {proposals.length > 0 ? (
        <div className="mt-5 overflow-x-auto rounded-md border border-slate-200 bg-white shadow-panel">
          <table className="w-full min-w-[1080px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
              <tr>
                <th className="px-4 py-3">Proposal</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Reason</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3">Supplier</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Journal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {proposals.map((proposal) => (
                <tr key={proposal.id}>
                  <td className="px-4 py-3">
                    <Link href={`/inventory/variance-proposals/${proposal.id}`} className="font-medium text-palm hover:underline">
                      {proposal.proposalNumber}
                    </Link>
                    <div className="text-xs text-steel">{proposal.sourceType.replaceAll("_", " ")}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-md px-2 py-1 text-xs font-medium ${inventoryVarianceProposalStatusBadgeClass(proposal.status)}`}>
                      {inventoryVarianceProposalStatusLabel(proposal.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-steel">{inventoryVarianceReasonLabel(proposal.reason)}</td>
                  <td className="px-4 py-3 text-steel">{formatOptionalDate(proposal.proposalDate, "-")}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs">{formatMoneyAmount(proposal.amount, "SAR")}</td>
                  <td className="px-4 py-3 text-steel">{proposal.supplier?.displayName ?? proposal.supplier?.name ?? "-"}</td>
                  <td className="px-4 py-3 text-steel">
                    {proposal.purchaseBill ? (
                      <Link href={`/purchases/bills/${proposal.purchaseBill.id}`} className="mr-3 text-palm hover:underline">
                        {proposal.purchaseBill.billNumber}
                      </Link>
                    ) : null}
                    {proposal.purchaseReceipt ? (
                      <Link href={`/inventory/purchase-receipts/${proposal.purchaseReceipt.id}`} className="text-palm hover:underline">
                        {proposal.purchaseReceipt.receiptNumber}
                      </Link>
                    ) : null}
                    {!proposal.purchaseBill && !proposal.purchaseReceipt ? "-": null}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-steel">{proposal.journalEntry?.entryNumber ?? proposal.journalEntryId ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
