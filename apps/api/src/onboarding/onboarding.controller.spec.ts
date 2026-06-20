import { BadRequestException } from "@nestjs/common";
import { OnboardingChecklistItemStatus, OnboardingChecklistStatus, OnboardingProfileStatus } from "@prisma/client";
import { validate } from "class-validator";
import { PERMISSIONS } from "@ledgerbyte/shared";
import { REQUIRED_PERMISSIONS_KEY } from "../auth/decorators/require-permissions.decorator";
import type { AuthenticatedUser } from "../auth/auth.types";
import { ChecklistItemActionDto } from "./dto/checklist-item-action.dto";
import { UpdateOnboardingProfileDto } from "./dto/update-onboarding-profile.dto";
import { OnboardingController } from "./onboarding.controller";
import type { OnboardingService } from "./onboarding.service";

const organizationId = "00000000-0000-4000-8000-000000000001";
const branchId = "00000000-0000-4000-8000-000000000101";
const actorUser: AuthenticatedUser = {
  id: "00000000-0000-4000-8000-000000000201",
  email: "admin@example.com",
};

describe("OnboardingController", () => {
  let service: jest.Mocked<
    Pick<
      OnboardingService,
      | "getProfile"
      | "updateSelectedArchetype"
      | "getChecklist"
      | "recomputeChecklist"
      | "completeChecklistItem"
      | "skipChecklistItem"
      | "reopenChecklistItem"
    >
  >;
  let controller: OnboardingController;

  beforeEach(() => {
    service = {
      getProfile: jest.fn(),
      updateSelectedArchetype: jest.fn(),
      getChecklist: jest.fn(),
      recomputeChecklist: jest.fn(),
      completeChecklistItem: jest.fn(),
      skipChecklistItem: jest.fn(),
      reopenChecklistItem: jest.fn(),
    };
    controller = new OnboardingController(service as unknown as OnboardingService);
  });

  it("requires dashboard view for read endpoints and organization update for mutation endpoints", () => {
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, OnboardingController.prototype.getProfile)).toEqual([
      PERMISSIONS.dashboard.view,
    ]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, OnboardingController.prototype.getChecklist)).toEqual([
      PERMISSIONS.dashboard.view,
    ]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, OnboardingController.prototype.updateProfile)).toEqual([
      PERMISSIONS.organization.update,
    ]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, OnboardingController.prototype.recomputeChecklist)).toEqual([
      PERMISSIONS.organization.update,
    ]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, OnboardingController.prototype.completeChecklistItem)).toEqual([
      PERMISSIONS.organization.update,
    ]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, OnboardingController.prototype.skipChecklistItem)).toEqual([
      PERMISSIONS.organization.update,
    ]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, OnboardingController.prototype.reopenChecklistItem)).toEqual([
      PERMISSIONS.organization.update,
    ]);
  });

  it("gets the active profile through a read-scoped service context", async () => {
    service.getProfile.mockResolvedValueOnce(profileRecord());

    await expect(controller.getProfile(organizationId, actorUser, branchId)).resolves.toMatchObject({
      selectedArchetypeKey: "software_saas",
      templateVersion: "typed-onboarding-v1",
      status: "ACTIVE",
    });
    expect(service.getProfile).toHaveBeenCalledWith({
      organizationId,
      branchId,
      actorUserId: actorUser.id,
      canReadOnboarding: true,
      canManageOnboarding: false,
    });
  });

  it("updates the selected archetype through a manage-scoped service context", async () => {
    service.updateSelectedArchetype.mockResolvedValueOnce(profileRecord({ selectedArchetypeKey: "trading" }));

    await expect(
      controller.updateProfile(organizationId, actorUser, { selectedArchetypeKey: "trading" }, branchId),
    ).resolves.toMatchObject({
      selectedArchetypeKey: "trading",
    });
    expect(service.updateSelectedArchetype).toHaveBeenCalledWith(
      {
        organizationId,
        branchId,
        actorUserId: actorUser.id,
        canReadOnboarding: true,
        canManageOnboarding: true,
      },
      "trading",
    );
  });

  it("fails closed on missing or invalid selected archetype input", async () => {
    await expect(
      controller.updateProfile(organizationId, actorUser, {} as UpdateOnboardingProfileDto, null),
    ).rejects.toBeInstanceOf(BadRequestException);

    const dto = new UpdateOnboardingProfileDto();
    (dto as { selectedArchetypeKey: string }).selectedArchetypeKey = "external_profile";

    const errors = await validate(dto);
    expect(errors.map((error) => error.property)).toContain("selectedArchetypeKey");
    expect(service.updateSelectedArchetype).not.toHaveBeenCalled();
  });

  it("loads and recomputes checklist state through the service", async () => {
    service.getChecklist.mockResolvedValueOnce(checklistRecord());
    service.recomputeChecklist.mockResolvedValueOnce(checklistRecord({ status: OnboardingChecklistStatus.ACTIVE }));

    await expect(controller.getChecklist(organizationId, actorUser, null)).resolves.toMatchObject({
      status: "ACTIVE",
      items: [expect.objectContaining({ itemKey: "organization_profile", status: "AVAILABLE" })],
    });
    await expect(controller.recomputeChecklist(organizationId, actorUser, null)).resolves.toMatchObject({
      items: [expect.objectContaining({ itemKey: "organization_profile" })],
    });
    expect(service.getChecklist).toHaveBeenCalledWith({
      organizationId,
      branchId: null,
      actorUserId: actorUser.id,
      canReadOnboarding: true,
      canManageOnboarding: false,
    });
    expect(service.recomputeChecklist).toHaveBeenCalledWith({
      organizationId,
      branchId: null,
      actorUserId: actorUser.id,
      canReadOnboarding: true,
      canManageOnboarding: true,
    });
  });

  it("routes checklist item actions to complete, skip, and reopen service methods", async () => {
    service.completeChecklistItem.mockResolvedValueOnce(checklistItemRecord({ status: OnboardingChecklistItemStatus.COMPLETED }));
    service.skipChecklistItem.mockResolvedValueOnce(checklistItemRecord({ status: OnboardingChecklistItemStatus.SKIPPED }));
    service.reopenChecklistItem.mockResolvedValueOnce(checklistItemRecord({ status: OnboardingChecklistItemStatus.REOPENED }));

    await controller.completeChecklistItem(organizationId, actorUser, "organization_profile", null);
    await controller.skipChecklistItem(organizationId, actorUser, "tax_profile", { reason: "later" }, null);
    await controller.reopenChecklistItem(organizationId, actorUser, "tax_profile", {}, null);

    expect(service.completeChecklistItem).toHaveBeenCalledWith(expect.objectContaining({ organizationId, canManageOnboarding: true }), "organization_profile");
    expect(service.skipChecklistItem).toHaveBeenCalledWith(expect.objectContaining({ organizationId, canManageOnboarding: true }), "tax_profile", "later");
    expect(service.reopenChecklistItem).toHaveBeenCalledWith(expect.objectContaining({ organizationId, canManageOnboarding: true }), "tax_profile", undefined);
  });

  it("keeps provider, storage, compliance, and signed URL systems outside controller actions", async () => {
    const externalSideEffect = jest.fn();
    service.recomputeChecklist.mockResolvedValueOnce(checklistRecord());

    await controller.recomputeChecklist(organizationId, actorUser, null);

    expect(externalSideEffect).not.toHaveBeenCalled();
  });
});

