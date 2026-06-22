import { CollectionCaseForm } from "@/components/forms/collection-case-form";
import { LedgerPage, LedgerPageBody, LedgerPageHeader } from "@/components/ui/ledger-system";

export default function NewCollectionCasePage() {
  return (
    <LedgerPage>
      <LedgerPageHeader
        eyebrow="Sales collections"
        title="New collection case"
        description="Track Sales/AR follow-up work against a customer or outstanding invoice without posting accounting or sending payment/email actions."
      />
      <LedgerPageBody>
        <CollectionCaseForm />
      </LedgerPageBody>
    </LedgerPage>
  );
}
