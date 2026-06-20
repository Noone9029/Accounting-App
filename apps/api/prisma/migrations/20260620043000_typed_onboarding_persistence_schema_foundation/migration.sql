-- Typed onboarding persistence schema foundation.
-- Additive only: no API endpoints, UI persistence, hosted mutations, provider
-- calls, storage behavior, signed URLs, or compliance readiness changes.

CREATE TYPE "OnboardingProfileStatus" AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED', 'RESET_REQUESTED', 'ARCHIVED');
CREATE TYPE "OnboardingChecklistStatus" AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED', 'RESET_REQUESTED', 'ARCHIVED');
CREATE TYPE "OnboardingChecklistItemStatus" AS ENUM ('NOT_STARTED', 'AVAILABLE', 'BLOCKED', 'COMPLETED', 'SKIPPED', 'REOPENED');
CREATE TYPE "OnboardingChecklistEventType" AS ENUM ('PROFILE_SELECTED', 'PROFILE_CHANGED', 'CHECKLIST_GENERATED', 'CHECKLIST_RECOMPUTED', 'ITEM_COMPLETED', 'ITEM_SKIPPED', 'ITEM_REOPENED', 'ITEM_BLOCKED', 'ITEM_ARCHIVED');
CREATE TYPE "OnboardingTemplateVersionStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

CREATE TABLE "OnboardingProfile" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "branchId" UUID,
    "selectedArchetypeKey" TEXT NOT NULL,
    "templateVersion" TEXT NOT NULL,
    "status" "OnboardingProfileStatus" NOT NULL DEFAULT 'DRAFT',
    "createdById" UUID,
    "updatedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OnboardingProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OnboardingChecklist" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "branchId" UUID,
    "onboardingProfileId" UUID NOT NULL,
    "templateVersion" TEXT NOT NULL,
    "status" "OnboardingChecklistStatus" NOT NULL DEFAULT 'DRAFT',
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdById" UUID,
    "updatedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OnboardingChecklist_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OnboardingChecklistItem" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "branchId" UUID,
    "onboardingChecklistId" UUID NOT NULL,
    "itemKey" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "status" "OnboardingChecklistItemStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "routeKey" TEXT,
    "setupProgressKey" TEXT,
    "blockedReasonCode" TEXT,
    "blockedReason" TEXT,
    "completedAt" TIMESTAMP(3),
    "completedById" UUID,
    "skippedAt" TIMESTAMP(3),
    "skippedById" UUID,
    "reopenedAt" TIMESTAMP(3),
    "reopenedById" UUID,
    "createdById" UUID,
    "updatedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OnboardingChecklistItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OnboardingChecklistEvent" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "branchId" UUID,
    "onboardingProfileId" UUID,
    "onboardingChecklistId" UUID,
    "onboardingChecklistItemId" UUID,
    "eventType" "OnboardingChecklistEventType" NOT NULL,
    "actorUserId" UUID,
    "previousValueJson" JSONB,
    "nextValueJson" JSONB,
    "payloadJson" JSONB,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OnboardingChecklistEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OnboardingTemplateVersion" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "version" TEXT NOT NULL,
    "archetypeKey" TEXT NOT NULL,
    "itemKeys" JSONB NOT NULL,
    "status" "OnboardingTemplateVersionStatus" NOT NULL DEFAULT 'DRAFT',
    "activatedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdById" UUID,
    "updatedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OnboardingTemplateVersion_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OnboardingProfile_organizationId_idx" ON "OnboardingProfile"("organizationId");
CREATE INDEX "OnboardingProfile_branchId_idx" ON "OnboardingProfile"("branchId");
CREATE INDEX "OnboardingProfile_organizationId_branchId_idx" ON "OnboardingProfile"("organizationId", "branchId");
CREATE INDEX "OnboardingProfile_organizationId_status_idx" ON "OnboardingProfile"("organizationId", "status");
CREATE INDEX "OnboardingProfile_organizationId_branchId_status_idx" ON "OnboardingProfile"("organizationId", "branchId", "status");
CREATE INDEX "OnboardingProfile_selectedArchetypeKey_idx" ON "OnboardingProfile"("selectedArchetypeKey");
CREATE INDEX "OnboardingProfile_templateVersion_idx" ON "OnboardingProfile"("templateVersion");
CREATE INDEX "OnboardingProfile_createdById_idx" ON "OnboardingProfile"("createdById");
CREATE INDEX "OnboardingProfile_updatedById_idx" ON "OnboardingProfile"("updatedById");
CREATE UNIQUE INDEX "OnboardingProfile_one_active_org_key" ON "OnboardingProfile"("organizationId") WHERE "branchId" IS NULL AND "status" = 'ACTIVE';
CREATE UNIQUE INDEX "OnboardingProfile_one_active_branch_key" ON "OnboardingProfile"("organizationId", "branchId") WHERE "branchId" IS NOT NULL AND "status" = 'ACTIVE';

