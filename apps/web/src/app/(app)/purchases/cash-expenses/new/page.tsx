import { CashExpenseForm } from "@/components/forms/cash-expense-form";
import { LedgerPage, LedgerPageBody, LedgerPageHeader, LedgerSummaryBand } from "@/components/ui/ledger-system";

export default function NewCashExpensePage() {
  return (
    <LedgerPage>
      <LedgerPageHeader eyebrow="Purchases" title="Post cash expense" description="Record direct paid expenses without creating accounts payable." />
      <LedgerPageBody>
        <LedgerSummaryBand tone="warning">
          This workflow posts immediately to the selected paid-through account. It does not schedule supplier payments, create AP, or submit tax filings.
        </LedgerSummaryBand>
        <CashExpenseForm />
      </LedgerPageBody>
    </LedgerPage>
  );
}
