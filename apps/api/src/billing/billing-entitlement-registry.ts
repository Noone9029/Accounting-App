export const BILLING_ENTITLEMENT_KEYS = {
  coreAccounting: "core_accounting",
  activeMemberSeats: "active_member_seats",
  countryKsaModule: "country_ksa_module",
  countryUaeModule: "country_uae_module",
  supportTier: "support_tier",
  billingIntervalMonth: "billing_interval_month",
  billingIntervalYear: "billing_interval_year",
  ksaComplianceAddOn: "ksa_compliance_add_on",
} as const;

export type BillingEntitlementKey = (typeof BILLING_ENTITLEMENT_KEYS)[keyof typeof BILLING_ENTITLEMENT_KEYS];
export type BillingEntitlementValueType = "BOOLEAN" | "INTEGER" | "STRING";
export type BillingEntitlementValue = boolean | number | string;

export interface BillingEntitlementDefinition {
  key: BillingEntitlementKey;
  valueType: BillingEntitlementValueType;
  allowsCommercialAccess: boolean;
}

export const BILLING_ENTITLEMENT_REGISTRY: Readonly<Record<BillingEntitlementKey, BillingEntitlementDefinition>> = {
  [BILLING_ENTITLEMENT_KEYS.coreAccounting]: {
    key: BILLING_ENTITLEMENT_KEYS.coreAccounting,
    valueType: "BOOLEAN",
    allowsCommercialAccess: true,
  },
  [BILLING_ENTITLEMENT_KEYS.activeMemberSeats]: {
    key: BILLING_ENTITLEMENT_KEYS.activeMemberSeats,
    valueType: "INTEGER",
    allowsCommercialAccess: true,
  },
  [BILLING_ENTITLEMENT_KEYS.countryKsaModule]: {
    key: BILLING_ENTITLEMENT_KEYS.countryKsaModule,
    valueType: "BOOLEAN",
    allowsCommercialAccess: false,
  },
  [BILLING_ENTITLEMENT_KEYS.countryUaeModule]: {
    key: BILLING_ENTITLEMENT_KEYS.countryUaeModule,
    valueType: "BOOLEAN",
    allowsCommercialAccess: false,
  },
  [BILLING_ENTITLEMENT_KEYS.supportTier]: {
    key: BILLING_ENTITLEMENT_KEYS.supportTier,
    valueType: "STRING",
    allowsCommercialAccess: true,
  },
  [BILLING_ENTITLEMENT_KEYS.billingIntervalMonth]: {
    key: BILLING_ENTITLEMENT_KEYS.billingIntervalMonth,
    valueType: "BOOLEAN",
    allowsCommercialAccess: true,
  },
  [BILLING_ENTITLEMENT_KEYS.billingIntervalYear]: {
    key: BILLING_ENTITLEMENT_KEYS.billingIntervalYear,
    valueType: "BOOLEAN",
    allowsCommercialAccess: true,
  },
  [BILLING_ENTITLEMENT_KEYS.ksaComplianceAddOn]: {
    key: BILLING_ENTITLEMENT_KEYS.ksaComplianceAddOn,
    valueType: "BOOLEAN",
    allowsCommercialAccess: false,
  },
};

export function isBillingEntitlementKey(value: string): value is BillingEntitlementKey {
  return Object.prototype.hasOwnProperty.call(BILLING_ENTITLEMENT_REGISTRY, value);
}

export function assertBillingEntitlementValue(key: string, value: BillingEntitlementValue): asserts key is BillingEntitlementKey {
  if (!isBillingEntitlementKey(key)) {
    throw new BillingCatalogValidationError("UNKNOWN_ENTITLEMENT_KEY", `Unknown billing entitlement key: ${key}`);
  }

  const expectedType = BILLING_ENTITLEMENT_REGISTRY[key].valueType;
  if (expectedType === "BOOLEAN" && typeof value === "boolean") return;
  if (expectedType === "INTEGER" && typeof value === "number" && Number.isInteger(value) && value >= 0) return;
  if (expectedType === "STRING" && typeof value === "string" && value.trim().length > 0) return;

  throw new BillingCatalogValidationError("ENTITLEMENT_VALUE_TYPE_MISMATCH", `Invalid ${expectedType} value for billing entitlement: ${key}`);
}

export class BillingCatalogValidationError extends Error {
  constructor(
    readonly code: "UNKNOWN_ENTITLEMENT_KEY" | "ENTITLEMENT_VALUE_TYPE_MISMATCH" | "CATALOG_CONTRACT_VIOLATION",
    message: string,
  ) {
    super(message);
    this.name = "BillingCatalogValidationError";
  }
}
