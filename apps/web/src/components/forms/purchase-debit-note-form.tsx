"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { calculateInvoicePreview, formatMoneyAmount } from "@/lib/money";
import type { Account, Branch, Contact, Item, PurchaseBill, PurchaseDebitNote, TaxRate } from "@/lib/types";

interface PurchaseDebitNoteLineState {
  id: string;
  itemId: string;
  description: string;
  accountId: string;
  quantity: string;
  unitPrice: string;
  discountRate: string;
  taxRateId: string;
}

interface PurchaseDebitNoteFormProps {
  initialDebitNote?: PurchaseDebitNote;
  initialSupplierId?: string;
  initialBillId?: string;
}

function makeLine(): PurchaseDebitNoteLineState {
  return {
    id: globalThis.crypto?.randomUUID?.() ?? `line-${Date.now()}-${Math.random()}`,
    itemId: "",
    description: "",
    accountId: "",
    quantity: "1.0000",
    unitPrice: "0.0000",
    discountRate: "0.0000",
    taxRateId: "",
  };
}

function todayInputValue(): string {
  return new Date().toISOString().slice(0, 10);
}

function dateInputValue(value?: string | null, fallback = todayInputValue()): string {
  return value ? new Date(value).toISOString().slice(0, 10) : fallback;
}

