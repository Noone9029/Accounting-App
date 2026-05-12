import { BadRequestException, Injectable } from "@nestjs/common";
import { FiscalPeriodStatus, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

type PrismaExecutor = PrismaService | Prisma.TransactionClient;

@Injectable()
export class FiscalPeriodGuardService {
  constructor(private readonly prisma: PrismaService) {}

  async assertPostingDateAllowed(organizationId: string, postingDate: string | Date, executor: PrismaExecutor = this.prisma): Promise<void> {
    const date = toDate(postingDate);
    const periodCount = await executor.fiscalPeriod.count({ where: { organizationId } });

    if (periodCount === 0) {
      return;
    }

    const period = await executor.fiscalPeriod.findFirst({
      where: {
        organizationId,
        startsOn: { lte: endOfDay(date) },
        endsOn: { gte: startOfDay(date) },
      },
      orderBy: { startsOn: "asc" },
    });

    if (!period) {
      throw new BadRequestException("Posting date does not fall in an open fiscal period.");
    }

    if (period.status === FiscalPeriodStatus.CLOSED) {
      throw new BadRequestException("Posting date falls in a closed fiscal period.");
    }

    if (period.status === FiscalPeriodStatus.LOCKED) {
      throw new BadRequestException("Posting date falls in a locked fiscal period.");
    }
  }
}

function toDate(value: string | Date): Date {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException("Posting date is invalid.");
  }
  return date;
}

function startOfDay(value: Date): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate(), 0, 0, 0, 0));
}

function endOfDay(value: Date): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate(), 23, 59, 59, 999));
}
