"use client";

import { useAppLocale } from "@/components/app-locale-provider";
import { CreditNoteForm } from "@/components/forms/credit-note-form";

export default function NewCreditNotePage() {
  const { tc } = useAppLocale();

  return (
    <section>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-ink">{tc("Create credit note")}</h1>
        <p className="mt-1 text-sm text-steel">{tc("Save a draft sales credit note for a customer or original invoice.")}</p>
      </div>
      <CreditNoteForm />
    </section>
  );
}
