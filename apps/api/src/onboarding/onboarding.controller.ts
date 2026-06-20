import { BadRequestException, Body, Controller, Get, Param, Post, Put, Query, UseGuards } from "@nestjs/common";
import { PERMISSIONS } from "@ledgerbyte/shared";
import type { AuthenticatedUser } from "../auth/auth.types";
import { CurrentOrganizationId } from "../auth/decorators/current-organization.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { RequirePermissions } from "../auth/decorators/require-permissions.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "../auth/guards/organization-context.guard";
import { PermissionGuard } from "../auth/guards/permission.guard";
import { ChecklistItemActionDto } from "./dto/checklist-item-action.dto";
import { UpdateOnboardingProfileDto } from "./dto/update-onboarding-profile.dto";
import { OnboardingService } from "./onboarding.service";
import type { OnboardingActorContext } from "./onboarding.types";

type OnboardingProfileResult = Awaited<ReturnType<OnboardingService["getProfile"]>>;
type OnboardingChecklistResult = NonNullable<Awaited<ReturnType<OnboardingService["getChecklist"]>>>;
type OnboardingChecklistItemResult = Awaited<ReturnType<OnboardingService["completeChecklistItem"]>>;

@Controller("onboarding")
@UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionGuard)
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Get("profile")
  @RequirePermissions(PERMISSIONS.dashboard.view)
  async getProfile(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query("branchId") branchId?: string | null,
  ) {
    const profile = await this.onboardingService.getProfile(this.readContext(organizationId, user, branchId));
    return profile ? this.profileDto(profile) : null;
  }

  @Put("profile")
  @RequirePermissions(PERMISSIONS.organization.update)
  async updateProfile(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateOnboardingProfileDto,
    @Query("branchId") branchId?: string | null,
  ) {
    if (!dto.selectedArchetypeKey) {
      throw new BadRequestException("selectedArchetypeKey is required.");
    }

    return this.profileDto(
      await this.onboardingService.updateSelectedArchetype(
        this.manageContext(organizationId, user, branchId),
        dto.selectedArchetypeKey,
      ),
    );
  }

  @Get("checklist")
  @RequirePermissions(PERMISSIONS.dashboard.view)
  async getChecklist(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query("branchId") branchId?: string | null,
  ) {
    const checklist = await this.onboardingService.getChecklist(this.readContext(organizationId, user, branchId));
    return checklist ? this.checklistDto(checklist) : null;
  }

  @Post("checklist/recompute")
  @RequirePermissions(PERMISSIONS.organization.update)
  async recomputeChecklist(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query("branchId") branchId?: string | null,
  ) {
    return this.checklistDto(await this.onboardingService.recomputeChecklist(this.manageContext(organizationId, user, branchId)));
  }

  @Post("checklist/items/:itemKey/complete")
  @RequirePermissions(PERMISSIONS.organization.update)
  async completeChecklistItem(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("itemKey") itemKey: string,
    @Query("branchId") branchId?: string | null,
  ) {
    return this.checklistItemDto(await this.onboardingService.completeChecklistItem(this.manageContext(organizationId, user, branchId), itemKey));
  }

  @Post("checklist/items/:itemKey/skip")
  @RequirePermissions(PERMISSIONS.organization.update)
  async skipChecklistItem(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("itemKey") itemKey: string,
    @Body() dto: ChecklistItemActionDto = {},
    @Query("branchId") branchId?: string | null,
  ) {
    return this.checklistItemDto(
      await this.onboardingService.skipChecklistItem(this.manageContext(organizationId, user, branchId), itemKey, dto.reason),
    );
  }

  @Post("checklist/items/:itemKey/reopen")
  @RequirePermissions(PERMISSIONS.organization.update)
  async reopenChecklistItem(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("itemKey") itemKey: string,
    @Body() dto: ChecklistItemActionDto = {},
    @Query("branchId") branchId?: string | null,
  ) {
    return this.checklistItemDto(
      await this.onboardingService.reopenChecklistItem(this.manageContext(organizationId, user, branchId), itemKey, dto.reason),
    );
  }

  private readContext(organizationId: string, user: AuthenticatedUser, branchId?: string | null): OnboardingActorContext {
    return {
      organizationId,
      branchId: this.cleanBranchId(branchId),
      actorUserId: user.id,
      canReadOnboarding: true,
      canManageOnboarding: false,
    };
  }

  private manageContext(organizationId: string, user: AuthenticatedUser, branchId?: string | null): OnboardingActorContext {
    return {
      ...this.readContext(organizationId, user, branchId),
      canManageOnboarding: true,
    };
  }

  private cleanBranchId(branchId?: string | null): string | null {
    const normalized = branchId?.trim();
    return normalized ? normalized : null;
  }

  private profileDto(profile: NonNullable<OnboardingProfileResult>) {
    return {
      id: profile.id,
      organizationId: profile.organizationId,
      branchId: profile.branchId,
      selectedArchetypeKey: profile.selectedArchetypeKey,
      templateVersion: profile.templateVersion,
      status: profile.status,
    };
  }

  private checklistDto(checklist: OnboardingChecklistResult) {
    return {
      id: checklist.id,
      organizationId: checklist.organizationId,
      branchId: checklist.branchId,
      onboardingProfileId: checklist.onboardingProfileId,
      templateVersion: checklist.templateVersion,
      status: checklist.status,
      generatedAt: checklist.generatedAt?.toISOString() ?? null,
      items: checklist.items.map((item) => this.checklistItemDto(item)),
    };
  }

  private checklistItemDto(item: OnboardingChecklistItemResult) {
    return {
      id: item.id,
      organizationId: item.organizationId,
      branchId: item.branchId,
      onboardingChecklistId: item.onboardingChecklistId,
      itemKey: item.itemKey,
      category: item.category,
      status: item.status,
      routeKey: item.routeKey ?? null,
      setupProgressKey: item.setupProgressKey ?? null,
      blockedReasonCode: item.blockedReasonCode ?? null,
      blockedReason: item.blockedReason ?? null,
      completedAt: item.completedAt?.toISOString() ?? null,
      skippedAt: item.skippedAt?.toISOString() ?? null,
      reopenedAt: item.reopenedAt?.toISOString() ?? null,
    };
  }
}
