import { PurchaseBillForm } from "@/components/forms/purchase-bill-form";

export default function NewPurchaseBillPage() {
  return (
    <section>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-ink">Create purchase bill</h1>
        <p className="mt-1 text-sm text-steel">Save a draft supplier bill for AP posting.</p>
      </div>
      <PurchaseBillForm />
    </section>
  );
}
