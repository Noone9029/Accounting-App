import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { FiscalPeriodStatus, GeneratedDocumentStatus, Prisma } from "@prisma/client";
import { FxCloseReadinessService } from "../foreign-exchange/fx-close-readiness.service";
import { AuditLogService } from "../audit-log/audit-log.service";
import { PrismaService } from "../prisma/prisma.service";
import { RecurringReadinessService } from "../recurring-transactions/recurring-readiness.service";
import { FiscalPeriodService } from "../fiscal-periods/fiscal-period.service";
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
    private readonly fiscalPeriodService: FiscalPeriodService,
  ) {}

  async getCycle(organizationId: string, cycleId: string) {
    const cycle = await this.prisma.accountingCloseCycle.findFirst({
      where: { id: cycleId, organizationId },
      include: { fiscalPeriod: { select: { id: true, name: true, startsOn: true, endsOn: true, status: true } }, _count: { select: { tasks: true, evidence: true, readinessSnapshots: true } } },
    });
    if (!cycle) throw new NotFoundException("Close cycle not found.");
    return cycleSummary(cycle);
  }

  async findCycleByFiscalPeriod(organizationId: string, fiscalPeriodId: string) {
    const cycle = await this.prisma.accountingCloseCycle.findFirst({
      where: { organizationId, fiscalPeriodId },
      include: { fiscalPeriod: { select: { id: true, name: true, startsOn: true, endsOn: true, status: true } }, _count: { select: { tasks: true, evidence: true, readinessSnapshots: true } } },
    });
    return cycle ? cycleSummary(cycle) : null;
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

  async listSnapshots(organizationId: string, cycleId: string, page = 1, pageSize = 50) {
    if (!Number.isInteger(page) || page < 1 || page > 10000) throw new BadRequestException("page must be an integer between 1 and 10000.");
    if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) throw new BadRequestException("pageSize must be an integer between 1 and 100.");
    const cycle = await this.prisma.accountingCloseCycle.findFirst({ where: { id: cycleId, organizationId }, select: { id: true } });
    if (!cycle) throw new NotFoundException("Close cycle not found.");
    const where = { organizationId, closeCycleId: cycleId };
    const [snapshots, totalItems] = await Promise.all([
      this.prisma.accountingCloseReadinessSnapshot.findMany({
        where,
        select: snapshotSummarySelect,
        orderBy: [{ capturedAt: "desc" }, { id: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.accountingCloseReadinessSnapshot.count({ where }),
    ]);
    return { items: snapshots.map(snapshotSummary), meta: { page, pageSize, totalItems, totalPages: Math.max(1, Math.ceil(totalItems / pageSize)) } };
  }

  async getSnapshot(organizationId: string, cycleId: string, snapshotId: string) {
    const snapshot = await this.prisma.accountingCloseReadinessSnapshot.findFirst({
      where: { id: snapshotId, closeCycleId: cycleId, organizationId },
      select: {
        ...snapshotSummarySelect,
        items: {
          select: {
            checkKey: true,
            severity: true,
            status: true,
            code: true,
            safeMessage: true,
            count: true,
            currencyCode: true,
            sourceUpdatedAt: true,
            metadataSafe: true,
          },
          orderBy: { checkKey: "asc" },
        },
      },
    });
    if (!snapshot) throw new NotFoundException("Close readiness snapshot not found.");
    return snapshotResponse(snapshot);
  }

  async compareSnapshots(organizationId: string, cycleId: string, baselineSnapshotId: string, comparisonSnapshotId: string) {
    if (baselineSnapshotId === comparisonSnapshotId) throw new BadRequestException("Choose two different readiness snapshots to compare.");
    const snapshots = await this.prisma.accountingCloseReadinessSnapshot.findMany({
      where: { organizationId, closeCycleId: cycleId, id: { in: [baselineSnapshotId, comparisonSnapshotId] } },
      select: snapshotComparisonSelect,
    });
    const byId = new Map(snapshots.map((snapshot) => [snapshot.id, snapshot]));
    const baseline = byId.get(baselineSnapshotId);
    const comparison = byId.get(comparisonSnapshotId);
    if (!baseline || !comparison) throw new NotFoundException("Close readiness snapshot not found.");
    const baselineItems = new Map(baseline.items.map((item) => [item.checkKey, item]));
    const comparisonItems = new Map(comparison.items.map((item) => [item.checkKey, item]));
    const changes: Array<{ checkKey: string; changeType: "ADDED" | "REMOVED" | "MODIFIED"; before: ReturnType<typeof snapshotItemResponse> | null; after: ReturnType<typeof snapshotItemResponse> | null }> = [];
    for (const checkKey of [...new Set([...baselineItems.keys(), ...comparisonItems.keys()])].sort()) {
      const before = baselineItems.get(checkKey);
      const after = comparisonItems.get(checkKey);
      if (!before) changes.push({ checkKey, changeType: "ADDED", before: null, after: snapshotItemResponse(after!) });
      else if (!after) changes.push({ checkKey, changeType: "REMOVED", before: snapshotItemResponse(before), after: null });
      else if (snapshotItemFingerprint(before) !== snapshotItemFingerprint(after)) changes.push({ checkKey, changeType: "MODIFIED", before: snapshotItemResponse(before), after: snapshotItemResponse(after) });
    }
    return { baseline: snapshotSummary(baseline), comparison: snapshotSummary(comparison), changeCount: changes.length, changes };
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
          data: {
            version: { increment: 1 },
            lastRefreshedAt: new Date(),
            readinessHash: readiness.canonicalHash,
            ...(cycle.status === "READY_FOR_REVIEW" ? { status: "IN_PROGRESS", preparedAt: null, preparedByUserId: null, reviewedAt: null, reviewedByUserId: null } : {}),
          },
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

  async prepareCycle(organizationId: string, actorUserId: string, cycleId: string, expectedVersion: number) {
    if (!Number.isInteger(expectedVersion) || expectedVersion < 1) throw new BadRequestException("expectedVersion must be a positive integer.");
    try {
      return await this.prisma.$transaction(async (tx) => {
        const cycle = await tx.accountingCloseCycle.findFirst({
          where: { id: cycleId, organizationId },
          select: { id: true, fiscalPeriodId: true, status: true },
        });
        if (!cycle) throw new NotFoundException("Close cycle not found.");
        if (cycle.status !== "IN_PROGRESS") throw new BadRequestException("Only an in-progress close cycle can be prepared for review.");
        const fiscalPeriod = await tx.fiscalPeriod.findFirst({
          where: { id: cycle.fiscalPeriodId, organizationId },
          select: { id: true, name: true, startsOn: true, endsOn: true, status: true },
        });
        if (!fiscalPeriod) throw new NotFoundException("Fiscal period not found.");
        if (fiscalPeriod.status !== FiscalPeriodStatus.OPEN) throw new BadRequestException("A closed or locked fiscal period cannot be prepared for review.");
        const readiness = await this.readinessForFiscalPeriod(organizationId, fiscalPeriod, tx);
        if (readiness.blockerCount > 0) throw new BadRequestException("Close readiness has unresolved blockers.");
        const incompleteTask = await tx.accountingCloseTask.findFirst({
          where: { organizationId, closeCycleId: cycleId, source: { not: "SYSTEM" }, isRequired: true, status: { not: "COMPLETED" } },
          select: { id: true },
        });
        if (incompleteTask) throw new BadRequestException("Required manual close tasks must be completed before preparation.");

        const preparedAt = new Date();
        const claimed = await tx.accountingCloseCycle.updateMany({
          where: { id: cycleId, organizationId, version: expectedVersion, status: "IN_PROGRESS", fiscalPeriod: { is: { organizationId, status: FiscalPeriodStatus.OPEN } } },
          data: { status: "READY_FOR_REVIEW", version: { increment: 1 }, preparedAt, preparedByUserId: actorUserId, lastRefreshedAt: preparedAt, readinessHash: readiness.canonicalHash },
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
            items: { create: readiness.checks.map((check) => ({ organizationId, checkKey: check.key, severity: check.severity, status: check.status, code: check.code, safeMessage: check.safeMessage, count: check.count, sourceUpdatedAt: check.sourceUpdatedAt ? new Date(check.sourceUpdatedAt) : undefined, metadataSafe: { title: check.title, detailsHref: check.detailsHref ?? null, canAcknowledge: check.canAcknowledge } })) },
          },
          include: { items: { orderBy: { checkKey: "asc" } } },
        });
        await this.auditLogService.log({
          organizationId,
          actorUserId,
          action: "PREPARE",
          entityType: "AccountingCloseCycle",
          entityId: cycle.id,
          after: { status: "READY_FOR_REVIEW", preparedAt, readinessHash: readiness.canonicalHash, snapshotId: snapshot.id },
        }, tx);
        return { id: cycle.id, fiscalPeriodId: cycle.fiscalPeriodId, status: "READY_FOR_REVIEW", version: expectedVersion + 1, preparedAt, readinessHash: readiness.canonicalHash };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (prismaErrorCode(error) === "P2034") throw new ConflictException("Close cycle changed. Reload and retry.");
      throw error;
    }
  }

  async reviewCycle(organizationId: string, actorUserId: string, cycleId: string, expectedVersion: number) {
    if (!Number.isInteger(expectedVersion) || expectedVersion < 1) throw new BadRequestException("expectedVersion must be a positive integer.");
    try {
      return await this.prisma.$transaction(async (tx) => {
        const cycle = await tx.accountingCloseCycle.findFirst({
          where: { id: cycleId, organizationId },
          select: { id: true, fiscalPeriodId: true, status: true, preparedByUserId: true, readinessHash: true },
        });
        if (!cycle) throw new NotFoundException("Close cycle not found.");
        if (cycle.status !== "READY_FOR_REVIEW") throw new BadRequestException("Only a prepared close cycle can be reviewed.");
        if (!cycle.preparedByUserId || !cycle.readinessHash) throw new BadRequestException("Close cycle preparation is incomplete.");
        if (cycle.preparedByUserId === actorUserId) throw new BadRequestException("A preparer cannot review the same close cycle without an explicit organization policy.");
        const fiscalPeriod = await tx.fiscalPeriod.findFirst({
          where: { id: cycle.fiscalPeriodId, organizationId },
          select: { id: true, name: true, startsOn: true, endsOn: true, status: true },
        });
        if (!fiscalPeriod) throw new NotFoundException("Fiscal period not found.");
        if (fiscalPeriod.status !== FiscalPeriodStatus.OPEN) throw new BadRequestException("A closed or locked fiscal period cannot be reviewed.");
        const readiness = await this.readinessForFiscalPeriod(organizationId, fiscalPeriod, tx);
        if (readiness.blockerCount > 0 || readiness.canonicalHash !== cycle.readinessHash) throw new ConflictException("Close readiness changed. Refresh and prepare the cycle again.");
        const snapshot = await tx.accountingCloseReadinessSnapshot.findFirst({
          where: { organizationId, closeCycleId: cycleId, status: "DRAFT", canonicalHash: cycle.readinessHash },
          orderBy: { capturedAt: "desc" },
          select: { id: true, canonicalHash: true },
        });
        if (!snapshot) throw new ConflictException("A matching draft readiness snapshot is required for review.");
        const reviewedAt = new Date();
        const claimed = await tx.accountingCloseCycle.updateMany({
          where: { id: cycleId, organizationId, version: expectedVersion, status: "READY_FOR_REVIEW", readinessHash: cycle.readinessHash, fiscalPeriod: { is: { organizationId, status: FiscalPeriodStatus.OPEN } } },
          data: { status: "REVIEWED", version: { increment: 1 }, reviewedAt, reviewedByUserId: actorUserId, readinessHash: readiness.canonicalHash },
        });
        if (claimed.count !== 1) throw new ConflictException("Close cycle changed. Reload and retry.");
        const frozen = await tx.accountingCloseReadinessSnapshot.updateMany({ where: { id: snapshot.id, organizationId, status: "DRAFT" }, data: { status: "REVIEWED" } });
        if (frozen.count !== 1) throw new ConflictException("Close readiness snapshot changed. Reload and retry.");
        await this.auditLogService.log({ organizationId, actorUserId, action: "REVIEW", entityType: "AccountingCloseCycle", entityId: cycle.id, after: { status: "REVIEWED", reviewedAt, readinessHash: readiness.canonicalHash, snapshotId: snapshot.id } }, tx);
        return { id: cycle.id, fiscalPeriodId: cycle.fiscalPeriodId, status: "REVIEWED", version: expectedVersion + 1, reviewedAt, reviewedByUserId: actorUserId, readinessHash: readiness.canonicalHash };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (prismaErrorCode(error) === "P2034") throw new ConflictException("Close cycle changed. Reload and retry.");
      throw error;
    }
  }

  async closeCycle(organizationId: string, actorUserId: string, cycleId: string, expectedVersion: number) {
    if (!Number.isInteger(expectedVersion) || expectedVersion < 1) throw new BadRequestException("expectedVersion must be a positive integer.");
    try {
      return await this.prisma.$transaction(async (tx) => {
        const cycle = await tx.accountingCloseCycle.findFirst({ where: { id: cycleId, organizationId }, select: { id: true, fiscalPeriodId: true, status: true, readinessHash: true } });
        if (!cycle) throw new NotFoundException("Close cycle not found.");
        if (cycle.status !== "REVIEWED" || !cycle.readinessHash) throw new BadRequestException("Only a reviewed close cycle can close its fiscal period.");
        const fiscalPeriod = await tx.fiscalPeriod.findFirst({ where: { id: cycle.fiscalPeriodId, organizationId }, select: { id: true, name: true, startsOn: true, endsOn: true, status: true } });
        if (!fiscalPeriod) throw new NotFoundException("Fiscal period not found.");
        if (fiscalPeriod.status !== FiscalPeriodStatus.OPEN) throw new BadRequestException("Only an open fiscal period can be closed.");
        const readiness = await this.readinessForFiscalPeriod(organizationId, fiscalPeriod, tx);
        if (readiness.blockerCount > 0 || readiness.canonicalHash !== cycle.readinessHash) throw new ConflictException("Close readiness changed. Refresh, prepare, and review the cycle again.");
        await this.fiscalPeriodService.closeInTransaction(organizationId, actorUserId, cycle.fiscalPeriodId, tx);
        const closedAt = new Date();
        const claimed = await tx.accountingCloseCycle.updateMany({ where: { id: cycleId, organizationId, version: expectedVersion, status: "REVIEWED", readinessHash: cycle.readinessHash, fiscalPeriod: { is: { organizationId, status: FiscalPeriodStatus.CLOSED } } }, data: { status: "CLOSED", version: { increment: 1 }, closedAt, closedByUserId: actorUserId } });
        if (claimed.count !== 1) throw new ConflictException("Close cycle changed. Reload and retry.");
        const snapshot = await tx.accountingCloseReadinessSnapshot.create({ data: { organizationId, closeCycleId: cycle.id, fiscalPeriodId: cycle.fiscalPeriodId, capturedByUserId: actorUserId, status: "CLOSED", blockerCount: readiness.blockerCount, warningCount: readiness.warningCount, informationCount: readiness.informationCount, checkCount: readiness.checkCount, canonicalHash: readiness.canonicalHash, sourceVersion: expectedVersion + 1, items: { create: readiness.checks.map((check) => ({ organizationId, checkKey: check.key, severity: check.severity, status: check.status, code: check.code, safeMessage: check.safeMessage, count: check.count, sourceUpdatedAt: check.sourceUpdatedAt ? new Date(check.sourceUpdatedAt) : undefined, metadataSafe: { title: check.title, detailsHref: check.detailsHref ?? null, canAcknowledge: check.canAcknowledge } })) } } });
        await this.auditLogService.log({ organizationId, actorUserId, action: "CLOSE", entityType: "AccountingCloseCycle", entityId: cycle.id, after: { status: "CLOSED", closedAt, readinessHash: readiness.canonicalHash, snapshotId: snapshot.id } }, tx);
        return { id: cycle.id, fiscalPeriodId: cycle.fiscalPeriodId, status: "CLOSED", version: expectedVersion + 1, closedAt, closedByUserId: actorUserId, readinessHash: readiness.canonicalHash };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) { if (prismaErrorCode(error) === "P2034") throw new ConflictException("Close cycle changed. Reload and retry."); throw error; }
  }

  async lockCycle(organizationId: string, actorUserId: string, cycleId: string, expectedVersion: number) {
    if (!Number.isInteger(expectedVersion) || expectedVersion < 1) throw new BadRequestException("expectedVersion must be a positive integer.");
    try { return await this.prisma.$transaction(async (tx) => {
      const cycle = await tx.accountingCloseCycle.findFirst({ where: { id: cycleId, organizationId }, select: { id: true, fiscalPeriodId: true, status: true, readinessHash: true, lockedAt: true, lockedByUserId: true } });
      if (!cycle) throw new NotFoundException("Close cycle not found.");
      if (cycle.status === "LOCKED") {
        const fiscalPeriod = await tx.fiscalPeriod.findFirst({ where: { id: cycle.fiscalPeriodId, organizationId }, select: { status: true } });
        if (!fiscalPeriod || fiscalPeriod.status !== FiscalPeriodStatus.LOCKED) throw new ConflictException("Close cycle and fiscal period lock state differ. Reload and retry.");
        return { id: cycle.id, fiscalPeriodId: cycle.fiscalPeriodId, status: "LOCKED", lockedAt: cycle.lockedAt, lockedByUserId: cycle.lockedByUserId, readinessHash: cycle.readinessHash };
      }
      if (cycle.status !== "CLOSED" || !cycle.readinessHash) throw new BadRequestException("Only a closed close cycle can lock its fiscal period.");
      const fiscalPeriod = await tx.fiscalPeriod.findFirst({ where: { id: cycle.fiscalPeriodId, organizationId }, select: { id: true, name: true, startsOn: true, endsOn: true, status: true } });
      if (!fiscalPeriod) throw new NotFoundException("Fiscal period not found.");
      if (fiscalPeriod.status !== FiscalPeriodStatus.CLOSED) throw new BadRequestException("Only a closed fiscal period can be locked through the close workspace.");
      const readiness = await this.readinessForFiscalPeriod(organizationId, fiscalPeriod, tx);
      if (readiness.blockerCount > 0 || readiness.canonicalHash !== cycle.readinessHash) throw new ConflictException("Close readiness changed. Re-open and re-review the cycle before locking.");
      await this.fiscalPeriodService.lockInTransaction(organizationId, actorUserId, cycle.fiscalPeriodId, tx);
      const lockedAt = new Date();
      const claimed = await tx.accountingCloseCycle.updateMany({ where: { id: cycleId, organizationId, version: expectedVersion, status: "CLOSED", readinessHash: cycle.readinessHash, fiscalPeriod: { is: { organizationId, status: FiscalPeriodStatus.LOCKED } } }, data: { status: "LOCKED", version: { increment: 1 }, lockedAt, lockedByUserId: actorUserId } });
      if (claimed.count !== 1) throw new ConflictException("Close cycle changed. Reload and retry.");
      const snapshot = await tx.accountingCloseReadinessSnapshot.create({ data: { organizationId, closeCycleId: cycle.id, fiscalPeriodId: cycle.fiscalPeriodId, capturedByUserId: actorUserId, status: "LOCKED", blockerCount: readiness.blockerCount, warningCount: readiness.warningCount, informationCount: readiness.informationCount, checkCount: readiness.checkCount, canonicalHash: readiness.canonicalHash, sourceVersion: expectedVersion + 1, items: { create: readiness.checks.map((check) => ({ organizationId, checkKey: check.key, severity: check.severity, status: check.status, code: check.code, safeMessage: check.safeMessage, count: check.count, sourceUpdatedAt: check.sourceUpdatedAt ? new Date(check.sourceUpdatedAt) : undefined, metadataSafe: { title: check.title, detailsHref: check.detailsHref ?? null, canAcknowledge: check.canAcknowledge } })) } } });
      await this.auditLogService.log({ organizationId, actorUserId, action: "LOCK", entityType: "AccountingCloseCycle", entityId: cycle.id, after: { status: "LOCKED", lockedAt, readinessHash: readiness.canonicalHash, snapshotId: snapshot.id } }, tx);
      return { id: cycle.id, fiscalPeriodId: cycle.fiscalPeriodId, status: "LOCKED", version: expectedVersion + 1, lockedAt, lockedByUserId: actorUserId, readinessHash: readiness.canonicalHash };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }); } catch (error) { if (prismaErrorCode(error) === "P2034") throw new ConflictException("Close cycle changed. Reload and retry."); throw error; }
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

const snapshotSummarySelect = {
  id: true,
  closeCycleId: true,
  fiscalPeriodId: true,
  capturedAt: true,
  capturedByUserId: true,
  status: true,
  blockerCount: true,
  warningCount: true,
  informationCount: true,
  checkCount: true,
  canonicalHash: true,
  sourceVersion: true,
} as const;

const snapshotItemSelect = {
  checkKey: true,
  severity: true,
  status: true,
  code: true,
  safeMessage: true,
  count: true,
  currencyCode: true,
  sourceUpdatedAt: true,
  metadataSafe: true,
} as const;

const snapshotComparisonSelect = { ...snapshotSummarySelect, items: { select: snapshotItemSelect, orderBy: { checkKey: "asc" } } } as const;

function snapshotSummary(snapshot: {
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
  };
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
    items: snapshot.items.map(snapshotItemResponse),
  };
}

function snapshotItemResponse(item: { checkKey: string; severity: string; status: string; code: string; safeMessage: string; count: number | null; currencyCode: string | null; sourceUpdatedAt: Date | null; metadataSafe: Prisma.JsonValue | null }) {
  return { checkKey: item.checkKey, severity: item.severity, status: item.status, code: item.code, safeMessage: item.safeMessage, count: item.count, currencyCode: item.currencyCode, sourceUpdatedAt: item.sourceUpdatedAt, metadataSafe: item.metadataSafe };
}

function snapshotItemFingerprint(item: Parameters<typeof snapshotItemResponse>[0]) {
  const safe = snapshotItemResponse(item);
  return JSON.stringify({ ...safe, sourceUpdatedAt: safe.sourceUpdatedAt?.toISOString() ?? null, metadataSafe: stableJson(safe.metadataSafe) });
}

function stableJson(value: Prisma.JsonValue | null): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key] ?? null)}`).join(",")}}`;
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
