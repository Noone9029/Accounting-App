-- Public API v1 idempotency readiness records store only hashes and safe response summaries.
CREATE TABLE "ApiIdempotencyRecord" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "route" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "responseJson" JSONB NOT NULL,
    "statusCode" INTEGER NOT NULL,
    "requestId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApiIdempotencyRecord_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ApiIdempotencyRecord_organizationId_route_keyHash_key" ON "ApiIdempotencyRecord"("organizationId", "route", "keyHash");
CREATE INDEX "ApiIdempotencyRecord_organizationId_idx" ON "ApiIdempotencyRecord"("organizationId");
CREATE INDEX "ApiIdempotencyRecord_requestId_idx" ON "ApiIdempotencyRecord"("requestId");

ALTER TABLE "ApiIdempotencyRecord" ADD CONSTRAINT "ApiIdempotencyRecord_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
