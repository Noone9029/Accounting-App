import { apiRequest } from "./api";
import {
  completeTypedOnboardingChecklistItem,
  getTypedOnboardingChecklist,
  getTypedOnboardingProfile,
  loadTypedOnboardingState,
  recomputeTypedOnboardingChecklist,
  reopenTypedOnboardingChecklistItem,
  skipTypedOnboardingChecklistItem,
  updateTypedOnboardingProfile,
} from "./onboarding-api";

jest.mock("./api", () => ({
  apiRequest: jest.fn(),
}));

const apiRequestMock = apiRequest as jest.MockedFunction<typeof apiRequest>;

describe("typed onboarding API client", () => {
  beforeEach(() => {
    apiRequestMock.mockReset();
  });

  it("loads profile and checklist through the LedgerByte onboarding API", async () => {
    apiRequestMock.mockResolvedValueOnce(profile()).mockResolvedValueOnce(checklist());

    await expect(loadTypedOnboardingState()).resolves.toEqual({
      profile: profile(),
      checklist: checklist(),
    });

    expect(apiRequestMock).toHaveBeenNthCalledWith(1, "/onboarding/profile");
    expect(apiRequestMock).toHaveBeenNthCalledWith(2, "/onboarding/checklist");
  });

  it("updates selected archetype without browser-side persistence", async () => {
    const setItem = jest.spyOn(Storage.prototype, "setItem");
    apiRequestMock.mockResolvedValueOnce(profile({ selectedArchetypeKey: "trading" }));

    await expect(updateTypedOnboardingProfile("trading")).resolves.toMatchObject({
      selectedArchetypeKey: "trading",
    });

    expect(apiRequestMock).toHaveBeenCalledWith("/onboarding/profile", {
      method: "PUT",
      body: { selectedArchetypeKey: "trading" },
    });
    expect(setItem).not.toHaveBeenCalled();
    setItem.mockRestore();
  });

  it("exposes checklist recompute and item actions through narrow API calls", async () => {
    apiRequestMock
      .mockResolvedValueOnce(checklist())
      .mockResolvedValueOnce(item({ status: "COMPLETED" }))
      .mockResolvedValueOnce(item({ status: "SKIPPED" }))
      .mockResolvedValueOnce(item({ status: "REOPENED" }));

    await recomputeTypedOnboardingChecklist();
    await completeTypedOnboardingChecklistItem("organization profile");
    await skipTypedOnboardingChecklistItem("tax_profile", "defer");
    await reopenTypedOnboardingChecklistItem("tax_profile");

    expect(apiRequestMock).toHaveBeenNthCalledWith(1, "/onboarding/checklist/recompute", { method: "POST" });
    expect(apiRequestMock).toHaveBeenNthCalledWith(2, "/onboarding/checklist/items/organization%20profile/complete", { method: "POST" });
    expect(apiRequestMock).toHaveBeenNthCalledWith(3, "/onboarding/checklist/items/tax_profile/skip", {
      method: "POST",
      body: { reason: "defer" },
    });
    expect(apiRequestMock).toHaveBeenNthCalledWith(4, "/onboarding/checklist/items/tax_profile/reopen", {
      method: "POST",
      body: {},
    });
  });

  it("can load profile and checklist separately", async () => {
    apiRequestMock.mockResolvedValueOnce(profile()).mockResolvedValueOnce(checklist());

    await getTypedOnboardingProfile();
    await getTypedOnboardingChecklist();

    expect(apiRequestMock).toHaveBeenNthCalledWith(1, "/onboarding/profile");
    expect(apiRequestMock).toHaveBeenNthCalledWith(2, "/onboarding/checklist");
  });
});

function profile(overrides = {}) {
  return {
    id: "profile-1",
    organizationId: "org-1",
    branchId: null,
    selectedArchetypeKey: "software_saas",
    templateVersion: "typed-onboarding-v1",
    status: "ACTIVE",
    ...overrides,
  };
}

function checklist(overrides = {}) {
  return {
    id: "checklist-1",
    organizationId: "org-1",
    branchId: null,
    onboardingProfileId: "profile-1",
    templateVersion: "typed-onboarding-v1",
    status: "ACTIVE",
    generatedAt: "2026-06-20T00:00:00.000Z",
    items: [item()],
    ...overrides,
  };
}

function item(overrides = {}) {
  return {
    id: "item-1",
    organizationId: "org-1",
    branchId: null,
    onboardingChecklistId: "checklist-1",
    itemKey: "organization_profile",
    category: "business_profile",
    status: "AVAILABLE",
    routeKey: "settings.organization",
    setupProgressKey: "organization_profile",
    blockedReasonCode: null,
    blockedReason: null,
    completedAt: null,
    skippedAt: null,
    reopenedAt: null,
    ...overrides,
  };
}
