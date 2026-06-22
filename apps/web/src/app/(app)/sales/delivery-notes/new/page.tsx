"use client";

import { DeliveryNoteForm } from "@/components/forms/delivery-note-form";
import { LedgerPage, LedgerPageBody, LedgerPageHeader } from "@/components/ui/ledger-system";

export default function NewDeliveryNotePage() {
  return (
    <LedgerPage>
      <LedgerPageHeader
        eyebrow="Sales"
        title="New delivery note"
        description="Create a non-posting delivery note for customer fulfillment."
      />
      <LedgerPageBody>
      <DeliveryNoteForm />
      </LedgerPageBody>
    </LedgerPage>
  );
}
