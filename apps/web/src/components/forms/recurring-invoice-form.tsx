"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useAppLocale } from "@/components/app-locale-provider";
import { StatusMessage } from "@/components/common/status-message";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { formatAppDate, formatAppMoney } from "@/lib/app-i18n";
import { calculateInvoicePreview } from "@/lib/money";
import { safeReturnToFromSearch } from "@/lib/parties";
import { buildRecurringSchedulePreview, recurringInvoiceFrequencyLabel } from "@/lib/recurring-invoices";
import type {
  Account,
  AccountType,
  Branch,
  Contact,
  Item,
  RecurringInvoiceFrequency,
  RecurringInvoiceTemplate,
  SalesInvoiceTaxMode,
  TaxRate,
} from "@/lib/types";

interface RecurringLineState {
  id: string;
  itemId: string;
  description: string;
  accountId: string;
  quantity: string;
  unitPrice: string;
  discountRate: string;
  taxRateId: string;
}

interface RecurringInvoiceFormProps {
  initialTemplate?: RecurringInvoiceTemplate;
  initialCustomerId?: string;
}

interface TemplateNumberPreview {
  templateNumber: string;
  editable: boolean;
  overrideAllowed: boolean;
  helperText: string;
}

const frequencies: RecurringInvoiceFrequency[] = ["WEEKLY", "MONTHLY", "QUARTERLY", "YEARLY"];

