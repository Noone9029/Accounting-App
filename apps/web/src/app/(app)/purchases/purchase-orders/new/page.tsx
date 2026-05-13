import { PurchaseOrderForm } from "@/components/forms/purchase-order-form";

export default function NewPurchaseOrderPage() {
  return (
    <section>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-ink">Create purchase order</h1>
        <p className="mt-1 text-sm text-steel">Save a non-posting supplier order as a draft.</p>
      </div>
      <PurchaseOrderForm />
    </section>
  );
}
