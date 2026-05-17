import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { AuditLogService } from "../audit-log/audit-log.service";
import { PrismaService } from "../prisma/prisma.service";
import { contactIdentificationTypes, CreateContactDto } from "./dto/create-contact.dto";
import { UpdateContactDto } from "./dto/update-contact.dto";

const contactIdentificationRules: Record<(typeof contactIdentificationTypes)[number], { label: string; pattern: RegExp; hint: string }> = {
  CRN: { label: "Commercial Register (CR) Number", pattern: /^[0-9]{10}$/, hint: "10 digits" },
  MOM: { label: "MOMRA License", pattern: /^[A-Za-z0-9]{4,20}$/, hint: "4 to 20 letters or digits" },
  MLS: { label: "MLSD License", pattern: /^[A-Za-z0-9]{4,20}$/, hint: "4 to 20 letters or digits" },
  SAG: { label: "SAGIA License", pattern: /^[A-Za-z0-9]{4,20}$/, hint: "4 to 20 letters or digits" },
  NAT: { label: "National ID", pattern: /^1[0-9]{9}$/, hint: "10 digits starting with 1" },
  IQA: { label: "Iqama Number", pattern: /^2[0-9]{9}$/, hint: "10 digits starting with 2" },
  PAS: { label: "Passport ID", pattern: /^[A-Za-z0-9]{5,20}$/, hint: "5 to 20 letters or digits" },
  GCC: { label: "GCC ID", pattern: /^[A-Za-z0-9]{5,20}$/, hint: "5 to 20 letters or digits" },
  "700": { label: "700 Number", pattern: /^700[0-9]{7}$/, hint: "10 digits starting with 700" },
  OTH: { label: "Others", pattern: /^[A-Za-z0-9]{1,30}$/, hint: "1 to 30 letters or digits" },
};

@Injectable()
export class ContactService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  list(organizationId: string) {
    return this.prisma.contact.findMany({
      where: { organizationId },
      orderBy: { name: "asc" },
    });
  }

  async get(organizationId: string, id: string) {
    return this.findExisting(organizationId, id);
  }

  async create(organizationId: string, actorUserId: string, dto: CreateContactDto) {
    const data = this.normalizeContactData(dto);
    const contact = await this.prisma.contact.create({
      data: {
        organizationId,
        countryCode: "SA",
        ...data,
      },
    });
    await this.auditLogService.log({ organizationId, actorUserId, action: "CREATE", entityType: "Contact", entityId: contact.id, after: contact });
    return contact;
  }

  async update(organizationId: string, actorUserId: string, id: string, dto: UpdateContactDto) {
    const existing = await this.findExisting(organizationId, id);
    const data = this.normalizeContactData(dto, existing);
    const contact = await this.prisma.contact.update({ where: { id }, data });
    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: "UPDATE",
      entityType: "Contact",
      entityId: id,
      before: existing,
      after: contact,
    });
    return contact;
  }

  private async findExisting(organizationId: string, id: string) {
    const contact = await this.prisma.contact.findFirst({ where: { id, organizationId } });
    if (!contact) {
      throw new NotFoundException("Contact not found.");
    }
    return contact;
  }

  private normalizeContactData(
    dto: CreateContactDto,
    existing?: { identificationType?: string | null; identificationNumber?: string | null },
  ): Omit<CreateContactDto, "identificationType" | "identificationNumber"> & {
    identificationType?: string | null;
    identificationNumber?: string | null;
  };

  private normalizeContactData(
    dto: UpdateContactDto,
    existing?: { identificationType?: string | null; identificationNumber?: string | null },
  ): Omit<UpdateContactDto, "identificationType" | "identificationNumber"> & {
    identificationType?: string | null;
    identificationNumber?: string | null;
  };

  private normalizeContactData(
    dto: CreateContactDto | UpdateContactDto,
    existing?: { identificationType?: string | null; identificationNumber?: string | null },
  ): Omit<CreateContactDto | UpdateContactDto, "identificationType" | "identificationNumber"> & {
    identificationType?: string | null;
    identificationNumber?: string | null;
  } {
    const data = { ...dto } as Omit<CreateContactDto | UpdateContactDto, "identificationType" | "identificationNumber"> & {
      identificationType?: string | null;
      identificationNumber?: string | null;
    };
    const hasTypeField = Object.prototype.hasOwnProperty.call(dto, "identificationType");
    const hasNumberField = Object.prototype.hasOwnProperty.call(dto, "identificationNumber");

    if (!hasTypeField && !hasNumberField) {
      return data;
    }

    const identificationType = (hasTypeField ? dto.identificationType : existing?.identificationType)?.trim().toUpperCase() || "";
    const identificationNumber = (hasNumberField ? dto.identificationNumber : existing?.identificationNumber)?.trim().toUpperCase() || "";

    if (!identificationType && !identificationNumber) {
      if (hasTypeField) {
        data.identificationType = null;
      }
      if (hasNumberField) {
        data.identificationNumber = null;
      }
      return data;
    }

    if (!identificationType || !identificationNumber) {
      throw new BadRequestException("Contact ID type and ID number must be provided together.");
    }

    if (!contactIdentificationTypes.includes(identificationType as (typeof contactIdentificationTypes)[number])) {
      throw new BadRequestException("Contact ID type must be one of CRN, MOM, MLS, SAG, NAT, IQA, PAS, GCC, 700, or OTH.");
    }

    const rule = contactIdentificationRules[identificationType as (typeof contactIdentificationTypes)[number]];
    if (!rule.pattern.test(identificationNumber)) {
      throw new BadRequestException(`${rule.label} must be ${rule.hint}.`);
    }

    if (hasTypeField) {
      data.identificationType = identificationType;
    }
    if (hasNumberField) {
      data.identificationNumber = identificationNumber;
    }

    return data;
  }
}
