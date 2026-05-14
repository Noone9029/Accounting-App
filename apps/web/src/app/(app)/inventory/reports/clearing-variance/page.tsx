"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { usePermissions } from "@/components/permissions/permission-provider";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import {
  inventoryClearingAmountDisplay,
  inventoryClearingStatusBadgeClass,
  inventoryClearingStatusLabel,
  inventoryClearingVarianceReasonLabel,
  inventoryVarianceProposalCreateUrl,
} from "@/lib/inventory";
import { formatMoneyAmount } from "@/lib/money";
import { downloadAuthenticatedFile } from "@/lib/pdf-download";
import { PERMISSIONS } from "@/lib/permissions";
import type { InventoryClearingReportStatus, InventoryClearingVarianceReport } from "@/lib/types";

const statuses: Array<{ value: InventoryClearingReportStatus | ""; label: string }> = [
  { value: "", label: "All variances" },
  { value: "PARTIAL", label: "Partial" },
  { value: "VARIANCE", label: "Variance" },
  { value: "BILL_WITHOUT_RECEIPT_POSTING", label: "Bill without receipt posting" },
  { value: "RECEIPT_WITHOUT_CLEARING_BILL", label: "Receipt without clearing bill" },
];

type ReportFilters = {
  from: string;
  to: string;
  status: InventoryClearingReportStatus | "";
  purchaseBillId: string;
  purchaseReceiptId: string;
};

