import { Injectable, NotFoundException } from "@nestjs/common";
import { AuditLogService } from "../audit-log/audit-log.service";
import { PrismaService } from "../prisma/prisma.service";
import { CreateContactDto } from "./dto/create-contact.dto";
import { UpdateContactDto } from "./dto/update-contact.dto";

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
    const contact = await this.prisma.contact.create({
      data: {
        organizationId,
        countryCode: "SA",
        ...dto,
      },
    });
    await this.auditLogService.log({ organizationId, actorUserId, action: "CREATE", entityType: "Contact", entityId: contact.id, after: contact });
    return contact;
  }

  async update(organizationId: string, actorUserId: string, id: string, dto: UpdateContactDto) {
    const existing = await this.findExisting(organizationId, id);
    const contact = await this.prisma.contact.update({ where: { id }, data: dto });
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
}
