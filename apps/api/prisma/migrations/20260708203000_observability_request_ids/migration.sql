ALTER TABLE "GeneratedDocument" ADD COLUMN "requestId" TEXT;
ALTER TABLE "DocumentExtractionResult" ADD COLUMN "requestId" TEXT;
ALTER TABLE "DocumentReviewDecision" ADD COLUMN "requestId" TEXT;
ALTER TABLE "PaymentProviderEvent" ADD COLUMN "requestId" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN "requestId" TEXT;

CREATE INDEX "GeneratedDocument_requestId_idx" ON "GeneratedDocument"("requestId");
CREATE INDEX "DocumentExtractionResult_requestId_idx" ON "DocumentExtractionResult"("requestId");
CREATE INDEX "DocumentReviewDecision_requestId_idx" ON "DocumentReviewDecision"("requestId");
CREATE INDEX "PaymentProviderEvent_requestId_idx" ON "PaymentProviderEvent"("requestId");
CREATE INDEX "AuditLog_requestId_idx" ON "AuditLog"("requestId");
