import {
  getDefaultTypedOnboardingGuidance,
  getTypedOnboardingComplianceCautions,
  getTypedOnboardingGuidance,
  getTypedOnboardingGuidanceTone,
  getTypedOnboardingGuidanceWarnings,
  resolveTypedOnboardingGuidance,
} from "./typed-onboarding-guidance";
import { TYPED_ONBOARDING_ARCHETYPE_KEYS } from "./typed-onboarding";

describe("typed onboarding guidance helpers", () => {
  it("defines guidance copy for every typed onboarding archetype", () => {
    for (const key of TYPED_ONBOARDING_ARCHETYPE_KEYS) {
      const guidance = getTypedOnboardingGuidance(key);

      expect(guidance.archetypeKey).toBe(key);
      expect(guidance.headline.length).toBeGreaterThan(10);
      expect(guidance.summary.length).toBeGreaterThan(30);
      expect(guidance.emphasis.length).toBeGreaterThan(0);
      expect(guidance.activeNow.length).toBeGreaterThan(0);
      expect(guidance.plannedNext.length).toBeGreaterThan(0);
      expect(guidance.blockedUntilProven.length).toBeGreaterThan(0);
      expect(["active", "planning", "blocked"]).toContain(guidance.tone);
    }
  });

  it("resolves invalid archetype values to default guidance", () => {
    const fallback = getDefaultTypedOnboardingGuidance();

    expect(fallback.archetypeKey).toBe("general_services");
    expect(resolveTypedOnboardingGuidance(undefined)).toEqual(fallback);
    expect(resolveTypedOnboardingGuidance("not-real")).toEqual(fallback);
    expect(resolveTypedOnboardingGuidance("software_saas").archetypeKey).toBe("software_saas");
  });

  it("returns cloned guidance arrays so callers cannot mutate shared metadata", () => {
    const guidance = getTypedOnboardingGuidance("agency");

    guidance.emphasis.push("mutated");
    guidance.activeNow[0] = "mutated";

    expect(getTypedOnboardingGuidance("agency").emphasis).not.toContain("mutated");
    expect(getTypedOnboardingGuidance("agency").activeNow).not.toContain("mutated");
  });

  it("keeps UAE readiness guidance conservative and planning-oriented", () => {
    const guidance = getTypedOnboardingGuidance("uae_einvoicing_readiness");
    const serialized = JSON.stringify(guidance);

    expect(guidance.tone).toBe("blocked");
    expect(serialized).toMatch(/local-readiness/i);
    expect(serialized).toMatch(/no FTA reporting/i);
    expect(serialized).toMatch(/provider evidence/i);
    expect(serialized).toMatch(/sandbox proof/i);
    expect(serialized).not.toMatch(/production ready|ASP ready|Peppol certified|FTA reported|accredited ASP/i);
    expect(getTypedOnboardingComplianceCautions("uae_einvoicing_readiness").length).toBeGreaterThan(0);
  });

  it("keeps KSA readiness guidance local-only without production signing or network submission claims", () => {
    const guidance = getTypedOnboardingGuidance("ksa_zatca_readiness");
    const serialized = JSON.stringify(guidance);

    expect(guidance.tone).toBe("blocked");
    expect(serialized).toMatch(/local-readiness/i);
    expect(serialized).toMatch(/production support remains blocked/i);
    expect(serialized).not.toMatch(/production ready|production signing enabled|official network submission|certified/i);
    expect(getTypedOnboardingComplianceCautions("ksa_zatca_readiness").length).toBeGreaterThan(0);
  });

  it("keeps storage and signed URL guidance blocked when mentioned", () => {
    const guidance = getTypedOnboardingGuidance("software_saas");
    const serialized = JSON.stringify(guidance);

    expect(serialized).toMatch(/object storage remains blocked/i);
    expect(serialized).toMatch(/signed URLs remain blocked/i);
    expect(serialized).not.toMatch(/real object storage is ready|signed URLs are ready|object storage readiness/i);
    expect(getTypedOnboardingGuidanceWarnings("software_saas")).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/object storage remains blocked/i),
        expect.stringMatching(/signed URLs remain blocked/i),
      ]),
    );
  });

  it("derives guidance tone and warning buckets from resolved guidance", () => {
    expect(getTypedOnboardingGuidanceTone("multi_entity")).toBe("planning");
    expect(getTypedOnboardingGuidanceTone("not-real")).toBe("active");
    expect(getTypedOnboardingGuidanceWarnings("trading")).toEqual(expect.arrayContaining([expect.stringMatching(/future automation/i)]));
    expect(JSON.stringify(getTypedOnboardingGuidance("general_services"))).not.toMatch(new RegExp("Open" + "Books", "i"));
  });
});
