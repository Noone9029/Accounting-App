import { Injectable } from "@nestjs/common";
import { NumberSequenceScope, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

type PrismaExecutor = PrismaService | Prisma.TransactionClient;

@Injectable()
export class NumberSequenceService {
  constructor(private readonly prisma: PrismaService) {}

  async next(organizationId: string, scope: NumberSequenceScope, executor: PrismaExecutor = this.prisma): Promise<string> {
    const sequence = await executor.numberSequence.upsert({
      where: { organizationId_scope: { organizationId, scope } },
      create: {
        organizationId,
        scope,
        prefix: `${scope}-`,
        nextNumber: 2,
        padding: 6,
      },
      update: {
        nextNumber: { increment: 1 },
      },
    });

    const issuedNumber = sequence.nextNumber - 1;
    return `${sequence.prefix}${String(issuedNumber).padStart(sequence.padding, "0")}`;
  }
}
