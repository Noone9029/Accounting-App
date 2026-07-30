import {
  BILLING_ENTITLEMENT_KEYS,
  BILLING_ENTITLEMENT_REGISTRY,
  BillingCatalogValidationError,
  assertBillingEntitlementValue,
  type BillingEntitlementKey,
  type BillingEntitlementValue,
} from "./billing-entitlement-registry";

export type BillingPlanKey = "CONTROLLED_BETA" | "STARTER" | "GROWTH" | "KSA_COMPLIANCE";
export type BillingPriceInterval = "MONTH" | "YEAR";

export interface SyntheticBillingPriceFixture {
  interval: BillingPriceInterval;
  currency: "XTS";
  amountMinor: bigint;
  provider: "FAKE";
  environment: "LOCAL_TEST";
  active: boolean;
  providerProductId: string;
  providerPriceId: string;
}

export interface SyntheticBillingPlanFixture {
  key: BillingPlanKey;
  version: number;
  publiclyVisible: boolean;
  sellable: boolean;
  entitlements: Readonly<Record<BillingEntitlementKey, BillingEntitlementValue>>;
  prices: readonly SyntheticBillingPriceFixture[];
}

const baseEntitlements = {
  [BILLING_ENTITLEMENT_KEYS.coreAccounting]: true,
  [BILLING_ENTITLEMENT_KEYS.activeMemberSeats]: 3,
  [BILLING_ENTITLEMENT_KEYS.countryKsaModule]: false,
  [BILLING_ENTITLEMENT_KEYS.countryUaeModule]: false,
  [BILLING_ENTITLEMENT_KEYS.supportTier]: "LOCAL_TEST_ONLY",
  [BILLING_ENTITLEMENT_KEYS.billingIntervalMonth]: true,
  [BILLING_ENTITLEMENT_KEYS.billingIntervalYear]: true,
  [BILLING_ENTITLEMENT_KEYS.ksaComplianceAddOn]: false,
} as const;

export const SYNTHETIC_LOCAL_BILLING_CATALOG: readonly SyntheticBillingPlanFixture[] = [
  {
    key: "CONTROLLED_BETA",
    version: 1,
    publiclyVisible: false,
    sellable: false,
    entitlements: { ...baseEntitlements, [BILLING_ENTITLEMENT_KEYS.activeMemberSeats]: 5 },
    prices: [],
  },
  {
    key: "STARTER",
    version: 1,
    publiclyVisible: false,
    sellable: false,
    entitlements: baseEntitlements,
    prices: [
      syntheticPrice("MONTH", 12_345n, "fake_product_starter", "fake_price_starter_month"),
      syntheticPrice("YEAR", 123_450n, "fake_product_starter", "fake_price_starter_year"),
    ],
  },
  {
    key: "GROWTH",
    version: 1,
    publiclyVisible: false,
    sellable: false,
    entitlements: { ...baseEntitlements, [BILLING_ENTITLEMENT_KEYS.activeMemberSeats]: 10 },
    prices: [
      syntheticPrice("MONTH", 23_456n, "fake_product_growth", "fake_price_growth_month"),
      syntheticPrice("YEAR", 234_560n, "fake_product_growth", "fake_price_growth_year"),
    ],
  },
  {
    key: "KSA_COMPLIANCE",
    version: 1,
    publiclyVisible: false,
    sellable: false,
    entitlements: { ...baseEntitlements, [BILLING_ENTITLEMENT_KEYS.ksaComplianceAddOn]: false },
    prices: [],
  },
];

export function validateSyntheticBillingCatalog(catalog: readonly SyntheticBillingPlanFixture[] = SYNTHETIC_LOCAL_BILLING_CATALOG) {
  const providerPriceIds = new Set<string>();
  const planKeys = new Set<BillingPlanKey>();

  for (const plan of catalog) {
    if (planKeys.has(plan.key)) {
      throw new BillingCatalogValidationError("CATALOG_CONTRACT_VIOLATION", `Duplicate billing plan key: ${plan.key}`);
    }
    planKeys.add(plan.key);

    if (plan.version < 1 || !Number.isInteger(plan.version)) {
      throw new BillingCatalogValidationError("CATALOG_CONTRACT_VIOLATION", `Invalid plan version for ${plan.key}`);
    }
    if (plan.publiclyVisible || plan.sellable) {
      throw new BillingCatalogValidationError("CATALOG_CONTRACT_VIOLATION", `Synthetic catalog plan must remain non-public and non-sellable: ${plan.key}`);
    }
    if (plan.key === "KSA_COMPLIANCE" && (plan.prices.length > 0 || plan.entitlements[BILLING_ENTITLEMENT_KEYS.ksaComplianceAddOn] !== false)) {
      throw new BillingCatalogValidationError("CATALOG_CONTRACT_VIOLATION", "KSA compliance catalog fixture must remain unavailable and without prices.");
    }

    for (const [key, value] of Object.entries(plan.entitlements)) {
      assertBillingEntitlementValue(key, value);
    }
    for (const registryKey of Object.keys(BILLING_ENTITLEMENT_REGISTRY) as BillingEntitlementKey[]) {
      if (!(registryKey in plan.entitlements)) {
        throw new BillingCatalogValidationError("CATALOG_CONTRACT_VIOLATION", `Plan ${plan.key} is missing entitlement: ${registryKey}`);
      }
    }

    const intervals = new Set<BillingPriceInterval>();
    for (const price of plan.prices) {
      if (price.currency !== "XTS" || price.provider !== "FAKE" || price.environment !== "LOCAL_TEST" || price.active) {
        throw new BillingCatalogValidationError("CATALOG_CONTRACT_VIOLATION", `Price fixture must remain inactive local fake data: ${price.providerPriceId}`);
      }
      if (price.amountMinor < 0n || intervals.has(price.interval) || providerPriceIds.has(price.providerPriceId)) {
        throw new BillingCatalogValidationError("CATALOG_CONTRACT_VIOLATION", `Invalid or colliding fixture price: ${price.providerPriceId}`);
      }
      intervals.add(price.interval);
      providerPriceIds.add(price.providerPriceId);
    }
  }

  return true;
}

function syntheticPrice(
  interval: BillingPriceInterval,
  amountMinor: bigint,
  providerProductId: string,
  providerPriceId: string,
): SyntheticBillingPriceFixture {
  return { interval, currency: "XTS", amountMinor, provider: "FAKE", environment: "LOCAL_TEST", active: false, providerProductId, providerPriceId };
}
