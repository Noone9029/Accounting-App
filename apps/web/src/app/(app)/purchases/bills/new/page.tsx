import { PurchaseBillForm } from "@/components/forms/purchase-bill-form";
import { LedgerPage, LedgerPageBody, LedgerPageHeader } from "@/components/ui/ledger-system";

export default function NewPurchaseBillPage() {
  return (
    <LedgerPage>
      <LedgerPageHeader eyebrow="Purchases" title="Create purchase bill" description="Save a draft supplier bill for AP posting." />
      <LedgerPageBody>
        <PurchaseBillForm />
      </LedgerPageBody>
    </LedgerPage>
  );
}
