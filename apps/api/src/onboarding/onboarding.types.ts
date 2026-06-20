import {
  OnboardingChecklistEventType,
  OnboardingChecklistItemStatus,
  type Prisma,
} from "@prisma/client";

export const TYPED_ONBOARDING_TEMPLATE_VERSION = "typed-onboarding-v1";

export const DEFAULT_TYPED_ONBOARDING_ARCHETYPE_KEY = "general_services";

export const TYPED_ONBOARDING_ARCHETYPE_KEYS = [
  "general_services",
  "software_saas",
  "agency",
  "trading",
  "ecommerce",
  "contractor",
  "multi_entity",
  "ksa_zatca_readiness",
  "uae_einvoicing_readiness",
] as const;

export type TypedOnboardingArchetypeKey = (typeof TYPED_ONBOARDING_ARCHETYPE_KEYS)[number];

export type OnboardingTemplateItemCapability = "active" | "planned" | "blocked";

export interface OnboardingActorContext {
  organizationId: string;
  branchId?: string | null;
  actorUserId?: string | null;
  canReadOnboarding?: boolean;
  canManageOnboarding?: boolean;
}

export interface OnboardingChecklistTemplateItem {
  itemKey: string;
  category: string;
  capability: OnboardingTemplateItemCapability;
  routeKey?: string;
  setupProgressKey?: string;
  blockedReasonCode?: string;
  blockedReason?: string;
}

export interface RecordOnboardingChecklistEventInput {
  eventType: OnboardingChecklistEventType;
  onboardingProfileId?: string | null;
  onboardingChecklistId?: string | null;
  onboardingChecklistItemId?: string | null;
  previousValueJson?: Prisma.InputJsonValue | null;
  nextValueJson?: Prisma.InputJsonValue | null;
  payloadJson?: Prisma.InputJsonValue | null;
  reason?: string | null;
}

const COMMON_FIRST_ACCOUNTING_LOOP: readonly OnboardingChecklistTemplateItem[] = [
  activeItem("organization_profile", "business_profile", {
    routeKey: "settings.organization",
    setupProgressKey: "organization_profile",
  }),
  activeItem("chart_of_accounts", "business_profile", {
    routeKey: "accounting.chartOfAccounts",
    setupProgressKey: "chart_of_accounts",
  }),
  activeItem("tax_profile", "compliance", {
    routeKey: "settings.taxRates",
    setupProgressKey: "tax_profile",
  }),
  activeItem("customer_created", "contacts", {
    routeKey: "contacts.customers",
    setupProgressKey: "customer_created",
  }),
  activeItem("first_invoice", "sales", {
    routeKey: "sales.invoices",
    setupProgressKey: "first_invoice",
  }),
  activeItem("bank_payment_method", "integrations", {
    routeKey: "banking.accounts",
    setupProgressKey: "bank_payment_method",
  }),
  activeItem("first_payment", "sales", {
    routeKey: "sales.customerPayments",
    setupProgressKey: "first_payment",
  }),
  activeItem("first_report", "reports", {
    routeKey: "reports.profitAndLoss",
    setupProgressKey: "first_report",
  }),
  activeItem("contact_vat_id_validation", "contacts", {
    routeKey: "contacts.customers",
    setupProgressKey: "contact_vat_id_validation",
  }),
];

const PLANNED_TYPED_ONBOARDING_STATE = plannedItem("typed_onboarding_state", "business_profile");

const GENERATED_DOCUMENT_OBJECT_STORAGE_BLOCKED = blockedItem("generated_document_object_storage", "storage", {
  blockedReasonCode: "GENERATED_DOCUMENT_OBJECT_STORAGE_BLOCKED",
  blockedReason: "Generated-document object storage remains blocked until separate approval, hosted proof, and owner sign-off exist.",
});

const SIGNED_URLS_BLOCKED = blockedItem("signed_url_delivery", "storage", {
  blockedReasonCode: "SIGNED_URLS_BLOCKED",
  blockedReason: "Signed URLs remain blocked until separately implemented, proven, and approved.",
});

const COUNTRY_COMPLIANCE_PRODUCTION_BLOCKED = {
  blockedReasonCode: "COUNTRY_COMPLIANCE_PRODUCTION_BLOCKED",
  blockedReason: "Production compliance/provider readiness remains blocked until separate evidence, specialist review, hosted proof, and explicit approval exist.",
} as const;

