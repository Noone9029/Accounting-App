import { OrganizationSetupForm } from "@/components/forms/organization-setup-form";
import { LedgerPage, LedgerPageBody, LedgerPageHeader, LedgerPanel, LedgerSummaryBand } from "@/components/ui/ledger-system";

export default function OrganizationSetupPage() {
  return (
    <LedgerPage>
      <LedgerPageHeader
        eyebrow="Workspace foundation"
        title="Organization setup"
        description="Add your company details to prepare your accounting workspace."
      />
      <LedgerPageBody>
        <LedgerSummaryBand tone="info">
          Verify your email, create your organization, then choose a plan to start your 14-day trial.
        </LedgerSummaryBand>
        <LedgerPanel>
          <OrganizationSetupForm />
        </LedgerPanel>
      </LedgerPageBody>
    </LedgerPage>
  );
}
