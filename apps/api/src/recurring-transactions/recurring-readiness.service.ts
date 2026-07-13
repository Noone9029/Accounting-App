import { Injectable } from "@nestjs/common";
import {
  DimensionStatus,
  ItemStatus,
  Prisma,
  RecurringExchangeRatePolicy,
  RecurringExpenseProposalStatus,
  RecurringRunStatus,
  RecurringTransactionStatus,
  RecurringTransactionType,
} from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

export interface RecurringReadinessPeriod {
  startsOn: Date;
  endsOn: Date;
}

type RecurringReadinessExecutor = PrismaService | Prisma.TransactionClient;

@Injectable()
export class RecurringReadinessService {
  constructor(private readonly prisma: PrismaService) {}

  async get(organizationId: string, period?: RecurringReadinessPeriod, executor: RecurringReadinessExecutor = this.prisma) {
    const now = period?.endsOn ?? new Date();
    const scheduledFor = period ? { gte: period.startsOn, lte: period.endsOn } : undefined;
    const templateCount = await executor.recurringTransactionTemplate.count({ where: { organizationId } });
    if (templateCount === 0) {
      return {
        status: "NOT_APPLICABLE" as const,
        templateCount: 0,
        activeTemplates: 0,
        dueTemplates: 0,
        failedRuns: 0,
        blockedRuns: 0,
        generatedDraftsAwaitingReview: 0,
        schedulesMissingReferences: 0,
        foreignTemplatesMissingRateEvidence: 0,
        runsScheduledInsideLockedPeriods: 0,
        blocksFiscalClose: false,
        asOf: now.toISOString(),
      };
    }

    const [
      latestTemplate,
      latestRun,
      activeTemplates,
      dueTemplates,
      foreignTemplatesMissingRateEvidence,
      failedRuns,
      blockedRuns,
      generatedDraftsAwaitingReview,
      missingReferenceRows,
      lockedPeriodRows,
    ] = await Promise.all([
      executor.recurringTransactionTemplate.findFirst({ where: { organizationId }, orderBy: { updatedAt: "desc" }, select: { updatedAt: true } }),
      executor.recurringTransactionRun.findFirst({ where: { organizationId, ...(scheduledFor ? { scheduledFor } : {}) }, orderBy: { updatedAt: "desc" }, select: { updatedAt: true } }),
      executor.recurringTransactionTemplate.count({ where: { organizationId, status: RecurringTransactionStatus.ACTIVE } }),
      executor.recurringTransactionTemplate.count({ where: { organizationId, status: RecurringTransactionStatus.ACTIVE, nextRunAt: { lte: now } } }),
      executor.recurringTransactionTemplate.count({
        where: {
          organizationId,
          status: { in: [RecurringTransactionStatus.DRAFT, RecurringTransactionStatus.ACTIVE, RecurringTransactionStatus.PAUSED] },
          OR: [
            { exchangeRatePolicy: RecurringExchangeRatePolicy.REQUIRE_RATE_AT_RUN },
            { exchangeRatePolicy: RecurringExchangeRatePolicy.FIXED_TEMPLATE_RATE, fixedExchangeRate: null },
            { exchangeRatePolicy: RecurringExchangeRatePolicy.RATE_SNAPSHOT, rateSnapshotId: null },
          ],
        },
      }),
      executor.recurringTransactionRun.count({ where: { organizationId, status: RecurringRunStatus.FAILED, ...(scheduledFor ? { scheduledFor } : {}) } }),
      executor.recurringTransactionRun.count({ where: { organizationId, status: RecurringRunStatus.BLOCKED, ...(scheduledFor ? { scheduledFor } : {}) } }),
      executor.recurringTransactionRun.count({
        where: {
          organizationId,
          status: RecurringRunStatus.GENERATED,
          ...(scheduledFor ? { scheduledFor } : {}),
          OR: [
            { generatedSalesInvoice: { is: { status: "DRAFT" } } },
            { generatedPurchaseBill: { is: { status: "DRAFT" } } },
            { generatedJournalEntry: { is: { status: "DRAFT" } } },
            { generatedExpenseProposal: { is: { status: RecurringExpenseProposalStatus.DRAFT } } },
          ],
        },
      }),
      executor.$queryRaw<Array<{ count: bigint }>>(Prisma.sql`
        SELECT COUNT(DISTINCT t."id")::bigint AS "count"
        FROM "RecurringTransactionTemplate" t
        WHERE t."organizationId" = ${organizationId}::uuid
          AND t."status" IN (${RecurringTransactionStatus.DRAFT}::"RecurringTransactionStatus", ${RecurringTransactionStatus.ACTIVE}::"RecurringTransactionStatus", ${RecurringTransactionStatus.PAUSED}::"RecurringTransactionStatus")
          AND (
            (t."transactionType" IN (${RecurringTransactionType.SALES_INVOICE}::"RecurringTransactionType", ${RecurringTransactionType.PURCHASE_BILL}::"RecurringTransactionType")
              AND NOT EXISTS (SELECT 1 FROM "Contact" c WHERE c."organizationId" = t."organizationId" AND c."id" = t."partyId" AND c."isActive" = true))
            OR (t."branchId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "Branch" b WHERE b."organizationId" = t."organizationId" AND b."id" = t."branchId"))
            OR EXISTS (
              SELECT 1 FROM "RecurringTransactionTemplateLine" l
              LEFT JOIN "Account" a ON a."organizationId" = l."organizationId" AND a."id" = l."accountId"
              LEFT JOIN "Item" i ON i."organizationId" = l."organizationId" AND i."id" = l."itemId"
              LEFT JOIN "TaxRate" x ON x."organizationId" = l."organizationId" AND x."id" = l."taxRateId"
              LEFT JOIN "CostCenter" cc ON cc."organizationId" = l."organizationId" AND cc."id" = l."costCenterId"
              LEFT JOIN "Project" p ON p."organizationId" = l."organizationId" AND p."id" = l."projectId"
              WHERE l."organizationId" = t."organizationId" AND l."templateId" = t."id"
                AND (a."id" IS NULL OR a."isActive" = false OR a."allowPosting" = false
                  OR (l."itemId" IS NOT NULL AND (i."id" IS NULL OR i."status" <> ${ItemStatus.ACTIVE}::"ItemStatus"))
                  OR (l."taxRateId" IS NOT NULL AND (x."id" IS NULL OR x."isActive" = false))
                  OR (l."costCenterId" IS NOT NULL AND (cc."id" IS NULL OR cc."status" <> ${DimensionStatus.ACTIVE}::"DimensionStatus"))
                  OR (l."projectId" IS NOT NULL AND (p."id" IS NULL OR p."status" <> ${DimensionStatus.ACTIVE}::"DimensionStatus")))
            )
          )
      `),
      executor.$queryRaw<Array<{ count: bigint }>>(Prisma.sql`
        SELECT COUNT(DISTINCT r."id")::bigint AS "count"
        FROM "RecurringTransactionRun" r
        JOIN "FiscalPeriod" f ON f."organizationId" = r."organizationId"
          AND r."scheduledLocalDate" >= f."startsOn"::date
          AND r."scheduledLocalDate" <= f."endsOn"::date
        WHERE r."organizationId" = ${organizationId}::uuid
          AND f."status" IN ('CLOSED'::"FiscalPeriodStatus", 'LOCKED'::"FiscalPeriodStatus")
          AND r."status" NOT IN (${RecurringRunStatus.SKIPPED}::"RecurringRunStatus", ${RecurringRunStatus.GENERATED}::"RecurringRunStatus")
          ${period ? Prisma.sql`AND r."scheduledLocalDate" >= ${period.startsOn}::date AND r."scheduledLocalDate" <= ${period.endsOn}::date` : Prisma.empty}
      `),
    ]);

    const schedulesMissingReferences = Number(missingReferenceRows[0]?.count ?? 0);
    const runsScheduledInsideLockedPeriods = Number(lockedPeriodRows[0]?.count ?? 0);
    const sourceUpdatedAt = latest([latestTemplate?.updatedAt, latestRun?.updatedAt]);
    const needsAttention = [dueTemplates, failedRuns, blockedRuns, generatedDraftsAwaitingReview, schedulesMissingReferences, foreignTemplatesMissingRateEvidence, runsScheduledInsideLockedPeriods].some((value) => value > 0);
    return {
      status: needsAttention ? "NEEDS_ATTENTION" as const : "READY" as const,
      templateCount,
      activeTemplates,
      dueTemplates,
      failedRuns,
      blockedRuns,
      generatedDraftsAwaitingReview,
      schedulesMissingReferences,
      foreignTemplatesMissingRateEvidence,
      runsScheduledInsideLockedPeriods,
      blocksFiscalClose: false,
      asOf: now.toISOString(),
      sourceUpdatedAt,
    };
  }
}

function latest(values: Array<Date | null | undefined>): string | undefined {
  const timestamps = values.filter((value): value is Date => value instanceof Date).map((value) => value.getTime());
  return timestamps.length ? new Date(Math.max(...timestamps)).toISOString() : undefined;
}
