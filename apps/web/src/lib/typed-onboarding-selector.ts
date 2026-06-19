import {
  getDefaultTypedOnboardingChecklistTemplate,
  getTypedOnboardingArchetype,
  getTypedOnboardingArchetypes,
  isTypedOnboardingTemplateItemActionable,
  type TypedOnboardingArchetype,
  type TypedOnboardingArchetypeKey,
  type TypedOnboardingCapabilityStatus,
  type TypedOnboardingChecklistTemplateItem,
} from "./typed-onboarding";

export interface TypedOnboardingSelectorOption {
  key: TypedOnboardingArchetypeKey;
  title: string;
  description: string;
  recommendedFor: string[];
  status: TypedOnboardingCapabilityStatus;
}

export interface TypedOnboardingSelectorSummary {
  active: number;
  planned: number;
  blocked: number;
  total: number;
  actionable: number;
  nonActionable: number;
}

export interface TypedOnboardingSelectorPreview {
  selectedKey: TypedOnboardingArchetypeKey;
  archetype: TypedOnboardingArchetype;
  options: TypedOnboardingSelectorOption[];
  items: TypedOnboardingChecklistTemplateItem[];
  summary: TypedOnboardingSelectorSummary;
}

const DEFAULT_TYPED_ONBOARDING_SELECTOR_VALUE = "general_services" satisfies TypedOnboardingArchetypeKey;

export function getDefaultTypedOnboardingSelectorValue(): TypedOnboardingArchetypeKey {
  return DEFAULT_TYPED_ONBOARDING_SELECTOR_VALUE;
}

export function getTypedOnboardingSelectorOptions(): TypedOnboardingSelectorOption[] {
  return getTypedOnboardingArchetypes().map((archetype) => ({
    key: archetype.key,
    title: archetype.title,
    description: archetype.description,
    recommendedFor: [...archetype.recommendedFor],
    status: "active",
  }));
}

export function isSelectableTypedOnboardingArchetype(value: unknown): value is TypedOnboardingArchetypeKey {
  if (typeof value !== "string") {
    return false;
  }

  return getTypedOnboardingSelectorOptions().some((option) => option.key === value && option.status === "active");
}

export function resolveTypedOnboardingSelectorValue(value: unknown): TypedOnboardingArchetypeKey {
  return isSelectableTypedOnboardingArchetype(value) ? value : getDefaultTypedOnboardingSelectorValue();
}

export function getTypedOnboardingSelectorPreview(value?: unknown): TypedOnboardingSelectorPreview {
  const selectedKey = resolveTypedOnboardingSelectorValue(value);
  const archetype = getTypedOnboardingArchetype(selectedKey) ?? requireDefaultArchetype();
  const items = getDefaultTypedOnboardingChecklistTemplate(archetype.key);

  return {
    selectedKey: archetype.key,
    archetype,
    options: getTypedOnboardingSelectorOptions(),
    items,
    summary: getTypedOnboardingSelectorSummary(archetype.key),
  };
}

export function getTypedOnboardingSelectorSummary(value?: unknown): TypedOnboardingSelectorSummary {
  const selectedKey = resolveTypedOnboardingSelectorValue(value);
  const items = getDefaultTypedOnboardingChecklistTemplate(selectedKey);
  const statusCounts = items.reduce(
    (total, item) => ({
      ...total,
      [item.status]: total[item.status] + 1,
    }),
    { active: 0, planned: 0, blocked: 0 } satisfies Record<TypedOnboardingCapabilityStatus, number>,
  );
  const actionable = items.filter(isTypedOnboardingTemplateItemActionable).length;

  return {
    ...statusCounts,
    total: items.length,
    actionable,
    nonActionable: items.length - actionable,
  };
}

function requireDefaultArchetype(): TypedOnboardingArchetype {
  const fallback = getTypedOnboardingArchetype(getDefaultTypedOnboardingSelectorValue());
  if (!fallback) {
    throw new Error("Default typed onboarding archetype is unavailable.");
  }

  return fallback;
}
