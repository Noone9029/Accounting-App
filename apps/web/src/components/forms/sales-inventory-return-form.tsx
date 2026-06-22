"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
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
  LedgerPanel,
  LedgerSelect,
} from "@/components/ui/ledger-system";
import { Textarea } from "@/components/ui/textarea";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { safeReturnToFromSearch } from "@/lib/parties";
import { SALES_INVENTORY_RETURN_SAFE_HELPER_TEXT } from "@/lib/sales-inventory-returns";
import type { Contact, CreditNote, DeliveryNote, Item, SalesInventoryReturn, SalesInvoice, SalesStockIssue, Warehouse } from "@/lib/types";

type SourceType = "direct" | "invoice" | "creditNote" | "deliveryNote" | "stockIssue";

interface SalesInventoryReturnLineState {
  id: string;
  itemId: string;
  description: string;
  quantity: string;
  sourceSalesInvoiceLineId: string;
  sourceCreditNoteLineId: string;
  sourceDeliveryNoteLineId: string;
  sourceSalesStockIssueLineId: string;
  warehouseId: string;
  reason: string;
}

interface SalesInventoryReturnFormProps {
  initialSalesInventoryReturn?: SalesInventoryReturn;
  initialCustomerId?: string;
}

interface SalesInventoryReturnNumberPreview {
  salesReturnNumber: string;
  helperText: string;
}

function makeLine(): SalesInventoryReturnLineState {
  return {
    id: globalThis.crypto?.randomUUID?.() ?? `sales-inventory-return-line-${Date.now()}-${Math.random()}`,
    itemId: "",
    description: "",
    quantity: "1.0000",
    sourceSalesInvoiceLineId: "",
    sourceCreditNoteLineId: "",
    sourceDeliveryNoteLineId: "",
    sourceSalesStockIssueLineId: "",
    warehouseId: "",
    reason: "",
  };
}

function todayInputValue(): string {
  return new Date().toISOString().slice(0, 10);
}

function dateInputValue(value?: string | null, fallback = todayInputValue()): string {
  return value ? new Date(value).toISOString().slice(0, 10) : fallback;
}

