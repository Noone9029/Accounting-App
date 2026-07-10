ALTER TABLE "JournalLine"
ADD COLUMN "costCenterId" UUID,
ADD COLUMN "projectId" UUID;

CREATE INDEX "JournalLine_organizationId_costCenterId_idx" ON "JournalLine"("organizationId", "costCenterId");
CREATE INDEX "JournalLine_organizationId_projectId_idx" ON "JournalLine"("organizationId", "projectId");

ALTER TABLE "JournalLine"
ADD CONSTRAINT "JournalLine_costCenterId_fkey"
FOREIGN KEY ("costCenterId") REFERENCES "CostCenter"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

ALTER TABLE "JournalLine"
ADD CONSTRAINT "JournalLine_projectId_fkey"
FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE NO ACTION ON UPDATE CASCADE;
