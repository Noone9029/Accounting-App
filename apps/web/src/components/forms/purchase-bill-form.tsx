"use client";

import { useRouter } from "next/navigation";
import { PlusIcon, SaveIcon } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import {
  LedgerActionBar,
  LedgerAlert,
  LedgerButton,
  LedgerFieldHelp,
  LedgerFieldLabel,
  LedgerFieldText,
  LedgerFormSection,
  LedgerInput,
  LedgerMoney,
  LedgerPanel,
  LedgerSelect,
  LedgerSummaryBand,
} from "@/components/ui/ledger-system";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { getLedgerByteEdition } from "@/lib/edition";
import { calculateInvoicePreview, formatMoneyAmount } from "@/lib/money";
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
  const edition = getLedgerByteEdition();
  const organizationId = useActiveOrganizationId();
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
          setError(loadError instanceof Error ? loadError.message : "Unable to load purchase bill setup data.");
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
        billDate: `${billDate}T00:00:00.000Z`,
        dueDate: dueDate ? `${dueDate}T00:00:00.000Z` : null,
        currency: edition.defaultCurrency,
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
      setError(submitError instanceof Error ? submitError.message : "Unable to save purchase bill.");
    } finally {
      setSubmitting(false);
    }
  }

  if (initialBill && initialBill.status !== "DRAFT") {
    return (
      <LedgerPanel>
        <LedgerAlert tone="danger">Only draft purchase bills can be edited.</LedgerAlert>
        <LedgerButton href={`/purchases/bills/${initialBill.id}`} className="mt-4">
          Back to bill
        </LedgerButton>
      </LedgerPanel>
    );
  }

  return (
    <form onSubmit={onSubmit} className="min-w-0 space-y-5">
      <LedgerFormSection
        className="min-w-0"
        title="Bill details"
        description="Draft supplier bill fields are captured before any AP posting or finalization workflow."
      >
        <LedgerFieldLabel>
          <LedgerFieldText>Supplier</LedgerFieldText>
          <LedgerSelect value={supplierId} onChange={(event) => setSupplierId(event.target.value)} required>
            <option value="">Select supplier</option>
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.displayName ?? supplier.name}
              </option>
            ))}
          </LedgerSelect>
        </LedgerFieldLabel>
        <LedgerFieldLabel>
          <LedgerFieldText>Bill date</LedgerFieldText>
          <LedgerInput type="date" value={billDate} onChange={(event) => setBillDate(event.target.value)} required />
        </LedgerFieldLabel>
        <LedgerFieldLabel>
          <LedgerFieldText>Due date</LedgerFieldText>
          <LedgerInput type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
        </LedgerFieldLabel>
        <LedgerFieldLabel>
          <LedgerFieldText>Currency</LedgerFieldText>
          <LedgerInput value={edition.defaultCurrency} readOnly aria-label="Currency" className="bg-slate-50 text-slate-700" />
          <LedgerFieldHelp>Default {edition.marketLabel} workspace currency.</LedgerFieldHelp>
        </LedgerFieldLabel>
        <LedgerFieldLabel>
          <LedgerFieldText>Branch</LedgerFieldText>
          <LedgerSelect value={branchId} onChange={(event) => setBranchId(event.target.value)}>
            <option value="">No branch</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.displayName ?? branch.name}
              </option>
            ))}
          </LedgerSelect>
        </LedgerFieldLabel>
        <LedgerFieldLabel>
          <LedgerFieldText>Terms</LedgerFieldText>
          <LedgerInput value={terms} onChange={(event) => setTerms(event.target.value)} />
        </LedgerFieldLabel>
        <LedgerFieldLabel>
          <LedgerFieldText>Notes</LedgerFieldText>
          <LedgerInput value={notes} onChange={(event) => setNotes(event.target.value)} />
        </LedgerFieldLabel>
        <LedgerFieldLabel>
          <LedgerFieldText>Inventory posting mode</LedgerFieldText>
          <LedgerSelect value={inventoryPostingMode} onChange={(event) => setInventoryPostingMode(event.target.value as PurchaseBillInventoryPostingMode)}>
            <option value="DIRECT_EXPENSE_OR_ASSET">{purchaseBillInventoryPostingModeLabel("DIRECT_EXPENSE_OR_ASSET")}</option>
            <option value="INVENTORY_CLEARING">{purchaseBillInventoryPostingModeLabel("INVENTORY_CLEARING")}</option>
          </LedgerSelect>
        </LedgerFieldLabel>
        {inventoryPostingMode === "INVENTORY_CLEARING" ? (
          <div className="md:col-span-2">
            <LedgerAlert tone="warning">
            <ul className="flex flex-col gap-1">
              <li>{purchaseBillInventoryClearingModeWarning()}</li>
              <li>{purchaseBillAccountantReviewWarning()}</li>
            </ul>
            </LedgerAlert>
          </div>
        ) : null}
      </LedgerFormSection>

      <LedgerPanel>
        <h2 className="text-base font-semibold text-ink">VAT readiness</h2>
        <p className="mt-1 text-sm leading-6 text-steel">Local VAT and accounting review only. No tax-authority submission or provider reporting is enabled.</p>
        <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
          <LedgerSummaryBand tone={supplierId && lines.length > 0 ? "success" : "info"}>Supplier, bill date, due date, expense/account coding, and VAT handling stay in the draft AP workflow.</LedgerSummaryBand>
          <LedgerSummaryBand tone={inventoryPostingMode === "INVENTORY_CLEARING" ? "warning" : "success"}>Inventory clearing mode keeps the existing accountant-review warning and does not post stock automation.</LedgerSummaryBand>
          <LedgerSummaryBand tone="warning">No provider integration, tax-authority reporting, or certification claim is made here.</LedgerSummaryBand>
        </div>
      </LedgerPanel>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <LedgerPanel className="min-w-0">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-ink">Bill line items</h2>
              <p className="mt-1 text-sm leading-6 text-steel">Line entries keep existing item, purchase account, discount, tax, and preview totals behavior.</p>
            </div>
            <LedgerButton type="button" onClick={() => setLines((current) => [...current, makeLine()])} icon={PlusIcon}>
              Add line
            </LedgerButton>
          </div>
          <div className="overflow-x-auto rounded-md border border-line">
            <div style={{ minWidth: "980px" }}>
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
                  <tr>
                    <th className="px-3 py-2">Item</th>
                    <th className="px-3 py-2">Description</th>
                    <th className="px-3 py-2">Account</th>
                    <th className="px-3 py-2">Qty</th>
                    <th className="px-3 py-2">Unit price</th>
                    <th className="px-3 py-2">Discount %</th>
                    <th className="px-3 py-2">Tax</th>
                    <th className="px-3 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                {lines.map((line) => (
                  <tr key={line.id}>
                    <td className="px-3 py-2">
                      <LedgerSelect value={line.itemId} onChange={(event) => selectItem(line.id, event.target.value)} className="w-48">
                        <option value="">No item</option>
                        {activeItems.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name}
                          </option>
                        ))}
                      </LedgerSelect>
                    </td>
                    <td className="px-3 py-2">
                      <LedgerInput value={line.description} onChange={(event) => updateLine(line.id, { description: event.target.value })} required className="w-64" />
                    </td>
                    <td className="px-3 py-2">
                      <LedgerSelect value={line.accountId} onChange={(event) => updateLine(line.id, { accountId: event.target.value })} required className="w-56">
                        <option value="">Select account</option>
                        {postingPurchaseAccounts.map((account) => (
                          <option key={account.id} value={account.id}>
                            {account.code} {account.name}
                          </option>
                        ))}
                      </LedgerSelect>
                    </td>
                    <td className="px-3 py-2">
                      <LedgerInput inputMode="decimal" value={line.quantity} onChange={(event) => updateLine(line.id, { quantity: event.target.value })} required className="w-24" />
                    </td>
                    <td className="px-3 py-2">
                      <LedgerInput inputMode="decimal" value={line.unitPrice} onChange={(event) => updateLine(line.id, { unitPrice: event.target.value })} required className="w-28" />
                    </td>
                    <td className="px-3 py-2">
                      <LedgerInput inputMode="decimal" value={line.discountRate} onChange={(event) => updateLine(line.id, { discountRate: event.target.value })} className="w-24" />
                    </td>
                    <td className="px-3 py-2">
                      <LedgerSelect value={line.taxRateId} onChange={(event) => updateLine(line.id, { taxRateId: event.target.value })} className="w-48">
                        <option value="">No tax</option>
                        {activePurchaseTaxRates.map((taxRate) => (
                          <option key={taxRate.id} value={taxRate.id}>
                            {taxRate.name} ({taxRate.rate}%)
                          </option>
                        ))}
                      </LedgerSelect>
                    </td>
                    <td className="px-3 py-2">
                      <LedgerButton type="button" size="sm" onClick={() => removeLine(line.id)}>
                        Remove
                      </LedgerButton>
                    </td>
                  </tr>
                ))}
                </tbody>
              </table>
            </div>
          </div>
        </LedgerPanel>

        <LedgerPanel className="min-w-0">
          <h2 className="text-base font-semibold text-ink">Transaction summary</h2>
          <div className="mt-4 space-y-2 text-sm">
            <TotalRow label="Subtotal" value={formatMoneyAmount(preview.subtotal, edition.defaultCurrency)} />
            <TotalRow label="Discount" value={formatMoneyAmount(preview.discountTotal, edition.defaultCurrency)} />
            <TotalRow label="Taxable" value={formatMoneyAmount(preview.taxableTotal, edition.defaultCurrency)} />
            <TotalRow label="VAT / Tax" value={formatMoneyAmount(preview.taxTotal, edition.defaultCurrency)} />
            <TotalRow label="Total" value={formatMoneyAmount(preview.total, edition.defaultCurrency)} strong />
          </div>
        </LedgerPanel>
      </div>

      <div className="flex flex-col gap-3">
        {!organizationId ? <StatusMessage type="info">Log in and select an organization to create purchase bills.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading purchase bill setup data...</StatusMessage> : null}
        {error ? <LedgerAlert tone="danger">{error}</LedgerAlert> : null}
        {!preview.valid ? <LedgerAlert tone="info">Every bill line needs a positive quantity, non-negative unit price, valid discount, and a posting account.</LedgerAlert> : null}
      </div>

      <LedgerActionBar className="justify-end">
        <LedgerButton href={returnTo || "/purchases/bills"}>
          Cancel
        </LedgerButton>
        <LedgerButton type="submit" disabled={submitting || !organizationId} variant="primary" icon={SaveIcon}>
          {submitting ? "Saving..." : initialBill ? "Save changes" : "Save draft"}
        </LedgerButton>
      </LedgerActionBar>
    </form>
  );
}

function TotalRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between gap-4 ${strong ? "font-semibold text-ink" : "text-steel"}`}>
      <span>{label}</span>
      <LedgerMoney>{value}</LedgerMoney>
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
