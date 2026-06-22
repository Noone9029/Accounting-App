"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePermissions } from "@/components/permissions/permission-provider";
import {
  LedgerAlert,
  LedgerButton,
  LedgerDataTable,
  LedgerDate,
  LedgerEmptyState,
  LedgerLoadingState,
  LedgerMoney,
  LedgerPage,
  LedgerPageBody,
  LedgerPageHeader,
} from "@/components/ui/ledger-system";
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
    <LedgerPage>
      <LedgerPageHeader
        eyebrow="Inventory valuation"
        title="Inventory variance proposals"
        description="Accountant-reviewed clearing variance proposals. Journals post only from explicit approval actions."
        actions={
          <>
            <LedgerButton href="/inventory/reports/clearing-variance">Clearing variance</LedgerButton>
            {canCreate ? <LedgerButton href="/inventory/variance-proposals/new" variant="primary">New proposal</LedgerButton> : null}
          </>
        }
      />

      <LedgerPageBody>
        {!organizationId ? <LedgerAlert tone="info">Log in and select an organization to load variance proposals.</LedgerAlert> : null}
        {loading ? <LedgerLoadingState title="Loading variance proposals" /> : null}
        {error ? <LedgerAlert tone="danger">{error}</LedgerAlert> : null}
        {!loading && organizationId && proposals.length === 0 ? <LedgerEmptyState title="No inventory variance proposals found." /> : null}

      {proposals.length > 0 ? (
        <LedgerDataTable minWidth="1080px">
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
                  <td className="px-4 py-3"><LedgerDate>{formatOptionalDate(proposal.proposalDate, "-")}</LedgerDate></td>
                  <td className="px-4 py-3 text-right"><LedgerMoney>{formatMoneyAmount(proposal.amount, "SAR")}</LedgerMoney></td>
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
          </LedgerDataTable>
      ) : null}
      </LedgerPageBody>
    </LedgerPage>
  );
}
