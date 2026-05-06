import { Injectable } from "@nestjs/common";
import type { Request } from "express";
import { PrismaService } from "../prisma/prisma.service";

interface AuditLogInput {
  organizationId: string;
  actorUserId?: string;
  action: string;
  entityType: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
  request?: Request;
}

@Injectable()
export class AuditLogService {
  constructor(private readonly prisma: PrismaService) {}

  async log(input: AuditLogInput): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        before: input.before === undefined ? undefined : this.toJson(input.before),
        after: input.after === undefined ? undefined : this.toJson(input.after),
        ipAddress: input.request?.ip,
        userAgent: input.request?.headers["user-agent"],
      },
    });
  }

  list(organizationId: string) {
    return this.prisma.auditLog.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
  }

  private toJson(value: unknown): object {
    return JSON.parse(JSON.stringify(value)) as object;
  }
}
