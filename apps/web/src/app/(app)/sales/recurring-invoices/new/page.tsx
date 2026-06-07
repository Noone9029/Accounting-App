import { RecurringInvoiceForm } from "@/components/forms/recurring-invoice-form";

export default function NewRecurringInvoicePage() {
  return (
    <section>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-ink">New recurring invoice template</h1>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-steel">Create a non-posting template for controlled manual draft-invoice generation.</p>
      </div>
      <RecurringInvoiceForm />
    </section>
  );
}
