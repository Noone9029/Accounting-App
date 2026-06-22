"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  LedgerAlert,
  LedgerButton,
  LedgerDataTable,
  LedgerFieldLabel,
  LedgerFieldText,
  LedgerFormSection,
  LedgerInput,
  LedgerLoadingState,
  LedgerMoney,
  LedgerPage,
  LedgerPageBody,
  LedgerPageHeader,
  LedgerSelect,
  LedgerSummaryBand,
} from "@/components/ui/ledger-system";
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
    <LedgerPage>
      <LedgerPageHeader
        eyebrow="Inventory"
        title="New sales stock issue"
        description="Issue inventory for a finalized sales invoice without posting COGS."
        actions={<LedgerButton href="/inventory/sales-stock-issues">Back</LedgerButton>}
      />

      <LedgerPageBody>
        <LedgerSummaryBand tone="warning">{inventoryOperationalWarning()}</LedgerSummaryBand>

        {!organizationId ? <LedgerAlert tone="info">Log in and select an organization to issue stock.</LedgerAlert> : null}
        {loading ? <LedgerLoadingState title="Loading form data" /> : null}
        {statusLoading ? <LedgerLoadingState title="Loading invoice issue status" /> : null}
        {error ? <LedgerAlert tone="danger">{error}</LedgerAlert> : null}

        <form onSubmit={createIssue} className="space-y-5">
          <LedgerFormSection title="Issue source" description="Choose the finalized invoice, issuing warehouse, and issue date.">
            <LedgerFieldLabel>
              <LedgerFieldText>Sales invoice</LedgerFieldText>
              <LedgerSelect value={salesInvoiceId} onChange={(event) => setSalesInvoiceId(event.target.value)}>
                <option value="">Select invoice</option>
                {finalizedInvoices.map((invoice) => (
                  <option key={invoice.id} value={invoice.id}>
                    {invoice.invoiceNumber} - {invoice.customer?.displayName ?? invoice.customer?.name ?? invoice.customerId}
                  </option>
                ))}
              </LedgerSelect>
            </LedgerFieldLabel>
            <LedgerFieldLabel>
              <LedgerFieldText>Warehouse</LedgerFieldText>
              <LedgerSelect value={warehouseId} onChange={(event) => setWarehouseId(event.target.value)} required>
                <option value="">Select warehouse</option>
                {activeWarehouses.map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>{warehouse.code} {warehouse.name}</option>
                ))}
              </LedgerSelect>
            </LedgerFieldLabel>
            <LedgerFieldLabel>
              <LedgerFieldText>Issue date</LedgerFieldText>
              <LedgerInput name="issueDate" type="date" required defaultValue={todayInputValue()} />
            </LedgerFieldLabel>
            <LedgerFieldLabel className="md:col-span-2">
              <LedgerFieldText>Notes</LedgerFieldText>
              <LedgerInput name="notes" placeholder="Optional" />
            </LedgerFieldLabel>
          </LedgerFormSection>

          <IssuableLines lines={issueLines} quantities={lineQuantities} unitCosts={lineUnitCosts} setQuantity={setLineQuantities} setUnitCost={setLineUnitCosts} />

          <div className="flex justify-end gap-3">
            <LedgerButton href="/inventory/sales-stock-issues">Cancel</LedgerButton>
            <LedgerButton type="submit" disabled={submitting} variant="primary">
              {submitting ? "Posting..." : "Post issue"}
            </LedgerButton>
          </div>
        </form>
      </LedgerPageBody>
    </LedgerPage>
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
    return <LedgerAlert tone="info">No remaining inventory-tracked sales invoice lines are available to issue.</LedgerAlert>;
  }

  return (
    <LedgerFormSection title="Issuable lines" description="Only inventory-tracked invoice lines with remaining quantity are shown." className="[&_>div]:block">
      <LedgerDataTable minWidth="760px">
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
              <td className="px-3 py-2 text-right"><LedgerMoney>{formatInventoryQuantity(line.invoicedQuantity)}</LedgerMoney></td>
              <td className="px-3 py-2 text-right"><LedgerMoney>{formatInventoryQuantity(line.issuedQuantity)}</LedgerMoney></td>
              <td className="px-3 py-2 text-right"><LedgerMoney>{formatInventoryQuantity(line.remainingQuantity)}</LedgerMoney></td>
              <td className="px-3 py-2">
                <LedgerInput value={quantities[line.lineId] ?? ""} onChange={(event) => setQuantity({ ...quantities, [line.lineId]: event.target.value })} className="w-32" />
              </td>
              <td className="px-3 py-2">
                <LedgerInput value={unitCosts[line.lineId] ?? ""} onChange={(event) => setUnitCost({ ...unitCosts, [line.lineId]: event.target.value })} placeholder="Optional" className="w-32" />
              </td>
            </tr>
          ))}
        </tbody>
      </LedgerDataTable>
    </LedgerFormSection>
  );
}
