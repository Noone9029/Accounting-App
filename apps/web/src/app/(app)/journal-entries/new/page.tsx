import { CreateJournalForm } from "@/components/forms/create-journal-form";
import { LedgerPage, LedgerPageBody, LedgerPageHeader } from "@/components/ui/ledger-system";

export default function NewJournalEntryPage() {
  return (
    <LedgerPage>
      <LedgerPageHeader eyebrow="Accounting" title="Create manual journal" description="Create balanced draft journals, then post them through the API." />
      <LedgerPageBody>
        <CreateJournalForm />
      </LedgerPageBody>
    </LedgerPage>
  );
}
