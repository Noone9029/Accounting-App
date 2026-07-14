"use client";

import { useState, type ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  LedgerButton,
  LedgerFieldHelp,
  LedgerFieldLabel,
  LedgerFieldText,
  LedgerTextarea,
} from "@/components/ui/ledger-system";

export interface LedgerActionDialogReason {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
  help?: ReactNode;
}

export interface LedgerActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: "default" | "danger";
  busy?: boolean;
  reason?: LedgerActionDialogReason;
  onConfirm: () => void | Promise<void>;
}

export function LedgerActionDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  tone = "default",
  busy = false,
  reason,
  onConfirm,
}: Readonly<LedgerActionDialogProps>) {
  const [submitting, setSubmitting] = useState(false);
  const isBusy = busy || submitting;
  const reasonMissing = Boolean(reason?.required && !reason.value.trim());

  async function handleConfirm() {
    if (isBusy || reasonMissing) return;

    setSubmitting(true);
    try {
      await onConfirm();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => onOpenChange(nextOpen)}>
      <DialogContent aria-busy={isBusy}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {reason ? (
          <LedgerFieldLabel htmlFor={reason.id}>
            <LedgerFieldText>{reason.label}</LedgerFieldText>
            <LedgerTextarea
              id={reason.id}
              value={reason.value}
              onChange={(event) => reason.onChange(event.target.value)}
              placeholder={reason.placeholder}
              aria-required={reason.required || undefined}
              disabled={isBusy}
            />
            {reason.help ? <LedgerFieldHelp>{reason.help}</LedgerFieldHelp> : null}
          </LedgerFieldLabel>
        ) : null}

        <DialogFooter>
          <LedgerButton variant="quiet" disabled={isBusy} onClick={() => onOpenChange(false)}>
            {cancelLabel}
          </LedgerButton>
          <LedgerButton
            variant={tone === "danger" ? "danger" : "primary"}
            disabled={isBusy || reasonMissing}
            onClick={() => void handleConfirm()}
          >
            {isBusy ? "Working..." : confirmLabel}
          </LedgerButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
