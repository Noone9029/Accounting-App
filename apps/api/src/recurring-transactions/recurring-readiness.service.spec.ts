import { RecurringReadinessService } from "./recurring-readiness.service";

function makeHarness(counts: Partial<Record<string, number>> = {}) {
  const prisma = {
    recurringTransactionTemplate: {
      count: jest.fn()
        .mockResolvedValueOnce(counts.templates ?? 2)
        .mockResolvedValueOnce(counts.active ?? 1)
        .mockResolvedValueOnce(counts.due ?? 0)
        .mockResolvedValueOnce(counts.foreignMissingRate ?? 0),
      findFirst: jest.fn().mockResolvedValue({ updatedAt: new Date("2026-06-30T10:00:00.000Z") }),
    },
    recurringTransactionRun: {
      count: jest.fn()
        .mockResolvedValueOnce(counts.failed ?? 0)
        .mockResolvedValueOnce(counts.blocked ?? 0)
        .mockResolvedValueOnce(counts.drafts ?? 0),
      findFirst: jest.fn().mockResolvedValue({ updatedAt: new Date("2026-06-30T11:00:00.000Z") }),
    },
    $queryRaw: jest.fn()
      .mockResolvedValueOnce([{ count: BigInt(counts.missingReferences ?? 0) }])
      .mockResolvedValueOnce([{ count: BigInt(counts.lockedPeriodRuns ?? 0) }]),
  };
  return { service: new RecurringReadinessService(prisma as never), prisma };
}

describe("RecurringReadinessService", () => {
  it("returns NOT_APPLICABLE when the organization has no recurring templates", async () => {
    const { service } = makeHarness({ templates: 0 });
    await expect(service.get("org-1")).resolves.toEqual(expect.objectContaining({ status: "NOT_APPLICABLE", templateCount: 0 }));
  });

  it("returns real attention counts without claiming to block fiscal close", async () => {
    const { service, prisma } = makeHarness({ due: 2, failed: 1, blocked: 3, drafts: 4, missingReferences: 5, foreignMissingRate: 6, lockedPeriodRuns: 7 });
    await expect(service.get("org-1")).resolves.toEqual({
      status: "NEEDS_ATTENTION",
      templateCount: 2,
      activeTemplates: 1,
      dueTemplates: 2,
      failedRuns: 1,
      blockedRuns: 3,
      generatedDraftsAwaitingReview: 4,
      schedulesMissingReferences: 5,
      foreignTemplatesMissingRateEvidence: 6,
      runsScheduledInsideLockedPeriods: 7,
      blocksFiscalClose: false,
      asOf: expect.any(String),
      sourceUpdatedAt: "2026-06-30T11:00:00.000Z",
    });
    for (const [query] of prisma.$queryRaw.mock.calls) {
      expect((query as { strings: string[] }).strings.join("?")).toContain('"organizationId"');
    }
  });

  it("scopes run exceptions to the requested fiscal period instead of current unrelated activity", async () => {
    const { service, prisma } = makeHarness({ failed: 1, blocked: 1, drafts: 1 });
    const startsOn = new Date("2026-06-01T00:00:00.000Z");
    const endsOn = new Date("2026-06-30T23:59:59.999Z");

    await service.get("org-1", { startsOn, endsOn });

    for (const [call] of prisma.recurringTransactionRun.count.mock.calls) {
      expect(call.where).toEqual(expect.objectContaining({
        organizationId: "org-1",
        scheduledFor: { gte: startsOn, lte: endsOn },
      }));
    }
    expect(prisma.recurringTransactionTemplate.count).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ nextRunAt: { lte: endsOn } }),
    }));
    const lockedPeriodQuery = prisma.$queryRaw.mock.calls[1][0] as { strings: string[] };
    expect(lockedPeriodQuery.strings.join("?")).toContain('r."scheduledLocalDate" >=');
    expect(lockedPeriodQuery.strings.join("?")).toContain('r."scheduledLocalDate" <=');
  });
});