const TEMPLATES: Record<TypedOnboardingArchetypeKey, readonly OnboardingChecklistTemplateItem[]> = {
  general_services: [...COMMON_FIRST_ACCOUNTING_LOOP, PLANNED_TYPED_ONBOARDING_STATE],
  software_saas: [
    ...pickCommonItems(["organization_profile", "tax_profile", "customer_created", "first_invoice", "bank_payment_method", "first_payment", "first_report"]),
    plannedItem("subscription_billing_profile", "sales"),
    PLANNED_TYPED_ONBOARDING_STATE,
    GENERATED_DOCUMENT_OBJECT_STORAGE_BLOCKED,
    SIGNED_URLS_BLOCKED,
  ],
  agency: [
    ...pickCommonItems(["organization_profile", "tax_profile", "customer_created", "first_invoice", "bank_payment_method", "first_payment", "first_report"]),
    plannedItem("project_profitability_template", "reports"),
    PLANNED_TYPED_ONBOARDING_STATE,
  ],
  trading: [
    ...COMMON_FIRST_ACCOUNTING_LOOP,
    activeItem("inventory_items", "business_profile", { routeKey: "inventory.items" }),
    activeItem("purchase_bill_workflow", "purchases", { routeKey: "purchase.bill.list" }),
    activeItem("inventory_balance_review", "business_profile", { routeKey: "inventory.balances" }),
    PLANNED_TYPED_ONBOARDING_STATE,
  ],
  ecommerce: [
    ...pickCommonItems(["organization_profile", "tax_profile", "customer_created", "first_invoice", "bank_payment_method", "first_payment", "first_report"]),
    activeItem("inventory_items", "business_profile", { routeKey: "inventory.items" }),
    activeItem("inventory_balance_review", "business_profile", { routeKey: "inventory.balances" }),
    plannedItem("commerce_channel_mapping", "integrations"),
    PLANNED_TYPED_ONBOARDING_STATE,
  ],
  contractor: [
    ...pickCommonItems(["organization_profile", "chart_of_accounts", "tax_profile", "customer_created", "first_invoice", "bank_payment_method", "first_payment", "first_report"]),
    activeItem("purchase_bill_workflow", "purchases", { routeKey: "purchase.bill.list" }),
    plannedItem("job_cost_template", "reports"),
    PLANNED_TYPED_ONBOARDING_STATE,
  ],
  multi_entity: [
    ...pickCommonItems(["organization_profile", "chart_of_accounts", "tax_profile", "first_report"]),
    activeItem("branch_structure", "business_profile", { routeKey: "settings.branches" }),
    activeItem("roles_and_permissions", "business_profile", { routeKey: "settings.roles" }),
    plannedItem("entity_consolidation_template", "reports"),
    PLANNED_TYPED_ONBOARDING_STATE,
  ],
  ksa_zatca_readiness: [
    ...pickCommonItems(["organization_profile", "tax_profile", "contact_vat_id_validation", "first_invoice", "first_report"]),
    activeItem("ksa_local_readiness_visibility", "compliance", {
      routeKey: "settings.zatca",
      setupProgressKey: "zatca_local_readiness_visible",
    }),
    blockedItem("ksa_production_submission", "compliance", COUNTRY_COMPLIANCE_PRODUCTION_BLOCKED),
    PLANNED_TYPED_ONBOARDING_STATE,
  ],
  uae_einvoicing_readiness: [
    ...pickCommonItems(["organization_profile", "tax_profile", "contact_vat_id_validation", "first_invoice", "first_report"]),
    activeItem("uae_local_readiness_visibility", "compliance", {
      routeKey: "settings.compliance",
      setupProgressKey: "zatca_local_readiness_visible",
    }),
    blockedItem("uae_provider_network", "compliance", COUNTRY_COMPLIANCE_PRODUCTION_BLOCKED),
    PLANNED_TYPED_ONBOARDING_STATE,
  ],
};

export function isTypedOnboardingArchetypeKey(value: string): value is TypedOnboardingArchetypeKey {
  return (TYPED_ONBOARDING_ARCHETYPE_KEYS as readonly string[]).includes(value);
}

export function getTypedOnboardingChecklistTemplateItems(archetypeKey: TypedOnboardingArchetypeKey): OnboardingChecklistTemplateItem[] {
  return TEMPLATES[archetypeKey].map((item) => ({ ...item }));
}

export function checklistStatusForTemplateCapability(capability: OnboardingTemplateItemCapability): OnboardingChecklistItemStatus {
  if (capability === "active") {
    return OnboardingChecklistItemStatus.AVAILABLE;
  }
  if (capability === "blocked") {
    return OnboardingChecklistItemStatus.BLOCKED;
  }
  return OnboardingChecklistItemStatus.NOT_STARTED;
}

function activeItem(
  itemKey: string,
  category: string,
  input: Pick<OnboardingChecklistTemplateItem, "routeKey" | "setupProgressKey"> = {},
): OnboardingChecklistTemplateItem {
  return {
    itemKey,
    category,
    capability: "active",
    ...input,
  };
}

function plannedItem(itemKey: string, category: string): OnboardingChecklistTemplateItem {
  return {
    itemKey,
    category,
    capability: "planned",
  };
}

function blockedItem(
  itemKey: string,
  category: string,
  input: Pick<OnboardingChecklistTemplateItem, "blockedReasonCode" | "blockedReason">,
): OnboardingChecklistTemplateItem {
  return {
    itemKey,
    category,
    capability: "blocked",
    ...input,
  };
}

function pickCommonItems(itemKeys: readonly string[]): OnboardingChecklistTemplateItem[] {
  const commonItemsByKey = new Map(COMMON_FIRST_ACCOUNTING_LOOP.map((item) => [item.itemKey, item]));
  return itemKeys.flatMap((itemKey) => {
    const item = commonItemsByKey.get(itemKey);
    return item ? [{ ...item }] : [];
  });
}
