-- Global worker queues are cross-tenant and therefore need status-leading indexes.
ALTER TABLE "RecurringTransactionRun"
  ADD COLUMN "nextAttemptAt" TIMESTAMPTZ(3);

CREATE INDEX "RecurringTransactionTemplate_status_nextRunAt_idx"
  ON "RecurringTransactionTemplate"("status", "nextRunAt");

CREATE INDEX "RecurringTransactionRun_status_nextAttemptAt_idx"
  ON "RecurringTransactionRun"("status", "nextAttemptAt");

CREATE INDEX "RecurringTransactionRun_status_createdAt_idx"
  ON "RecurringTransactionRun"("status", "createdAt");
