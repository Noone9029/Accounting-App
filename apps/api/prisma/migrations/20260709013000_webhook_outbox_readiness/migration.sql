-- Outbound webhook/event outbox readiness stores safe summaries only.
CREATE TABLE "WebhookEndpoint" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DISABLED',
    "targetUrlHost" TEXT,
    "redactedTargetUrl" TEXT,
    "eventTypes" JSONB NOT NULL,
    "signingSecretStorageMode" TEXT NOT NULL DEFAULT 'NOT_STORED',
    "signingSecretConfigured" BOOLEAN NOT NULL DEFAULT false,
    "createdById" UUID,
    "requestId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebhookEndpoint_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WebhookEvent" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "webhookEndpointId" UUID,
    "eventType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "safePayloadSummary" JSONB NOT NULL,
    "requestId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WebhookDeliveryAttempt" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "webhookEventId" UUID NOT NULL,
    "webhookEndpointId" UUID,
    "attemptNumber" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "nextAttemptAt" TIMESTAMP(3),
    "responseSummary" JSONB,
    "requestId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebhookDeliveryAttempt_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EventOutboxItem" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "eventType" TEXT NOT NULL,
    "aggregateType" TEXT NOT NULL,
    "aggregateId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "safePayloadSummary" JSONB NOT NULL,
    "requestId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventOutboxItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WebhookEndpoint_organizationId_idx" ON "WebhookEndpoint"("organizationId");
CREATE INDEX "WebhookEndpoint_requestId_idx" ON "WebhookEndpoint"("requestId");
CREATE INDEX "WebhookEvent_organizationId_idx" ON "WebhookEvent"("organizationId");
CREATE INDEX "WebhookEvent_webhookEndpointId_idx" ON "WebhookEvent"("webhookEndpointId");
CREATE INDEX "WebhookEvent_requestId_idx" ON "WebhookEvent"("requestId");
CREATE INDEX "WebhookDeliveryAttempt_organizationId_idx" ON "WebhookDeliveryAttempt"("organizationId");
CREATE INDEX "WebhookDeliveryAttempt_webhookEventId_idx" ON "WebhookDeliveryAttempt"("webhookEventId");
CREATE INDEX "WebhookDeliveryAttempt_webhookEndpointId_idx" ON "WebhookDeliveryAttempt"("webhookEndpointId");
CREATE INDEX "WebhookDeliveryAttempt_requestId_idx" ON "WebhookDeliveryAttempt"("requestId");
CREATE INDEX "EventOutboxItem_organizationId_idx" ON "EventOutboxItem"("organizationId");
CREATE INDEX "EventOutboxItem_eventType_idx" ON "EventOutboxItem"("eventType");
CREATE INDEX "EventOutboxItem_requestId_idx" ON "EventOutboxItem"("requestId");

ALTER TABLE "WebhookEndpoint" ADD CONSTRAINT "WebhookEndpoint_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WebhookEvent" ADD CONSTRAINT "WebhookEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WebhookEvent" ADD CONSTRAINT "WebhookEvent_webhookEndpointId_fkey" FOREIGN KEY ("webhookEndpointId") REFERENCES "WebhookEndpoint"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WebhookDeliveryAttempt" ADD CONSTRAINT "WebhookDeliveryAttempt_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WebhookDeliveryAttempt" ADD CONSTRAINT "WebhookDeliveryAttempt_webhookEventId_fkey" FOREIGN KEY ("webhookEventId") REFERENCES "WebhookEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WebhookDeliveryAttempt" ADD CONSTRAINT "WebhookDeliveryAttempt_webhookEndpointId_fkey" FOREIGN KEY ("webhookEndpointId") REFERENCES "WebhookEndpoint"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EventOutboxItem" ADD CONSTRAINT "EventOutboxItem_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
