import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { DimensionStatus, Prisma } from "@prisma/client";
import { AuditLogService } from "../audit-log/audit-log.service";
import { PrismaService } from "../prisma/prisma.service";
import { CreateCostCenterDto } from "./dto/create-cost-center.dto";
import { UpdateCostCenterDto } from "./dto/update-cost-center.dto";

@Injectable()
export class CostCenterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  list(organizationId: string, status?: DimensionStatus) {
    return this.prisma.costCenter.findMany({
      where: { organizationId, ...(status ? { status } : {}) },
      orderBy: { code: "asc" },
    });
  }

  async get(organizationId: string, id: string) {
    return this.findExisting(organizationId, id);
  }

  async create(organizationId: string, actorUserId: string, dto: CreateCostCenterDto) {
    const code = this.requiredCode(dto.code);
    const name = this.requiredName(dto.name);
    await this.assertCodeAvailable(organizationId, code);

    const costCenter = await this.prisma.costCenter
      .create({
        data: {
          organizationId,
          code,
          name,
          description: this.cleanOptional(dto.description),
        },
      })
      .catch((error: unknown) => {
        this.rethrowDuplicate(error);
      });

    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: "CREATE",
      entityType: "CostCenter",
      entityId: costCenter.id,
      after: costCenter,
    });
    return costCenter;
  }

  async update(organizationId: string, actorUserId: string, id: string, dto: UpdateCostCenterDto) {
    const existing = await this.findExisting(organizationId, id);
    const code = dto.code === undefined ? undefined : this.requiredCode(dto.code);
    if (code !== undefined && code !== existing.code) {
      await this.assertCodeAvailable(organizationId, code, id);
    }

    const costCenter = await this.prisma.costCenter
      .update({
        where: { id, organizationId },
        data: {
          code,
          name: dto.name === undefined ? undefined : this.requiredName(dto.name),
          description: this.cleanNullable(dto.description),
          status: dto.status,
        },
      })
      .catch((error: unknown) => {
        this.rethrowDuplicate(error);
      });

    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: "UPDATE",
      entityType: "CostCenter",
      entityId: id,
      before: existing,
      after: costCenter,
    });
    return costCenter;
  }

  private async findExisting(organizationId: string, id: string) {
    const costCenter = await this.prisma.costCenter.findFirst({ where: { id, organizationId } });
    if (!costCenter) {
      throw new NotFoundException("Cost center not found.");
    }
    return costCenter;
  }

  private async assertCodeAvailable(organizationId: string, code: string, exceptId?: string): Promise<void> {
    const existing = await this.prisma.costCenter.findFirst({
      where: { organizationId, code, ...(exceptId ? { id: { not: exceptId } } : {}) },
      select: { id: true },
    });
    if (existing) {
      throw new BadRequestException("Cost center code already exists.");
    }
  }

  private requiredCode(value: string): string {
    const code = value.trim().toUpperCase();
    if (!code) {
      throw new BadRequestException("Cost center code is required.");
    }
    return code;
  }

  private requiredName(value: string): string {
    const name = value.trim();
    if (!name) {
      throw new BadRequestException("Cost center name is required.");
    }
    return name;
  }

  private cleanOptional(value?: string | null): string | null {
    const description = value?.trim();
    return description || null;
  }

  private cleanNullable(value: string | null | undefined): string | null | undefined {
    return value === undefined ? undefined : this.cleanOptional(value);
  }

  private rethrowDuplicate(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new BadRequestException("Cost center code already exists.");
    }
    throw error;
  }
}
