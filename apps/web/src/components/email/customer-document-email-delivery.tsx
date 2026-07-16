"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { LedgerButton, LedgerPanel } from "@/components/ui/ledger-system";
import { apiRequest } from "@/lib/api";
import { createEmailDeliveryIdempotencyKey } from "@/lib/email-deliveries";
import type { CustomerDocumentDeliveryHistoryEntry } from "@/lib/email-deliveries";
import { CustomerDocumentEmailDeliveryDialog } from "./customer-document-email-delivery-dialog";
import { CustomerDocumentEmailDeliveryHistory } from "./customer-document-email-delivery-history";

export interface CustomerDocumentEmailDeliveryProps {
  sourceId: string;
  organizationId: string | null;
  canSend: boolean;
  eligible: boolean;
  sourceLabel: string;
  documentFilename: string;
  recipientEmail: string;
  defaultSubject: string;
  defaultMessage: string;
  ineligibleMessage: string;
  noPermissionMessage: string;
  successMessage: string;
  emptyHistoryMessage: string;
  endpoint: string;
}

type DeliveryForm = { recipientEmail: string; subject: string; message: string; idempotencyKey: string };

export function CustomerDocumentEmailDelivery(props: Readonly<CustomerDocumentEmailDeliveryProps>) {
  const [history, setHistory] = useState<CustomerDocumentDeliveryHistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState<DeliveryForm>(() => initialForm(props));
  const requestToken = useRef(0);

  async function refreshHistory(token: number) {
    setHistoryLoading(true);
    try {
      const result = await apiRequest<CustomerDocumentDeliveryHistoryEntry[]>(props.endpoint);
      if (token === requestToken.current) setHistory(result);
    } catch (error: unknown) {
      if (token === requestToken.current) { setHistory([]); setHistoryError(error instanceof Error ? error.message : "Unable to load email delivery history."); }
    } finally {
      if (token === requestToken.current) setHistoryLoading(false);
    }
  }

  useEffect(() => {
    const token = ++requestToken.current;
    setHistory([]);
    setHistoryError("");
    if (!props.organizationId || !props.sourceId) { setHistoryLoading(false); return; }
    void refreshHistory(token);
    return () => { /* token invalidates delayed responses */ };
  }, [props.endpoint, props.organizationId, props.sourceId]);

  function openDialog() {
    setForm(initialForm(props)); setFormError(""); setSuccess(""); setOpen(true);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true); setFormError("");
    const token = requestToken.current;
    try {
      await apiRequest(`${props.endpoint}`, { method: "POST", body: { recipientEmail: form.recipientEmail || undefined, subject: form.subject || undefined, message: form.message || undefined, idempotencyKey: form.idempotencyKey } });
      setOpen(false); setSuccess(props.successMessage); await refreshHistory(token);
    } catch (error: unknown) {
      setFormError(error instanceof Error ? error.message : `Unable to queue ${props.sourceLabel} email delivery.`);
    } finally { setSubmitting(false); }
  }

  const canOpen = props.canSend && props.eligible;
  return <LedgerPanel>
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><h2 className="text-base font-semibold text-ink">Email delivery</h2><p className="mt-1 text-sm leading-6 text-steel">Queue the archived PDF for delivery and review its safe status history.</p></div>{canOpen ? <LedgerButton variant="primary" onClick={openDialog}>Send {props.sourceLabel}</LedgerButton> : null}</div>
    {!props.eligible ? <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{props.ineligibleMessage}</p> : null}
    {!props.canSend && props.eligible ? <p className="mt-3 text-sm text-steel">{props.noPermissionMessage}</p> : null}
    {success ? <p role="status" className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{success}</p> : null}
    <CustomerDocumentEmailDeliveryHistory entries={history} loading={historyLoading} error={historyError} emptyMessage={props.emptyHistoryMessage} />
    <CustomerDocumentEmailDeliveryDialog open={open} onOpenChange={setOpen} submitting={submitting} error={formError} sourceLabel={props.sourceLabel} documentFilename={props.documentFilename} recipientEmail={form.recipientEmail} subject={form.subject} message={form.message} onChange={(field, value) => setForm((current) => ({ ...current, [field]: value }))} onSubmit={(event) => void submit(event)} />
  </LedgerPanel>;
}

function initialForm(props: Pick<CustomerDocumentEmailDeliveryProps, "recipientEmail" | "defaultSubject" | "defaultMessage">): DeliveryForm {
  return { recipientEmail: props.recipientEmail, subject: props.defaultSubject, message: props.defaultMessage, idempotencyKey: createEmailDeliveryIdempotencyKey() };
}
