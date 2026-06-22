import { PurchaseReturnForm } from "@/components/forms/purchase-return-form";
import { LedgerPage, LedgerPageBody, LedgerPageHeader } from "@/components/ui/ledger-system";

export default function NewPurchaseReturnPage() {
  return (
    <LedgerPage>
      <LedgerPageHeader
        eyebrow="Purchases"
        title="Create purchase return"
        description="Save a non-posting operational return document for supplier review."
      />
      <LedgerPageBody>
        <PurchaseReturnForm />
      </LedgerPageBody>
    </LedgerPage>
  );
}
