import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type { Request } from "express";
import { PrismaService } from "../prisma/prisma.service";
import { standardizeAuditAction } from "./audit-events";
import { sanitizeAuditMetadata } from "./audit-sanitize";

export interface AuditLogInput {
  organizationId: string;
  actorUserId?: string;
  action: string;
  entityType: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
  request?: Request;
}

export interface AuditLogListQuery {
  action?: string;
  entityType?: string;
  entityId?: string;
  actorUserId?: string;
  from?: string;
  to?: string;
  search?: string;
  limit?: string | number;
  page?: string | number;
}

@Injectable()
export class AuditLogService {
  constructor(private readonly prisma: PrismaService) {}

  async log(input: AuditLogInput): Promise<void> {
    const action = standardizeAuditAction(input.action, input.entityType);
    await this.prisma.auditLog.create({
      data: {
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        action,
        entityType: input.entityType,
        entityId: input.entityId,
        before: input.before === undefined ? undefined : this.toJson(sanitizeAuditMetadata(input.before)),
        after: input.after === undefined ? undefined : this.toJson(sanitizeAuditMetadata(input.after)),
        ipAddress: input.request?.ip,
        userAgent: input.request?.headers["user-agent"],
      },
    });
  }

  async list(organizationId: string, query: AuditLogListQuery = {}) {
    const pagination = this.readPagination(query);
    const where = this.toWhere(organizationId, query);
    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
        include: {
          actorUser: { select: { id: true, name: true, email: true } },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data: data.map((log) => this.toResponse(log)),
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        hasMore: pagination.page * pagination.limit < total,
      },
    };
  }

  async get(organizationId: string, id: string) {
    const log = await this.prisma.auditLog.findFirst({
      where: { id, organizationId },
      include: {
        actorUser: { select: { id: true, name: true, email: true } },
      },
    });

    if (!log) {
      throw new NotFoundException("Audit log not found.");
    }

    return this.toResponse(log);
  }

  private toJson(value: unknown): object {
    return JSON.parse(JSON.stringify(value)) as object;
  }

  private toWhere(organizationId: string, query: AuditLogListQuery): Prisma.AuditLogWhereInput {
    const where: Prisma.AuditLogWhereInput = {
      organizationId,
      ...(query.action ? { action: query.action.trim() } : {}),
      ...(query.entityType ? { entityType: query.entityType.trim() } : {}),
      ...(query.entityId ? { entityId: query.entityId.trim() } : {}),
      ...(query.actorUserId ? { actorUserId: query.actorUserId.trim() } : {}),
    };

    const createdAt: Prisma.DateTimeFilter = {};
    const from = this.parseDate(query.from);
    if (from) {
      createdAt.gte = from;
    }
    const to = this.parseDate(query.to);
    if (to) {
      createdAt.lte = to;
    }
    if (createdAt.gte || createdAt.lte) {
      where.createdAt = createdAt;
    }

    const search = query.search?.trim();
    if (search) {
      where.OR = [
        { action: { contains: search, mode: "insensitive" } },
        { entityType: { contains: search, mode: "insensitive" } },
        { entityId: { contains: search, mode: "insensitive" } },
        { actorUser: { is: { name: { contains: search, mode: "insensitive" } } } },
        { actorUser: { is: { email: { contains: search, mode: "insensitive" } } } },
      ];
    }

    return where;
  }

  private readPagination(query: AuditLogListQuery): { limit: number; page: number } {
    const rawLimit = Number(query.limit ?? 100);
    const rawPage = Number(query.page ?? 1);
    return {
      limit: Number.isFinite(rawLimit) ? Math.min(Math.max(Math.trunc(rawLimit), 1), 200) : 100,
      page: Number.isFinite(rawPage) ? Math.max(Math.trunc(rawPage), 1) : 1,
    };
  }

  private parseDate(value?: string): Date | undefined {
    if (!value) {
      return undefined;
    }
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  }

  private toResponse<T extends { before: unknown; after: unknown }>(log: T): T {
    return {
      ...log,
      before: sanitizeAuditMetadata(log.before),
      after: sanitizeAuditMetadata(log.after),
    };
  }
}
