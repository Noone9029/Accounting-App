"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { calculateInvoicePreview, formatMoneyAmount } from "@/lib/money";
import type { Account, Branch, Contact, Item, PurchaseOrder, TaxRate } from "@/lib/types";

interface PurchaseOrderLineState {
  id: string;
  itemId: string;
  description: string;
  accountId: string;
  quantity: string;
  unitPrice: string;
  discountRate: string;
  taxRateId: string;
}

interface PurchaseOrderFormProps {
  initialOrder?: PurchaseOrder;
}

function makeLine(): PurchaseOrderLineState {
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

export function PurchaseOrderForm({ initialOrder }: PurchaseOrderFormProps) {
  const router = useRouter();
  const organizationId = useActiveOrganizationId();
  const [suppliers, setSuppliers] = useState<Contact[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [taxRates, setTaxRates] = useState<TaxRate[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [supplierId, setSupplierId] = useState(initialOrder?.supplierId ?? "");
  const [branchId, setBranchId] = useState(initialOrder?.branchId ?? "");
  const [orderDate, setOrderDate] = useState(dateInputValue(initialOrder?.orderDate));
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState(dateInputValue(initialOrder?.expectedDeliveryDate, ""));
  const [notes, setNotes] = useState(initialOrder?.notes ?? "");
  const [terms, setTerms] = useState(initialOrder?.terms ?? "");
  const [lines, setLines] = useState<PurchaseOrderLineState[]>(
    initialOrder?.lines?.map((line) => ({
      id: line.id,
      itemId: line.itemId ?? "",
      description: line.description,
      accountId: line.accountId ?? "",
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
    if (!organizationId) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    Promise.all([
      apiRequest<Contact[]>("/contacts"),
      apiRequest<Item[]>("/items"),
      apiRequest<Account[]>("/accounts"),
      apiRequest<TaxRate[]>("/tax-rates"),
      apiRequest<Branch[]>("/branches"),
    ])
      .then(([contactResult, itemResult, accountResult, taxRateResult, branchResult]) => {
        if (cancelled) {
          return;
        }

        setSuppliers(contactResult.filter((contact) => contact.isActive && (contact.type === "SUPPLIER" || contact.type === "BOTH")));
        setItems(itemResult);
        setAccounts(accountResult);
        setTaxRates(taxRateResult);
        setBranches(branchResult);
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load purchase order setup data.");
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

  function updateLine(lineId: string, patch: Partial<PurchaseOrderLineState>) {
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
        branchId: branchId || null,
        orderDate: `${orderDate}T00:00:00.000Z`,
        expectedDeliveryDate: expectedDeliveryDate ? `${expectedDeliveryDate}T00:00:00.000Z` : null,
        currency: "SAR",
        notes: notes || undefined,
        terms: terms || undefined,
        lines: lines.map((line, index) => ({
          itemId: line.itemId || undefined,
          description: line.description,
          accountId: line.accountId || null,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          discountRate: line.discountRate || "0.0000",
          taxRateId: line.taxRateId || null,
          sortOrder: index,
        })),
      };

      const order = initialOrder
        ? await apiRequest<PurchaseOrder>(`/purchase-orders/${initialOrder.id}`, { method: "PATCH", body })
        : await apiRequest<PurchaseOrder>("/purchase-orders", { method: "POST", body });

      router.push(`/purchases/purchase-orders/${order.id}`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to save purchase order.");
    } finally {
      setSubmitting(false);
    }
  }

  if (initialOrder && initialOrder.status !== "DRAFT") {
    return (
      <div className="space-y-4">
        <StatusMessage type="error">Only draft purchase orders can be edited.</StatusMessage>
        <Link
          href={`/purchases/purchase-orders/${initialOrder.id}`}
          className="inline-flex rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Back to purchase order
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
            <select
              value={supplierId}
              onChange={(event) => setSupplierId(event.target.value)}
              required
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm"
            >
              <option value="">Select supplier</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.displayName ?? supplier.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Order date</span>
            <input
              type="date"
              value={orderDate}
              onChange={(event) => setOrderDate(event.target.value)}
              required
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Expected delivery</span>
            <input
              type="date"
              value={expectedDeliveryDate}
              onChange={(event) => setExpectedDeliveryDate(event.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm"
            />
          </label>
          <label className="block md:col-span-2">
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
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Terms</span>
            <input value={terms} onChange={(event) => setTerms(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Notes</span>
            <input value={notes} onChange={(event) => setNotes(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
          </label>
        </div>
      </div>

      <div className="overflow-x-auto rounded-md border border-slate-200 bg-white shadow-panel">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
            <tr>
              <th className="px-4 py-3">Item</th>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3">Account</th>
              <th className="px-4 py-3">Qty</th>
              <th className="px-4 py-3">Unit price</th>
              <th className="px-4 py-3">Discount %</th>
              <th className="px-4 py-3">Tax</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {lines.map((line) => (
              <tr key={line.id}>
                <td className="px-4 py-3">
                  <select value={line.itemId} onChange={(event) => selectItem(line.id, event.target.value)} className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm outline-none focus:border-palm">
                    <option value="">No item</option>
                    {activeItems.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <input value={line.description} onChange={(event) => updateLine(line.id, { description: event.target.value })} required className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm outline-none focus:border-palm" />
                </td>
                <td className="px-4 py-3">
                  <select value={line.accountId} onChange={(event) => updateLine(line.id, { accountId: event.target.value })} className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm outline-none focus:border-palm">
                    <option value="">No account yet</option>
                    {postingPurchaseAccounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.code} {account.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <input inputMode="decimal" value={line.quantity} onChange={(event) => updateLine(line.id, { quantity: event.target.value })} required className="w-24 rounded-md border border-slate-300 px-2 py-1 text-sm outline-none focus:border-palm" />
                </td>
                <td className="px-4 py-3">
                  <input inputMode="decimal" value={line.unitPrice} onChange={(event) => updateLine(line.id, { unitPrice: event.target.value })} required className="w-28 rounded-md border border-slate-300 px-2 py-1 text-sm outline-none focus:border-palm" />
                </td>
                <td className="px-4 py-3">
                  <input inputMode="decimal" value={line.discountRate} onChange={(event) => updateLine(line.id, { discountRate: event.target.value })} className="w-24 rounded-md border border-slate-300 px-2 py-1 text-sm outline-none focus:border-palm" />
                </td>
                <td className="px-4 py-3">
                  <select value={line.taxRateId} onChange={(event) => updateLine(line.id, { taxRateId: event.target.value })} className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm outline-none focus:border-palm">
                    <option value="">No tax</option>
                    {activePurchaseTaxRates.map((taxRate) => (
                      <option key={taxRate.id} value={taxRate.id}>
                        {taxRate.name} ({taxRate.rate}%)
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <button type="button" onClick={() => removeLine(line.id)} className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4 rounded-md border border-slate-200 bg-white p-5 shadow-panel">
        <button type="button" onClick={() => setLines((current) => [...current, makeLine()])} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          Add line
        </button>
        <div className="min-w-[260px] space-y-2 text-sm">
          <TotalRow label="Subtotal" value={formatMoneyAmount(preview.subtotal)} />
          <TotalRow label="Discount" value={formatMoneyAmount(preview.discountTotal)} />
          <TotalRow label="Taxable" value={formatMoneyAmount(preview.taxableTotal)} />
          <TotalRow label="VAT / Tax" value={formatMoneyAmount(preview.taxTotal)} />
          <TotalRow label="Total" value={formatMoneyAmount(preview.total)} strong />
        </div>
      </div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">Log in and select an organization to create purchase orders.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading purchase order setup data...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {!preview.valid ? <StatusMessage type="info">Every purchase order line needs a positive quantity, non-negative unit price, and valid discount.</StatusMessage> : null}
        <StatusMessage type="info">Accounts are optional on the purchase order, but every line needs an account or item expense account before conversion to a bill.</StatusMessage>
      </div>

      <div className="flex justify-end gap-3">
        <Link href="/purchases/purchase-orders" className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          Cancel
        </Link>
        <button type="submit" disabled={submitting || !organizationId} className="rounded-md bg-palm px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400">
          {submitting ? "Saving..." : initialOrder ? "Save changes" : "Save draft"}
        </button>
      </div>
    </form>
  );
}

function TotalRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between gap-4 ${strong ? "font-semibold text-ink" : "text-steel"}`}>
      <span>{label}</span>
      <span className="font-mono text-xs">{value}</span>
    </div>
  );
}

function getValidationError(supplierId: string, lines: PurchaseOrderLineState[], totalsValid: boolean): string {
  if (!supplierId) {
    return "Select a supplier.";
  }
  if (!totalsValid) {
    return "Fix purchase order line amounts before saving.";
  }
  if (lines.some((line) => !line.description.trim())) {
    return "Each purchase order line needs a description.";
  }
  return "";
}
