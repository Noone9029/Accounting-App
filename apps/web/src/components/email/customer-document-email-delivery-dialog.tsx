"use client";

import type { FormEvent } from "react";
import { LedgerButton, LedgerFieldHelp, LedgerFieldLabel, LedgerFieldText, LedgerInput, LedgerTextarea } from "@/components/ui/ledger-system";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export interface CustomerDocumentEmailDeliveryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  submitting: boolean;
  error: string;
  sourceLabel: string;
  documentFilename: string;
  recipientEmail: string;
  subject: string;
  message: string;
  onChange: (field: "recipientEmail" | "subject" | "message", value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

export function CustomerDocumentEmailDeliveryDialog(props: Readonly<CustomerDocumentEmailDeliveryDialogProps>) {
  const idPrefix = props.sourceLabel.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return (
    <Dialog open={props.open} onOpenChange={(nextOpen) => { if (!props.submitting) props.onOpenChange(nextOpen); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Send {props.sourceLabel}</DialogTitle>
          <DialogDescription>Queue the archived PDF. This action does not confirm delivery or contact a customer immediately.</DialogDescription>
        </DialogHeader>
        <form onSubmit={props.onSubmit} className="space-y-4">
          <LedgerFieldLabel htmlFor={`${idPrefix}-recipient`}><LedgerFieldText>Recipient email</LedgerFieldText><LedgerInput id={`${idPrefix}-recipient`} type="email" value={props.recipientEmail} onChange={(event) => props.onChange("recipientEmail", event.target.value)} disabled={props.submitting} required /><LedgerFieldHelp>Prefilled from the customer when available; you can override it for this delivery.</LedgerFieldHelp></LedgerFieldLabel>
          <LedgerFieldLabel htmlFor={`${idPrefix}-subject`}><LedgerFieldText>Subject</LedgerFieldText><LedgerInput id={`${idPrefix}-subject`} value={props.subject} onChange={(event) => props.onChange("subject", event.target.value)} disabled={props.submitting} maxLength={200} /></LedgerFieldLabel>
          <LedgerFieldLabel htmlFor={`${idPrefix}-message`}><LedgerFieldText>Message</LedgerFieldText><LedgerTextarea id={`${idPrefix}-message`} value={props.message} onChange={(event) => props.onChange("message", event.target.value)} disabled={props.submitting} maxLength={5000} /><LedgerFieldHelp>Default message is safe to edit. HTML and provider payloads are not exposed here.</LedgerFieldHelp></LedgerFieldLabel>
          <div className="grid gap-2 rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-steel sm:grid-cols-2"><div><span className="font-semibold text-ink">Attachment</span><br />{props.documentFilename}</div><div><span className="font-semibold text-ink">Sender</span><br />Configured LedgerByte sender</div><div className="sm:col-span-2">Queue status is shown immediately. Provider acceptance, if any, is not delivery confirmation.</div></div>
          {props.error ? <p role="alert" className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rosewood">{props.error}</p> : null}
          <DialogFooter><LedgerButton variant="quiet" onClick={() => props.onOpenChange(false)} disabled={props.submitting}>Cancel</LedgerButton><LedgerButton variant="primary" type="submit" disabled={props.submitting}>{props.submitting ? "Queueing..." : `Queue ${props.sourceLabel}`}</LedgerButton></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
