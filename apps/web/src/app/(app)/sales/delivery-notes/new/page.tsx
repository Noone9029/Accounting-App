"use client";

import { DeliveryNoteForm } from "@/components/forms/delivery-note-form";

export default function NewDeliveryNotePage() {
  return (
    <section>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-ink">New delivery note</h1>
        <p className="mt-1 text-sm text-steel">Create a non-posting delivery note for customer fulfillment.</p>
      </div>
      <DeliveryNoteForm />
    </section>
  );
}
