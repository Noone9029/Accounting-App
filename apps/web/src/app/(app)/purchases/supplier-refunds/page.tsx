"use client";

import { useEffect, useState } from "react";
import { usePermissions } from "@/components/permissions/permission-provider";
import {
  LedgerActionBar,
  LedgerAlert,
  LedgerButton,
  LedgerDataTable,
  LedgerEmptyState,
  LedgerDate,
  LedgerMoney,
  LedgerPage,
  LedgerPageBody,
  LedgerPageHeader,
  LedgerStatusBadge,
  type LedgerStatusTone,
} from "@/components/ui/ledger-system";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { formatOptionalDate } from "@/lib/invoice-display";
import { formatMoneyAmount } from "@/lib/money";
import { PERMISSIONS } from "@/lib/permissions";
import { supplierRefundSourceTypeLabel, supplierRefundStatusLabel } from "@/lib/supplier-refunds";
import type { SupplierRefund } from "@/lib/types";

export default function SupplierRefundsPage() {
  const organizationId = useActiveOrganizationId();
  const { can } = usePermissions();
  const [refunds, setRefunds] = useState<SupplierRefund[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [reloadToken, setReloadToken] = useState(0);
  const canCreateRefund = can(PERMISSIONS.supplierRefunds.create);
  const canVoidRefund = can(PERMISSIONS.supplierRefunds.void);

  useEffect(() => {
    if (!organizationId) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    apiRequest<SupplierRefund[]>("/supplier-refunds")
      .then((result) => {
        if (!cancelled) {
          setRefunds(result);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load supplier refunds.");
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
  }, [organizationId, reloadToken]);

  async function voidRefund(refund: SupplierRefund) {
    if (!window.confirm(`Void supplier refund ${refund.refundNumber}?`)) {
      return;
    }

    setActionId(refund.id);
    setError("");
    setSuccess("");

    try {
      const voided = await apiRequest<SupplierRefund>(`/supplier-refunds/${refund.id}/void`, { method: "POST" });
      setSuccess(`Voided supplier refund ${voided.refundNumber}.`);
      setReloadToken((current) => current + 1);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Unable to void supplier refund.");
    } finally {
      setActionId("");
    }
  }

  return (
    <LedgerPage>
      <LedgerPageHeader
        eyebrow="Purchases"
        title="Supplier refunds"
        description="Manual refunds received from suppliers against unapplied supplier payments and purchase debit notes."
        actions={
          canCreateRefund ? (
            <LedgerActionBar>
              <LedgerButton href="/purchases/supplier-refunds/new" variant="primary">
                Record refund
              </LedgerButton>
            </LedgerActionBar>
          ) : undefined
        }
      />

      <LedgerPageBody>
        {!organizationId ? <LedgerAlert tone="info">Log in and select an organization to load supplier refunds.</LedgerAlert> : null}
        {loading ? <LedgerAlert tone="info">Loading supplier refunds...</LedgerAlert> : null}
        {error ? <LedgerAlert tone="danger">{error}</LedgerAlert> : null}
        {success ? <LedgerAlert tone="success">{success}</LedgerAlert> : null}
        {!loading && organizationId && refunds.length === 0 ? (
          <LedgerEmptyState
            title="No supplier refunds found"
            description="Record a supplier refund only after unapplied supplier payment or debit note credit exists."
            action={canCreateRefund ? <LedgerButton href="/purchases/supplier-refunds/new" variant="primary">Record refund</LedgerButton> : null}
          />
        ) : null}

        {refunds.length > 0 ? (
          <LedgerDataTable minWidth="1120px">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
              <tr>
                <th className="px-4 py-3">Number</th>
                <th className="px-4 py-3">Supplier</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Received into</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {refunds.map((refund) => (
                <tr key={refund.id}>
                  <td className="px-4 py-3 font-mono text-xs">{refund.refundNumber}</td>
                  <td className="px-4 py-3 font-medium text-ink">{refund.supplier?.displayName ?? refund.supplier?.name ?? "-"}</td>
                  <td className="px-4 py-3"><LedgerDate>{formatOptionalDate(refund.refundDate, "-")}</LedgerDate></td>
                  <td className="px-4 py-3 text-steel">{supplierRefundSourceTypeLabel(refund.sourceType)}</td>
                  <td className="px-4 py-3"><LedgerMoney>{formatMoneyAmount(refund.amountRefunded, refund.currency)}</LedgerMoney></td>
                  <td className="px-4 py-3 text-steel">{refund.account ? `${refund.account.code} ${refund.account.name}` : "-"}</td>
                  <td className="px-4 py-3">
                    <LedgerStatusBadge tone={supplierRefundStatusTone(refund.status)}>{supplierRefundStatusLabel(refund.status)}</LedgerStatusBadge>
                  </td>
                  <td className="px-4 py-3">
                    <LedgerActionBar>
                      <LedgerButton href={`/purchases/supplier-refunds/${refund.id}`} size="sm">
                        View
                      </LedgerButton>
                      {refund.status === "POSTED" && canVoidRefund ? (
                        <LedgerButton variant="danger" size="sm" onClick={() => void voidRefund(refund)} disabled={actionId === refund.id}>
                          Void
                        </LedgerButton>
                      ) : null}
                    </LedgerActionBar>
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

function supplierRefundStatusTone(status: SupplierRefund["status"]): LedgerStatusTone {
  switch (status) {
    case "POSTED":
      return "success";
    case "VOIDED":
      return "danger";
    case "DRAFT":
      return "draft";
    default:
      return "neutral";
  }
}
