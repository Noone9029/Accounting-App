import { PurchaseDebitNoteForm } from "@/components/forms/purchase-debit-note-form";
import { LedgerPage, LedgerPageBody, LedgerPageHeader } from "@/components/ui/ledger-system";

export default function NewPurchaseDebitNotePage() {
  return (
    <LedgerPage>
      <LedgerPageHeader eyebrow="Purchases" title="Create debit note" description="Save a draft supplier debit note for AP reversal posting." />
      <LedgerPageBody>
        <PurchaseDebitNoteForm />
      </LedgerPageBody>
    </LedgerPage>
  );
}
