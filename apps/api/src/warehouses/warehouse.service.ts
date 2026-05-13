import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, WarehouseStatus } from "@prisma/client";
import { AuditLogService } from "../audit-log/audit-log.service";
import { PrismaService } from "../prisma/prisma.service";
import { CreateWarehouseDto } from "./dto/create-warehouse.dto";
import { UpdateWarehouseDto } from "./dto/update-warehouse.dto";

@Injectable()
export class WarehouseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  list(organizationId: string) {
    return this.prisma.warehouse.findMany({
      where: { organizationId },
      orderBy: [{ isDefault: "desc" }, { status: "asc" }, { code: "asc" }],
    });
  }

  async get(organizationId: string, id: string) {
    return this.findExisting(organizationId, id);
  }

  async create(organizationId: string, actorUserId: string, dto: CreateWarehouseDto) {
    const code = this.requiredCode(dto.code);
    const existing = await this.prisma.warehouse.findFirst({ where: { organizationId, code }, select: { id: true } });
    if (existing) {
      throw new BadRequestException("Warehouse code must be unique for this organization.");
    }

    const warehouse = await this.prisma.warehouse
      .create({
        data: {
          organizationId,
          code,
          name: this.requiredText(dto.name, "Name"),
          addressLine1: this.cleanOptional(dto.addressLine1),
          addressLine2: this.cleanOptional(dto.addressLine2),
          city: this.cleanOptional(dto.city),
          countryCode: (dto.countryCode ?? "SA").trim().toUpperCase(),
          phone: this.cleanOptional(dto.phone),
          isDefault: dto.isDefault ?? false,
        },
      })
      .catch((error: unknown) => {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
          throw new BadRequestException("Warehouse code must be unique for this organization.");
        }
        throw error;
      });

    await this.auditLogService.log({ organizationId, actorUserId, action: "CREATE", entityType: "Warehouse", entityId: warehouse.id, after: warehouse });
    return warehouse;
  }

  async update(organizationId: string, actorUserId: string, id: string, dto: UpdateWarehouseDto) {
    const existing = await this.findExisting(organizationId, id);
    const warehouse = await this.prisma.warehouse
      .update({
        where: { id },
        data: {
          code: dto.code === undefined ? undefined : this.requiredCode(dto.code),
          name: dto.name === undefined ? undefined : this.requiredText(dto.name, "Name"),
          addressLine1: this.cleanNullable(dto.addressLine1),
          addressLine2: this.cleanNullable(dto.addressLine2),
          city: this.cleanNullable(dto.city),
          countryCode: dto.countryCode === undefined ? undefined : dto.countryCode.trim().toUpperCase(),
          phone: this.cleanNullable(dto.phone),
          isDefault: dto.isDefault,
        },
      })
      .catch((error: unknown) => {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
          throw new BadRequestException("Warehouse code must be unique for this organization.");
        }
        throw error;
      });

    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: "UPDATE",
      entityType: "Warehouse",
      entityId: id,
      before: existing,
      after: warehouse,
    });
    return warehouse;
  }

  async archive(organizationId: string, actorUserId: string, id: string) {
    const existing = await this.findExisting(organizationId, id);
    if (existing.status === WarehouseStatus.ARCHIVED) {
      return existing;
    }

    if (existing.isDefault) {
      const activeCount = await this.prisma.warehouse.count({ where: { organizationId, status: WarehouseStatus.ACTIVE } });
      if (activeCount <= 1) {
        throw new BadRequestException("Cannot archive the only active default warehouse.");
      }
    }

    const warehouse = await this.prisma.warehouse.update({
      where: { id },
      data: { status: WarehouseStatus.ARCHIVED },
    });
    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: "ARCHIVE",
      entityType: "Warehouse",
      entityId: id,
      before: existing,
      after: warehouse,
    });
    return warehouse;
  }

  async reactivate(organizationId: string, actorUserId: string, id: string) {
    const existing = await this.findExisting(organizationId, id);
    if (existing.status === WarehouseStatus.ACTIVE) {
      return existing;
    }

    const warehouse = await this.prisma.warehouse.update({
      where: { id },
      data: { status: WarehouseStatus.ACTIVE },
    });
    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: "REACTIVATE",
      entityType: "Warehouse",
      entityId: id,
      before: existing,
      after: warehouse,
    });
    return warehouse;
  }

  private async findExisting(organizationId: string, id: string) {
    const warehouse = await this.prisma.warehouse.findFirst({ where: { id, organizationId } });
    if (!warehouse) {
      throw new NotFoundException("Warehouse not found.");
    }
    return warehouse;
  }

  private requiredCode(value: string): string {
    const code = value.trim().toUpperCase();
    if (!code) {
      throw new BadRequestException("Warehouse code is required.");
    }
    return code;
  }

  private requiredText(value: string, label: string): string {
    const cleaned = value.trim();
    if (!cleaned) {
      throw new BadRequestException(`${label} is required.`);
    }
    return cleaned;
  }

  private cleanOptional(value?: string | null): string | null {
    const cleaned = value?.trim();
    return cleaned ? cleaned : null;
  }

  private cleanNullable(value: string | null | undefined): string | null | undefined {
    if (value === undefined) {
      return undefined;
    }
    return this.cleanOptional(value);
  }
}
