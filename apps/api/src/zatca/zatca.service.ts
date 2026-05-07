import { BadRequestException, Inject, Injectable, NotFoundException, NotImplementedException, Optional } from "@nestjs/common";
import { createHash } from "node:crypto";
import {
  buildZatcaInvoicePayload,
  generateZatcaCsrPem,
  initialPreviousInvoiceHash,
  type ZatcaCsrInput,
  type ZatcaInvoiceInput,
} from "@ledgerbyte/zatca-core";
import {
  Prisma,
  SalesInvoiceStatus,
  ZatcaInvoiceStatus,
  ZatcaInvoiceType,
  ZatcaRegistrationStatus,
  ZatcaSubmissionStatus,
  ZatcaSubmissionType,
} from "@prisma/client";
import { AuditLogService } from "../audit-log/audit-log.service";
import { PrismaService } from "../prisma/prisma.service";
import { CreateZatcaEgsUnitDto } from "./dto/create-zatca-egs-unit.dto";
import { RequestComplianceCsidDto } from "./dto/request-compliance-csid.dto";
import { UpdateZatcaEgsUnitDto } from "./dto/update-zatca-egs-unit.dto";
import { UpdateZatcaProfileDto } from "./dto/update-zatca-profile.dto";
import { MockZatcaOnboardingAdapter } from "./adapters/mock-zatca-onboarding.adapter";
import { ZATCA_ONBOARDING_ADAPTER, type ZatcaOnboardingAdapter } from "./adapters/zatca-onboarding.adapter";

const zatcaMetadataInclude = {
  egsUnit: { select: { id: true, name: true, environment: true, isActive: true, lastIcv: true } },
  submissionLogs: { orderBy: { createdAt: "desc" as const }, take: 5 },
};

