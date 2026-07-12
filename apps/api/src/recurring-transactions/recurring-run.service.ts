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
  generatedExpenseProposal: {
    select: {
      id: true, status: true, proposedDate: true, currency: true, baseCurrency: true, exchangeRate: true,
      rateDate: true, rateSource: true, rateSnapshotId: true, subtotal: true, discountTotal: true, taxableTotal: true, taxTotal: true, total: true,
      paidThroughAccount: { select: { id: true, code: true, name: true } },
      reviewedCashExpense: { select: { id: true, expenseNumber: true, status: true } },
      lines: { orderBy: { sortOrder: "asc" as const }, select: { id: true, description: true, quantity: true, unitPrice: true, discountRate: true, lineGrossAmount: true, discountAmount: true, taxableAmount: true, taxAmount: true, lineTotal: true, sortOrder: true, account: { select: { id: true, code: true, name: true } }, costCenter: { select: { id: true, code: true, name: true } }, project: { select: { id: true, code: true, name: true } } } },
    },
  },
} satisfies Prisma.RecurringTransactionRunInclude;

const MAX_RUN_ATTEMPTS = 5;
const RETRY_BASE_DELAY_MS = 60_000;

class RetriableRecurringConflictException extends ConflictException {}

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

  async runNow(organizationId: string, actorUserId: string, templateId: string, idempotencyKey: string, requestId?: string, occurrence?: Date) {
    const key = this.idempotencyKey(idempotencyKey);
    const existing = await this.prisma.recurringTransactionRun.findFirst({ where: { organizationId, idempotencyKey: key }, include: runInclude });
    if (existing) {
      if (existing.templateId !== templateId) throw new ConflictException("Idempotency key was already used for another recurring template.");
      if (existing.status === RecurringRunStatus.PENDING || existing.status === RecurringRunStatus.CLAIMED || existing.status === RecurringRunStatus.BLOCKED || (existing.status === RecurringRunStatus.FAILED && existing.failureRetriable)) {
        if (existing.template.status !== RecurringTransactionStatus.ACTIVE) throw new BadRequestException("Only active recurring templates can run.");
        return this.execute(existing, actorUserId);
      }
      return existing;
    }

    let run: RunWithTemplate;
    try {
      run = await this.withSerializationRetry(() => this.prisma.$transaction(async (tx) => {
        const duplicate = await tx.recurringTransactionRun.findFirst({ where: { organizationId, idempotencyKey: key }, include: runInclude });
        if (duplicate) {
          if (duplicate.templateId !== templateId) throw new ConflictException("Idempotency key was already used for another recurring template.");
          return duplicate;
        }
        const template = await tx.recurringTransactionTemplate.findFirst({ where: { id: templateId, organizationId }, include: runInclude.template.include });
        if (!template) throw new NotFoundException("Recurring transaction template not found.");
        if (template.status !== RecurringTransactionStatus.ACTIVE) throw new BadRequestException("Only active recurring templates can run.");
        const now = occurrence ? new Date(occurrence) : new Date();
        if (Number.isNaN(now.getTime())) throw new BadRequestException("Recurring run occurrence is invalid.");
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
      if (duplicate.templateId !== templateId) throw new ConflictException("Idempotency key was already used for another recurring template.");
      run = duplicate;
    }
    if (run.status === RecurringRunStatus.GENERATED) return run;
    if (run.template.status !== RecurringTransactionStatus.ACTIVE) throw new BadRequestException("Only active recurring templates can run.");
    return this.execute(run, actorUserId);
  }

  async processDue(input: ProcessDueInput) {
    const workerClaimId = input.workerClaimId?.trim();
    if (!workerClaimId) throw new BadRequestException("Worker claim ID is required.");
    const limit = this.limit(input.limit);
    const now = input.now ?? new Date();
    const staleClaimBefore = new Date(now.getTime() - 15 * 60 * 1000);
    const recoverableIds = await this.prisma.$transaction((tx) => tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT "run"."id"
      FROM "RecurringTransactionRun" AS "run"
      JOIN "RecurringTransactionTemplate" AS "template"
        ON "template"."organizationId" = "run"."organizationId"
       AND "template"."id" = "run"."templateId"
      WHERE "template"."status" = 'ACTIVE'::"RecurringTransactionStatus"
        AND (
          "run"."status" = 'PENDING'::"RecurringRunStatus"
          OR ("run"."status" = 'FAILED'::"RecurringRunStatus"
              AND "run"."failureRetriable" = true
              AND "run"."attemptCount" < ${MAX_RUN_ATTEMPTS}
              AND ("run"."nextAttemptAt" IS NULL OR "run"."nextAttemptAt" <= ${now}))
          OR ("run"."status" = 'CLAIMED'::"RecurringRunStatus" AND "run"."startedAt" <= ${staleClaimBefore})
        )
      ORDER BY "run"."createdAt" ASC
      LIMIT ${limit}
      FOR UPDATE SKIP LOCKED
    `), { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    const results = [];
    for (const row of recoverableIds) {
      const recoverable = await this.prisma.recurringTransactionRun.findFirst({ where: { id: row.id }, include: runInclude });
      if (recoverable) results.push(await this.execute(recoverable, null));
    }
    const remaining = limit - results.length;
    const templateIds = remaining > 0 ? await this.prisma.$transaction(async (tx) => {
      return tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
        SELECT "id"
        FROM "RecurringTransactionTemplate"
        WHERE "status" = 'ACTIVE'::"RecurringTransactionStatus"
          AND "nextRunAt" <= ${now}
        ORDER BY "nextRunAt" ASC
        LIMIT ${remaining}
        FOR UPDATE SKIP LOCKED
      `);
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }) : [];

    const prepared: RunWithTemplate[] = [];
    const preparationErrors: Array<{ templateId: string; code: string }> = [];
    for (const row of templateIds) {
      if (prepared.length >= remaining) break;
      try { prepared.push(...await this.prepareScheduled(row.id, workerClaimId, now, remaining - prepared.length)); }
      catch { preparationErrors.push({ templateId: row.id, code: "SCHEDULE_PREPARATION_FAILED" }); }
    }
    for (const run of prepared) results.push(await this.execute(run, null));
    return { recoveredRuns: recoverableIds.length, claimedTemplates: templateIds.length, preparedRuns: prepared.length, preparationErrors, results };
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
        await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "RecurringTransactionRun" WHERE "id" = ${run.id}::uuid AND "organizationId" = ${run.organizationId}::uuid FOR UPDATE`);
        const current = await tx.recurringTransactionRun.findFirst({ where: { id: run.id, organizationId: run.organizationId }, include: runInclude });
        if (!current) throw new NotFoundException("Recurring transaction run not found.");
        if (current.status === RecurringRunStatus.GENERATED || current.status === RecurringRunStatus.SKIPPED || current.status === RecurringRunStatus.CANCELLED || (current.status === RecurringRunStatus.FAILED && !current.failureRetriable)) return current;
        if (current.template.status !== RecurringTransactionStatus.ACTIVE) return current;
        const claim = await tx.recurringTransactionRun.updateMany({ where: { id: current.id, organizationId: current.organizationId, status: { in: [RecurringRunStatus.PENDING, RecurringRunStatus.CLAIMED, RecurringRunStatus.BLOCKED, RecurringRunStatus.FAILED] } }, data: { status: RecurringRunStatus.CLAIMED, startedAt: new Date(), completedAt: null, attemptCount: { increment: 1 }, nextAttemptAt: null, failureCode: null, failureMessageSafe: null } });
        if (claim.count !== 1) throw new ConflictException("Recurring run is already being processed.");
        await this.auditLog.log({ organizationId: current.organizationId, actorUserId: actorUserId ?? undefined, action: current.status === RecurringRunStatus.FAILED || current.status === RecurringRunStatus.BLOCKED ? "RETRY" : "CLAIM", entityType: AUDIT_ENTITY_TYPES.RECURRING_TRANSACTION_RUN, entityId: current.id, after: { workerClaimId: current.workerClaimId, attemptCount: current.attemptCount + 1 } }, tx);
        await this.fiscalPeriodGuard.assertPostingDateAllowed(current.organizationId, current.scheduledLocalDate, tx);
        const snapshot = this.generationTemplate(current);
        const target = await this.dispatcher.generate(snapshot.transactionType, { organizationId: current.organizationId, runId: current.id, templateId: current.templateId, templateVersion: current.templateVersion, scheduledFor: current.scheduledFor, scheduledLocalDate: current.scheduledLocalDate, actorUserId, requestId: current.requestId, template: snapshot }, tx);
        const completedAt = new Date();
        const generated = await tx.recurringTransactionRun.update({ where: { id: current.id }, data: { status: RecurringRunStatus.GENERATED, ...target.link, completedAt, nextAttemptAt: null, failureCode: null, failureMessageSafe: null, failureRetriable: false }, include: runInclude });
        await tx.recurringTransactionTemplate.update({ where: { id: current.templateId }, data: { lastRunAt: completedAt } });
        await this.auditLog.log({ organizationId: current.organizationId, actorUserId: actorUserId ?? undefined, action: "GENERATE", entityType: AUDIT_ENTITY_TYPES.RECURRING_TRANSACTION_RUN, entityId: current.id, after: { ...this.runAudit(generated), generatedEntityType: target.generatedEntityType, generatedEntityId: target.generatedEntityId } }, tx);
        await this.auditLog.log({ organizationId: current.organizationId, actorUserId: actorUserId ?? undefined, action: "LINK_TARGET", entityType: AUDIT_ENTITY_TYPES.RECURRING_TRANSACTION_RUN, entityId: current.id, after: { generatedEntityType: target.generatedEntityType, generatedEntityId: target.generatedEntityId } }, tx);
        return generated;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }));
    } catch (error) {
      const failure = this.failure(error);
      return this.prisma.$transaction(async (tx) => {
        await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "RecurringTransactionRun" WHERE "id" = ${run.id}::uuid AND "organizationId" = ${run.organizationId}::uuid FOR UPDATE`);
        const current = await tx.recurringTransactionRun.findFirst({ where: { id: run.id, organizationId: run.organizationId }, include: runInclude });
        if (!current) throw new NotFoundException("Recurring transaction run not found.");
        if (current.status === RecurringRunStatus.GENERATED || current.status === RecurringRunStatus.SKIPPED || current.status === RecurringRunStatus.CANCELLED) return current;
        const attemptedCount = current.attemptCount + 1;
        const exhausted = failure.retriable && attemptedCount >= MAX_RUN_ATTEMPTS;
        const effectiveFailure = exhausted
          ? { status: RecurringRunStatus.FAILED, code: "GENERATION_RETRY_EXHAUSTED", message: "Draft generation reached the retry limit and requires accountant review.", retriable: false }
          : failure;
        const nextAttemptAt = effectiveFailure.retriable ? new Date(Date.now() + this.retryDelay(attemptedCount)) : null;
        const failed = await tx.recurringTransactionRun.update({ where: { id: run.id }, data: { status: effectiveFailure.status, completedAt: new Date(), attemptCount: { increment: 1 }, nextAttemptAt, failureCode: effectiveFailure.code, failureMessageSafe: effectiveFailure.message, failureRetriable: effectiveFailure.retriable }, include: runInclude });
        await this.auditLog.log({ organizationId: run.organizationId, actorUserId: actorUserId ?? undefined, action: failure.status === RecurringRunStatus.BLOCKED ? "BLOCK" : "FAIL", entityType: AUDIT_ENTITY_TYPES.RECURRING_TRANSACTION_RUN, entityId: run.id, after: this.runAudit(failed) }, tx);
        return failed;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    }
  }

  private failure(error: unknown) {
    if (error instanceof RetriableRecurringConflictException) return { status: RecurringRunStatus.FAILED, code: "GENERATION_RETRIABLE", message: "Draft generation failed and can be retried.", retriable: true };
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
        if (attempt === 3) throw new RetriableRecurringConflictException("Recurring transaction changed concurrently. Retry the request.");
      }
    }
    throw new ConflictException("Recurring transaction changed concurrently. Retry the request.");
  }

  private schedule(template: RunWithTemplate["template"]): RecurringSchedule { return { timeZone: template.timezone, frequency: template.frequency, interval: template.interval, anchorDate: template.startDate.toISOString().slice(0, 10), endDate: template.endDate?.toISOString().slice(0, 10) ?? null, dayOfMonth: template.dayOfMonth, dayOfWeek: template.dayOfWeek, monthOfYear: template.monthOfYear }; }
  private sourceSnapshot(template: any): Prisma.InputJsonObject {
    const fields = ["id", "organizationId", "transactionType", "partyId", "branchId", "paidThroughAccountId", "paymentTermsDays", "currencyCode", "exchangeRatePolicy", "fixedExchangeRate", "rateSnapshotId", "taxMode", "inventoryPostingMode", "description", "reference", "notes", "terms", "createdByUserId", "subtotal", "discountTotal", "taxableTotal", "taxTotal", "total", "templateVersion", "timezone", "frequency", "interval", "dayOfMonth", "dayOfWeek", "monthOfYear", "startDate", "endDate", "nextRunAt"];
    return JSON.parse(JSON.stringify(Object.fromEntries([...fields.map((field) => [field, template[field]]), ["lines", template.lines ?? []]]))) as Prisma.InputJsonObject;
  }
  private generationTemplate(run: RunWithTemplate): any {
    const snapshot = run.sourceSnapshot;
    if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot) || snapshot.id !== run.templateId || snapshot.templateVersion !== run.templateVersion || !Array.isArray(snapshot.lines) || !snapshot.transactionType) throw new BadRequestException("Recurring generation template snapshot is incomplete.");
    return snapshot;
  }
  private runAudit(run: any) { return { id: run.id, templateId: run.templateId, templateVersion: run.templateVersion, scheduledFor: run.scheduledFor, scheduledLocalDate: run.scheduledLocalDate, trigger: run.trigger, status: run.status, attemptCount: run.attemptCount, nextAttemptAt: run.nextAttemptAt, failureCode: run.failureCode, failureMessageSafe: run.failureMessageSafe, failureRetriable: run.failureRetriable }; }
  private idempotencyKey(value: string): string { const key = value?.trim(); if (!key || key.length > 200) throw new BadRequestException("Idempotency key is required and must be 200 characters or fewer."); return key; }
  private limit(value: number): number { if (!Number.isInteger(value) || value < 1 || value > 100) throw new BadRequestException("Recurring worker limit must be between 1 and 100."); return value; }
  private retryDelay(attemptCount: number): number { return RETRY_BASE_DELAY_MS * 2 ** Math.max(0, Math.min(attemptCount - 1, 5)); }
  private page(value?: number): number { return Number.isInteger(value) && value! > 0 ? value! : 1; }
  private scheduledKey(templateId: string, scheduledFor: Date) { return `scheduled:${templateId}:${scheduledFor.toISOString()}`; }
  private dateOnly(localDate: string) { return new Date(`${localDate}T00:00:00.000Z`); }
  private isSerializationConflict(error: unknown): boolean { return typeof error === "object" && error !== null && "code" in error && error.code === "P2034"; }
  private isUniqueConflict(error: unknown): boolean { return typeof error === "object" && error !== null && "code" in error && error.code === "P2002"; }
}
