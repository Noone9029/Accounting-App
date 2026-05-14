-- Add accountant-reviewed inventory clearing variance proposal workflow.
ALTER TYPE "NumberSequenceScope" ADD VALUE 'INVENTORY_VARIANCE_PROPOSAL';

CREATE TYPE "InventoryVarianceProposalStatus" AS ENUM (
  'DRAFT',
  'PENDING_APPROVAL',
  'APPROVED',
  'POSTED',
  'REVERSED',
  'VOIDED'
);

CREATE TYPE "InventoryVarianceProposalSourceType" AS ENUM (
  'CLEARING_VARIANCE',
  'MANUAL'
);

CREATE TYPE "InventoryVarianceReason" AS ENUM (
  'PRICE_DIFFERENCE',
  'QUANTITY_DIFFERENCE',
  'RECEIPT_WITHOUT_CLEARING_BILL',
  'CLEARING_BILL_WITHOUT_RECEIPT',
  'REVERSED_RECEIPT_POSTING',
  'MANUAL_ADJUSTMENT'
);

CREATE TYPE "InventoryVarianceProposalAction" AS ENUM (
  'CREATE',
  'SUBMIT',
  'APPROVE',
  'POST',
  'REVERSE',
  'VOID'
);

CREATE TABLE "InventoryVarianceProposal" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "proposalNumber" TEXT NOT NULL,
  "sourceType" "InventoryVarianceProposalSourceType" NOT NULL,
  "reason" "InventoryVarianceReason" NOT NULL,
  "status" "InventoryVarianceProposalStatus" NOT NULL DEFAULT 'DRAFT',
  "purchaseBillId" UUID,
  "purchaseReceiptId" UUID,
  "supplierId" UUID,
  "proposalDate" TIMESTAMP(3) NOT NULL,
  "amount" DECIMAL(20,4) NOT NULL,
  "description" TEXT,
  "debitAccountId" UUID NOT NULL,
  "creditAccountId" UUID NOT NULL,
  "createdById" UUID,
  "submittedById" UUID,
  "approvedById" UUID,
  "postedById" UUID,
  "reversedById" UUID,
  "voidedById" UUID,
  "submittedAt" TIMESTAMP(3),
  "approvedAt" TIMESTAMP(3),
  "postedAt" TIMESTAMP(3),
  "reversedAt" TIMESTAMP(3),
  "voidedAt" TIMESTAMP(3),
  "journalEntryId" UUID,
  "reversalJournalEntryId" UUID,
  "approvalNotes" TEXT,
  "reversalReason" TEXT,
  "voidReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "InventoryVarianceProposal_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InventoryVarianceProposalEvent" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "proposalId" UUID NOT NULL,
  "actorUserId" UUID,
  "action" "InventoryVarianceProposalAction" NOT NULL,
  "fromStatus" "InventoryVarianceProposalStatus",
  "toStatus" "InventoryVarianceProposalStatus" NOT NULL,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "InventoryVarianceProposalEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "InventoryVarianceProposal_journalEntryId_key" ON "InventoryVarianceProposal"("journalEntryId");
CREATE UNIQUE INDEX "InventoryVarianceProposal_reversalJournalEntryId_key" ON "InventoryVarianceProposal"("reversalJournalEntryId");
CREATE UNIQUE INDEX "InventoryVarianceProposal_organizationId_proposalNumber_key" ON "InventoryVarianceProposal"("organizationId", "proposalNumber");
CREATE INDEX "InventoryVarianceProposal_organizationId_idx" ON "InventoryVarianceProposal"("organizationId");
CREATE INDEX "InventoryVarianceProposal_purchaseBillId_idx" ON "InventoryVarianceProposal"("purchaseBillId");
CREATE INDEX "InventoryVarianceProposal_purchaseReceiptId_idx" ON "InventoryVarianceProposal"("purchaseReceiptId");
CREATE INDEX "InventoryVarianceProposal_supplierId_idx" ON "InventoryVarianceProposal"("supplierId");
CREATE INDEX "InventoryVarianceProposal_debitAccountId_idx" ON "InventoryVarianceProposal"("debitAccountId");
CREATE INDEX "InventoryVarianceProposal_creditAccountId_idx" ON "InventoryVarianceProposal"("creditAccountId");
CREATE INDEX "InventoryVarianceProposal_createdById_idx" ON "InventoryVarianceProposal"("createdById");
CREATE INDEX "InventoryVarianceProposal_submittedById_idx" ON "InventoryVarianceProposal"("submittedById");
CREATE INDEX "InventoryVarianceProposal_approvedById_idx" ON "InventoryVarianceProposal"("approvedById");
CREATE INDEX "InventoryVarianceProposal_postedById_idx" ON "InventoryVarianceProposal"("postedById");
CREATE INDEX "InventoryVarianceProposal_reversedById_idx" ON "InventoryVarianceProposal"("reversedById");
CREATE INDEX "InventoryVarianceProposal_voidedById_idx" ON "InventoryVarianceProposal"("voidedById");
CREATE INDEX "InventoryVarianceProposal_organizationId_status_idx" ON "InventoryVarianceProposal"("organizationId", "status");
CREATE INDEX "InventoryVarianceProposal_organizationId_proposalDate_idx" ON "InventoryVarianceProposal"("organizationId", "proposalDate");
CREATE INDEX "InventoryVarianceProposal_organizationId_sourceType_idx" ON "InventoryVarianceProposal"("organizationId", "sourceType");
CREATE INDEX "InventoryVarianceProposal_organizationId_reason_idx" ON "InventoryVarianceProposal"("organizationId", "reason");