const safeEgsUnitSelect = {
  id: true,
  organizationId: true,
  profileId: true,
  name: true,
  environment: true,
  status: true,
  deviceSerialNumber: true,
  solutionName: true,
  csrPem: true,
  complianceCsidPem: true,
  productionCsidPem: true,
  certificateRequestId: true,
  lastInvoiceHash: true,
  lastIcv: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ZatcaEgsUnitSelect;

const internalEgsUnitSelect = {
  ...safeEgsUnitSelect,
  privateKeyPem: true,
} satisfies Prisma.ZatcaEgsUnitSelect;

type SafeEgsUnitRecord = Prisma.ZatcaEgsUnitGetPayload<{ select: typeof safeEgsUnitSelect }>;
type InternalEgsUnitRecord = Prisma.ZatcaEgsUnitGetPayload<{ select: typeof internalEgsUnitSelect }>;

export interface ZatcaProfileReadiness {
  ready: boolean;
  missingFields: string[];
}

export function getZatcaProfileReadiness(profile: {
  sellerName?: string | null;
  vatNumber?: string | null;
  city?: string | null;
  countryCode?: string | null;
}): ZatcaProfileReadiness {
  const missingFields = [
    ["sellerName", profile.sellerName],
    ["vatNumber", profile.vatNumber],
    ["city", profile.city],
    ["countryCode", profile.countryCode],
  ]
    .filter(([, value]) => !String(value ?? "").trim())
    .map(([field]) => String(field));

  return { ready: missingFields.length === 0, missingFields };
}

@Injectable()
export class ZatcaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
    @Optional()
    @Inject(ZATCA_ONBOARDING_ADAPTER)
    private readonly onboardingAdapter: ZatcaOnboardingAdapter = new MockZatcaOnboardingAdapter(),
  ) {}

  async getProfile(organizationId: string) {
    const organization = await this.prisma.organization.findFirst({
      where: { id: organizationId },
      select: { id: true, name: true, legalName: true, taxNumber: true, countryCode: true },
    });
    if (!organization) {
      throw new NotFoundException("Organization not found.");
    }

    const profile = await this.prisma.zatcaOrganizationProfile.upsert({
      where: { organizationId },
      update: {},
      create: {
        organizationId,
        sellerName: organization.legalName ?? organization.name,
        vatNumber: organization.taxNumber,
        countryCode: organization.countryCode,
      },
    });
    return this.withReadiness(profile);
  }

  async updateProfile(organizationId: string, actorUserId: string, dto: UpdateZatcaProfileDto) {
    const before = await this.getProfile(organizationId);
    const data = this.cleanProfileData(dto);
    const updated = await this.prisma.zatcaOrganizationProfile.update({
      where: { organizationId },
      data,
    });

    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: "UPDATE",
      entityType: "ZatcaOrganizationProfile",
      entityId: updated.id,
      before,
      after: updated,
    });

    return this.withReadiness(updated);
  }

  async listEgsUnits(organizationId: string) {
    const units = await this.prisma.zatcaEgsUnit.findMany({
      where: { organizationId },
      orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
      select: safeEgsUnitSelect,
    });
    return units.map((unit) => this.toPublicEgsUnit(unit));
  }

  async createEgsUnit(organizationId: string, actorUserId: string, dto: CreateZatcaEgsUnitDto) {
    const profile = await this.getProfile(organizationId);
    const created = await this.prisma.zatcaEgsUnit.create({
      data: {
        organizationId,
        profileId: profile.id,
        name: this.requiredText(dto.name, "EGS unit name"),
        deviceSerialNumber: this.requiredText(dto.deviceSerialNumber, "Device serial number"),
        environment: dto.environment ?? profile.environment,
        solutionName: this.optionalText(dto.solutionName) ?? "LedgerByte",
      },
      select: safeEgsUnitSelect,
    });

    const publicUnit = this.toPublicEgsUnit(created);
    await this.auditLogService.log({ organizationId, actorUserId, action: "CREATE", entityType: "ZatcaEgsUnit", entityId: created.id, after: publicUnit });
    return publicUnit;
  }

  async getEgsUnit(organizationId: string, id: string) {
    const egsUnit = await this.prisma.zatcaEgsUnit.findFirst({ where: { id, organizationId }, select: safeEgsUnitSelect });
    if (!egsUnit) {
      throw new NotFoundException("ZATCA EGS unit not found.");
    }
    return this.toPublicEgsUnit(egsUnit);
  }

  async updateEgsUnit(organizationId: string, actorUserId: string, id: string, dto: UpdateZatcaEgsUnitDto) {
    const before = await this.getEgsUnit(organizationId, id);
    const updated = await this.prisma.zatcaEgsUnit.update({
      where: { id },
      data: {
        name: dto.name === undefined ? undefined : this.requiredText(dto.name, "EGS unit name"),
        deviceSerialNumber: dto.deviceSerialNumber === undefined ? undefined : this.requiredText(dto.deviceSerialNumber, "Device serial number"),
        environment: dto.environment,
        status: dto.status,
        solutionName: dto.solutionName === undefined ? undefined : this.requiredText(dto.solutionName, "Solution name"),
        csrPem: dto.csrPem === undefined ? undefined : this.optionalText(dto.csrPem),
      },
      select: safeEgsUnitSelect,
    });

    const publicUnit = this.toPublicEgsUnit(updated);
    await this.auditLogService.log({ organizationId, actorUserId, action: "UPDATE", entityType: "ZatcaEgsUnit", entityId: id, before, after: publicUnit });
    return publicUnit;
  }

  async activateDevEgsUnit(organizationId: string, actorUserId: string, id: string) {
    const existing = await this.getEgsUnitInternal(organizationId, id);
    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.zatcaEgsUnit.updateMany({ where: { organizationId, isActive: true }, data: { isActive: false } });
      return tx.zatcaEgsUnit.update({
        where: { id },
        data: {
          isActive: true,
          status: ZatcaRegistrationStatus.ACTIVE,
          csrPem: existing.csrPem ?? "-----BEGIN CSR-----\nLOCAL-DEV-PLACEHOLDER\n-----END CSR-----",
          // Development placeholder only. Production must use KMS/secrets-manager-backed private key storage.
          privateKeyPem: existing.privateKeyPem ?? "-----BEGIN PRIVATE KEY-----\nLOCAL-DEV-PLACEHOLDER\n-----END PRIVATE KEY-----",
          complianceCsidPem: existing.complianceCsidPem ?? "-----BEGIN CERTIFICATE-----\nLOCAL-DEV-COMPLIANCE-CSID\n-----END CERTIFICATE-----",
        },
        select: safeEgsUnitSelect,
      });
    });

    const publicBefore = this.toPublicEgsUnit(existing);
    const publicUpdated = this.toPublicEgsUnit(updated);
    await this.auditLogService.log({ organizationId, actorUserId, action: "ACTIVATE_DEV", entityType: "ZatcaEgsUnit", entityId: id, before: publicBefore, after: publicUpdated });
    return publicUpdated;
  }

  async generateEgsCsr(organizationId: string, actorUserId: string, id: string) {
    const existing = await this.getEgsUnitInternal(organizationId, id);
    const profile = await this.getProfile(organizationId);
    const readiness = getZatcaProfileReadiness(profile);
    if (!readiness.ready) {
      throw new BadRequestException(`ZATCA profile is missing required CSR fields: ${readiness.missingFields.join(", ")}.`);
    }

    const csrInput = this.toCsrInput(profile, existing);
    const { privateKeyPem, csrPem } = generateZatcaCsrPem(csrInput);
    const updated = await this.prisma.$transaction(async (tx) => {
      const unit = await tx.zatcaEgsUnit.update({
        where: { id },
        data: {
          csrPem,
          // Development-only storage. Production must use KMS/secrets manager. Never log or expose privateKeyPem.
          privateKeyPem,
          status: ZatcaRegistrationStatus.OTP_REQUIRED,
        },
        select: safeEgsUnitSelect,
      });
      await tx.zatcaOrganizationProfile.update({
        where: { organizationId },
        data: { registrationStatus: ZatcaRegistrationStatus.OTP_REQUIRED },
      });
      return unit;
    });

    const publicBefore = this.toPublicEgsUnit(existing);
    const publicUpdated = this.toPublicEgsUnit(updated);
    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: "GENERATE_CSR",
      entityType: "ZatcaEgsUnit",
      entityId: id,
      before: publicBefore,
      after: publicUpdated,
    });
    return publicUpdated;
  }

  async getEgsCsr(organizationId: string, id: string): Promise<string> {
    const egsUnit = await this.getEgsUnitInternal(organizationId, id);
    if (!egsUnit.csrPem) {
      throw new NotFoundException("ZATCA CSR has not been generated for this EGS unit.");
    }
    return egsUnit.csrPem;
  }

  async requestComplianceCsid(organizationId: string, actorUserId: string, id: string, dto: RequestComplianceCsidDto) {
    const existing = await this.getEgsUnitInternal(organizationId, id);
    if (!existing.csrPem) {
      throw new BadRequestException("Generate a CSR before requesting a compliance CSID.");
    }
    if (!dto.otp?.trim()) {
      throw new BadRequestException("OTP is required for the local mock compliance CSID flow.");
    }

    const adapterResult = await this.onboardingAdapter.requestComplianceCsid({
      organizationId,
      egsUnitId: id,
      environment: existing.environment,
      otp: dto.otp,
      csrPem: existing.csrPem,
    });

    const updated = await this.prisma.$transaction(async (tx) => {
      const activeCount = await tx.zatcaEgsUnit.count({ where: { organizationId, isActive: true } });
      const unit = await tx.zatcaEgsUnit.update({
        where: { id },
        data: {
          complianceCsidPem: adapterResult.complianceCsidPem,
          certificateRequestId: adapterResult.certificateRequestId,
          status: ZatcaRegistrationStatus.ACTIVE,
          isActive: activeCount === 0 ? true : undefined,
        },
        select: safeEgsUnitSelect,
      });
      await tx.zatcaOrganizationProfile.update({
        where: { organizationId },
        data: { registrationStatus: ZatcaRegistrationStatus.ACTIVE },
      });
      await tx.zatcaSubmissionLog.create({
        data: {
          organizationId,
          invoiceMetadataId: null,
          egsUnitId: id,
          submissionType: ZatcaSubmissionType.COMPLIANCE_CHECK,
          status: ZatcaSubmissionStatus.SUCCESS,
          requestUrl: `local-${dto.mode ?? "mock"}-compliance-csid`,
          requestPayloadBase64: Buffer.from(
            JSON.stringify({
              mode: dto.mode ?? "mock",
              otpLength: dto.otp.length,
              csrHash: this.hashForLog(existing.csrPem!),
            }),
            "utf8",
          ).toString("base64"),
          responsePayloadBase64: Buffer.from(JSON.stringify(adapterResult.responsePayload), "utf8").toString("base64"),
          responseCode: adapterResult.responseCode,
          completedAt: new Date(),
        },
      });
      return unit;
    });

    const publicBefore = this.toPublicEgsUnit(existing);
    const publicUpdated = this.toPublicEgsUnit(updated);
    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: "REQUEST_COMPLIANCE_CSID",
      entityType: "ZatcaEgsUnit",
      entityId: id,
      before: publicBefore,
      after: publicUpdated,
    });
    return publicUpdated;
  }

  async requestProductionCsid(organizationId: string, _actorUserId: string, id: string) {
    await this.getEgsUnitInternal(organizationId, id);
    throw new NotImplementedException("Production CSID request is not implemented. Complete compliance CSID flow and real adapter first.");
  }

  async getInvoiceCompliance(organizationId: string, invoiceId: string) {
    await this.ensureInvoiceBelongsToOrganization(organizationId, invoiceId);
    return this.ensureInvoiceMetadata(organizationId, invoiceId);
  }

  async generateInvoiceCompliance(organizationId: string, actorUserId: string, invoiceId: string) {
    const result = await this.prisma.$transaction(async (tx) => {
      const invoice = await tx.salesInvoice.findFirst({
        where: { id: invoiceId, organizationId },
        include: {
          organization: { select: { id: true, name: true, legalName: true, taxNumber: true, countryCode: true } },
          customer: {
            select: {
              id: true,
              name: true,
              displayName: true,
              taxNumber: true,
              addressLine1: true,
              addressLine2: true,
              city: true,
              postalCode: true,
              countryCode: true,
            },
          },
          lines: { orderBy: { sortOrder: "asc" }, include: { taxRate: { select: { name: true } } } },
        },
      });
      if (!invoice) {
        throw new NotFoundException("Sales invoice not found.");
      }
      if (invoice.status !== SalesInvoiceStatus.FINALIZED) {
        throw new BadRequestException("ZATCA XML can only be generated for finalized invoices.");
      }

      const profile = await tx.zatcaOrganizationProfile.findUnique({ where: { organizationId } });
      if (!profile?.sellerName?.trim() || !profile.vatNumber?.trim()) {
        throw new BadRequestException("ZATCA seller name and VAT number are required before XML generation.");
      }

      const metadata = await tx.zatcaInvoiceMetadata.upsert({
        where: { invoiceId },
        update: {},
        create: {
          organizationId,
          invoiceId,
          zatcaInvoiceType: ZatcaInvoiceType.STANDARD_TAX_INVOICE,
        },
      });

      const activeEgs = await tx.zatcaEgsUnit.findFirst({
        where: { organizationId, isActive: true, status: ZatcaRegistrationStatus.ACTIVE },
        orderBy: { updatedAt: "desc" },
      });
      const nextIcv = activeEgs ? activeEgs.lastIcv + 1 : metadata.icv;
      const previousInvoiceHash = activeEgs?.lastInvoiceHash ?? initialPreviousInvoiceHash;
      const payload = buildZatcaInvoicePayload(this.toZatcaInvoiceInput(invoice, profile, metadata.invoiceUuid, previousInvoiceHash, nextIcv));

      const updatedMetadata = await tx.zatcaInvoiceMetadata.update({
        where: { id: metadata.id },
        data: {
          zatcaStatus: ZatcaInvoiceStatus.XML_GENERATED,
          icv: nextIcv,
          previousInvoiceHash,
          invoiceHash: payload.invoiceHash,
          qrCodeBase64: payload.qrCodeBase64,
          xmlBase64: payload.xmlBase64,
          xmlHash: payload.invoiceHash,
          egsUnitId: activeEgs?.id ?? null,
          generatedAt: new Date(),
          lastErrorCode: null,
          lastErrorMessage: null,
        },
        include: zatcaMetadataInclude,
      });

      if (activeEgs) {
        await tx.zatcaEgsUnit.update({
          where: { id: activeEgs.id },
          data: { lastIcv: nextIcv ?? activeEgs.lastIcv, lastInvoiceHash: payload.invoiceHash },
        });
      }

      await tx.zatcaSubmissionLog.create({
        data: {
          organizationId,
          invoiceMetadataId: metadata.id,
          egsUnitId: activeEgs?.id ?? null,
          submissionType: ZatcaSubmissionType.COMPLIANCE_CHECK,
          status: ZatcaSubmissionStatus.SUCCESS,
          requestUrl: "local-generation-only",
          responseCode: "LOCAL_GENERATION_ONLY",
          responsePayloadBase64: Buffer.from(JSON.stringify({ message: "Local XML/QR/hash generation only. Not submitted to ZATCA." }), "utf8").toString("base64"),
          completedAt: new Date(),
        },
      });

      return updatedMetadata;
    });

    await this.auditLogService.log({ organizationId, actorUserId, action: "GENERATE", entityType: "ZatcaInvoiceMetadata", entityId: result.id, after: result });
    return result;
  }

  async getInvoiceXml(organizationId: string, invoiceId: string) {
    const metadata = await this.getMetadataWithXml(organizationId, invoiceId);
    return Buffer.from(metadata.xmlBase64, "base64");
  }

  async getInvoiceQr(organizationId: string, invoiceId: string) {
    const metadata = await this.getMetadataWithQr(organizationId, invoiceId);
    return { qrCodeBase64: metadata.qrCodeBase64 };
  }

  listSubmissions(organizationId: string) {
    return this.prisma.zatcaSubmissionLog.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      include: {
        invoiceMetadata: { select: { id: true, invoiceId: true, invoiceUuid: true, zatcaStatus: true } },
        egsUnit: { select: { id: true, name: true, environment: true } },
      },
    });
  }

  async ensureInvoiceMetadata(organizationId: string, invoiceId: string, executor: Prisma.TransactionClient | PrismaService = this.prisma) {
    await this.ensureInvoiceBelongsToOrganization(organizationId, invoiceId, executor);
    return executor.zatcaInvoiceMetadata.upsert({
      where: { invoiceId },
      update: {},
      create: { organizationId, invoiceId, zatcaInvoiceType: ZatcaInvoiceType.STANDARD_TAX_INVOICE },
      include: zatcaMetadataInclude,
    });
  }

  private async ensureInvoiceBelongsToOrganization(
    organizationId: string,
    invoiceId: string,
    executor: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    const invoice = await executor.salesInvoice.findFirst({ where: { id: invoiceId, organizationId }, select: { id: true } });
    if (!invoice) {
      throw new NotFoundException("Sales invoice not found.");
    }
    return invoice;
  }

  private async getMetadataWithXml(organizationId: string, invoiceId: string) {
    const metadata = await this.prisma.zatcaInvoiceMetadata.findFirst({ where: { organizationId, invoiceId } });
    if (!metadata?.xmlBase64) {
      throw new NotFoundException("ZATCA XML has not been generated for this invoice.");
    }
    return metadata as typeof metadata & { xmlBase64: string };
  }

  private async getMetadataWithQr(organizationId: string, invoiceId: string) {
    const metadata = await this.prisma.zatcaInvoiceMetadata.findFirst({ where: { organizationId, invoiceId } });
    if (!metadata?.qrCodeBase64) {
      throw new NotFoundException("ZATCA QR payload has not been generated for this invoice.");
    }
    return metadata as typeof metadata & { qrCodeBase64: string };
  }

  private toZatcaInvoiceInput(
    invoice: Prisma.SalesInvoiceGetPayload<{
      include: {
        organization: { select: { id: true; name: true; legalName: true; taxNumber: true; countryCode: true } };
        customer: {
          select: {
            id: true;
            name: true;
            displayName: true;
            taxNumber: true;
            addressLine1: true;
            addressLine2: true;
            city: true;
            postalCode: true;
            countryCode: true;
          };
        };
        lines: { include: { taxRate: { select: { name: true } } } };
      };
    }>,
    profile: { sellerName: string | null; vatNumber: string | null; companyIdType: string | null; companyIdNumber: string | null; buildingNumber: string | null; streetName: string | null; district: string | null; city: string | null; postalCode: string | null; countryCode: string; additionalAddressNumber: string | null },
    invoiceUuid: string,
    previousInvoiceHash: string,
    icv?: number | null,
  ): ZatcaInvoiceInput {
    return {
      invoiceUuid,
      invoiceNumber: invoice.invoiceNumber,
      invoiceType: ZatcaInvoiceType.STANDARD_TAX_INVOICE,
      issueDate: invoice.issueDate,
      currency: invoice.currency,
      seller: {
        name: profile.sellerName ?? invoice.organization.legalName ?? invoice.organization.name,
        vatNumber: profile.vatNumber ?? invoice.organization.taxNumber ?? "",
        companyIdType: profile.companyIdType,
        companyIdNumber: profile.companyIdNumber,
        buildingNumber: profile.buildingNumber,
        streetName: profile.streetName,
        district: profile.district,
        city: profile.city,
        postalCode: profile.postalCode,
        countryCode: profile.countryCode,
        additionalAddressNumber: profile.additionalAddressNumber,
      },
      buyer: {
        name: invoice.customer.displayName ?? invoice.customer.name,
        vatNumber: invoice.customer.taxNumber,
        city: invoice.customer.city,
        postalCode: invoice.customer.postalCode,
        countryCode: invoice.customer.countryCode,
      },
      subtotal: String(invoice.subtotal),
      discountTotal: String(invoice.discountTotal),
      taxableTotal: String(invoice.taxableTotal),
      taxTotal: String(invoice.taxTotal),
      total: String(invoice.total),
      previousInvoiceHash,
      icv,
      lines: invoice.lines.map((line) => ({
        id: line.id,
        description: line.description,
        quantity: String(line.quantity),
        unitPrice: String(line.unitPrice),
        taxableAmount: String(line.taxableAmount),
        taxAmount: String(line.taxAmount),
        lineTotal: String(line.lineTotal),
        taxRateName: line.taxRate?.name ?? null,
      })),
    };
  }

  private async getEgsUnitInternal(organizationId: string, id: string): Promise<InternalEgsUnitRecord> {
    const egsUnit = await this.prisma.zatcaEgsUnit.findFirst({ where: { id, organizationId }, select: internalEgsUnitSelect });
    if (!egsUnit) {
      throw new NotFoundException("ZATCA EGS unit not found.");
    }
    return egsUnit;
  }

  private toPublicEgsUnit(unit: SafeEgsUnitRecord | InternalEgsUnitRecord) {
    return {
      id: unit.id,
      organizationId: unit.organizationId,
      profileId: unit.profileId,
      name: unit.name,
      environment: unit.environment,
      status: unit.status,
      deviceSerialNumber: unit.deviceSerialNumber,
      solutionName: unit.solutionName,
      hasCsr: Boolean(unit.csrPem),
      hasComplianceCsid: Boolean(unit.complianceCsidPem),
      hasProductionCsid: Boolean(unit.productionCsidPem),
      certificateRequestId: unit.certificateRequestId,
      lastInvoiceHash: unit.lastInvoiceHash,
      lastIcv: unit.lastIcv,
      isActive: unit.isActive,
      createdAt: unit.createdAt,
      updatedAt: unit.updatedAt,
    };
  }

  private withReadiness<T extends { sellerName?: string | null; vatNumber?: string | null; city?: string | null; countryCode?: string | null }>(profile: T) {
    return { ...profile, readiness: getZatcaProfileReadiness(profile) };
  }

  private toCsrInput(
    profile: {
      sellerName?: string | null;
      vatNumber?: string | null;
      companyIdNumber?: string | null;
      city?: string | null;
      countryCode?: string | null;
      businessCategory?: string | null;
    },
    egsUnit: InternalEgsUnitRecord,
  ): ZatcaCsrInput {
    return {
      sellerName: profile.sellerName ?? "",
      vatNumber: profile.vatNumber ?? "",
      organizationIdentifier: profile.companyIdNumber ?? profile.vatNumber ?? "",
      organizationUnitName: egsUnit.name,
      organizationName: profile.sellerName ?? "",
      countryCode: profile.countryCode ?? "SA",
      city: profile.city ?? "",
      deviceSerialNumber: egsUnit.deviceSerialNumber,
      solutionName: egsUnit.solutionName,
      businessCategory: profile.businessCategory?.trim() || "General business",
    };
  }

  private hashForLog(value: string): string {
    return createHash("sha256").update(value, "utf8").digest("base64");
  }

  private cleanProfileData(dto: UpdateZatcaProfileDto): Prisma.ZatcaOrganizationProfileUpdateInput {
    return {
      environment: dto.environment,
      registrationStatus: dto.registrationStatus,
      sellerName: dto.sellerName === undefined ? undefined : this.optionalText(dto.sellerName),
      vatNumber: dto.vatNumber === undefined ? undefined : this.optionalText(dto.vatNumber),
      companyIdType: dto.companyIdType === undefined ? undefined : this.optionalText(dto.companyIdType),
      companyIdNumber: dto.companyIdNumber === undefined ? undefined : this.optionalText(dto.companyIdNumber),
      buildingNumber: dto.buildingNumber === undefined ? undefined : this.optionalText(dto.buildingNumber),
      streetName: dto.streetName === undefined ? undefined : this.optionalText(dto.streetName),
      district: dto.district === undefined ? undefined : this.optionalText(dto.district),
      city: dto.city === undefined ? undefined : this.optionalText(dto.city),
      postalCode: dto.postalCode === undefined ? undefined : this.optionalText(dto.postalCode),
      countryCode: dto.countryCode === undefined ? undefined : this.requiredText(dto.countryCode, "Country code").toUpperCase(),
      additionalAddressNumber: dto.additionalAddressNumber === undefined ? undefined : this.optionalText(dto.additionalAddressNumber),
      businessCategory: dto.businessCategory === undefined ? undefined : this.optionalText(dto.businessCategory),
    };
  }

  private requiredText(value: string, label: string): string {
    const trimmed = value.trim();
    if (!trimmed) {
      throw new BadRequestException(`${label} cannot be blank.`);
    }
    return trimmed;
  }

  private optionalText(value: string | undefined): string | null {
    const trimmed = value?.trim();
    return trimmed || null;
  }
}
