import { SalesInvoiceForm } from "@/components/forms/sales-invoice-form";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/ui-ledger/page-header";
import Link from "next/link";

export default function NewSalesInvoicePage() {
  return (
    <section>
      <PageHeader
        title="Create sales invoice"
        description="Build the first sale from a customer, revenue account, and optional item/tax rate. Save the draft first, then review and finalize from the invoice page."
        actions={
          <Link href="/setup" className={buttonVariants({ variant: "outline" })}>
            Guided setup
          </Link>
        }
      />
      <SalesInvoiceForm />
    </section>
  );
}
