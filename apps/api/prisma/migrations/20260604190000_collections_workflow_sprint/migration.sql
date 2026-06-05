-- Add controlled, non-posting Sales/AR collections workflow.
ALTER TYPE "NumberSequenceScope" ADD VALUE IF NOT EXISTS 'COLLECTION_CASE';

CREATE TYPE "CollectionCaseStatus" AS ENUM (
  'OPEN',
  'IN_PROGRESS',
  'PROMISED_TO_PAY',
  'PAID',
  'ON_HOLD',
  'DISPUTED',
  'CLOSED',
  'CANCELLED'
);

CREATE TYPE "CollectionPriority" AS ENUM (
  'LOW',
  'NORMAL',
  'HIGH',
  'URGENT'
);

CREATE TYPE "CollectionActivityType" AS ENUM (
  'NOTE',
  'CALL',
  'EMAIL_PLANNED',
  'REMINDER_PLANNED',
  'PROMISE_TO_PAY',
  'DISPUTE',
  'ESCALATION',
  'PAYMENT_RECEIVED_NOTE',
  'CLOSED_NOTE'
);

CREATE TABLE "CollectionCase" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "caseNumber" TEXT NOT NULL,
  "customerId" UUID NOT NULL,
  "salesInvoiceId" UUID,
  "status" "CollectionCaseStatus" NOT NULL DEFAULT 'OPEN',
  "priority" "CollectionPriority" NOT NULL DEFAULT 'NORMAL',
  "followUpDate" TIMESTAMP(3),
  "promisedPaymentDate" TIMESTAMP(3),
  "promisedAmount" DECIMAL(20, 4),
  "assignedToUserId" UUID,
  "lastActivityAt" TIMESTAMP(3),
  "nextActionAt" TIMESTAMP(3),
  "summary" TEXT,
  "notes" TEXT,
  "createdById" UUID,
  "updatedById" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CollectionCase_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CollectionActivity" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "collectionCaseId" UUID NOT NULL,
  "customerId" UUID NOT NULL,
  "salesInvoiceId" UUID,
  "activityType" "CollectionActivityType" NOT NULL,
  "activityDate" TIMESTAMP(3) NOT NULL,
  "note" TEXT NOT NULL,
  "nextFollowUpDate" TIMESTAMP(3),
  "promisedPaymentDate" TIMESTAMP(3),
  "promisedAmount" DECIMAL(20, 4),
  "createdById" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CollectionActivity_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CollectionCase_organizationId_caseNumber_key" ON "CollectionCase"("organizationId", "caseNumber");
CREATE INDEX "CollectionCase_organizationId_idx" ON "CollectionCase"("organizationId");
CREATE INDEX "CollectionCase_customerId_idx" ON "CollectionCase"("customerId");
CREATE INDEX "CollectionCase_salesInvoiceId_idx" ON "CollectionCase"("salesInvoiceId");
CREATE INDEX "CollectionCase_status_idx" ON "CollectionCase"("status");
CREATE INDEX "CollectionCase_priority_idx" ON "CollectionCase"("priority");
CREATE INDEX "CollectionCase_followUpDate_idx" ON "CollectionCase"("followUpDate");
CREATE INDEX "CollectionCase_nextActionAt_idx" ON "CollectionCase"("nextActionAt");

CREATE INDEX "CollectionActivity_organizationId_idx" ON "CollectionActivity"("organizationId");
CREATE INDEX "CollectionActivity_collectionCaseId_idx" ON "CollectionActivity"("collectionCaseId");
CREATE INDEX "CollectionActivity_customerId_idx" ON "CollectionActivity"("customerId");
CREATE INDEX "CollectionActivity_salesInvoiceId_idx" ON "CollectionActivity"("salesInvoiceId");
CREATE INDEX "CollectionActivity_activityType_idx" ON "CollectionActivity"("activityType");
CREATE INDEX "CollectionActivity_activityDate_idx" ON "CollectionActivity"("activityDate");
CREATE INDEX "CollectionActivity_nextFollowUpDate_idx" ON "CollectionActivity"("nextFollowUpDate");

ALTER TABLE "CollectionCase"
  ADD CONSTRAINT "CollectionCase_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "CollectionCase_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Contact"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "CollectionCase_salesInvoiceId_fkey" FOREIGN KEY ("salesInvoiceId") REFERENCES "SalesInvoice"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "CollectionCase_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "CollectionCase_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "CollectionCase_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CollectionActivity"
  ADD CONSTRAINT "CollectionActivity_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "CollectionActivity_collectionCaseId_fkey" FOREIGN KEY ("collectionCaseId") REFERENCES "CollectionCase"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "CollectionActivity_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Contact"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "CollectionActivity_salesInvoiceId_fkey" FOREIGN KEY ("salesInvoiceId") REFERENCES "SalesInvoice"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "CollectionActivity_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
