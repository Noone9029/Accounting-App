import { SalesQuoteForm } from "@/components/forms/sales-quote-form";

export default function NewSalesQuotePage() {
  return (
    <section>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-ink">New sales quote</h1>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-steel">Prepare a non-posting customer quote using the same account coding and tax calculation rules as sales invoices.</p>
      </div>
      <SalesQuoteForm />
    </section>
  );
}
