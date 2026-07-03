"use client";

import { useAppLocale } from "@/components/app-locale-provider";
import { PurchaseDebitNoteForm } from "@/components/forms/purchase-debit-note-form";

export default function NewPurchaseDebitNotePage() {
  const { tc } = useAppLocale();

  return (
    <section>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-ink">{tc("Create debit note")}</h1>
        <p className="mt-1 text-sm text-steel">{tc("Save a draft supplier debit note for AP reversal posting.")}</p>
      </div>
      <PurchaseDebitNoteForm />
    </section>
  );
}
