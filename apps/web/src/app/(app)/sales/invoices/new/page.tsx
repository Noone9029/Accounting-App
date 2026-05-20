import { SalesInvoiceForm } from "@/components/forms/sales-invoice-form";
import Link from "next/link";

export default function NewSalesInvoicePage() {
  return (
    <section>
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Create sales invoice</h1>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-steel">
            Build the first sale from a customer, revenue account, and optional item/tax rate. Save the draft first, then review and finalize from the invoice page.
          </p>
        </div>
        <Link href="/setup" className="self-start rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          Guided setup
        </Link>
      </div>
      <SalesInvoiceForm />
    </section>
  );
}
