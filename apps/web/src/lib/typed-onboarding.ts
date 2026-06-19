import { getAppRouteByKey, type AppRouteKey } from "./app-routes";
import { setupRouteForChecklistItem } from "./setup-onboarding-routes";
import type { SetupProgressCategory } from "./setup-progress";

export type TypedOnboardingArchetypeKey =
  | "general_services"
  | "software_saas"
  | "agency"
  | "trading"
  | "ecommerce"
  | "contractor"
  | "multi_entity"
  | "ksa_zatca_readiness"
  | "uae_einvoicing_readiness";

export type TypedOnboardingCapabilityStatus = "active" | "planned" | "blocked";

export interface TypedOnboardingChecklistTemplateItem {
  key: string;
  title: string;
  description: string;
  category: SetupProgressCategory;
  recommended: boolean;
  status: TypedOnboardingCapabilityStatus;
  routeKey?: AppRouteKey;
  setupProgressKey?: string;
  blockerCode?: string;
}

export interface TypedOnboardingArchetype {
  key: TypedOnboardingArchetypeKey;
  title: string;
  description: string;
  recommendedFor: string[];
  defaultChecklistItems: TypedOnboardingChecklistTemplateItem[];
}

type TemplateInput = Omit<TypedOnboardingChecklistTemplateItem, "routeKey" | "status" | "blockerCode"> & {
  status?: TypedOnboardingCapabilityStatus;
  routeKey?: AppRouteKey;
  blockerCode?: string;
};

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
] as const satisfies readonly TypedOnboardingArchetypeKey[];

const COMMON_FIRST_ACCOUNTING_LOOP: readonly TypedOnboardingChecklistTemplateItem[] = [
  setupProgressItem("organization_profile", {
    title: "Organization profile",
    description: "Confirm legal profile, base currency, timezone, and local tax identity before operational setup.",
    category: "business_profile",
  }),
  setupProgressItem("chart_of_accounts", {
    title: "Chart of accounts",
    description: "Confirm posting accounts exist before sales, purchasing, inventory, and payment workflows are used.",
    category: "business_profile",
  }),
  setupProgressItem("tax_profile", {
    title: "VAT/tax profile",
    description: "Review tax registration identity and active tax rates without enabling authority submission workflows.",
    category: "compliance",
  }),
  setupProgressItem("customer_created", {
    title: "First customer",
    description: "Create or review the first customer record from the customer workspace.",
    category: "contacts",
  }),
  setupProgressItem("first_invoice", {
    title: "First invoice",
    description: "Create a first draft invoice through the active sales invoice workflow.",
    category: "sales",
  }),
  setupProgressItem("bank_payment_method", {
    title: "Bank/payment method",
    description: "Review bank, cash, wallet, card, or other payment profile readiness.",
    category: "integrations",
  }),
  setupProgressItem("first_payment", {
    title: "First payment",
    description: "Record a first customer payment through the active customer payment workflow.",
    category: "sales",
  }),
  setupProgressItem("first_report", {
    title: "First report",
    description: "Review Profit & Loss after posted activity exists.",
    category: "reports",
  }),
  setupProgressItem("contact_vat_id_validation", {
    title: "Contact VAT/ID validation",
    description: "Review contact VAT and buyer-identification validation status in active contact workflows.",
    category: "contacts",
  }),
];

const PLANNED_TYPED_ONBOARDING_STATE = plannedItem({
  key: "typed_onboarding_state",
  title: "Typed onboarding state",
  description: "Future typed onboarding state remains metadata-only with no persistence, backend state, or active route.",
  category: "business_profile",
  recommended: false,
});

const GENERATED_DOCUMENT_OBJECT_STORAGE_BLOCKED = blockedItem({
  key: "generated_document_object_storage",
  title: "Generated-document object storage approval",
  description: "Generated-document object storage remains blocked until separate approval, hosted proof, and owner sign-off exist.",
  category: "storage",
  recommended: false,
  blockerCode: "GENERATED_DOCUMENT_OBJECT_STORAGE_BLOCKED",
});

const SIGNED_URLS_BLOCKED = blockedItem({
  key: "signed_url_delivery",
  title: "Signed URL delivery",
  description: "Signed URLs remain blocked until separately implemented, proven, and approved.",
  category: "storage",
  recommended: false,
  blockerCode: "SIGNED_URLS_BLOCKED",
});

