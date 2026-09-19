ALTER TABLE "User" ADD COLUMN "emailVerifiedAt" TIMESTAMP(3);
ALTER TYPE "AuthTokenPurpose" ADD VALUE 'EMAIL_VERIFICATION';
ALTER TYPE "EmailTemplateType" ADD VALUE 'EMAIL_VERIFICATION';
ALTER TYPE "BillingLifecycleEventType" ADD VALUE 'TRIAL_EXPIRED';
CREATE INDEX "OrganizationSubscription_trial_expiry_idx" ON "OrganizationSubscription" ("status", "trialEndsAt");
