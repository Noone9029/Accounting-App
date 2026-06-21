"use client";

import { ArrowLeft, Plus, Save, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import {
  LedgerActionBar,
  LedgerButton,
  LedgerDataTable,
  LedgerFieldLabel,
  LedgerFieldText,
  LedgerFormSection,
  LedgerInput,
  LedgerMoney,
  LedgerPanel,
  LedgerSection,
  LedgerSelect,
  LedgerSummaryBand,
} from "@/components/ui/ledger-system";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { calculateInvoicePreview, formatMoneyAmount } from "@/lib/money";
import { safeReturnToFromSearch } from "@/lib/parties";
import type { Account, Branch, Contact, CreditNote, Item, SalesInvoice, TaxRate } from "@/lib/types";

interface CreditNoteLineState {
  id: string;
  itemId: string;
  description: string;
  accountId: string;
  quantity: string;
  unitPrice: string;
  discountRate: string;
  taxRateId: string;
}

interface CreditNoteFormProps {
  initialCreditNote?: CreditNote;
  initialCustomerId?: string;
  initialInvoiceId?: string;
}

function makeLine(): CreditNoteLineState {
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
  if (!value) {
    return fallback;
  }

  return new Date(value).toISOString().slice(0, 10);
}

export function CreditNoteForm({ initialCreditNote, initialCustomerId = "", initialInvoiceId = "" }: CreditNoteFormProps) {
  const router = useRouter();
  const organizationId = useActiveOrganizationId();
  const [customers, setCustomers] = useState<Contact[]>([]);
  const [invoices, setInvoices] = useState<SalesInvoice[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [taxRates, setTaxRates] = useState<TaxRate[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [customerId, setCustomerId] = useState(initialCreditNote?.customerId ?? initialCustomerId);
  const [originalInvoiceId, setOriginalInvoiceId] = useState(initialCreditNote?.originalInvoiceId ?? initialInvoiceId);
  const [branchId, setBranchId] = useState(initialCreditNote?.branchId ?? "");
  const [issueDate, setIssueDate] = useState(dateInputValue(initialCreditNote?.issueDate));
  const [notes, setNotes] = useState(initialCreditNote?.notes ?? "");
  const [reason, setReason] = useState(initialCreditNote?.reason ?? "");
  const [lines, setLines] = useState<CreditNoteLineState[]>(
    initialCreditNote?.lines?.map((line) => ({
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

  const postingRevenueAccounts = accounts.filter((account) => account.isActive && account.allowPosting && account.type === "REVENUE");
  const activeSalesTaxRates = taxRates.filter((taxRate) => taxRate.isActive && (taxRate.scope === "SALES" || taxRate.scope === "BOTH"));
  const activeItems = items.filter((item) => item.status === "ACTIVE");
  const customerInvoices = invoices.filter((invoice) => invoice.customerId === customerId && invoice.status === "FINALIZED");
  const selectedOriginalInvoice = customerInvoices.find((invoice) => invoice.id === originalInvoiceId);
  const preview = useMemo(
    () =>
      calculateInvoicePreview(
        lines.map((line) => ({
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          discountRate: line.discountRate,
          taxRate: activeSalesTaxRates.find((taxRate) => taxRate.id === line.taxRateId)?.rate ?? "0.0000",
        })),
      ),
    [activeSalesTaxRates, lines],
  );

  useEffect(() => {
    if (initialCreditNote || typeof window === "undefined") {
      return;
    }

    const query = new URLSearchParams(window.location.search);
    const queryCustomerId = query.get("customerId") ?? "";
    const queryInvoiceId = query.get("invoiceId") ?? "";
    setReturnTo(safeReturnToFromSearch(window.location.search));
    if (!initialCustomerId && queryCustomerId) {
      setCustomerId(queryCustomerId);
    }
    if (!initialInvoiceId && queryInvoiceId) {
      setOriginalInvoiceId(queryInvoiceId);
    }
  }, [initialCreditNote, initialCustomerId, initialInvoiceId]);

  useEffect(() => {
    if (!organizationId) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    Promise.all([
      apiRequest<Contact[]>("/contacts"),
      apiRequest<SalesInvoice[]>("/sales-invoices"),
      apiRequest<Item[]>("/items"),
      apiRequest<Account[]>("/accounts"),
      apiRequest<TaxRate[]>("/tax-rates"),
      apiRequest<Branch[]>("/branches"),
    ])
      .then(([contactResult, invoiceResult, itemResult, accountResult, taxRateResult, branchResult]) => {
        if (cancelled) {
          return;
        }

        setCustomers(contactResult.filter((contact) => contact.isActive && (contact.type === "CUSTOMER" || contact.type === "BOTH")));
        setInvoices(invoiceResult);
        setItems(itemResult);
        setAccounts(accountResult);
        setTaxRates(taxRateResult);
        setBranches(branchResult);
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load credit note setup data.");
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
    if (invoices.length > 0 && originalInvoiceId && customerId && !customerInvoices.some((invoice) => invoice.id === originalInvoiceId)) {
      setOriginalInvoiceId("");
    }
  }, [customerId, customerInvoices, invoices.length, originalInvoiceId]);

  function updateLine(lineId: string, patch: Partial<CreditNoteLineState>) {
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
      accountId: item.revenueAccountId,
      unitPrice: item.sellingPrice,
      taxRateId: item.salesTaxRateId ?? "",
    });
  }

  function removeLine(lineId: string) {
    setLines((current) => (current.length > 1 ? current.filter((line) => line.id !== lineId) : current));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const validationError = getValidationError(customerId, lines, preview.valid);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    try {
      const body = {
        customerId,
        originalInvoiceId: originalInvoiceId || null,
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

      const creditNote = initialCreditNote
        ? await apiRequest<CreditNote>(`/credit-notes/${initialCreditNote.id}`, { method: "PATCH", body })
        : await apiRequest<CreditNote>("/credit-notes", { method: "POST", body });

      router.push(returnTo || `/sales/credit-notes/${creditNote.id}`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to save credit note.");
    } finally {
      setSubmitting(false);
    }
  }

  if (initialCreditNote && initialCreditNote.status !== "DRAFT") {
    return (
      <div className="space-y-4">
        <StatusMessage type="error">Only draft credit notes can be edited.</StatusMessage>
        <LedgerButton href={`/sales/credit-notes/${initialCreditNote.id}`} icon={ArrowLeft}>
          Back to credit note
        </LedgerButton>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <LedgerFormSection title="Credit note details" description="Choose the customer, issue date, branch, and optional original invoice reference.">
          <LedgerFieldLabel className="md:col-span-2">
            <LedgerFieldText>Customer</LedgerFieldText>
            <LedgerSelect value={customerId} onChange={(event) => setCustomerId(event.target.value)} required>
              <option value="">Select customer</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.displayName ?? customer.name}
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
          <LedgerFieldLabel className="md:col-span-2">
            <LedgerFieldText>Original invoice</LedgerFieldText>
            <LedgerSelect value={originalInvoiceId} onChange={(event) => setOriginalInvoiceId(event.target.value)} disabled={!customerId}>
              <option value="">Standalone credit note</option>
              {customerInvoices.map((invoice) => (
                <option key={invoice.id} value={invoice.id}>
                  {invoice.invoiceNumber} - {formatMoneyAmount(invoice.total, invoice.currency)}
                </option>
              ))}
            </LedgerSelect>
          </LedgerFieldLabel>
          <LedgerFieldLabel>
            <LedgerFieldText>Reason</LedgerFieldText>
            <LedgerInput value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Return, adjustment, discount" />
          </LedgerFieldLabel>
          <LedgerFieldLabel>
            <LedgerFieldText>Notes</LedgerFieldText>
            <LedgerInput value={notes} onChange={(event) => setNotes(event.target.value)} />
          </LedgerFieldLabel>
        {selectedOriginalInvoice ? (
          <p className="text-xs text-steel md:col-span-2">
            Linked to invoice {selectedOriginalInvoice.invoiceNumber}. Credit note total is validated against the original invoice total.
          </p>
        ) : null}
      </LedgerFormSection>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">Log in and select an organization before creating credit notes.</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">Loading credit note setup data...</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
      </div>

      <LedgerSection title="Credit note lines" description="Use revenue accounts and sales tax rates for the draft credit note lines.">
        <LedgerDataTable minWidth="1120px" className="shadow-none">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
            <tr>
              <th className="px-3 py-2">Item</th>
              <th className="px-3 py-2">Description</th>
              <th className="px-3 py-2">Revenue account</th>
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
                  <td className="px-3 py-3">
                    <LedgerSelect value={line.itemId} onChange={(event) => selectItem(line.id, event.target.value)} className="min-w-36">
                      <option value="">No item</option>
                      {activeItems.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.sku ? `${item.sku} - ${item.name}` : item.name}
                        </option>
                      ))}
                    </LedgerSelect>
                  </td>
                  <td className="px-3 py-3">
                    <LedgerInput value={line.description} onChange={(event) => updateLine(line.id, { description: event.target.value })} required className="min-w-44" />
                  </td>
                  <td className="px-3 py-3">
                    <LedgerSelect value={line.accountId} onChange={(event) => updateLine(line.id, { accountId: event.target.value })} required className="min-w-44">
                      <option value="">Select account</option>
                      {postingRevenueAccounts.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.code} {account.name}
                        </option>
                      ))}
                    </LedgerSelect>
                  </td>
                  <td className="px-3 py-3">
                    <LedgerInput inputMode="decimal" value={line.quantity} onChange={(event) => updateLine(line.id, { quantity: event.target.value })} className="min-w-24" />
                  </td>
                  <td className="px-3 py-3">
                    <LedgerInput inputMode="decimal" value={line.unitPrice} onChange={(event) => updateLine(line.id, { unitPrice: event.target.value })} className="min-w-28" />
                  </td>
                  <td className="px-3 py-3">
                    <LedgerInput inputMode="decimal" value={line.discountRate} onChange={(event) => updateLine(line.id, { discountRate: event.target.value })} className="min-w-24" />
                  </td>
                  <td className="px-3 py-3">
                    <LedgerSelect value={line.taxRateId} onChange={(event) => updateLine(line.id, { taxRateId: event.target.value })} className="min-w-36">
                      <option value="">No tax</option>
                      {activeSalesTaxRates.map((taxRate) => (
                        <option key={taxRate.id} value={taxRate.id}>
                          {taxRate.name}
                        </option>
                      ))}
                    </LedgerSelect>
                  </td>
                  <td className="px-3 py-3">
                    <LedgerMoney>{previewLine ? formatMoneyAmount(previewLine.lineTotalUnits) : "SAR 0.00"}</LedgerMoney>
                  </td>
                  <td className="px-3 py-3">
                    <LedgerButton type="button" onClick={() => removeLine(line.id)} disabled={lines.length <= 1} size="sm" icon={Trash2}>
                      Remove
                    </LedgerButton>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </LedgerDataTable>
        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <LedgerButton type="button" onClick={() => setLines((current) => [...current, makeLine()])} icon={Plus}>
            Add line
          </LedgerButton>
          <LedgerSummaryBand>
            <dl className="grid min-w-72 grid-cols-2 gap-2 text-right text-sm">
              <dt className="text-steel">Subtotal</dt>
              <dd><LedgerMoney>{formatMoneyAmount(preview.subtotal)}</LedgerMoney></dd>
              <dt className="text-steel">Discount</dt>
              <dd><LedgerMoney>{formatMoneyAmount(preview.discountTotal)}</LedgerMoney></dd>
              <dt className="text-steel">Taxable</dt>
              <dd><LedgerMoney>{formatMoneyAmount(preview.taxableTotal)}</LedgerMoney></dd>
              <dt className="text-steel">VAT</dt>
              <dd><LedgerMoney>{formatMoneyAmount(preview.taxTotal)}</LedgerMoney></dd>
              <dt className="font-semibold text-ink">Total credit</dt>
              <dd className="font-semibold text-ink"><LedgerMoney>{formatMoneyAmount(preview.total)}</LedgerMoney></dd>
            </dl>
          </LedgerSummaryBand>
        </div>
      </LedgerSection>

      <LedgerPanel>
        <LedgerActionBar>
          <LedgerButton type="submit" disabled={!organizationId || loading || submitting || !preview.valid} variant="primary" icon={Save}>
          {submitting ? "Saving..." : initialCreditNote ? "Save draft credit note" : "Create draft credit note"}
          </LedgerButton>
          <LedgerButton href={returnTo || "/sales/credit-notes"}>Cancel</LedgerButton>
        </LedgerActionBar>
      </LedgerPanel>
    </form>
  );
}

function getValidationError(customerId: string, lines: CreditNoteLineState[], previewValid: boolean): string {
  if (!customerId) {
    return "Choose a customer.";
  }

  for (const [index, line] of lines.entries()) {
    if (!line.description.trim()) {
      return `Line ${index + 1} needs a description.`;
    }

    if (!line.accountId) {
      return `Line ${index + 1} needs a revenue account.`;
    }
  }

  return previewValid ? "" : "Credit note lines need positive quantities, non-negative prices and tax, and discounts between 0% and 100%.";
}
