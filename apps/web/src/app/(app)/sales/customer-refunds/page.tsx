"use client";

import { Eye, Plus, Undo2 } from "lucide-react";
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
  type LedgerStatusTone,
} from "@/components/ui/ledger-system";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { customerRefundSourceTypeLabel, customerRefundStatusLabel } from "@/lib/customer-refunds";
import { formatOptionalDate } from "@/lib/invoice-display";
import { formatMoneyAmount } from "@/lib/money";
import { PERMISSIONS } from "@/lib/permissions";
import type { CustomerRefund } from "@/lib/types";

function refundStatusTone(status: CustomerRefund["status"]): LedgerStatusTone {
  switch (status) {
    case "DRAFT":
      return "draft";
    case "POSTED":
      return "success";
    case "VOIDED":
      return "danger";
    default:
      return "neutral";
  }
}

export default function CustomerRefundsPage() {
  const organizationId = useActiveOrganizationId();
  const { can } = usePermissions();
  const [refunds, setRefunds] = useState<CustomerRefund[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [reloadToken, setReloadToken] = useState(0);
  const canCreateRefund = can(PERMISSIONS.customerRefunds.create);
  const canVoidRefund = can(PERMISSIONS.customerRefunds.void);

  useEffect(() => {
    if (!organizationId) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    apiRequest<CustomerRefund[]>("/customer-refunds")
      .then((result) => {
        if (!cancelled) {
          setRefunds(result);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load customer refunds.");
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

  async function voidRefund(refund: CustomerRefund) {
    if (!window.confirm(`Void refund ${refund.refundNumber}?`)) {
      return;
    }

    setActionId(refund.id);
    setError("");
    setSuccess("");

    try {
      const voided = await apiRequest<CustomerRefund>(`/customer-refunds/${refund.id}/void`, { method: "POST" });
      setSuccess(`Voided refund ${voided.refundNumber}.`);
      setReloadToken((current) => current + 1);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Unable to void refund.");
    } finally {
      setActionId("");
    }
  }

  return (
    <LedgerPage>
      <LedgerPageHeader
        eyebrow="Sales"
        title="Customer refunds"
        description="Manual refunds of unapplied customer payments and credit notes."
        actions={
          canCreateRefund ? (
            <LedgerButton href="/sales/customer-refunds/new" variant="primary" icon={Plus}>
              Record refund
            </LedgerButton>
          ) : null
        }
      />

      <LedgerPageBody>
        <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">Log in and select an organization to load customer refunds.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading customer refunds...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {success ? <StatusMessage type="success">{success}</StatusMessage> : null}
        {!loading && organizationId && refunds.length === 0 ? (
          <LedgerEmptyState
            title="No customer refunds found"
            description="Record a manual refund when unapplied customer payment or credit-note credit is returned."
            action={canCreateRefund ? <LedgerButton href="/sales/customer-refunds/new" variant="primary" icon={Plus}>Record refund</LedgerButton> : null}
          />
        ) : null}
        </div>

        {refunds.length > 0 ? (
          <LedgerDataTable minWidth="1120px">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
              <tr>
                <th className="px-4 py-3">Number</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Paid from</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {refunds.map((refund) => (
                <tr key={refund.id}>
                  <td className="px-4 py-3 font-mono text-xs">{refund.refundNumber}</td>
                  <td className="px-4 py-3 font-medium text-ink">{refund.customer?.displayName ?? refund.customer?.name ?? "-"}</td>
                  <td className="px-4 py-3"><LedgerDate>{formatOptionalDate(refund.refundDate, "-")}</LedgerDate></td>
                  <td className="px-4 py-3 text-steel">{customerRefundSourceTypeLabel(refund.sourceType)}</td>
                  <td className="px-4 py-3"><LedgerMoney>{formatMoneyAmount(refund.amountRefunded, refund.currency)}</LedgerMoney></td>
                  <td className="px-4 py-3 text-steel">{refund.account ? `${refund.account.code} ${refund.account.name}` : "-"}</td>
                  <td className="px-4 py-3">
                    <LedgerStatusBadge tone={refundStatusTone(refund.status)}>{customerRefundStatusLabel(refund.status)}</LedgerStatusBadge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <LedgerButton href={`/sales/customer-refunds/${refund.id}`} size="sm" icon={Eye}>
                        View
                      </LedgerButton>
                      {refund.status === "POSTED" && canVoidRefund ? (
                        <LedgerButton type="button" onClick={() => void voidRefund(refund)} disabled={actionId === refund.id} size="sm" variant="danger" icon={Undo2}>
                          Void
                        </LedgerButton>
                      ) : null}
                    </div>
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
