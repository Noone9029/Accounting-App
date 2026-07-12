import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import {
  Prisma,
  RecurringRunStatus,
  RecurringRunTrigger,
  RecurringTransactionStatus,
} from "@prisma/client";
import { AuditLogService } from "../audit-log/audit-log.service";
import { AUDIT_ENTITY_TYPES } from "../audit-log/audit-events";
import { FiscalPeriodGuardService } from "../fiscal-periods/fiscal-period-guard.service";
import { PrismaService } from "../prisma/prisma.service";
import { RecurringGenerationDispatcher } from "./recurring-generation.dispatcher";
import { canonicalOccurrence, localDateForInstant, resolveDueOccurrences, type RecurringSchedule } from "./recurring-schedule";

const runInclude = {
  template: {
    include: {
      lines: { orderBy: { sortOrder: "asc" as const } },
      party: { select: { id: true, type: true, isActive: true } },
      branch: { select: { id: true, name: true } },
      rateSnapshot: true,
    },
  },
  generatedSalesInvoice: { select: { id: true, invoiceNumber: true, status: true } },
  generatedPurchaseBill: { select: { id: true, billNumber: true, status: true } },
  generatedJournalEntry: { select: { id: true, entryNumber: true, status: true } },
  generatedExpenseProposal: { select: { id: true, status: true } },
} satisfies Prisma.RecurringTransactionRunInclude;

interface ProcessDueInput {
  workerClaimId: string;
  limit: number;
  now?: Date;
}

type RunWithTemplate = Prisma.RecurringTransactionRunGetPayload<{ include: typeof runInclude }>;

