"use client";

import { useRouter } from "next/navigation";
import { PlusIcon, SendIcon } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
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
import { bankAccountOptionLabel } from "@/lib/bank-accounts";
import { calculateInvoicePreview, formatMoneyAmount } from "@/lib/money";
import { safeReturnToFromSearch } from "@/lib/parties";
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
  const [returnTo, setReturnTo] = useState("");

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
    if (typeof window === "undefined") {
      return;
    }

    const query = new URLSearchParams(window.location.search);
    const querySupplierId = query.get("supplierId") ?? "";
    if (querySupplierId) {
      setContactId(querySupplierId);
    }
    setReturnTo(safeReturnToFromSearch(window.location.search));
  }, []);

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

      router.push(returnTo || `/purchases/cash-expenses/${expense.id}`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to post cash expense.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="min-w-0 space-y-5">
      <LedgerFormSection
        className="min-w-0"
        title="Expense details"
        description="Direct paid expense fields are posted immediately to the selected paid-through account."
      >
        <LedgerFieldLabel className="md:col-span-2">
          <LedgerFieldText>Supplier/contact</LedgerFieldText>
          <LedgerSelect value={contactId} onChange={(event) => setContactId(event.target.value)}>
            <option value="">No linked supplier</option>
            {supplierContacts.map((contact) => (
              <option key={contact.id} value={contact.id}>
                {contact.displayName ?? contact.name}
              </option>
            ))}
          </LedgerSelect>
        </LedgerFieldLabel>
        <LedgerFieldLabel>
          <LedgerFieldText>Expense date</LedgerFieldText>
          <LedgerInput type="date" value={expenseDate} onChange={(event) => setExpenseDate(event.target.value)} required />
        </LedgerFieldLabel>
        <LedgerFieldLabel>
          <LedgerFieldText>Paid through</LedgerFieldText>
          <LedgerSelect value={paidThroughAccountId} onChange={(event) => setPaidThroughAccountId(event.target.value)} required>
            <option value="">Select account</option>
            {paidThroughAccounts.map((account) => (
              <option key={account.id} value={account.id}>
                {bankAccountOptionLabel(account, bankProfiles)}
              </option>
            ))}
          </LedgerSelect>
          <LedgerFieldHelp>Existing behavior credits this posting account immediately.</LedgerFieldHelp>
        </LedgerFieldLabel>
        <LedgerFieldLabel>
          <LedgerFieldText>Currency</LedgerFieldText>
          <LedgerInput value="SAR" readOnly aria-label="Currency" className="bg-slate-50 text-slate-700" />
          <LedgerFieldHelp>Cash expenses currently save with the existing SAR currency behavior.</LedgerFieldHelp>
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
          <LedgerFieldText>Description</LedgerFieldText>
          <LedgerInput value={description} onChange={(event) => setDescription(event.target.value)} />
        </LedgerFieldLabel>
        <LedgerFieldLabel>
          <LedgerFieldText>Notes</LedgerFieldText>
          <LedgerInput value={notes} onChange={(event) => setNotes(event.target.value)} />
        </LedgerFieldLabel>
      </LedgerFormSection>

      <LedgerPanel>
        <h2 className="text-base font-semibold text-ink">Posting boundaries</h2>
        <p className="mt-1 text-sm leading-6 text-steel">Cash expenses stay as immediate direct-spend postings.</p>
        <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
          <LedgerSummaryBand tone="warning">Posting debits expense/VAT and credits the selected paid-through account immediately.</LedgerSummaryBand>
          <LedgerSummaryBand tone="info">Supplier/contact linking is optional and only preserves ledger context for this expense.</LedgerSummaryBand>
          <LedgerSummaryBand tone="warning">No accounts payable, supplier payment run, bank transfer, reconciliation match, or tax-authority submission is created here.</LedgerSummaryBand>
        </div>
      </LedgerPanel>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <LedgerPanel className="min-w-0">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-ink">Expense line items</h2>
              <p className="mt-1 text-sm leading-6 text-steel">Line entries keep existing item, account, discount, tax, and preview total behavior.</p>
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
          <h2 className="text-base font-semibold text-ink">Expense summary</h2>
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
        {!organizationId ? <LedgerAlert tone="info">Log in and select an organization to create cash expenses.</LedgerAlert> : null}
        {loading ? <LedgerAlert tone="info">Loading cash expense setup data...</LedgerAlert> : null}
        {error ? <LedgerAlert tone="danger">{error}</LedgerAlert> : null}
        {!preview.valid ? <LedgerAlert tone="info">Every cash expense line needs a positive quantity, non-negative unit price, valid discount, and a posting account.</LedgerAlert> : null}
      </div>

      <LedgerActionBar className="justify-end">
        <LedgerButton href={returnTo || "/purchases/cash-expenses"}>
          Cancel
        </LedgerButton>
        <LedgerButton type="submit" disabled={submitting || !organizationId} variant="primary" icon={SendIcon}>
          {submitting ? "Posting..." : "Post cash expense"}
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
