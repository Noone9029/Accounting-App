import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import {
  OnboardingChecklistEventType,
  OnboardingChecklistItemStatus,
  OnboardingChecklistStatus,
  OnboardingProfileStatus,
  Prisma,
} from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import {
  DEFAULT_TYPED_ONBOARDING_ARCHETYPE_KEY,
  TYPED_ONBOARDING_TEMPLATE_VERSION,
  checklistStatusForTemplateCapability,
  getTypedOnboardingChecklistTemplateItems,
  isTypedOnboardingArchetypeKey,
  type OnboardingActorContext,
  type OnboardingChecklistTemplateItem,
  type RecordOnboardingChecklistEventInput,
  type TypedOnboardingArchetypeKey,
} from "./onboarding.types";

const PROGRESS_PRESERVING_STATUSES = new Set<OnboardingChecklistItemStatus>([
  OnboardingChecklistItemStatus.COMPLETED,
  OnboardingChecklistItemStatus.SKIPPED,
  OnboardingChecklistItemStatus.REOPENED,
]);

const MUTABLE_ITEM_STATUSES = new Set<OnboardingChecklistItemStatus>([
  OnboardingChecklistItemStatus.NOT_STARTED,
  OnboardingChecklistItemStatus.AVAILABLE,
  OnboardingChecklistItemStatus.REOPENED,
]);

const REOPENABLE_ITEM_STATUSES: readonly OnboardingChecklistItemStatus[] = [
  OnboardingChecklistItemStatus.COMPLETED,
  OnboardingChecklistItemStatus.SKIPPED,
];

interface OnboardingScope {
  organizationId: string;
  branchId: string | null;
}

type OnboardingProfileRecord = {
  id: string;
  organizationId: string;
  branchId: string | null;
  selectedArchetypeKey: string;
  templateVersion: string;
  status: OnboardingProfileStatus;
  createdById?: string | null;
  updatedById?: string | null;
};

type OnboardingChecklistRecord = {
  id: string;
  organizationId: string;
  branchId: string | null;
  onboardingProfileId: string;
  templateVersion: string;
  status: OnboardingChecklistStatus;
  generatedAt?: Date;
  createdById?: string | null;
  updatedById?: string | null;
  items?: OnboardingChecklistItemRecord[];
};

type OnboardingChecklistItemRecord = {
  id: string;
  organizationId: string;
  branchId: string | null;
  onboardingChecklistId: string;
  itemKey: string;
  category: string;
  status: OnboardingChecklistItemStatus;
  routeKey?: string | null;
  setupProgressKey?: string | null;
  blockedReasonCode?: string | null;
  blockedReason?: string | null;
  completedAt?: Date | null;
  completedById?: string | null;
  skippedAt?: Date | null;
  skippedById?: string | null;
  reopenedAt?: Date | null;
  reopenedById?: string | null;
  createdById?: string | null;
  updatedById?: string | null;
};

