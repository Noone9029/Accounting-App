"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { bankAccountOptionLabel } from "@/lib/bank-accounts";
import { calculateInvoicePreview, formatMoneyAmount } from "@/lib/money";
import type { Account, BankAccountSummary, Branch, CashExpense, Contact, Item, TaxRate } from "@/lib/types";

interface CashExpenseLineState {
  id: string;
  itemId: string;
  description: string;
  accountId: string;
  quantity: string;
  unitPrice: string;
  discountRate: string;
  taxRateId: string;
}

function makeLine(): CashExpenseLineState {
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

export function CashExpenseForm() {
  const router = useRouter();
  const organizationId = useActiveOrganizationId();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [bankProfiles, setBankProfiles] = useState<BankAccountSummary[]>([]);
  const [taxRates, setTaxRates] = useState<TaxRate[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [contactId, setContactId] = useState("");
  const [branchId, setBranchId] = useState("");
  const [expenseDate, setExpenseDate] = useState(todayInputValue());
  const [paidThroughAccountId, setPaidThroughAccountId] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<CashExpenseLineState[]>([makeLine()]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const supplierContacts = contacts.filter((contact) => contact.isActive && (contact.type === "SUPPLIER" || contact.type === "BOTH"));
  const paidThroughAccounts = accounts.filter((account) => account.isActive && account.allowPosting && account.type === "ASSET");
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
      apiRequest<BankAccountSummary[]>("/bank-accounts").catch(() => []),
    ])
      .then(([contactResult, itemResult, accountResult, taxRateResult, branchResult, bankProfileResult]) => {
        if (cancelled) {
          return;
        }

        setContacts(contactResult);
        setItems(itemResult);
        setAccounts(accountResult);
        setTaxRates(taxRateResult);
        setBranches(branchResult);
        setBankProfiles(bankProfileResult);
        setPaidThroughAccountId((current) => current || accountResult.find((account) => account.isActive && account.allowPosting && account.type === "ASSET")?.id || "");
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load cash expense setup data.");
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

  function updateLine(lineId: string, patch: Partial<CashExpenseLineState>) {
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

    const validationError = getValidationError(paidThroughAccountId, lines, preview.valid);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    try {
      const expense = await apiRequest<CashExpense>("/cash-expenses", {
        method: "POST",
        body: {
          contactId: contactId || null,
          branchId: branchId || null,
          expenseDate: `${expenseDate}T00:00:00.000Z`,
          currency: "SAR",
          paidThroughAccountId,
          description: description || undefined,
          notes: notes || undefined,
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
        },
      });

      router.push(`/purchases/cash-expenses/${expense.id}`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to post cash expense.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <label className="block md:col-span-2">
            <span className="text-sm font-medium text-slate-700">Supplier/contact</span>
            <select value={contactId} onChange={(event) => setContactId(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm">
              <option value="">No linked supplier</option>
              {supplierContacts.map((contact) => (
                <option key={contact.id} value={contact.id}>
                  {contact.displayName ?? contact.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Expense date</span>
            <input type="date" value={expenseDate} onChange={(event) => setExpenseDate(event.target.value)} required className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Paid through</span>
            <select value={paidThroughAccountId} onChange={(event) => setPaidThroughAccountId(event.target.value)} required className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm">
              <option value="">Select account</option>
              {paidThroughAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {bankAccountOptionLabel(account, bankProfiles)}
                </option>
              ))}
            </select>
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
            <span className="text-sm font-medium text-slate-700">Description</span>
            <input value={description} onChange={(event) => setDescription(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Notes</span>
            <input value={notes} onChange={(event) => setNotes(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
          </label>
        </div>
        <p className="mt-3 text-xs text-steel">Cash expenses post immediately: debit expense/VAT, credit the paid-through account, and do not create accounts payable.</p>
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
                  <select value={line.accountId} onChange={(event) => updateLine(line.id, { accountId: event.target.value })} required className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm outline-none focus:border-palm">
                    <option value="">Select account</option>
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
        {!organizationId ? <StatusMessage type="info">Log in and select an organization to create cash expenses.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading cash expense setup data...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {!preview.valid ? <StatusMessage type="info">Every cash expense line needs a positive quantity, non-negative unit price, valid discount, and a posting account.</StatusMessage> : null}
      </div>

      <div className="flex justify-end gap-3">
        <Link href="/purchases/cash-expenses" className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          Cancel
        </Link>
        <button type="submit" disabled={submitting || !organizationId} className="rounded-md bg-palm px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400">
          {submitting ? "Posting..." : "Post cash expense"}
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

function getValidationError(paidThroughAccountId: string, lines: CashExpenseLineState[], totalsValid: boolean): string {
  if (!paidThroughAccountId) {
    return "Select a paid-through account.";
  }
  if (!totalsValid) {
    return "Fix cash expense line amounts before posting.";
  }
  if (lines.some((line) => !line.description.trim() || !line.accountId)) {
    return "Each cash expense line needs a description and account.";
  }
  return "";
}
