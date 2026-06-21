import { SalesInvoiceForm } from "@/components/forms/sales-invoice-form";
import { LedgerButton, LedgerPage, LedgerPageBody, LedgerPageHeader } from "@/components/ui/ledger-system";

export default function NewSalesInvoicePage() {
  return (
    <LedgerPage>
      <LedgerPageHeader
        eyebrow="Sales"
        title="Create sales invoice"
        description="Build the first sale from a customer, revenue account, and optional item/tax rate. Save the draft first, then review and finalize from the invoice page."
        actions={<LedgerButton href="/setup">Guided setup</LedgerButton>}
      />
      <LedgerPageBody>
        <SalesInvoiceForm />
      </LedgerPageBody>
    </LedgerPage>
  );
}
