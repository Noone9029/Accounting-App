import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import {
  buildZatcaInvoicePayload,
  initialPreviousInvoiceHash,
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
import { UpdateZatcaEgsUnitDto } from "./dto/update-zatca-egs-unit.dto";
import { UpdateZatcaProfileDto } from "./dto/update-zatca-profile.dto";

const zatcaMetadataInclude = {
  egsUnit: { select: { id: true, name: true, environment: true, isActive: true, lastIcv: true } },
  submissionLogs: { orderBy: { createdAt: "desc" as const }, take: 5 },
};

@Injectable()
export class ZatcaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async getProfile(organizationId: string) {
    const organization = await this.prisma.organization.findFirst({
      where: { id: organizationId },
      select: { id: true, name: true, legalName: true, taxNumber: true, countryCode: true },
    });
    if (!organization) {
      throw new NotFoundException("Organization not found.");
    }

    return this.prisma.zatcaOrganizationProfile.upsert({
      where: { organizationId },
      update: {},
      create: {
        organizationId,
        sellerName: organization.legalName ?? organization.name,
        vatNumber: organization.taxNumber,
        countryCode: organization.countryCode,
      },
    });
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

    return updated;
  }

  listEgsUnits(organizationId: string) {
    return this.prisma.zatcaEgsUnit.findMany({
      where: { organizationId },
      orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
    });
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
    });

    await this.auditLogService.log({ organizationId, actorUserId, action: "CREATE", entityType: "ZatcaEgsUnit", entityId: created.id, after: created });
    return created;
  }

  async getEgsUnit(organizationId: string, id: string) {
    const egsUnit = await this.prisma.zatcaEgsUnit.findFirst({ where: { id, organizationId } });
    if (!egsUnit) {
      throw new NotFoundException("ZATCA EGS unit not found.");
    }
    return egsUnit;
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
    });

    await this.auditLogService.log({ organizationId, actorUserId, action: "UPDATE", entityType: "ZatcaEgsUnit", entityId: id, before, after: updated });
    return updated;
  }

  async activateDevEgsUnit(organizationId: string, actorUserId: string, id: string) {
    const existing = await this.getEgsUnit(organizationId, id);
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
      });
    });

    await this.auditLogService.log({ organizationId, actorUserId, action: "ACTIVATE_DEV", entityType: "ZatcaEgsUnit", entityId: id, before: existing, after: updated });
    return updated;
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