const archetypes: readonly TypedOnboardingArchetype[] = [
  archetype("general_services", {
    title: "General services",
    description: "A balanced first accounting setup for service businesses that need customers, invoices, payments, and reporting before deeper workflows.",
    recommendedFor: ["Consultancies", "professional services", "small operating teams"],
    defaultChecklistItems: [...COMMON_FIRST_ACCOUNTING_LOOP, PLANNED_TYPED_ONBOARDING_STATE],
  }),
  archetype("software_saas", {
    title: "Software and SaaS",
    description: "A software subscription profile focused on customer records, invoicing, payment evidence, reporting, and future subscription metadata.",
    recommendedFor: ["Software vendors", "subscription services", "digital product teams"],
    defaultChecklistItems: [
      ...pickCommonItems(["organization_profile", "tax_profile", "customer_created", "first_invoice", "bank_payment_method", "first_payment", "first_report"]),
      plannedItem({
        key: "subscription_billing_profile",
        title: "Subscription billing profile",
        description: "Subscription billing templates remain planned metadata only and do not create recurring invoice runtime behavior.",
        category: "sales",
        recommended: true,
      }),
      PLANNED_TYPED_ONBOARDING_STATE,
      GENERATED_DOCUMENT_OBJECT_STORAGE_BLOCKED,
      SIGNED_URLS_BLOCKED,
    ],
  }),
  archetype("agency", {
    title: "Agency",
    description: "A client-services profile for customer setup, invoice workflow readiness, payment collection, and report review.",
    recommendedFor: ["Marketing agencies", "creative studios", "consulting teams"],
    defaultChecklistItems: [
      ...pickCommonItems(["organization_profile", "tax_profile", "customer_created", "first_invoice", "bank_payment_method", "first_payment", "first_report"]),
      plannedItem({
        key: "project_profitability_template",
        title: "Project profitability template",
        description: "Project profitability onboarding remains planned metadata and does not create project accounting runtime behavior.",
        category: "reports",
        recommended: true,
      }),
      PLANNED_TYPED_ONBOARDING_STATE,
    ],
  }),
  archetype("trading", {
    title: "Trading",
    description: "A trading profile that adds item, inventory, purchase, and stock review emphasis to the first accounting workflow.",
    recommendedFor: ["Wholesale traders", "importers", "distribution teams"],
    defaultChecklistItems: [
      ...COMMON_FIRST_ACCOUNTING_LOOP,
      routeItem("inventory_items", "inventory.items", {
        title: "Products and services",
        description: "Review products and services before inventory, sales, or purchase workflows depend on item records.",
        category: "business_profile",
        recommended: true,
      }),
      routeItem("purchase_bill_workflow", "purchase.bill.list", {
        title: "Purchase bill workflow",
        description: "Review purchase bill workflow access before payable transactions are entered.",
        category: "purchases",
        recommended: true,
      }),
      routeItem("inventory_balance_review", "inventory.balances", {
        title: "Inventory balance review",
        description: "Review inventory balance visibility without claiming inventory production readiness.",
        category: "business_profile",
        recommended: true,
      }),
      PLANNED_TYPED_ONBOARDING_STATE,
    ],
  }),
  archetype("ecommerce", {
    title: "Ecommerce",
    description: "An ecommerce profile focused on item catalog readiness, receivables flow, payment review, stock visibility, and future channel metadata.",
    recommendedFor: ["Online stores", "direct-to-consumer sellers", "marketplace operators"],
    defaultChecklistItems: [
      ...pickCommonItems(["organization_profile", "tax_profile", "customer_created", "first_invoice", "bank_payment_method", "first_payment", "first_report"]),
      routeItem("inventory_items", "inventory.items", {
        title: "Products and services",
        description: "Review item catalog readiness before sales and inventory workflows depend on product records.",
        category: "business_profile",
        recommended: true,
      }),
      routeItem("inventory_balance_review", "inventory.balances", {
        title: "Inventory balance review",
        description: "Review inventory balance visibility without enabling external channel synchronization.",
        category: "business_profile",
        recommended: true,
      }),
      plannedItem({
        key: "commerce_channel_mapping",
        title: "Commerce channel mapping",
        description: "Commerce channel mapping remains planned metadata and does not connect external stores or marketplaces.",
        category: "integrations",
        recommended: false,
      }),
      PLANNED_TYPED_ONBOARDING_STATE,
    ],
  }),
  archetype("contractor", {
    title: "Contractor",
    description: "A contractor profile for customer setup, invoice readiness, purchase capture, payment review, and future job-cost metadata.",
    recommendedFor: ["Contractors", "field-service teams", "project-based operators"],
    defaultChecklistItems: [
      ...pickCommonItems(["organization_profile", "chart_of_accounts", "tax_profile", "customer_created", "first_invoice", "bank_payment_method", "first_payment", "first_report"]),
      routeItem("purchase_bill_workflow", "purchase.bill.list", {
        title: "Purchase bill workflow",
        description: "Review purchase bill workflow access for supplier and project cost capture.",
        category: "purchases",
        recommended: true,
      }),
      plannedItem({
        key: "job_cost_template",
        title: "Job cost template",
        description: "Job-cost onboarding remains planned metadata and does not add project accounting runtime behavior.",
        category: "reports",
        recommended: true,
      }),
      PLANNED_TYPED_ONBOARDING_STATE,
    ],
  }),
  archetype("multi_entity", {
    title: "Multi-entity",
    description: "A multi-entity profile that keeps organization structure, branches, roles, and reporting visibility explicit without adding consolidation runtime behavior.",
    recommendedFor: ["Holding companies", "multi-branch operators", "groups preparing shared finance operations"],
    defaultChecklistItems: [
      ...pickCommonItems(["organization_profile", "chart_of_accounts", "tax_profile", "first_report"]),
      routeItem("branch_structure", "settings.branches", {
        title: "Branch structure",
        description: "Review branch setup from active organization structure screens.",
        category: "business_profile",
        recommended: true,
      }),
      routeItem("roles_and_permissions", "settings.roles", {
        title: "Roles and permissions",
        description: "Review role access before multiple teams use shared finance workflows.",
        category: "business_profile",
        recommended: true,
      }),
      plannedItem({
        key: "entity_consolidation_template",
        title: "Entity consolidation template",
        description: "Consolidation setup remains planned metadata and does not add consolidation runtime behavior.",
        category: "reports",
        recommended: true,
      }),
      PLANNED_TYPED_ONBOARDING_STATE,
    ],
  }),
  archetype("ksa_zatca_readiness", {
    title: "KSA local readiness",
    description: "A KSA-focused local-readiness profile for tax identity, contact validation, and local compliance visibility without production submission claims.",
    recommendedFor: ["KSA controlled-beta workspaces", "Saudi finance teams preparing local review"],
    defaultChecklistItems: [
      ...pickCommonItems(["organization_profile", "tax_profile", "contact_vat_id_validation", "first_invoice", "first_report"]),
      routeItem("ksa_local_readiness_visibility", "settings.zatca", {
        title: "KSA local readiness visibility",
        description: "Review local-readiness settings only; authority submission remains outside this metadata slice.",
        category: "compliance",
        recommended: true,
        setupProgressKey: "zatca_local_readiness_visible",
      }),
      blockedItem({
        key: "ksa_production_submission",
        title: "Production tax-authority submission",
        description: "Production submission remains blocked until credentials, specialist review, hosted proof, and explicit approval are separately completed.",
        category: "compliance",
        recommended: false,
        blockerCode: "COUNTRY_COMPLIANCE_PRODUCTION_BLOCKED",
      }),
      PLANNED_TYPED_ONBOARDING_STATE,
    ],
  }),
  archetype("uae_einvoicing_readiness", {
    title: "UAE eInvoicing local readiness",
    description: "A UAE-focused local-readiness profile for tax identity, contact validation, and provider-readiness tracking without production network claims.",
    recommendedFor: ["UAE controlled-beta workspaces", "finance teams preparing eInvoicing review"],
    defaultChecklistItems: [
      ...pickCommonItems(["organization_profile", "tax_profile", "contact_vat_id_validation", "first_invoice", "first_report"]),
      routeItem("uae_local_readiness_visibility", "settings.compliance", {
        title: "UAE local readiness visibility",
        description: "Review local-readiness settings only; provider validation and tax-authority reporting remain disabled.",
        category: "compliance",
        recommended: true,
        setupProgressKey: "zatca_local_readiness_visible",
      }),
      blockedItem({
        key: "uae_provider_network",
        title: "Provider network readiness",
        description: "Provider-network use remains blocked until provider evidence, sandbox proof, security review, and explicit approval are separately completed.",
        category: "compliance",
        recommended: false,
        blockerCode: "COUNTRY_COMPLIANCE_PRODUCTION_BLOCKED",
      }),
      PLANNED_TYPED_ONBOARDING_STATE,
    ],
  }),
] as const;

