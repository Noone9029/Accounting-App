import { CreateJournalForm } from "@/components/forms/create-journal-form";

export default function NewJournalEntryPage() {
  return (
    <section>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-ink">Create manual journal</h1>
        <p className="mt-1 text-sm text-steel">Create balanced draft journals, then post them through the API.</p>
      </div>
      <CreateJournalForm />
    </section>
  );
}