@Injectable()
export class OnboardingService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrCreateProfile(
    context: OnboardingActorContext,
    input: { selectedArchetypeKey?: string } = {},
  ): Promise<OnboardingProfileRecord> {
    this.assertCanManage(context);
    const scope = this.scopeFromContext(context);
    const selectedArchetypeKey = this.readArchetypeKey(input.selectedArchetypeKey ?? DEFAULT_TYPED_ONBOARDING_ARCHETYPE_KEY);
    const existing = await this.findActiveProfile(scope);

    if (existing) {
      return existing;
    }

    const profile = await this.prisma.onboardingProfile.create({
      data: {
        organizationId: scope.organizationId,
        branchId: scope.branchId,
        selectedArchetypeKey,
        templateVersion: TYPED_ONBOARDING_TEMPLATE_VERSION,
        status: OnboardingProfileStatus.ACTIVE,
        createdById: context.actorUserId ?? null,
        updatedById: context.actorUserId ?? null,
      },
    });

    await this.createEvent(context, {
      eventType: OnboardingChecklistEventType.PROFILE_SELECTED,
      onboardingProfileId: profile.id,
      nextValueJson: this.toJson({
        selectedArchetypeKey: profile.selectedArchetypeKey,
        templateVersion: profile.templateVersion,
        status: profile.status,
      }),
    });

    return profile;
  }

  async updateSelectedArchetype(context: OnboardingActorContext, selectedArchetypeKey: string): Promise<OnboardingProfileRecord> {
    this.assertCanManage(context);
    const scope = this.scopeFromContext(context);
    const nextArchetypeKey = this.readArchetypeKey(selectedArchetypeKey);
    const existing = await this.findActiveProfile(scope);

    if (!existing) {
      return this.getOrCreateProfile(context, { selectedArchetypeKey: nextArchetypeKey });
    }

    const previousValue = {
      selectedArchetypeKey: existing.selectedArchetypeKey,
      templateVersion: existing.templateVersion,
      status: existing.status,
    };
    const updated = await this.prisma.onboardingProfile.update({
      where: { id: existing.id },
      data: {
        selectedArchetypeKey: nextArchetypeKey,
        templateVersion: TYPED_ONBOARDING_TEMPLATE_VERSION,
        updatedById: context.actorUserId ?? null,
      },
    });

    await this.createEvent(context, {
      eventType:
        previousValue.selectedArchetypeKey === nextArchetypeKey
          ? OnboardingChecklistEventType.PROFILE_SELECTED
          : OnboardingChecklistEventType.PROFILE_CHANGED,
      onboardingProfileId: updated.id,
      previousValueJson: this.toJson(previousValue),
      nextValueJson: this.toJson({
        selectedArchetypeKey: updated.selectedArchetypeKey,
        templateVersion: updated.templateVersion,
        status: updated.status,
      }),
    });

    return updated;
  }

  async getChecklist(context: OnboardingActorContext): Promise<(OnboardingChecklistRecord & { items: OnboardingChecklistItemRecord[] }) | null> {
    this.assertCanRead(context);
    const scope = this.scopeFromContext(context);
    const profile = await this.findActiveProfile(scope);
    if (!profile) {
      return null;
    }

    return this.findActiveChecklist(scope, profile.id);
  }

  async recomputeChecklist(context: OnboardingActorContext): Promise<OnboardingChecklistRecord & { items: OnboardingChecklistItemRecord[] }> {
    this.assertCanManage(context);
    const scope = this.scopeFromContext(context);
    const profile = await this.getOrCreateProfile(context);
    const archetypeKey = this.readArchetypeKey(profile.selectedArchetypeKey);
    const templateItems = getTypedOnboardingChecklistTemplateItems(archetypeKey);
    const existingChecklist = await this.findActiveChecklist(scope, profile.id);
    const checklist =
      existingChecklist ??
      (await this.prisma.onboardingChecklist.create({
        data: {
          organizationId: scope.organizationId,
          branchId: scope.branchId,
          onboardingProfileId: profile.id,
          templateVersion: TYPED_ONBOARDING_TEMPLATE_VERSION,
          status: OnboardingChecklistStatus.ACTIVE,
          generatedAt: new Date(),
          createdById: context.actorUserId ?? null,
          updatedById: context.actorUserId ?? null,
        },
        include: { items: true },
      }));

    if (checklist.templateVersion !== TYPED_ONBOARDING_TEMPLATE_VERSION) {
      await this.prisma.onboardingChecklist.update({
        where: { id: checklist.id },
        data: {
          templateVersion: TYPED_ONBOARDING_TEMPLATE_VERSION,
          updatedById: context.actorUserId ?? null,
        },
      });
    }

    const existingItems = await this.prisma.onboardingChecklistItem.findMany({
      where: {
        organizationId: scope.organizationId,
        branchId: scope.branchId,
        onboardingChecklistId: checklist.id,
      },
      orderBy: [{ createdAt: "asc" }, { itemKey: "asc" }],
    });
    const existingItemsByKey = new Map(existingItems.map((item) => [item.itemKey, item]));
    const addedItemKeys: string[] = [];
    const updatedItemKeys: string[] = [];

    for (const templateItem of templateItems) {
      const existingItem = existingItemsByKey.get(templateItem.itemKey);
      if (!existingItem) {
        await this.prisma.onboardingChecklistItem.create({
          data: this.itemCreateData(scope, context, checklist.id, templateItem),
        });
        addedItemKeys.push(templateItem.itemKey);
        continue;
      }

      const nextData = this.itemRecomputeData(existingItem, templateItem, context);
      await this.prisma.onboardingChecklistItem.update({
        where: { id: existingItem.id },
        data: nextData,
      });
      updatedItemKeys.push(templateItem.itemKey);
    }

    const templateItemKeys = new Set(templateItems.map((item) => item.itemKey));
    const removedItemKeysLeftHistorical = existingItems.filter((item) => !templateItemKeys.has(item.itemKey)).map((item) => item.itemKey);

    await this.createEvent(context, {
      eventType: existingChecklist ? OnboardingChecklistEventType.CHECKLIST_RECOMPUTED : OnboardingChecklistEventType.CHECKLIST_GENERATED,
      onboardingProfileId: profile.id,
      onboardingChecklistId: checklist.id,
      payloadJson: this.toJson({
        templateVersion: TYPED_ONBOARDING_TEMPLATE_VERSION,
        archetypeKey,
        addedItemKeys,
        updatedItemKeys,
        removedItemKeysLeftHistorical,
      }),
    });

    const recomputed = await this.findActiveChecklist(scope, profile.id);
    if (!recomputed) {
      throw new NotFoundException("Onboarding checklist not found.");
    }
    return recomputed;
  }

  async completeChecklistItem(context: OnboardingActorContext, itemKey: string): Promise<OnboardingChecklistItemRecord> {
    return this.transitionChecklistItem(context, itemKey, OnboardingChecklistItemStatus.COMPLETED, OnboardingChecklistEventType.ITEM_COMPLETED);
  }

  async skipChecklistItem(context: OnboardingActorContext, itemKey: string, reason?: string): Promise<OnboardingChecklistItemRecord> {
    return this.transitionChecklistItem(context, itemKey, OnboardingChecklistItemStatus.SKIPPED, OnboardingChecklistEventType.ITEM_SKIPPED, reason);
  }

  async reopenChecklistItem(context: OnboardingActorContext, itemKey: string, reason?: string): Promise<OnboardingChecklistItemRecord> {
    this.assertCanManage(context);
    const item = await this.findScopedChecklistItem(context, itemKey);
    if (!REOPENABLE_ITEM_STATUSES.includes(item.status)) {
      throw new BadRequestException("Only completed or skipped onboarding checklist items can be reopened.");
    }

    const updated = await this.prisma.onboardingChecklistItem.update({
      where: { id: item.id },
      data: {
        status: OnboardingChecklistItemStatus.REOPENED,
        reopenedAt: new Date(),
        reopenedById: context.actorUserId ?? null,
        updatedById: context.actorUserId ?? null,
      },
    });

    await this.createEvent(context, {
      eventType: OnboardingChecklistEventType.ITEM_REOPENED,
      onboardingProfileId: await this.activeProfileIdForItem(context),
      onboardingChecklistId: updated.onboardingChecklistId,
      onboardingChecklistItemId: updated.id,
      previousValueJson: this.itemEventValue(item),
      nextValueJson: this.itemEventValue(updated),
      reason: reason ?? null,
    });

    return updated;
  }

  async recordChecklistEvent(context: OnboardingActorContext, input: RecordOnboardingChecklistEventInput) {
    this.assertCanManage(context);
    await this.assertEventReferencesScoped(context, input);
    return this.createEvent(context, input);
  }

  private async transitionChecklistItem(
    context: OnboardingActorContext,
    itemKey: string,
    nextStatus: typeof OnboardingChecklistItemStatus.COMPLETED | typeof OnboardingChecklistItemStatus.SKIPPED,
    eventType: typeof OnboardingChecklistEventType.ITEM_COMPLETED | typeof OnboardingChecklistEventType.ITEM_SKIPPED,
    reason?: string,
  ): Promise<OnboardingChecklistItemRecord> {
    this.assertCanManage(context);
    const item = await this.findScopedChecklistItem(context, itemKey);
    if (item.status === OnboardingChecklistItemStatus.BLOCKED) {
      throw new BadRequestException("Blocked onboarding checklist items cannot be completed or skipped directly.");
    }
    if (!MUTABLE_ITEM_STATUSES.has(item.status)) {
      throw new BadRequestException(`Onboarding checklist item cannot transition from ${item.status} to ${nextStatus}.`);
    }

    const now = new Date();
    const updated = await this.prisma.onboardingChecklistItem.update({
      where: { id: item.id },
      data:
        nextStatus === OnboardingChecklistItemStatus.COMPLETED
          ? {
              status: nextStatus,
              completedAt: now,
              completedById: context.actorUserId ?? null,
              updatedById: context.actorUserId ?? null,
            }
          : {
              status: nextStatus,
              skippedAt: now,
              skippedById: context.actorUserId ?? null,
              updatedById: context.actorUserId ?? null,
            },
    });

    await this.createEvent(context, {
      eventType,
      onboardingProfileId: await this.activeProfileIdForItem(context),
      onboardingChecklistId: updated.onboardingChecklistId,
      onboardingChecklistItemId: updated.id,
      previousValueJson: this.itemEventValue(item),
      nextValueJson: this.itemEventValue(updated),
      reason: reason ?? null,
    });

    return updated;
  }

  private async findScopedChecklistItem(context: OnboardingActorContext, itemKey: string): Promise<OnboardingChecklistItemRecord> {
    const checklist = await this.getChecklist(context);
    const item = checklist?.items.find((candidate) => candidate.itemKey === itemKey);
    if (!item) {
      throw new NotFoundException("Onboarding checklist item not found.");
    }
    return item;
  }

  private async activeProfileIdForItem(context: OnboardingActorContext): Promise<string | null> {
    const scope = this.scopeFromContext(context);
    const profile = await this.findActiveProfile(scope);
    return profile?.id ?? null;
  }

  private async assertEventReferencesScoped(context: OnboardingActorContext, input: RecordOnboardingChecklistEventInput): Promise<void> {
    const scope = this.scopeFromContext(context);

    if (input.onboardingProfileId) {
      const profile = await this.prisma.onboardingProfile.findFirst({
        where: {
          id: input.onboardingProfileId,
          organizationId: scope.organizationId,
          branchId: scope.branchId,
        },
      });
      if (!profile) {
        throw new NotFoundException("Onboarding profile not found.");
      }
    }

    if (input.onboardingChecklistId) {
      const checklist = await this.prisma.onboardingChecklist.findFirst({
        where: {
          id: input.onboardingChecklistId,
          organizationId: scope.organizationId,
          branchId: scope.branchId,
        },
      });
      if (!checklist) {
        throw new NotFoundException("Onboarding checklist not found.");
      }
    }

    if (input.onboardingChecklistItemId) {
      const item = await this.prisma.onboardingChecklistItem.findFirst({
        where: {
          id: input.onboardingChecklistItemId,
          organizationId: scope.organizationId,
          branchId: scope.branchId,
        },
      });
      if (!item) {
        throw new NotFoundException("Onboarding checklist item not found.");
      }
    }
  }

  private async findActiveProfile(scope: OnboardingScope): Promise<OnboardingProfileRecord | null> {
    return this.prisma.onboardingProfile.findFirst({
      where: {
        organizationId: scope.organizationId,
        branchId: scope.branchId,
        status: OnboardingProfileStatus.ACTIVE,
      },
      orderBy: { updatedAt: "desc" },
    });
  }

  private async findActiveChecklist(
    scope: OnboardingScope,
    onboardingProfileId: string,
  ): Promise<(OnboardingChecklistRecord & { items: OnboardingChecklistItemRecord[] }) | null> {
    return this.prisma.onboardingChecklist.findFirst({
      where: {
        organizationId: scope.organizationId,
        branchId: scope.branchId,
        onboardingProfileId,
        status: OnboardingChecklistStatus.ACTIVE,
      },
      include: {
        items: {
          orderBy: [{ createdAt: "asc" }, { itemKey: "asc" }],
        },
      },
      orderBy: { generatedAt: "desc" },
    });
  }

  private itemCreateData(
    scope: OnboardingScope,
    context: OnboardingActorContext,
    onboardingChecklistId: string,
    templateItem: OnboardingChecklistTemplateItem,
  ) {
    return {
      organizationId: scope.organizationId,
      branchId: scope.branchId,
      onboardingChecklistId,
      itemKey: templateItem.itemKey,
      category: templateItem.category,
      status: checklistStatusForTemplateCapability(templateItem.capability),
      routeKey: templateItem.routeKey ?? null,
      setupProgressKey: templateItem.setupProgressKey ?? null,
      blockedReasonCode: templateItem.blockedReasonCode ?? null,
      blockedReason: templateItem.blockedReason ?? null,
      createdById: context.actorUserId ?? null,
      updatedById: context.actorUserId ?? null,
    };
  }

  private itemRecomputeData(
    existingItem: OnboardingChecklistItemRecord,
    templateItem: OnboardingChecklistTemplateItem,
    context: OnboardingActorContext,
  ) {
    const templateStatus = checklistStatusForTemplateCapability(templateItem.capability);
    return {
      category: templateItem.category,
      status: PROGRESS_PRESERVING_STATUSES.has(existingItem.status) ? existingItem.status : templateStatus,
      routeKey: templateItem.routeKey ?? null,
      setupProgressKey: templateItem.setupProgressKey ?? null,
      blockedReasonCode: templateItem.blockedReasonCode ?? null,
      blockedReason: templateItem.blockedReason ?? null,
      updatedById: context.actorUserId ?? null,
    };
  }

  private async createEvent(context: OnboardingActorContext, input: RecordOnboardingChecklistEventInput) {
    const scope = this.scopeFromContext(context);
    return this.prisma.onboardingChecklistEvent.create({
      data: {
        organizationId: scope.organizationId,
        branchId: scope.branchId,
        onboardingProfileId: input.onboardingProfileId ?? null,
        onboardingChecklistId: input.onboardingChecklistId ?? null,
        onboardingChecklistItemId: input.onboardingChecklistItemId ?? null,
        eventType: input.eventType,
        actorUserId: context.actorUserId ?? null,
        previousValueJson: input.previousValueJson ?? Prisma.JsonNull,
        nextValueJson: input.nextValueJson ?? Prisma.JsonNull,
        payloadJson: input.payloadJson ?? Prisma.JsonNull,
        reason: input.reason ?? null,
      },
    });
  }

  private assertCanRead(context: OnboardingActorContext): void {
    if (context.canReadOnboarding || context.canManageOnboarding) {
      return;
    }
    throw new ForbiddenException("Onboarding read permission is required.");
  }

  private assertCanManage(context: OnboardingActorContext): void {
    if (context.canManageOnboarding) {
      return;
    }
    throw new ForbiddenException("Onboarding management permission is required.");
  }

  private scopeFromContext(context: OnboardingActorContext): OnboardingScope {
    if (!context.organizationId?.trim()) {
      throw new BadRequestException("organizationId is required for onboarding operations.");
    }
    return {
      organizationId: context.organizationId,
      branchId: context.branchId ?? null,
    };
  }

  private readArchetypeKey(value: string): TypedOnboardingArchetypeKey {
    if (isTypedOnboardingArchetypeKey(value)) {
      return value;
    }
    throw new BadRequestException("Unsupported typed onboarding archetype.");
  }

  private itemEventValue(item: OnboardingChecklistItemRecord): Prisma.InputJsonValue {
    return this.toJson({
      itemKey: item.itemKey,
      status: item.status,
      completedAt: item.completedAt?.toISOString() ?? null,
      skippedAt: item.skippedAt?.toISOString() ?? null,
      reopenedAt: item.reopenedAt?.toISOString() ?? null,
    });
  }

  private toJson(value: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }
}
