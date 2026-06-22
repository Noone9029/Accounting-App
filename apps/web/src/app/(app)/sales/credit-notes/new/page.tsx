import { CreditNoteForm } from "@/components/forms/credit-note-form";
import { LedgerPage, LedgerPageBody, LedgerPageHeader } from "@/components/ui/ledger-system";

export default function NewCreditNotePage() {
  return (
    <LedgerPage>
      <LedgerPageHeader
        eyebrow="Sales"
        title="Create credit note"
        description="Save a draft sales credit note for a customer or original invoice."
      />
      <LedgerPageBody>
      <CreditNoteForm />
      </LedgerPageBody>
    </LedgerPage>
  );
}
