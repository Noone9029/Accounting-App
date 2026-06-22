import { PurchaseOrderForm } from "@/components/forms/purchase-order-form";
import { LedgerPage, LedgerPageBody, LedgerPageHeader, LedgerSummaryBand } from "@/components/ui/ledger-system";

export default function NewPurchaseOrderPage() {
  return (
    <LedgerPage>
      <LedgerPageHeader eyebrow="Purchases" title="Create purchase order" description="Save a non-posting supplier order as a draft." />
      <LedgerPageBody>
        <LedgerSummaryBand tone="info">
          Purchase orders do not post AP, move stock, send supplier payments, or submit tax filings. Conversion to a bill remains an explicit later action.
        </LedgerSummaryBand>
        <PurchaseOrderForm />
      </LedgerPageBody>
    </LedgerPage>
  );
}
