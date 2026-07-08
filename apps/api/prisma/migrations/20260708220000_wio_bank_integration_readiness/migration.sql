-- CreateEnum
CREATE TYPE "BankIntegrationProvider" AS ENUM ('NONE', 'MOCK_WIO', 'WIO_DISABLED_PLACEHOLDER');

-- CreateEnum
CREATE TYPE "BankIntegrationStatus" AS ENUM ('NOT_CONFIGURED', 'DISABLED', 'READY_FOR_MOCK', 'SYNCED', 'FAILED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "BankBeneficiaryMappingStatus" AS ENUM ('UNMAPPED', 'MAPPED', 'NEEDS_REVIEW', 'BLOCKED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "BankPaymentRequestStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'RELEASE_BLOCKED', 'RELEASED_EXTERNALLY', 'RECONCILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "BankConnection" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "provider" "BankIntegrationProvider" NOT NULL DEFAULT 'NONE',
    "status" "BankIntegrationStatus" NOT NULL DEFAULT 'DISABLED',
    "displayName" TEXT NOT NULL,
    "externalConnectionRefMasked" TEXT,
    "externalInstitutionName" TEXT,
    "metadataJson" JSONB,
    "disabledAt" TIMESTAMP(3),
    "createdById" UUID,
    "updatedById" UUID,
    "requestId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BankConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankFeedAccount" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "bankConnectionId" UUID NOT NULL,
    "bankAccountProfileId" UUID,
    "provider" "BankIntegrationProvider" NOT NULL DEFAULT 'NONE',
    "status" "BankIntegrationStatus" NOT NULL DEFAULT 'DISABLED',
    "displayName" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'AED',
    "accountRefMasked" TEXT,
    "ibanMasked" TEXT,
    "externalAccountRefMasked" TEXT,
    "availableBalance" DECIMAL(20,4),
    "ledgerBalance" DECIMAL(20,4),
    "lastSyncedAt" TIMESTAMP(3),
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BankFeedAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankFeedSyncRun" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "bankConnectionId" UUID NOT NULL,
    "status" "BankIntegrationStatus" NOT NULL DEFAULT 'NOT_CONFIGURED',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "transactionCount" INTEGER NOT NULL DEFAULT 0,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "requestId" TEXT,
    "metadataJson" JSONB,
    CONSTRAINT "BankFeedSyncRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankFeedTransaction" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "bankConnectionId" UUID NOT NULL,
    "bankFeedAccountId" UUID NOT NULL,
    "bankFeedSyncRunId" UUID,
    "bankAccountProfileId" UUID,
    "provider" "BankIntegrationProvider" NOT NULL DEFAULT 'NONE',
    "transactionDate" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "reference" TEXT,
    "type" "BankStatementTransactionType" NOT NULL,
    "amount" DECIMAL(20,4) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'AED',
    "externalTransactionRefMasked" TEXT,
    "accountRefMasked" TEXT,
    "redactedMetadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BankFeedTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankProviderEvent" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "bankConnectionId" UUID,
    "provider" "BankIntegrationProvider" NOT NULL DEFAULT 'NONE',
    "status" "BankIntegrationStatus" NOT NULL DEFAULT 'BLOCKED',
    "eventType" TEXT NOT NULL,
    "externalEventRefMasked" TEXT,
    "requestId" TEXT,
    "redactedPayloadJson" JSONB,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BankProviderEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankBeneficiaryMapping" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "supplierId" UUID NOT NULL,
    "bankConnectionId" UUID,
    "provider" "BankIntegrationProvider" NOT NULL DEFAULT 'NONE',
    "status" "BankBeneficiaryMappingStatus" NOT NULL DEFAULT 'UNMAPPED',
    "beneficiaryDisplayName" TEXT NOT NULL,
    "beneficiaryRefMasked" TEXT,
    "externalBeneficiaryRefMasked" TEXT,
    "metadataJson" JSONB,
    "createdById" UUID,
    "updatedById" UUID,
    "requestId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BankBeneficiaryMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankPaymentRequest" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "supplierId" UUID,
    "purchaseBillId" UUID,
    "bankConnectionId" UUID,
    "beneficiaryMappingId" UUID,
    "bankFeedTransactionId" UUID,
    "bankStatementTransactionId" UUID,
    "status" "BankPaymentRequestStatus" NOT NULL DEFAULT 'DRAFT',
    "amount" DECIMAL(20,4) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'AED',
    "memo" TEXT,
    "externalReleaseReferenceMasked" TEXT,
    "releaseBlockedReason" TEXT,
    "createdById" UUID,
    "approvedById" UUID,
    "cancelledById" UUID,
    "manuallyReleasedById" UUID,
    "reconciledById" UUID,
    "approvedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "manuallyReleasedAt" TIMESTAMP(3),
    "reconciledAt" TIMESTAMP(3),
    "requestId" TEXT,
    "redactedMetadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BankPaymentRequest_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX "BankConnection_organizationId_idx" ON "BankConnection"("organizationId");
CREATE INDEX "BankConnection_organizationId_provider_idx" ON "BankConnection"("organizationId", "provider");
CREATE INDEX "BankConnection_organizationId_status_idx" ON "BankConnection"("organizationId", "status");
CREATE INDEX "BankConnection_requestId_idx" ON "BankConnection"("requestId");
CREATE INDEX "BankFeedAccount_organizationId_idx" ON "BankFeedAccount"("organizationId");
CREATE INDEX "BankFeedAccount_bankConnectionId_idx" ON "BankFeedAccount"("bankConnectionId");
CREATE INDEX "BankFeedAccount_bankAccountProfileId_idx" ON "BankFeedAccount"("bankAccountProfileId");
CREATE INDEX "BankFeedAccount_organizationId_status_idx" ON "BankFeedAccount"("organizationId", "status");
CREATE INDEX "BankFeedSyncRun_organizationId_idx" ON "BankFeedSyncRun"("organizationId");
CREATE INDEX "BankFeedSyncRun_bankConnectionId_idx" ON "BankFeedSyncRun"("bankConnectionId");
CREATE INDEX "BankFeedSyncRun_organizationId_status_idx" ON "BankFeedSyncRun"("organizationId", "status");
CREATE INDEX "BankFeedSyncRun_requestId_idx" ON "BankFeedSyncRun"("requestId");
CREATE INDEX "BankFeedTransaction_organizationId_idx" ON "BankFeedTransaction"("organizationId");
CREATE INDEX "BankFeedTransaction_bankConnectionId_idx" ON "BankFeedTransaction"("bankConnectionId");
CREATE INDEX "BankFeedTransaction_bankFeedAccountId_idx" ON "BankFeedTransaction"("bankFeedAccountId");
CREATE INDEX "BankFeedTransaction_bankFeedSyncRunId_idx" ON "BankFeedTransaction"("bankFeedSyncRunId");
CREATE INDEX "BankFeedTransaction_bankAccountProfileId_idx" ON "BankFeedTransaction"("bankAccountProfileId");
CREATE INDEX "BankFeedTransaction_organizationId_transactionDate_idx" ON "BankFeedTransaction"("organizationId", "transactionDate");
CREATE INDEX "BankProviderEvent_organizationId_idx" ON "BankProviderEvent"("organizationId");
CREATE INDEX "BankProviderEvent_bankConnectionId_idx" ON "BankProviderEvent"("bankConnectionId");
CREATE INDEX "BankProviderEvent_organizationId_provider_idx" ON "BankProviderEvent"("organizationId", "provider");
CREATE INDEX "BankProviderEvent_requestId_idx" ON "BankProviderEvent"("requestId");
CREATE INDEX "BankBeneficiaryMapping_organizationId_idx" ON "BankBeneficiaryMapping"("organizationId");
CREATE INDEX "BankBeneficiaryMapping_supplierId_idx" ON "BankBeneficiaryMapping"("supplierId");
CREATE INDEX "BankBeneficiaryMapping_bankConnectionId_idx" ON "BankBeneficiaryMapping"("bankConnectionId");
CREATE INDEX "BankBeneficiaryMapping_organizationId_status_idx" ON "BankBeneficiaryMapping"("organizationId", "status");
CREATE INDEX "BankBeneficiaryMapping_requestId_idx" ON "BankBeneficiaryMapping"("requestId");
CREATE INDEX "BankPaymentRequest_organizationId_idx" ON "BankPaymentRequest"("organizationId");
CREATE INDEX "BankPaymentRequest_supplierId_idx" ON "BankPaymentRequest"("supplierId");
CREATE INDEX "BankPaymentRequest_purchaseBillId_idx" ON "BankPaymentRequest"("purchaseBillId");
CREATE INDEX "BankPaymentRequest_bankConnectionId_idx" ON "BankPaymentRequest"("bankConnectionId");
CREATE INDEX "BankPaymentRequest_beneficiaryMappingId_idx" ON "BankPaymentRequest"("beneficiaryMappingId");
CREATE INDEX "BankPaymentRequest_bankFeedTransactionId_idx" ON "BankPaymentRequest"("bankFeedTransactionId");
CREATE INDEX "BankPaymentRequest_bankStatementTransactionId_idx" ON "BankPaymentRequest"("bankStatementTransactionId");
CREATE INDEX "BankPaymentRequest_organizationId_status_idx" ON "BankPaymentRequest"("organizationId", "status");
CREATE INDEX "BankPaymentRequest_requestId_idx" ON "BankPaymentRequest"("requestId");

-- ForeignKeys
ALTER TABLE "BankConnection" ADD CONSTRAINT "BankConnection_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BankConnection" ADD CONSTRAINT "BankConnection_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BankConnection" ADD CONSTRAINT "BankConnection_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BankFeedAccount" ADD CONSTRAINT "BankFeedAccount_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BankFeedAccount" ADD CONSTRAINT "BankFeedAccount_bankConnectionId_fkey" FOREIGN KEY ("bankConnectionId") REFERENCES "BankConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BankFeedAccount" ADD CONSTRAINT "BankFeedAccount_bankAccountProfileId_fkey" FOREIGN KEY ("bankAccountProfileId") REFERENCES "BankAccountProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BankFeedSyncRun" ADD CONSTRAINT "BankFeedSyncRun_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BankFeedSyncRun" ADD CONSTRAINT "BankFeedSyncRun_bankConnectionId_fkey" FOREIGN KEY ("bankConnectionId") REFERENCES "BankConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BankFeedTransaction" ADD CONSTRAINT "BankFeedTransaction_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BankFeedTransaction" ADD CONSTRAINT "BankFeedTransaction_bankConnectionId_fkey" FOREIGN KEY ("bankConnectionId") REFERENCES "BankConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BankFeedTransaction" ADD CONSTRAINT "BankFeedTransaction_bankFeedAccountId_fkey" FOREIGN KEY ("bankFeedAccountId") REFERENCES "BankFeedAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BankFeedTransaction" ADD CONSTRAINT "BankFeedTransaction_bankFeedSyncRunId_fkey" FOREIGN KEY ("bankFeedSyncRunId") REFERENCES "BankFeedSyncRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BankFeedTransaction" ADD CONSTRAINT "BankFeedTransaction_bankAccountProfileId_fkey" FOREIGN KEY ("bankAccountProfileId") REFERENCES "BankAccountProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BankProviderEvent" ADD CONSTRAINT "BankProviderEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BankProviderEvent" ADD CONSTRAINT "BankProviderEvent_bankConnectionId_fkey" FOREIGN KEY ("bankConnectionId") REFERENCES "BankConnection"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BankBeneficiaryMapping" ADD CONSTRAINT "BankBeneficiaryMapping_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BankBeneficiaryMapping" ADD CONSTRAINT "BankBeneficiaryMapping_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BankBeneficiaryMapping" ADD CONSTRAINT "BankBeneficiaryMapping_bankConnectionId_fkey" FOREIGN KEY ("bankConnectionId") REFERENCES "BankConnection"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BankBeneficiaryMapping" ADD CONSTRAINT "BankBeneficiaryMapping_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BankBeneficiaryMapping" ADD CONSTRAINT "BankBeneficiaryMapping_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BankPaymentRequest" ADD CONSTRAINT "BankPaymentRequest_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BankPaymentRequest" ADD CONSTRAINT "BankPaymentRequest_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BankPaymentRequest" ADD CONSTRAINT "BankPaymentRequest_purchaseBillId_fkey" FOREIGN KEY ("purchaseBillId") REFERENCES "PurchaseBill"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BankPaymentRequest" ADD CONSTRAINT "BankPaymentRequest_bankConnectionId_fkey" FOREIGN KEY ("bankConnectionId") REFERENCES "BankConnection"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BankPaymentRequest" ADD CONSTRAINT "BankPaymentRequest_beneficiaryMappingId_fkey" FOREIGN KEY ("beneficiaryMappingId") REFERENCES "BankBeneficiaryMapping"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BankPaymentRequest" ADD CONSTRAINT "BankPaymentRequest_bankFeedTransactionId_fkey" FOREIGN KEY ("bankFeedTransactionId") REFERENCES "BankFeedTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BankPaymentRequest" ADD CONSTRAINT "BankPaymentRequest_bankStatementTransactionId_fkey" FOREIGN KEY ("bankStatementTransactionId") REFERENCES "BankStatementTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BankPaymentRequest" ADD CONSTRAINT "BankPaymentRequest_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BankPaymentRequest" ADD CONSTRAINT "BankPaymentRequest_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BankPaymentRequest" ADD CONSTRAINT "BankPaymentRequest_cancelledById_fkey" FOREIGN KEY ("cancelledById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BankPaymentRequest" ADD CONSTRAINT "BankPaymentRequest_manuallyReleasedById_fkey" FOREIGN KEY ("manuallyReleasedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BankPaymentRequest" ADD CONSTRAINT "BankPaymentRequest_reconciledById_fkey" FOREIGN KEY ("reconciledById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
