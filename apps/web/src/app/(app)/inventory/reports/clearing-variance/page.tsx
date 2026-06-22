"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { usePermissions } from "@/components/permissions/permission-provider";
import {
  LedgerAlert,
  LedgerButton,
  LedgerDataTable,
  LedgerEmptyState,
  LedgerFieldLabel,
  LedgerFieldText,
  LedgerInput,
  LedgerLoadingState,
  LedgerMoney,
  LedgerPage,
  LedgerPageBody,
  LedgerPageHeader,
  LedgerSelect,
  LedgerStatCard,
  LedgerToolbar,
} from "@/components/ui/ledger-system";
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
  const { can, canAny } = usePermissions();
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
  const canDownloadCsv = canAny(PERMISSIONS.reports.export, PERMISSIONS.generatedDocuments.download);
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
    <LedgerPage>
      <LedgerPageHeader
        eyebrow="Inventory reports"
        title="Inventory clearing variance"
        description="Review clearing-mode bills and receipt asset postings that need accountant action."
        actions={
          <>
            {canDownloadCsv ? (
              <LedgerButton type="button" onClick={() => void downloadCsv()} disabled={!report || downloading}>
                {downloading ? "Downloading..." : "Download CSV"}
              </LedgerButton>
            ) : null}
            <LedgerButton href="/inventory/reports/clearing-reconciliation">Reconciliation</LedgerButton>
          </>
        }
      />

      <LedgerPageBody>
        <FilterBar filters={filters} onChange={setFilters} />

        {!organizationId ? <LedgerAlert tone="info">Log in and select an organization to load clearing variance.</LedgerAlert> : null}
        {loading ? <LedgerLoadingState title="Loading clearing variance" /> : null}
        {error ? <LedgerAlert tone="danger">{error}</LedgerAlert> : null}
        {!loading && report && report.rows.length === 0 ? <LedgerEmptyState title="No clearing variance rows found." /> : null}

        {report ? (
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Summary label="Clearing account" value={report.clearingAccount ? `${report.clearingAccount.code} ${report.clearingAccount.name}` : "Not mapped"} />
              <Summary label="GL clearing balance" value={inventoryClearingAmountDisplay(report.clearingAccountBalance)} />
              <Summary label="Total variance" value={inventoryClearingAmountDisplay(report.summary.totalVarianceAmount)} />
            </div>

            {report.warnings.length > 0 ? (
              <LedgerAlert tone="warning" title="Warnings">
                <ul className="space-y-1">
                  {report.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              </LedgerAlert>
            ) : null}

            {report.rows.length > 0 ? (
              <LedgerDataTable minWidth="1120px">
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
                      <td className="px-4 py-3 text-right"><LedgerMoney>{formatMoneyAmount(row.varianceAmount, row.purchaseBill?.currency ?? "SAR")}</LedgerMoney></td>
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
              </LedgerDataTable>
            ) : null}
          </>
        ) : null}
      </LedgerPageBody>
    </LedgerPage>
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
    <LedgerToolbar title="Report filters">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
        <Field label="From">
          <LedgerInput type="date" value={filters.from} onChange={(event) => onChange({ ...filters, from: event.target.value })} />
        </Field>
        <Field label="To">
          <LedgerInput type="date" value={filters.to} onChange={(event) => onChange({ ...filters, to: event.target.value })} />
        </Field>
        <Field label="Status">
          <LedgerSelect
            value={filters.status}
            onChange={(event) => onChange({ ...filters, status: event.target.value as InventoryClearingReportStatus | "" })}
          >
            {statuses.map((status) => (
              <option key={status.value || "all"} value={status.value}>
                {status.label}
              </option>
            ))}
          </LedgerSelect>
        </Field>
        <Field label="Bill ID">
          <LedgerInput value={filters.purchaseBillId} onChange={(event) => onChange({ ...filters, purchaseBillId: event.target.value })} />
        </Field>
        <Field label="Receipt ID">
          <LedgerInput value={filters.purchaseReceiptId} onChange={(event) => onChange({ ...filters, purchaseReceiptId: event.target.value })} />
        </Field>
      </div>
    </LedgerToolbar>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return <LedgerStatCard label={label} value={<LedgerMoney>{value}</LedgerMoney>} />;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <LedgerFieldLabel>
      <LedgerFieldText>{label}</LedgerFieldText>
      {children}
    </LedgerFieldLabel>
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
