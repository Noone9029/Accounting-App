"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { usePermissions } from "@/components/permissions/permission-provider";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { formatOptionalDate } from "@/lib/invoice-display";
import { formatInventoryQuantity, inventoryOperationalWarning, stockDocumentStatusBadgeClass, stockDocumentStatusLabel } from "@/lib/inventory";
import { PERMISSIONS } from "@/lib/permissions";
import type { SalesStockIssue } from "@/lib/types";

export default function SalesStockIssuesPage() {
  const organizationId = useActiveOrganizationId();
  const { can } = usePermissions();
  const [issues, setIssues] = useState<SalesStockIssue[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const canCreate = can(PERMISSIONS.salesStockIssue.create);

  useEffect(() => {
    if (!organizationId) return;

    let cancelled = false;
    setLoading(true);
    setError("");

    apiRequest<SalesStockIssue[]>("/sales-stock-issues")
      .then((result) => {
        if (!cancelled) setIssues(result);
      })
      .catch((loadError: unknown) => {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Unable to load sales stock issues.");
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
          <h1 className="text-2xl font-semibold text-ink">Sales stock issues</h1>
          <p className="mt-1 text-sm text-steel">Operational stock issues against finalized sales invoices.</p>
        </div>
        {canCreate ? (
          <Link href="/inventory/sales-stock-issues/new" className="rounded-md bg-palm px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800">
            New issue
          </Link>
        ) : null}
      </div>

      <div className="mb-5 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{inventoryOperationalWarning()}</div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">Log in and select an organization to load sales stock issues.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading sales stock issues...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {!loading && organizationId && issues.length === 0 ? <StatusMessage type="empty">No sales stock issues found.</StatusMessage> : null}
      </div>

      {issues.length > 0 ? (
        <div className="mt-5 overflow-x-auto rounded-md border border-slate-200 bg-white shadow-panel">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
              <tr>
                <th className="px-4 py-3">Issue</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Invoice</th>
                <th className="px-4 py-3">Warehouse</th>
                <th className="px-4 py-3 text-right">Lines</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {issues.map((issue) => (
                <tr key={issue.id}>
                  <td className="px-4 py-3 font-mono text-xs">{issue.issueNumber}</td>
                  <td className="px-4 py-3 text-steel">{formatOptionalDate(issue.issueDate, "-")}</td>
                  <td className="px-4 py-3 text-ink">{issue.customer?.displayName ?? issue.customer?.name ?? issue.customerId}</td>
                  <td className="px-4 py-3 text-steel">{issue.salesInvoice?.invoiceNumber ?? issue.salesInvoiceId}</td>
                  <td className="px-4 py-3 text-steel">{issue.warehouse ? `${issue.warehouse.code} ${issue.warehouse.name}` : issue.warehouseId}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs">{formatInventoryQuantity(totalIssueQuantity(issue))}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-md px-2 py-1 text-xs font-medium ${stockDocumentStatusBadgeClass(issue.status)}`}>{stockDocumentStatusLabel(issue.status)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/inventory/sales-stock-issues/${issue.id}`} className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
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

function totalIssueQuantity(issue: SalesStockIssue): string {
  const total = issue.lines?.reduce((sum, line) => sum + Number(line.quantity || 0), 0) ?? 0;
  return String(total);
}
