import { PurchaseBillForm } from "@/components/forms/purchase-bill-form";
import { PageHeader } from "@/components/ui-ledger/page-header";

export default function NewPurchaseBillPage() {
  return (
    <section>
      <PageHeader title="Create purchase bill" description="Save a draft supplier bill for AP posting." />
      <PurchaseBillForm />
    </section>
  );
}
