"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useAppLocale } from "@/components/app-locale-provider";
import { StatusMessage } from "@/components/common/status-message";
import { DocumentCurrencyFields } from "@/components/forms/document-currency-fields";
import { ComplianceReadinessPanel, PanelSection, StatusBadge } from "@/components/ui-ledger";
import { useActiveOrganization } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { getLedgerByteEdition } from "@/lib/edition";
import { formatAppMoney } from "@/lib/app-i18n";
import { calculateInvoicePreview } from "@/lib/money";
import { DocumentFxFormValue, documentFxIsComplete } from "@/lib/document-fx";
import { safeReturnToFromSearch } from "@/lib/parties";
import { purchaseBillAccountantReviewWarning, purchaseBillInventoryClearingModeWarning, purchaseBillInventoryPostingModeLabel } from "@/lib/purchase-bills";
import type { Account, Branch, Contact, Item, PurchaseBill, PurchaseBillInventoryPostingMode, TaxRate } from "@/lib/types";

interface PurchaseBillLineState {
  id: string;
  itemId: string;
  description: string;
  accountId: string;
  quantity: string;
  unitPrice: string;
  discountRate: string;
  taxRateId: string;
}

interface PurchaseBillFormProps {
  initialBill?: PurchaseBill;
  initialSupplierId?: string;
}