export function SalesInventoryReturnForm({ initialSalesInventoryReturn, initialCustomerId = "" }: SalesInventoryReturnFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const organizationId = useActiveOrganizationId();
  const [customers, setCustomers] = useState<Contact[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [salesInvoices, setSalesInvoices] = useState<SalesInvoice[]>([]);
  const [creditNotes, setCreditNotes] = useState<CreditNote[]>([]);
  const [deliveryNotes, setDeliveryNotes] = useState<DeliveryNote[]>([]);
  const [salesStockIssues, setSalesStockIssues] = useState<SalesStockIssue[]>([]);
  const [customerId, setCustomerId] = useState(initialSalesInventoryReturn?.customerId ?? initialCustomerId ?? searchParams.get("customerId") ?? "");
  const [returnDate, setReturnDate] = useState(dateInputValue(initialSalesInventoryReturn?.returnDate));
  const [reason, setReason] = useState(initialSalesInventoryReturn?.reason ?? "");
  const [reference, setReference] = useState(initialSalesInventoryReturn?.reference ?? "");
  const [notes, setNotes] = useState(initialSalesInventoryReturn?.notes ?? "");
  const [sourceType, setSourceType] = useState<SourceType>(initialSourceType(initialSalesInventoryReturn));
  const [sourceSalesInvoiceId, setSourceSalesInvoiceId] = useState(initialSalesInventoryReturn?.sourceSalesInvoiceId ?? searchParams.get("salesInvoiceId") ?? "");
  const [sourceCreditNoteId, setSourceCreditNoteId] = useState(initialSalesInventoryReturn?.sourceCreditNoteId ?? searchParams.get("creditNoteId") ?? "");
  const [sourceDeliveryNoteId, setSourceDeliveryNoteId] = useState(initialSalesInventoryReturn?.sourceDeliveryNoteId ?? searchParams.get("deliveryNoteId") ?? "");
  const [sourceSalesStockIssueId, setSourceSalesStockIssueId] = useState(initialSalesInventoryReturn?.sourceSalesStockIssueId ?? searchParams.get("salesStockIssueId") ?? "");
  const [lines, setLines] = useState<SalesInventoryReturnLineState[]>(
    initialSalesInventoryReturn?.lines?.map((line) => ({
      id: line.id,
      itemId: line.itemId ?? "",
      description: line.description,
      quantity: line.quantity,
      sourceSalesInvoiceLineId: line.sourceSalesInvoiceLineId ?? "",
      sourceCreditNoteLineId: line.sourceCreditNoteLineId ?? "",
      sourceDeliveryNoteLineId: line.sourceDeliveryNoteLineId ?? "",
      sourceSalesStockIssueLineId: line.sourceSalesStockIssueLineId ?? "",
      warehouseId: line.warehouseId ?? "",
      reason: line.reason ?? "",
    })) ?? [makeLine()],
  );
  const [numberPreview, setNumberPreview] = useState<SalesInventoryReturnNumberPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [returnTo, setReturnTo] = useState("");

  const activeCustomers = useMemo(() => customers.filter((customer) => customer.isActive && (customer.type === "CUSTOMER" || customer.type === "BOTH")), [customers]);
  const activeItems = useMemo(() => items.filter((item) => item.status === "ACTIVE"), [items]);
  const activeWarehouses = useMemo(() => warehouses.filter((warehouse) => warehouse.status === "ACTIVE"), [warehouses]);
  const filteredInvoices = useMemo(() => salesInvoices.filter((invoice) => invoice.status !== "VOIDED" && (!customerId || invoice.customerId === customerId)), [customerId, salesInvoices]);
  const filteredCreditNotes = useMemo(() => creditNotes.filter((creditNote) => creditNote.status !== "VOIDED" && (!customerId || creditNote.customerId === customerId)), [creditNotes, customerId]);
  const filteredDeliveryNotes = useMemo(() => deliveryNotes.filter((deliveryNote) => deliveryNote.status === "DELIVERED" && (!customerId || deliveryNote.customerId === customerId)), [customerId, deliveryNotes]);
  const filteredStockIssues = useMemo(() => salesStockIssues.filter((issue) => issue.status === "POSTED" && (!customerId || issue.customerId === customerId)), [customerId, salesStockIssues]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setReturnTo(safeReturnToFromSearch(window.location.search));
    }
  }, []);

  useEffect(() => {
    if (!organizationId) return;

    let cancelled = false;
    setLoading(true);
    setError("");

    Promise.all([
      apiRequest<Contact[]>("/contacts"),
      apiRequest<Item[]>("/items"),
      apiRequest<Warehouse[]>("/warehouses"),
      apiRequest<SalesInvoice[]>("/sales-invoices"),
      apiRequest<CreditNote[]>("/credit-notes"),
      apiRequest<DeliveryNote[]>("/delivery-notes"),
      apiRequest<SalesStockIssue[]>("/sales-stock-issues"),
      initialSalesInventoryReturn ? Promise.resolve(null) : apiRequest<SalesInventoryReturnNumberPreview>("/sales-inventory-returns/next-number"),
    ])
      .then(([contactResult, itemResult, warehouseResult, invoiceResult, creditNoteResult, deliveryNoteResult, stockIssueResult, numberResult]) => {
        if (cancelled) return;
        setCustomers(contactResult);
        setItems(itemResult);
        setWarehouses(warehouseResult);
        setSalesInvoices(invoiceResult);
        setCreditNotes(creditNoteResult);
        setDeliveryNotes(deliveryNoteResult);
        setSalesStockIssues(stockIssueResult);
        setNumberPreview(numberResult);
      })
      .catch((loadError: unknown) => {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Unable to load sales inventory return setup data.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [initialSalesInventoryReturn, organizationId]);

  function updateLine(lineId: string, patch: Partial<SalesInventoryReturnLineState>) {
    setLines((current) => current.map((line) => (line.id === lineId ? { ...line, ...patch } : line)));
  }

  function selectItem(lineId: string, itemId: string) {
    const item = items.find((candidate) => candidate.id === itemId);
    updateLine(lineId, {
      itemId,
      description: item ? item.description ?? item.name : "",
    });
  }

  async function copyFromInvoice(invoiceId: string) {
    setSourceType("invoice");
    setSourceSalesInvoiceId(invoiceId);
    setSourceCreditNoteId("");
    setSourceDeliveryNoteId("");
    setSourceSalesStockIssueId("");
    if (!invoiceId) return;
    try {
      const invoice = await apiRequest<SalesInvoice>(`/sales-invoices/${invoiceId}`);
      setCustomerId(invoice.customerId);
      setReference(invoice.invoiceNumber);
      setLines(
        (invoice.lines ?? []).map((line) => ({
          ...makeLine(),
          itemId: line.itemId ?? "",
          description: line.description,
          quantity: line.quantity,
          sourceSalesInvoiceLineId: line.id,
        })),
      );
    } catch (copyError) {
      setError(copyError instanceof Error ? copyError.message : "Unable to copy invoice lines.");
    }
  }

  async function copyFromCreditNote(creditNoteId: string) {
    setSourceType("creditNote");
    setSourceCreditNoteId(creditNoteId);
    setSourceSalesInvoiceId("");
    setSourceDeliveryNoteId("");
    setSourceSalesStockIssueId("");
    if (!creditNoteId) return;
    try {
      const creditNote = await apiRequest<CreditNote>(`/credit-notes/${creditNoteId}`);
      setCustomerId(creditNote.customerId);
      setReference(creditNote.creditNoteNumber);
      setReason(creditNote.reason ?? reason);
      setLines(
        (creditNote.lines ?? []).map((line) => ({
          ...makeLine(),
          itemId: line.itemId ?? "",
          description: line.description,
          quantity: line.quantity,
          sourceCreditNoteLineId: line.id,
        })),
      );
    } catch (copyError) {
      setError(copyError instanceof Error ? copyError.message : "Unable to copy credit note lines.");
    }
  }

  async function copyFromDeliveryNote(deliveryNoteId: string) {
    setSourceType("deliveryNote");
    setSourceDeliveryNoteId(deliveryNoteId);
    setSourceSalesInvoiceId("");
    setSourceCreditNoteId("");
    setSourceSalesStockIssueId("");
    if (!deliveryNoteId) return;
    try {
      const deliveryNote = await apiRequest<DeliveryNote>(`/delivery-notes/${deliveryNoteId}`);
      setCustomerId(deliveryNote.customerId);
      setReference(deliveryNote.deliveryNoteNumber);
      setLines(
        (deliveryNote.lines ?? []).map((line) => ({
          ...makeLine(),
          itemId: line.itemId ?? "",
          description: line.description,
          quantity: line.quantity,
          sourceDeliveryNoteLineId: line.id,
        })),
      );
    } catch (copyError) {
      setError(copyError instanceof Error ? copyError.message : "Unable to copy delivery note lines.");
    }
  }

  async function copyFromStockIssue(issueId: string) {
    setSourceType("stockIssue");
    setSourceSalesStockIssueId(issueId);
    setSourceSalesInvoiceId("");
    setSourceCreditNoteId("");
    setSourceDeliveryNoteId("");
    if (!issueId) return;
    try {
      const issue = await apiRequest<SalesStockIssue>(`/sales-stock-issues/${issueId}`);
      setCustomerId(issue.customerId);
      setReference(issue.issueNumber);
      setLines(
        (issue.lines ?? []).map((line) => ({
          ...makeLine(),
          itemId: line.itemId,
          description: line.salesInvoiceLine?.description ?? line.item?.name ?? "Returned item",
          quantity: line.quantity,
          sourceSalesStockIssueLineId: line.id,
          warehouseId: issue.warehouseId,
        })),
      );
    } catch (copyError) {
      setError(copyError instanceof Error ? copyError.message : "Unable to copy sales stock issue lines.");
    }
  }

  function removeLine(lineId: string) {
    setLines((current) => (current.length > 1 ? current.filter((line) => line.id !== lineId) : current));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const validationError = getValidationError({ customerId, returnDate, lines });
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    const body = {
      customerId,
      returnDate: `${returnDate}T00:00:00.000Z`,
      reason: reason || undefined,
      reference: reference || undefined,
      sourceSalesInvoiceId: sourceType === "invoice" ? sourceSalesInvoiceId || null : null,
      sourceCreditNoteId: sourceType === "creditNote" ? sourceCreditNoteId || null : null,
      sourceDeliveryNoteId: sourceType === "deliveryNote" ? sourceDeliveryNoteId || null : null,
      sourceSalesStockIssueId: sourceType === "stockIssue" ? sourceSalesStockIssueId || null : null,
      notes: notes || undefined,
      lines: lines.map((line, index) => ({
        itemId: line.itemId || undefined,
        description: line.description || undefined,
        quantity: line.quantity,
        sourceSalesInvoiceLineId: sourceType === "invoice" ? line.sourceSalesInvoiceLineId || undefined : undefined,
        sourceCreditNoteLineId: sourceType === "creditNote" ? line.sourceCreditNoteLineId || undefined : undefined,
        sourceDeliveryNoteLineId: sourceType === "deliveryNote" ? line.sourceDeliveryNoteLineId || undefined : undefined,
        sourceSalesStockIssueLineId: sourceType === "stockIssue" ? line.sourceSalesStockIssueLineId || undefined : undefined,
        warehouseId: line.warehouseId || undefined,
        reason: line.reason || undefined,
        sortOrder: index,
      })),
    };

    try {
      const salesReturn = initialSalesInventoryReturn
        ? await apiRequest<SalesInventoryReturn>(`/sales-inventory-returns/${initialSalesInventoryReturn.id}`, { method: "PATCH", body })
        : await apiRequest<SalesInventoryReturn>("/sales-inventory-returns", { method: "POST", body });
      router.push(returnTo || `/sales/inventory-returns/${salesReturn.id}`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to save sales inventory return.");
    } finally {
      setSubmitting(false);
    }
  }

  if (initialSalesInventoryReturn && initialSalesInventoryReturn.status !== "DRAFT") {
    return (
      <LedgerPanel>
        <LedgerAlert tone="danger">Only draft sales inventory returns can be edited.</LedgerAlert>
        <LedgerButton href={`/sales/inventory-returns/${initialSalesInventoryReturn.id}`} className="mt-4">
          Back to sales inventory return
        </LedgerButton>
      </LedgerPanel>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <LedgerAlert tone="warning">{SALES_INVENTORY_RETURN_SAFE_HELPER_TEXT}</LedgerAlert>

      <LedgerFormSection title="Return details">
        <LedgerFieldLabel className="md:col-span-2">
          <LedgerFieldText>Customer</LedgerFieldText>
          <LedgerSelect value={customerId} onChange={(event) => setCustomerId(event.target.value)} required>
              <option value="">Select customer</option>
              {activeCustomers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.displayName ?? customer.name}
                </option>
              ))}
          </LedgerSelect>
        </LedgerFieldLabel>
        <LedgerFieldLabel>
          <LedgerFieldText>Return number</LedgerFieldText>
          <LedgerInput value={initialSalesInventoryReturn?.salesReturnNumber ?? numberPreview?.salesReturnNumber ?? "From sequence"} readOnly aria-label="Sales inventory return number" className="bg-slate-50 text-slate-700" />
          <LedgerFieldHelp>
            {initialSalesInventoryReturn ? "Number assigned from the sales inventory return sequence." : (numberPreview?.helperText ?? "Assigned from the sales inventory return sequence when saved.")}
          </LedgerFieldHelp>
        </LedgerFieldLabel>
        <LedgerFieldLabel>
          <LedgerFieldText>Return date</LedgerFieldText>
          <LedgerInput value={returnDate} onChange={(event) => setReturnDate(event.target.value)} type="date" required />
        </LedgerFieldLabel>
        <LedgerFieldLabel className="md:col-span-2">
          <LedgerFieldText>Reason</LedgerFieldText>
          <LedgerInput value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Optional return reason" />
        </LedgerFieldLabel>
        <LedgerFieldLabel>
          <LedgerFieldText>Reference</LedgerFieldText>
          <LedgerInput value={reference} onChange={(event) => setReference(event.target.value)} placeholder="RMA or source reference" />
        </LedgerFieldLabel>
        <LedgerFieldLabel className="md:col-span-2">
          <LedgerFieldText>Notes</LedgerFieldText>
          <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} />
        </LedgerFieldLabel>
      </LedgerFormSection>

      <LedgerFormSection title="Source document" description="Source links are for traceability and warehouse validation. Credit notes stay separate from stock movement unless explicit return lines and warehouses are supplied here.">
        <LedgerFieldLabel>
          <LedgerFieldText>Source type</LedgerFieldText>
          <LedgerSelect value={sourceType} onChange={(event) => setSourceType(event.target.value as SourceType)}>
              <option value="direct">Customer direct</option>
              <option value="stockIssue">Sales stock issue</option>
              <option value="deliveryNote">Delivery note</option>
              <option value="invoice">Sales invoice</option>
              <option value="creditNote">Credit note reference</option>
          </LedgerSelect>
        </LedgerFieldLabel>
        {sourceType === "invoice" ? (
          <SourceSelect label="Sales invoice" value={sourceSalesInvoiceId} onChange={copyFromInvoice} options={filteredInvoices.map((invoice) => ({ id: invoice.id, label: invoice.invoiceNumber }))} />
        ) : null}
        {sourceType === "creditNote" ? (
          <SourceSelect label="Credit note" value={sourceCreditNoteId} onChange={copyFromCreditNote} options={filteredCreditNotes.map((creditNote) => ({ id: creditNote.id, label: creditNote.creditNoteNumber }))} />
        ) : null}
        {sourceType === "deliveryNote" ? (
          <SourceSelect label="Delivery note" value={sourceDeliveryNoteId} onChange={copyFromDeliveryNote} options={filteredDeliveryNotes.map((deliveryNote) => ({ id: deliveryNote.id, label: deliveryNote.deliveryNoteNumber }))} />
        ) : null}
        {sourceType === "stockIssue" ? (
          <SourceSelect label="Sales stock issue" value={sourceSalesStockIssueId} onChange={copyFromStockIssue} options={filteredStockIssues.map((issue) => ({ id: issue.id, label: issue.issueNumber }))} />
        ) : null}
      </LedgerFormSection>

      <LedgerPanel>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-ink">Return lines</h2>
          <LedgerButton type="button" onClick={() => setLines((current) => [...current, makeLine()])}>
            Add line
          </LedgerButton>
        </div>

        <LedgerDataTable minWidth="1080px" className="shadow-none">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
                <tr>
                  <th className="px-3 py-2">Item</th>
                  <th className="px-3 py-2">Description</th>
                  <th className="px-3 py-2">Quantity</th>
                  <th className="px-3 py-2">Warehouse</th>
                  <th className="px-3 py-2">Reason</th>
                  <th className="px-3 py-2">Source line</th>
                  <th className="px-3 py-2">Action</th>
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
                            {item.sku ? `${item.sku} - ` : ""}{item.name}
                          </option>
                        ))}
                      </LedgerSelect>
                    </td>
                    <td className="px-3 py-2">
                      <LedgerInput value={line.description} onChange={(event) => updateLine(line.id, { description: event.target.value })} required className="w-64" />
                    </td>
                    <td className="px-3 py-2">
                      <LedgerInput value={line.quantity} onChange={(event) => updateLine(line.id, { quantity: event.target.value })} required inputMode="decimal" className="w-28" />
                    </td>
                    <td className="px-3 py-2">
                      <LedgerSelect value={line.warehouseId} onChange={(event) => updateLine(line.id, { warehouseId: event.target.value })} className="w-48">
                        <option value="">Select if stock tracked</option>
                        {activeWarehouses.map((warehouse) => (
                          <option key={warehouse.id} value={warehouse.id}>
                            {warehouse.code} {warehouse.name}
                          </option>
                        ))}
                      </LedgerSelect>
                    </td>
                    <td className="px-3 py-2">
                      <LedgerInput value={line.reason} onChange={(event) => updateLine(line.id, { reason: event.target.value })} className="w-48" />
                    </td>
                    <td className="px-3 py-2 text-xs text-steel">{sourceLineLabel(line)}</td>
                    <td className="px-3 py-2">
                      <LedgerButton type="button" onClick={() => removeLine(line.id)} size="sm">
                        Remove
                      </LedgerButton>
                    </td>
                  </tr>
                ))}
              </tbody>
        </LedgerDataTable>
      </LedgerPanel>

      <LedgerActionBar className="justify-end">
        <LedgerButton href={returnTo || "/sales/inventory-returns"}>
          Cancel
        </LedgerButton>
        <LedgerButton type="submit" disabled={submitting || loading} variant="primary">
          {submitting ? "Saving..." : initialSalesInventoryReturn ? "Save changes" : "Save draft"}
        </LedgerButton>
      </LedgerActionBar>

      {error ? <LedgerAlert tone="danger">{error}</LedgerAlert> : null}
      {loading ? <StatusMessage type="loading">Loading form data...</StatusMessage> : null}
    </form>
  );
}

function SourceSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void | Promise<void>; options: Array<{ id: string; label: string }> }) {
  return (
    <LedgerFieldLabel className="md:col-span-2">
      <LedgerFieldText>{label}</LedgerFieldText>
      <LedgerSelect value={value} onChange={(event) => void onChange(event.target.value)}>
        <option value="">Select source</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </LedgerSelect>
    </LedgerFieldLabel>
  );
}

function initialSourceType(salesReturn?: SalesInventoryReturn): SourceType {
  if (!salesReturn) return "direct";
  if (salesReturn.sourceSalesStockIssueId) return "stockIssue";
  if (salesReturn.sourceDeliveryNoteId) return "deliveryNote";
  if (salesReturn.sourceSalesInvoiceId) return "invoice";
  if (salesReturn.sourceCreditNoteId) return "creditNote";
  return "direct";
}

function getValidationError({ customerId, returnDate, lines }: { customerId: string; returnDate: string; lines: SalesInventoryReturnLineState[] }): string {
  if (!customerId) return "Select a customer.";
  if (!returnDate) return "Enter a return date.";
  if (lines.length === 0) return "Add at least one return line.";
  if (lines.some((line) => Number(line.quantity) <= 0 || Number.isNaN(Number(line.quantity)))) return "Return quantities must be positive.";
  if (lines.some((line) => !line.description.trim())) return "Each return line needs a description.";
  return "";
}

function sourceLineLabel(line: SalesInventoryReturnLineState): string {
  if (line.sourceSalesStockIssueLineId) return "Sales stock issue line";
  if (line.sourceDeliveryNoteLineId) return "Delivery note line";
  if (line.sourceSalesInvoiceLineId) return "Invoice line";
  if (line.sourceCreditNoteLineId) return "Credit note line";
  return "Manual";
}
