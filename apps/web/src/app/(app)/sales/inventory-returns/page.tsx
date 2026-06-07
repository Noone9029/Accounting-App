"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { usePermissions } from "@/components/permissions/permission-provider";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { formatOptionalDate } from "@/lib/invoice-display";
import { PERMISSIONS } from "@/lib/permissions";
import {
  SALES_INVENTORY_RETURN_SAFE_HELPER_TEXT,
  salesInventoryReturnMovementStatusLabel,
  salesInventoryReturnSourceLabel,
  salesInventoryReturnStatusBadgeClass,
  salesInventoryReturnStatusLabel,
} from "@/lib/sales-inventory-returns";
import type { SalesInventoryReturn } from "@/lib/types";

export default function SalesInventoryReturnsPage() {
  const organizationId = useActiveOrganizationId();
  const { can } = usePermissions();
  const [returns, setReturns] = useState<SalesInventoryReturn[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const canCreate = can(PERMISSIONS.salesInvoices.create);

  useEffect(() => {
    if (!organizationId) return;

    let cancelled = false;
    setLoading(true);
    setError("");

    apiRequest<SalesInventoryReturn[]>("/sales-inventory-returns")
      .then((result) => {
        if (!cancelled) setReturns(result);
      })
      .catch((loadError: unknown) => {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Unable to load sales inventory returns.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [organizationId]);

  return (
    <section>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Sales inventory returns</h1>
          <p className="mt-1 text-sm text-steel">Customer stock return documents for explicit operational stock-in movement.</p>
        </div>
        {canCreate ? (
          <Link href="/sales/inventory-returns/new" className="rounded-md bg-palm px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800">
            Create return
          </Link>
        ) : null}
      </div>

      <div className="mb-5 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">{SALES_INVENTORY_RETURN_SAFE_HELPER_TEXT}</div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">Log in and select an organization to load sales inventory returns.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading sales inventory returns...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {!loading && organizationId && returns.length === 0 ? <StatusMessage type="empty">No sales inventory returns found.</StatusMessage> : null}
      </div>

      {returns.length > 0 ? (
        <div className="mt-5 overflow-x-auto rounded-md border border-slate-200 bg-white shadow-panel">
          <table className="w-full min-w-[1080px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
              <tr>
                <th className="px-4 py-3">Number</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Return date</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Movement</th>
                <th className="px-4 py-3">Lines</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {returns.map((salesReturn) => (
                <tr key={salesReturn.id}>
                  <td className="px-4 py-3 font-mono text-xs">{salesReturn.salesReturnNumber}</td>
                  <td className="px-4 py-3 font-medium text-ink">{salesReturn.customer?.displayName ?? salesReturn.customer?.name ?? "-"}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-md px-2 py-1 text-xs font-medium ${salesInventoryReturnStatusBadgeClass(salesReturn.status)}`}>
                      {salesInventoryReturnStatusLabel(salesReturn.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-steel">{formatOptionalDate(salesReturn.returnDate, "-")}</td>
                  <td className="px-4 py-3 text-steel">{salesInventoryReturnSourceLabel(salesReturn)}</td>
                  <td className="px-4 py-3 text-steel">{salesInventoryReturnMovementStatusLabel(salesReturn)}</td>
                  <td className="px-4 py-3 font-mono text-xs">{salesReturn.lineCount ?? salesReturn.lines?.length ?? 0}</td>
                  <td className="px-4 py-3">
                    <Link href={`/sales/inventory-returns/${salesReturn.id}`} className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
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
