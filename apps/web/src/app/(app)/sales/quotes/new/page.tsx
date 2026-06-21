import { SalesQuoteForm } from "@/components/forms/sales-quote-form";
import { LedgerPage, LedgerPageBody, LedgerPageHeader } from "@/components/ui/ledger-system";

export default function NewSalesQuotePage() {
  return (
    <LedgerPage>
      <LedgerPageHeader
        eyebrow="Sales"
        title="New sales quote"
        description="Prepare a non-posting customer quote using the same account coding and tax calculation rules as sales invoices."
      />
      <LedgerPageBody>
        <SalesQuoteForm />
      </LedgerPageBody>
    </LedgerPage>
  );
}
