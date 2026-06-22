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
import { formatOptionalDate } from "@/lib/invoice-display";
import {
  inventoryClearingAmountDisplay,
  inventoryClearingStatusBadgeClass,
  inventoryClearingStatusLabel,
} from "@/lib/inventory";
import { formatMoneyAmount } from "@/lib/money";
import { downloadAuthenticatedFile } from "@/lib/pdf-download";
import { PERMISSIONS } from "@/lib/permissions";
import type { InventoryClearingReconciliationReport, InventoryClearingReportStatus } from "@/lib/types";

const statuses: Array<{ value: InventoryClearingReportStatus | ""; label: string }> = [
  { value: "", label: "All clearing bills" },
  { value: "MATCHED", label: "Matched" },
  { value: "PARTIAL", label: "Partial" },
  { value: "VARIANCE", label: "Variance" },
  { value: "BILL_WITHOUT_RECEIPT_POSTING", label: "Bill without receipt posting" },
  { value: "RECEIPT_WITHOUT_CLEARING_BILL", label: "Receipt without clearing bill" },
  { value: "DIRECT_MODE_EXCLUDED", label: "Direct mode excluded" },
];

type ReportFilters = {
  from: string;
  to: string;
  status: InventoryClearingReportStatus | "";
  purchaseBillId: string;
  purchaseReceiptId: string;
};

export default function InventoryClearingReconciliationPage() {
  const organizationId = useActiveOrganizationId();
  const { canAny } = usePermissions();
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<ReportFilters>({
    from: searchParams.get("from") ?? "",
    to: searchParams.get("to") ?? "",
    status: (searchParams.get("status") as InventoryClearingReportStatus | null) ?? "",
    purchaseBillId: searchParams.get("purchaseBillId") ?? "",
    purchaseReceiptId: searchParams.get("purchaseReceiptId") ?? "",
  });
  const [report, setReport] = useState<InventoryClearingReconciliationReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");
  const canDownloadCsv = canAny(PERMISSIONS.reports.export, PERMISSIONS.generatedDocuments.download);

  const query = useMemo(() => buildQuery(filters), [filters]);

  useEffect(() => {
    if (!organizationId) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    apiRequest<InventoryClearingReconciliationReport>(`/inventory/reports/clearing-reconciliation${query}`)
      .then((result) => {
        if (!cancelled) {
          setReport(result);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load clearing reconciliation.");
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
      await downloadAuthenticatedFile(`/inventory/reports/clearing-reconciliation${buildQuery({ ...filters, format: "csv" })}`);
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : "Unable to download reconciliation CSV.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <LedgerPage>
      <LedgerPageHeader
        eyebrow="Inventory reports"
        title="Inventory clearing reconciliation"
        description="Compare inventory-clearing purchase bills against active purchase receipt asset postings."
        actions={
          <>
            {canDownloadCsv ? (
              <LedgerButton type="button" onClick={() => void downloadCsv()} disabled={!report || downloading}>
                {downloading ? "Downloading..." : "Download CSV"}
              </LedgerButton>
            ) : null}
            <LedgerButton href="/inventory/settings">Settings</LedgerButton>
          </>
        }
      />

      <LedgerPageBody>
        <FilterBar filters={filters} onChange={setFilters} />

        {!organizationId ? <LedgerAlert tone="info">Log in and select an organization to load clearing reconciliation.</LedgerAlert> : null}
        {loading ? <LedgerLoadingState title="Loading clearing reconciliation" /> : null}
        {error ? <LedgerAlert tone="danger">{error}</LedgerAlert> : null}
        {!loading && report && report.rows.length === 0 ? <LedgerEmptyState title="No clearing reconciliation rows found." /> : null}

        {report ? (
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <Summary label="Clearing account" value={report.clearingAccount ? `${report.clearingAccount.code} ${report.clearingAccount.name}` : "Not mapped"} />
              <Summary label="GL clearing balance" value={inventoryClearingAmountDisplay(report.clearingAccountBalance)} />
              <Summary label="Report open difference" value={inventoryClearingAmountDisplay(report.reportComputedOpenDifference)} />
              <Summary label="Rows" value={String(report.summary.rowCount)} />
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
              <LedgerDataTable minWidth="1180px">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
                  <tr>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Bill</th>
                    <th className="px-4 py-3">Supplier</th>
                    <th className="px-4 py-3 text-right">Bill clearing debit</th>
                    <th className="px-4 py-3 text-right">Receipt clearing credit</th>
                    <th className="px-4 py-3 text-right">Net difference</th>
                    <th className="px-4 py-3 text-right">Billed qty</th>
                    <th className="px-4 py-3 text-right">Received qty</th>
                    <th className="px-4 py-3">Receipts</th>
                    <th className="px-4 py-3">Warnings</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {report.rows.map((row) => (
                    <tr key={`${row.status}-${row.purchaseBill?.id ?? row.receipts[0]?.id ?? "row"}`}>
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
                        <div className="text-xs text-steel">{formatOptionalDate(row.billDate, "-")}</div>
                      </td>
                      <td className="px-4 py-3 text-steel">{row.supplier?.displayName ?? row.supplier?.name ?? "-"}</td>
                      <td className="px-4 py-3 text-right"><LedgerMoney>{formatMoneyAmount(row.billClearingDebit, row.purchaseBill?.currency ?? "SAR")}</LedgerMoney></td>
                      <td className="px-4 py-3 text-right"><LedgerMoney>{formatMoneyAmount(row.receiptClearingCredit, row.purchaseBill?.currency ?? "SAR")}</LedgerMoney></td>
                      <td className="px-4 py-3 text-right"><LedgerMoney>{formatMoneyAmount(row.netClearingDifference, row.purchaseBill?.currency ?? "SAR")}</LedgerMoney></td>
                      <td className="px-4 py-3 text-right"><LedgerMoney>{inventoryClearingAmountDisplay(row.billedQuantity)}</LedgerMoney></td>
                      <td className="px-4 py-3 text-right"><LedgerMoney>{inventoryClearingAmountDisplay(row.receivedQuantity)}</LedgerMoney></td>
                      <td className="px-4 py-3 text-steel">
                        {row.receipts.length > 0
                          ? row.receipts.map((receipt) => (
                              <Link key={receipt.id} href={`/inventory/purchase-receipts/${receipt.id}`} className="mr-3 inline-block text-palm hover:underline">
                                {receipt.receiptNumber}
                              </Link>
                            ))
                          : "-"}
                      </td>
                      <td className="px-4 py-3 text-xs text-steel">{row.warnings.length > 0 ? row.warnings.join("; ") : "-"}</td>
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