export function PurchaseDebitNoteForm({ initialDebitNote, initialSupplierId = "", initialBillId = "" }: PurchaseDebitNoteFormProps) {
  const router = useRouter();
  const organizationId = useActiveOrganizationId();
  const [suppliers, setSuppliers] = useState<Contact[]>([]);
  const [bills, setBills] = useState<PurchaseBill[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [taxRates, setTaxRates] = useState<TaxRate[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [supplierId, setSupplierId] = useState(initialDebitNote?.supplierId ?? initialSupplierId);
  const [originalBillId, setOriginalBillId] = useState(initialDebitNote?.originalBillId ?? initialBillId);
  const [branchId, setBranchId] = useState(initialDebitNote?.branchId ?? "");
  const [issueDate, setIssueDate] = useState(dateInputValue(initialDebitNote?.issueDate));
  const [notes, setNotes] = useState(initialDebitNote?.notes ?? "");
  const [reason, setReason] = useState(initialDebitNote?.reason ?? "");
  const [lines, setLines] = useState<PurchaseDebitNoteLineState[]>(
    initialDebitNote?.lines?.map((line) => ({
      id: line.id,
      itemId: line.itemId ?? "",
      description: line.description,
      accountId: line.accountId,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      discountRate: line.discountRate,
      taxRateId: line.taxRateId ?? "",
    })) ?? [makeLine()],
  );
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const postingPurchaseAccounts = accounts.filter(
    (account) =>
      account.isActive &&
      account.allowPosting &&
      (account.type === "EXPENSE" || account.type === "COST_OF_SALES" || account.type === "ASSET"),
  );
  const activePurchaseTaxRates = taxRates.filter((taxRate) => taxRate.isActive && (taxRate.scope === "PURCHASES" || taxRate.scope === "BOTH"));
  const activeItems = items.filter((item) => item.status === "ACTIVE");
  const supplierBills = bills.filter((bill) => bill.supplierId === supplierId && bill.status === "FINALIZED");
  const selectedOriginalBill = supplierBills.find((bill) => bill.id === originalBillId);
  const preview = useMemo(
    () =>
      calculateInvoicePreview(
        lines.map((line) => ({
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          discountRate: line.discountRate,
          taxRate: activePurchaseTaxRates.find((taxRate) => taxRate.id === line.taxRateId)?.rate ?? "0.0000",
        })),
      ),
    [activePurchaseTaxRates, lines],
  );

  useEffect(() => {
    if (initialDebitNote || initialSupplierId || initialBillId || typeof window === "undefined") {
      return;
    }

    const query = new URLSearchParams(window.location.search);
    const querySupplierId = query.get("supplierId") ?? "";
    const queryBillId = query.get("billId") ?? "";
    if (querySupplierId) {
      setSupplierId(querySupplierId);
    }
    if (queryBillId) {
      setOriginalBillId(queryBillId);
    }
  }, [initialBillId, initialDebitNote, initialSupplierId]);

  useEffect(() => {
    if (!organizationId) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    Promise.all([
      apiRequest<Contact[]>("/contacts"),
      apiRequest<PurchaseBill[]>("/purchase-bills"),
      apiRequest<Item[]>("/items"),
      apiRequest<Account[]>("/accounts"),
      apiRequest<TaxRate[]>("/tax-rates"),
      apiRequest<Branch[]>("/branches"),
    ])
      .then(([contactResult, billResult, itemResult, accountResult, taxRateResult, branchResult]) => {
        if (cancelled) {
          return;
        }

        setSuppliers(contactResult.filter((contact) => contact.isActive && (contact.type === "SUPPLIER" || contact.type === "BOTH")));
        setBills(billResult);
        setItems(itemResult);
        setAccounts(accountResult);
        setTaxRates(taxRateResult);
        setBranches(branchResult);
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load debit note setup data.");
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
  }, [organizationId]);

  useEffect(() => {
    if (bills.length > 0 && originalBillId && supplierId && !supplierBills.some((bill) => bill.id === originalBillId)) {
      setOriginalBillId("");
    }
  }, [bills.length, originalBillId, supplierBills, supplierId]);

  function updateLine(lineId: string, patch: Partial<PurchaseDebitNoteLineState>) {
    setLines((current) => current.map((line) => (line.id === lineId ? { ...line, ...patch } : line)));
  }

  function selectItem(lineId: string, itemId: string) {
    const item = items.find((candidate) => candidate.id === itemId);
    if (!item) {
      updateLine(lineId, { itemId: "", description: "", unitPrice: "0.0000" });
      return;
    }

    updateLine(lineId, {
      itemId,
      description: item.description ?? item.name,
      accountId: item.expenseAccountId ?? "",
      unitPrice: item.purchaseCost ?? "0.0000",
      taxRateId: item.purchaseTaxRateId ?? "",
    });
  }

  function removeLine(lineId: string) {
    setLines((current) => (current.length > 1 ? current.filter((line) => line.id !== lineId) : current));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const validationError = getValidationError(supplierId, lines, preview.valid);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    try {
      const body = {
        supplierId,
        originalBillId: originalBillId || null,
        branchId: branchId || null,
        issueDate: `${issueDate}T00:00:00.000Z`,
        currency: "SAR",
        notes: notes || undefined,
        reason: reason || undefined,
        lines: lines.map((line, index) => ({
          itemId: line.itemId || undefined,
          description: line.description,
          accountId: line.accountId,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          discountRate: line.discountRate || "0.0000",
          taxRateId: line.taxRateId || null,
          sortOrder: index,
        })),
      };

      const debitNote = initialDebitNote
        ? await apiRequest<PurchaseDebitNote>(`/purchase-debit-notes/${initialDebitNote.id}`, { method: "PATCH", body })
        : await apiRequest<PurchaseDebitNote>("/purchase-debit-notes", { method: "POST", body });

      router.push(`/purchases/debit-notes/${debitNote.id}`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to save debit note.");
    } finally {
      setSubmitting(false);
    }
  }

  if (initialDebitNote && initialDebitNote.status !== "DRAFT") {
    return (
      <div className="space-y-4">
        <StatusMessage type="error">Only draft debit notes can be edited.</StatusMessage>
        <Link href={`/purchases/debit-notes/${initialDebitNote.id}`} className="inline-flex rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          Back to debit note
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <label className="block md:col-span-2">
            <span className="text-sm font-medium text-slate-700">Supplier</span>
            <select value={supplierId} onChange={(event) => setSupplierId(event.target.value)} required className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm">
              <option value="">Select supplier</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.displayName ?? supplier.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Issue date</span>
            <input type="date" value={issueDate} onChange={(event) => setIssueDate(event.target.value)} required className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Branch</span>
            <select value={branchId} onChange={(event) => setBranchId(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm">
              <option value="">No branch</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.displayName ?? branch.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block md:col-span-2">
            <span className="text-sm font-medium text-slate-700">Original bill</span>
            <select value={originalBillId} onChange={(event) => setOriginalBillId(event.target.value)} disabled={!supplierId} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm disabled:bg-slate-50">
              <option value="">Standalone debit note</option>
              {supplierBills.map((bill) => (
                <option key={bill.id} value={bill.id}>
                  {bill.billNumber} - {formatMoneyAmount(bill.total, bill.currency)}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Reason</span>
            <input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Return, overcharge, supplier credit" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Notes</span>
            <input value={notes} onChange={(event) => setNotes(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
          </label>
        </div>
        {selectedOriginalBill ? (
          <p className="mt-3 text-xs text-steel">
            Linked to bill {selectedOriginalBill.billNumber}. Debit note total is validated against the original bill total.
          </p>
        ) : null}
      </div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">Log in and select an organization before creating debit notes.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading debit note setup data...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
      </div>

      <div className="overflow-x-auto rounded-md border border-slate-200 bg-white shadow-panel">
        <div className="grid min-w-[1120px] grid-cols-[1fr_1.2fr_1fr_0.55fr_0.65fr_0.55fr_0.8fr_0.7fr_0.45fr] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-steel">
          <div>Item</div>
          <div>Description</div>
          <div>Purchase account</div>
          <div>Qty</div>
          <div>Price</div>
          <div>Discount %</div>
          <div>Tax</div>
          <div>Total</div>
          <div></div>
        </div>
        {lines.map((line, index) => {
          const previewLine = preview.lines[index];
          return (
            <div key={line.id} className="grid min-w-[1120px] grid-cols-[1fr_1.2fr_1fr_0.55fr_0.65fr_0.55fr_0.8fr_0.7fr_0.45fr] gap-3 border-b border-slate-100 px-4 py-3">
              <select value={line.itemId} onChange={(event) => selectItem(line.id, event.target.value)} className="rounded-md border border-slate-300 px-2 py-2 text-sm">
                <option value="">No item</option>
                {activeItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.sku ? `${item.sku} - ${item.name}` : item.name}
                  </option>
                ))}
              </select>
              <input value={line.description} onChange={(event) => updateLine(line.id, { description: event.target.value })} required className="rounded-md border border-slate-300 px-2 py-2 text-sm" />
              <select value={line.accountId} onChange={(event) => updateLine(line.id, { accountId: event.target.value })} required className="rounded-md border border-slate-300 px-2 py-2 text-sm">
                <option value="">Select account</option>
                {postingPurchaseAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.code} {account.name}
                  </option>
                ))}
              </select>
              <input inputMode="decimal" value={line.quantity} onChange={(event) => updateLine(line.id, { quantity: event.target.value })} className="rounded-md border border-slate-300 px-2 py-2 text-sm" />
              <input inputMode="decimal" value={line.unitPrice} onChange={(event) => updateLine(line.id, { unitPrice: event.target.value })} className="rounded-md border border-slate-300 px-2 py-2 text-sm" />
              <input inputMode="decimal" value={line.discountRate} onChange={(event) => updateLine(line.id, { discountRate: event.target.value })} className="rounded-md border border-slate-300 px-2 py-2 text-sm" />
              <select value={line.taxRateId} onChange={(event) => updateLine(line.id, { taxRateId: event.target.value })} className="rounded-md border border-slate-300 px-2 py-2 text-sm">
                <option value="">No tax</option>
                {activePurchaseTaxRates.map((taxRate) => (
                  <option key={taxRate.id} value={taxRate.id}>
                    {taxRate.name}
                  </option>
                ))}
              </select>
              <div className="flex items-center font-mono text-xs text-ink">{previewLine ? formatMoneyAmount(previewLine.lineTotalUnits) : "SAR 0.00"}</div>
              <button type="button" onClick={() => removeLine(line.id)} disabled={lines.length <= 1} className="rounded-md border border-slate-300 px-2 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300">
                Remove
              </button>
            </div>
          );
        })}
        <div className="flex min-w-[1120px] items-center justify-between px-4 py-3 text-sm">
          <button type="button" onClick={() => setLines((current) => [...current, makeLine()])} className="rounded-md border border-slate-300 px-3 py-2 font-medium text-slate-700 hover:bg-slate-50">
            Add line
          </button>
          <div className="grid min-w-72 grid-cols-2 gap-2 text-right">
            <span className="text-steel">Subtotal</span>
            <span className="font-mono">{formatMoneyAmount(preview.subtotal)}</span>
            <span className="text-steel">Discount</span>
            <span className="font-mono">{formatMoneyAmount(preview.discountTotal)}</span>
            <span className="text-steel">Taxable</span>
            <span className="font-mono">{formatMoneyAmount(preview.taxableTotal)}</span>
            <span className="text-steel">VAT</span>
            <span className="font-mono">{formatMoneyAmount(preview.taxTotal)}</span>
            <span className="font-semibold text-ink">Total debit</span>
            <span className="font-mono font-semibold text-ink">{formatMoneyAmount(preview.total)}</span>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button type="submit" disabled={!organizationId || loading || submitting || !preview.valid} className="rounded-md bg-palm px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400">
          {submitting ? "Saving..." : initialDebitNote ? "Save draft debit note" : "Create draft debit note"}
        </button>
        <Link href="/purchases/debit-notes" className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          Cancel
        </Link>
      </div>
    </form>
  );
}

function getValidationError(supplierId: string, lines: PurchaseDebitNoteLineState[], previewValid: boolean): string {
  if (!supplierId) {
    return "Choose a supplier.";
  }

  for (const [index, line] of lines.entries()) {
    if (!line.description.trim()) {
      return `Line ${index + 1} needs a description.`;
    }

    if (!line.accountId) {
      return `Line ${index + 1} needs a purchase account.`;
    }
  }

  return previewValid ? "" : "Debit note lines need positive quantities, non-negative prices and tax, and discounts between 0% and 100%.";
}
