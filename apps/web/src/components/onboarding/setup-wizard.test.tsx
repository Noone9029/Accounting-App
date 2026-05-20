import "@testing-library/jest-dom";
import { render, screen, within } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { DashboardOnboardingCard, SetupWizardContent, SetupWizardFallback } from "./setup-wizard";
import { setupWizardLoadFailureMessage } from "@/lib/dashboard";
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

describe("setup wizard components", () => {
  it("renders checklist-backed wizard steps with evidence, blockers, warnings, and actions", () => {
    render(<SetupWizardContent checklist={sampleChecklist()} />);

    expect(screen.getByRole("heading", { name: "Guided setup" })).toBeInTheDocument();
    expect(screen.getByText("27%")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Organization profile" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Chart of accounts" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "VAT/tax profile" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "First customer" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "First invoice" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Bank/payment method" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "First payment" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "First report" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "ZATCA local readiness visibility" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Contact VAT/ID validation" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Storage readiness" })).toBeInTheDocument();
    expect(screen.getByText("Active tax rates: 0")).toBeInTheDocument();
    expect(screen.getByText("Create at least one active tax rate.")).toBeInTheDocument();
    expect(screen.getByText("Create a first invoice before recording payment.")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Open tax rates" })[0]).toHaveAttribute("href", "/tax-rates");
    expect(screen.getByRole("link", { name: "Continue: VAT/tax profile" })).toHaveAttribute("href", "/tax-rates");
  });

  it("shows top blockers and a safe failed-load fallback", () => {
    render(<SetupWizardFallback message={setupWizardLoadFailureMessage(new Error("stack trace with private details"))} />);

    expect(screen.getByText(/Setup checklist could not be loaded/)).toBeInTheDocument();
    expect(screen.getByText(/Setup is not marked complete/)).toBeInTheDocument();
    expect(screen.queryByText(/stack trace/)).not.toBeInTheDocument();
  });

  it("keeps the ZATCA step explicit about local-only non-production readiness", () => {
    render(<SetupWizardContent checklist={sampleChecklist()} />);

    const zatcaStep = screen.getByTestId("setup-step-zatca_local_readiness_visible");
    expect(within(zatcaStep).getByText(/local readiness only/)).toBeInTheDocument();
    expect(within(zatcaStep).getByText(/real ZATCA network is disabled/)).toBeInTheDocument();
    expect(within(zatcaStep).getByText(/production compliance remains false/)).toBeInTheDocument();
    expect(within(zatcaStep).getAllByText(/OTP and CSID are still required/).length).toBeGreaterThan(0);
    expect(within(zatcaStep).getByText(/clearance, reporting, and PDF\/A-3 are not implemented/)).toBeInTheDocument();
    expect(within(zatcaStep).queryByRole("button", { name: /CSID|ZATCA|clearance|reporting/i })).not.toBeInTheDocument();
  });

  it("shows controlled beta review readiness without implying ZATCA production compliance", () => {
    render(<SetupWizardContent checklist={readyChecklist()} />);

    expect(screen.getByText("Ready for controlled beta review")).toBeInTheDocument();
    expect(screen.getByText(/ZATCA production compliance remains false/)).toBeInTheDocument();
  });

  it("links the dashboard onboarding card to the setup wizard", () => {
    render(<DashboardOnboardingCard checklist={sampleChecklist()} />);

    expect(screen.getByRole("link", { name: "Open setup wizard" })).toHaveAttribute("href", "/setup");
    expect(screen.getByText("17% complete")).toBeInTheDocument();
    expect(screen.getByText(/Next: VAT\/tax profile/)).toBeInTheDocument();
    expect(screen.getByText("3 blockers need review.")).toBeInTheDocument();
  });
});

function readyChecklist(): DashboardOnboardingChecklist {
  return {
    ...sampleChecklist(),
    status: "READY_FOR_SELLABLE_V1_REVIEW",
    readinessScore: 100,
    completedCount: 11,
    blockers: [],
    warnings: [],
    recommendedNextSteps: ["Run a go-live rehearsal."],
    items: sampleChecklist().items.map((item) => ({ ...item, status: "COMPLETE", blockers: [], warnings: [] })),
  };
}

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
    blockers: [
      "VAT/tax profile: Create at least one active tax rate.",
      "First customer: Create a customer contact.",
      "Bank/payment method: Create an active bank, cash, wallet, card, or other payment profile.",
      "First payment: Record a customer payment against an open invoice.",
      "First reportable activity: Finalize or post at least one accounting transaction before reviewing reports.",
      "Extra blocker: Keep summary short.",
    ],
    warnings: ["First invoice: Create a first invoice before recording payment."],
    recommendedNextSteps: ["Complete: VAT/tax profile."],
    items: [
      item("organization_profile", "Organization profile complete", "COMPLETE", "/settings/organization", ["Legal profile fields complete: yes"], [], []),
      item("chart_of_accounts", "Chart of accounts available", "COMPLETE", "/accounts", ["Active posting accounts: 8"], [], []),
      item("tax_profile", "VAT/tax profile complete", "INCOMPLETE", "/tax-rates", ["Active tax rates: 0"], ["Create at least one active tax rate."], []),
      item("customer_created", "At least one customer", "INCOMPLETE", "/contacts", ["Customer contacts: 0"], ["Create a customer contact."], []),
      item("first_invoice", "At least one sales invoice", "WARNING", "/sales/invoices", ["Sales invoices: 0"], [], ["Create a first invoice before recording payment."]),
      item(
        "bank_payment_method",
        "Payment method or bank account configured",
        "INCOMPLETE",
        "/bank-accounts",
        ["Active bank/cash profiles: 0"],
        ["Create an active bank, cash, wallet, card, or other payment profile."],
        [],
      ),
      item(
        "first_payment",
        "At least one customer payment",
        "INCOMPLETE",
        "/sales/customer-payments",
        ["Posted customer payments: 0"],
        ["Record a customer payment against an open invoice."],
        [],
      ),
      item(
        "first_report",
        "First reportable activity",
        "INCOMPLETE",
        "/reports/profit-and-loss",
        ["Posted journal entries: 0"],
        ["Finalize or post at least one accounting transaction before reviewing reports."],
        [],
      ),
      item(
        "zatca_local_readiness_visible",
        "ZATCA local readiness visible",
        "WARNING",
        "/settings/zatca",
        ["Production compliance: false", "Real ZATCA network enabled: false"],
        [],
        ["OTP and CSID are still required."],
      ),
      item("contact_vat_id_validation", "Contact VAT and ID validation ready", "COMPLETE", "/contacts", ["Backend/frontend validation is enabled."], [], []),
      item("storage_readiness_checked", "Backup and storage readiness checked", "WARNING", "/settings/storage", ["Storage providers: database, database"], [], [
        "Signed XML and QR body persistence remain blocked.",
      ]),
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
