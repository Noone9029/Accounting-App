import "@testing-library/jest-dom";
import { fireEvent, render, screen, within } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { TypedOnboardingChecklistPreview } from "./typed-onboarding-checklist-preview";
import { SetupWizardContent } from "./setup-wizard";
import type { DashboardOnboardingChecklist } from "@/lib/types";

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({
    href,
    children,
    ...props
  }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; children: ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe("typed onboarding checklist preview", () => {
  it("renders available archetypes and defaults to general services without persistence", () => {
    const setItem = jest.spyOn(Storage.prototype, "setItem");

    render(<TypedOnboardingChecklistPreview />);

    expect(screen.getByRole("heading", { name: "Setup profile previews" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "General services" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Software and SaaS" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "UAE eInvoicing local readiness" })).toBeInTheDocument();
    expect(screen.getByText(/A balanced first accounting setup/)).toBeInTheDocument();
    expect(setItem).not.toHaveBeenCalled();

    setItem.mockRestore();
  });

  it("renders recommended default checklist items from typed onboarding metadata with safe active links", () => {
    render(<TypedOnboardingChecklistPreview />);

    const profile = screen.getByTestId("typed-onboarding-profile-general_services");

    expect(within(profile).getByText("Organization profile")).toBeInTheDocument();
    expect(within(profile).getByText("First invoice")).toBeInTheDocument();
    expect(within(profile).getByRole("link", { name: "Open Organization profile" })).toHaveAttribute("href", "/organization/setup");
    expect(within(profile).getByRole("link", { name: "Open First invoice" })).toHaveAttribute("href", "/sales/invoices/new?returnTo=%2Fsetup");
    expect(within(profile).queryByRole("link", { name: /Inbox|AI|Report packs|Integration health|Document review/i })).not.toBeInTheDocument();
  });

  it("switches preview archetypes client-side without persisting selection", () => {
    const setItem = jest.spyOn(Storage.prototype, "setItem");

    render(<TypedOnboardingChecklistPreview />);

    fireEvent.click(screen.getByRole("button", { name: "Software and SaaS" }));
    const profile = screen.getByTestId("typed-onboarding-profile-software_saas");

    expect(within(profile).getByText("Subscription billing profile")).toBeInTheDocument();
    expect(within(profile).getByText("Generated-document object storage approval")).toBeInTheDocument();
    expect(within(profile).getByText("Signed URL delivery")).toBeInTheDocument();
    expect(within(profile).getAllByText("Planned").length).toBeGreaterThanOrEqual(1);
    expect(within(profile).getAllByText("Blocked").length).toBeGreaterThanOrEqual(2);
    expect(within(profile).queryByRole("link", { name: /Subscription billing|Generated-document object storage|Signed URL/i })).not.toBeInTheDocument();
    expect(setItem).not.toHaveBeenCalled();

    setItem.mockRestore();
  });

  it("keeps UAE and KSA readiness previews conservative and non-actionable for blocked capabilities", () => {
    render(<TypedOnboardingChecklistPreview />);

    fireEvent.click(screen.getByRole("button", { name: "UAE eInvoicing local readiness" }));
    const uaeProfile = screen.getByTestId("typed-onboarding-profile-uae_einvoicing_readiness");
    const providerItem = within(uaeProfile).getByTestId("typed-onboarding-item-uae_provider_network");

    expect(within(uaeProfile).getByText("UAE local readiness visibility")).toBeInTheDocument();
    expect(within(uaeProfile).getByRole("link", { name: "Open UAE local readiness visibility" })).toHaveAttribute("href", "/settings/compliance");
    expect(within(providerItem).getByText("Blocked")).toBeInTheDocument();
    expect(within(providerItem).queryByRole("link")).not.toBeInTheDocument();
    expect(uaeProfile).not.toHaveTextContent(/production ready|certified|accredited|official provider/i);

    fireEvent.click(screen.getByRole("button", { name: "KSA local readiness" }));
    const ksaProfile = screen.getByTestId("typed-onboarding-profile-ksa_zatca_readiness");
    const productionItem = within(ksaProfile).getByTestId("typed-onboarding-item-ksa_production_submission");

    expect(within(productionItem).getByText("Blocked")).toBeInTheDocument();
    expect(within(productionItem).queryByRole("link")).not.toBeInTheDocument();
    expect(ksaProfile).not.toHaveTextContent(/production ready|certified|accredited|official provider/i);
  });

  it("wires the preview into the setup wizard without replacing checklist evidence", () => {
    render(<SetupWizardContent checklist={sampleChecklist()} />);

    expect(screen.getByRole("heading", { name: "Setup profile previews" })).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { name: "VAT/tax profile" }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Active tax rates: 0")).toBeInTheDocument();
  });

  it("does not render production-source vendor references", () => {
    render(<TypedOnboardingChecklistPreview />);

    expect(screen.getByTestId("typed-onboarding-preview")).not.toHaveTextContent(new RegExp("Open" + "Books", "i"));
  });
});

function sampleChecklist(): DashboardOnboardingChecklist {
  return {
    readOnly: true,
    noMutation: true,
    tenantScoped: true,
    organizationId: "org-1",
    generatedAt: "2026-05-18T00:00:00.000Z",
    status: "BLOCKED",
    readinessScore: 27,
    completedCount: 3,
    totalCount: 11,
    productionCompliance: false,
    zatcaProductionCompliance: false,
    realZatcaNetworkEnabled: false,
    signedXmlBodyPersistenceAllowed: false,
    qrPayloadBodyPersistenceAllowed: false,
    blockers: ["VAT/tax profile: Create at least one active tax rate."],
    warnings: ["First invoice: Create a first invoice before recording payment."],
    recommendedNextSteps: ["Complete: VAT/tax profile."],
    items: [
      item("organization_profile", "Organization profile complete", "COMPLETE", "/settings/organization", ["Legal profile fields complete: yes"], [], []),
      item("chart_of_accounts", "Chart of accounts available", "COMPLETE", "/accounts", ["Active posting accounts: 8"], [], []),
      item("tax_profile", "VAT/tax profile complete", "INCOMPLETE", "/tax-rates", ["Active tax rates: 0"], ["Create at least one active tax rate."], []),
      item("customer_created", "At least one customer", "INCOMPLETE", "/customers", ["Customer contacts: 0"], ["Create a customer contact."], []),
      item("first_invoice", "At least one sales invoice", "WARNING", "/sales/invoices", ["Sales invoices: 0"], [], ["Create a first invoice before recording payment."]),
      item("bank_payment_method", "Payment method or bank account configured", "INCOMPLETE", "/bank-accounts", ["Active bank/cash profiles: 0"], [], []),
      item("first_payment", "At least one customer payment", "INCOMPLETE", "/sales/customer-payments", ["Posted customer payments: 0"], [], []),
      item("first_report", "First reportable activity", "INCOMPLETE", "/reports/profit-and-loss", ["Posted journal entries: 0"], [], []),
      item("zatca_local_readiness_visible", "Compliance readiness visible", "WARNING", "/settings/compliance", ["Production compliance: false"], [], []),
      item("contact_vat_id_validation", "Contact VAT and ID validation ready", "COMPLETE", "/customers", ["Backend/frontend validation is enabled."], [], []),
      item("storage_readiness_checked", "Backup and storage readiness checked", "WARNING", "/settings/storage", ["Storage providers: database, database"], [], []),
    ],
  };
}

function item(
  id: string,
  label: string,
  status: DashboardOnboardingChecklist["items"][number]["status"],
  href: string,
  evidence: string[],
  blockers: string[],
  warnings: string[],
): DashboardOnboardingChecklist["items"][number] {
  return {
    id,
    label,
    status,
    description: `${label} description.`,
    href,
    evidence,
    blockers,
    warnings,
  };
}
