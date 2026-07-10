import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { DEFAULT_ROLE_PERMISSIONS, hasPermission, normalizeSupportedCurrencyCode, PERMISSIONS } from "@ledgerbyte/shared";
import {
  DEFAULT_ACCOUNTS,
  DEFAULT_BANK_ACCOUNT_PROFILES,
  DEFAULT_NUMBER_SEQUENCES,
  DEFAULT_TAX_RATES,
} from "../accounting/foundation-data";
import { AuditLogService } from "../audit-log/audit-log.service";
import { PrismaService } from "../prisma/prisma.service";
import { CreateOrganizationDto } from "./dto/create-organization.dto";
import { UpdateOrganizationDto } from "./dto/update-organization.dto";

@Injectable()
export class OrganizationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async create(userId: string, dto: CreateOrganizationDto) {
    const countryCode = dto.countryCode?.trim().toUpperCase() ?? "SA";
    const baseCurrency = dto.baseCurrency !== undefined
      ? this.requiredBaseCurrency(dto.baseCurrency)
      : countryCode === "AE"
        ? "AED"
        : "SAR";
    const organization = await this.prisma.$transaction(async (tx) => {
      const created = await tx.organization.create({
        data: {
          name: dto.name.trim(),
          legalName: dto.legalName?.trim(),
          taxNumber: dto.taxNumber?.trim(),
          countryCode,
          baseCurrency,
          timezone: dto.timezone ?? "Asia/Riyadh",
        },
      });

      const roles = await this.createDefaultRoles(tx, created.id);
      const ownerRole = roles.get("Owner");

      if (!ownerRole) {
        throw new Error("Owner role was not provisioned.");
      }

      await tx.organizationMember.create({
        data: {
          organizationId: created.id,
          userId,
          roleId: ownerRole.id,
        },
      });

      await tx.branch.create({
        data: {
          organizationId: created.id,
          name: "Main Branch",
          displayName: dto.name.trim(),
          taxNumber: dto.taxNumber?.trim(),
          countryCode,
          isDefault: true,
        },
      });

      await tx.warehouse.create({
        data: {
          organizationId: created.id,
          code: "MAIN",
          name: "Main Warehouse",
          countryCode: created.countryCode,
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
    const canView = await this.userCanViewOrganization(userId, id);

    if (!canView) {
      throw new NotFoundException("Organization not found.");
    }

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

  async updateForUser(userId: string, id: string, dto: UpdateOrganizationDto) {
    const membership = await this.prisma.organizationMember.findFirst({
      where: { organizationId: id, userId, status: "ACTIVE" },
      select: { role: { select: { permissions: true } } },
    });

    if (!membership) {
      throw new NotFoundException("Organization not found.");
    }

    if (!hasPermission(membership.role.permissions, PERMISSIONS.organization.update)) {
      throw new ForbiddenException("You do not have permission to perform this action.");
    }
    if (
      dto.baseCurrency !== undefined &&
      !hasPermission(membership.role.permissions, PERMISSIONS.currencies.manage)
    ) {
      throw new ForbiddenException("You do not have permission to perform this action.");
    }

    const requestedBaseCurrency = dto.baseCurrency === undefined ? undefined : this.requiredBaseCurrency(dto.baseCurrency);
    return this.prisma.$transaction(
      async (tx) => {
        const before = await tx.organization.findUnique({ where: { id } });
        if (!before) {
          throw new NotFoundException("Organization not found.");
        }
        if (requestedBaseCurrency && requestedBaseCurrency !== before.baseCurrency) {
          const journalCount = await tx.journalEntry.count({ where: { organizationId: id } });
          const rateCount = await tx.currencyRateSnapshot.count({ where: { organizationId: id } });
          if (journalCount > 0 || rateCount > 0) {
            throw new BadRequestException("Base currency cannot change after financial or FX activity exists.");
          }
        }

        const organization = await tx.organization.update({
          where: { id },
          data: {
            name: dto.name?.trim(),
            legalName: dto.legalName?.trim(),
            taxNumber: dto.taxNumber?.trim(),
            countryCode: dto.countryCode?.trim().toUpperCase(),
            baseCurrency: requestedBaseCurrency,
            timezone: dto.timezone?.trim(),
            tradeLicenseNumber: dto.tradeLicenseNumber?.trim(),
            uaeTrn: dto.uaeTrn?.trim(),
            uaeTin: dto.uaeTin?.trim(),
            uaeVatRegistrationStatus: dto.uaeVatRegistrationStatus?.trim(),
            uaeAddressLine1: dto.uaeAddressLine1?.trim(),
            uaeAddressLine2: dto.uaeAddressLine2?.trim(),
            uaeEmirate: dto.uaeEmirate?.trim(),
            uaeBusinessActivity: dto.uaeBusinessActivity?.trim(),
            peppolParticipantId: dto.peppolParticipantId?.trim(),
            uaeAspSelected: dto.uaeAspSelected?.trim(),
            uaeAspOnboardingStatus: dto.uaeAspOnboardingStatus?.trim(),
          },
        });

        await this.auditLogService.log(
          {
            organizationId: organization.id,
            actorUserId: userId,
            action: "UPDATE",
            entityType: "Organization",
            entityId: organization.id,
            before,
            after: organization,
          },
          tx,
        );
        return organization;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async userCanViewOrganization(userId: string, organizationId: string): Promise<boolean> {
    const membership = await this.prisma.organizationMember.findFirst({
      where: { organizationId, userId, status: "ACTIVE" },
      select: { role: { select: { permissions: true } } },
    });

    return hasPermission(membership?.role.permissions, PERMISSIONS.organization.view);
  }

  private async createDefaultRoles(tx: Prisma.TransactionClient, organizationId: string): Promise<Map<string, { id: string }>> {
    const roles = new Map<string, { id: string }>();

    for (const [name, permissions] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
      const role = await tx.role.create({
        data: {
          organizationId,
          name,
          permissions: [...permissions],
          isSystem: true,
        },
        select: { id: true },
      });
      roles.set(name, role);
    }

    return roles;
  }

  private requiredBaseCurrency(value: string): string {
    const currency = normalizeSupportedCurrencyCode(value);
    if (!currency) {
      throw new BadRequestException("Base currency is unsupported.");
    }
    return currency;
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

    const organization = await tx.organization.findUnique({
      where: { id: organizationId },
      select: { baseCurrency: true },
    });

    for (const profile of DEFAULT_BANK_ACCOUNT_PROFILES) {
      const accountId = accountIdsByCode.get(profile.accountCode);
      if (!accountId) {
        continue;
      }

      await tx.bankAccountProfile.create({
        data: {
          organizationId,
          accountId,
          type: profile.type,
          displayName: profile.displayName,
          currency: organization?.baseCurrency ?? "SAR",
        },
      });
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
