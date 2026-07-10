"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useAppLocale } from "@/components/app-locale-provider";
import { StatusMessage } from "@/components/common/status-message";
import { useActiveOrganization } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { formatAppMoney } from "@/lib/app-i18n";
import { calculateInvoicePreview } from "@/lib/money";
import { safeReturnToFromSearch } from "@/lib/parties";
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

interface FormValidationError {
  message: string;
  params?: Record<string, string | number>;
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
  const activeOrganization = useActiveOrganization();
  const organizationId = activeOrganization?.id ?? null;
  const baseCurrency = activeOrganization?.baseCurrency ?? null;
  const documentCurrency = initialDebitNote?.currency ?? baseCurrency;
  const currencyMismatch = Boolean(baseCurrency && documentCurrency && documentCurrency !== baseCurrency);
  const { locale, tc } = useAppLocale();
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
  const [returnTo, setReturnTo] = useState("");

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
  const sourceSelectionMissing = Boolean(originalBillId && !selectedOriginalBill);
  const sourceCurrencyMismatch = Boolean(selectedOriginalBill && documentCurrency && selectedOriginalBill.currency !== documentCurrency);
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
    if (initialDebitNote || typeof window === "undefined") {
      return;
    }

    const query = new URLSearchParams(window.location.search);
    const querySupplierId = query.get("supplierId") ?? "";
    const queryBillId = query.get("billId") ?? "";
    setReturnTo(safeReturnToFromSearch(window.location.search));
    if (!initialSupplierId && querySupplierId) {
      setSupplierId(querySupplierId);
    }
    if (!initialBillId && queryBillId) {
      setOriginalBillId(queryBillId);
    }
  }, [initialBillId, initialDebitNote, initialSupplierId]);

  useEffect(() => {
    if (initialDebitNote && initialDebitNote.status !== "DRAFT") {
      return;
    }

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
          setError(loadError instanceof Error ? loadError.message : tc("Unable to load debit note setup data."));
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
  }, [initialDebitNote, organizationId, tc]);

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
    if (!documentCurrency) {
      setError(tc("Select an organization with a base currency before saving this debit note."));
      return;
    }
    if (sourceSelectionMissing) {
      setError(tc("The selected original bill does not belong to the active organization."));
      return;
    }
    if (currencyMismatch || sourceCurrencyMismatch) {
      setError(tc("Debit-note currency must match the organization base currency and any linked bill. The draft was not changed or saved."));
      return;
    }

    const validationError = getValidationError(supplierId, lines, preview.valid);
    if (validationError) {
      setError(tc(validationError.message, validationError.params));
      return;
    }

    setSubmitting(true);
    try {
      const body = {
        supplierId,
        originalBillId: originalBillId || null,
        branchId: branchId || null,
        issueDate: `${issueDate}T00:00:00.000Z`,
        currency: documentCurrency,
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

      router.push(returnTo || `/purchases/debit-notes/${debitNote.id}`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : tc("Unable to save debit note."));
    } finally {
      setSubmitting(false);
    }
  }

  if (initialDebitNote && initialDebitNote.status !== "DRAFT") {
    return (
      <div className="space-y-4">
        <StatusMessage type="error">{tc("Only draft debit notes can be edited.")}</StatusMessage>
        <Link href={`/purchases/debit-notes/${initialDebitNote.id}`} className="inline-flex rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          {tc("Back to debit note")}
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <label className="block md:col-span-2">
            <span className="text-sm font-medium text-slate-700">{tc("Supplier")}</span>
            <select value={supplierId} onChange={(event) => setSupplierId(event.target.value)} required className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm">
              <option value="">{tc("Select supplier")}</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.displayName ?? supplier.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">{tc("Issue date")}</span>
            <input type="date" value={issueDate} onChange={(event) => setIssueDate(event.target.value)} required className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">{tc("Branch")}</span>
            <select value={branchId} onChange={(event) => setBranchId(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm">
              <option value="">{tc("No branch")}</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.displayName ?? branch.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block md:col-span-2">
            <span className="text-sm font-medium text-slate-700">{tc("Original bill")}</span>
            <select value={originalBillId} onChange={(event) => setOriginalBillId(event.target.value)} disabled={!supplierId} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm disabled:bg-slate-50">
              <option value="">{tc("Standalone debit note")}</option>
              {supplierBills.map((bill) => (
                <option key={bill.id} value={bill.id}>
                  {tc("{number} - {amount}", { number: bill.billNumber, amount: formatAppMoney(bill.total, bill.currency, locale) })}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">{tc("Reason")}</span>
            <input value={reason} onChange={(event) => setReason(event.target.value)} placeholder={tc("Return, overcharge, supplier credit")} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">{tc("Notes")}</span>
            <input value={notes} onChange={(event) => setNotes(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
          </label>
        </div>
        {selectedOriginalBill ? (
          <p className="mt-3 text-xs text-steel">
            {tc("Linked to bill {number}. Debit note total is validated against the original bill total.", { number: selectedOriginalBill.billNumber })}
          </p>
        ) : null}
      </div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">{tc("Log in and select an organization before creating debit notes.")}</StatusMessage> : null}
        {currencyMismatch ? <StatusMessage type="error">{tc("This draft currency does not match the organization base currency. It will not be rewritten automatically.")}</StatusMessage> : null}
        {sourceSelectionMissing ? <StatusMessage type="error">{tc("The selected original bill is not available in the active organization.")}</StatusMessage> : null}
        {sourceCurrencyMismatch ? <StatusMessage type="error">{tc("The linked bill currency does not match this debit note. Foreign-currency debit notes remain disabled in this phase.")}</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">{tc("Loading debit note setup data...")}</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
      </div>

      <div className="overflow-x-auto rounded-md border border-slate-200 bg-white shadow-panel">
        <div className="grid min-w-[1120px] grid-cols-[1fr_1.2fr_1fr_0.55fr_0.65fr_0.55fr_0.8fr_0.7fr_0.45fr] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-steel">
          <div>{tc("Item")}</div>
          <div>{tc("Description")}</div>
          <div>{tc("Purchase account")}</div>
          <div>{tc("Qty")}</div>
          <div>{tc("Price")}</div>
          <div>{tc("Discount %")}</div>
          <div>{tc("Tax")}</div>
          <div>{tc("Total")}</div>
          <div></div>
        </div>
        {lines.map((line, index) => {
          const previewLine = preview.lines[index];
          return (
            <div key={line.id} className="grid min-w-[1120px] grid-cols-[1fr_1.2fr_1fr_0.55fr_0.65fr_0.55fr_0.8fr_0.7fr_0.45fr] gap-3 border-b border-slate-100 px-4 py-3">
              <select value={line.itemId} onChange={(event) => selectItem(line.id, event.target.value)} className="rounded-md border border-slate-300 px-2 py-2 text-sm">
                <option value="">{tc("No item")}</option>
                {activeItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.sku ? `${item.sku} - ${item.name}` : item.name}
                  </option>
                ))}
              </select>
              <input value={line.description} onChange={(event) => updateLine(line.id, { description: event.target.value })} required className="rounded-md border border-slate-300 px-2 py-2 text-sm" />
              <select value={line.accountId} onChange={(event) => updateLine(line.id, { accountId: event.target.value })} required className="rounded-md border border-slate-300 px-2 py-2 text-sm">
                <option value="">{tc("Select account")}</option>
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
                <option value="">{tc("No tax")}</option>
                {activePurchaseTaxRates.map((taxRate) => (
                  <option key={taxRate.id} value={taxRate.id}>
                    {taxRate.name}
                  </option>
                ))}
              </select>
              <div className="flex items-center font-mono text-xs text-ink">{documentCurrency ? (previewLine ? formatAppMoney(previewLine.lineTotalUnits, documentCurrency, locale) : formatAppMoney("0.0000", documentCurrency, locale)) : "-"}</div>
              <button type="button" onClick={() => removeLine(line.id)} disabled={lines.length <= 1} className="rounded-md border border-slate-300 px-2 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300">
                {tc("Remove")}
              </button>
            </div>
          );
        })}
        <div className="flex min-w-[1120px] items-center justify-between px-4 py-3 text-sm">
          <button type="button" onClick={() => setLines((current) => [...current, makeLine()])} className="rounded-md border border-slate-300 px-3 py-2 font-medium text-slate-700 hover:bg-slate-50">
            {tc("Add line")}
          </button>
          <div className="grid min-w-72 grid-cols-2 gap-2 text-end">
            <span className="text-steel">{tc("Subtotal")}</span>
            <span className="font-mono">{documentCurrency ? formatAppMoney(preview.subtotal, documentCurrency, locale) : "-"}</span>
            <span className="text-steel">{tc("Discount")}</span>
            <span className="font-mono">{documentCurrency ? formatAppMoney(preview.discountTotal, documentCurrency, locale) : "-"}</span>
            <span className="text-steel">{tc("Taxable")}</span>
            <span className="font-mono">{documentCurrency ? formatAppMoney(preview.taxableTotal, documentCurrency, locale) : "-"}</span>
            <span className="text-steel">{tc("VAT")}</span>
            <span className="font-mono">{documentCurrency ? formatAppMoney(preview.taxTotal, documentCurrency, locale) : "-"}</span>
            <span className="font-semibold text-ink">{tc("Total debit")}</span>
            <span className="font-mono font-semibold text-ink">{documentCurrency ? formatAppMoney(preview.total, documentCurrency, locale) : "-"}</span>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button type="submit" disabled={!organizationId || !documentCurrency || currencyMismatch || sourceSelectionMissing || sourceCurrencyMismatch || loading || submitting || !preview.valid} className="rounded-md bg-palm px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400">
          {submitting ? tc("Saving...") : initialDebitNote ? tc("Save draft debit note") : tc("Create draft debit note")}
        </button>
        <Link href={returnTo || "/purchases/debit-notes"} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          {tc("Cancel")}
        </Link>
      </div>
    </form>
  );
}

function getValidationError(supplierId: string, lines: PurchaseDebitNoteLineState[], previewValid: boolean): FormValidationError | null {
  if (!supplierId) {
    return { message: "Choose a supplier." };
  }

  for (const [index, line] of lines.entries()) {
    if (!line.description.trim()) {
      return { message: "Line {number} needs a description.", params: { number: index + 1 } };
    }

    if (!line.accountId) {
      return { message: "Line {number} needs a purchase account.", params: { number: index + 1 } };
    }
  }

  return previewValid ? null : { message: "Debit note lines need positive quantities, non-negative prices and tax, and discounts between 0% and 100%." };
}
