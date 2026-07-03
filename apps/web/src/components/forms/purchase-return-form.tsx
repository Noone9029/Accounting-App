"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useAppLocale } from "@/components/app-locale-provider";
import { StatusMessage } from "@/components/common/status-message";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { PURCHASE_RETURN_NON_EFFECT_TEXT } from "@/lib/purchase-returns";
import type {
  Contact,
  PurchaseBill,
  PurchaseMatchingReview,
  PurchaseOrder,
  PurchaseReceipt,
  PurchaseReturn,
  PurchaseReturnLine,
} from "@/lib/types";

type SourceType = "NONE" | "BILL" | "ORDER" | "RECEIPT" | "REVIEW";

interface EditableReturnLine {
  description: string;
  quantity: string;
  unitCost: string;
  reason: string;
  sourcePurchaseBillLineId: string;
  sourcePurchaseReceiptLineId: string;
  sourcePurchaseOrderLineId: string;
}

const blankLine = (): EditableReturnLine => ({
  description: "",
  quantity: "1.0000",
  unitCost: "",
  reason: "",
  sourcePurchaseBillLineId: "",
  sourcePurchaseReceiptLineId: "",
  sourcePurchaseOrderLineId: "",
});

export function PurchaseReturnForm({ initialReturn }: { initialReturn?: PurchaseReturn }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const organizationId = useActiveOrganizationId();
  const { tc } = useAppLocale();
  const [suppliers, setSuppliers] = useState<Contact[]>([]);
  const [bills, setBills] = useState<PurchaseBill[]>([]);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [receipts, setReceipts] = useState<PurchaseReceipt[]>([]);
  const [reviews, setReviews] = useState<PurchaseMatchingReview[]>([]);
  const [nextNumber, setNextNumber] = useState<string>("");
  const [supplierId, setSupplierId] = useState(initialReturn?.supplierId ?? searchParams.get("supplierId") ?? "");
  const [returnDate, setReturnDate] = useState(toDateInput(initialReturn?.returnDate) ?? new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState(initialReturn?.reason ?? "");
  const [reference, setReference] = useState(initialReturn?.reference ?? "");
  const [notes, setNotes] = useState(initialReturn?.notes ?? "");
  const [sourceType, setSourceType] = useState<SourceType>(initialSourceType(initialReturn, searchParams));
  const [sourceId, setSourceId] = useState(initialSourceId(initialReturn, searchParams));
  const [lines, setLines] = useState<EditableReturnLine[]>(initialReturn?.lines?.length ? initialReturn.lines.map(returnLineToEditable) : [blankLine()]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!organizationId) return;
    let cancelled = false;
    setLoading(true);
    setError("");

    Promise.all([
      apiRequest<Contact[]>("/contacts/suppliers"),
      apiRequest<PurchaseBill[]>("/purchase-bills").catch(() => []),
      apiRequest<PurchaseOrder[]>("/purchase-orders").catch(() => []),
      apiRequest<PurchaseReceipt[]>("/purchase-receipts").catch(() => []),
      apiRequest<{ data: PurchaseMatchingReview[] }>("/purchase-matching/reviews?status=NEEDS_RETURN_REVIEW").catch(() => ({ data: [] })),
      initialReturn ? Promise.resolve(null) : apiRequest<{ exampleNextNumber: string }>("/purchase-returns/next-number").catch(() => null),
    ])
      .then(([supplierResult, billResult, orderResult, receiptResult, reviewResult, numberResult]) => {
        if (cancelled) return;
        setSuppliers(supplierResult);
        setBills(billResult);
        setOrders(orderResult);
        setReceipts(receiptResult);
        setReviews(reviewResult.data);
        if (numberResult) setNextNumber(numberResult.exampleNextNumber);
        if (!supplierId && supplierResult[0]) setSupplierId(supplierResult[0].id);
      })
      .catch((loadError) => {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : tc("Unable to load purchase return form data."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [initialReturn, organizationId, supplierId, tc]);

  const sourceOptions = useMemo(() => {
    if (sourceType === "BILL") return bills.filter((bill) => !supplierId || bill.supplierId === supplierId).map((bill) => ({ id: bill.id, label: bill.billNumber }));
    if (sourceType === "ORDER") return orders.filter((order) => !supplierId || order.supplierId === supplierId).map((order) => ({ id: order.id, label: order.purchaseOrderNumber }));
    if (sourceType === "RECEIPT") return receipts.filter((receipt) => !supplierId || receipt.supplierId === supplierId).map((receipt) => ({ id: receipt.id, label: receipt.receiptNumber }));
    if (sourceType === "REVIEW") return reviews.filter((review) => !supplierId || review.supplierId === supplierId).map((review) => ({ id: review.id, label: `${review.exceptionType} ${review.sourceId}` }));
    return [];
  }, [bills, orders, receipts, reviews, sourceType, supplierId]);

  const selectedSourceLines = useMemo(() => sourceLinesFor(sourceType, sourceId, bills, orders, receipts), [bills, orders, receipts, sourceId, sourceType]);

  function handleSourceTypeChange(nextType: SourceType) {
    setSourceType(nextType);
    setSourceId("");
    setLines([blankLine()]);
  }

  function handleSourceIdChange(nextId: string) {
    setSourceId(nextId);
    const prefilled = sourceLinesFor(sourceType, nextId, bills, orders, receipts).map((line) => sourceLineToEditable(sourceType, line));
    if (prefilled.length > 0) setLines(prefilled);
  }

  function updateLine(index: number, patch: Partial<EditableReturnLine>) {
    setLines((current) => current.map((line, lineIndex) => (lineIndex === index ? { ...line, ...patch } : line)));
  }

  function selectSourceLine(index: number, lineId: string) {
    const sourceLine = selectedSourceLines.find((line) => line.id === lineId);
    if (!sourceLine) return;
    updateLine(index, sourceLineToEditable(sourceType, sourceLine));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      const payload = {
        supplierId,
        returnDate,
        reason: reason.trim() || null,
        reference: reference.trim() || null,
        notes: notes.trim() || null,
        sourcePurchaseBillId: sourceType === "BILL" ? sourceId || null : null,
        sourcePurchaseOrderId: sourceType === "ORDER" ? sourceId || null : null,
        sourcePurchaseReceiptId: sourceType === "RECEIPT" ? sourceId || null : null,
        sourceMatchingReviewId: sourceType === "REVIEW" ? sourceId || null : null,
        lines: lines.map((line) => ({
          description: line.description.trim() || "Purchase return line",
          quantity: line.quantity,
          unitCost: line.unitCost.trim() || null,
          reason: line.reason.trim() || null,
          sourcePurchaseBillLineId: line.sourcePurchaseBillLineId || null,
          sourcePurchaseReceiptLineId: line.sourcePurchaseReceiptLineId || null,
          sourcePurchaseOrderLineId: line.sourcePurchaseOrderLineId || null,
        })),
      };
      const saved = initialReturn
        ? await apiRequest<PurchaseReturn>(`/purchase-returns/${initialReturn.id}`, { method: "PATCH", body: payload })
        : await apiRequest<PurchaseReturn>("/purchase-returns", { method: "POST", body: payload });
      router.push(`/purchases/returns/${saved.id}`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : tc("Unable to save purchase return."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">{tc(PURCHASE_RETURN_NON_EFFECT_TEXT)}</div>
      {loading ? <StatusMessage type="loading">{tc("Loading purchase return form...")}</StatusMessage> : null}
      {error ? <StatusMessage type="error">{error}</StatusMessage> : null}

      <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Summary label={tc("Return number")} value={(initialReturn?.purchaseReturnNumber ?? nextNumber) || tc("Assigned on save")} />
          <label className="block text-sm font-medium text-ink">
            {tc("Supplier")}
            <select value={supplierId} onChange={(event) => setSupplierId(event.target.value)} required className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
              <option value="">{tc("Select supplier")}</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.displayName ?? supplier.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium text-ink">
            {tc("Return date")}
            <input type="date" value={returnDate} onChange={(event) => setReturnDate(event.target.value)} required className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </label>
          <label className="block text-sm font-medium text-ink">
            {tc("Source type")}
            <select value={sourceType} onChange={(event) => handleSourceTypeChange(event.target.value as SourceType)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
              <option value="NONE">{tc("Supplier direct")}</option>
              <option value="BILL">{tc("Purchase bill")}</option>
              <option value="ORDER">{tc("Purchase order")}</option>
              <option value="RECEIPT">{tc("Purchase receipt")}</option>
              <option value="REVIEW">{tc("Matching review")}</option>
            </select>
          </label>
          <label className="block text-sm font-medium text-ink">
            {tc("Source")}
            <select value={sourceId} onChange={(event) => handleSourceIdChange(event.target.value)} disabled={sourceType === "NONE"} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50">
              <option value="">{tc("No source selected")}</option>
              {sourceOptions.map((source) => (
                <option key={source.id} value={source.id}>
                  {source.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium text-ink">
            {tc("Reference")}
            <input value={reference} onChange={(event) => setReference(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </label>
          <label className="block text-sm font-medium text-ink md:col-span-3">
            {tc("Reason")}
            <input value={reason} onChange={(event) => setReason(event.target.value)} placeholder={tc("Return reason")} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </label>
          <label className="block text-sm font-medium text-ink md:col-span-3">
            {tc("Notes")}
            <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </label>
        </div>
      </div>

      <div className="rounded-md border border-slate-200 bg-white shadow-panel">
        <div className="flex items-center justify-between border-b border-slate-100 p-4">
          <div>
            <h2 className="text-base font-semibold text-ink">{tc("Return lines")}</h2>
            <p className="mt-1 text-sm text-steel">{tc("Source line references are optional but recommended when quantity limits can be validated.")}</p>
          </div>
          <button type="button" onClick={() => setLines((current) => [...current, blankLine()])} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            {tc("Add line")}
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-start text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
              <tr>
                <th className="px-3 py-2">{tc("Source line")}</th>
                <th className="px-3 py-2">{tc("Description")}</th>
                <th className="px-3 py-2">{tc("Quantity")}</th>
                <th className="px-3 py-2">{tc("Unit cost")}</th>
                <th className="px-3 py-2">{tc("Reason")}</th>
                <th className="px-3 py-2">{tc("Action")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {lines.map((line, index) => (
                <tr key={index}>
                  <td className="px-3 py-2">
                    <select value={activeSourceLineId(line)} onChange={(event) => selectSourceLine(index, event.target.value)} disabled={selectedSourceLines.length === 0} className="w-full rounded-md border border-slate-300 px-2 py-2 text-sm disabled:bg-slate-50">
                      <option value="">{tc("Manual line")}</option>
                      {selectedSourceLines.map((sourceLine) => (
                        <option key={sourceLine.id} value={sourceLine.id}>
                          {sourceLine.description} ({sourceLine.quantity})
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <input value={line.description} onChange={(event) => updateLine(index, { description: event.target.value })} required className="w-full rounded-md border border-slate-300 px-2 py-2 text-sm" />
                  </td>
                  <td className="px-3 py-2">
                    <input value={line.quantity} onChange={(event) => updateLine(index, { quantity: event.target.value })} required className="w-full rounded-md border border-slate-300 px-2 py-2 font-mono text-sm" />
                  </td>
                  <td className="px-3 py-2">
                    <input value={line.unitCost} onChange={(event) => updateLine(index, { unitCost: event.target.value })} className="w-full rounded-md border border-slate-300 px-2 py-2 font-mono text-sm" />
                  </td>
                  <td className="px-3 py-2">
                    <input value={line.reason} onChange={(event) => updateLine(index, { reason: event.target.value })} className="w-full rounded-md border border-slate-300 px-2 py-2 text-sm" />
                  </td>
                  <td className="px-3 py-2">
                    <button type="button" onClick={() => setLines((current) => current.filter((_, lineIndex) => lineIndex !== index))} disabled={lines.length === 1} className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400">
                      {tc("Remove")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <button type="button" onClick={() => router.back()} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          {tc("Cancel")}
        </button>
        <button type="submit" disabled={saving || !organizationId} className="rounded-md bg-palm px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400">
          {saving ? tc("Saving...") : initialReturn ? tc("Save changes") : tc("Save draft")}
        </button>
      </div>
    </form>
  );
}

function sourceLinesFor(
  sourceType: SourceType,
  sourceId: string,
  bills: PurchaseBill[],
  orders: PurchaseOrder[],
  receipts: PurchaseReceipt[],
): Array<{ id: string; description: string; quantity: string; unitCost: string; kind: SourceType }> {
  if (sourceType === "BILL") {
    return (bills.find((bill) => bill.id === sourceId)?.lines ?? []).map((line) => ({ id: line.id, description: line.description, quantity: line.quantity, unitCost: line.unitPrice, kind: "BILL" }));
  }
  if (sourceType === "ORDER") {
    return (orders.find((order) => order.id === sourceId)?.lines ?? []).map((line) => ({ id: line.id, description: line.description, quantity: line.quantity, unitCost: line.unitPrice, kind: "ORDER" }));
  }
  if (sourceType === "RECEIPT") {
    return (receipts.find((receipt) => receipt.id === sourceId)?.lines ?? []).map((line) => ({
      id: line.id,
      description: line.item?.name ?? line.purchaseBillLine?.description ?? line.purchaseOrderLine?.description ?? line.id,
      quantity: line.quantity,
      unitCost: line.unitCost ?? "",
      kind: "RECEIPT",
    }));
  }
  return [];
}

function sourceLineToEditable(sourceType: SourceType, line: { id: string; description: string; quantity: string; unitCost: string }): EditableReturnLine {
  return {
    ...blankLine(),
    description: line.description,
    quantity: line.quantity,
    unitCost: line.unitCost,
    sourcePurchaseBillLineId: sourceType === "BILL" ? line.id : "",
    sourcePurchaseOrderLineId: sourceType === "ORDER" ? line.id : "",
    sourcePurchaseReceiptLineId: sourceType === "RECEIPT" ? line.id : "",
  };
}

function returnLineToEditable(line: PurchaseReturnLine): EditableReturnLine {
  return {
    description: line.description,
    quantity: line.quantity,
    unitCost: line.unitCost ?? "",
    reason: line.reason ?? "",
    sourcePurchaseBillLineId: line.sourcePurchaseBillLineId ?? "",
    sourcePurchaseReceiptLineId: line.sourcePurchaseReceiptLineId ?? "",
    sourcePurchaseOrderLineId: line.sourcePurchaseOrderLineId ?? "",
  };
}

function activeSourceLineId(line: EditableReturnLine): string {
  return line.sourcePurchaseBillLineId || line.sourcePurchaseReceiptLineId || line.sourcePurchaseOrderLineId;
}

function initialSourceType(initialReturn: PurchaseReturn | undefined, searchParams: URLSearchParams): SourceType {
  const querySourceType = searchParams.get("sourceType");
  if (querySourceType === "purchaseBill") return "BILL";
  if (querySourceType === "purchaseOrder") return "ORDER";
  if (querySourceType === "purchaseReceipt") return "RECEIPT";
  if (searchParams.get("matchingReviewId")) return "REVIEW";
  if (initialReturn?.sourcePurchaseBillId) return "BILL";
  if (initialReturn?.sourcePurchaseOrderId) return "ORDER";
  if (initialReturn?.sourcePurchaseReceiptId) return "RECEIPT";
  if (initialReturn?.sourceMatchingReviewId) return "REVIEW";
  return "NONE";
}

function initialSourceId(initialReturn: PurchaseReturn | undefined, searchParams: URLSearchParams): string {
  return (
    initialReturn?.sourcePurchaseBillId ??
    initialReturn?.sourcePurchaseOrderId ??
    initialReturn?.sourcePurchaseReceiptId ??
    initialReturn?.sourceMatchingReviewId ??
    searchParams.get("purchaseBillId") ??
    searchParams.get("purchaseOrderId") ??
    searchParams.get("purchaseReceiptId") ??
    searchParams.get("matchingReviewId") ??
    ""
  );
}

function toDateInput(value: string | undefined): string | null {
  if (!value) return null;
  return value.slice(0, 10);
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-steel">{label}</div>
      <div className="mt-1 font-medium text-ink">{value}</div>
    </div>
  );
}
