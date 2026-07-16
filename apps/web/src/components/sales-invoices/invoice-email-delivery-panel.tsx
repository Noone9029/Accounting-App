"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { LedgerButton, LedgerFieldHelp, LedgerFieldLabel, LedgerFieldText, LedgerInput, LedgerPanel, LedgerStatusBadge, LedgerTextarea } from "@/components/ui/ledger-system";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { apiRequest } from "@/lib/api";
import { createEmailDeliveryIdempotencyKey, DEFAULT_SALES_INVOICE_MESSAGE, deliveryStatusLabel, deliveryStatusTone, formatDeliveryRecipient, invoiceEmailSubject } from "@/lib/email-deliveries";
import type { SalesInvoice, SalesInvoiceEmailDeliveryEntry } from "@/lib/types";

interface InvoiceEmailDeliveryPanelProps {
  invoice: SalesInvoice;
  organizationId: string | null;
  canSend: boolean;
}

type DeliveryForm = { recipientEmail: string; subject: string; message: string; idempotencyKey: string };

export function InvoiceEmailDeliveryPanel({ invoice, organizationId, canSend }: Readonly<InvoiceEmailDeliveryPanelProps>) {
  const [history, setHistory] = useState<SalesInvoiceEmailDeliveryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState<DeliveryForm>(() => initialForm(invoice));
  const historyRequestToken = useRef(0);

  useEffect(() => {
    const requestToken = ++historyRequestToken.current;
    setHistory([]);
    setHistoryError("");
    if (!organizationId || !invoice.id) {
      setHistoryLoading(false);
      return;
    }
    let cancelled = false;
    setHistoryLoading(true);
    apiRequest<SalesInvoiceEmailDeliveryEntry[]>(`/sales-invoices/${invoice.id}/email-deliveries`)
      .then((result) => {
        if (!cancelled && requestToken === historyRequestToken.current) setHistory(result);
      })
      .catch((error: unknown) => {
        if (!cancelled && requestToken === historyRequestToken.current) {
          setHistory([]);
          setHistoryError(error instanceof Error ? error.message : "Unable to load email delivery history.");
        }
      })
      .finally(() => {
        if (!cancelled && requestToken === historyRequestToken.current) setHistoryLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [invoice.id, organizationId]);

  function openDialog() {
    setForm(initialForm(invoice));
    setFormError("");
    setSuccess("");
    setOpen(true);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setFormError("");
    const requestToken = historyRequestToken.current;
    try {
      await apiRequest<SalesInvoiceEmailDeliveryEntry>(`/sales-invoices/${invoice.id}/email-deliveries`, {
        method: "POST",
        body: {
          recipientEmail: form.recipientEmail || undefined,
          subject: form.subject || undefined,
          message: form.message || undefined,
          idempotencyKey: form.idempotencyKey,
        },
      });
      setOpen(false);
      setSuccess("Invoice queued for email delivery.");
      const refreshed = await apiRequest<SalesInvoiceEmailDeliveryEntry[]>(`/sales-invoices/${invoice.id}/email-deliveries`);
      if (requestToken === historyRequestToken.current) setHistory(refreshed);
    } catch (error: unknown) {
      setFormError(error instanceof Error ? error.message : "Unable to queue invoice email delivery.");
    } finally {
      setSubmitting(false);
    }
  }

  const canOpen = canSend && invoice.status === "FINALIZED";

  return (
    <LedgerPanel>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-ink">Email delivery</h2>
          <p className="mt-1 text-sm leading-6 text-steel">Queue the archived invoice PDF for delivery and review its safe status history.</p>
        </div>
        {canOpen ? <LedgerButton variant="primary" onClick={openDialog}>Send invoice</LedgerButton> : null}
      </div>
      {invoice.status !== "FINALIZED" ? <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Only finalized invoices can be queued for email delivery.</p> : null}
      {!canSend && invoice.status === "FINALIZED" ? <p className="mt-3 text-sm text-steel">You do not have permission to send invoices by email.</p> : null}
      {success ? <p role="status" className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{success}</p> : null}
      <div className="mt-4 border-t border-slate-100 pt-4">
        <h3 className="text-sm font-semibold text-ink">Delivery history</h3>
        {historyLoading ? <p className="mt-3 text-sm text-steel">Loading delivery history...</p> : null}
        {historyError ? <p className="mt-3 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rosewood">{historyError}</p> : null}
        {!historyLoading && !historyError && history.length === 0 ? <p className="mt-3 text-sm text-steel">No invoice email deliveries queued yet.</p> : null}
        {history.length > 0 ? (
          <div className="mt-3 space-y-2">
            {history.map((entry) => (
              <div key={entry.id} className="grid gap-2 rounded-md border border-slate-200 bg-slate-50/60 p-3 text-sm md:grid-cols-[1.3fr_1fr_1fr_auto] md:items-center">
                <div><div className="font-medium text-ink">{deliveryStatusLabel(entry)}</div><div className="text-xs text-steel">{formatDeliveryRecipient(entry.maskedRecipient)} · {entry.attachmentFilename ?? "No attachment"}</div><div className="text-xs text-steel">Requested {formatDeliveryDate(entry.createdAt)}</div></div>
                <div className="text-xs text-steel">{entry.provider} · {entry.attemptCount} attempt{entry.attemptCount === 1 ? "" : "s"}{entry.latestAttemptAt ? ` · Attempted ${formatDeliveryDate(entry.latestAttemptAt)}` : ""}{entry.nextAttemptAt ? ` · Retry ${formatDeliveryDate(entry.nextAttemptAt)}` : ""}</div>
                <div className="text-xs text-steel">{entry.requestedBy?.name ?? "Unknown requester"}{entry.bouncedAt ? ` · Bounced ${formatDeliveryDate(entry.bouncedAt)}` : ""}{entry.complainedAt ? ` · Complaint ${formatDeliveryDate(entry.complainedAt)}` : ""}{entry.suppressionStatus ? ` · ${entry.suppressionStatus}` : ""}</div>
                <LedgerStatusBadge tone={deliveryStatusTone(entry.status)}>{deliveryStatusLabel(entry)}</LedgerStatusBadge>
                {entry.safeError ? <div className="text-xs text-rosewood md:col-span-4">{entry.safeError}</div> : null}
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <Dialog open={open} onOpenChange={(nextOpen) => { if (!submitting) setOpen(nextOpen); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Send invoice</DialogTitle>
            <DialogDescription>Queue the finalized invoice PDF. This action does not confirm delivery or contact a customer immediately.</DialogDescription>
          </DialogHeader>
          <form onSubmit={(event) => void submit(event)} className="space-y-4">
            <LedgerFieldLabel htmlFor="invoice-delivery-recipient"><LedgerFieldText>Recipient email</LedgerFieldText><LedgerInput id="invoice-delivery-recipient" type="email" value={form.recipientEmail} onChange={(event) => setForm((current) => ({ ...current, recipientEmail: event.target.value }))} disabled={submitting} required /><LedgerFieldHelp>Prefilled from the customer when available; you can override it for this delivery.</LedgerFieldHelp></LedgerFieldLabel>
            <LedgerFieldLabel htmlFor="invoice-delivery-subject"><LedgerFieldText>Subject</LedgerFieldText><LedgerInput id="invoice-delivery-subject" value={form.subject} onChange={(event) => setForm((current) => ({ ...current, subject: event.target.value }))} disabled={submitting} maxLength={200} /></LedgerFieldLabel>
            <LedgerFieldLabel htmlFor="invoice-delivery-message"><LedgerFieldText>Message</LedgerFieldText><LedgerTextarea id="invoice-delivery-message" value={form.message} onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))} disabled={submitting} maxLength={5000} /><LedgerFieldHelp>Default message is safe to edit. HTML and provider payloads are not exposed here.</LedgerFieldHelp></LedgerFieldLabel>
            <div className="grid gap-2 rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-steel sm:grid-cols-2"><div><span className="font-semibold text-ink">Attachment</span><br />invoice-{invoice.invoiceNumber}.pdf</div><div><span className="font-semibold text-ink">Sender</span><br />Configured LedgerByte sender</div><div className="sm:col-span-2">Queue status is shown immediately. Provider acceptance, if any, is not delivery confirmation.</div></div>
            {formError ? <p role="alert" className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rosewood">{formError}</p> : null}
            <DialogFooter>
              <LedgerButton variant="quiet" onClick={() => setOpen(false)} disabled={submitting}>Cancel</LedgerButton>
              <LedgerButton variant="primary" type="submit" disabled={submitting}>{submitting ? "Queueing..." : "Queue invoice"}</LedgerButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </LedgerPanel>
  );
}

function initialForm(invoice: SalesInvoice): DeliveryForm {
  return {
    recipientEmail: invoice.customer?.email ?? "",
    subject: invoiceEmailSubject(invoice.invoiceNumber),
    message: DEFAULT_SALES_INVOICE_MESSAGE,
    idempotencyKey: createEmailDeliveryIdempotencyKey(),
  };
}

function formatDeliveryDate(value: string): string {
  return value.slice(0, 16).replace("T", " ");
}
