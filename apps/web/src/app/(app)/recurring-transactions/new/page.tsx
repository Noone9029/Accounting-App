"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";
import { FilePlus2, Plus, Trash2 } from "lucide-react";
import { usePermissions } from "@/components/permissions/permission-provider";
import {
  LedgerAlert, LedgerButton, LedgerFieldLabel, LedgerFieldText, LedgerInput, LedgerPage, LedgerPageBody,
  LedgerPageHeader, LedgerPanel, LedgerSelect,
} from "@/components/ui/ledger-system";
import { useActiveOrganization } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { PERMISSIONS } from "@/lib/permissions";
import { createRecurringTemplate, updateRecurringTemplate, type RecurringTemplate, type RecurringTemplateInput, type RecurringTransactionType } from "@/lib/recurring-transactions";

type Catalog = { id: string; code?: string; name: string; displayName?: string | null; type?: string; isActive?: boolean; allowPosting?: boolean; status?: string };
type LineState = { id: string; itemId: string; accountId: string; taxRateId: string; costCenterId: string; projectId: string; description: string; quantity: string; unitPrice: string; discountRate: string; debit: string; credit: string };

const fieldClass = "mt-1";

function newLine(): LineState {
  return { id: globalThis.crypto?.randomUUID?.() ?? `line-${Date.now()}-${Math.random()}`, itemId: "", accountId: "", taxRateId: "", costCenterId: "", projectId: "", description: "", quantity: "1.0000", unitPrice: "0.0000", discountRate: "0.0000", debit: "0.0000", credit: "0.0000" };
}

function lineFromTemplate(line: RecurringTemplate["lines"][number]): LineState {
  return { id: line.id ?? newLine().id, itemId: line.itemId ?? "", accountId: line.accountId, taxRateId: line.taxRateId ?? "", costCenterId: line.costCenterId ?? "", projectId: line.projectId ?? "", description: line.description, quantity: line.quantity, unitPrice: line.unitPrice, discountRate: line.discountRate, debit: line.debit, credit: line.credit };
}

export default function NewRecurringTransactionPage() { return <RecurringTemplateEditor />; }