const archetypesByKey = new Map<TypedOnboardingArchetypeKey, TypedOnboardingArchetype>(archetypes.map((entry) => [entry.key, entry]));

export function getTypedOnboardingArchetypes(): TypedOnboardingArchetype[] {
  return archetypes.map(cloneArchetype);
}

export function getTypedOnboardingArchetype(key: TypedOnboardingArchetypeKey): TypedOnboardingArchetype | null {
  const archetypeDefinition = archetypesByKey.get(key);
  return archetypeDefinition ? cloneArchetype(archetypeDefinition) : null;
}

export function getDefaultTypedOnboardingChecklistTemplate(key: TypedOnboardingArchetypeKey): TypedOnboardingChecklistTemplateItem[] {
  return getTypedOnboardingArchetype(key)?.defaultChecklistItems ?? [];
}

export function getRecommendedTypedOnboardingTemplateItems(key: TypedOnboardingArchetypeKey): TypedOnboardingChecklistTemplateItem[] {
  return getDefaultTypedOnboardingChecklistTemplate(key).filter((item) => item.recommended);
}

export function getTypedOnboardingTemplateItemsByStatus(
  key: TypedOnboardingArchetypeKey,
  status: TypedOnboardingCapabilityStatus,
): TypedOnboardingChecklistTemplateItem[] {
  return getDefaultTypedOnboardingChecklistTemplate(key).filter((item) => item.status === status);
}

