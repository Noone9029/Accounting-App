import { SalesInvoiceForm } from "@/components/forms/sales-invoice-form";

export default function NewSalesInvoicePage() {
  return (
    <section>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-ink">Create sales invoice</h1>
        <p className="mt-1 text-sm text-steel">Save a draft invoice from live contacts, items, accounts, tax rates, and branches.</p>
      </div>
      <SalesInvoiceForm />
    </section>
  );
}
