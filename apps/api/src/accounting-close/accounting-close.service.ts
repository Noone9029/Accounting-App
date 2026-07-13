import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { FiscalPeriodStatus, Prisma } from "@prisma/client";
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

  async readiness(organizationId: string, fiscalPeriodId: string) {
    const fiscalPeriod = await this.prisma.fiscalPeriod.findFirst({ where: { id: fiscalPeriodId, organizationId } });
    if (!fiscalPeriod) throw new NotFoundException("Fiscal period not found.");

    const [fx, recurring] = await Promise.allSettled([
      this.fxCloseReadinessService.readiness(organizationId, fiscalPeriod.endsOn),
      this.recurringReadinessService.get(organizationId, { startsOn: fiscalPeriod.startsOn, endsOn: fiscalPeriod.endsOn }),
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
