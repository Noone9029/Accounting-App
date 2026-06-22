"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
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
  LedgerStatusBadge,
  LedgerSummaryBand,
  LedgerTableShell,
} from "@/components/ui/ledger-system";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { calculateInvoicePreview, formatMoneyAmount } from "@/lib/money";
import { safeReturnToFromSearch } from "@/lib/parties";
import { buildRecurringSchedulePreview } from "@/lib/recurring-invoices";
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
          setError(loadError instanceof Error ? loadError.message : "Unable to load recurring invoice setup data.");
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
  }, [initialTemplate, organizationId]);

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

    const validationError = getValidationError({ customerId, name, lines, previewValid: preview.valid, startDate, nextRunDate, endDate });
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
      setError(submitError instanceof Error ? submitError.message : "Unable to save recurring invoice template.");
    } finally {
      setSubmitting(false);
    }
  }

  if (initialTemplate && initialTemplate.status !== "DRAFT") {
    return (
      <div className="space-y-4">
        <LedgerAlert tone="danger">Only draft recurring invoice templates can be edited.</LedgerAlert>
        <LedgerButton href={`/sales/recurring-invoices/${initialTemplate.id}`} icon={ArrowLeft}>
          Back to recurring template
        </LedgerButton>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <LedgerAlert tone="info">Recurring templates do not post accounting entries. Generated invoices are created as drafts and must be finalized separately.</LedgerAlert>

      <LedgerFormSection title="Template details" description="Set the customer, schedule, tax mode, and review text for this non-posting template.">
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
          <LedgerFieldText>Template number</LedgerFieldText>
          <LedgerInput value={initialTemplate?.templateNumber ?? templateNumberPreview?.templateNumber ?? "From sequence"} readOnly aria-label="Template number" className="bg-slate-50 text-slate-700" />
          <LedgerFieldHelp>
            {initialTemplate ? "Template number assigned from the sequence." : (templateNumberPreview?.helperText ?? "Assigned from the recurring invoice sequence when saved.")}
          </LedgerFieldHelp>
        </LedgerFieldLabel>
        <LedgerFieldLabel>
          <LedgerFieldText>Tax mode</LedgerFieldText>
          <LedgerSelect value={taxMode} onChange={(event) => updateTaxMode(event.target.value as SalesInvoiceTaxMode)}>
            <option value="TAX_EXCLUSIVE">Tax exclusive</option>
            <option value="TAX_INCLUSIVE">Tax inclusive</option>
            <option value="NO_TAX">No tax</option>
          </LedgerSelect>
        </LedgerFieldLabel>
        <LedgerFieldLabel className="md:col-span-2">
          <LedgerFieldText>Template name</LedgerFieldText>
          <LedgerInput value={name} onChange={(event) => setName(event.target.value)} required />
        </LedgerFieldLabel>
        <LedgerFieldLabel>
          <LedgerFieldText>Start date</LedgerFieldText>
          <LedgerInput type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} required />
        </LedgerFieldLabel>
        <LedgerFieldLabel>
          <LedgerFieldText>Next run date</LedgerFieldText>
          <LedgerInput type="date" value={nextRunDate} onChange={(event) => setNextRunDate(event.target.value)} required />
        </LedgerFieldLabel>
        <LedgerFieldLabel>
          <LedgerFieldText>End date</LedgerFieldText>
          <LedgerInput type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
        </LedgerFieldLabel>
        <LedgerFieldLabel>
          <LedgerFieldText>Frequency</LedgerFieldText>
          <LedgerSelect value={frequency} onChange={(event) => setFrequency(event.target.value as RecurringInvoiceFrequency)}>
            {frequencies.map((value) => (
              <option key={value} value={value}>
                {frequencyLabel(value)}
              </option>
            ))}
          </LedgerSelect>
        </LedgerFieldLabel>
        <LedgerFieldLabel>
          <LedgerFieldText>Interval</LedgerFieldText>
          <LedgerInput inputMode="numeric" value={interval} onChange={(event) => setInterval(event.target.value)} required />
        </LedgerFieldLabel>
        <LedgerFieldLabel>
          <LedgerFieldText>Payment terms days</LedgerFieldText>
          <LedgerInput inputMode="numeric" value={paymentTermsDays} onChange={(event) => setPaymentTermsDays(event.target.value)} />
        </LedgerFieldLabel>
        <LedgerFieldLabel>
          <LedgerFieldText>Reference</LedgerFieldText>
          <LedgerInput value={reference} onChange={(event) => setReference(event.target.value)} />
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
          <LedgerFieldText>Notes</LedgerFieldText>
          <LedgerInput value={notes} onChange={(event) => setNotes(event.target.value)} />
        </LedgerFieldLabel>
        <LedgerFieldLabel className="md:col-span-2">
          <LedgerFieldText>Terms</LedgerFieldText>
          <LedgerInput value={terms} onChange={(event) => setTerms(event.target.value)} />
        </LedgerFieldLabel>
      </LedgerFormSection>

      <div className="space-y-3">
        {!organizationId ? <LedgerAlert tone="info">Log in and select an organization before creating recurring invoice templates.</LedgerAlert> : null}
        {loading ? <StatusMessage type="loading">Loading recurring invoice setup data...</StatusMessage> : null}
        {error ? <LedgerAlert tone="danger">{error}</LedgerAlert> : null}
        {!loading && organizationId && postingRevenueAccounts.length === 0 ? (
          <LedgerAlert tone="warning">
            Add or activate a posting revenue account before saving recurring invoice lines. <LedgerButton href="/accounts" size="sm">Open accounts</LedgerButton>
          </LedgerAlert>
        ) : null}
      </div>

      <LedgerPanel>
        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-base font-semibold text-ink">Schedule preview</h2>
            <p className="mt-1 text-sm leading-6 text-steel">Preview only. Saving this template does not generate invoices, post accounting entries, send email, collect payment, file VAT, or call ZATCA.</p>
          </div>
          <LedgerStatusBadge tone="neutral">{frequencyLabel(frequency)}</LedgerStatusBadge>
        </div>
        {schedulePreview.blockers.length ? (
          <LedgerSummaryBand tone="warning">
            {schedulePreview.blockers.map((blocker) => (
              <div key={blocker}>{blocker}</div>
            ))}
          </LedgerSummaryBand>
        ) : null}
        <div className="mt-4 grid gap-3 text-sm md:grid-cols-3">
          <Summary label="Next invoice date" value={schedulePreview.nextInvoiceDate || "-"} />
          <Summary label="Due date" value={schedulePreview.dueDate || "-"} />
          <Summary
            label="Period covered"
            value={schedulePreview.periodStart && schedulePreview.periodEnd ? `${schedulePreview.periodStart} to ${schedulePreview.periodEnd}` : "-"}
          />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {schedulePreview.nextOccurrences.length ? (
            schedulePreview.nextOccurrences.map((date) => (
              <LedgerStatusBadge key={date} tone="neutral">
                {date}
              </LedgerStatusBadge>
            ))
          ) : (
            <span className="text-sm text-steel">No upcoming run dates available for the current schedule.</span>
          )}
        </div>
      </LedgerPanel>

      <LedgerPanel>
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-ink">Recurring invoice lines</h2>
            <p className="mt-1 text-sm leading-6 text-steel">Lines preview the draft invoice only. They do not post accounting entries until a generated draft invoice is reviewed and finalized separately.</p>
          </div>
          <span className="text-sm text-steel">{lines.length} line{lines.length === 1 ? "" : "s"}</span>
        </div>
        <LedgerTableShell minWidth="1240px">
        <div className="grid min-w-[1240px] grid-cols-[1fr_1.2fr_1.25fr_0.55fr_0.65fr_0.55fr_0.8fr_0.7fr_0.45fr] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-steel">
          <div>Item</div>
          <div>Description</div>
          <div>Revenue account</div>
          <div>Qty</div>
          <div>Price</div>
          <div>Discount %</div>
          <div>Tax</div>
          <div>Total</div>
          <div></div>
        </div>
        {lines.map((line, index) => {
          const previewLine = preview.lines[index];
          return (
            <div key={line.id} className="grid min-w-[1240px] grid-cols-[1fr_1.2fr_1.25fr_0.55fr_0.65fr_0.55fr_0.8fr_0.7fr_0.45fr] gap-3 border-b border-slate-100 px-4 py-3">
              <LedgerSelect aria-label={`Item for recurring invoice line ${index + 1}`} value={line.itemId} onChange={(event) => selectItem(line.id, event.target.value)}>
                <option value="">No item</option>
                {activeItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.sku ? `${item.sku} - ${item.name}` : item.name}
                  </option>
                ))}
              </LedgerSelect>
              <LedgerInput aria-label={`Description for recurring invoice line ${index + 1}`} value={line.description} onChange={(event) => updateLine(line.id, { description: event.target.value })} required />
              <AccountPicker accounts={postingRevenueAccounts} value={line.accountId} onChange={(accountId) => updateLine(line.id, { accountId })} lineNumber={index + 1} />
              <LedgerInput aria-label={`Quantity for recurring invoice line ${index + 1}`} inputMode="decimal" value={line.quantity} onChange={(event) => updateLine(line.id, { quantity: event.target.value })} />
              <LedgerInput aria-label={`Price for recurring invoice line ${index + 1}`} inputMode="decimal" value={line.unitPrice} onChange={(event) => updateLine(line.id, { unitPrice: event.target.value })} />
              <LedgerInput aria-label={`Discount rate for recurring invoice line ${index + 1}`} inputMode="decimal" value={line.discountRate} onChange={(event) => updateLine(line.id, { discountRate: event.target.value })} />
              <LedgerSelect aria-label={`Tax rate for recurring invoice line ${index + 1}`} value={taxMode === "NO_TAX" ? "" : line.taxRateId} onChange={(event) => updateLine(line.id, { taxRateId: event.target.value })} disabled={taxMode === "NO_TAX"}>
                <option value="">{taxMode === "NO_TAX" ? "No tax mode" : "No tax"}</option>
                {taxMode === "NO_TAX"
                  ? null
                  : activeSalesTaxRates.map((taxRate) => (
                      <option key={taxRate.id} value={taxRate.id}>
                        {taxRate.name}
                      </option>
                    ))}
              </LedgerSelect>
              <div className="flex items-center"><LedgerMoney>{previewLine ? formatMoneyAmount(previewLine.lineTotalUnits) : "SAR 0.00"}</LedgerMoney></div>
              <LedgerButton type="button" onClick={() => removeLine(line.id)} disabled={lines.length <= 1} size="sm" icon={Trash2}>
                Remove
              </LedgerButton>
            </div>
          );
        })}
        <div className="flex min-w-[1240px] items-center justify-between px-4 py-3 text-sm">
          <LedgerButton type="button" onClick={() => setLines((current) => [...current, makeLine()])} icon={Plus}>
            Add line
          </LedgerButton>
          <div className="grid min-w-72 grid-cols-2 gap-2 text-right">
            <span className="text-steel">Subtotal</span>
            <LedgerMoney>{formatMoneyAmount(preview.subtotal)}</LedgerMoney>
            <span className="text-steel">Discount</span>
            <LedgerMoney>{formatMoneyAmount(preview.discountTotal)}</LedgerMoney>
            <span className="text-steel">Taxable</span>
            <LedgerMoney>{formatMoneyAmount(preview.taxableTotal)}</LedgerMoney>
            <span className="text-steel">VAT</span>
            <LedgerMoney>{formatMoneyAmount(preview.taxTotal)}</LedgerMoney>
            <span className="font-semibold text-ink">Total</span>
            <LedgerMoney><span className="font-semibold">{formatMoneyAmount(preview.total)}</span></LedgerMoney>
          </div>
        </div>
        </LedgerTableShell>
      </LedgerPanel>

      <LedgerActionBar>
        <LedgerButton type="submit" variant="primary" disabled={!organizationId || loading || submitting || !preview.valid}>
          {submitting ? "Saving..." : initialTemplate ? "Save draft template" : "Create draft template"}
        </LedgerButton>
        <LedgerButton href={returnTo || "/sales/recurring-invoices"}>
          Cancel
        </LedgerButton>
      </LedgerActionBar>
    </form>
  );
}