CREATE INDEX "OnboardingChecklist_organizationId_idx" ON "OnboardingChecklist"("organizationId");
CREATE INDEX "OnboardingChecklist_branchId_idx" ON "OnboardingChecklist"("branchId");
CREATE INDEX "OnboardingChecklist_organizationId_branchId_idx" ON "OnboardingChecklist"("organizationId", "branchId");
CREATE INDEX "OnboardingChecklist_onboardingProfileId_idx" ON "OnboardingChecklist"("onboardingProfileId");
CREATE INDEX "OnboardingChecklist_organizationId_status_idx" ON "OnboardingChecklist"("organizationId", "status");
CREATE INDEX "OnboardingChecklist_organizationId_branchId_status_idx" ON "OnboardingChecklist"("organizationId", "branchId", "status");
CREATE INDEX "OnboardingChecklist_templateVersion_idx" ON "OnboardingChecklist"("templateVersion");
CREATE INDEX "OnboardingChecklist_createdById_idx" ON "OnboardingChecklist"("createdById");
CREATE INDEX "OnboardingChecklist_updatedById_idx" ON "OnboardingChecklist"("updatedById");
CREATE UNIQUE INDEX "OnboardingChecklist_one_active_profile_key" ON "OnboardingChecklist"("onboardingProfileId") WHERE "status" = 'ACTIVE';

CREATE UNIQUE INDEX "OnboardingChecklistItem_onboardingChecklistId_itemKey_key" ON "OnboardingChecklistItem"("onboardingChecklistId", "itemKey");
CREATE INDEX "OnboardingChecklistItem_organizationId_idx" ON "OnboardingChecklistItem"("organizationId");
CREATE INDEX "OnboardingChecklistItem_branchId_idx" ON "OnboardingChecklistItem"("branchId");
CREATE INDEX "OnboardingChecklistItem_organizationId_branchId_idx" ON "OnboardingChecklistItem"("organizationId", "branchId");
CREATE INDEX "OnboardingChecklistItem_onboardingChecklistId_idx" ON "OnboardingChecklistItem"("onboardingChecklistId");
CREATE INDEX "OnboardingChecklistItem_organizationId_status_idx" ON "OnboardingChecklistItem"("organizationId", "status");
CREATE INDEX "OnboardingChecklistItem_organizationId_branchId_status_idx" ON "OnboardingChecklistItem"("organizationId", "branchId", "status");
CREATE INDEX "OnboardingChecklistItem_itemKey_idx" ON "OnboardingChecklistItem"("itemKey");
CREATE INDEX "OnboardingChecklistItem_routeKey_idx" ON "OnboardingChecklistItem"("routeKey");
CREATE INDEX "OnboardingChecklistItem_setupProgressKey_idx" ON "OnboardingChecklistItem"("setupProgressKey");
CREATE INDEX "OnboardingChecklistItem_completedById_idx" ON "OnboardingChecklistItem"("completedById");
CREATE INDEX "OnboardingChecklistItem_skippedById_idx" ON "OnboardingChecklistItem"("skippedById");
CREATE INDEX "OnboardingChecklistItem_reopenedById_idx" ON "OnboardingChecklistItem"("reopenedById");
CREATE INDEX "OnboardingChecklistItem_createdById_idx" ON "OnboardingChecklistItem"("createdById");
CREATE INDEX "OnboardingChecklistItem_updatedById_idx" ON "OnboardingChecklistItem"("updatedById");

CREATE INDEX "OnboardingChecklistEvent_organizationId_idx" ON "OnboardingChecklistEvent"("organizationId");
CREATE INDEX "OnboardingChecklistEvent_branchId_idx" ON "OnboardingChecklistEvent"("branchId");
CREATE INDEX "OnboardingChecklistEvent_organizationId_branchId_idx" ON "OnboardingChecklistEvent"("organizationId", "branchId");
CREATE INDEX "OnboardingChecklistEvent_organizationId_eventType_idx" ON "OnboardingChecklistEvent"("organizationId", "eventType");
CREATE INDEX "OnboardingChecklistEvent_organizationId_createdAt_idx" ON "OnboardingChecklistEvent"("organizationId", "createdAt");
CREATE INDEX "OnboardingChecklistEvent_onboardingProfileId_idx" ON "OnboardingChecklistEvent"("onboardingProfileId");
CREATE INDEX "OnboardingChecklistEvent_onboardingChecklistId_idx" ON "OnboardingChecklistEvent"("onboardingChecklistId");
CREATE INDEX "OnboardingChecklistEvent_onboardingChecklistItemId_idx" ON "OnboardingChecklistEvent"("onboardingChecklistItemId");
CREATE INDEX "OnboardingChecklistEvent_actorUserId_idx" ON "OnboardingChecklistEvent"("actorUserId");

