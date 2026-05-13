ALTER TYPE "BankReconciliationStatus" ADD VALUE 'PENDING_APPROVAL';
ALTER TYPE "BankReconciliationStatus" ADD VALUE 'APPROVED';

CREATE TYPE "BankReconciliationReviewAction" AS ENUM ('SUBMIT', 'APPROVE', 'REOPEN', 'CLOSE', 'VOID');

ALTER TABLE "BankReconciliation"
ADD COLUMN "submittedById" UUID,
ADD COLUMN "approvedById" UUID,
ADD COLUMN "reopenedById" UUID,
ADD COLUMN "submittedAt" TIMESTAMP(3),
ADD COLUMN "approvedAt" TIMESTAMP(3),
ADD COLUMN "reopenedAt" TIMESTAMP(3),
ADD COLUMN "approvalNotes" TEXT,
ADD COLUMN "reopenReason" TEXT;

CREATE TABLE "BankReconciliationReviewEvent" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "reconciliationId" UUID NOT NULL,
    "actorUserId" UUID,
    "action" "BankReconciliationReviewAction" NOT NULL,
    "fromStatus" "BankReconciliationStatus",
    "toStatus" "BankReconciliationStatus" NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BankReconciliationReviewEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BankReconciliationReviewEvent_organizationId_idx" ON "BankReconciliationReviewEvent"("organizationId");
CREATE INDEX "BankReconciliationReviewEvent_reconciliationId_idx" ON "BankReconciliationReviewEvent"("reconciliationId");
CREATE INDEX "BankReconciliationReviewEvent_actorUserId_idx" ON "BankReconciliationReviewEvent"("actorUserId");
CREATE INDEX "BankReconciliationReviewEvent_organizationId_reconciliationId_createdAt_idx" ON "BankReconciliationReviewEvent"("organizationId", "reconciliationId", "createdAt");

ALTER TABLE "BankReconciliation" ADD CONSTRAINT "BankReconciliation_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BankReconciliation" ADD CONSTRAINT "BankReconciliation_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BankReconciliation" ADD CONSTRAINT "BankReconciliation_reopenedById_fkey" FOREIGN KEY ("reopenedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BankReconciliationReviewEvent" ADD CONSTRAINT "BankReconciliationReviewEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BankReconciliationReviewEvent" ADD CONSTRAINT "BankReconciliationReviewEvent_reconciliationId_fkey" FOREIGN KEY ("reconciliationId") REFERENCES "BankReconciliation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BankReconciliationReviewEvent" ADD CONSTRAINT "BankReconciliationReviewEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
