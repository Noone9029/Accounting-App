import { BILLING_ENTITLEMENT_KEYS, BillingCatalogValidationError, assertBillingEntitlementValue } from "./billing-entitlement-registry";
import { SYNTHETIC_LOCAL_BILLING_CATALOG, validateSyntheticBillingCatalog } from "./billing-catalog-fixtures";

describe("synthetic billing catalog", () => {
  it("keeps every fixture local, non-public, non-sellable, and compliance-blocked", () => {
    expect(validateSyntheticBillingCatalog()).toBe(true);
    expect(SYNTHETIC_LOCAL_BILLING_CATALOG.every((plan) => !plan.publiclyVisible && !plan.sellable)).toBe(true);
    expect(SYNTHETIC_LOCAL_BILLING_CATALOG.find((plan) => plan.key === "KSA_COMPLIANCE")).toMatchObject({ prices: [] });
  });

  it("rejects unknown and type-incompatible entitlements", () => {
    expect(() => assertBillingEntitlementValue("unknown_feature", true)).toThrow(BillingCatalogValidationError);
    expect(() => assertBillingEntitlementValue(BILLING_ENTITLEMENT_KEYS.activeMemberSeats, true)).toThrow("INTEGER");
    expect(() => assertBillingEntitlementValue(BILLING_ENTITLEMENT_KEYS.activeMemberSeats, -1)).toThrow("INTEGER");
  });

  it("rejects duplicate provider prices and public catalog fixtures", () => {
    const duplicate = structuredClone(SYNTHETIC_LOCAL_BILLING_CATALOG) as typeof SYNTHETIC_LOCAL_BILLING_CATALOG;
    const starter = duplicate.find((plan) => plan.key === "STARTER")!;
    const growth = duplicate.find((plan) => plan.key === "GROWTH")!;
    growth.prices = [{ ...growth.prices[0]!, providerPriceId: starter.prices[0]!.providerPriceId }];
    expect(() => validateSyntheticBillingCatalog(duplicate)).toThrow("colliding fixture price");
  });
});