export function RecurringTemplateEditor({ initialTemplate }: { initialTemplate?: RecurringTemplate }) {
  const router = useRouter();
  const organization = useActiveOrganization();
  const { can } = usePermissions();
  const canManage = can(PERMISSIONS.recurringTransactions.manage);
  const [contacts, setContacts] = useState<Catalog[]>([]);
  const [accounts, setAccounts] = useState<Catalog[]>([]);
  const [items, setItems] = useState<Catalog[]>([]);
  const [taxRates, setTaxRates] = useState<Catalog[]>([]);
  const [branches, setBranches] = useState<Catalog[]>([]);
  const [costCenters, setCostCenters] = useState<Catalog[]>([]);
  const [projects, setProjects] = useState<Catalog[]>([]);
  const [transactionType, setTransactionType] = useState<RecurringTransactionType>(initialTemplate?.transactionType ?? "SALES_INVOICE");
  const [name, setName] = useState(initialTemplate?.name ?? "");
  const [templateDescription, setTemplateDescription] = useState(initialTemplate?.description ?? "");
  const [terms, setTerms] = useState(initialTemplate?.terms ?? "");
  const [taxMode, setTaxMode] = useState(initialTemplate?.taxMode ?? "TAX_EXCLUSIVE");
  const [inventoryPostingMode, setInventoryPostingMode] = useState(initialTemplate?.inventoryPostingMode ?? "DIRECT_EXPENSE_OR_ASSET");
  const [partyId, setPartyId] = useState(initialTemplate?.partyId ?? "");
  const [branchId, setBranchId] = useState(initialTemplate?.branchId ?? "");
  const [paidThroughAccountId, setPaidThroughAccountId] = useState(initialTemplate?.paidThroughAccountId ?? "");
  const [frequency, setFrequency] = useState<RecurringTemplateInput["frequency"]>(initialTemplate?.frequency ?? "MONTHLY");
  const [interval, setInterval] = useState(String(initialTemplate?.interval ?? 1));
  const [startDate, setStartDate] = useState(initialTemplate?.startDate?.slice(0, 10) ?? new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(initialTemplate?.endDate?.slice(0, 10) ?? "");
  const [timezone, setTimezone] = useState(initialTemplate?.timezone ?? organization?.timezone ?? "Asia/Dubai");
  const [catchUpPolicy, setCatchUpPolicy] = useState<RecurringTemplateInput["catchUpPolicy"]>(initialTemplate?.catchUpPolicy ?? "SKIP_MISSED");
  const [currencyCode, setCurrencyCode] = useState(initialTemplate?.currencyCode ?? organization?.baseCurrency ?? "AED");
  const [exchangeRatePolicy, setExchangeRatePolicy] = useState<RecurringTemplateInput["exchangeRatePolicy"]>(initialTemplate?.exchangeRatePolicy ?? "BASE_CURRENCY_ONLY");
  const [fixedExchangeRate, setFixedExchangeRate] = useState(initialTemplate?.fixedExchangeRate ?? "");
  const [rateSnapshotId, setRateSnapshotId] = useState(initialTemplate?.rateSnapshotId ?? "");
  const [paymentTermsDays, setPaymentTermsDays] = useState(String(initialTemplate?.paymentTermsDays ?? 0));
  const [reference, setReference] = useState(initialTemplate?.reference ?? "");
  const [notes, setNotes] = useState(initialTemplate?.notes ?? "");
  const [lines, setLines] = useState<LineState[]>(initialTemplate?.lines.map(lineFromTemplate) ?? [newLine()]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const previousOrganizationId = useRef(organization?.id ?? null);

  useEffect(() => {
    const previous = previousOrganizationId.current;
    if (previous !== (organization?.id ?? null) && !initialTemplate) {
      setContacts([]); setAccounts([]); setItems([]); setTaxRates([]); setBranches([]); setCostCenters([]); setProjects([]);
      setTransactionType("SALES_INVOICE"); setName(""); setTemplateDescription(""); setTerms(""); setTaxMode("TAX_EXCLUSIVE"); setInventoryPostingMode("DIRECT_EXPENSE_OR_ASSET");
      setPartyId(""); setBranchId(""); setPaidThroughAccountId(""); setFrequency("MONTHLY"); setInterval("1"); setStartDate(new Date().toISOString().slice(0, 10)); setEndDate("");
      setTimezone(organization?.timezone ?? "Asia/Dubai"); setCatchUpPolicy("SKIP_MISSED"); setCurrencyCode(organization?.baseCurrency ?? "AED"); setExchangeRatePolicy("BASE_CURRENCY_ONLY");
      setFixedExchangeRate(""); setRateSnapshotId(""); setPaymentTermsDays("0"); setReference(""); setNotes(""); setLines([newLine()]); setError("");
    }
    previousOrganizationId.current = organization?.id ?? null;
  }, [initialTemplate, organization?.id]);

  useEffect(() => {
    if (!initialTemplate && organization?.timezone) setTimezone(organization.timezone);
    if (!initialTemplate && organization?.baseCurrency) setCurrencyCode(organization.baseCurrency);
  }, [initialTemplate, organization?.baseCurrency, organization?.timezone]);

  useEffect(() => {
    if (!organization?.id || !canManage) return;
    let cancelled = false;
    setLoading(true); setError("");
    apiRequest<{ contacts: Catalog[]; accounts: Catalog[]; items: Catalog[]; taxRates: Catalog[]; branches: Catalog[]; costCenters: Catalog[]; projects: Catalog[] }>("/recurring-transactions/catalogs").then(({ contacts: contactRows, accounts: accountRows, items: itemRows, taxRates: taxRows, branches: branchRows, costCenters: costCenterRows, projects: projectRows }) => {
      if (cancelled) return;
      setContacts(contactRows.filter((row) => row.isActive !== false));
      setAccounts(accountRows.filter((row) => row.isActive !== false && row.allowPosting !== false));
      setItems(itemRows.filter((row) => row.status !== "ARCHIVED")); setTaxRates(taxRows.filter((row) => row.isActive !== false));
      setBranches(branchRows); setCostCenters(costCenterRows.filter((row) => row.status !== "ARCHIVED")); setProjects(projectRows.filter((row) => row.status !== "ARCHIVED"));
    }).catch((loadError: unknown) => { if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Unable to load recurring setup catalogs."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [canManage, organization?.id]);

  function updateLine(id: string, patch: Partial<LineState>) { setLines((current) => current.map((line) => line.id === id ? { ...line, ...patch } : line)); }

  async function submit(event: FormEvent) {
    event.preventDefault(); setError("");
    if (!organization?.id) return setError("Select an organization before creating a recurring template.");
    if (!name.trim()) return setError("Template name is required.");
    if ((transactionType === "SALES_INVOICE" || transactionType === "PURCHASE_BILL") && !partyId) return setError("Select the customer or supplier for this template.");
    if (transactionType === "EXPENSE" && !paidThroughAccountId) return setError("Select the expected paid-through account for the expense proposal.");
    if (lines.some((line) => !line.description.trim() || !line.accountId)) return setError("Every line needs a description and posting account.");
    if (transactionType === "MANUAL_JOURNAL") {
      const debit = lines.reduce((sum, line) => sum + Number(line.debit || 0), 0); const credit = lines.reduce((sum, line) => sum + Number(line.credit || 0), 0);
      if (debit <= 0 || Math.abs(debit - credit) > 0.0001) return setError("Manual journal debits must equal credits and be greater than zero.");
    }
    const input: RecurringTemplateInput = {
      transactionType, name: name.trim(), description: templateDescription || null, timezone, frequency, interval: Number(interval), startDate,
      endDate: endDate || null, catchUpPolicy, currencyCode: currencyCode.toUpperCase(), exchangeRatePolicy,
      fixedExchangeRate: exchangeRatePolicy === "FIXED_TEMPLATE_RATE" ? fixedExchangeRate : null,
      rateSnapshotId: exchangeRatePolicy === "RATE_SNAPSHOT" ? rateSnapshotId : null,
      partyId: transactionType === "MANUAL_JOURNAL" ? null : partyId || null, branchId: branchId || null,
      paidThroughAccountId: transactionType === "EXPENSE" ? paidThroughAccountId || null : null,
      paymentTermsDays: Number(paymentTermsDays), reference: reference || null, notes: notes || null, terms: terms || null,
      taxMode: transactionType === "SALES_INVOICE" ? taxMode : null, inventoryPostingMode: transactionType === "PURCHASE_BILL" ? inventoryPostingMode : null,
      lines: lines.map((line, sortOrder) => ({ itemId: line.itemId || null, accountId: line.accountId, taxRateId: line.taxRateId || null, costCenterId: line.costCenterId || null, projectId: line.projectId || null, description: line.description.trim(), quantity: line.quantity, unitPrice: line.unitPrice, discountRate: line.discountRate, debit: line.debit, credit: line.credit, sortOrder })),
    };
    setSubmitting(true);
    try { const saved = initialTemplate ? await updateRecurringTemplate(initialTemplate.id, input, initialTemplate.templateVersion) : await createRecurringTemplate(input); router.push(`/recurring-transactions/${saved.id}`); }
    catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Unable to save recurring template."); }
    finally { setSubmitting(false); }
  }

  return <LedgerPage>
    <LedgerPageHeader eyebrow={initialTemplate?.templateCode ?? "Accounting automation"} title={initialTemplate ? `Edit ${initialTemplate.name}` : "New recurring template"} description="Define a repeatable source, schedule, dimensions, and FX evidence. The engine creates drafts for human review." badge="Draft only" actions={<LedgerButton href={initialTemplate ? `/recurring-transactions/${initialTemplate.id}` : "/recurring-transactions"}>Cancel</LedgerButton>} />
    <LedgerPageBody>
      <LedgerAlert tone="warning" title="No silent accounting">Saving creates only a template draft. Future runs create document drafts or expense proposals; nothing posts or moves money automatically.</LedgerAlert>
      {!organization ? <LedgerAlert tone="info">Select an organization before creating a template.</LedgerAlert> : null}
      {organization && !canManage ? <LedgerAlert tone="warning">Recurring transaction manage permission is required.</LedgerAlert> : null}
      {loading ? <LedgerAlert tone="info">Loading tenant catalogs…</LedgerAlert> : null}{error ? <LedgerAlert tone="danger">{error}</LedgerAlert> : null}
      {organization && canManage ? <form className="space-y-5" onSubmit={(event) => void submit(event)}>
        <LedgerPanel><h2 className="text-base font-semibold text-ink">Template identity</h2><div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Field label="Transaction type"><LedgerSelect aria-label="Transaction type" value={transactionType} onChange={(event) => { setTransactionType(event.target.value as RecurringTransactionType); setPartyId(""); }}><option value="SALES_INVOICE">Sales invoice</option><option value="PURCHASE_BILL">Purchase bill</option><option value="EXPENSE">Expense proposal</option><option value="MANUAL_JOURNAL">Manual journal</option></LedgerSelect></Field>
          <Field label="Template name"><LedgerInput aria-label="Template name" value={name} onChange={(event) => setName(event.target.value)} /></Field>
          <Field label="Document description"><LedgerInput aria-label="Document description" value={templateDescription} onChange={(event) => setTemplateDescription(event.target.value)} /></Field>
          {transactionType !== "MANUAL_JOURNAL" ? <Field label="Party"><LedgerSelect aria-label="Party" value={partyId} onChange={(event) => setPartyId(event.target.value)}><option value="">Select party</option>{contacts.filter((contact) => transactionType === "SALES_INVOICE" ? contact.type === "CUSTOMER" || contact.type === "BOTH" : transactionType === "PURCHASE_BILL" ? contact.type === "SUPPLIER" || contact.type === "BOTH" : true).map((contact) => <option key={contact.id} value={contact.id}>{contact.displayName || contact.name}</option>)}</LedgerSelect></Field> : null}
          <Field label="Branch"><LedgerSelect aria-label="Branch" value={branchId} onChange={(event) => setBranchId(event.target.value)}><option value="">Default branch</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.displayName || branch.name}</option>)}</LedgerSelect></Field>
          {transactionType === "EXPENSE" ? <Field label="Expected paid-through account"><LedgerSelect aria-label="Expected paid-through account" value={paidThroughAccountId} onChange={(event) => setPaidThroughAccountId(event.target.value)}><option value="">Select account</option>{accounts.map(option)}</LedgerSelect></Field> : null}
          <Field label="Reference"><LedgerInput aria-label="Reference" value={reference} onChange={(event) => setReference(event.target.value)} /></Field>
          <Field label="Notes"><LedgerInput aria-label="Notes" value={notes} onChange={(event) => setNotes(event.target.value)} /></Field>
          <Field label="Terms"><LedgerInput aria-label="Terms" value={terms} onChange={(event) => setTerms(event.target.value)} /></Field>
          {transactionType === "SALES_INVOICE" ? <Field label="Tax mode"><LedgerSelect aria-label="Tax mode" value={taxMode ?? "TAX_EXCLUSIVE"} onChange={(event) => setTaxMode(event.target.value)}><option value="TAX_EXCLUSIVE">Tax exclusive</option><option value="TAX_INCLUSIVE">Tax inclusive</option><option value="NO_TAX">No tax</option></LedgerSelect></Field> : null}
          {transactionType === "PURCHASE_BILL" ? <Field label="Inventory posting"><LedgerSelect aria-label="Inventory posting" value={inventoryPostingMode ?? "DIRECT_EXPENSE_OR_ASSET"} onChange={(event) => setInventoryPostingMode(event.target.value)}><option value="DIRECT_EXPENSE_OR_ASSET">Direct expense or asset</option><option value="INVENTORY_CLEARING">Inventory clearing</option></LedgerSelect></Field> : null}
        </div></LedgerPanel>
        <LedgerPanel><h2 className="text-base font-semibold text-ink">Schedule</h2><div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Frequency"><LedgerSelect aria-label="Frequency" value={frequency} onChange={(event) => setFrequency(event.target.value as RecurringTemplateInput["frequency"])}><option value="DAILY">Daily</option><option value="WEEKLY">Weekly</option><option value="MONTHLY">Monthly</option><option value="QUARTERLY">Quarterly</option><option value="YEARLY">Yearly</option></LedgerSelect></Field>
          <Field label="Every"><LedgerInput aria-label="Schedule interval" type="number" min="1" max="24" value={interval} onChange={(event) => setInterval(event.target.value)} /></Field>
          <Field label="Start date"><LedgerInput aria-label="Start date" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></Field><Field label="End date"><LedgerInput aria-label="End date" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} /></Field>
          <Field label="Timezone"><LedgerInput aria-label="Timezone" dir="ltr" value={timezone} onChange={(event) => setTimezone(event.target.value)} /></Field>
          <Field label="Catch-up policy"><LedgerSelect aria-label="Catch-up policy" value={catchUpPolicy} onChange={(event) => setCatchUpPolicy(event.target.value as RecurringTemplateInput["catchUpPolicy"])}><option value="SKIP_MISSED">Skip missed</option><option value="GENERATE_LATEST_ONLY">Generate latest only</option><option value="GENERATE_ALL">Generate all (bounded)</option></LedgerSelect></Field>
          <Field label="Payment terms days"><LedgerInput aria-label="Payment terms days" type="number" min="0" value={paymentTermsDays} onChange={(event) => setPaymentTermsDays(event.target.value)} /></Field>
        </div><SchedulePreview startDate={startDate} endDate={endDate} frequency={frequency} interval={Number(interval)} timezone={timezone} /></LedgerPanel>
        <LedgerPanel><h2 className="text-base font-semibold text-ink">Currency and rate evidence</h2><div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <Field label="Currency"><LedgerInput aria-label="Currency" dir="ltr" maxLength={3} value={currencyCode} onChange={(event) => setCurrencyCode(event.target.value)} /></Field>
          <Field label="Exchange-rate policy"><LedgerSelect aria-label="Exchange-rate policy" value={exchangeRatePolicy} onChange={(event) => setExchangeRatePolicy(event.target.value as RecurringTemplateInput["exchangeRatePolicy"])}><option value="BASE_CURRENCY_ONLY">Base currency only</option><option value="FIXED_TEMPLATE_RATE">Fixed template rate</option><option value="REQUIRE_RATE_AT_RUN">Require rate at run</option><option value="RATE_SNAPSHOT">Approved rate snapshot</option></LedgerSelect></Field>
          {exchangeRatePolicy === "FIXED_TEMPLATE_RATE" ? <Field label="Fixed exchange rate"><LedgerInput aria-label="Fixed exchange rate" dir="ltr" value={fixedExchangeRate} onChange={(event) => setFixedExchangeRate(event.target.value)} /></Field> : null}
          {exchangeRatePolicy === "RATE_SNAPSHOT" ? <Field label="Rate snapshot ID"><LedgerInput aria-label="Rate snapshot ID" dir="ltr" value={rateSnapshotId} onChange={(event) => setRateSnapshotId(event.target.value)} /></Field> : null}
        </div><p className="mt-3 text-xs leading-5 text-steel">Foreign-currency schedules fail closed when the selected evidence is absent or invalid. Existing posted accounting is never rewritten.</p></LedgerPanel>
        <LedgerPanel><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-base font-semibold text-ink">Source lines and dimensions</h2>{transactionType === "MANUAL_JOURNAL" ? <p className="mt-1 text-sm text-steel">Manual journal debits must equal credits before the template can be saved.</p> : null}</div><LedgerButton icon={Plus} onClick={() => setLines((current) => [...current, newLine()])}>Add line</LedgerButton></div>
          <div className="mt-4 space-y-4">{lines.map((line, index) => <div key={line.id} className="rounded-md border border-line bg-slate-50 p-3"><div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
            <Field label={`Description for line ${index + 1}`}><LedgerInput aria-label={`Description for line ${index + 1}`} value={line.description} onChange={(event) => updateLine(line.id, { description: event.target.value })} /></Field>
            <Field label={`Account for line ${index + 1}`}><LedgerSelect aria-label={`Account for line ${index + 1}`} value={line.accountId} onChange={(event) => updateLine(line.id, { accountId: event.target.value })}><option value="">Select account</option>{accounts.map(option)}</LedgerSelect></Field>
            <Field label={`Cost center for line ${index + 1}`}><LedgerSelect aria-label={`Cost center for line ${index + 1}`} value={line.costCenterId} onChange={(event) => updateLine(line.id, { costCenterId: event.target.value })}><option value="">No cost center</option>{costCenters.map(option)}</LedgerSelect></Field>
            <Field label={`Project for line ${index + 1}`}><LedgerSelect aria-label={`Project for line ${index + 1}`} value={line.projectId} onChange={(event) => updateLine(line.id, { projectId: event.target.value })}><option value="">No project</option>{projects.map(option)}</LedgerSelect></Field>
            {transactionType !== "MANUAL_JOURNAL" ? <><Field label={`Item for line ${index + 1}`}><LedgerSelect aria-label={`Item for line ${index + 1}`} value={line.itemId} onChange={(event) => updateLine(line.id, { itemId: event.target.value })}><option value="">No item</option>{items.map(option)}</LedgerSelect></Field><Field label={`Quantity for line ${index + 1}`}><LedgerInput aria-label={`Quantity for line ${index + 1}`} dir="ltr" value={line.quantity} onChange={(event) => updateLine(line.id, { quantity: event.target.value })} /></Field><Field label={`Unit price for line ${index + 1}`}><LedgerInput aria-label={`Unit price for line ${index + 1}`} dir="ltr" value={line.unitPrice} onChange={(event) => updateLine(line.id, { unitPrice: event.target.value })} /></Field><Field label={`Tax rate for line ${index + 1}`}><LedgerSelect aria-label={`Tax rate for line ${index + 1}`} value={line.taxRateId} onChange={(event) => updateLine(line.id, { taxRateId: event.target.value })}><option value="">No tax</option>{taxRates.map(option)}</LedgerSelect></Field></> : <><Field label={`Debit for line ${index + 1}`}><LedgerInput aria-label={`Debit for line ${index + 1}`} dir="ltr" value={line.debit} onChange={(event) => updateLine(line.id, { debit: event.target.value })} /></Field><Field label={`Credit for line ${index + 1}`}><LedgerInput aria-label={`Credit for line ${index + 1}`} dir="ltr" value={line.credit} onChange={(event) => updateLine(line.id, { credit: event.target.value })} /></Field></>}
          </div>{lines.length > 1 ? <div className="mt-3"><LedgerButton icon={Trash2} size="sm" variant="danger" onClick={() => setLines((current) => current.filter((candidate) => candidate.id !== line.id))}>Remove line</LedgerButton></div> : null}</div>)}</div>
        </LedgerPanel>
        <div className="flex flex-wrap justify-end gap-2"><LedgerButton href={initialTemplate ? `/recurring-transactions/${initialTemplate.id}` : "/recurring-transactions"}>Cancel</LedgerButton><LedgerButton type="submit" icon={FilePlus2} variant="primary" disabled={submitting || loading}>{submitting ? "Saving…" : initialTemplate ? "Save template changes" : "Save draft template"}</LedgerButton></div>
      </form> : null}
    </LedgerPageBody>
  </LedgerPage>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <LedgerFieldLabel><LedgerFieldText>{label}</LedgerFieldText><div className={fieldClass}>{children}</div></LedgerFieldLabel>; }
function option(row: Catalog) { return <option key={row.id} value={row.id}>{row.code ? `${row.code} · ` : ""}{row.displayName || row.name}</option>; }

function SchedulePreview({ startDate, endDate, frequency, interval, timezone }: { startDate: string; endDate: string; frequency: RecurringTemplateInput["frequency"]; interval: number; timezone: string }) {
  const dates = previewLocalDates(startDate, endDate, frequency, interval);
  return <div className="mt-4 rounded-md border border-line bg-slate-50 p-3"><h3 className="text-sm font-semibold text-ink">Next occurrence preview</h3><p className="mt-1 text-xs text-steel">Local calendar dates in <bdi dir="ltr">{timezone}</bdi>. The API remains authoritative for the canonical scheduled timestamp.</p><div className="mt-2 flex flex-wrap gap-2">{dates.length ? dates.map((date) => <bdi key={date} dir="ltr" className="rounded-md border border-line bg-white px-2 py-1 font-mono text-xs text-ink">{date}</bdi>) : <span className="text-xs text-steel">Enter a valid start date and interval.</span>}</div></div>;
}

function previewLocalDates(startDate: string, endDate: string, frequency: RecurringTemplateInput["frequency"], interval: number): string[] {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !Number.isInteger(interval) || interval < 1) return [];
  const [year, month, day] = startDate.split("-").map(Number) as [number, number, number];
  const anchor = day; const results: string[] = [];
  for (let index = 0; index < 3; index += 1) {
    let date: Date;
    if (frequency === "DAILY" || frequency === "WEEKLY") date = new Date(Date.UTC(year, month - 1, day + index * interval * (frequency === "WEEKLY" ? 7 : 1)));
    else {
      const months = index * interval * (frequency === "QUARTERLY" ? 3 : frequency === "YEARLY" ? 12 : 1);
      const targetMonth = month - 1 + months; const targetYear = year + Math.floor(targetMonth / 12); const normalizedMonth = ((targetMonth % 12) + 12) % 12;
      const lastDay = new Date(Date.UTC(targetYear, normalizedMonth + 1, 0)).getUTCDate();
      date = new Date(Date.UTC(targetYear, normalizedMonth, Math.min(anchor, lastDay)));
    }
    const value = date.toISOString().slice(0, 10); if (endDate && value > endDate) break; results.push(value);
  }
  return results;
}
