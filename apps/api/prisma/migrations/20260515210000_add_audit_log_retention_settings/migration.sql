CREATE TABLE "AuditLogRetentionSettings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "retentionDays" INTEGER NOT NULL DEFAULT 2555,
    "autoPurgeEnabled" BOOLEAN NOT NULL DEFAULT false,
    "exportBeforePurgeRequired" BOOLEAN NOT NULL DEFAULT true,
    "updatedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLogRetentionSettings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AuditLogRetentionSettings_organizationId_key" ON "AuditLogRetentionSettings"("organizationId");
CREATE INDEX "AuditLogRetentionSettings_organizationId_idx" ON "AuditLogRetentionSettings"("organizationId");
CREATE INDEX "AuditLogRetentionSettings_updatedById_idx" ON "AuditLogRetentionSettings"("updatedById");

ALTER TABLE "AuditLogRetentionSettings"
  ADD CONSTRAINT "AuditLogRetentionSettings_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AuditLogRetentionSettings"
  ADD CONSTRAINT "AuditLogRetentionSettings_updatedById_fkey"
  FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;