import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { FiscalPeriodStatus, Prisma } from "@prisma/client";
import { AuditLogService } from "../audit-log/audit-log.service";
import { PrismaService } from "../prisma/prisma.service";
import { CreateFiscalPeriodDto } from "./dto/create-fiscal-period.dto";
import { UpdateFiscalPeriodDto } from "./dto/update-fiscal-period.dto";

@Injectable()
export class FiscalPeriodService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  list(organizationId: string) {
    return this.prisma.fiscalPeriod.findMany({
      where: { organizationId },
      orderBy: { startsOn: "asc" },
    });
  }

  async get(organizationId: string, id: string) {
    const period = await this.prisma.fiscalPeriod.findFirst({ where: { id, organizationId } });
    if (!period) {
      throw new NotFoundException("Fiscal period not found.");
    }
    return period;
  }

  async create(organizationId: string, actorUserId: string, dto: CreateFiscalPeriodDto) {
    const range = this.parseRange(dto.startsOn, dto.endsOn);
    await this.assertNoOverlap(organizationId, range.startsOn, range.endsOn);

    const period = await this.prisma.fiscalPeriod.create({
      data: {
        organizationId,
        name: dto.name.trim(),
        startsOn: range.startsOn,
        endsOn: range.endsOn,
      },
    });

    await this.auditLogService.log({ organizationId, actorUserId, action: "CREATE", entityType: "FiscalPeriod", entityId: period.id, after: period });
    return period;
  }

  async update(organizationId: string, actorUserId: string, id: string, dto: UpdateFiscalPeriodDto) {
    const existing = await this.get(organizationId, id);
    if (existing.status === FiscalPeriodStatus.LOCKED) {
      throw new BadRequestException("Locked fiscal periods cannot be edited.");
    }

    const range = this.parseRange(dto.startsOn ?? existing.startsOn, dto.endsOn ?? existing.endsOn);
    await this.assertNoOverlap(organizationId, range.startsOn, range.endsOn, id);

    const period = await this.prisma.fiscalPeriod.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        startsOn: range.startsOn,
        endsOn: range.endsOn,
      },
    });

    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: "UPDATE",
      entityType: "FiscalPeriod",
      entityId: id,
      before: existing,
      after: period,
    });
    return period;
  }

  async close(organizationId: string, actorUserId: string, id: string) {
    const existing = await this.get(organizationId, id);
    if (existing.status !== FiscalPeriodStatus.OPEN) {
      throw new BadRequestException("Only open fiscal periods can be closed.");
    }
    return this.transition(organizationId, actorUserId, existing, FiscalPeriodStatus.CLOSED, "CLOSE");
  }

  async reopen(organizationId: string, actorUserId: string, id: string) {
    const existing = await this.get(organizationId, id);
    if (existing.status === FiscalPeriodStatus.LOCKED) {
      throw new BadRequestException("Locked fiscal periods cannot be reopened.");
    }
    if (existing.status !== FiscalPeriodStatus.CLOSED) {
      throw new BadRequestException("Only closed fiscal periods can be reopened.");
    }
    return this.transition(organizationId, actorUserId, existing, FiscalPeriodStatus.OPEN, "REOPEN");
  }

  async lock(organizationId: string, actorUserId: string, id: string) {
    const existing = await this.get(organizationId, id);
    if (existing.status === FiscalPeriodStatus.LOCKED) {
      return existing;
    }
    if (existing.status !== FiscalPeriodStatus.OPEN && existing.status !== FiscalPeriodStatus.CLOSED) {
      throw new BadRequestException("Only open or closed fiscal periods can be locked.");
    }
    return this.transition(organizationId, actorUserId, existing, FiscalPeriodStatus.LOCKED, "LOCK");
  }

  private async transition(
    organizationId: string,
    actorUserId: string,
    existing: Awaited<ReturnType<FiscalPeriodService["get"]>>,
    status: FiscalPeriodStatus,
    action: string,
  ) {
    const period = await this.prisma.fiscalPeriod.update({
      where: { id: existing.id },
      data: { status },
    });
    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action,
      entityType: "FiscalPeriod",
      entityId: existing.id,
      before: existing,
      after: period,
    });
    return period;
  }

  private parseRange(startsOnInput: string | Date, endsOnInput: string | Date) {
    const startsOn = startOfDay(toDate(startsOnInput, "startsOn"));
    const endsOn = endOfDay(toDate(endsOnInput, "endsOn"));
    if (endsOn < startsOn) {
      throw new BadRequestException("Fiscal period end date must be on or after the start date.");
    }
    return { startsOn, endsOn };
  }

  private async assertNoOverlap(organizationId: string, startsOn: Date, endsOn: Date, excludeId?: string): Promise<void> {
    const where: Prisma.FiscalPeriodWhereInput = {
      organizationId,
      startsOn: { lte: endsOn },
      endsOn: { gte: startsOn },
    };
    if (excludeId) {
      where.id = { not: excludeId };
    }
    const overlap = await this.prisma.fiscalPeriod.findFirst({ where, select: { id: true, name: true } });
    if (overlap) {
      throw new BadRequestException(`Fiscal period overlaps with ${overlap.name}.`);
    }
  }
}

function toDate(value: string | Date, field: string): Date {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException(`Fiscal period ${field} date is invalid.`);
  }
  return date;
}

function startOfDay(value: Date): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate(), 0, 0, 0, 0));
}

function endOfDay(value: Date): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate(), 23, 59, 59, 999));
}
