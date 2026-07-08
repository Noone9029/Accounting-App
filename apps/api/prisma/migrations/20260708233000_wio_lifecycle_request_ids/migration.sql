-- AlterTable
ALTER TABLE "BankFeedAccount" ADD COLUMN "requestId" TEXT;

-- AlterTable
ALTER TABLE "BankFeedTransaction" ADD COLUMN "requestId" TEXT;

-- CreateIndex
CREATE INDEX "BankFeedAccount_requestId_idx" ON "BankFeedAccount"("requestId");

-- CreateIndex
CREATE INDEX "BankFeedTransaction_requestId_idx" ON "BankFeedTransaction"("requestId");
