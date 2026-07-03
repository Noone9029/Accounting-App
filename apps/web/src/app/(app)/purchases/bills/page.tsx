"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAppLocale } from "@/components/app-locale-provider";
import { StatusMessage } from "@/components/common/status-message";
import { usePermissions } from "@/components/permissions/permission-provider";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { formatAppDate, formatAppMoney } from "@/lib/app-i18n";
import { PERMISSIONS } from "@/lib/permissions";
import type { PurchaseBill } from "@/lib/types";

export default function PurchaseBillsPage() {
  const organizationId = useActiveOrganizationId();
  const { can } = usePermissions();
  const { locale, tc } = useAppLocale();
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
          setError(loadError instanceof Error ? loadError.message : tc("Unable to load purchase bills."));
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
  }, [organizationId, reloadToken, tc]);

  async function finalizeBill(bill: PurchaseBill) {
    setActionId(bill.id);
    setError("");
    setSuccess("");

    try {
      const finalized = await apiRequest<PurchaseBill>(`/purchase-bills/${bill.id}/finalize`, { method: "POST" });
      setSuccess(tc("Finalized bill {number}.", { number: finalized.billNumber }));
      setReloadToken((current) => current + 1);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : tc("Unable to finalize purchase bill."));
    } finally {
      setActionId("");
    }
  }

  return (
    <section>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">{tc("Purchase bills")}</h1>
          <p className="mt-1 text-sm text-steel">{tc("Supplier bills, AP status, and balance due tracking.")}</p>
        </div>
        {canCreateBill ? (
          <Link href="/purchases/bills/new" className="rounded-md bg-palm px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800">
            {tc("Create bill")}
          </Link>
        ) : null}
      </div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">{tc("Log in and select an organization to load purchase bills.")}</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">{tc("Loading purchase bills...")}</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {success ? <StatusMessage type="success">{success}</StatusMessage> : null}
        {!loading && organizationId && bills.length === 0 ? <StatusMessage type="empty">{tc("No purchase bills found.")}</StatusMessage> : null}
      </div>

      {bills.length > 0 ? (
        <div className="mt-5 overflow-x-auto rounded-md border border-slate-200 bg-white shadow-panel">
          <table className="w-full min-w-[1060px] text-start text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
              <tr>
                <th className="px-4 py-3">{tc("Number")}</th>
                <th className="px-4 py-3">{tc("Supplier")}</th>
                <th className="px-4 py-3">{tc("Bill date")}</th>
                <th className="px-4 py-3">{tc("Due date")}</th>
                <th className="px-4 py-3">{tc("Status")}</th>
                <th className="px-4 py-3">{tc("Total")}</th>
                <th className="px-4 py-3">{tc("Balance due")}</th>
                <th className="px-4 py-3">{tc("Journal")}</th>
                <th className="px-4 py-3">{tc("Actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {bills.map((bill) => (
                <tr key={bill.id}>
                  <td className="px-4 py-3 font-mono text-xs"><bdi dir="ltr">{bill.billNumber}</bdi></td>
                  <td className="px-4 py-3 font-medium text-ink">{bill.supplier?.displayName ?? bill.supplier?.name ?? "-"}</td>
                  <td className="px-4 py-3 text-steel">{formatAppDate(bill.billDate, locale, "-")}</td>
                  <td className="px-4 py-3 text-steel">{formatAppDate(bill.dueDate, locale, "-")}</td>
                  <td className="px-4 py-3 text-steel">{tc(purchaseBillStatusLabel(bill.status))}</td>
                  <td className="px-4 py-3 font-mono text-xs">{formatAppMoney(bill.total, bill.currency, locale)}</td>
                  <td className="px-4 py-3 font-mono text-xs">{formatAppMoney(bill.balanceDue, bill.currency, locale)}</td>
                  <td className="px-4 py-3 font-mono text-xs">{bill.journalEntry ? <bdi dir="ltr">{`${bill.journalEntry.entryNumber} (${bill.journalEntry.id})`}</bdi> : "-"}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Link href={`/purchases/bills/${bill.id}`} className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
                        {tc("View")}
                      </Link>
                      {bill.status === "DRAFT" && canFinalizeBill ? (
                        <button type="button" onClick={() => void finalizeBill(bill)} disabled={actionId === bill.id} className="rounded-md bg-palm px-2 py-1 text-xs font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400">
                          {tc("Finalize")}
                        </button>
                      ) : null}
                    </div>
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

function purchaseBillStatusLabel(status: PurchaseBill["status"] | undefined | null): string {
  switch (status) {
    case "DRAFT":
      return "Draft";
    case "FINALIZED":
      return "Finalized/posted";
    case "VOIDED":
      return "Voided";
    default:
      return status ?? "-";
  }
}
