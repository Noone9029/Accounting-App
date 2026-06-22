"use client";

import { useRouter } from "next/navigation";
import { PlusIcon } from "lucide-react";
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
} from "@/components/ui/ledger-system";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { calculateInvoicePreview, formatMoneyAmount } from "@/lib/money";
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

      router.push(returnTo || `/purchases/debit-notes/${debitNote.id}`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to save debit note.");
    } finally {
      setSubmitting(false);
    }
  }

  if (initialDebitNote && initialDebitNote.status !== "DRAFT") {
    return (
      <LedgerPanel>
        <LedgerAlert tone="danger">Only draft debit notes can be edited.</LedgerAlert>
        <LedgerButton href={`/purchases/debit-notes/${initialDebitNote.id}`} className="mt-4">
          Back to debit note
        </LedgerButton>
      </LedgerPanel>
    );
  }

  return (
    <form onSubmit={onSubmit} className="min-w-0 space-y-5">
      <LedgerFormSection className="min-w-0" title="Debit note details" description="Draft supplier debit notes stay in the AP adjustment workflow until explicitly finalized.">
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
          <LedgerFieldText>Issue date</LedgerFieldText>
          <LedgerInput type="date" value={issueDate} onChange={(event) => setIssueDate(event.target.value)} required />
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
          <LedgerFieldText>Original bill</LedgerFieldText>
          <LedgerSelect value={originalBillId} onChange={(event) => setOriginalBillId(event.target.value)} disabled={!supplierId}>
            <option value="">Standalone debit note</option>
            {supplierBills.map((bill) => (
              <option key={bill.id} value={bill.id}>
                {bill.billNumber} - {formatMoneyAmount(bill.total, bill.currency)}
              </option>
            ))}
          </LedgerSelect>
          {selectedOriginalBill ? <LedgerFieldHelp>Linked to bill {selectedOriginalBill.billNumber}. Debit note total is validated against the original bill total.</LedgerFieldHelp> : null}
        </LedgerFieldLabel>
        <LedgerFieldLabel>
          <LedgerFieldText>Reason</LedgerFieldText>
          <LedgerInput value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Return, overcharge, supplier credit" />
        </LedgerFieldLabel>
        <LedgerFieldLabel>
          <LedgerFieldText>Notes</LedgerFieldText>
          <LedgerInput value={notes} onChange={(event) => setNotes(event.target.value)} />
        </LedgerFieldLabel>
        {selectedOriginalBill ? (
          <div className="md:col-span-2">
            <LedgerAlert tone="info">Linked debit notes remain supplier/AP adjustments only. They do not create purchase returns, bank activity, ZATCA submissions, or inventory return movements.</LedgerAlert>
          </div>
        ) : null}
      </LedgerFormSection>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">Log in and select an organization before creating debit notes.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading debit note setup data...</StatusMessage> : null}
        {error ? <LedgerAlert tone="danger">{error}</LedgerAlert> : null}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <LedgerPanel className="min-w-0">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-ink">Debit note line items</h2>
              <p className="mt-1 text-sm leading-6 text-steel">Line entries keep existing item, purchase account, discount, tax, and AP adjustment preview behavior.</p>
            </div>
            <LedgerButton type="button" onClick={() => setLines((current) => [...current, makeLine()])} icon={PlusIcon}>
              Add line
            </LedgerButton>
          </div>
          <div className="overflow-x-auto rounded-md border border-line">
            <div style={{ minWidth: "1120px" }}>
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
                  <tr>
                    <th className="px-3 py-2">Item</th>
                    <th className="px-3 py-2">Description</th>
                    <th className="px-3 py-2">Purchase account</th>
                    <th className="px-3 py-2">Qty</th>
                    <th className="px-3 py-2">Price</th>
                    <th className="px-3 py-2">Discount %</th>
                    <th className="px-3 py-2">Tax</th>
                    <th className="px-3 py-2">Total</th>
                    <th className="px-3 py-2">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lines.map((line, index) => {
                    const previewLine = preview.lines[index];
                    return (
                      <tr key={line.id}>
                        <td className="px-3 py-2">
                          <LedgerSelect value={line.itemId} onChange={(event) => selectItem(line.id, event.target.value)} className="w-48">
                            <option value="">No item</option>
                            {activeItems.map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.sku ? `${item.sku} - ${item.name}` : item.name}
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
                          <LedgerInput inputMode="decimal" value={line.quantity} onChange={(event) => updateLine(line.id, { quantity: event.target.value })} className="w-24" />
                        </td>
                        <td className="px-3 py-2">
                          <LedgerInput inputMode="decimal" value={line.unitPrice} onChange={(event) => updateLine(line.id, { unitPrice: event.target.value })} className="w-28" />
                        </td>
                        <td className="px-3 py-2">
                          <LedgerInput inputMode="decimal" value={line.discountRate} onChange={(event) => updateLine(line.id, { discountRate: event.target.value })} className="w-24" />
                        </td>
                        <td className="px-3 py-2">
                          <LedgerSelect value={line.taxRateId} onChange={(event) => updateLine(line.id, { taxRateId: event.target.value })} className="w-48">
                            <option value="">No tax</option>
                            {activePurchaseTaxRates.map((taxRate) => (
                              <option key={taxRate.id} value={taxRate.id}>
                                {taxRate.name}
                              </option>
                            ))}
                          </LedgerSelect>
                        </td>
                        <td className="px-3 py-2">
                          <LedgerMoney>{previewLine ? formatMoneyAmount(previewLine.lineTotalUnits) : "SAR 0.00"}</LedgerMoney>
                        </td>
                        <td className="px-3 py-2">
                          <LedgerButton type="button" onClick={() => removeLine(line.id)} disabled={lines.length <= 1} size="sm">
                            Remove
                          </LedgerButton>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </LedgerPanel>

        <LedgerPanel className="min-w-0">
          <h2 className="text-base font-semibold text-ink">Debit note summary</h2>
          <div className="mt-4 space-y-2 text-sm">
            <TotalRow label="Subtotal" value={formatMoneyAmount(preview.subtotal)} />
            <TotalRow label="Discount" value={formatMoneyAmount(preview.discountTotal)} />
            <TotalRow label="Taxable" value={formatMoneyAmount(preview.taxableTotal)} />
            <TotalRow label="VAT" value={formatMoneyAmount(preview.taxTotal)} />
            <TotalRow label="Total debit" value={formatMoneyAmount(preview.total)} strong />
          </div>
        </LedgerPanel>
      </div>

      <LedgerActionBar className="justify-end">
        <LedgerButton href={returnTo || "/purchases/debit-notes"}>
          Cancel
        </LedgerButton>
        <LedgerButton type="submit" disabled={!organizationId || loading || submitting || !preview.valid} variant="primary">
          {submitting ? "Saving..." : initialDebitNote ? "Save draft debit note" : "Create draft debit note"}
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