@Injectable()
export class RecurringRunService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
    private readonly dispatcher: RecurringGenerationDispatcher,
    private readonly fiscalPeriodGuard: FiscalPeriodGuardService,
  ) {}

  async listForTemplate(organizationId: string, templateId: string, query: { page?: number; limit?: number } = {}) {
    const page = this.page(query.page);
    const limit = this.limit(query.limit ?? 25);
    const where = { organizationId, templateId };
    const [items, total] = await Promise.all([
      this.prisma.recurringTransactionRun.findMany({
        where,
        include: runInclude,
        orderBy: { scheduledFor: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.recurringTransactionRun.count({ where }),
    ]);
    return { items, page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) };
  }

  async get(organizationId: string, runId: string) {
    const run = await this.prisma.recurringTransactionRun.findFirst({ where: { id: runId, organizationId }, include: runInclude });
    if (!run) throw new NotFoundException("Recurring transaction run not found.");
    return run;
  }

  async runNow(organizationId: string, actorUserId: string, templateId: string, idempotencyKey: string, requestId?: string) {
    const key = this.idempotencyKey(idempotencyKey);
    const existing = await this.prisma.recurringTransactionRun.findFirst({ where: { organizationId, idempotencyKey: key }, include: runInclude });
    if (existing) {
      if (existing.status === RecurringRunStatus.PENDING || existing.status === RecurringRunStatus.CLAIMED) {
        return this.execute(existing, actorUserId);
      }
      return existing;
    }

    let run: RunWithTemplate;
    try {
      run = await this.withSerializationRetry(() => this.prisma.$transaction(async (tx) => {
        const duplicate = await tx.recurringTransactionRun.findFirst({ where: { organizationId, idempotencyKey: key }, include: runInclude });
        if (duplicate) return duplicate;
        const template = await tx.recurringTransactionTemplate.findFirst({ where: { id: templateId, organizationId }, include: runInclude.template.include });
        if (!template) throw new NotFoundException("Recurring transaction template not found.");
        if (template.status !== RecurringTransactionStatus.ACTIVE) throw new BadRequestException("Only active recurring templates can run.");
        const now = new Date();
        const localDate = localDateForInstant(now, template.timezone);
        const created = await tx.recurringTransactionRun.create({
          data: {
            organizationId,
            templateId,
            templateVersion: template.templateVersion,
            scheduledFor: now,
            scheduledLocalDate: this.dateOnly(localDate),
            timezone: template.timezone,
            trigger: RecurringRunTrigger.MANUAL,
            status: RecurringRunStatus.PENDING,
            attemptCount: 0,
            idempotencyKey: key,
            requestId: requestId?.trim() || null,
            sourceSnapshot: this.sourceSnapshot(template),
          },
          include: runInclude,
        });
        await this.auditLog.log({ organizationId, actorUserId, action: "REQUEST_MANUAL", entityType: AUDIT_ENTITY_TYPES.RECURRING_TRANSACTION_RUN, entityId: created.id, request: { requestId } as any, after: this.runAudit(created) }, tx);
        return created;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }));
    } catch (error) {
      if (!this.isUniqueConflict(error)) throw error;
      const duplicate = await this.prisma.recurringTransactionRun.findFirst({ where: { organizationId, idempotencyKey: key }, include: runInclude });
      if (!duplicate) throw new ConflictException("Recurring run was claimed concurrently. Retry with the same idempotency key.");
      run = duplicate;
    }
    if (run.status === RecurringRunStatus.GENERATED) return run;
    return this.execute(run, actorUserId);
  }

  async processDue(input: ProcessDueInput) {
    const workerClaimId = input.workerClaimId?.trim();
    if (!workerClaimId) throw new BadRequestException("Worker claim ID is required.");
    const limit = this.limit(input.limit);
    const now = input.now ?? new Date();
    const templateIds = await this.prisma.$transaction(async (tx) => {
      return tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
        SELECT "id"
        FROM "RecurringTransactionTemplate"
        WHERE "status" = 'ACTIVE'::"RecurringTransactionStatus"
          AND "nextRunAt" <= ${now}
        ORDER BY "nextRunAt" ASC
        LIMIT ${limit}
        FOR UPDATE SKIP LOCKED
      `);
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    const prepared: RunWithTemplate[] = [];
    for (const row of templateIds) {
      prepared.push(...await this.prepareScheduled(row.id, workerClaimId, now, limit));
    }
    const results = [];
    for (const run of prepared) results.push(await this.execute(run, null));
    return { claimedTemplates: templateIds.length, preparedRuns: prepared.length, results };
  }

  private async prepareScheduled(templateId: string, workerClaimId: string, now: Date, limit: number): Promise<RunWithTemplate[]> {
    return this.withSerializationRetry(() => this.prisma.$transaction(async (tx) => {
      const template = await tx.recurringTransactionTemplate.findFirst({ where: { id: templateId, status: RecurringTransactionStatus.ACTIVE }, include: runInclude.template.include });
      if (!template || template.nextRunAt > now) return [];
      const schedule = this.schedule(template);
      const resolution = resolveDueOccurrences({ schedule, nextLocalDate: localDateForInstant(template.nextRunAt, template.timezone), now, catchUpPolicy: template.catchUpPolicy, limit });

      for (const skippedLocalDate of resolution.skippedLocalDates) {
        const occurrence = canonicalOccurrence(skippedLocalDate, template.timezone);
        const skipped = await tx.recurringTransactionRun.create({ data: { organizationId: template.organizationId, templateId: template.id, templateVersion: template.templateVersion, scheduledFor: occurrence.scheduledFor, scheduledLocalDate: this.dateOnly(skippedLocalDate), timezone: template.timezone, trigger: RecurringRunTrigger.SCHEDULED, status: RecurringRunStatus.SKIPPED, attemptCount: 0, idempotencyKey: this.scheduledKey(template.id, occurrence.scheduledFor), workerClaimId, failureCode: "MISSED_OCCURRENCE_SKIPPED", failureMessageSafe: "Missed occurrence skipped by template policy.", sourceSnapshot: this.sourceSnapshot(template), completedAt: new Date() }, include: runInclude });
        await this.auditLog.log({ organizationId: template.organizationId, action: "SKIP", entityType: AUDIT_ENTITY_TYPES.RECURRING_TRANSACTION_RUN, entityId: skipped.id, after: this.runAudit(skipped) }, tx);
      }
      const pending: RunWithTemplate[] = [];
      for (const occurrence of resolution.occurrences) {
        const run = await tx.recurringTransactionRun.create({ data: { organizationId: template.organizationId, templateId: template.id, templateVersion: template.templateVersion, scheduledFor: occurrence.scheduledFor, scheduledLocalDate: this.dateOnly(occurrence.localDate), timezone: template.timezone, trigger: RecurringRunTrigger.SCHEDULED, status: RecurringRunStatus.PENDING, attemptCount: 0, idempotencyKey: this.scheduledKey(template.id, occurrence.scheduledFor), workerClaimId, sourceSnapshot: this.sourceSnapshot(template) }, include: runInclude });
        pending.push(run);
      }
      const nextRunAt = resolution.nextLocalDate ? canonicalOccurrence(resolution.nextLocalDate, template.timezone).scheduledFor : template.nextRunAt;
      await tx.recurringTransactionTemplate.update({ where: { id: template.id }, data: { nextRunAt, status: resolution.nextLocalDate ? undefined : RecurringTransactionStatus.COMPLETED } });
      return pending;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }));
  }

  private async execute(run: RunWithTemplate, actorUserId: string | null) {
    try {
      return await this.withSerializationRetry(() => this.prisma.$transaction(async (tx) => {
        await tx.recurringTransactionRun.update({ where: { id: run.id }, data: { status: RecurringRunStatus.CLAIMED, startedAt: new Date(), attemptCount: { increment: 1 } } });
        await this.auditLog.log({ organizationId: run.organizationId, actorUserId: actorUserId ?? undefined, action: "CLAIM", entityType: AUDIT_ENTITY_TYPES.RECURRING_TRANSACTION_RUN, entityId: run.id, after: { workerClaimId: run.workerClaimId, attemptCount: run.attemptCount + 1 } }, tx);
        await this.fiscalPeriodGuard.assertPostingDateAllowed(run.organizationId, run.scheduledLocalDate, tx);
        const target = await this.dispatcher.generate(run.template.transactionType, { organizationId: run.organizationId, runId: run.id, templateId: run.templateId, templateVersion: run.templateVersion, scheduledFor: run.scheduledFor, scheduledLocalDate: run.scheduledLocalDate, actorUserId, requestId: run.requestId, template: run.template }, tx);
        const generated = await tx.recurringTransactionRun.update({ where: { id: run.id }, data: { status: RecurringRunStatus.GENERATED, ...target.link, completedAt: new Date(), failureCode: null, failureMessageSafe: null, failureRetriable: false }, include: runInclude });
        await this.auditLog.log({ organizationId: run.organizationId, actorUserId: actorUserId ?? undefined, action: "GENERATE", entityType: AUDIT_ENTITY_TYPES.RECURRING_TRANSACTION_RUN, entityId: run.id, after: { ...this.runAudit(generated), generatedEntityType: target.generatedEntityType, generatedEntityId: target.generatedEntityId } }, tx);
        await this.auditLog.log({ organizationId: run.organizationId, actorUserId: actorUserId ?? undefined, action: "LINK_TARGET", entityType: AUDIT_ENTITY_TYPES.RECURRING_TRANSACTION_RUN, entityId: run.id, after: { generatedEntityType: target.generatedEntityType, generatedEntityId: target.generatedEntityId } }, tx);
        return generated;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }));
    } catch (error) {
      const failure = this.failure(error);
      return this.prisma.$transaction(async (tx) => {
        const failed = await tx.recurringTransactionRun.update({ where: { id: run.id }, data: { status: failure.status, completedAt: new Date(), failureCode: failure.code, failureMessageSafe: failure.message, failureRetriable: failure.retriable }, include: runInclude });
        await this.auditLog.log({ organizationId: run.organizationId, actorUserId: actorUserId ?? undefined, action: failure.status === RecurringRunStatus.BLOCKED ? "BLOCK" : "FAIL", entityType: AUDIT_ENTITY_TYPES.RECURRING_TRANSACTION_RUN, entityId: run.id, after: this.runAudit(failed) }, tx);
        return failed;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    }
  }

  private failure(error: unknown) {
    if (error instanceof BadRequestException && /fiscal period|locked period|closed period/i.test(error.message)) return { status: RecurringRunStatus.BLOCKED, code: "FISCAL_PERIOD_BLOCKED", message: error.message, retriable: false };
    const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
    if (/^P(?:1001|1002|1017|2024|2034)$/.test(code)) return { status: RecurringRunStatus.FAILED, code: "GENERATION_RETRIABLE", message: "Draft generation failed and can be retried.", retriable: true };
    if (error instanceof BadRequestException) return { status: RecurringRunStatus.BLOCKED, code: "GENERATION_BLOCKED", message: error.message, retriable: false };
    return { status: RecurringRunStatus.FAILED, code: "GENERATION_FAILED", message: "Draft generation failed. Review the template and retry.", retriable: false };
  }

  private async withSerializationRetry<T>(work: () => Promise<T>): Promise<T> {
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try { return await work(); } catch (error) {
        if (!this.isSerializationConflict(error)) throw error;
        if (attempt === 3) throw new ConflictException("Recurring transaction changed concurrently. Retry the request.");
      }
    }
    throw new ConflictException("Recurring transaction changed concurrently. Retry the request.");
  }

  private schedule(template: RunWithTemplate["template"]): RecurringSchedule { return { timeZone: template.timezone, frequency: template.frequency, interval: template.interval, anchorDate: template.startDate.toISOString().slice(0, 10), endDate: template.endDate?.toISOString().slice(0, 10) ?? null, dayOfMonth: template.dayOfMonth, dayOfWeek: template.dayOfWeek, monthOfYear: template.monthOfYear }; }
  private sourceSnapshot(template: any): Prisma.InputJsonObject { return JSON.parse(JSON.stringify({ templateId: template.id, templateVersion: template.templateVersion, transactionType: template.transactionType, timezone: template.timezone, frequency: template.frequency, interval: template.interval, currencyCode: template.currencyCode, exchangeRatePolicy: template.exchangeRatePolicy, lineCount: Array.isArray(template.lines) ? template.lines.length : 0 })) as Prisma.InputJsonObject; }
  private runAudit(run: any) { return { id: run.id, templateId: run.templateId, templateVersion: run.templateVersion, scheduledFor: run.scheduledFor, scheduledLocalDate: run.scheduledLocalDate, trigger: run.trigger, status: run.status, attemptCount: run.attemptCount, failureCode: run.failureCode, failureMessageSafe: run.failureMessageSafe, failureRetriable: run.failureRetriable }; }
  private idempotencyKey(value: string): string { const key = value?.trim(); if (!key || key.length > 200) throw new BadRequestException("Idempotency key is required and must be 200 characters or fewer."); return key; }
  private limit(value: number): number { if (!Number.isInteger(value) || value < 1 || value > 100) throw new BadRequestException("Recurring worker limit must be between 1 and 100."); return value; }
  private page(value?: number): number { return Number.isInteger(value) && value! > 0 ? value! : 1; }
  private scheduledKey(templateId: string, scheduledFor: Date) { return `scheduled:${templateId}:${scheduledFor.toISOString()}`; }
  private dateOnly(localDate: string) { return new Date(`${localDate}T00:00:00.000Z`); }
  private isSerializationConflict(error: unknown): boolean { return typeof error === "object" && error !== null && "code" in error && error.code === "P2034"; }
  private isUniqueConflict(error: unknown): boolean { return typeof error === "object" && error !== null && "code" in error && error.code === "P2002"; }
}
