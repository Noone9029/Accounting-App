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
import { formatOptionalDate } from "@/lib/invoice-display";
import { formatMoneyAmount } from "@/lib/money";
import { PERMISSIONS } from "@/lib/permissions";
import type { PurchaseBill } from "@/lib/types";

export default function PurchaseBillsPage() {
  const organizationId = useActiveOrganizationId();
  const { can } = usePermissions();
  const [bills, setBills] = useState<PurchaseBill[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [reloadToken, setReloadToken] = useState(0);
  const canCreateBill = can(PERMISSIONS.purchaseBills.create);
  const canFinalizeBill = can(PERMISSIONS.purchaseBills.finalize);

  useEffect(() => {
    if (!organizationId) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    apiRequest<PurchaseBill[]>("/purchase-bills")
      .then((result) => {
        if (!cancelled) {
          setBills(result);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load purchase bills.");
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

  async function finalizeBill(bill: PurchaseBill) {
    setActionId(bill.id);
    setError("");
    setSuccess("");

    try {
      const finalized = await apiRequest<PurchaseBill>(`/purchase-bills/${bill.id}/finalize`, { method: "POST" });
      setSuccess(`Finalized bill ${finalized.billNumber}.`);
      setReloadToken((current) => current + 1);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Unable to finalize purchase bill.");
    } finally {
      setActionId("");
    }
  }

  return (
    <LedgerPage>
      <LedgerPageHeader
        eyebrow="Purchases / AP"
        title="Purchase bills"
        description="Supplier bills, AP posting state, and balance due tracking for accountant review."
        actions={
          canCreateBill ? (
            <LedgerButton href="/purchases/bills/new" variant="primary">
              Create bill
            </LedgerButton>
          ) : null
        }
      />

      <LedgerSummaryBand tone="info">
        Finalizing a purchase bill remains an explicit AP posting action. This page does not send payment, approve a provider workflow,
        move storage, or alter supplier balance math outside existing bill actions.
      </LedgerSummaryBand>

      <LedgerPageBody>
        {!organizationId ? <StatusMessage type="info">Log in and select an organization to load purchase bills.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading purchase bills...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {success ? <StatusMessage type="success">{success}</StatusMessage> : null}
        {!loading && organizationId && bills.length === 0 ? (
          <LedgerEmptyState
            title="No purchase bills found"
            description="Create the first supplier bill when AP records are ready. Nothing is posted from the empty AP list."
            action={
              canCreateBill ? (
                <LedgerButton href="/purchases/bills/new" variant="primary">
                  Create bill
                </LedgerButton>
              ) : null
            }
          />
        ) : null}

        {bills.length > 0 ? (
          <LedgerDataTable minWidth="1060px">
            <thead className="ledger-table-header">
              <tr>
                <th className="px-4 py-3">Number</th>
                <th className="px-4 py-3">Supplier</th>
                <th className="px-4 py-3">Bill date</th>
                <th className="px-4 py-3">Due date</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Balance due</th>
                <th className="px-4 py-3">Journal</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {bills.map((bill) => (
                <tr key={bill.id}>
                  <td className="px-4 py-3 font-mono text-xs">{bill.billNumber}</td>
                  <td className="px-4 py-3 font-medium text-ink">{bill.supplier?.displayName ?? bill.supplier?.name ?? "-"}</td>
                  <td className="px-4 py-3">
                    <LedgerDate>{formatOptionalDate(bill.billDate, "-")}</LedgerDate>
                  </td>
                  <td className="px-4 py-3">
                    <LedgerDate>{formatOptionalDate(bill.dueDate, "-")}</LedgerDate>
                  </td>
                  <td className="px-4 py-3">
                    <BillStatusPill status={bill.status} />
                  </td>
                  <td className="px-4 py-3">
                    <LedgerMoney>{formatMoneyAmount(bill.total, bill.currency)}</LedgerMoney>
                  </td>
                  <td className="px-4 py-3">
                    <LedgerMoney>{formatMoneyAmount(bill.balanceDue, bill.currency)}</LedgerMoney>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-steel">{bill.journalEntry ? `${bill.journalEntry.entryNumber} (${bill.journalEntry.id})` : "-"}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <LedgerButton href={`/purchases/bills/${bill.id}`} size="sm">
                        View
                      </LedgerButton>
                      {bill.status === "DRAFT" && canFinalizeBill ? (
                        <LedgerButton size="sm" onClick={() => void finalizeBill(bill)} disabled={actionId === bill.id}>
                          Finalize
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

function BillStatusPill({ status }: Readonly<{ status: string }>) {
  const tone: LedgerStatusTone = status === "FINALIZED" ? "success" : status === "VOIDED" ? "danger" : status === "DRAFT" ? "draft" : "info";
  const label = status === "FINALIZED" ? "Finalized/posted" : status.toLowerCase().replaceAll("_", " ");

  return <LedgerStatusBadge tone={tone}>{label}</LedgerStatusBadge>;
}
