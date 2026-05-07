import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { DEFAULT_ACCOUNTS, DEFAULT_NUMBER_SEQUENCES, DEFAULT_TAX_RATES } from "../accounting/foundation-data";
import { AuditLogService } from "../audit-log/audit-log.service";
import { PrismaService } from "../prisma/prisma.service";
import { CreateOrganizationDto } from "./dto/create-organization.dto";

@Injectable()
export class OrganizationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async create(userId: string, dto: CreateOrganizationDto) {
    const organization = await this.prisma.$transaction(async (tx) => {
      const created = await tx.organization.create({
        data: {
          name: dto.name.trim(),
          legalName: dto.legalName?.trim(),
          taxNumber: dto.taxNumber?.trim(),
          countryCode: dto.countryCode ?? "SA",
          baseCurrency: dto.baseCurrency ?? "SAR",
          timezone: dto.timezone ?? "Asia/Riyadh",
        },
      });

      const role = await tx.role.create({
        data: {
          organizationId: created.id,
          name: "Owner",
          permissions: ["*"],
        },
      });

      await tx.organizationMember.create({
        data: {
          organizationId: created.id,
          userId,
          roleId: role.id,
        },
      });

      await tx.branch.create({
        data: {
          organizationId: created.id,
          name: "Main Branch",
          displayName: dto.name.trim(),
          taxNumber: dto.taxNumber?.trim(),
          countryCode: dto.countryCode ?? "SA",
          isDefault: true,
        },
      });

      await tx.organizationDocumentSettings.create({
        data: {
          organizationId: created.id,
        },
      });

      await tx.zatcaOrganizationProfile.create({
        data: {
          organizationId: created.id,
          sellerName: created.legalName ?? created.name,
          vatNumber: created.taxNumber,
          countryCode: created.countryCode,
        },
      });

      await this.createFoundationData(tx, created.id);
      return created;
    });

    await this.auditLogService.log({
      organizationId: organization.id,
      actorUserId: userId,
      action: "CREATE",
      entityType: "Organization",
      entityId: organization.id,
      after: organization,
    });

    return organization;
  }

  listForUser(userId: string) {
    return this.prisma.organization.findMany({
      where: { memberships: { some: { userId, status: "ACTIVE" } } },
      orderBy: { createdAt: "asc" },
    });
  }

  async getForUser(userId: string, id: string) {
    const organization = await this.prisma.organization.findFirst({
      where: { id, memberships: { some: { userId, status: "ACTIVE" } } },
      include: {
        branches: true,
        memberships: {
          select: {
            id: true,
            status: true,
            role: { select: { id: true, name: true } },
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    if (!organization) {
      throw new NotFoundException("Organization not found.");
    }

    return organization;
  }

  private async createFoundationData(tx: Prisma.TransactionClient, organizationId: string): Promise<void> {
    const accountIdsByCode = new Map<string, string>();

    for (const account of DEFAULT_ACCOUNTS) {
      const created = await tx.account.create({
        data: {
          organizationId,
          code: account.code,
          name: account.name,
          type: account.type,
          parentId: account.parentCode ? accountIdsByCode.get(account.parentCode) : undefined,
          allowPosting: account.allowPosting ?? true,
          isSystem: true,
        },
      });
      accountIdsByCode.set(account.code, created.id);
    }

    for (const taxRate of DEFAULT_TAX_RATES) {
      await tx.taxRate.create({
        data: {
          organizationId,
          name: taxRate.name,
          scope: taxRate.scope,
          category: taxRate.category,
          rate: taxRate.rate,
          description: taxRate.description,
          isSystem: true,
        },
      });
    }

    for (const sequence of DEFAULT_NUMBER_SEQUENCES) {
      await tx.numberSequence.create({
        data: {
          organizationId,
          scope: sequence.scope,
          prefix: sequence.prefix,
          nextNumber: sequence.nextNumber,
          padding: sequence.padding,
        },
      });
    }

    const year = new Date().getUTCFullYear();
    await tx.fiscalPeriod.create({
      data: {
        organizationId,
        name: `${year}`,
        startsOn: new Date(Date.UTC(year, 0, 1)),
        endsOn: new Date(Date.UTC(year, 11, 31, 23, 59, 59)),
      },
    });
  }
}
