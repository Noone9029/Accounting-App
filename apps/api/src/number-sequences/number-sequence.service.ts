import { BadRequestException, Injectable, NotFoundException, Optional } from "@nestjs/common";
import { NumberSequenceScope, Prisma } from "@prisma/client";
import { AuditLogService } from "../audit-log/audit-log.service";
import { AUDIT_ENTITY_TYPES } from "../audit-log/audit-events";
import { PrismaService } from "../prisma/prisma.service";

type PrismaExecutor = PrismaService | Prisma.TransactionClient;

const PREFIX_PATTERN = /^[A-Z0-9/-]+$/;
const MAX_PREFIX_LENGTH = 12;
const MIN_PADDING = 3;
const MAX_PADDING = 10;

export interface NumberSequenceUpdateInput {
  prefix?: string;
  nextNumber?: number;
  padding?: number;
}

@Injectable()
export class NumberSequenceService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly auditLogService?: AuditLogService,
  ) {}

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
    return formatSequenceExample(sequence.prefix, issuedNumber, sequence.padding);
  }

  async list(organizationId: string) {
    const sequences = await this.prisma.numberSequence.findMany({
      where: { organizationId },
      orderBy: { scope: "asc" },
    });

    return sequences.map((sequence) => this.toResponse(sequence));
  }

  async get(organizationId: string, id: string) {
    const sequence = await this.findForOrganization(organizationId, id);
    return this.toResponse(sequence);
  }

  async update(organizationId: string, actorUserId: string, id: string, input: NumberSequenceUpdateInput) {
    const before = await this.findForOrganization(organizationId, id);
    const data = this.toUpdateData(input, before);

    const updated = await this.prisma.numberSequence.update({
      where: { id: before.id },
      data,
    });

    await this.auditLogService?.log({
      organizationId,
      actorUserId,
      action: "UPDATE",
      entityType: AUDIT_ENTITY_TYPES.NUMBER_SEQUENCE,
      entityId: updated.id,
      before: {
        scope: before.scope,
        prefix: before.prefix,
        nextNumber: before.nextNumber,
        padding: before.padding,
        exampleNextNumber: formatSequenceExample(before.prefix, before.nextNumber, before.padding),
      },
      after: {
        scope: updated.scope,
        prefix: updated.prefix,
        nextNumber: updated.nextNumber,
        padding: updated.padding,
        exampleNextNumber: formatSequenceExample(updated.prefix, updated.nextNumber, updated.padding),
      },
    });

    return this.toResponse(updated);
  }

  private async findForOrganization(organizationId: string, id: string) {
    const sequence = await this.prisma.numberSequence.findFirst({
      where: { id, organizationId },
    });

    if (!sequence) {
      throw new NotFoundException("Number sequence not found.");
    }

    return sequence;
  }

  private toUpdateData(input: NumberSequenceUpdateInput, current: { prefix: string; nextNumber: number; padding: number }) {
    const data: Prisma.NumberSequenceUpdateInput = {};

    if (Object.prototype.hasOwnProperty.call(input, "prefix")) {
      data.prefix = this.cleanPrefix(input.prefix);
    }

    if (Object.prototype.hasOwnProperty.call(input, "padding")) {
      data.padding = this.cleanPadding(input.padding);
    }

    if (Object.prototype.hasOwnProperty.call(input, "nextNumber")) {
      data.nextNumber = this.cleanNextNumber(input.nextNumber, current.nextNumber);
    }

    return data;
  }

  private cleanPrefix(value: unknown): string {
    if (typeof value !== "string") {
      throw new BadRequestException("Prefix must be a string.");
    }
    const prefix = value.trim();
    if (!prefix) {
      throw new BadRequestException("Prefix cannot be blank.");
    }
    if (prefix.length > MAX_PREFIX_LENGTH) {
      throw new BadRequestException(`Prefix must be ${MAX_PREFIX_LENGTH} characters or fewer.`);
    }
    if (!PREFIX_PATTERN.test(prefix)) {
      throw new BadRequestException("Prefix can only contain uppercase letters, numbers, dash, and slash.");
    }
    return prefix;
  }

  private cleanPadding(value: unknown): number {
    if (typeof value !== "number" || !Number.isInteger(value)) {
      throw new BadRequestException("Padding must be an integer.");
    }
    if (value < MIN_PADDING || value > MAX_PADDING) {
      throw new BadRequestException(`Padding must be between ${MIN_PADDING} and ${MAX_PADDING}.`);
    }
    return value;
  }

  private cleanNextNumber(value: unknown, currentNextNumber: number): number {
    if (typeof value !== "number" || !Number.isInteger(value)) {
      throw new BadRequestException("Next number must be an integer.");
    }
    if (value < 1) {
      throw new BadRequestException("Next number must be positive.");
    }
    if (value < currentNextNumber) {
      throw new BadRequestException("Next number cannot be lowered because that could create duplicate document numbers.");
    }
    return value;
  }

  private toResponse(sequence: { id: string; scope: NumberSequenceScope; prefix: string; nextNumber: number; padding: number; updatedAt: Date }) {
    return {
      id: sequence.id,
      scope: sequence.scope,
      prefix: sequence.prefix,
      nextNumber: sequence.nextNumber,
      padding: sequence.padding,
      exampleNextNumber: formatSequenceExample(sequence.prefix, sequence.nextNumber, sequence.padding),
      updatedAt: sequence.updatedAt,
    };
  }
}

export function formatSequenceExample(prefix: string, nextNumber: number, padding: number): string {
  return `${prefix}${String(nextNumber).padStart(padding, "0")}`;
}