export default function InventoryClearingVariancePage() {
  const organizationId = useActiveOrganizationId();
  const { can } = usePermissions();
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<ReportFilters>({
    from: searchParams.get("from") ?? "",
    to: searchParams.get("to") ?? "",
    status: (searchParams.get("status") as InventoryClearingReportStatus | null) ?? "",
    purchaseBillId: searchParams.get("purchaseBillId") ?? "",
    purchaseReceiptId: searchParams.get("purchaseReceiptId") ?? "",
  });
  const [report, setReport] = useState<InventoryClearingVarianceReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");
  const canCreateProposal = can(PERMISSIONS.inventory.varianceProposalsCreate);
  const query = useMemo(() => buildQuery(filters), [filters]);

  useEffect(() => {
    if (!organizationId) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    apiRequest<InventoryClearingVarianceReport>(`/inventory/reports/clearing-variance${query}`)
      .then((result) => {
        if (!cancelled) {
          setReport(result);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load clearing variance report.");
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
  }, [organizationId, query]);

  async function downloadCsv() {
    setDownloading(true);
    setError("");
    try {
      await downloadAuthenticatedFile(`/inventory/reports/clearing-variance${buildQuery({ ...filters, format: "csv" })}`);
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : "Unable to download variance CSV.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <section>
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Inventory clearing variance</h1>
          <p className="mt-1 text-sm text-steel">Review clearing-mode bills and receipt asset postings that need accountant action.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void downloadCsv()}
            disabled={!report || downloading}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
          >
            {downloading ? "Downloading..." : "Download CSV"}
          </button>
          <Link href="/inventory/reports/clearing-reconciliation" className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Reconciliation
          </Link>
        </div>
      </div>

      <FilterBar filters={filters} onChange={setFilters} />

      <div className="mt-4 space-y-3">
        {!organizationId ? <StatusMessage type="info">Log in and select an organization to load clearing variance.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading clearing variance...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {!loading && report && report.rows.length === 0 ? <StatusMessage type="empty">No clearing variance rows found.</StatusMessage> : null}
      </div>

      {report ? (
        <>
          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
            <Summary label="Clearing account" value={report.clearingAccount ? `${report.clearingAccount.code} ${report.clearingAccount.name}` : "Not mapped"} />
            <Summary label="GL clearing balance" value={inventoryClearingAmountDisplay(report.clearingAccountBalance)} />
            <Summary label="Total variance" value={inventoryClearingAmountDisplay(report.summary.totalVarianceAmount)} />
          </div>

          {report.warnings.length > 0 ? (
            <div className="mt-5 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <ul className="space-y-1">
                {report.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {report.rows.length > 0 ? (
            <div className="mt-5 overflow-x-auto rounded-md border border-slate-200 bg-white shadow-panel">
              <table className="w-full min-w-[1120px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
                  <tr>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Bill</th>
                    <th className="px-4 py-3">Receipt</th>
                    <th className="px-4 py-3">Supplier</th>
                    <th className="px-4 py-3 text-right">Variance</th>
                    <th className="px-4 py-3">Reason</th>
                    <th className="px-4 py-3">Recommended action</th>
                    <th className="px-4 py-3">Warnings</th>
                    <th className="px-4 py-3">Proposal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {report.rows.map((row, index) => (
                    <tr key={`${row.status}-${row.purchaseBill?.id ?? "no-bill"}-${row.receipt?.id ?? index}`}>
                      <td className="px-4 py-3">
                        <span className={`rounded-md px-2 py-1 text-xs font-medium ${inventoryClearingStatusBadgeClass(row.status)}`}>
                          {inventoryClearingStatusLabel(row.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {row.purchaseBill ? (
                          <Link href={`/purchases/bills/${row.purchaseBill.id}`} className="font-medium text-palm hover:underline">
                            {row.purchaseBill.billNumber}
                          </Link>
                        ) : (
                          <span className="text-steel">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {row.receipt ? (
                          <Link href={`/inventory/purchase-receipts/${row.receipt.id}`} className="font-medium text-palm hover:underline">
                            {row.receipt.receiptNumber}
                          </Link>
                        ) : (
                          <span className="text-steel">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-steel">{row.supplier?.displayName ?? row.supplier?.name ?? "-"}</td>
                      <td className="px-4 py-3 text-right font-mono text-xs">{formatMoneyAmount(row.varianceAmount, row.purchaseBill?.currency ?? "SAR")}</td>
                      <td className="px-4 py-3 text-steel">{inventoryClearingVarianceReasonLabel(row.varianceReason)}</td>
                      <td className="px-4 py-3 text-steel">{row.recommendedAction}</td>
                      <td className="px-4 py-3 text-xs text-steel">{row.warnings.length > 0 ? row.warnings.join("; ") : "-"}</td>
                      <td className="px-4 py-3">
                        {canCreateProposal ? (
                          <Link href={inventoryVarianceProposalCreateUrl(row)} className="rounded-md border border-palm px-2 py-1 text-xs font-medium text-palm hover:bg-teal-50">
                            Create proposal
                          </Link>
                        ) : (
                          <span className="text-steel">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  );
}

function FilterBar({
  filters,
  onChange,
}: {
  filters: ReportFilters;
  onChange: (filters: ReportFilters) => void;
}) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-4 shadow-panel">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
        <Field label="From">
          <input type="date" value={filters.from} onChange={(event) => onChange({ ...filters, from: event.target.value })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
        </Field>
        <Field label="To">
          <input type="date" value={filters.to} onChange={(event) => onChange({ ...filters, to: event.target.value })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
        </Field>
        <Field label="Status">
          <select
            value={filters.status}
            onChange={(event) => onChange({ ...filters, status: event.target.value as InventoryClearingReportStatus | "" })}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            {statuses.map((status) => (
              <option key={status.value || "all"} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Bill ID">
          <input value={filters.purchaseBillId} onChange={(event) => onChange({ ...filters, purchaseBillId: event.target.value })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
        </Field>
        <Field label="Receipt ID">
          <input value={filters.purchaseReceiptId} onChange={(event) => onChange({ ...filters, purchaseReceiptId: event.target.value })} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
        </Field>
      </div>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-4 shadow-panel">
      <p className="text-xs font-medium uppercase tracking-wide text-steel">{label}</p>
      <p className="mt-1 font-mono text-sm font-semibold text-ink">{value}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-steel">{label}</span>
      {children}
    </label>
  );
}

function buildQuery(filters: {
  from?: string;
  to?: string;
  status?: InventoryClearingReportStatus | "";
  purchaseBillId?: string;
  purchaseReceiptId?: string;
  format?: "csv";
}): string {
  const query = new URLSearchParams();
  if (filters.from) query.set("from", filters.from);
  if (filters.to) query.set("to", filters.to);
  if (filters.status) query.set("status", filters.status);
  if (filters.purchaseBillId) query.set("purchaseBillId", filters.purchaseBillId);
  if (filters.purchaseReceiptId) query.set("purchaseReceiptId", filters.purchaseReceiptId);
  if (filters.format) query.set("format", filters.format);
  const suffix = query.toString();
  return suffix ? `?${suffix}` : "";
}
