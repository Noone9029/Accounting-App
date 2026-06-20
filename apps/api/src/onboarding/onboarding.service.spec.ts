import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import {
  OnboardingChecklistEventType,
  OnboardingChecklistItemStatus,
  OnboardingChecklistStatus,
  OnboardingProfileStatus,
} from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { OnboardingService } from "./onboarding.service";
import { TYPED_ONBOARDING_TEMPLATE_VERSION, type OnboardingActorContext } from "./onboarding.types";

const orgA = "00000000-0000-4000-8000-000000000001";
const orgB = "00000000-0000-4000-8000-000000000002";
const branchA = "00000000-0000-4000-8000-000000000101";
const branchB = "00000000-0000-4000-8000-000000000102";
const actorId = "00000000-0000-4000-8000-000000000201";

interface FakeProfile {
  id: string;
  organizationId: string;
  branchId: string | null;
  selectedArchetypeKey: string;
  templateVersion: string;
  status: OnboardingProfileStatus;
  createdById: string | null;
  updatedById: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface FakeChecklist {
  id: string;
  organizationId: string;
  branchId: string | null;
  onboardingProfileId: string;
  templateVersion: string;
  status: OnboardingChecklistStatus;
  generatedAt: Date;
  completedAt: Date | null;
  archivedAt: Date | null;
  createdById: string | null;
  updatedById: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface FakeChecklistItem {
  id: string;
  organizationId: string;
  branchId: string | null;
  onboardingChecklistId: string;
  itemKey: string;
  category: string;
  status: OnboardingChecklistItemStatus;
  routeKey: string | null;
  setupProgressKey: string | null;
  blockedReasonCode: string | null;
  blockedReason: string | null;
  completedAt: Date | null;
  completedById: string | null;
  skippedAt: Date | null;
  skippedById: string | null;
  reopenedAt: Date | null;
  reopenedById: string | null;
  createdById: string | null;
  updatedById: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface FakeChecklistEvent {
  id: string;
  organizationId: string;
  branchId: string | null;
  onboardingProfileId: string | null;
  onboardingChecklistId: string | null;
  onboardingChecklistItemId: string | null;
  eventType: OnboardingChecklistEventType;
  actorUserId: string | null;
  previousValueJson: unknown;
  nextValueJson: unknown;
  payloadJson: unknown;
  reason: string | null;
  createdAt: Date;
}

class FakeOnboardingPrisma {
  profiles: FakeProfile[] = [];
  checklists: FakeChecklist[] = [];
  items: FakeChecklistItem[] = [];
  events: FakeChecklistEvent[] = [];

  private sequence = 0;

  onboardingProfile = {
    findFirst: jest.fn(async (args: { where: Partial<FakeProfile> }) => {
      return this.profiles
        .filter((profile) => this.matchesScope(profile, args.where))
        .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime())[0] ?? null;
    }),
    create: jest.fn(async (args: { data: Partial<FakeProfile> }) => {
      const now = new Date();
      const profile: FakeProfile = {
        id: this.nextId("profile"),
        organizationId: args.data.organizationId!,
        branchId: args.data.branchId ?? null,
        selectedArchetypeKey: args.data.selectedArchetypeKey!,
        templateVersion: args.data.templateVersion!,
        status: args.data.status ?? OnboardingProfileStatus.DRAFT,
        createdById: args.data.createdById ?? null,
        updatedById: args.data.updatedById ?? null,
        createdAt: now,
        updatedAt: now,
      };
      this.profiles.push(profile);
      return { ...profile };
    }),
    update: jest.fn(async (args: { where: { id: string }; data: Partial<FakeProfile> }) => {
      const profile = this.requireRecord(this.profiles, args.where.id, "profile");
      Object.assign(profile, args.data, { updatedAt: new Date() });
      return { ...profile };
    }),
  };

  onboardingChecklist = {
    findFirst: jest.fn(async (args: { where: Partial<FakeChecklist> }) => {
      const checklist =
        this.checklists
          .filter((entry) => this.matchesScope(entry, args.where))
          .sort((left, right) => right.generatedAt.getTime() - left.generatedAt.getTime())[0] ?? null;
      return checklist ? this.withItems(checklist) : null;
    }),
    create: jest.fn(async (args: { data: Partial<FakeChecklist>; include?: { items?: boolean } }) => {
      const now = new Date();
      const checklist: FakeChecklist = {
        id: this.nextId("checklist"),
        organizationId: args.data.organizationId!,
        branchId: args.data.branchId ?? null,
        onboardingProfileId: args.data.onboardingProfileId!,
        templateVersion: args.data.templateVersion!,
        status: args.data.status ?? OnboardingChecklistStatus.DRAFT,
        generatedAt: args.data.generatedAt ?? now,
        completedAt: null,
        archivedAt: null,
        createdById: args.data.createdById ?? null,
        updatedById: args.data.updatedById ?? null,
        createdAt: now,
        updatedAt: now,
      };
      this.checklists.push(checklist);
      return args.include?.items ? this.withItems(checklist) : { ...checklist };
    }),
    update: jest.fn(async (args: { where: { id: string }; data: Partial<FakeChecklist> }) => {
      const checklist = this.requireRecord(this.checklists, args.where.id, "checklist");
      Object.assign(checklist, args.data, { updatedAt: new Date() });
      return { ...checklist };
    }),
  };

  onboardingChecklistItem = {
    findFirst: jest.fn(async (args: { where: Partial<FakeChecklistItem> }) => {
      const item = this.items.find((entry) => this.matchesScope(entry, args.where));
      return item ? { ...item } : null;
    }),
    findMany: jest.fn(async (args: { where: Partial<FakeChecklistItem> }) => {
      return this.items.filter((item) => this.matchesScope(item, args.where)).map((item) => ({ ...item }));
    }),
    create: jest.fn(async (args: { data: Partial<FakeChecklistItem> }) => {
      const now = new Date();
      const item: FakeChecklistItem = {
        id: this.nextId("item"),
        organizationId: args.data.organizationId!,
        branchId: args.data.branchId ?? null,
        onboardingChecklistId: args.data.onboardingChecklistId!,
        itemKey: args.data.itemKey!,
        category: args.data.category!,
        status: args.data.status ?? OnboardingChecklistItemStatus.NOT_STARTED,
        routeKey: args.data.routeKey ?? null,
        setupProgressKey: args.data.setupProgressKey ?? null,
        blockedReasonCode: args.data.blockedReasonCode ?? null,
        blockedReason: args.data.blockedReason ?? null,
        completedAt: null,
        completedById: null,
        skippedAt: null,
        skippedById: null,
        reopenedAt: null,
        reopenedById: null,
        createdById: args.data.createdById ?? null,
        updatedById: args.data.updatedById ?? null,
        createdAt: now,
        updatedAt: now,
      };
      this.items.push(item);
      return { ...item };
    }),
    update: jest.fn(async (args: { where: { id: string }; data: Partial<FakeChecklistItem> }) => {
      const item = this.requireRecord(this.items, args.where.id, "item");
      Object.assign(item, args.data, { updatedAt: new Date() });
      return { ...item };
    }),
  };

  onboardingChecklistEvent = {
    create: jest.fn(async (args: { data: Partial<FakeChecklistEvent> }) => {
      const event: FakeChecklistEvent = {
        id: this.nextId("event"),
        organizationId: args.data.organizationId!,
        branchId: args.data.branchId ?? null,
        onboardingProfileId: args.data.onboardingProfileId ?? null,
        onboardingChecklistId: args.data.onboardingChecklistId ?? null,
        onboardingChecklistItemId: args.data.onboardingChecklistItemId ?? null,
        eventType: args.data.eventType!,
        actorUserId: args.data.actorUserId ?? null,
        previousValueJson: args.data.previousValueJson ?? null,
        nextValueJson: args.data.nextValueJson ?? null,
        payloadJson: args.data.payloadJson ?? null,
        reason: args.data.reason ?? null,
        createdAt: new Date(),
      };
      this.events.push(event);
      return { ...event };
    }),
  };

  private nextId(prefix: string): string {
    this.sequence += 1;
    return `${prefix}-${this.sequence}`;
  }

  private withItems(checklist: FakeChecklist): FakeChecklist & { items: FakeChecklistItem[] } {
    return {
      ...checklist,
      items: this.items
        .filter((item) => item.onboardingChecklistId === checklist.id)
        .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime() || left.itemKey.localeCompare(right.itemKey))
        .map((item) => ({ ...item })),
    };
  }

  private matchesScope<T extends object>(entry: T, where: Partial<T>): boolean {
    const record = entry as Record<string, unknown>;
    return Object.entries(where).every(([key, value]) => value === undefined || record[key] === value);
  }

  private requireRecord<T extends { id: string }>(records: T[], id: string, label: string): T {
    const record = records.find((entry) => entry.id === id);
    if (!record) {
      throw new Error(`Missing ${label}: ${id}`);
    }
    return record;
  }
}

describe("OnboardingService", () => {
  let prisma: FakeOnboardingPrisma;
  let service: OnboardingService;

  const managerContext = (overrides: Partial<OnboardingActorContext> = {}): OnboardingActorContext => ({
    organizationId: orgA,
    branchId: null,
    actorUserId: actorId,
    canReadOnboarding: true,
    canManageOnboarding: true,
    ...overrides,
  });

  beforeEach(() => {
    prisma = new FakeOnboardingPrisma();
    service = new OnboardingService(prisma as unknown as PrismaService);
  });

  it("gets or creates an active profile within the requested organization and branch scope", async () => {
    const profile = await service.getOrCreateProfile(managerContext({ branchId: branchA }), { selectedArchetypeKey: "agency" });

    expect(profile).toMatchObject({
      organizationId: orgA,
      branchId: branchA,
      selectedArchetypeKey: "agency",
      templateVersion: TYPED_ONBOARDING_TEMPLATE_VERSION,
      status: OnboardingProfileStatus.ACTIVE,
    });

    const sameScopeProfile = await service.getOrCreateProfile(managerContext({ branchId: branchA }));
    const differentBranchProfile = await service.getOrCreateProfile(managerContext({ branchId: branchB }));

    expect(sameScopeProfile.id).toBe(profile.id);
    expect(differentBranchProfile.id).not.toBe(profile.id);
    expect(prisma.profiles).toHaveLength(2);
  });

  it("requires explicit read or management permission in service context", async () => {
    await expect(
      service.getChecklist({
        organizationId: orgA,
        canReadOnboarding: false,
        canManageOnboarding: false,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    await expect(
      service.getOrCreateProfile({
        organizationId: orgA,
        canReadOnboarding: true,
        canManageOnboarding: false,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("updates selected archetype from the API-side allowlist and rejects unknown values", async () => {
    await service.getOrCreateProfile(managerContext());

    const updated = await service.updateSelectedArchetype(managerContext(), "software_saas");

    expect(updated.selectedArchetypeKey).toBe("software_saas");
    expect(prisma.events.map((event) => event.eventType)).toEqual([
      OnboardingChecklistEventType.PROFILE_SELECTED,
      OnboardingChecklistEventType.PROFILE_CHANGED,
    ]);
    await expect(service.updateSelectedArchetype(managerContext(), "external_archetype")).rejects.toBeInstanceOf(BadRequestException);
  });

  it("creates and recomputes checklist items from the current template version", async () => {
    await service.updateSelectedArchetype(managerContext(), "software_saas");

    const checklist = await service.recomputeChecklist(managerContext());

    expect(checklist.templateVersion).toBe(TYPED_ONBOARDING_TEMPLATE_VERSION);
    expect(checklist.organizationId).toBe(orgA);
    expect(checklist.items.map((item) => item.itemKey)).toEqual(
      expect.arrayContaining(["organization_profile", "subscription_billing_profile", "generated_document_object_storage", "signed_url_delivery"]),
    );
    expect(checklist.items.find((item) => item.itemKey === "organization_profile")?.status).toBe(OnboardingChecklistItemStatus.AVAILABLE);
    expect(checklist.items.find((item) => item.itemKey === "subscription_billing_profile")?.status).toBe(OnboardingChecklistItemStatus.NOT_STARTED);
    expect(checklist.items.find((item) => item.itemKey === "generated_document_object_storage")?.status).toBe(OnboardingChecklistItemStatus.BLOCKED);
    expect(prisma.events.map((event) => event.eventType)).toContain(OnboardingChecklistEventType.CHECKLIST_GENERATED);
  });

  it("preserves completed and skipped progress while appending newly introduced template items", async () => {
    await service.updateSelectedArchetype(managerContext(), "general_services");
    await service.recomputeChecklist(managerContext());
    await service.completeChecklistItem(managerContext(), "organization_profile");
    await service.skipChecklistItem(managerContext(), "tax_profile", "defer tax review");
    await service.updateSelectedArchetype(managerContext(), "trading");

    const recomputed = await service.recomputeChecklist(managerContext());
    const itemsByKey = new Map(recomputed.items.map((item) => [item.itemKey, item]));

    expect(itemsByKey.get("organization_profile")?.status).toBe(OnboardingChecklistItemStatus.COMPLETED);
    expect(itemsByKey.get("tax_profile")?.status).toBe(OnboardingChecklistItemStatus.SKIPPED);
    expect(itemsByKey.get("inventory_items")?.status).toBe(OnboardingChecklistItemStatus.AVAILABLE);
    expect(prisma.events.map((event) => event.eventType)).toContain(OnboardingChecklistEventType.CHECKLIST_RECOMPUTED);
  });

  it("leaves removed template items historical instead of hard-deleting them", async () => {
    await service.updateSelectedArchetype(managerContext(), "software_saas");
    await service.recomputeChecklist(managerContext());
    await service.updateSelectedArchetype(managerContext(), "agency");

    const recomputed = await service.recomputeChecklist(managerContext());
    const removedItem = recomputed.items.find((item) => item.itemKey === "generated_document_object_storage");
    const recomputeEvent = [...prisma.events].reverse().find((event: FakeChecklistEvent) => event.eventType === OnboardingChecklistEventType.CHECKLIST_RECOMPUTED);

    expect(removedItem?.status).toBe(OnboardingChecklistItemStatus.BLOCKED);
    expect(recomputeEvent?.payloadJson).toMatchObject({
      removedItemKeysLeftHistorical: expect.arrayContaining(["generated_document_object_storage", "signed_url_delivery"]),
    });
  });

  it("completes, skips, and reopens checklist items through allowed state transitions with events", async () => {
    await service.updateSelectedArchetype(managerContext(), "general_services");
    await service.recomputeChecklist(managerContext());

    const completed = await service.completeChecklistItem(managerContext(), "organization_profile");
    const skipped = await service.skipChecklistItem(managerContext(), "tax_profile");
    const reopened = await service.reopenChecklistItem(managerContext(), "tax_profile", "review again");

    expect(completed.status).toBe(OnboardingChecklistItemStatus.COMPLETED);
    expect(completed.completedById).toBe(actorId);
    expect(skipped.status).toBe(OnboardingChecklistItemStatus.SKIPPED);
    expect(skipped.skippedById).toBe(actorId);
    expect(reopened.status).toBe(OnboardingChecklistItemStatus.REOPENED);
    expect(reopened.reopenedById).toBe(actorId);
    expect(prisma.events.map((event) => event.eventType)).toEqual(
      expect.arrayContaining([
        OnboardingChecklistEventType.ITEM_COMPLETED,
        OnboardingChecklistEventType.ITEM_SKIPPED,
        OnboardingChecklistEventType.ITEM_REOPENED,
      ]),
    );
  });

  it("rejects blocked direct completion and invalid repeated transitions", async () => {
    await service.updateSelectedArchetype(managerContext(), "software_saas");
    await service.recomputeChecklist(managerContext());

    await expect(service.completeChecklistItem(managerContext(), "generated_document_object_storage")).rejects.toBeInstanceOf(BadRequestException);
    await service.completeChecklistItem(managerContext(), "organization_profile");
    await expect(service.completeChecklistItem(managerContext(), "organization_profile")).rejects.toBeInstanceOf(BadRequestException);
  });

  it("fails closed for cross-tenant or wrong-branch item mutations", async () => {
    await service.updateSelectedArchetype(managerContext({ branchId: branchA }), "general_services");
    await service.recomputeChecklist(managerContext({ branchId: branchA }));

    await expect(service.completeChecklistItem(managerContext({ organizationId: orgB, branchId: branchA }), "organization_profile")).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(service.completeChecklistItem(managerContext({ branchId: branchB }), "organization_profile")).rejects.toBeInstanceOf(NotFoundException);
  });

  it("records scoped event metadata for profile, recompute, and item mutations", async () => {
    await service.updateSelectedArchetype(managerContext({ branchId: branchA }), "agency");
    await service.recomputeChecklist(managerContext({ branchId: branchA }));
    await service.completeChecklistItem(managerContext({ branchId: branchA }), "organization_profile");
    await service.skipChecklistItem(managerContext({ branchId: branchA }), "first_invoice");
    await service.reopenChecklistItem(managerContext({ branchId: branchA }), "first_invoice");

    expect(prisma.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ organizationId: orgA, branchId: branchA, actorUserId: actorId, eventType: OnboardingChecklistEventType.PROFILE_SELECTED }),
        expect.objectContaining({ organizationId: orgA, branchId: branchA, actorUserId: actorId, eventType: OnboardingChecklistEventType.CHECKLIST_GENERATED }),
        expect.objectContaining({ organizationId: orgA, branchId: branchA, actorUserId: actorId, eventType: OnboardingChecklistEventType.ITEM_COMPLETED }),
        expect.objectContaining({ organizationId: orgA, branchId: branchA, actorUserId: actorId, eventType: OnboardingChecklistEventType.ITEM_SKIPPED }),
        expect.objectContaining({ organizationId: orgA, branchId: branchA, actorUserId: actorId, eventType: OnboardingChecklistEventType.ITEM_REOPENED }),
      ]),
    );
  });

  it("rejects explicit event references outside the current scope", async () => {
    await service.updateSelectedArchetype(managerContext({ branchId: branchA }), "general_services");
    const checklist = await service.recomputeChecklist(managerContext({ branchId: branchA }));

    await expect(
      service.recordChecklistEvent(managerContext({ organizationId: orgB, branchId: branchA }), {
        eventType: OnboardingChecklistEventType.CHECKLIST_RECOMPUTED,
        onboardingProfileId: checklist.onboardingProfileId,
        onboardingChecklistId: checklist.id,
        onboardingChecklistItemId: checklist.items[0]?.id,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("does not call provider, storage, signed URL, or compliance systems from blocked checklist behavior", async () => {
    const providerOrStorageCall = jest.fn();

    await service.updateSelectedArchetype(managerContext(), "software_saas");
    await service.recomputeChecklist(managerContext());
    await expect(service.completeChecklistItem(managerContext(), "signed_url_delivery")).rejects.toBeInstanceOf(BadRequestException);

    expect(providerOrStorageCall).not.toHaveBeenCalled();
  });

  it("does not add external inspiration references to onboarding production source", () => {
    const sourceFiles = ["onboarding.module.ts", "onboarding.service.ts", "onboarding.types.ts"].map((file) =>
      readFileSync(resolve(__dirname, file), "utf8"),
    );
    const externalReferencePattern = new RegExp(["Open", "Books"].join(""), "i");

    for (const source of sourceFiles) {
      expect(source).not.toMatch(externalReferencePattern);
    }
  });
});
