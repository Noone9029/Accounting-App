"use client";

import { useRouter } from "next/navigation";
import { PlusIcon, SaveIcon } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  LedgerActionBar,
  LedgerAlert,
  LedgerButton,
  LedgerDataTable,
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
import { calculateInvoicePreview, formatMoneyAmount } from "@/lib/money";
import { safeReturnToFromSearch } from "@/lib/parties";
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
    if (!initialOrder) {
      const querySupplierId = query.get("supplierId") ?? "";
      if (querySupplierId) {
        setSupplierId(querySupplierId);
      }
    }
    setReturnTo(safeReturnToFromSearch(window.location.search));
  }, [initialOrder]);

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

      router.push(returnTo || `/purchases/purchase-orders/${order.id}`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to save purchase order.");
    } finally {
      setSubmitting(false);
    }
  }

  if (initialOrder && initialOrder.status !== "DRAFT") {
    return (
      <LedgerPanel>
        <LedgerAlert tone="danger">Only draft purchase orders can be edited.</LedgerAlert>
        <LedgerButton href={`/purchases/purchase-orders/${initialOrder.id}`} className="mt-4">
          Back to purchase order
        </LedgerButton>
      </LedgerPanel>
    );
  }

  return (
    <form onSubmit={onSubmit} className="min-w-0 space-y-5">
      <LedgerFormSection
        className="min-w-0"
        title="Order details"
        description="Draft supplier order fields are captured before approval, receiving, or conversion to a bill."
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
          <LedgerFieldText>Order date</LedgerFieldText>
          <LedgerInput type="date" value={orderDate} onChange={(event) => setOrderDate(event.target.value)} required />
        </LedgerFieldLabel>
        <LedgerFieldLabel>
          <LedgerFieldText>Expected delivery</LedgerFieldText>
          <LedgerInput type="date" value={expectedDeliveryDate} onChange={(event) => setExpectedDeliveryDate(event.target.value)} />
        </LedgerFieldLabel>
        <LedgerFieldLabel>
          <LedgerFieldText>Currency</LedgerFieldText>
          <LedgerInput value="SAR" readOnly aria-label="Currency" className="bg-slate-50 text-slate-700" />
          <LedgerFieldHelp>Purchase orders currently save with the existing SAR currency behavior.</LedgerFieldHelp>
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
      </LedgerFormSection>

      <LedgerPanel>
        <h2 className="text-base font-semibold text-ink">Purchase order boundaries</h2>
        <p className="mt-1 text-sm leading-6 text-steel">Purchase orders keep supplier intent and line coding ready for review, then convert explicitly into draft purchase bills.</p>
        <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
          <LedgerSummaryBand tone={supplierId && lines.length > 0 ? "success" : "info"}>Supplier, dates, terms, item selection, and purchase coding stay in the draft PO workflow.</LedgerSummaryBand>
          <LedgerSummaryBand tone="warning">Accounts are optional on the PO, but every line needs an account or item expense account before conversion to a bill.</LedgerSummaryBand>
          <LedgerSummaryBand tone="warning">No AP posting, inventory movement, payment sending, or tax-authority submission happens from this form.</LedgerSummaryBand>
        </div>
      </LedgerPanel>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <LedgerPanel className="min-w-0">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-ink">Order line items</h2>
              <p className="mt-1 text-sm leading-6 text-steel">Line entries keep existing item, account, discount, tax, and preview totals behavior.</p>
            </div>
            <LedgerButton type="button" onClick={() => setLines((current) => [...current, makeLine()])} icon={PlusIcon}>
              Add line
            </LedgerButton>
          </div>
          <LedgerDataTable minWidth="980px" className="shadow-none">
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
                        <LedgerSelect value={line.accountId} onChange={(event) => updateLine(line.id, { accountId: event.target.value })} className="w-56">
                          <option value="">No account yet</option>
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
          </LedgerDataTable>
        </LedgerPanel>

        <LedgerPanel className="min-w-0">
          <h2 className="text-base font-semibold text-ink">Order summary</h2>
          <div className="mt-4 space-y-2 text-sm">
            <TotalRow label="Subtotal" value={formatMoneyAmount(preview.subtotal)} />
            <TotalRow label="Discount" value={formatMoneyAmount(preview.discountTotal)} />
            <TotalRow label="Taxable" value={formatMoneyAmount(preview.taxableTotal)} />
            <TotalRow label="VAT / Tax" value={formatMoneyAmount(preview.taxTotal)} />
            <TotalRow label="Total" value={formatMoneyAmount(preview.total)} strong />
          </div>
        </LedgerPanel>
      </div>

      <div className="flex flex-col gap-3">
        {!organizationId ? <LedgerAlert tone="info">Log in and select an organization to create purchase orders.</LedgerAlert> : null}
        {loading ? <LedgerAlert tone="info">Loading purchase order setup data...</LedgerAlert> : null}
        {error ? <LedgerAlert tone="danger">{error}</LedgerAlert> : null}
        {!preview.valid ? <LedgerAlert tone="info">Every purchase order line needs a positive quantity, non-negative unit price, and valid discount.</LedgerAlert> : null}
      </div>

      <LedgerActionBar className="justify-end">
        <LedgerButton href={returnTo || "/purchases/purchase-orders"}>
          Cancel
        </LedgerButton>
        <LedgerButton type="submit" disabled={submitting || !organizationId} variant="primary" icon={SaveIcon}>
          {submitting ? "Saving..." : initialOrder ? "Save changes" : "Save draft"}
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
