BEGIN;

CREATE TYPE "AccountingCloseCycleStatus" AS ENUM ('IN_PROGRESS', 'READY_FOR_REVIEW', 'REVIEWED', 'CLOSED', 'LOCKED');
CREATE TYPE "AccountingCloseTaskSource" AS ENUM ('SYSTEM', 'STANDARD_TEMPLATE', 'CUSTOM');
CREATE TYPE "AccountingCloseTaskStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED', 'ACKNOWLEDGED', 'NOT_APPLICABLE');
CREATE TYPE "AccountingCloseSeverity" AS ENUM ('BLOCKER', 'WARNING', 'INFORMATION', 'NOT_APPLICABLE');
CREATE TYPE "AccountingCloseSnapshotStatus" AS ENUM ('DRAFT', 'REVIEWED', 'CLOSED', 'LOCKED');

ALTER TABLE "FiscalPeriod" ADD CONSTRAINT "FiscalPeriod_organization_id_key" UNIQUE ("organizationId", "id");

CREATE TABLE "AccountingCloseCycle" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "fiscalPeriodId" UUID NOT NULL,
  "status" "AccountingCloseCycleStatus" NOT NULL DEFAULT 'IN_PROGRESS',
  "version" INTEGER NOT NULL DEFAULT 1,
  "startedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "startedByUserId" UUID,
  "preparedAt" TIMESTAMPTZ(3),
  "preparedByUserId" UUID,
  "reviewedAt" TIMESTAMPTZ(3),
  "reviewedByUserId" UUID,
  "closedAt" TIMESTAMPTZ(3),
  "closedByUserId" UUID,
  "lockedAt" TIMESTAMPTZ(3),
  "lockedByUserId" UUID,
  "lastRefreshedAt" TIMESTAMPTZ(3),
  "readinessHash" TEXT,
  "requestId" TEXT,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AccountingCloseCycle_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AccountingCloseCycle_org_period_key" UNIQUE ("organizationId", "fiscalPeriodId"),
  CONSTRAINT "AccountingCloseCycle_org_period_id_key" UNIQUE ("organizationId", "fiscalPeriodId", "id"),
  CONSTRAINT "AccountingCloseCycle_org_id_key" UNIQUE ("organizationId", "id"),
  CONSTRAINT "AccountingCloseCycle_organization_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "AccountingCloseCycle_org_period_fkey" FOREIGN KEY ("organizationId", "fiscalPeriodId") REFERENCES "FiscalPeriod"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "AccountingCloseCycle_started_by_fkey" FOREIGN KEY ("startedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "AccountingCloseCycle_prepared_by_fkey" FOREIGN KEY ("preparedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "AccountingCloseCycle_reviewed_by_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "AccountingCloseCycle_closed_by_fkey" FOREIGN KEY ("closedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "AccountingCloseCycle_locked_by_fkey" FOREIGN KEY ("lockedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "AccountingCloseTask" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "closeCycleId" UUID NOT NULL,
  "taskType" TEXT NOT NULL,
  "source" "AccountingCloseTaskSource" NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "severity" "AccountingCloseSeverity" NOT NULL,
  "status" "AccountingCloseTaskStatus" NOT NULL DEFAULT 'OPEN',
  "assignedToUserId" UUID,
  "dueDate" TIMESTAMPTZ(3),
  "completedAt" TIMESTAMPTZ(3),
  "completedByUserId" UUID,
  "reopenedAt" TIMESTAMPTZ(3),
  "reopenedByUserId" UUID,
  "acknowledgementReason" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "systemCheckKey" TEXT,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AccountingCloseTask_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AccountingCloseTask_org_id_key" UNIQUE ("organizationId", "id"),
  CONSTRAINT "AccountingCloseTask_org_cycle_id_key" UNIQUE ("organizationId", "closeCycleId", "id"),
  CONSTRAINT "AccountingCloseTask_cycle_system_check_key" UNIQUE ("closeCycleId", "systemCheckKey"),
  CONSTRAINT "AccountingCloseTask_organization_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "AccountingCloseTask_org_cycle_fkey" FOREIGN KEY ("organizationId", "closeCycleId") REFERENCES "AccountingCloseCycle"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "AccountingCloseTask_assigned_to_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "AccountingCloseTask_completed_by_fkey" FOREIGN KEY ("completedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "AccountingCloseTask_reopened_by_fkey" FOREIGN KEY ("reopenedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "AccountingCloseEvidence" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "closeCycleId" UUID NOT NULL,
  "closeTaskId" UUID,
  "evidenceType" TEXT NOT NULL,
  "entityType" TEXT,
  "entityId" TEXT,
  "reportType" TEXT,
  "generatedDocumentId" UUID,
  "safeLabel" TEXT NOT NULL,
  "safeMetadata" JSONB,
  "addedByUserId" UUID,
  "addedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AccountingCloseEvidence_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AccountingCloseEvidence_organization_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "AccountingCloseEvidence_org_cycle_fkey" FOREIGN KEY ("organizationId", "closeCycleId") REFERENCES "AccountingCloseCycle"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "AccountingCloseEvidence_org_cycle_task_fkey" FOREIGN KEY ("organizationId", "closeCycleId", "closeTaskId") REFERENCES "AccountingCloseTask"("organizationId", "closeCycleId", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "AccountingCloseEvidence_added_by_fkey" FOREIGN KEY ("addedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "AccountingCloseReadinessSnapshot" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "closeCycleId" UUID NOT NULL,
  "fiscalPeriodId" UUID NOT NULL,
  "capturedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "capturedByUserId" UUID,
  "status" "AccountingCloseSnapshotStatus" NOT NULL DEFAULT 'DRAFT',
  "blockerCount" INTEGER NOT NULL DEFAULT 0,
  "warningCount" INTEGER NOT NULL DEFAULT 0,
  "informationCount" INTEGER NOT NULL DEFAULT 0,
  "checkCount" INTEGER NOT NULL DEFAULT 0,
  "canonicalHash" TEXT NOT NULL,
  "sourceVersion" INTEGER NOT NULL DEFAULT 1,
  "requestId" TEXT,
  CONSTRAINT "AccountingCloseReadinessSnapshot_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AccountingCloseReadinessSnapshot_org_id_key" UNIQUE ("organizationId", "id"),
  CONSTRAINT "AccountingCloseReadinessSnapshot_organization_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "AccountingCloseReadinessSnapshot_org_period_cycle_fkey" FOREIGN KEY ("organizationId", "fiscalPeriodId", "closeCycleId") REFERENCES "AccountingCloseCycle"("organizationId", "fiscalPeriodId", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "AccountingCloseReadinessSnapshot_org_period_fkey" FOREIGN KEY ("organizationId", "fiscalPeriodId") REFERENCES "FiscalPeriod"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "AccountingCloseReadinessSnapshot_captured_by_fkey" FOREIGN KEY ("capturedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "AccountingCloseReadinessSnapshotItem" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "snapshotId" UUID NOT NULL,
  "checkKey" TEXT NOT NULL,
  "severity" "AccountingCloseSeverity" NOT NULL,
  "status" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "safeMessage" TEXT NOT NULL,
  "sourceEntityType" TEXT,
  "sourceEntityId" TEXT,
  "count" INTEGER,
  "amount" DECIMAL(20,4),
  "currencyCode" TEXT,
  "sourceUpdatedAt" TIMESTAMPTZ(3),
  "metadataSafe" JSONB,
  CONSTRAINT "AccountingCloseReadinessSnapshotItem_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AccountingCloseReadinessSnapshotItem_snapshot_check_key" UNIQUE ("snapshotId", "checkKey"),
  CONSTRAINT "AccountingCloseReadinessSnapshotItem_organization_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "AccountingCloseReadinessSnapshotItem_org_snapshot_fkey" FOREIGN KEY ("organizationId", "snapshotId") REFERENCES "AccountingCloseReadinessSnapshot"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "AccountingCloseCycle_org_status_updated_idx" ON "AccountingCloseCycle"("organizationId", "status", "updatedAt");
CREATE INDEX "AccountingCloseCycle_org_period_updated_idx" ON "AccountingCloseCycle"("organizationId", "fiscalPeriodId", "updatedAt");
CREATE INDEX "AccountingCloseCycle_request_id_idx" ON "AccountingCloseCycle"("requestId");
CREATE INDEX "AccountingCloseTask_org_cycle_status_idx" ON "AccountingCloseTask"("organizationId", "closeCycleId", "status");
CREATE INDEX "AccountingCloseTask_org_assignee_status_idx" ON "AccountingCloseTask"("organizationId", "assignedToUserId", "status");
CREATE INDEX "AccountingCloseEvidence_org_cycle_added_idx" ON "AccountingCloseEvidence"("organizationId", "closeCycleId", "addedAt");
CREATE INDEX "AccountingCloseEvidence_org_task_added_idx" ON "AccountingCloseEvidence"("organizationId", "closeTaskId", "addedAt");
CREATE INDEX "AccountingCloseEvidence_org_entity_idx" ON "AccountingCloseEvidence"("organizationId", "entityType", "entityId");
CREATE INDEX "AccountingCloseReadinessSnapshot_org_period_captured_idx" ON "AccountingCloseReadinessSnapshot"("organizationId", "fiscalPeriodId", "capturedAt");
CREATE INDEX "AccountingCloseReadinessSnapshot_org_cycle_captured_idx" ON "AccountingCloseReadinessSnapshot"("organizationId", "closeCycleId", "capturedAt");
CREATE INDEX "AccountingCloseReadinessSnapshot_request_id_idx" ON "AccountingCloseReadinessSnapshot"("requestId");
CREATE INDEX "AccountingCloseReadinessSnapshotItem_org_snapshot_idx" ON "AccountingCloseReadinessSnapshotItem"("organizationId", "snapshotId");
CREATE INDEX "AccountingCloseReadinessSnapshotItem_org_entity_idx" ON "AccountingCloseReadinessSnapshotItem"("organizationId", "sourceEntityType", "sourceEntityId");

CREATE FUNCTION "prevent_accounting_close_evidence_mutation"() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Accounting close evidence is immutable.';
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION "prevent_accounting_close_snapshot_mutation"() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Accounting close readiness snapshots are immutable.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "AccountingCloseEvidence_immutable"
BEFORE UPDATE OR DELETE ON "AccountingCloseEvidence"
FOR EACH ROW EXECUTE FUNCTION "prevent_accounting_close_evidence_mutation"();

CREATE TRIGGER "AccountingCloseReadinessSnapshot_immutable"
BEFORE UPDATE OR DELETE ON "AccountingCloseReadinessSnapshot"
FOR EACH ROW EXECUTE FUNCTION "prevent_accounting_close_snapshot_mutation"();

CREATE TRIGGER "AccountingCloseReadinessSnapshotItem_immutable"
BEFORE UPDATE OR DELETE ON "AccountingCloseReadinessSnapshotItem"
FOR EACH ROW EXECUTE FUNCTION "prevent_accounting_close_snapshot_mutation"();

COMMIT;
