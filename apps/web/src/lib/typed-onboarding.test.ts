import { getAppRouteByKey } from "./app-routes";
import {
  TYPED_ONBOARDING_ARCHETYPE_KEYS,
  getDefaultTypedOnboardingChecklistTemplate,
  getRecommendedTypedOnboardingTemplateItems,
  getTypedOnboardingArchetype,
  getTypedOnboardingArchetypes,
  getTypedOnboardingTemplateItemsByStatus,
  isTypedOnboardingTemplateItemActionable,
} from "./typed-onboarding";

describe("typed onboarding profile metadata", () => {
  it("defines LedgerByte-native business archetypes with checklist templates", () => {
    expect(TYPED_ONBOARDING_ARCHETYPE_KEYS).toEqual([
      "general_services",
      "software_saas",
      "agency",
      "trading",
      "ecommerce",
      "contractor",
      "multi_entity",
      "ksa_zatca_readiness",
      "uae_einvoicing_readiness",
    ]);

    const archetypes = getTypedOnboardingArchetypes();

    expect(archetypes).toHaveLength(TYPED_ONBOARDING_ARCHETYPE_KEYS.length);
    for (const archetype of archetypes) {
      expect(archetype.title.trim()).toBe(archetype.title);
      expect(archetype.description.length).toBeGreaterThan(30);
      expect(archetype.recommendedFor.length).toBeGreaterThan(0);
      expect(archetype.defaultChecklistItems.length).toBeGreaterThan(4);
    }
  });

  it("uses active route-registry keys for actionable template items without duplicating hrefs", () => {
    const template = getDefaultTypedOnboardingChecklistTemplate("general_services");
    const actionableItems = template.filter(isTypedOnboardingTemplateItemActionable);

    expect(actionableItems.map((item) => [item.setupProgressKey, item.routeKey])).toEqual([
      ["organization_profile", "settings.organization"],
      ["chart_of_accounts", "accounting.accounts"],
      ["tax_profile", "settings.taxRates"],
      ["customer_created", "customers"],
      ["first_invoice", "sales.invoice.new"],
      ["bank_payment_method", "banking.bankAccounts"],
      ["first_payment", "sales.customerPayment.new"],
      ["first_report", "reports.profitLoss"],
      ["contact_vat_id_validation", "customers"],
    ]);

    for (const item of actionableItems) {
      expect(item.status).toBe("active");
      expect(getAppRouteByKey(item.routeKey!)?.capabilityStatus).toBe("active");
      expect("href" in item).toBe(false);
    }
  });

  it("keeps future typed onboarding and storage capabilities non-actionable", () => {
    const template = getDefaultTypedOnboardingChecklistTemplate("software_saas");
    const plannedItems = getTypedOnboardingTemplateItemsByStatus("software_saas", "planned");
    const blockedItems = getTypedOnboardingTemplateItemsByStatus("software_saas", "blocked");

    expect(plannedItems).toEqual([
      expect.objectContaining({
        key: "subscription_billing_profile",
        status: "planned",
      }),
      expect.objectContaining({
        key: "typed_onboarding_state",
        status: "planned",
      }),
    ]);
    expect(plannedItems.every((item) => item.routeKey === undefined)).toBe(true);
    expect(blockedItems).toEqual([
      expect.objectContaining({
        key: "generated_document_object_storage",
        status: "blocked",
        blockerCode: "GENERATED_DOCUMENT_OBJECT_STORAGE_BLOCKED",
      }),
      expect.objectContaining({
        key: "signed_url_delivery",
        status: "blocked",
        blockerCode: "SIGNED_URLS_BLOCKED",
      }),
    ]);
    expect(blockedItems.every((item) => item.routeKey === undefined)).toBe(true);
    expect(template.filter(isTypedOnboardingTemplateItemActionable).every((item) => item.status === "active")).toBe(true);
  });

  it("keeps KSA and UAE readiness templates local or blocked without production-compliance claims", () => {
    const ksa = getTypedOnboardingArchetype("ksa_zatca_readiness");
    const uae = getTypedOnboardingArchetype("uae_einvoicing_readiness");

    expect(ksa?.defaultChecklistItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: "ksa_local_readiness_visibility",
          status: "active",
          routeKey: "settings.zatca",
          setupProgressKey: "zatca_local_readiness_visible",
        }),
        expect.objectContaining({
          key: "ksa_production_submission",
          status: "blocked",
          blockerCode: "COUNTRY_COMPLIANCE_PRODUCTION_BLOCKED",
        }),
      ]),
    );
    expect(uae?.defaultChecklistItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: "uae_local_readiness_visibility",
          status: "active",
          routeKey: "settings.compliance",
          setupProgressKey: "zatca_local_readiness_visible",
        }),
        expect.objectContaining({
          key: "uae_provider_network",
          status: "blocked",
          blockerCode: "COUNTRY_COMPLIANCE_PRODUCTION_BLOCKED",
        }),
      ]),
    );
    expect(ksa?.defaultChecklistItems.find((item) => item.key === "ksa_production_submission")?.routeKey).toBeUndefined();
    expect(uae?.defaultChecklistItems.find((item) => item.key === "uae_provider_network")?.routeKey).toBeUndefined();
    expect(JSON.stringify([ksa, uae])).not.toMatch(/production ready|certified|accredited|official provider/i);
  });

  it("returns recommended items without exposing future route links or vendor references", () => {
    const recommended = getRecommendedTypedOnboardingTemplateItems("ecommerce");

    expect(recommended.length).toBeGreaterThan(4);
    expect(recommended.every((item) => item.recommended)).toBe(true);
    expect(JSON.stringify(recommended)).not.toMatch(/\/inbox|\/ai|report-packs|integrations\/health|documents\/review/i);
    expect(JSON.stringify(getTypedOnboardingArchetypes())).not.toMatch(new RegExp("Open" + "Books", "i"));
  });
});
