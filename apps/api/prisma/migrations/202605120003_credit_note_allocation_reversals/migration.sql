ALTER TABLE "CreditNoteAllocation"
  ADD COLUMN "reversedAt" TIMESTAMP(3),
  ADD COLUMN "reversedById" UUID,
  ADD COLUMN "reversalReason" TEXT;

CREATE INDEX "CreditNoteAllocation_reversedAt_idx" ON "CreditNoteAllocation"("reversedAt");
CREATE INDEX "CreditNoteAllocation_reversedById_idx" ON "CreditNoteAllocation"("reversedById");

ALTER TABLE "CreditNoteAllocation" ADD CONSTRAINT "CreditNoteAllocation_reversedById_fkey" FOREIGN KEY ("reversedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
