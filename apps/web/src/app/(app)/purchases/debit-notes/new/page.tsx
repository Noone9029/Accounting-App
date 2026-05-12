import { PurchaseDebitNoteForm } from "@/components/forms/purchase-debit-note-form";

export default function NewPurchaseDebitNotePage() {
  return (
    <section>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-ink">Create debit note</h1>
        <p className="mt-1 text-sm text-steel">Save a draft supplier debit note for AP reversal posting.</p>
      </div>
      <PurchaseDebitNoteForm />
    </section>
  );
}
