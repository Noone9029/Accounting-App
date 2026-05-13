"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { formatInventoryQuantity, hasRemainingInventoryQuantity, inventoryOperationalWarning, validateSalesStockIssueInput } from "@/lib/inventory";
import type { SalesInvoice, SalesInvoiceStockIssueStatus, SalesStockIssue, SalesStockIssueStatusLine, Warehouse } from "@/lib/types";

function todayInputValue(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function NewSalesStockIssuePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const organizationId = useActiveOrganizationId();
  const [salesInvoiceId, setSalesInvoiceId] = useState(searchParams.get("salesInvoiceId") ?? "");
  const [warehouseId, setWarehouseId] = useState("");
  const [lineQuantities, setLineQuantities] = useState<Record<string, string>>({});
  const [lineUnitCosts, setLineUnitCosts] = useState<Record<string, string>>({});
  const [invoices, setInvoices] = useState<SalesInvoice[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [status, setStatus] = useState<SalesInvoiceStockIssueStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const finalizedInvoices = invoices.filter((invoice) => invoice.status === "FINALIZED");
  const activeWarehouses = warehouses.filter((warehouse) => warehouse.status === "ACTIVE");
  const issueLines = useMemo(() => status?.lines.filter((line) => line.inventoryTracking && hasRemainingInventoryQuantity(line.remainingQuantity)) ?? [], [status]);

  useEffect(() => {
    if (!organizationId) return;

    let cancelled = false;
    setLoading(true);
    setError("");

    Promise.all([apiRequest<SalesInvoice[]>("/sales-invoices"), apiRequest<Warehouse[]>("/warehouses")])
      .then(([invoiceResult, warehouseResult]) => {
        if (cancelled) return;
        setInvoices(invoiceResult);
        setWarehouses(warehouseResult);
        setSalesInvoiceId((current) => current || invoiceResult.find((invoice) => invoice.status === "FINALIZED")?.id || "");
        setWarehouseId((current) => current || warehouseResult.find((warehouse) => warehouse.status === "ACTIVE" && warehouse.isDefault)?.id || warehouseResult.find((warehouse) => warehouse.status === "ACTIVE")?.id || "");
      })
      .catch((loadError: unknown) => {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Unable to load issue form data.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [organizationId]);

  useEffect(() => {
    if (!organizationId || !salesInvoiceId) {
      setStatus(null);
      return;
    }

    let cancelled = false;
    setStatusLoading(true);
    setError("");

    apiRequest<SalesInvoiceStockIssueStatus>(`/sales-invoices/${salesInvoiceId}/stock-issue-status`)
      .then((result) => {
        if (cancelled) return;
        setStatus(result);
        const defaults: Record<string, string> = {};
        result.lines.forEach((line) => {
          if (line.inventoryTracking && hasRemainingInventoryQuantity(line.remainingQuantity)) {
            defaults[line.lineId] = line.remainingQuantity;
          }
        });
        setLineQuantities(defaults);
      })
      .catch((loadError: unknown) => {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Unable to load sales stock issue status.");
      })
      .finally(() => {
        if (!cancelled) setStatusLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [organizationId, salesInvoiceId]);

  async function createIssue(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const lines = issueLines
      .filter((line) => Number(lineQuantities[line.lineId] || 0) > 0)
      .map((line) => ({
        salesInvoiceLineId: line.lineId,
        quantity: lineQuantities[line.lineId],
        unitCost: lineUnitCosts[line.lineId] || undefined,
      }));

    const validationError = validateSalesStockIssueInput({ salesInvoiceId, warehouseId, lineCount: lines.length });
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    const formData = new FormData(event.currentTarget);
    try {
      const issue = await apiRequest<SalesStockIssue>("/sales-stock-issues", {
        method: "POST",
        body: {
          salesInvoiceId,
          warehouseId,
          issueDate: String(formData.get("issueDate")),
          notes: String(formData.get("notes") || "") || undefined,
          lines,
        },
      });
      router.push(`/inventory/sales-stock-issues/${issue.id}`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to create sales stock issue.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">New sales stock issue</h1>
          <p className="mt-1 text-sm text-steel">Issue inventory for a finalized sales invoice without posting COGS.</p>
        </div>
        <Link href="/inventory/sales-stock-issues" className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          Back
        </Link>
      </div>

      <div className="mb-5 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{inventoryOperationalWarning()}</div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">Log in and select an organization to issue stock.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading form data...</StatusMessage> : null}
        {statusLoading ? <StatusMessage type="loading">Loading invoice issue status...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
      </div>

      <form onSubmit={createIssue} className="mt-5 space-y-5 rounded-md border border-slate-200 bg-white p-5 shadow-panel">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wide text-steel">Sales invoice</span>
            <select value={salesInvoiceId} onChange={(event) => setSalesInvoiceId(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm">
              <option value="">Select invoice</option>
              {finalizedInvoices.map((invoice) => (
                <option key={invoice.id} value={invoice.id}>
                  {invoice.invoiceNumber} - {invoice.customer?.displayName ?? invoice.customer?.name ?? invoice.customerId}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wide text-steel">Warehouse</span>
            <select value={warehouseId} onChange={(event) => setWarehouseId(event.target.value)} required className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm">
              <option value="">Select warehouse</option>
              {activeWarehouses.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>{warehouse.code} {warehouse.name}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wide text-steel">Issue date</span>
            <input name="issueDate" type="date" required defaultValue={todayInputValue()} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
          </label>
          <label className="block md:col-span-3">
            <span className="text-xs font-medium uppercase tracking-wide text-steel">Notes</span>
            <input name="notes" placeholder="Optional" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
          </label>
        </div>

        <IssuableLines lines={issueLines} quantities={lineQuantities} unitCosts={lineUnitCosts} setQuantity={setLineQuantities} setUnitCost={setLineUnitCosts} />

        <div className="flex justify-end gap-3">
          <Link href="/inventory/sales-stock-issues" className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Cancel
          </Link>
          <button type="submit" disabled={submitting} className="rounded-md bg-palm px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400">
            {submitting ? "Posting..." : "Post issue"}
          </button>
        </div>
      </form>
    </section>
  );
}

function IssuableLines({
  lines,
  quantities,
  unitCosts,
  setQuantity,
  setUnitCost,
}: {
  lines: SalesStockIssueStatusLine[];
  quantities: Record<string, string>;
  unitCosts: Record<string, string>;
  setQuantity: (value: Record<string, string>) => void;
  setUnitCost: (value: Record<string, string>) => void;
}) {
  if (lines.length === 0) {
    return <StatusMessage type="empty">No remaining inventory-tracked sales invoice lines are available to issue.</StatusMessage>;
  }

  return (
    <div className="overflow-x-auto border-t border-slate-200 pt-5">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
          <tr>
            <th className="px-3 py-2">Item</th>
            <th className="px-3 py-2 text-right">Invoiced</th>
            <th className="px-3 py-2 text-right">Issued</th>
            <th className="px-3 py-2 text-right">Remaining</th>
            <th className="px-3 py-2">Issue qty</th>
            <th className="px-3 py-2">Unit cost</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {lines.map((line) => (
            <tr key={line.lineId}>
              <td className="px-3 py-2">{line.item ? `${line.item.name}${line.item.sku ? ` (${line.item.sku})` : ""}` : line.lineId}</td>
              <td className="px-3 py-2 text-right font-mono text-xs">{formatInventoryQuantity(line.invoicedQuantity)}</td>
              <td className="px-3 py-2 text-right font-mono text-xs">{formatInventoryQuantity(line.issuedQuantity)}</td>
              <td className="px-3 py-2 text-right font-mono text-xs">{formatInventoryQuantity(line.remainingQuantity)}</td>
              <td className="px-3 py-2">
                <input value={quantities[line.lineId] ?? ""} onChange={(event) => setQuantity({ ...quantities, [line.lineId]: event.target.value })} className="w-32 rounded-md border border-slate-300 px-2 py-1 text-sm outline-none focus:border-palm" />
              </td>
              <td className="px-3 py-2">
                <input value={unitCosts[line.lineId] ?? ""} onChange={(event) => setUnitCost({ ...unitCosts, [line.lineId]: event.target.value })} placeholder="Optional" className="w-32 rounded-md border border-slate-300 px-2 py-1 text-sm outline-none focus:border-palm" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
