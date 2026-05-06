import { Injectable, NotFoundException } from "@nestjs/common";
import { AuditLogService } from "../audit-log/audit-log.service";
import { PrismaService } from "../prisma/prisma.service";
import { CreateTaxRateDto } from "./dto/create-tax-rate.dto";
import { UpdateTaxRateDto } from "./dto/update-tax-rate.dto";

@Injectable()
export class TaxRateService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  list(organizationId: string) {
    return this.prisma.taxRate.findMany({
      where: { organizationId },
      orderBy: { name: "asc" },
    });
  }

  async create(organizationId: string, actorUserId: string, dto: CreateTaxRateDto) {
    const taxRate = await this.prisma.taxRate.create({
      data: {
        organizationId,
        name: dto.name.trim(),
        scope: dto.scope,
        category: dto.category,
        rate: dto.rate,
        description: dto.description,
        isActive: dto.isActive ?? true,
      },
    });
    await this.auditLogService.log({ organizationId, actorUserId, action: "CREATE", entityType: "TaxRate", entityId: taxRate.id, after: taxRate });
    return taxRate;
  }

  async update(organizationId: string, actorUserId: string, id: string, dto: UpdateTaxRateDto) {
    const existing = await this.findExisting(organizationId, id);
    const taxRate = await this.prisma.taxRate.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        scope: dto.scope,
        category: dto.category,
        rate: dto.rate,
        description: dto.description,
        isActive: dto.isActive,
      },
    });
    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: "UPDATE",
      entityType: "TaxRate",
      entityId: id,
      before: existing,
      after: taxRate,
    });
    return taxRate;
  }

  private async findExisting(organizationId: string, id: string) {
    const taxRate = await this.prisma.taxRate.findFirst({ where: { id, organizationId } });
    if (!taxRate) {
      throw new NotFoundException("Tax rate not found.");
    }
    return taxRate;
  }
}