export function isTypedOnboardingTemplateItemActionable(
  item: TypedOnboardingChecklistTemplateItem,
): item is TypedOnboardingChecklistTemplateItem & { routeKey: AppRouteKey; status: "active" } {
  return item.status === "active" && Boolean(item.routeKey);
}

function archetype(
  key: TypedOnboardingArchetypeKey,
  definition: Omit<TypedOnboardingArchetype, "key">,
): TypedOnboardingArchetype {
  return { key, ...definition };
}

function setupProgressItem(
  setupProgressKey: string,
  input: Omit<TemplateInput, "key" | "recommended" | "setupProgressKey"> & { recommended?: boolean },
): TypedOnboardingChecklistTemplateItem {
  const setupRoute = setupRouteForChecklistItem(setupProgressKey);
  return {
    key: setupProgressKey,
    title: input.title,
    description: input.description,
    category: input.category,
    recommended: input.recommended ?? true,
    status: setupRoute ? "active" : "blocked",
    routeKey: setupRoute?.key,
    setupProgressKey,
    blockerCode: setupRoute ? undefined : "TYPED_ONBOARDING_ROUTE_UNAVAILABLE",
  };
}

function routeItem(
  key: string,
  routeKey: AppRouteKey,
  input: Omit<TemplateInput, "key" | "routeKey" | "status" | "blockerCode">,
): TypedOnboardingChecklistTemplateItem {
  const route = getAppRouteByKey(routeKey);
  const active = route?.capabilityStatus === "active";
  return {
    key,
    title: input.title,
    description: input.description,
    category: input.category,
    recommended: input.recommended,
    status: active ? "active" : "blocked",
    routeKey: active ? routeKey : undefined,
    setupProgressKey: input.setupProgressKey,
    blockerCode: active ? undefined : "TYPED_ONBOARDING_ROUTE_UNAVAILABLE",
  };
}

function plannedItem(input: Omit<TemplateInput, "status" | "routeKey" | "blockerCode">): TypedOnboardingChecklistTemplateItem {
  return {
    ...input,
    status: "planned",
  };
}

function blockedItem(input: Omit<TemplateInput, "status" | "routeKey"> & { blockerCode: string }): TypedOnboardingChecklistTemplateItem {
  return {
    ...input,
    status: "blocked",
  };
}

function pickCommonItems(keys: string[]): TypedOnboardingChecklistTemplateItem[] {
  const commonItemsByKey = new Map(COMMON_FIRST_ACCOUNTING_LOOP.map((item) => [item.key, item]));
  return keys.flatMap((key) => {
    const item = commonItemsByKey.get(key);
    return item ? [{ ...item }] : [];
  });
}

function cloneArchetype(archetypeDefinition: TypedOnboardingArchetype): TypedOnboardingArchetype {
  return {
    ...archetypeDefinition,
    recommendedFor: [...archetypeDefinition.recommendedFor],
    defaultChecklistItems: archetypeDefinition.defaultChecklistItems.map((item) => ({ ...item })),
  };
}
