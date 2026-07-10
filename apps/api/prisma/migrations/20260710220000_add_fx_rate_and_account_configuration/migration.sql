CREATE TYPE "CurrencyRateSource" AS ENUM ('MANUAL', 'IMPORT', 'SYSTEM_RATE_1', 'FUTURE_PROVIDER_DISABLED');

CREATE TABLE "CurrencyRateSnapshot" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "transactionCurrency" TEXT NOT NULL,
    "baseCurrency" TEXT NOT NULL,
    "rate" DECIMAL(18,8) NOT NULL,
    "rateDate" DATE NOT NULL,
    "source" "CurrencyRateSource" NOT NULL,
    "sourceReference" TEXT,
    "createdByUserId" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CurrencyRateSnapshot_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "CurrencyRateSnapshot_rate_positive" CHECK ("rate" > 0),
    CONSTRAINT "CurrencyRateSnapshot_distinct_currency_pair" CHECK ("transactionCurrency" <> "baseCurrency"),
    CONSTRAINT "CurrencyRateSnapshot_transaction_currency_supported" CHECK ("transactionCurrency" IN ('SAR', 'AED', 'USD', 'EUR', 'GBP', 'BHD', 'KWD', 'OMR', 'QAR')),
    CONSTRAINT "CurrencyRateSnapshot_base_currency_supported" CHECK ("baseCurrency" IN ('SAR', 'AED', 'USD', 'EUR', 'GBP', 'BHD', 'KWD', 'OMR', 'QAR'))
);

CREATE TABLE "FxAccountConfiguration" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "realizedGainAccountId" UUID,
    "realizedLossAccountId" UUID,
    "unrealizedGainAccountId" UUID,
    "unrealizedLossAccountId" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "FxAccountConfiguration_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CurrencyRateSnapshot_organizationId_transactionCurrency_baseCurrency_rateDate_idx" ON "CurrencyRateSnapshot"("organizationId", "transactionCurrency", "baseCurrency", "rateDate");
CREATE INDEX "CurrencyRateSnapshot_organizationId_createdAt_idx" ON "CurrencyRateSnapshot"("organizationId", "createdAt");
CREATE INDEX "CurrencyRateSnapshot_createdByUserId_idx" ON "CurrencyRateSnapshot"("createdByUserId");

CREATE UNIQUE INDEX "Account_organizationId_id_key" ON "Account"("organizationId", "id");
CREATE UNIQUE INDEX "FxAccountConfiguration_organizationId_key" ON "FxAccountConfiguration"("organizationId");
CREATE INDEX "FxAccountConfiguration_organizationId_realizedGainAccountId_idx" ON "FxAccountConfiguration"("organizationId", "realizedGainAccountId");
CREATE INDEX "FxAccountConfiguration_organizationId_realizedLossAccountId_idx" ON "FxAccountConfiguration"("organizationId", "realizedLossAccountId");
CREATE INDEX "FxAccountConfiguration_organizationId_unrealizedGainAccountId_idx" ON "FxAccountConfiguration"("organizationId", "unrealizedGainAccountId");
CREATE INDEX "FxAccountConfiguration_organizationId_unrealizedLossAccountId_idx" ON "FxAccountConfiguration"("organizationId", "unrealizedLossAccountId");

ALTER TABLE "CurrencyRateSnapshot" ADD CONSTRAINT "CurrencyRateSnapshot_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CurrencyRateSnapshot" ADD CONSTRAINT "CurrencyRateSnapshot_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FxAccountConfiguration" ADD CONSTRAINT "FxAccountConfiguration_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FxAccountConfiguration" ADD CONSTRAINT "FxAccountConfiguration_realizedGainAccount_fkey" FOREIGN KEY ("organizationId", "realizedGainAccountId") REFERENCES "Account"("organizationId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "FxAccountConfiguration" ADD CONSTRAINT "FxAccountConfiguration_realizedLossAccount_fkey" FOREIGN KEY ("organizationId", "realizedLossAccountId") REFERENCES "Account"("organizationId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "FxAccountConfiguration" ADD CONSTRAINT "FxAccountConfiguration_unrealizedGainAccount_fkey" FOREIGN KEY ("organizationId", "unrealizedGainAccountId") REFERENCES "Account"("organizationId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "FxAccountConfiguration" ADD CONSTRAINT "FxAccountConfiguration_unrealizedLossAccount_fkey" FOREIGN KEY ("organizationId", "unrealizedLossAccountId") REFERENCES "Account"("organizationId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;

REVOKE ALL PRIVILEGES ON TABLE "CurrencyRateSnapshot" FROM PUBLIC;
REVOKE ALL PRIVILEGES ON TABLE "FxAccountConfiguration" FROM PUBLIC;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        EXECUTE 'REVOKE ALL PRIVILEGES ON TABLE "CurrencyRateSnapshot", "FxAccountConfiguration" FROM anon';
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        EXECUTE 'REVOKE ALL PRIVILEGES ON TABLE "CurrencyRateSnapshot", "FxAccountConfiguration" FROM authenticated';
    END IF;
END
$$;