CREATE UNIQUE INDEX "OnboardingTemplateVersion_version_archetypeKey_key" ON "OnboardingTemplateVersion"("version", "archetypeKey");
CREATE INDEX "OnboardingTemplateVersion_version_idx" ON "OnboardingTemplateVersion"("version");
CREATE INDEX "OnboardingTemplateVersion_archetypeKey_idx" ON "OnboardingTemplateVersion"("archetypeKey");
CREATE INDEX "OnboardingTemplateVersion_archetypeKey_status_idx" ON "OnboardingTemplateVersion"("archetypeKey", "status");
CREATE INDEX "OnboardingTemplateVersion_status_idx" ON "OnboardingTemplateVersion"("status");
CREATE INDEX "OnboardingTemplateVersion_createdById_idx" ON "OnboardingTemplateVersion"("createdById");
CREATE INDEX "OnboardingTemplateVersion_updatedById_idx" ON "OnboardingTemplateVersion"("updatedById");

ALTER TABLE "OnboardingProfile" ADD CONSTRAINT "OnboardingProfile_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OnboardingProfile" ADD CONSTRAINT "OnboardingProfile_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OnboardingProfile" ADD CONSTRAINT "OnboardingProfile_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OnboardingProfile" ADD CONSTRAINT "OnboardingProfile_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "OnboardingChecklist" ADD CONSTRAINT "OnboardingChecklist_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OnboardingChecklist" ADD CONSTRAINT "OnboardingChecklist_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OnboardingChecklist" ADD CONSTRAINT "OnboardingChecklist_onboardingProfileId_fkey" FOREIGN KEY ("onboardingProfileId") REFERENCES "OnboardingProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OnboardingChecklist" ADD CONSTRAINT "OnboardingChecklist_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OnboardingChecklist" ADD CONSTRAINT "OnboardingChecklist_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "OnboardingChecklistItem" ADD CONSTRAINT "OnboardingChecklistItem_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OnboardingChecklistItem" ADD CONSTRAINT "OnboardingChecklistItem_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OnboardingChecklistItem" ADD CONSTRAINT "OnboardingChecklistItem_onboardingChecklistId_fkey" FOREIGN KEY ("onboardingChecklistId") REFERENCES "OnboardingChecklist"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OnboardingChecklistItem" ADD CONSTRAINT "OnboardingChecklistItem_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OnboardingChecklistItem" ADD CONSTRAINT "OnboardingChecklistItem_skippedById_fkey" FOREIGN KEY ("skippedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OnboardingChecklistItem" ADD CONSTRAINT "OnboardingChecklistItem_reopenedById_fkey" FOREIGN KEY ("reopenedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OnboardingChecklistItem" ADD CONSTRAINT "OnboardingChecklistItem_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OnboardingChecklistItem" ADD CONSTRAINT "OnboardingChecklistItem_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "OnboardingChecklistEvent" ADD CONSTRAINT "OnboardingChecklistEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OnboardingChecklistEvent" ADD CONSTRAINT "OnboardingChecklistEvent_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OnboardingChecklistEvent" ADD CONSTRAINT "OnboardingChecklistEvent_onboardingProfileId_fkey" FOREIGN KEY ("onboardingProfileId") REFERENCES "OnboardingProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OnboardingChecklistEvent" ADD CONSTRAINT "OnboardingChecklistEvent_onboardingChecklistId_fkey" FOREIGN KEY ("onboardingChecklistId") REFERENCES "OnboardingChecklist"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OnboardingChecklistEvent" ADD CONSTRAINT "OnboardingChecklistEvent_onboardingChecklistItemId_fkey" FOREIGN KEY ("onboardingChecklistItemId") REFERENCES "OnboardingChecklistItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OnboardingChecklistEvent" ADD CONSTRAINT "OnboardingChecklistEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "OnboardingTemplateVersion" ADD CONSTRAINT "OnboardingTemplateVersion_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OnboardingTemplateVersion" ADD CONSTRAINT "OnboardingTemplateVersion_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
