import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { TypedOnboardingChecklistPreview } from "./typed-onboarding-checklist-preview";
import { SetupWizardContent } from "./setup-wizard";
import type { DashboardOnboardingChecklist } from "@/lib/types";

const loadTypedOnboardingStateMock = jest.fn();
const updateTypedOnboardingProfileMock = jest.fn();
const recomputeTypedOnboardingChecklistMock = jest.fn();

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

jest.mock("@/lib/onboarding-api", () => ({
  loadTypedOnboardingState: (...args: unknown[]) => loadTypedOnboardingStateMock(...args),
  updateTypedOnboardingProfile: (...args: unknown[]) => updateTypedOnboardingProfileMock(...args),
  recomputeTypedOnboardingChecklist: (...args: unknown[]) => recomputeTypedOnboardingChecklistMock(...args),
}));

describe("typed onboarding checklist preview", () => {
  beforeEach(() => {
    loadTypedOnboardingStateMock.mockReset();
    updateTypedOnboardingProfileMock.mockReset();
    recomputeTypedOnboardingChecklistMock.mockReset();
    loadTypedOnboardingStateMock.mockResolvedValue({ profile: null, checklist: null });
    updateTypedOnboardingProfileMock.mockImplementation(async (selectedArchetypeKey: string) =>
      apiProfile({ selectedArchetypeKey }),
    );
    recomputeTypedOnboardingChecklistMock.mockResolvedValue(null);
  });

  it("renders available archetypes and defaults to general services without persistence", async () => {
    const setItem = jest.spyOn(Storage.prototype, "setItem");

    render(<TypedOnboardingChecklistPreview />);

    expect(screen.getByRole("heading", { name: "Setup profile previews" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "General services" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Software and SaaS" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "UAE eInvoicing local readiness" })).toBeInTheDocument();
    expect(screen.getByText(/A balanced first accounting setup/)).toBeInTheDocument();
    expect(screen.getByText("Balanced first workflow")).toBeInTheDocument();
    expect(screen.getByText(/Focus on getting one customer sale from profile through report review/)).toBeInTheDocument();
    expect(await screen.findByText(/No saved setup profile found/)).toBeInTheDocument();
    expect(setItem).not.toHaveBeenCalled();

    setItem.mockRestore();
  });

  it("renders while loading the API profile and checklist", async () => {
    loadTypedOnboardingStateMock.mockReturnValue(new Promise(() => undefined));

    render(<TypedOnboardingChecklistPreview />);

    expect(await screen.findByRole("status")).toHaveTextContent(/Loading saved setup profile/);
    expect(screen.getByRole("button", { name: "General services" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "General services" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Software and SaaS" })).toBeDisabled();
  });

  it("surfaces API load failures as a non-destructive local preview alert", async () => {
    loadTypedOnboardingStateMock.mockRejectedValueOnce(new Error("private upstream details"));

    render(<TypedOnboardingChecklistPreview />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Setup profile API is unavailable; showing local preview only.",
    );
    expect(screen.queryByText(/private upstream details/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "General services" })).toHaveAttribute("aria-pressed", "true");
  });

  it("uses persisted API archetype and checklist state when available", async () => {
    loadTypedOnboardingStateMock.mockResolvedValue({
      profile: apiProfile({ selectedArchetypeKey: "trading" }),
      checklist: apiChecklist({
        items: [
          apiItem({ itemKey: "organization_profile", status: "COMPLETED" }),
          apiItem({ itemKey: "inventory_items", status: "AVAILABLE" }),
        ],
      }),
    });

    render(<TypedOnboardingChecklistPreview />);

    const profile = await screen.findByTestId("typed-onboarding-profile-trading");
    expect(screen.getByRole("button", { name: "Trading" })).toHaveAttribute("aria-pressed", "true");
    expect(within(profile).getByText("Saved state: Completed")).toBeInTheDocument();
    expect(within(profile).getByTestId("typed-onboarding-item-inventory_items")).toHaveTextContent("Products and services");
  });

  it("changes archetype through the API and refreshes the checklist preview", async () => {
    updateTypedOnboardingProfileMock.mockResolvedValue(apiProfile({ selectedArchetypeKey: "software_saas" }));
    recomputeTypedOnboardingChecklistMock.mockResolvedValue(
      apiChecklist({
        items: [
          apiItem({ itemKey: "subscription_billing_profile", status: "NOT_STARTED" }),
          apiItem({ itemKey: "generated_document_object_storage", status: "BLOCKED", blockedReasonCode: "GENERATED_DOCUMENT_OBJECT_STORAGE_BLOCKED" }),
        ],
      }),
    );

    render(<TypedOnboardingChecklistPreview />);

    await waitFor(() => expect(screen.getByRole("button", { name: "Software and SaaS" })).not.toBeDisabled());
    fireEvent.click(screen.getByRole("button", { name: "Software and SaaS" }));

    await waitFor(() => expect(updateTypedOnboardingProfileMock).toHaveBeenCalledWith("software_saas"));
    expect(recomputeTypedOnboardingChecklistMock).toHaveBeenCalledWith();
    const profile = await screen.findByTestId("typed-onboarding-profile-software_saas");
    expect(within(profile).getByTestId("typed-onboarding-item-subscription_billing_profile")).toHaveTextContent(
      "Subscription billing profile",
    );
    expect(within(profile).getByTestId("typed-onboarding-item-generated_document_object_storage")).toHaveTextContent("Blocked");
  });

  it("keeps failed API responses non-destructive and free of browser durable persistence", async () => {
    const setItem = jest.spyOn(Storage.prototype, "setItem");
    updateTypedOnboardingProfileMock.mockRejectedValueOnce(new Error("network down"));

    render(<TypedOnboardingChecklistPreview />);

    await waitFor(() => expect(screen.getByRole("button", { name: "Agency" })).not.toBeDisabled());
    fireEvent.click(screen.getByRole("button", { name: "Agency" }));

    expect(await screen.findByText(/Setup profile could not be saved/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "General services" })).toHaveAttribute("aria-pressed", "true");
    expect(setItem).not.toHaveBeenCalled();

    setItem.mockRestore();
  });

  it("renders recommended default checklist items from typed onboarding metadata with safe active links", async () => {
    render(<TypedOnboardingChecklistPreview />);

    const profile = await screen.findByTestId("typed-onboarding-profile-general_services");

    expect(within(profile).getByTestId("typed-onboarding-item-organization_profile")).toHaveTextContent("Organization profile");
    expect(within(profile).getByTestId("typed-onboarding-item-first_invoice")).toHaveTextContent("First invoice");
    expect(within(profile).getByRole("link", { name: "Open Organization profile" })).toHaveAttribute("href", "/organization/setup");
    expect(within(profile).getByRole("link", { name: "Open First invoice" })).toHaveAttribute("href", "/sales/invoices/new?returnTo=%2Fsetup");
    expect(within(profile).queryByRole("link", { name: /Inbox|AI|Report packs|Integration health|Document review/i })).not.toBeInTheDocument();
  });

  it("switches preview archetypes through the API without browser durable persistence", async () => {
    const setItem = jest.spyOn(Storage.prototype, "setItem");

    render(<TypedOnboardingChecklistPreview />);

    await waitFor(() => expect(screen.getByRole("button", { name: "Software and SaaS" })).not.toBeDisabled());
    fireEvent.click(screen.getByRole("button", { name: "Software and SaaS" }));
    const profile = await screen.findByTestId("typed-onboarding-profile-software_saas");

    expect(updateTypedOnboardingProfileMock).toHaveBeenCalledWith("software_saas");
    expect(within(profile).getByTestId("typed-onboarding-item-subscription_billing_profile")).toHaveTextContent(
      "Subscription billing profile",
    );
    expect(within(profile).getByText("Subscription-ready preview")).toBeInTheDocument();
    expect(within(profile).getAllByText(/object storage remains blocked/i).length).toBeGreaterThanOrEqual(1);
    expect(within(profile).getAllByText(/signed URLs remain blocked/i).length).toBeGreaterThanOrEqual(1);
    expect(within(profile).getByText("Generated-document object storage approval")).toBeInTheDocument();
    expect(within(profile).getByText("Signed URL delivery")).toBeInTheDocument();
    expect(within(profile).getAllByText("Planned").length).toBeGreaterThanOrEqual(1);
    expect(within(profile).getAllByText("Blocked").length).toBeGreaterThanOrEqual(2);
    expect(within(profile).queryByRole("link", { name: /Subscription billing|Generated-document object storage|Signed URL/i })).not.toBeInTheDocument();
    expect(setItem).not.toHaveBeenCalled();

    setItem.mockRestore();
  });

  it("keeps UAE and KSA readiness previews conservative and non-actionable for blocked capabilities", async () => {
    render(<TypedOnboardingChecklistPreview />);

    await waitFor(() => expect(screen.getByRole("button", { name: "UAE eInvoicing local readiness" })).not.toBeDisabled());
    fireEvent.click(screen.getByRole("button", { name: "UAE eInvoicing local readiness" }));
    const uaeProfile = await screen.findByTestId("typed-onboarding-profile-uae_einvoicing_readiness");
    const providerItem = within(uaeProfile).getByTestId("typed-onboarding-item-uae_provider_network");

    expect(within(uaeProfile).getByText("UAE local readiness visibility")).toBeInTheDocument();
    expect(within(uaeProfile).getByText("UAE local-readiness planning")).toBeInTheDocument();
    expect(within(uaeProfile).getByText(/no FTA reporting is enabled/i)).toBeInTheDocument();
    expect(within(uaeProfile).getAllByText(/provider evidence, sandbox proof/i).length).toBeGreaterThanOrEqual(1);
    expect(within(uaeProfile).getByRole("link", { name: "Open UAE local readiness visibility" })).toHaveAttribute("href", "/settings/compliance");
    expect(within(providerItem).getByText("Blocked")).toBeInTheDocument();
    expect(within(providerItem).queryByRole("link")).not.toBeInTheDocument();
    expect(uaeProfile).not.toHaveTextContent(/production ready|certified|accredited|official provider/i);

    await waitFor(() => expect(screen.getByRole("button", { name: "KSA local readiness" })).not.toBeDisabled());
    fireEvent.click(screen.getByRole("button", { name: "KSA local readiness" }));
    const ksaProfile = await screen.findByTestId("typed-onboarding-profile-ksa_zatca_readiness");
    const productionItem = within(ksaProfile).getByTestId("typed-onboarding-item-ksa_production_submission");

    expect(within(ksaProfile).getByText("KSA local-readiness planning")).toBeInTheDocument();
    expect(within(ksaProfile).getAllByText(/production support remains blocked/i).length).toBeGreaterThanOrEqual(1);
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

  it("does not render production-source vendor references", async () => {
    render(<TypedOnboardingChecklistPreview />);

    expect(await screen.findByTestId("typed-onboarding-preview")).not.toHaveTextContent(new RegExp("Open" + "Books", "i"));
  });
});

function apiProfile(overrides = {}) {
  return {
    id: "profile-1",
    organizationId: "org-1",
    branchId: null,
    selectedArchetypeKey: "general_services",
    templateVersion: "typed-onboarding-v1",
    status: "ACTIVE",
    ...overrides,
  };
}

function apiChecklist(overrides = {}) {
  return {
    id: "checklist-1",
    organizationId: "org-1",
    branchId: null,
    onboardingProfileId: "profile-1",
    templateVersion: "typed-onboarding-v1",
    status: "ACTIVE",
    generatedAt: "2026-06-20T00:00:00.000Z",
    items: [apiItem()],
    ...overrides,
  };
}

function apiItem(overrides = {}) {
  return {
    id: "item-1",
    organizationId: "org-1",
    branchId: null,
    onboardingChecklistId: "checklist-1",
    itemKey: "organization_profile",
    category: "business_profile",
    status: "AVAILABLE",
    routeKey: "settings.organization",
    setupProgressKey: "organization_profile",
    blockedReasonCode: null,
    blockedReason: null,
    completedAt: null,
    skippedAt: null,
    reopenedAt: null,
    ...overrides,
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