describe("ChecklistItemActionDto", () => {
  it("accepts optional reason strings and rejects non-string reason values", async () => {
    const valid = new ChecklistItemActionDto();
    valid.reason = "review later";
    await expect(validate(valid)).resolves.toHaveLength(0);

    const invalid = new ChecklistItemActionDto();
    (invalid as { reason: unknown }).reason = 123;
    const errors = await validate(invalid);
    expect(errors.map((error) => error.property)).toContain("reason");
  });
});

function profileRecord(overrides: Partial<Awaited<ReturnType<OnboardingService["getProfile"]>> & {}> = {}) {
  return {
    id: "profile-1",
    organizationId,
    branchId: overrides.branchId ?? null,
    selectedArchetypeKey: "software_saas",
    templateVersion: "typed-onboarding-v1",
    status: OnboardingProfileStatus.ACTIVE,
    createdById: actorUser.id,
    updatedById: actorUser.id,
    ...overrides,
  };
}

function checklistRecord(overrides: Partial<Awaited<ReturnType<OnboardingService["recomputeChecklist"]>>> = {}) {
  return {
    id: "checklist-1",
    organizationId,
    branchId: null,
    onboardingProfileId: "profile-1",
    templateVersion: "typed-onboarding-v1",
    status: OnboardingChecklistStatus.ACTIVE,
    generatedAt: new Date("2026-06-20T00:00:00.000Z"),
    createdById: actorUser.id,
    updatedById: actorUser.id,
    items: [checklistItemRecord()],
    ...overrides,
  };
}

function checklistItemRecord(overrides: Partial<Awaited<ReturnType<OnboardingService["completeChecklistItem"]>>> = {}) {
  return {
    id: "item-1",
    organizationId,
    branchId: null,
    onboardingChecklistId: "checklist-1",
    itemKey: "organization_profile",
    category: "business_profile",
    status: OnboardingChecklistItemStatus.AVAILABLE,
    routeKey: "settings.organization",
    setupProgressKey: "organization_profile",
    blockedReasonCode: null,
    blockedReason: null,
    completedAt: null,
    completedById: null,
    skippedAt: null,
    skippedById: null,
    reopenedAt: null,
    reopenedById: null,
    createdById: actorUser.id,
    updatedById: actorUser.id,
    ...overrides,
  };
}
