-- CreateEnum
CREATE TYPE "BankAccountType" AS ENUM ('BANK', 'CASH', 'WALLET', 'CARD', 'OTHER');

-- CreateEnum
CREATE TYPE "BankAccountStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateTable
CREATE TABLE "BankAccountProfile" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "accountId" UUID NOT NULL,
    "type" "BankAccountType" NOT NULL,
    "status" "BankAccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "displayName" TEXT NOT NULL,
    "bankName" TEXT,
    "accountNumberMasked" TEXT,
    "ibanMasked" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'SAR',
    "openingBalance" DECIMAL(20,4) NOT NULL DEFAULT 0,
    "openingBalanceDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankAccountProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BankAccountProfile_accountId_key" ON "BankAccountProfile"("accountId");

-- CreateIndex
CREATE INDEX "BankAccountProfile_organizationId_idx" ON "BankAccountProfile"("organizationId");

-- CreateIndex
CREATE INDEX "BankAccountProfile_organizationId_status_idx" ON "BankAccountProfile"("organizationId", "status");

-- CreateIndex
CREATE INDEX "BankAccountProfile_organizationId_type_idx" ON "BankAccountProfile"("organizationId", "type");

-- AddForeignKey
ALTER TABLE "BankAccountProfile" ADD CONSTRAINT "BankAccountProfile_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankAccountProfile" ADD CONSTRAINT "BankAccountProfile_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
