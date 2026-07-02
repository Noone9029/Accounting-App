"use client";

import { useEffect, useState } from "react";
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
  LedgerStatusBadge,
  LedgerSummaryBand,
  type LedgerStatusTone,
} from "@/components/ui/ledger-system";
import { usePermissions } from "@/components/permissions/permission-provider";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { formatOptionalDate } from "@/lib/invoice-display";
import { formatInventoryQuantity, inventoryOperationalWarning, stockDocumentStatusLabel } from "@/lib/inventory";
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
    <LedgerPage>
      <LedgerPageHeader
        eyebrow="Inventory"
        title="Sales stock issues"
        description="Operational stock issues against finalized sales invoices."
        actions={canCreate ? <LedgerButton href="/inventory/sales-stock-issues/new" variant="primary">New issue</LedgerButton> : null}
      />

      <LedgerPageBody>
        <LedgerSummaryBand tone="warning">{inventoryOperationalWarning()}</LedgerSummaryBand>

        {!organizationId ? <LedgerAlert tone="info">Log in and select an organization to load sales stock issues.</LedgerAlert> : null}
        {loading ? <LedgerLoadingState title="Loading sales stock issues" /> : null}
        {error ? <LedgerAlert tone="danger">{error}</LedgerAlert> : null}

        {!loading && organizationId && issues.length === 0 ? (
          <LedgerEmptyState title="No sales stock issues found" description="Operational stock issues for finalized sales invoices will appear here." />
        ) : null}

        {issues.length > 0 ? (
          <LedgerDataTable minWidth="980px">
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
                  <td className="px-4 py-3"><LedgerDate>{formatOptionalDate(issue.issueDate, "-")}</LedgerDate></td>
                  <td className="px-4 py-3 text-ink">{issue.customer?.displayName ?? issue.customer?.name ?? issue.customerId}</td>
                  <td className="px-4 py-3 text-steel">{issue.salesInvoice?.invoiceNumber ?? issue.salesInvoiceId}</td>
                  <td className="px-4 py-3 text-steel">{issue.warehouse ? `${issue.warehouse.code} ${issue.warehouse.name}` : issue.warehouseId}</td>
                  <td className="px-4 py-3 text-right"><LedgerMoney>{formatInventoryQuantity(totalIssueQuantity(issue))}</LedgerMoney></td>
                  <td className="px-4 py-3">
                    <LedgerStatusBadge tone={stockDocumentStatusTone(issue.status)}>{stockDocumentStatusLabel(issue.status)}</LedgerStatusBadge>
                  </td>
                  <td className="px-4 py-3">
                    <LedgerButton href={`/inventory/sales-stock-issues/${issue.id}`} size="sm" aria-label={`View stock issue ${issue.issueNumber}`}>
                      View
                    </LedgerButton>
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

function totalIssueQuantity(issue: SalesStockIssue): string {
  const total = issue.lines?.reduce((sum, line) => sum + Number(line.quantity || 0), 0) ?? 0;
  return String(total);
}

function stockDocumentStatusTone(status: string): LedgerStatusTone {
  if (status === "POSTED") return "success";
  if (status === "VOIDED") return "danger";
  if (status === "DRAFT") return "draft";
  return "neutral";
}
