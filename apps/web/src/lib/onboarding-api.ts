import { apiRequest } from "./api";
import type { TypedOnboardingArchetypeKey } from "./typed-onboarding";

export type TypedOnboardingApiProfileStatus = "DRAFT" | "ACTIVE" | "COMPLETED" | "ARCHIVED";
export type TypedOnboardingApiChecklistStatus = "DRAFT" | "ACTIVE" | "COMPLETED" | "ARCHIVED";
export type TypedOnboardingApiChecklistItemStatus =
  | "NOT_STARTED"
  | "AVAILABLE"
  | "BLOCKED"
  | "COMPLETED"
  | "SKIPPED"
  | "REOPENED";

export interface TypedOnboardingApiProfile {
  id: string;
  organizationId: string;
  branchId: string | null;
  selectedArchetypeKey: string;
  templateVersion: string;
  status: TypedOnboardingApiProfileStatus;
}

export interface TypedOnboardingApiChecklistItem {
  id: string;
  organizationId: string;
  branchId: string | null;
  onboardingChecklistId: string;
  itemKey: string;
  category: string;
  status: TypedOnboardingApiChecklistItemStatus;
  routeKey: string | null;
  setupProgressKey: string | null;
  blockedReasonCode: string | null;
  blockedReason: string | null;
  completedAt: string | null;
  skippedAt: string | null;
  reopenedAt: string | null;
}

export interface TypedOnboardingApiChecklist {
  id: string;
  organizationId: string;
  branchId: string | null;
  onboardingProfileId: string;
  templateVersion: string;
  status: TypedOnboardingApiChecklistStatus;
  generatedAt: string | null;
  items: TypedOnboardingApiChecklistItem[];
}

export interface TypedOnboardingApiState {
  profile: TypedOnboardingApiProfile | null;
  checklist: TypedOnboardingApiChecklist | null;
}

export async function loadTypedOnboardingState(): Promise<TypedOnboardingApiState> {
  const [profile, checklist] = await Promise.all([getTypedOnboardingProfile(), getTypedOnboardingChecklist()]);
  return { profile, checklist };
}

export function getTypedOnboardingProfile(): Promise<TypedOnboardingApiProfile | null> {
  return apiRequest<TypedOnboardingApiProfile | null>("/onboarding/profile");
}

export function updateTypedOnboardingProfile(selectedArchetypeKey: TypedOnboardingArchetypeKey): Promise<TypedOnboardingApiProfile> {
  return apiRequest<TypedOnboardingApiProfile>("/onboarding/profile", {
    method: "PUT",
    body: { selectedArchetypeKey },
  });
}

export function getTypedOnboardingChecklist(): Promise<TypedOnboardingApiChecklist | null> {
  return apiRequest<TypedOnboardingApiChecklist | null>("/onboarding/checklist");
}

export function recomputeTypedOnboardingChecklist(): Promise<TypedOnboardingApiChecklist> {
  return apiRequest<TypedOnboardingApiChecklist>("/onboarding/checklist/recompute", { method: "POST" });
}

export function completeTypedOnboardingChecklistItem(itemKey: string): Promise<TypedOnboardingApiChecklistItem> {
  return apiRequest<TypedOnboardingApiChecklistItem>(`/onboarding/checklist/items/${encodeURIComponent(itemKey)}/complete`, {
    method: "POST",
  });
}

export function skipTypedOnboardingChecklistItem(itemKey: string, reason?: string): Promise<TypedOnboardingApiChecklistItem> {
  return apiRequest<TypedOnboardingApiChecklistItem>(`/onboarding/checklist/items/${encodeURIComponent(itemKey)}/skip`, {
    method: "POST",
    body: reason ? { reason } : {},
  });
}

export function reopenTypedOnboardingChecklistItem(itemKey: string, reason?: string): Promise<TypedOnboardingApiChecklistItem> {
  return apiRequest<TypedOnboardingApiChecklistItem>(`/onboarding/checklist/items/${encodeURIComponent(itemKey)}/reopen`, {
    method: "POST",
    body: reason ? { reason } : {},
  });
}