function makeLine(): PurchaseBillLineState {
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

export function PurchaseBillForm({ initialBill, initialSupplierId = "" }: PurchaseBillFormProps) {
  const router = useRouter();
  const activeOrganization = useActiveOrganization();
  const organizationId = activeOrganization?.id ?? null;
  const baseCurrency = activeOrganization?.baseCurrency ?? null;
  const initialUsesBaseCurrency = Boolean(initialBill && baseCurrency && initialBill.currency === baseCurrency);
  const edition = getLedgerByteEdition();
  const { locale, tc } = useAppLocale();
  const [suppliers, setSuppliers] = useState<Contact[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [taxRates, setTaxRates] = useState<TaxRate[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [supplierId, setSupplierId] = useState(initialBill?.supplierId ?? initialSupplierId);
  const [branchId, setBranchId] = useState(initialBill?.branchId ?? "");
  const [billDate, setBillDate] = useState(dateInputValue(initialBill?.billDate));
  const [dueDate, setDueDate] = useState(dateInputValue(initialBill?.dueDate, ""));
  const [notes, setNotes] = useState(initialBill?.notes ?? "");
  const [terms, setTerms] = useState(initialBill?.terms ?? "");
  const [inventoryPostingMode, setInventoryPostingMode] = useState<PurchaseBillInventoryPostingMode>(
    initialBill?.inventoryPostingMode ?? "DIRECT_EXPENSE_OR_ASSET",
  );
  const [lines, setLines] = useState<PurchaseBillLineState[]>(
    initialBill?.lines?.map((line) => ({
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
  const [fx, setFx] = useState<DocumentFxFormValue>(() => ({
    currency: initialBill?.currency ?? "",
    exchangeRate: initialBill?.exchangeRate ?? (initialUsesBaseCurrency || !initialBill ? "1" : ""),
    rateDate: initialBill?.rateDate ? dateInputValue(initialBill.rateDate) : initialUsesBaseCurrency || !initialBill ? todayInputValue() : "",
    rateSource: initialBill?.rateSource === "IMPORT" ? "IMPORT" : initialBill?.rateSource === "MANUAL" ? "MANUAL" : initialUsesBaseCurrency || !initialBill ? "SYSTEM_RATE_1" : "MANUAL",
    rateSnapshotId: initialBill?.rateSnapshotId ?? null,
  }));
  const documentCurrency = fx.currency;

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
    if (!initialBill && baseCurrency && !fx.currency) {
      setFx({ currency: baseCurrency, exchangeRate: "1", rateDate: todayInputValue(), rateSource: "SYSTEM_RATE_1", rateSnapshotId: null });
    }
  }, [baseCurrency, fx.currency, initialBill]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const query = new URLSearchParams(window.location.search);
    setReturnTo(safeReturnToFromSearch(window.location.search));

    if (!initialBill && !initialSupplierId) {
      const querySupplierId = query.get("supplierId") ?? "";
      if (querySupplierId) {
        setSupplierId(querySupplierId);
      }
    }
  }, [initialBill, initialSupplierId]);

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
          setError(loadError instanceof Error ? loadError.message : tc("Unable to load purchase bill setup data."));
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
  }, [organizationId, tc]);

  function updateLine(lineId: string, patch: Partial<PurchaseBillLineState>) {
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
      setError(tc("Select an organization with a base currency before saving this purchase bill."));
      return;
    }
    if (!baseCurrency || !documentFxIsComplete(fx, baseCurrency)) {
      setError(tc("Complete the document currency and exchange-rate context before saving this purchase bill."));
      return;
    }

    const validationError = getValidationError(supplierId, lines, preview.valid);
    if (validationError) {
      setError(tc(validationError));
      return;
    }

    setSubmitting(true);
    try {
      const body = {
        supplierId,
        branchId: branchId || null,
        billDate: `${billDate}T00:00:00.000Z`,
        dueDate: dueDate ? `${dueDate}T00:00:00.000Z` : null,
        currency: documentCurrency,
        exchangeRate: fx.exchangeRate,
        rateDate: fx.rateDate,
        rateSource: fx.rateSource,
        rateSnapshotId: fx.rateSnapshotId,
        notes: notes || undefined,
        terms: terms || undefined,
        inventoryPostingMode,
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

      const bill = initialBill
        ? await apiRequest<PurchaseBill>(`/purchase-bills/${initialBill.id}`, { method: "PATCH", body })
        : await apiRequest<PurchaseBill>("/purchase-bills", { method: "POST", body });

      router.push(returnTo || `/purchases/bills/${bill.id}`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : tc("Unable to save purchase bill."));
    } finally {
      setSubmitting(false);
    }
  }

  if (initialBill && initialBill.status !== "DRAFT") {
    return (
      <div className="space-y-4">
        <StatusMessage type="error">{tc("Only draft purchase bills can be edited.")}</StatusMessage>
        <Link href={`/purchases/bills/${initialBill.id}`} className="inline-flex rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          {tc("Back to bill")}
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
        <h2 className="mb-4 text-base font-semibold text-ink">{tc("Bill details")}</h2>
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
            <span className="text-sm font-medium text-slate-700">{tc("Bill date")}</span>
            <input type="date" value={billDate} onChange={(event) => setBillDate(event.target.value)} required className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">{tc("Due date")}</span>
            <input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
          </label>
          <label className="block md:col-span-2">
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
          {baseCurrency ? <DocumentCurrencyFields baseCurrency={baseCurrency} value={fx} transactionTotal={preview.total} onChange={setFx} disabled={submitting} /> : null}
          <label className="block">
            <span className="text-sm font-medium text-slate-700">{tc("Terms")}</span>
            <input value={terms} onChange={(event) => setTerms(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">{tc("Notes")}</span>
            <input value={notes} onChange={(event) => setNotes(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
          </label>
          <label className="block md:col-span-2">
            <span className="text-sm font-medium text-slate-700">{tc("Inventory posting mode")}</span>
            <select
              value={inventoryPostingMode}
              onChange={(event) => setInventoryPostingMode(event.target.value as PurchaseBillInventoryPostingMode)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm"
            >
              <option value="DIRECT_EXPENSE_OR_ASSET">{tc(purchaseBillInventoryPostingModeLabel("DIRECT_EXPENSE_OR_ASSET"))}</option>
              <option value="INVENTORY_CLEARING">{tc(purchaseBillInventoryPostingModeLabel("INVENTORY_CLEARING"))}</option>
            </select>
          </label>
        </div>
        {inventoryPostingMode === "INVENTORY_CLEARING" ? (
          <div className="mt-4 rounded-md bg-amber-50 p-3 text-sm text-amber-900">
            <ul className="space-y-1">
              <li>{tc(purchaseBillInventoryClearingModeWarning())}</li>
              <li>{tc(purchaseBillAccountantReviewWarning())}</li>
            </ul>
          </div>
        ) : null}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_24rem]">
        <PanelSection
          title={tc("Purchase bill workflow")}
          description={tc("Capture supplier cost, code each line to the right expense or asset account, then finalize only after accountant review.")}
          action={<StatusBadge tone="draft">{tc("Draft / finalize")}</StatusBadge>}
        >
          <div className="grid gap-3 text-sm text-steel md:grid-cols-3">
            <div>
              <div className="font-semibold text-ink">{tc("Supplier invoice reference")}</div>
              <p className="mt-1 text-xs leading-5">{tc("Keep the supplier document reference in notes or terms until the dedicated backend field is available.")}</p>
            </div>
            <div>
              <div className="font-semibold text-ink">{tc("Expense coding")}</div>
              <p className="mt-1 text-xs leading-5">{tc("Each line requires a posting expense, cost of sales, or asset account.")}</p>
            </div>
            <div>
              <div className="font-semibold text-ink">{tc("Attachments")}</div>
              <p className="mt-1 text-xs leading-5">{tc("Attach source PDFs or scans from the bill detail page after saving the draft.")}</p>
            </div>
          </div>
        </PanelSection>
        <ComplianceReadinessPanel
          title={tc("VAT readiness")}
          status={tc("Controlled beta")}
          checks={[
            { label: tc("Supplier and dates"), status: supplierId && billDate ? "pass" : "pending", detail: tc("Supplier, bill date, due date, branch, and currency stay explicit.") },
            { label: tc("VAT handling"), status: lines.some((line) => line.taxRateId) ? "pass" : "warning", detail: tc("Purchase VAT rates are visible per line and should match the supplier document.") },
            { label: tc(edition.showsUaeEinvoicing ? "No FTA reporting yet" : "No authority submission"), status: "warning", detail: tc("This screen records a purchase bill only. It does not file VAT or submit to a provider.") },
          ]}
        />
      </div>

      <div className="overflow-x-auto rounded-md border border-slate-200 bg-white shadow-panel">
        <h2 className="px-4 py-3 text-base font-semibold text-ink">{tc("Bill line items")}</h2>
        <table className="w-full min-w-[980px] text-start text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
            <tr>
              <th className="px-4 py-3">{tc("Item")}</th>
              <th className="px-4 py-3">{tc("Description")}</th>
              <th className="px-4 py-3">{tc("Account")}</th>
              <th className="px-4 py-3">{tc("Qty")}</th>
              <th className="px-4 py-3">{tc("Unit price")}</th>
              <th className="px-4 py-3">{tc("Discount %")}</th>
              <th className="px-4 py-3">{tc("Tax")}</th>
              <th className="px-4 py-3">{tc("Actions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {lines.map((line, index) => (
              <tr key={line.id}>
                <td className="px-4 py-3">
                  <select aria-label={`Item for bill line ${index + 1}`} value={line.itemId} onChange={(event) => selectItem(line.id, event.target.value)} className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm outline-none focus:border-palm">
                    <option value="">{tc("No item")}</option>
                    {activeItems.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <input aria-label={`Description for bill line ${index + 1}`} value={line.description} onChange={(event) => updateLine(line.id, { description: event.target.value })} required className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm outline-none focus:border-palm" />
                </td>
                <td className="px-4 py-3">
                  <select aria-label={`Purchase account for bill line ${index + 1}`} value={line.accountId} onChange={(event) => updateLine(line.id, { accountId: event.target.value })} required className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm outline-none focus:border-palm">
                    <option value="">{tc("Select account")}</option>
                    {postingPurchaseAccounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.code} {account.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <input aria-label={`Quantity for bill line ${index + 1}`} inputMode="decimal" value={line.quantity} onChange={(event) => updateLine(line.id, { quantity: event.target.value })} required className="w-24 rounded-md border border-slate-300 px-2 py-1 text-sm outline-none focus:border-palm" />
                </td>
                <td className="px-4 py-3">
                  <input aria-label={`Unit price for bill line ${index + 1}`} inputMode="decimal" value={line.unitPrice} onChange={(event) => updateLine(line.id, { unitPrice: event.target.value })} required className="w-28 rounded-md border border-slate-300 px-2 py-1 text-sm outline-none focus:border-palm" />
                </td>
                <td className="px-4 py-3">
                  <input aria-label={`Discount rate for bill line ${index + 1}`} inputMode="decimal" value={line.discountRate} onChange={(event) => updateLine(line.id, { discountRate: event.target.value })} className="w-24 rounded-md border border-slate-300 px-2 py-1 text-sm outline-none focus:border-palm" />
                </td>
                <td className="px-4 py-3">
                  <select aria-label={`Tax rate for bill line ${index + 1}`} value={line.taxRateId} onChange={(event) => updateLine(line.id, { taxRateId: event.target.value })} className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm outline-none focus:border-palm">
                    <option value="">{tc("No tax")}</option>
                    {activePurchaseTaxRates.map((taxRate) => (
                      <option key={taxRate.id} value={taxRate.id}>
                        {taxRate.name} ({taxRate.rate}%)
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <button type="button" onClick={() => removeLine(line.id)} disabled={lines.length <= 1} className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400">
                    {tc("Remove")}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4 rounded-md border border-slate-200 bg-white p-5 shadow-panel">
        <button type="button" onClick={() => setLines((current) => [...current, makeLine()])} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          {tc("Add line")}
        </button>
        <div className="min-w-[260px] space-y-2 text-sm">
          <h2 className="text-base font-semibold text-ink">{tc("Transaction summary")}</h2>
          <TotalRow label="Subtotal" value={documentCurrency ? formatAppMoney(preview.subtotal, documentCurrency, locale) : "-"} />
          <TotalRow label="Discount" value={documentCurrency ? formatAppMoney(preview.discountTotal, documentCurrency, locale) : "-"} />
          <TotalRow label="Taxable" value={documentCurrency ? formatAppMoney(preview.taxableTotal, documentCurrency, locale) : "-"} />
          <TotalRow label="VAT / Tax" value={documentCurrency ? formatAppMoney(preview.taxTotal, documentCurrency, locale) : "-"} />
          <TotalRow label="Total" value={documentCurrency ? formatAppMoney(preview.total, documentCurrency, locale) : "-"} strong />
        </div>
      </div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">{tc("Log in and select an organization to create purchase bills.")}</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">{tc("Loading purchase bill setup data...")}</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {!preview.valid ? <StatusMessage type="info">{tc("Every bill line needs a positive quantity, non-negative unit price, valid discount, and a posting account.")}</StatusMessage> : null}
      </div>

      <div className="flex justify-end gap-3">
        <Link href={returnTo || "/purchases/bills"} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          {tc("Cancel")}
        </Link>
        <button type="submit" disabled={submitting || !organizationId || !baseCurrency || !documentFxIsComplete(fx, baseCurrency)} className="ledger-focus rounded-md bg-palm px-4 py-2 text-sm font-semibold text-white hover:bg-palm-dark disabled:cursor-not-allowed disabled:bg-slate-400">
          {submitting ? tc("Saving...") : initialBill ? tc("Save changes") : tc("Save draft")}
        </button>
      </div>
    </form>
  );
}

function TotalRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  const { tc } = useAppLocale();
  return (
    <div className={`flex justify-between gap-4 ${strong ? "font-semibold text-ink" : "text-steel"}`}>
      <span>{tc(label)}</span>
      <span className="font-mono text-xs">{value}</span>
    </div>
  );
}

function getValidationError(supplierId: string, lines: PurchaseBillLineState[], totalsValid: boolean): string {
  if (!supplierId) {
    return "Select a supplier.";
  }
  if (!totalsValid) {
    return "Fix purchase bill line amounts before saving.";
  }
  if (lines.some((line) => !line.description.trim() || !line.accountId)) {
    return "Each purchase bill line needs a description and account.";
  }
  return "";
}
