CREATE TYPE "ZatcaEnvironment" AS ENUM ('SANDBOX', 'SIMULATION', 'PRODUCTION');

CREATE TYPE "ZatcaRegistrationStatus" AS ENUM ('NOT_CONFIGURED', 'DRAFT', 'READY_FOR_CSR', 'OTP_REQUIRED', 'CERTIFICATE_ISSUED', 'ACTIVE', 'SUSPENDED');

CREATE TYPE "ZatcaInvoiceType" AS ENUM ('STANDARD_TAX_INVOICE', 'SIMPLIFIED_TAX_INVOICE', 'CREDIT_NOTE', 'DEBIT_NOTE');

CREATE TYPE "ZatcaInvoiceStatus" AS ENUM ('NOT_SUBMITTED', 'XML_GENERATED', 'READY_FOR_SUBMISSION', 'SUBMISSION_PENDING', 'CLEARED', 'REPORTED', 'REJECTED', 'FAILED');

CREATE TYPE "ZatcaSubmissionType" AS ENUM ('COMPLIANCE_CHECK', 'CLEARANCE', 'REPORTING');

CREATE TYPE "ZatcaSubmissionStatus" AS ENUM ('PENDING', 'SUCCESS', 'REJECTED', 'FAILED');

CREATE TABLE "ZatcaOrganizationProfile" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "environment" "ZatcaEnvironment" NOT NULL DEFAULT 'SANDBOX',
  "registrationStatus" "ZatcaRegistrationStatus" NOT NULL DEFAULT 'NOT_CONFIGURED',
  "sellerName" TEXT,
  "vatNumber" TEXT,
  "companyIdType" TEXT,
  "companyIdNumber" TEXT,
  "buildingNumber" TEXT,
  "streetName" TEXT,
  "district" TEXT,
  "city" TEXT,
  "postalCode" TEXT,
  "countryCode" TEXT NOT NULL DEFAULT 'SA',
  "additionalAddressNumber" TEXT,
  "businessCategory" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ZatcaOrganizationProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ZatcaEgsUnit" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "profileId" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "environment" "ZatcaEnvironment" NOT NULL,
  "status" "ZatcaRegistrationStatus" NOT NULL DEFAULT 'DRAFT',
  "deviceSerialNumber" TEXT NOT NULL,
  "solutionName" TEXT NOT NULL DEFAULT 'LedgerByte',
  "csrPem" TEXT,
  "privateKeyPem" TEXT,
  "complianceCsidPem" TEXT,
  "productionCsidPem" TEXT,
  "certificateRequestId" TEXT,
  "lastInvoiceHash" TEXT,
  "lastIcv" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ZatcaEgsUnit_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ZatcaInvoiceMetadata" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "invoiceId" UUID NOT NULL,
  "zatcaInvoiceType" "ZatcaInvoiceType" NOT NULL,
  "zatcaStatus" "ZatcaInvoiceStatus" NOT NULL DEFAULT 'NOT_SUBMITTED',
  "invoiceUuid" UUID NOT NULL DEFAULT gen_random_uuid(),
  "icv" INTEGER,
  "previousInvoiceHash" TEXT,
  "invoiceHash" TEXT,
  "qrCodeBase64" TEXT,
  "xmlBase64" TEXT,
  "xmlHash" TEXT,
  "egsUnitId" UUID,
  "generatedAt" TIMESTAMP(3),
  "clearedAt" TIMESTAMP(3),
  "reportedAt" TIMESTAMP(3),
  "rejectedAt" TIMESTAMP(3),
  "lastErrorCode" TEXT,
  "lastErrorMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ZatcaInvoiceMetadata_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ZatcaSubmissionLog" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "invoiceMetadataId" UUID NOT NULL,
  "egsUnitId" UUID,
  "submissionType" "ZatcaSubmissionType" NOT NULL,
  "status" "ZatcaSubmissionStatus" NOT NULL,
  "requestUrl" TEXT,
  "requestPayloadBase64" TEXT,
  "responsePayloadBase64" TEXT,
  "responseCode" TEXT,
  "errorCode" TEXT,
  "errorMessage" TEXT,
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ZatcaSubmissionLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ZatcaOrganizationProfile_organizationId_key" ON "ZatcaOrganizationProfile"("organizationId");
CREATE INDEX "ZatcaOrganizationProfile_organizationId_idx" ON "ZatcaOrganizationProfile"("organizationId");

