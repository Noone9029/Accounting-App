import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type { Request } from "express";
import { PrismaService } from "../prisma/prisma.service";
import { AUDIT_ENTITY_TYPES } from "./audit-events";
import { standardizeAuditAction } from "./audit-events";
import { sanitizeAuditMetadata } from "./audit-sanitize";

const DEFAULT_RETENTION_DAYS = 2555;
const MIN_RETENTION_DAYS = 365;
const MAX_RETENTION_DAYS = 3650;
const AUTO_PURGE_WARNING = "Automatic purge execution is not implemented yet.";
const DRY_RUN_WARNING = "No audit logs are deleted by retention preview or dry-run endpoints.";
const CSV_RISKY_KEY_FRAGMENTS = [
  "password",
  "passwordhash",
  "token",
  "tokenhash",
  "secret",
  "apikey",
  "accesskey",
  "privatekey",
  "authorization",
  "base64",
  "contentbase64",
  "database_url",
  "direct_url",
  "smtp_password",
  "jwt_secret",
];

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

export interface AuditLogRetentionSettingsPatch {
  retentionDays?: number;
  autoPurgeEnabled?: boolean;
  exportBeforePurgeRequired?: boolean;
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

  async exportCsv(organizationId: string, query: AuditLogListQuery = {}) {
    const where = this.toWhere(organizationId, query);
    const logs = await this.prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        actorUser: { select: { id: true, name: true, email: true } },
      },
    });

    const rows = logs.map((log) => {
      const sanitized = this.toResponse(log);
      return [
        sanitized.createdAt.toISOString(),
        sanitized.actorUserId ?? "",
        sanitized.actorUser?.email ?? "",
        sanitized.actorUser?.name ?? "",
        sanitized.action,
        sanitized.entityType,
        sanitized.entityId,
        this.summarizeMetadata(sanitized.after, sanitized.before),
        JSON.stringify({
          before: this.sanitizeMetadataForCsv(sanitized.before) ?? null,
          after: this.sanitizeMetadataForCsv(sanitized.after) ?? null,
        }),
      ];
    });
    const headers = ["timestamp", "actorUserId", "actorEmail", "actorName", "action", "entityType", "entityId", "summary", "metadataJson"];
    const csv = [headers, ...rows].map((row) => row.map((value) => this.escapeCsv(value)).join(",")).join("\n");

    return {
      filename: `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`,
      csv: `${csv}\n`,
    };
  }

  async getRetentionSettings(organizationId: string) {
    const settings =
      (await this.prisma.auditLogRetentionSettings.findUnique({
        where: { organizationId },
        include: { updatedBy: { select: { id: true, name: true, email: true } } },
      })) ??
      (await this.prisma.auditLogRetentionSettings.create({
        data: {
          organizationId,
          retentionDays: DEFAULT_RETENTION_DAYS,
          autoPurgeEnabled: false,
          exportBeforePurgeRequired: true,
        },
        include: { updatedBy: { select: { id: true, name: true, email: true } } },
      }));

    return this.toRetentionSettingsResponse(settings);
  }

  async updateRetentionSettings(organizationId: string, actorUserId: string, patch: AuditLogRetentionSettingsPatch) {
    const before = await this.getRetentionSettings(organizationId);
    const data: Prisma.AuditLogRetentionSettingsUpdateInput = {
      updatedBy: { connect: { id: actorUserId } },
    };

    if (patch.retentionDays !== undefined) {
      const retentionDays = Number(patch.retentionDays);
      if (!Number.isInteger(retentionDays) || retentionDays < MIN_RETENTION_DAYS || retentionDays > MAX_RETENTION_DAYS) {
        throw new BadRequestException(`retentionDays must be an integer between ${MIN_RETENTION_DAYS} and ${MAX_RETENTION_DAYS}.`);
      }
      data.retentionDays = retentionDays;
    }

    if (patch.autoPurgeEnabled !== undefined) {
      data.autoPurgeEnabled = this.readBoolean(patch.autoPurgeEnabled, "autoPurgeEnabled");
    }

    if (patch.exportBeforePurgeRequired !== undefined) {
      data.exportBeforePurgeRequired = this.readBoolean(patch.exportBeforePurgeRequired, "exportBeforePurgeRequired");
    }

    const updated = await this.prisma.auditLogRetentionSettings.update({
      where: { organizationId },
      data,
      include: { updatedBy: { select: { id: true, name: true, email: true } } },
    });
    const response = this.toRetentionSettingsResponse(updated);

    await this.log({
      organizationId,
      actorUserId,
      action: "UPDATE",
      entityType: AUDIT_ENTITY_TYPES.AUDIT_LOG_RETENTION_SETTINGS,
      entityId: updated.id,
      before,
      after: response,
    });

    return response;
  }

  async retentionPreview(organizationId: string) {
    const settings = await this.getRetentionSettings(organizationId);
    const cutoffDate = new Date();
    cutoffDate.setUTCDate(cutoffDate.getUTCDate() - settings.retentionDays);

    const [totalAuditLogs, logsOlderThanCutoff, dateBounds] = await Promise.all([
      this.prisma.auditLog.count({ where: { organizationId } }),
      this.prisma.auditLog.count({ where: { organizationId, createdAt: { lt: cutoffDate } } }),
      this.prisma.auditLog.aggregate({
        where: { organizationId },
        _min: { createdAt: true },
        _max: { createdAt: true },
      }),
    ]);

    return {
      retentionDays: settings.retentionDays,
      cutoffDate: cutoffDate.toISOString(),
      totalAuditLogs,
      logsOlderThanCutoff,
      oldestLogDate: dateBounds._min.createdAt?.toISOString() ?? null,
      newestLogDate: dateBounds._max.createdAt?.toISOString() ?? null,
      autoPurgeEnabled: settings.autoPurgeEnabled,
      exportBeforePurgeRequired: settings.exportBeforePurgeRequired,
      dryRunOnly: true,
      warnings: [DRY_RUN_WARNING, ...(settings.autoPurgeEnabled ? [AUTO_PURGE_WARNING] : [])],
    };
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

  private toRetentionSettingsResponse<
    T extends {
      id: string;
      organizationId: string;
      retentionDays: number;
      autoPurgeEnabled: boolean;
      exportBeforePurgeRequired: boolean;
      updatedById: string | null;
      createdAt: Date;
      updatedAt: Date;
      updatedBy?: { id: string; name: string; email: string } | null;
    },
  >(settings: T) {
    return {
      id: settings.id,
      organizationId: settings.organizationId,
      retentionDays: settings.retentionDays,
      autoPurgeEnabled: settings.autoPurgeEnabled,
      exportBeforePurgeRequired: settings.exportBeforePurgeRequired,
      updatedById: settings.updatedById,
      updatedBy: settings.updatedBy ?? null,
      createdAt: settings.createdAt.toISOString(),
      updatedAt: settings.updatedAt.toISOString(),
      warnings: settings.autoPurgeEnabled ? [AUTO_PURGE_WARNING] : [],
    };
  }

  private readBoolean(value: unknown, label: string): boolean {
    if (typeof value !== "boolean") {
      throw new BadRequestException(`${label} must be a boolean.`);
    }
    return value;
  }

  private summarizeMetadata(after: unknown, before: unknown): string {
    const source = this.isRecord(after) ? after : this.isRecord(before) ? before : {};
    const reference = [
      "invoiceNumber",
      "billNumber",
      "paymentNumber",
      "creditNoteNumber",
      "debitNoteNumber",
      "refundNumber",
      "purchaseOrderNumber",
      "expenseNumber",
      "receiptNumber",
      "issueNumber",
      "proposalNumber",
      "entryNumber",
      "filename",
      "name",
      "email",
    ]
      .map((key) => source[key])
      .find((value): value is string => typeof value === "string" && value.trim().length > 0);

    return reference ?? "No reference captured";
  }

  private escapeCsv(value: unknown): string {
    const text = value === null || value === undefined ? "" : String(value);
    return `"${text.replace(/"/g, '""')}"`;
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
  }

  private sanitizeMetadataForCsv(value: unknown): unknown {
    if (Array.isArray(value)) {
      return value.map((item) => this.sanitizeMetadataForCsv(item));
    }

    if (!this.isRecord(value)) {
      return value;
    }

    return Object.fromEntries(
      Object.entries(value).map(([key, entry], index) => {
        if (this.isRiskyCsvKey(key)) {
          return [`redactedField${index + 1}`, "[REDACTED]"];
        }
        return [key, this.sanitizeMetadataForCsv(entry)];
      }),
    );
  }

  private isRiskyCsvKey(key: string): boolean {
    const normalized = key.toLowerCase();
    return CSV_RISKY_KEY_FRAGMENTS.some((fragment) => normalized.includes(fragment));
  }
}