function AccountPicker({
  accounts,
  value,
  onChange,
  lineNumber,
}: {
  accounts: Account[];
  value: string;
  onChange: (accountId: string) => void;
  lineNumber: number;
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
      <LedgerInput type="search" value={query} onChange={(event) => setQuery(event.target.value)} aria-label={`Search posting account for recurring invoice line ${lineNumber}`} placeholder="Search accounts" className="py-1.5 text-xs" />
      <LedgerSelect value={value} onChange={(event) => onChange(event.target.value)} required aria-label={`Posting account for recurring invoice line ${lineNumber}`}>
        <option value="">Select account</option>
        {Object.entries(grouped).map(([type, group]) => (
          <optgroup key={type} label={formatAccountType(type as AccountType)}>
            {group.map((account) => (
              <option key={account.id} value={account.id}>
                {account.code} {account.name}
              </option>
            ))}
          </optgroup>
        ))}
      </LedgerSelect>
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

function frequencyLabel(frequency: RecurringInvoiceFrequency): string {
  return frequency
    .split("_")
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(" ");
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
}: {
  customerId: string;
  name: string;
  lines: RecurringLineState[];
  previewValid: boolean;
  startDate: string;
  nextRunDate: string;
  endDate: string;
}): string {
  if (!customerId) {
    return "Choose a customer.";
  }
  if (!name.trim()) {
    return "Name the recurring invoice template.";
  }
  if (nextRunDate < startDate) {
    return "Next run date cannot be before start date.";
  }
  if (endDate && endDate < startDate) {
    return "End date cannot be before start date.";
  }

  for (const [index, line] of lines.entries()) {
    if (!line.description.trim()) {
      return `Line ${index + 1} needs a description.`;
    }
    if (!line.accountId) {
      return `Line ${index + 1} needs a revenue account.`;
    }
  }

  return previewValid ? "" : "Recurring invoice lines need positive quantities, non-negative prices and tax, and discounts between 0% and 100%.";
}
