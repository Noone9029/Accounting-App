import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { FiscalPeriodStatus, GeneratedDocumentStatus, Prisma } from "@prisma/client";
import { FxCloseReadinessService } from "../foreign-exchange/fx-close-readiness.service";
import { AuditLogService } from "../audit-log/audit-log.service";
import { PrismaService } from "../prisma/prisma.service";
import { RecurringReadinessService } from "../recurring-transactions/recurring-readiness.service";
import {
  AccountingCloseCheck,
  canonicalReadinessHash,
  normalizeFxReadiness,
  normalizeRecurringReadiness,
} from "./close-readiness";

@Injectable()
export class AccountingCloseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fxCloseReadinessService: FxCloseReadinessService,
    private readonly recurringReadinessService: RecurringReadinessService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async getCycle(organizationId: string, cycleId: string) {
    const cycle = await this.prisma.accountingCloseCycle.findFirst({
      where: { id: cycleId, organizationId },
      include: { fiscalPeriod: { select: { id: true, name: true, startsOn: true, endsOn: true, status: true } }, _count: { select: { tasks: true, evidence: true, readinessSnapshots: true } } },
    });
    if (!cycle) throw new NotFoundException("Close cycle not found.");
    return cycleSummary(cycle);
  }

  async listTasks(organizationId: string, cycleId: string, page = 1, pageSize = 50) {
    if (!Number.isInteger(page) || page < 1 || page > 10000) throw new BadRequestException("page must be an integer between 1 and 10000.");
    if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) throw new BadRequestException("pageSize must be an integer between 1 and 100.");
    const cycle = await this.prisma.accountingCloseCycle.findFirst({ where: { id: cycleId, organizationId }, select: { id: true } });
    if (!cycle) throw new NotFoundException("Close cycle not found.");
    const safePage = page;
    const safePageSize = pageSize;
    const where = { organizationId, closeCycleId: cycleId };
    const [tasks, totalItems] = await Promise.all([
      this.prisma.accountingCloseTask.findMany({ where, orderBy: [{ sortOrder: "asc" }, { id: "asc" }], skip: (safePage - 1) * safePageSize, take: safePageSize }),
      this.prisma.accountingCloseTask.count({ where }),
    ]);
    return { items: tasks.map(taskResponse), meta: { page: safePage, pageSize: safePageSize, totalItems, totalPages: Math.max(1, Math.ceil(totalItems / safePageSize)) } };
  }

  async addEvidence(organizationId: string, actorUserId: string, cycleId: string, expectedVersion: number, input: { closeTaskId?: string; evidenceType: string; reportType?: string; generatedDocumentId?: string; safeLabel: string }) {
    if (!Number.isInteger(expectedVersion) || expectedVersion < 1) throw new BadRequestException("expectedVersion must be a positive integer.");
    const safeLabel = input.safeLabel.trim();
    if (!safeLabel || (!input.reportType && !input.generatedDocumentId)) throw new BadRequestException("Evidence requires a report type or generated document.");
    try { return await this.prisma.$transaction(async (tx) => {
      const cycle = await tx.accountingCloseCycle.findFirst({ where: { id: cycleId, organizationId }, select: { id: true, fiscalPeriodId: true, status: true } });
      if (!cycle) throw new NotFoundException("Close cycle not found.");
      if (!["IN_PROGRESS", "READY_FOR_REVIEW"].includes(cycle.status)) throw new BadRequestException("Evidence cannot be attached after review, close, or lock.");
      const fiscalPeriod = await tx.fiscalPeriod.findFirst({ where: { id: cycle.fiscalPeriodId, organizationId }, select: { id: true, status: true } });
      if (!fiscalPeriod) throw new NotFoundException("Fiscal period not found.");
      if (fiscalPeriod.status !== FiscalPeriodStatus.OPEN) throw new BadRequestException("Evidence cannot be attached after the fiscal period is closed or locked.");
      if (input.closeTaskId) { const task = await tx.accountingCloseTask.findFirst({ where: { id: input.closeTaskId, closeCycleId: cycleId, organizationId }, select: { id: true } }); if (!task) throw new NotFoundException("Close task not found."); }
      if (input.generatedDocumentId) { const document = await tx.generatedDocument.findFirst({ where: { id: input.generatedDocumentId, organizationId, status: GeneratedDocumentStatus.GENERATED }, select: { id: true } }); if (!document) throw new NotFoundException("Generated document not found."); }
      const claimed = await tx.accountingCloseCycle.updateMany({ where: { id: cycleId, organizationId, version: expectedVersion, status: { in: ["IN_PROGRESS", "READY_FOR_REVIEW"] }, fiscalPeriod: { is: { organizationId, status: FiscalPeriodStatus.OPEN } } }, data: { version: { increment: 1 } } });
      if (claimed.count !== 1) throw new ConflictException("Close cycle changed. Reload and retry.");
      const evidence = await tx.accountingCloseEvidence.create({ data: { organizationId, closeCycleId: cycleId, closeTaskId: input.closeTaskId, evidenceType: input.evidenceType, reportType: input.reportType, generatedDocumentId: input.generatedDocumentId, safeLabel, addedByUserId: actorUserId } });
      await this.auditLogService.log({ organizationId, actorUserId, action: "ATTACH_EVIDENCE", entityType: "AccountingCloseEvidence", entityId: evidence.id, after: { closeCycleId: cycleId, closeTaskId: evidence.closeTaskId, evidenceType: evidence.evidenceType, reportType: evidence.reportType, generatedDocumentId: evidence.generatedDocumentId, safeLabel: evidence.safeLabel } }, tx);
      return evidenceResponse(evidence);
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }); } catch (error) { if (prismaErrorCode(error) === "P2034") throw new ConflictException("Close cycle changed. Reload and retry."); throw error; }
  }

  async assignTask(organizationId: string, actorUserId: string, cycleId: string, taskId: string, expectedVersion: number, assignedToUserId: string) {
    if (!Number.isInteger(expectedVersion) || expectedVersion < 1) throw new BadRequestException("expectedVersion must be a positive integer.");
    try {
      return await this.prisma.$transaction(async (tx) => {
        const cycle = await tx.accountingCloseCycle.findFirst({ where: { id: cycleId, organizationId }, select: { id: true, fiscalPeriodId: true, status: true } });
        if (!cycle) throw new NotFoundException("Close cycle not found.");
        if (!["IN_PROGRESS", "READY_FOR_REVIEW"].includes(cycle.status)) throw new BadRequestException("Close tasks cannot be assigned after review, close, or lock.");
        const fiscalPeriod = await tx.fiscalPeriod.findFirst({ where: { id: cycle.fiscalPeriodId, organizationId }, select: { id: true, status: true } });
        if (!fiscalPeriod) throw new NotFoundException("Fiscal period not found.");
        if (fiscalPeriod.status !== FiscalPeriodStatus.OPEN) throw new BadRequestException("Close tasks cannot be assigned after the fiscal period is closed or locked.");
        const task = await tx.accountingCloseTask.findFirst({ where: { id: taskId, closeCycleId: cycleId, organizationId } });
        if (!task) throw new NotFoundException("Close task not found.");
        if (task.source === "SYSTEM") throw new BadRequestException("System-generated checks cannot be manually assigned.");
        const membership = await tx.organizationMember.findFirst({ where: { organizationId, userId: assignedToUserId, status: "ACTIVE" }, select: { id: true } });
        if (!membership) throw new BadRequestException("Assigned user must be an active member of the organization.");
        const claimed = await tx.accountingCloseCycle.updateMany({ where: { id: cycleId, organizationId, version: expectedVersion, status: { in: ["IN_PROGRESS", "READY_FOR_REVIEW"] }, fiscalPeriod: { is: { organizationId, status: FiscalPeriodStatus.OPEN } } }, data: { version: { increment: 1 } } });
        if (claimed.count !== 1) throw new ConflictException("Close cycle changed. Reload and retry.");
        const assigned = await tx.accountingCloseTask.update({ where: { id: task.id }, data: { assignedToUserId } });
        await this.auditLogService.log({ organizationId, actorUserId, action: "ASSIGN", entityType: "AccountingCloseTask", entityId: task.id, before: task, after: assigned }, tx);
        return taskResponse(assigned);
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (prismaErrorCode(error) === "P2034") throw new ConflictException("Close task changed. Reload and retry.");
      throw error;
    }
  }

  async createCycle(organizationId: string, actorUserId: string, fiscalPeriodId: string) {
    try {
      return await this.prisma.$transaction(async (tx) => {
      const fiscalPeriod = await tx.fiscalPeriod.findFirst({ where: { id: fiscalPeriodId, organizationId } });
      if (!fiscalPeriod) throw new NotFoundException("Fiscal period not found.");
      if (fiscalPeriod.status !== FiscalPeriodStatus.OPEN) throw new BadRequestException("Only open fiscal periods can start a close cycle.");
      const existing = await tx.accountingCloseCycle.findFirst({ where: { organizationId, fiscalPeriodId } });
      if (existing) return existing;

      const cycle = await tx.accountingCloseCycle.create({
        data: {
          organizationId,
          fiscalPeriodId,
          startedByUserId: actorUserId,
          tasks: { create: STANDARD_MANUAL_TASKS.map(([taskType, title], sortOrder) => ({ taskType, title, sortOrder, source: "STANDARD_TEMPLATE", severity: "INFORMATION", isRequired: true })) },
        },
      });
      await this.auditLogService.log({
        organizationId,
        actorUserId,
        action: "START",
        entityType: "AccountingCloseCycle",
        entityId: cycle.id,
        after: { fiscalPeriodId: cycle.fiscalPeriodId, status: cycle.status },
      }, tx);
      return cycle;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (!["P2002", "P2034"].includes(prismaErrorCode(error) ?? "")) throw error;
      const existing = await this.prisma.accountingCloseCycle.findFirst({ where: { organizationId, fiscalPeriodId } });
      if (existing) return existing;
      throw new ConflictException("Close cycle creation conflicted. Reload and retry.");
    }
  }

  async completeTask(organizationId: string, actorUserId: string, cycleId: string, taskId: string, expectedVersion: number, completionNote?: string) {
    if (!Number.isInteger(expectedVersion) || expectedVersion < 1) throw new BadRequestException("expectedVersion must be a positive integer.");
    try {
      return await this.prisma.$transaction(async (tx) => {
        const cycle = await tx.accountingCloseCycle.findFirst({ where: { id: cycleId, organizationId }, select: { id: true, fiscalPeriodId: true, status: true } });
        if (!cycle) throw new NotFoundException("Close cycle not found.");
        if (!["IN_PROGRESS", "READY_FOR_REVIEW"].includes(cycle.status)) {
          throw new BadRequestException("Close tasks cannot be completed after review, close, or lock.");
        }
        const fiscalPeriod = await tx.fiscalPeriod.findFirst({
          where: { id: cycle.fiscalPeriodId, organizationId },
          select: { id: true, status: true },
        });
        if (!fiscalPeriod) throw new NotFoundException("Fiscal period not found.");
        if (fiscalPeriod.status !== FiscalPeriodStatus.OPEN) {
          throw new BadRequestException("Close tasks cannot be completed after the fiscal period is closed or locked.");
        }

        const task = await tx.accountingCloseTask.findFirst({ where: { id: taskId, closeCycleId: cycleId, organizationId } });
        if (!task) throw new NotFoundException("Close task not found.");
        if (task.source === "SYSTEM") throw new BadRequestException("System-generated checks cannot be manually completed.");
        if (!["OPEN", "IN_PROGRESS", "BLOCKED"].includes(task.status)) {
          throw new BadRequestException("Close task must be reopened before it can be completed again.");
        }

        const claimed = await tx.accountingCloseCycle.updateMany({
          where: {
            id: cycleId,
            organizationId,
            version: expectedVersion,
            status: { in: ["IN_PROGRESS", "READY_FOR_REVIEW"] },
            fiscalPeriod: { is: { organizationId, status: FiscalPeriodStatus.OPEN } },
          },
          data: { version: { increment: 1 } },
        });
        if (claimed.count !== 1) throw new ConflictException("Close cycle changed. Reload and retry.");
        const completed = await tx.accountingCloseTask.update({
          where: { id: task.id },
          data: { status: "COMPLETED", completedAt: new Date(), completedByUserId: actorUserId, completionNote: completionNote?.trim() || null },
        });
        await this.auditLogService.log({ organizationId, actorUserId, action: "COMPLETE", entityType: "AccountingCloseTask", entityId: task.id, before: task, after: completed }, tx);
        return completed;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (prismaErrorCode(error) === "P2034") throw new ConflictException("Close task changed. Reload and retry.");
      throw error;
    }
  }

  async reopenTask(organizationId: string, actorUserId: string, cycleId: string, taskId: string, expectedVersion: number, reopenReason: string) {
    if (!Number.isInteger(expectedVersion) || expectedVersion < 1) throw new BadRequestException("expectedVersion must be a positive integer.");
    const normalizedReason = reopenReason?.trim();
    if (!normalizedReason) throw new BadRequestException("reopenReason is required.");
    try {
      return await this.prisma.$transaction(async (tx) => {
        const cycle = await tx.accountingCloseCycle.findFirst({ where: { id: cycleId, organizationId }, select: { id: true, fiscalPeriodId: true, status: true } });
        if (!cycle) throw new NotFoundException("Close cycle not found.");
        if (!["IN_PROGRESS", "READY_FOR_REVIEW"].includes(cycle.status)) {
          throw new BadRequestException("Close tasks cannot be reopened after review, close, or lock.");
        }
        const fiscalPeriod = await tx.fiscalPeriod.findFirst({
          where: { id: cycle.fiscalPeriodId, organizationId },
          select: { id: true, status: true },
        });
        if (!fiscalPeriod) throw new NotFoundException("Fiscal period not found.");
        if (fiscalPeriod.status !== FiscalPeriodStatus.OPEN) {
          throw new BadRequestException("Close tasks cannot be reopened after the fiscal period is closed or locked.");
        }

        const task = await tx.accountingCloseTask.findFirst({ where: { id: taskId, closeCycleId: cycleId, organizationId } });
        if (!task) throw new NotFoundException("Close task not found.");
        if (task.source === "SYSTEM") throw new BadRequestException("System-generated checks cannot be manually reopened.");
        if (task.status !== "COMPLETED") throw new BadRequestException("Only completed close tasks can be reopened.");

        const claimed = await tx.accountingCloseCycle.updateMany({
          where: {
            id: cycleId,
            organizationId,
            version: expectedVersion,
            status: { in: ["IN_PROGRESS", "READY_FOR_REVIEW"] },
            fiscalPeriod: { is: { organizationId, status: FiscalPeriodStatus.OPEN } },
          },
          data: { version: { increment: 1 } },
        });
        if (claimed.count !== 1) throw new ConflictException("Close cycle changed. Reload and retry.");
        const reopened = await tx.accountingCloseTask.update({
          where: { id: task.id },
          data: {
            status: "OPEN",
            completedAt: null,
            completedByUserId: null,
            completionNote: null,
            reopenedAt: new Date(),
            reopenedByUserId: actorUserId,
            reopenReason: normalizedReason,
          },
        });
        await this.auditLogService.log({ organizationId, actorUserId, action: "REOPEN", entityType: "AccountingCloseTask", entityId: task.id, before: task, after: reopened }, tx);
        return reopened;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (prismaErrorCode(error) === "P2034") throw new ConflictException("Close task changed. Reload and retry.");
      throw error;
    }
  }

  async refreshCycle(organizationId: string, actorUserId: string, cycleId: string, expectedVersion: number) {
    if (!Number.isInteger(expectedVersion) || expectedVersion < 1) throw new BadRequestException("expectedVersion must be a positive integer.");
    try {
      return await this.prisma.$transaction(async (tx) => {
        const cycle = await tx.accountingCloseCycle.findFirst({
          where: { id: cycleId, organizationId },
          select: { id: true, fiscalPeriodId: true, status: true },
        });
        if (!cycle) throw new NotFoundException("Close cycle not found.");
        if (!["IN_PROGRESS", "READY_FOR_REVIEW"].includes(cycle.status)) {
          throw new BadRequestException("Close readiness cannot be refreshed after review, close, or lock.");
        }
        const fiscalPeriod = await tx.fiscalPeriod.findFirst({
          where: { id: cycle.fiscalPeriodId, organizationId },
          select: { id: true, name: true, startsOn: true, endsOn: true, status: true },
        });
        if (!fiscalPeriod) throw new NotFoundException("Fiscal period not found.");
        if (fiscalPeriod.status !== FiscalPeriodStatus.OPEN) {
          throw new BadRequestException("Close readiness cannot be refreshed after the fiscal period is closed or locked.");
        }
        const readiness = await this.readinessForFiscalPeriod(organizationId, fiscalPeriod, tx);

        const claimed = await tx.accountingCloseCycle.updateMany({
          where: {
            id: cycleId,
            organizationId,
            version: expectedVersion,
            status: { in: ["IN_PROGRESS", "READY_FOR_REVIEW"] },
            fiscalPeriod: { is: { organizationId, status: FiscalPeriodStatus.OPEN } },
          },
          data: { version: { increment: 1 }, lastRefreshedAt: new Date(), readinessHash: readiness.canonicalHash },
        });
        if (claimed.count !== 1) throw new ConflictException("Close cycle changed. Reload and retry.");
        const snapshot = await tx.accountingCloseReadinessSnapshot.create({
          data: {
            organizationId,
            closeCycleId: cycle.id,
            fiscalPeriodId: cycle.fiscalPeriodId,
            capturedByUserId: actorUserId,
            status: "DRAFT",
            blockerCount: readiness.blockerCount,
            warningCount: readiness.warningCount,
            informationCount: readiness.informationCount,
            checkCount: readiness.checkCount,
            canonicalHash: readiness.canonicalHash,
            sourceVersion: expectedVersion + 1,
            items: {
              create: readiness.checks.map((check) => ({
                organizationId,
                checkKey: check.key,
                severity: check.severity,
                status: check.status,
                code: check.code,
                safeMessage: check.safeMessage,
                count: check.count,
                sourceUpdatedAt: check.sourceUpdatedAt ? new Date(check.sourceUpdatedAt) : undefined,
                metadataSafe: { title: check.title, detailsHref: check.detailsHref ?? null, canAcknowledge: check.canAcknowledge },
              })),
            },
          },
          include: { items: { orderBy: { checkKey: "asc" } } },
        });
        await this.auditLogService.log({
          organizationId,
          actorUserId,
          action: "REFRESH",
          entityType: "AccountingCloseReadinessSnapshot",
          entityId: snapshot.id,
          after: { closeCycleId: cycle.id, canonicalHash: snapshot.canonicalHash, blockerCount: snapshot.blockerCount, warningCount: snapshot.warningCount },
        }, tx);
        return snapshotResponse(snapshot);
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (prismaErrorCode(error) === "P2034") throw new ConflictException("Close cycle changed. Reload and retry.");
      throw error;
    }
  }

  async readiness(organizationId: string, fiscalPeriodId: string) {
    const fiscalPeriod = await this.prisma.fiscalPeriod.findFirst({ where: { id: fiscalPeriodId, organizationId } });
    if (!fiscalPeriod) throw new NotFoundException("Fiscal period not found.");

    return this.readinessForFiscalPeriod(organizationId, fiscalPeriod);
  }

  private async readinessForFiscalPeriod(
    organizationId: string,
    fiscalPeriod: { id: string; name: string; startsOn: Date; endsOn: Date; status: FiscalPeriodStatus },
    executor?: Prisma.TransactionClient,
  ) {
    const [fx, recurring] = await Promise.allSettled([
      executor
        ? this.fxCloseReadinessService.readiness(organizationId, fiscalPeriod.endsOn, executor)
        : this.fxCloseReadinessService.readiness(organizationId, fiscalPeriod.endsOn),
      executor
        ? this.recurringReadinessService.get(organizationId, { startsOn: fiscalPeriod.startsOn, endsOn: fiscalPeriod.endsOn }, executor)
        : this.recurringReadinessService.get(organizationId, { startsOn: fiscalPeriod.startsOn, endsOn: fiscalPeriod.endsOn }),
    ]);
    const checks = [
      ...(fx.status === "fulfilled"
        ? normalizeFxReadiness(fx.value)
        : [unavailableCheck("fx.error", "Foreign exchange close readiness", "FX_READINESS_UNAVAILABLE")]),
      ...(recurring.status === "fulfilled"
        ? normalizeRecurringReadiness(recurring.value)
        : [unavailableCheck("recurring.error", "Recurring transaction readiness", "RECURRING_READINESS_UNAVAILABLE")]),
    ].sort((left, right) => left.key.localeCompare(right.key));
    const blockerCount = count(checks, "BLOCKER");
    const warningCount = count(checks, "WARNING");
    const informationCount = count(checks, "INFORMATION");

    return {
      fiscalPeriod: {
        id: fiscalPeriod.id,
        name: fiscalPeriod.name,
        startsOn: fiscalPeriod.startsOn,
        endsOn: fiscalPeriod.endsOn,
        status: fiscalPeriod.status as FiscalPeriodStatus,
      },
      checks,
      blockerCount,
      warningCount,
      informationCount,
      checkCount: checks.filter((check) => check.severity !== "NOT_APPLICABLE").length,
      canonicalHash: canonicalReadinessHash(checks),
    };
  }
}

function prismaErrorCode(error: unknown): string | undefined {
  return typeof error === "object" && error !== null && "code" in error && typeof error.code === "string" ? error.code : undefined;
}

function cycleSummary(cycle: any) {
  return {
    id: cycle.id, fiscalPeriodId: cycle.fiscalPeriodId, status: cycle.status, version: cycle.version, startedAt: cycle.startedAt,
    preparedAt: cycle.preparedAt, reviewedAt: cycle.reviewedAt, closedAt: cycle.closedAt, lockedAt: cycle.lockedAt,
    lastRefreshedAt: cycle.lastRefreshedAt, readinessHash: cycle.readinessHash,
    fiscalPeriod: cycle.fiscalPeriod,
    taskCount: cycle._count.tasks, evidenceCount: cycle._count.evidence, snapshotCount: cycle._count.readinessSnapshots,
  };
}

function taskResponse(task: any) {
  return {
    id: task.id, taskType: task.taskType, source: task.source, title: task.title, description: task.description,
    severity: task.severity, status: task.status, isRequired: task.isRequired, assignedToUserId: task.assignedToUserId,
    dueDate: task.dueDate, completedAt: task.completedAt, completedByUserId: task.completedByUserId, completionNote: task.completionNote,
    reopenedAt: task.reopenedAt, reopenedByUserId: task.reopenedByUserId, reopenReason: task.reopenReason,
    acknowledgementReason: task.acknowledgementReason, sortOrder: task.sortOrder, systemCheckKey: task.systemCheckKey,
  };
}

function evidenceResponse(evidence: any) {
  return { id: evidence.id, closeTaskId: evidence.closeTaskId, evidenceType: evidence.evidenceType, reportType: evidence.reportType, generatedDocumentId: evidence.generatedDocumentId, safeLabel: evidence.safeLabel, addedAt: evidence.addedAt };
}

function snapshotResponse(snapshot: {
  id: string;
  closeCycleId: string;
  fiscalPeriodId: string;
  capturedAt: Date;
  capturedByUserId: string | null;
  status: string;
  blockerCount: number;
  warningCount: number;
  informationCount: number;
  checkCount: number;
  canonicalHash: string;
  sourceVersion: number;
  items: Array<{
    checkKey: string;
    severity: string;
    status: string;
    code: string;
    safeMessage: string;
    count: number | null;
    currencyCode: string | null;
    sourceUpdatedAt: Date | null;
    metadataSafe: Prisma.JsonValue | null;
  }>;
}) {
  return {
    id: snapshot.id,
    closeCycleId: snapshot.closeCycleId,
    fiscalPeriodId: snapshot.fiscalPeriodId,
    capturedAt: snapshot.capturedAt,
    capturedByUserId: snapshot.capturedByUserId,
    status: snapshot.status,
    blockerCount: snapshot.blockerCount,
    warningCount: snapshot.warningCount,
    informationCount: snapshot.informationCount,
    checkCount: snapshot.checkCount,
    canonicalHash: snapshot.canonicalHash,
    sourceVersion: snapshot.sourceVersion,
    items: snapshot.items.map((item) => ({
      checkKey: item.checkKey,
      severity: item.severity,
      status: item.status,
      code: item.code,
      safeMessage: item.safeMessage,
      count: item.count,
      currencyCode: item.currencyCode,
      sourceUpdatedAt: item.sourceUpdatedAt,
      metadataSafe: item.metadataSafe,
    })),
  };
}

const STANDARD_MANUAL_TASKS = [
  ["BANK_RECONCILIATION", "Review bank reconciliation"],
  ["AR_AGING", "Review AR aging"],
  ["AP_AGING", "Review AP aging"],
  ["UNAPPLIED_PAYMENTS", "Review unapplied payments"],
  ["RECURRING_DRAFTS", "Review recurring generated drafts"],
  ["INVENTORY_VALUATION", "Review inventory valuation"],
  ["FX_REVALUATION", "Review FX revaluation"],
  ["TAX_SUMMARY", "Review tax summary"],
  ["MANUAL_JOURNALS", "Review manual journals"],
  ["TRIAL_BALANCE", "Review trial balance"],
  ["PROFIT_AND_LOSS", "Review profit and loss"],
  ["BALANCE_SHEET", "Review balance sheet"],
  ["CASH_FLOW", "Review cash flow"],
  ["SUPPORTING_DOCUMENTS", "Review supporting documents"],
  ["MANAGEMENT_REPORT_PACK", "Prepare management report pack"],
  ["ACCOUNTANT_NOTES", "Record accountant notes"],
  ["REVIEWER_SIGN_OFF", "Obtain reviewer sign-off"],
] as const;

function count(checks: AccountingCloseCheck[], severity: AccountingCloseCheck["severity"]) {
  return checks.filter((check) => check.severity === severity && check.status !== "NOT_APPLICABLE").length;
}

function unavailableCheck(key: string, title: string, code: string): AccountingCloseCheck {
  return {
    key,
    title,
    severity: "BLOCKER",
    status: "ERROR",
    code,
    safeMessage: "This readiness category could not be evaluated. Refresh after the service is available.",
    count: 1,
    canAcknowledge: false,
  };
}