CREATE INDEX "InventoryVarianceProposalEvent_organizationId_idx" ON "InventoryVarianceProposalEvent"("organizationId");
CREATE INDEX "InventoryVarianceProposalEvent_proposalId_idx" ON "InventoryVarianceProposalEvent"("proposalId");
CREATE INDEX "InventoryVarianceProposalEvent_actorUserId_idx" ON "InventoryVarianceProposalEvent"("actorUserId");
CREATE INDEX "InventoryVarianceProposalEvent_organizationId_proposalId_createdAt_idx" ON "InventoryVarianceProposalEvent"("organizationId", "proposalId", "createdAt");

ALTER TABLE "InventoryVarianceProposal"
  ADD CONSTRAINT "InventoryVarianceProposal_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "InventoryVarianceProposal"
  ADD CONSTRAINT "InventoryVarianceProposal_purchaseBillId_fkey"
  FOREIGN KEY ("purchaseBillId") REFERENCES "PurchaseBill"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "InventoryVarianceProposal"
  ADD CONSTRAINT "InventoryVarianceProposal_purchaseReceiptId_fkey"
  FOREIGN KEY ("purchaseReceiptId") REFERENCES "PurchaseReceipt"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "InventoryVarianceProposal"
  ADD CONSTRAINT "InventoryVarianceProposal_supplierId_fkey"
  FOREIGN KEY ("supplierId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "InventoryVarianceProposal"
  ADD CONSTRAINT "InventoryVarianceProposal_debitAccountId_fkey"
  FOREIGN KEY ("debitAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "InventoryVarianceProposal"
  ADD CONSTRAINT "InventoryVarianceProposal_creditAccountId_fkey"
  FOREIGN KEY ("creditAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "InventoryVarianceProposal"
  ADD CONSTRAINT "InventoryVarianceProposal_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "InventoryVarianceProposal"
  ADD CONSTRAINT "InventoryVarianceProposal_submittedById_fkey"
  FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "InventoryVarianceProposal"
  ADD CONSTRAINT "InventoryVarianceProposal_approvedById_fkey"
  FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "InventoryVarianceProposal"
  ADD CONSTRAINT "InventoryVarianceProposal_postedById_fkey"
  FOREIGN KEY ("postedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "InventoryVarianceProposal"
  ADD CONSTRAINT "InventoryVarianceProposal_reversedById_fkey"
  FOREIGN KEY ("reversedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "InventoryVarianceProposal"
  ADD CONSTRAINT "InventoryVarianceProposal_voidedById_fkey"
  FOREIGN KEY ("voidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "InventoryVarianceProposal"
  ADD CONSTRAINT "InventoryVarianceProposal_journalEntryId_fkey"
  FOREIGN KEY ("journalEntryId") REFERENCES "JournalEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "InventoryVarianceProposal"
  ADD CONSTRAINT "InventoryVarianceProposal_reversalJournalEntryId_fkey"
  FOREIGN KEY ("reversalJournalEntryId") REFERENCES "JournalEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "InventoryVarianceProposalEvent"
  ADD CONSTRAINT "InventoryVarianceProposalEvent_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "InventoryVarianceProposalEvent"
  ADD CONSTRAINT "InventoryVarianceProposalEvent_proposalId_fkey"
  FOREIGN KEY ("proposalId") REFERENCES "InventoryVarianceProposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "InventoryVarianceProposalEvent"
  ADD CONSTRAINT "InventoryVarianceProposalEvent_actorUserId_fkey"
  FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