CREATE UNIQUE INDEX "ZatcaEgsUnit_organizationId_deviceSerialNumber_key" ON "ZatcaEgsUnit"("organizationId", "deviceSerialNumber");
CREATE INDEX "ZatcaEgsUnit_organizationId_idx" ON "ZatcaEgsUnit"("organizationId");
CREATE INDEX "ZatcaEgsUnit_profileId_idx" ON "ZatcaEgsUnit"("profileId");
CREATE INDEX "ZatcaEgsUnit_organizationId_isActive_idx" ON "ZatcaEgsUnit"("organizationId", "isActive");

CREATE UNIQUE INDEX "ZatcaInvoiceMetadata_invoiceId_key" ON "ZatcaInvoiceMetadata"("invoiceId");
CREATE UNIQUE INDEX "ZatcaInvoiceMetadata_invoiceUuid_key" ON "ZatcaInvoiceMetadata"("invoiceUuid");
CREATE INDEX "ZatcaInvoiceMetadata_organizationId_idx" ON "ZatcaInvoiceMetadata"("organizationId");
CREATE INDEX "ZatcaInvoiceMetadata_organizationId_zatcaStatus_idx" ON "ZatcaInvoiceMetadata"("organizationId", "zatcaStatus");
CREATE INDEX "ZatcaInvoiceMetadata_egsUnitId_idx" ON "ZatcaInvoiceMetadata"("egsUnitId");

CREATE INDEX "ZatcaSubmissionLog_organizationId_idx" ON "ZatcaSubmissionLog"("organizationId");
CREATE INDEX "ZatcaSubmissionLog_invoiceMetadataId_idx" ON "ZatcaSubmissionLog"("invoiceMetadataId");
CREATE INDEX "ZatcaSubmissionLog_egsUnitId_idx" ON "ZatcaSubmissionLog"("egsUnitId");
CREATE INDEX "ZatcaSubmissionLog_organizationId_status_idx" ON "ZatcaSubmissionLog"("organizationId", "status");

ALTER TABLE "ZatcaOrganizationProfile" ADD CONSTRAINT "ZatcaOrganizationProfile_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ZatcaEgsUnit" ADD CONSTRAINT "ZatcaEgsUnit_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ZatcaEgsUnit" ADD CONSTRAINT "ZatcaEgsUnit_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "ZatcaOrganizationProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ZatcaInvoiceMetadata" ADD CONSTRAINT "ZatcaInvoiceMetadata_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ZatcaInvoiceMetadata" ADD CONSTRAINT "ZatcaInvoiceMetadata_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "SalesInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ZatcaInvoiceMetadata" ADD CONSTRAINT "ZatcaInvoiceMetadata_egsUnitId_fkey" FOREIGN KEY ("egsUnitId") REFERENCES "ZatcaEgsUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ZatcaSubmissionLog" ADD CONSTRAINT "ZatcaSubmissionLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ZatcaSubmissionLog" ADD CONSTRAINT "ZatcaSubmissionLog_invoiceMetadataId_fkey" FOREIGN KEY ("invoiceMetadataId") REFERENCES "ZatcaInvoiceMetadata"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ZatcaSubmissionLog" ADD CONSTRAINT "ZatcaSubmissionLog_egsUnitId_fkey" FOREIGN KEY ("egsUnitId") REFERENCES "ZatcaEgsUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
