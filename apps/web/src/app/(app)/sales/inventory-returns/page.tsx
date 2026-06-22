"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { StatusMessage } from "@/components/common/status-message";
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
  type LedgerStatusTone,
} from "@/components/ui/ledger-system";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { formatOptionalDate } from "@/lib/invoice-display";
import { PERMISSIONS } from "@/lib/permissions";
import {
  SALES_INVENTORY_RETURN_SAFE_HELPER_TEXT,
  salesInventoryReturnMovementStatusLabel,
  salesInventoryReturnSourceLabel,
  salesInventoryReturnStatusLabel,
} from "@/lib/sales-inventory-returns";
import type { SalesInventoryReturn, SalesInventoryReturnStatus } from "@/lib/types";

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
    <LedgerPage>
      <LedgerPageHeader
        eyebrow="Sales"
        title="Sales inventory returns"
        description="Customer stock return documents for explicit operational stock-in movement."
        actions={
          canCreate ? (
            <LedgerButton href="/sales/inventory-returns/new" variant="primary" icon={Plus}>
              Create return
            </LedgerButton>
          ) : null
        }
      />

      <LedgerPageBody>
        <LedgerAlert tone="warning">{SALES_INVENTORY_RETURN_SAFE_HELPER_TEXT}</LedgerAlert>

        <div className="space-y-3">
          {!organizationId ? <LedgerAlert tone="info">Log in and select an organization to load sales inventory returns.</LedgerAlert> : null}
          {loading ? <StatusMessage type="loading">Loading sales inventory returns...</StatusMessage> : null}
          {error ? <LedgerAlert tone="danger">{error}</LedgerAlert> : null}
          {!loading && organizationId && returns.length === 0 ? <LedgerEmptyState title="No sales inventory returns found." /> : null}
        </div>

      {returns.length > 0 ? (
        <LedgerDataTable minWidth="1080px">
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
                <td className="px-4 py-3"><SalesInventoryReturnStatusBadge status={salesReturn.status} /></td>
                <td className="px-4 py-3"><LedgerDate>{formatOptionalDate(salesReturn.returnDate, "-")}</LedgerDate></td>
                <td className="px-4 py-3 text-steel">{salesInventoryReturnSourceLabel(salesReturn)}</td>
                <td className="px-4 py-3 text-steel">{salesInventoryReturnMovementStatusLabel(salesReturn)}</td>
                <td className="px-4 py-3 font-mono text-xs">{salesReturn.lineCount ?? salesReturn.lines?.length ?? 0}</td>
                <td className="px-4 py-3">
                  <LedgerButton href={`/sales/inventory-returns/${salesReturn.id}`} size="sm">
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

function SalesInventoryReturnStatusBadge({ status }: { status: SalesInventoryReturnStatus }) {
  return <LedgerStatusBadge tone={salesInventoryReturnStatusTone(status)}>{salesInventoryReturnStatusLabel(status)}</LedgerStatusBadge>;
}

function salesInventoryReturnStatusTone(status: SalesInventoryReturnStatus | undefined | null): LedgerStatusTone {
  switch (status) {
    case "RECEIVED":
      return "success";
    case "APPROVED":
    case "SUBMITTED":
      return "info";
    case "VOIDED":
    case "CANCELLED":
      return "danger";
    case "DRAFT":
      return "warning";
    default:
      return "neutral";
  }
}
