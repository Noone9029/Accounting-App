import {
  getDefaultTypedOnboardingSelectorValue,
  getTypedOnboardingSelectorOptions,
  getTypedOnboardingSelectorPreview,
  getTypedOnboardingSelectorSummary,
  isSelectableTypedOnboardingArchetype,
  resolveTypedOnboardingSelectorValue,
} from "./typed-onboarding-selector";
import { TYPED_ONBOARDING_ARCHETYPE_KEYS, getTypedOnboardingArchetypes } from "./typed-onboarding";

describe("typed onboarding selector helpers", () => {
  it("derives selector options from typed onboarding metadata", () => {
    const archetypes = getTypedOnboardingArchetypes();
    const options = getTypedOnboardingSelectorOptions();
    const firstArchetype = archetypes[0]!;

    expect(options.map((option) => option.key)).toEqual(TYPED_ONBOARDING_ARCHETYPE_KEYS);
    expect(options).toHaveLength(archetypes.length);
    expect(options[0]).toEqual({
      key: firstArchetype.key,
      title: firstArchetype.title,
      description: firstArchetype.description,
      recommendedFor: firstArchetype.recommendedFor,
      status: "active",
    });
    expect("defaultChecklistItems" in options[0]!).toBe(false);
  });

  it("resolves safe defaults and rejects invalid selector values", () => {
    expect(getDefaultTypedOnboardingSelectorValue()).toBe("general_services");
    expect(resolveTypedOnboardingSelectorValue(undefined)).toBe("general_services");
    expect(resolveTypedOnboardingSelectorValue(null)).toBe("general_services");
    expect(resolveTypedOnboardingSelectorValue("not-a-real-profile")).toBe("general_services");
    expect(resolveTypedOnboardingSelectorValue("software_saas")).toBe("software_saas");
    expect(isSelectableTypedOnboardingArchetype("software_saas")).toBe(true);
    expect(isSelectableTypedOnboardingArchetype("generated_document_object_storage")).toBe(false);
  });

  it("returns preview metadata with active, planned, and blocked counts", () => {
    const preview = getTypedOnboardingSelectorPreview("software_saas");

    expect(preview.selectedKey).toBe("software_saas");
    expect(preview.archetype.key).toBe("software_saas");
    expect(preview.summary).toEqual({
      active: 7,
      planned: 2,
      blocked: 2,
      total: 11,
      actionable: 7,
      nonActionable: 4,
    });
    expect(preview.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "subscription_billing_profile", status: "planned" }),
        expect.objectContaining({
          key: "generated_document_object_storage",
          status: "blocked",
          blockerCode: "GENERATED_DOCUMENT_OBJECT_STORAGE_BLOCKED",
        }),
        expect.objectContaining({ key: "signed_url_delivery", status: "blocked", blockerCode: "SIGNED_URLS_BLOCKED" }),
      ]),
    );
    expect(preview.items.filter((item) => item.status !== "active").every((item) => item.routeKey === undefined)).toBe(true);
  });

  it("falls preview and summary requests back to the default archetype", () => {
    const preview = getTypedOnboardingSelectorPreview("invalid");
    const summary = getTypedOnboardingSelectorSummary("invalid");

    expect(preview.selectedKey).toBe("general_services");
    expect(preview.archetype.key).toBe("general_services");
    expect(summary).toEqual(preview.summary);
  });

  it("keeps returned selector metadata cloned and free of production-source vendor references", () => {
    const options = getTypedOnboardingSelectorOptions();
    const preview = getTypedOnboardingSelectorPreview("uae_einvoicing_readiness");

    options[0]!.recommendedFor.push("mutated");
    preview.items[0]!.title = "mutated";

    expect(getTypedOnboardingSelectorOptions()[0]!.recommendedFor).not.toContain("mutated");
    expect(getTypedOnboardingSelectorPreview("uae_einvoicing_readiness").items[0]!.title).not.toBe("mutated");
    expect(JSON.stringify([options, preview])).not.toMatch(new RegExp("Open" + "Books", "i"));
    expect(JSON.stringify(preview)).not.toMatch(/production ready|certified|accredited|official provider/i);
  });
});
