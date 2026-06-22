import { BankAccountProfileForm } from "@/components/forms/bank-account-profile-form";
import { LedgerButton, LedgerPage, LedgerPageBody, LedgerPageHeader, LedgerSummaryBand } from "@/components/ui/ledger-system";

export default function NewBankAccountPage() {
  return (
    <LedgerPage>
      <LedgerPageHeader
        eyebrow="Banking / Account profile"
        title="Link bank account"
        description="Create a cash, wallet, card, or bank profile for an existing posting asset account."
        actions={<LedgerButton href="/bank-accounts">Back</LedgerButton>}
      />
      <LedgerSummaryBand tone="info">This creates a LedgerByte profile for manual banking workflows. It does not connect a live bank feed or external banking API.</LedgerSummaryBand>
      <LedgerPageBody>
        <BankAccountProfileForm />
      </LedgerPageBody>
    </LedgerPage>
  );
}
