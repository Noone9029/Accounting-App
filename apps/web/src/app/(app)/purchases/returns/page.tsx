"use client";

import { useEffect, useState } from "react";
import { usePermissions } from "@/components/permissions/permission-provider";
import {
  LedgerAlert,
  LedgerButton,
  LedgerDataTable,
  LedgerDate,
  LedgerEmptyState,
  LedgerPage,
  LedgerPageBody,
  LedgerPageHeader,
  LedgerStatusBadge,
  LedgerSummaryBand,
  LedgerLoadingState,
  type LedgerStatusTone,
} from "@/components/ui/ledger-system";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { formatOptionalDate } from "@/lib/invoice-display";
import { PERMISSIONS } from "@/lib/permissions";
import { PURCHASE_RETURN_NON_EFFECT_TEXT, purchaseReturnSourceLabel, purchaseReturnStatusLabel } from "@/lib/purchase-returns";
import type { PurchaseReturn, PurchaseReturnStatus } from "@/lib/types";

export default function PurchaseReturnsPage() {
  const organizationId = useActiveOrganizationId();
  const { canAny } = usePermissions();
  const [returns, setReturns] = useState<PurchaseReturn[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const canCreate = canAny(PERMISSIONS.purchaseBills.create, PERMISSIONS.purchaseBills.update, PERMISSIONS.purchaseReceiving.create);

  useEffect(() => {
    if (!organizationId) return;
    let cancelled = false;
    setLoading(true);
    setError("");

    apiRequest<{ data: PurchaseReturn[] }>("/purchase-returns")
      .then((result) => {
        if (!cancelled) setReturns(result.data);
      })
      .catch((loadError) => {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Unable to load purchase returns.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [organizationId]);

  return (
    <LedgerPage>
      <LedgerPageHeader
        eyebrow="Purchases"
        title="Purchase returns"
        description="Operational supplier returns linked to bills, orders, receipts, or matching reviews."
        actions={canCreate ? <LedgerButton href="/purchases/returns/new" variant="primary">Create return</LedgerButton> : null}
      />

      <LedgerPageBody>
        <LedgerSummaryBand tone="warning">{PURCHASE_RETURN_NON_EFFECT_TEXT}</LedgerSummaryBand>
        {!organizationId ? <LedgerAlert tone="info">Log in and select an organization to load purchase returns.</LedgerAlert> : null}
        {loading ? <LedgerLoadingState title="Loading purchase returns" description="Fetching operational supplier return documents and lifecycle status." /> : null}
        {error ? <LedgerAlert tone="danger">{error}</LedgerAlert> : null}
        {!loading && organizationId && returns.length === 0 ? (
          <LedgerEmptyState title="No purchase returns found" description="Create a return when supplier review requires an explicit non-posting operational document." />
        ) : null}

        {returns.length > 0 ? (
          <LedgerDataTable minWidth="980px">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
              <tr>
                <th className="px-4 py-3">Number</th>
                <th className="px-4 py-3">Supplier</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Return date</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Reason</th>
                <th className="px-4 py-3">Lines</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {returns.map((purchaseReturn) => (
                <tr key={purchaseReturn.id}>
                  <td className="px-4 py-3 font-mono text-xs">{purchaseReturn.purchaseReturnNumber}</td>
                  <td className="px-4 py-3 font-medium text-ink">{purchaseReturn.supplier?.displayName ?? purchaseReturn.supplier?.name ?? "-"}</td>
                  <td className="px-4 py-3">
                    <LedgerStatusBadge tone={purchaseReturnStatusTone(purchaseReturn.status)}>{purchaseReturnStatusLabel(purchaseReturn.status)}</LedgerStatusBadge>
                  </td>
                  <td className="px-4 py-3"><LedgerDate>{formatOptionalDate(purchaseReturn.returnDate, "-")}</LedgerDate></td>
                  <td className="px-4 py-3 text-steel">{purchaseReturnSourceLabel(purchaseReturn)}</td>
                  <td className="px-4 py-3 text-steel">{purchaseReturn.reason ?? "-"}</td>
                  <td className="px-4 py-3 font-mono text-xs">{purchaseReturn.lineCount ?? purchaseReturn.lines?.length ?? 0}</td>
                  <td className="px-4 py-3">
                    <LedgerButton href={`/purchases/returns/${purchaseReturn.id}`} size="sm">View</LedgerButton>
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

function purchaseReturnStatusTone(status: PurchaseReturnStatus | undefined | null): LedgerStatusTone {
  if (status === "COMPLETED") return "success";
  if (status === "APPROVED" || status === "SUBMITTED") return "info";
  if (status === "DRAFT") return "warning";
  if (status === "VOIDED" || status === "CANCELLED") return "danger";
  return "neutral";
}
