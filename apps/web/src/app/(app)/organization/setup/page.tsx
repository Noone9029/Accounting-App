import { OrganizationSetupForm } from "@/components/forms/organization-setup-form";
import { LedgerPage, LedgerPageBody, LedgerPageHeader, LedgerPanel, LedgerSummaryBand } from "@/components/ui/ledger-system";

export default function OrganizationSetupPage() {
  return (
    <LedgerPage>
      <LedgerPageHeader
        eyebrow="Workspace foundation"
        title="Organization setup"
        description="Creates tenant foundation data: owner role, default branch, chart of accounts, tax rates, fiscal year, and sequences."
      />
      <LedgerPageBody>
        <LedgerSummaryBand tone="info">
          This setup creates the first organization workspace. It does not submit tax-authority data, connect production
          compliance providers, or create records outside the tenant foundation.
        </LedgerSummaryBand>
        <LedgerPanel>
          <OrganizationSetupForm />
        </LedgerPanel>
      </LedgerPageBody>
    </LedgerPage>
  );
}
