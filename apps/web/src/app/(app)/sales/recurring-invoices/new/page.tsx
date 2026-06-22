import { RecurringInvoiceForm } from "@/components/forms/recurring-invoice-form";
import { LedgerPage, LedgerPageBody, LedgerPageHeader } from "@/components/ui/ledger-system";

export default function NewRecurringInvoicePage() {
  return (
    <LedgerPage>
      <LedgerPageHeader
        eyebrow="Sales"
        title="New recurring invoice template"
        description="Create a non-posting template for controlled manual draft-invoice generation."
      />
      <LedgerPageBody>
        <RecurringInvoiceForm />
      </LedgerPageBody>
    </LedgerPage>
  );
}