function makeLine(): RecurringLineState {
  return {
    id: globalThis.crypto?.randomUUID?.() ?? `recurring-line-${Date.now()}-${Math.random()}`,
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

function optionalDateInputValue(value?: string | null): string {
  return value ? new Date(value).toISOString().slice(0, 10) : "";
}

export function RecurringInvoiceForm({ initialTemplate, initialCustomerId = "" }: RecurringInvoiceFormProps) {
  const router = useRouter();
  const organizationId = useActiveOrganizationId();
  const { locale, tc } = useAppLocale();
  const [customers, setCustomers] = useState<Contact[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [taxRates, setTaxRates] = useState<TaxRate[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [customerId, setCustomerId] = useState(initialTemplate?.customerId ?? initialCustomerId);
  const [branchId, setBranchId] = useState(initialTemplate?.branchId ?? "");
  const [name, setName] = useState(initialTemplate?.name ?? "");
  const [startDate, setStartDate] = useState(dateInputValue(initialTemplate?.startDate));
  const [endDate, setEndDate] = useState(optionalDateInputValue(initialTemplate?.endDate));
  const [nextRunDate, setNextRunDate] = useState(dateInputValue(initialTemplate?.nextRunDate));
  const [frequency, setFrequency] = useState<RecurringInvoiceFrequency>(initialTemplate?.frequency ?? "MONTHLY");
  const [interval, setInterval] = useState(String(initialTemplate?.interval ?? 1));
  const [paymentTermsDays, setPaymentTermsDays] = useState(String(initialTemplate?.paymentTermsDays ?? 0));
  const [reference, setReference] = useState(initialTemplate?.reference ?? "");
  const [taxMode, setTaxMode] = useState<SalesInvoiceTaxMode>(initialTemplate?.taxMode ?? "TAX_EXCLUSIVE");
  const [notes, setNotes] = useState(initialTemplate?.notes ?? "");
  const [terms, setTerms] = useState(initialTemplate?.terms ?? "");
  const [lines, setLines] = useState<RecurringLineState[]>(
    initialTemplate?.lines?.map((line) => ({
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
  const [templateNumberPreview, setTemplateNumberPreview] = useState<TemplateNumberPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [returnTo, setReturnTo] = useState("");

  const postingRevenueAccounts = accounts.filter((account) => account.isActive && account.allowPosting && account.type === "REVENUE");
  const activeSalesTaxRates = taxRates.filter((taxRate) => taxRate.isActive && (taxRate.scope === "SALES" || taxRate.scope === "BOTH"));
  const activeItems = items.filter((item) => item.status === "ACTIVE");
  const preview = useMemo(
    () =>
      calculateInvoicePreview(
        lines.map((line) => ({
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          discountRate: line.discountRate,
          taxRate: taxMode === "NO_TAX" ? "0.0000" : (activeSalesTaxRates.find((taxRate) => taxRate.id === line.taxRateId)?.rate ?? "0.0000"),
        })),
        taxMode,
    ),
    [activeSalesTaxRates, lines, taxMode],
  );
  const schedulePreview = useMemo(
    () =>
      buildRecurringSchedulePreview({
        startDate,
        nextRunDate,
        endDate,
        frequency,
        interval: Number(interval || 0),
        paymentTermsDays: Number(paymentTermsDays || 0),
      }),
    [endDate, frequency, interval, nextRunDate, paymentTermsDays, startDate],
  );

  useEffect(() => {
    if (initialTemplate || initialCustomerId || typeof window === "undefined") {
      return;
    }
    const query = new URLSearchParams(window.location.search);
    const queryCustomerId = query.get("customerId") ?? "";
    if (queryCustomerId) {
      setCustomerId(queryCustomerId);
    }
    setReturnTo(safeReturnToFromSearch(window.location.search));
  }, [initialCustomerId, initialTemplate]);

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
      initialTemplate ? Promise.resolve(null) : apiRequest<TemplateNumberPreview>("/recurring-invoices/next-number"),
    ])
      .then(([contactResult, itemResult, accountResult, taxRateResult, branchResult, templateNumberResult]) => {
        if (cancelled) {
          return;
        }
        setCustomers(contactResult.filter((contact) => contact.isActive && (contact.type === "CUSTOMER" || contact.type === "BOTH")));
        setItems(itemResult);
        setAccounts(accountResult);
        setTaxRates(taxRateResult);
        setBranches(branchResult);
        setTemplateNumberPreview(templateNumberResult);
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : tc("Unable to load recurring invoice setup data."));
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
  }, [initialTemplate, organizationId, tc]);

  function updateLine(lineId: string, patch: Partial<RecurringLineState>) {
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
      taxRateId: taxMode === "NO_TAX" ? "" : (item.salesTaxRateId ?? ""),
    });
  }

  function updateTaxMode(nextTaxMode: SalesInvoiceTaxMode) {
    setTaxMode(nextTaxMode);
    if (nextTaxMode === "NO_TAX") {
      setLines((current) => current.map((line) => ({ ...line, taxRateId: "" })));
    }
  }

  function removeLine(lineId: string) {
    setLines((current) => (current.length > 1 ? current.filter((line) => line.id !== lineId) : current));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const validationError = getValidationError({ customerId, name, lines, previewValid: preview.valid, startDate, nextRunDate, endDate, tc });
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    try {
      const body = {
        customerId,
        branchId: branchId || null,
        name,
        startDate: `${startDate}T00:00:00.000Z`,
        endDate: endDate ? `${endDate}T00:00:00.000Z` : null,
        nextRunDate: `${nextRunDate}T00:00:00.000Z`,
        frequency,
        interval: Number(interval || 1),
        paymentTermsDays: Number(paymentTermsDays || 0),
        invoiceDateMode: "RUN_DATE",
        reference: reference || undefined,
        currency: "SAR",
        taxMode,
        notes: notes || undefined,
        terms: terms || undefined,
        lines: lines.map((line, index) => ({
          itemId: line.itemId || undefined,
          description: line.description,
          accountId: line.accountId,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          discountRate: line.discountRate || "0.0000",
          taxRateId: taxMode === "NO_TAX" ? null : line.taxRateId || null,
          sortOrder: index,
        })),
      };

      const template = initialTemplate
        ? await apiRequest<RecurringInvoiceTemplate>(`/recurring-invoices/${initialTemplate.id}`, { method: "PATCH", body })
        : await apiRequest<RecurringInvoiceTemplate>("/recurring-invoices", { method: "POST", body });

      router.push(returnTo || `/sales/recurring-invoices/${template.id}`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : tc("Unable to save recurring invoice template."));
    } finally {
      setSubmitting(false);
    }
  }

  if (initialTemplate && initialTemplate.status !== "DRAFT") {
    return (
      <div className="space-y-4">
        <StatusMessage type="error">{tc("Only draft recurring invoice templates can be edited.")}</StatusMessage>
        <Link href={`/sales/recurring-invoices/${initialTemplate.id}`} className="inline-flex rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          {tc("Back to recurring template")}
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <StatusMessage type="info">{tc("Recurring templates do not post accounting entries. Generated invoices are created as drafts and must be finalized separately.")}</StatusMessage>

      <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <label className="block md:col-span-2">
            <span className="text-sm font-medium text-slate-700">{tc("Customer")}</span>
            <select value={customerId} onChange={(event) => setCustomerId(event.target.value)} required className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm">
              <option value="">{tc("Select customer")}</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.displayName ?? customer.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">{tc("Template number")}</span>
            <input value={initialTemplate?.templateNumber ?? templateNumberPreview?.templateNumber ?? tc("From sequence")} readOnly aria-label={tc("Template number")} className="mt-1 w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none" />
            <span className="mt-1 block text-xs leading-5 text-steel">
              {initialTemplate ? tc("Template number assigned from the sequence.") : (templateNumberPreview?.helperText ? tc(templateNumberPreview.helperText) : tc("Assigned from the recurring invoice sequence when saved."))}
            </span>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">{tc("Tax mode")}</span>
            <select value={taxMode} onChange={(event) => updateTaxMode(event.target.value as SalesInvoiceTaxMode)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm">
              <option value="TAX_EXCLUSIVE">{tc("Tax exclusive")}</option>
              <option value="TAX_INCLUSIVE">{tc("Tax inclusive")}</option>
              <option value="NO_TAX">{tc("No tax")}</option>
            </select>
          </label>
          <label className="block md:col-span-2">
            <span className="text-sm font-medium text-slate-700">{tc("Template name")}</span>
            <input value={name} onChange={(event) => setName(event.target.value)} required className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">{tc("Start date")}</span>
            <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} required className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">{tc("Next run date")}</span>
            <input type="date" value={nextRunDate} onChange={(event) => setNextRunDate(event.target.value)} required className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">{tc("End date")}</span>
            <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">{tc("Frequency")}</span>
            <select value={frequency} onChange={(event) => setFrequency(event.target.value as RecurringInvoiceFrequency)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm">
              {frequencies.map((value) => (
                <option key={value} value={value}>
                  {frequencyLabel(value, 1, tc)}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">{tc("Interval")}</span>
            <input inputMode="numeric" value={interval} onChange={(event) => setInterval(event.target.value)} required className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">{tc("Payment terms days")}</span>
            <input inputMode="numeric" value={paymentTermsDays} onChange={(event) => setPaymentTermsDays(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">{tc("Reference")}</span>
            <input value={reference} onChange={(event) => setReference(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
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
            <span className="text-sm font-medium text-slate-700">{tc("Notes")}</span>
            <input value={notes} onChange={(event) => setNotes(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
          </label>
          <label className="block md:col-span-2">
            <span className="text-sm font-medium text-slate-700">{tc("Terms")}</span>
            <input value={terms} onChange={(event) => setTerms(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
          </label>
        </div>
      </div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">{tc("Log in and select an organization before creating recurring invoice templates.")}</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">{tc("Loading recurring invoice setup data...")}</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {!loading && organizationId && postingRevenueAccounts.length === 0 ? (
          <StatusMessage type="empty">
            {tc("Add or activate a posting revenue account before saving recurring invoice lines.")}{" "}
            <Link href="/accounts" className="font-semibold text-palm hover:underline">
              {tc("Open accounts")}
            </Link>
            .
          </StatusMessage>
        ) : null}
      </div>

      <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-base font-semibold text-ink">{tc("Schedule preview")}</h2>
            <p className="mt-1 text-sm leading-6 text-steel">{tc("Preview only. Saving this template does not generate invoices, post accounting entries, send email, collect payment, file VAT, or call ZATCA.")}</p>
          </div>
          <span className="self-start rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">{frequencyLabel(frequency, Number(interval || 1), tc)}</span>
        </div>
        {schedulePreview.blockers.length ? (
          <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            {schedulePreview.blockers.map((blocker) => (
              <div key={blocker}>{tc(blocker)}</div>
            ))}
          </div>
        ) : null}
        <div className="mt-4 grid gap-3 text-sm md:grid-cols-3">
          <Summary label={tc("Next invoice date")} value={formatAppDate(schedulePreview.nextInvoiceDate, locale, "-")} />
          <Summary label={tc("Due date")} value={formatAppDate(schedulePreview.dueDate, locale, "-")} />
          <Summary
            label={tc("Period covered")}
            value={schedulePreview.periodStart && schedulePreview.periodEnd ? tc("{start} to {end}", { start: formatAppDate(schedulePreview.periodStart, locale, "-"), end: formatAppDate(schedulePreview.periodEnd, locale, "-") }) : "-"}
          />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {schedulePreview.nextOccurrences.length ? (
            schedulePreview.nextOccurrences.map((date) => (
              <span key={date} className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                {formatAppDate(date, locale, "-")}
              </span>
            ))
          ) : (
            <span className="text-sm text-steel">{tc("No upcoming run dates available for the current schedule.")}</span>
          )}
        </div>
      </div>

      <div className="overflow-x-auto rounded-md border border-slate-200 bg-white shadow-panel">
        <div className="grid min-w-[1240px] grid-cols-[1fr_1.2fr_1.25fr_0.55fr_0.65fr_0.55fr_0.8fr_0.7fr_0.45fr] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-steel">
          <div>{tc("Item")}</div>
          <div>{tc("Description")}</div>
          <div>{tc("Revenue account")}</div>
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
            <div key={line.id} className="grid min-w-[1240px] grid-cols-[1fr_1.2fr_1.25fr_0.55fr_0.65fr_0.55fr_0.8fr_0.7fr_0.45fr] gap-3 border-b border-slate-100 px-4 py-3">
              <select aria-label={tc("Item for recurring invoice line {number}", { number: index + 1 })} value={line.itemId} onChange={(event) => selectItem(line.id, event.target.value)} className="rounded-md border border-slate-300 px-2 py-2 text-sm">
                <option value="">{tc("No item")}</option>
                {activeItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.sku ? `${item.sku} - ${item.name}` : item.name}
                  </option>
                ))}
              </select>
              <input aria-label={tc("Description for recurring invoice line {number}", { number: index + 1 })} value={line.description} onChange={(event) => updateLine(line.id, { description: event.target.value })} required className="rounded-md border border-slate-300 px-2 py-2 text-sm" />
              <AccountPicker accounts={postingRevenueAccounts} value={line.accountId} onChange={(accountId) => updateLine(line.id, { accountId })} lineNumber={index + 1} tc={tc} />
              <input aria-label={tc("Quantity for recurring invoice line {number}", { number: index + 1 })} inputMode="decimal" value={line.quantity} onChange={(event) => updateLine(line.id, { quantity: event.target.value })} className="rounded-md border border-slate-300 px-2 py-2 text-sm" />
              <input aria-label={tc("Price for recurring invoice line {number}", { number: index + 1 })} inputMode="decimal" value={line.unitPrice} onChange={(event) => updateLine(line.id, { unitPrice: event.target.value })} className="rounded-md border border-slate-300 px-2 py-2 text-sm" />
              <input aria-label={tc("Discount rate for recurring invoice line {number}", { number: index + 1 })} inputMode="decimal" value={line.discountRate} onChange={(event) => updateLine(line.id, { discountRate: event.target.value })} className="rounded-md border border-slate-300 px-2 py-2 text-sm" />
              <select aria-label={tc("Tax rate for recurring invoice line {number}", { number: index + 1 })} value={taxMode === "NO_TAX" ? "" : line.taxRateId} onChange={(event) => updateLine(line.id, { taxRateId: event.target.value })} disabled={taxMode === "NO_TAX"} className="rounded-md border border-slate-300 px-2 py-2 text-sm disabled:bg-slate-50 disabled:text-slate-400">
                <option value="">{taxMode === "NO_TAX" ? tc("No tax mode") : tc("No tax")}</option>
                {taxMode === "NO_TAX"
                  ? null
                  : activeSalesTaxRates.map((taxRate) => (
                      <option key={taxRate.id} value={taxRate.id}>
                        {taxRate.name}
                      </option>
                    ))}
              </select>
              <div className="flex items-center font-mono text-xs text-ink">{previewLine ? formatAppMoney(previewLine.lineTotalUnits, "SAR", locale) : formatAppMoney("0.0000", "SAR", locale)}</div>
              <button type="button" onClick={() => removeLine(line.id)} disabled={lines.length <= 1} className="rounded-md border border-slate-300 px-2 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300">
                {tc("Remove")}
              </button>
            </div>
          );
        })}
        <div className="flex min-w-[1240px] items-center justify-between px-4 py-3 text-sm">
          <button type="button" onClick={() => setLines((current) => [...current, makeLine()])} className="rounded-md border border-slate-300 px-3 py-2 font-medium text-slate-700 hover:bg-slate-50">
            {tc("Add line")}
          </button>
          <div className="grid min-w-72 grid-cols-2 gap-2 text-end">
            <span className="text-steel">{tc("Subtotal")}</span>
            <span className="font-mono">{formatAppMoney(preview.subtotal, "SAR", locale)}</span>
            <span className="text-steel">{tc("Discount")}</span>
            <span className="font-mono">{formatAppMoney(preview.discountTotal, "SAR", locale)}</span>
            <span className="text-steel">{tc("Taxable")}</span>
            <span className="font-mono">{formatAppMoney(preview.taxableTotal, "SAR", locale)}</span>
            <span className="text-steel">{tc("VAT")}</span>
            <span className="font-mono">{formatAppMoney(preview.taxTotal, "SAR", locale)}</span>
            <span className="font-semibold text-ink">{tc("Total")}</span>
            <span className="font-mono font-semibold text-ink">{formatAppMoney(preview.total, "SAR", locale)}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <button type="submit" disabled={!organizationId || loading || submitting || !preview.valid} className="rounded-md bg-palm px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400">
          {submitting ? tc("Saving...") : initialTemplate ? tc("Save draft template") : tc("Create draft template")}
        </button>
        <Link href={returnTo || "/sales/recurring-invoices"} className="rounded-md border border-slate-300 px-4 py-2 text-center text-sm font-medium text-slate-700 hover:bg-slate-50">
          {tc("Cancel")}
        </Link>
      </div>
    </form>
  );
}

function AccountPicker({
  accounts,
  value,
  onChange,
  lineNumber,
  tc,
}: {
  accounts: Account[];
  value: string;
  onChange: (accountId: string) => void;
  lineNumber: number;
  tc: (value: string, params?: Record<string, string | number>) => string;
}) {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const filteredAccounts = accounts.filter((account) => {
    if (!normalizedQuery) {
      return true;
    }
    return `${account.code} ${account.name} ${account.type}`.toLowerCase().includes(normalizedQuery);
  });
  const grouped = groupAccountsByType(filteredAccounts);

  return (
    <div className="space-y-1">
      <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} aria-label={tc("Search posting account for recurring invoice line {number}", { number: lineNumber })} placeholder={tc("Search accounts")} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs outline-none focus:border-palm" />
      <select value={value} onChange={(event) => onChange(event.target.value)} required aria-label={tc("Posting account for recurring invoice line {number}", { number: lineNumber })} className="w-full rounded-md border border-slate-300 px-2 py-2 text-sm">
        <option value="">{tc("Select account")}</option>
        {Object.entries(grouped).map(([type, group]) => (
          <optgroup key={type} label={tc(formatAccountType(type as AccountType))}>
            {group.map((account) => (
              <option key={account.id} value={account.id}>
                {account.code} {account.name}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </div>
  );
}

function groupAccountsByType(accounts: Account[]): Partial<Record<AccountType, Account[]>> {
  return accounts.reduce<Partial<Record<AccountType, Account[]>>>((groups, account) => {
    const current = groups[account.type] ?? [];
    groups[account.type] = [...current, account];
    return groups;
  }, {});
}

function formatAccountType(type: AccountType): string {
  return type
    .split("_")
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(" ");
}

function frequencyLabel(frequency: RecurringInvoiceFrequency, interval: number, tc: (value: string, params?: Record<string, string | number>) => string): string {
  if (interval <= 1) {
    return tc(recurringInvoiceFrequencyLabel(frequency, interval));
  }
  const unit = frequency === "WEEKLY" ? "weeks" : frequency === "MONTHLY" ? "months" : frequency === "QUARTERLY" ? "quarters" : "years";
  return tc("Every {interval} {unit}", { interval, unit: tc(unit) });
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-steel">{label}</div>
      <div className="mt-1 break-words font-medium text-ink">{value}</div>
    </div>
  );
}

function getValidationError({
  customerId,
  name,
  lines,
  previewValid,
  startDate,
  nextRunDate,
  endDate,
  tc,
}: {
  customerId: string;
  name: string;
  lines: RecurringLineState[];
  previewValid: boolean;
  startDate: string;
  nextRunDate: string;
  endDate: string;
  tc: (value: string, params?: Record<string, string | number>) => string;
}): string {
  if (!customerId) {
    return tc("Choose a customer.");
  }
  if (!name.trim()) {
    return tc("Name the recurring invoice template.");
  }
  if (nextRunDate < startDate) {
    return tc("Next run date cannot be before start date.");
  }
  if (endDate && endDate < startDate) {
    return tc("End date cannot be before start date.");
  }

  for (const [index, line] of lines.entries()) {
    if (!line.description.trim()) {
      return tc("Line {number} needs a description.", { number: index + 1 });
    }
    if (!line.accountId) {
      return tc("Line {number} needs a revenue account.", { number: index + 1 });
    }
  }

  return previewValid ? "" : tc("Recurring invoice lines need positive quantities, non-negative prices and tax, and discounts between 0% and 100%.");
}
