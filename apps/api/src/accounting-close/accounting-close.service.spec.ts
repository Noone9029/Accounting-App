import { BadRequestException, NotFoundException } from "@nestjs/common";
import { FiscalPeriodStatus } from "@prisma/client";
import { AccountingCloseService } from "./accounting-close.service";

describe("AccountingCloseService", () => {
  const period = { id: "period-1", organizationId: "org-1", name: "June 2026", startsOn: new Date("2026-06-01T00:00:00.000Z"), endsOn: new Date("2026-06-30T23:59:59.999Z"), status: FiscalPeriodStatus.OPEN };

  function createService() {
    const prisma = { fiscalPeriod: { findFirst: jest.fn().mockResolvedValue(period) } };
    const fx = {
      readiness: jest.fn().mockResolvedValue({
        status: "BLOCKED", asOf: "2026-06-30", counts: { foreignDocuments: 1 }, actions: [],
        blockers: [{ code: "MISSING_CLOSING_RATE", count: 1, message: "Capture a closing rate.", actionHref: "/settings/currencies-fx" }],
      }),
    };
    const recurring = {
      get: jest.fn().mockResolvedValue({
        status: "NEEDS_ATTENTION", templateCount: 1, activeTemplates: 1, dueTemplates: 1, failedRuns: 0, blockedRuns: 0,
        generatedDraftsAwaitingReview: 0, schedulesMissingReferences: 0, foreignTemplatesMissingRateEvidence: 0,
        runsScheduledInsideLockedPeriods: 0, blocksFiscalClose: false, asOf: "2026-07-13T00:00:00.000Z",
      }),
    };
    const auditLog = { log: jest.fn().mockResolvedValue(undefined) };
    return { service: new AccountingCloseService(prisma as never, fx as never, recurring as never, auditLog as never), prisma, fx, recurring, auditLog };
  }

  it("uses tenant-scoped fiscal dates and existing domain readiness without reclassifying policy", async () => {
    const { service, prisma, fx, recurring } = createService();

    await expect(service.readiness("org-1", "period-1")).resolves.toMatchObject({
      fiscalPeriod: { id: "period-1", status: FiscalPeriodStatus.OPEN },
      blockerCount: 1,
      warningCount: 1,
      checks: expect.arrayContaining([
        expect.objectContaining({ code: "MISSING_CLOSING_RATE", severity: "BLOCKER", status: "BLOCKED", canAcknowledge: false }),
        expect.objectContaining({ code: "RECURRING_DUE", severity: "WARNING", status: "OPEN", canAcknowledge: true }),
      ]),
      canonicalHash: expect.any(String),
    });

    expect(prisma.fiscalPeriod.findFirst).toHaveBeenCalledWith({ where: { id: "period-1", organizationId: "org-1" } });
    expect(fx.readiness).toHaveBeenCalledWith("org-1", period.endsOn);
    expect(recurring.get).toHaveBeenCalledWith("org-1", { startsOn: period.startsOn, endsOn: period.endsOn });
  });

  it("fails closed when the requested fiscal period is outside the active tenant", async () => {
    const { service, prisma } = createService();
    prisma.fiscalPeriod.findFirst.mockResolvedValue(null);

    await expect(service.readiness("org-1", "other-tenant-period")).rejects.toBeInstanceOf(NotFoundException);
  });

  it("returns a safe non-acknowledgeable blocker when an authoritative category is unavailable", async () => {
    const { service, fx } = createService();
    fx.readiness.mockRejectedValue(new Error("database connection details must not escape"));

    await expect(service.readiness("org-1", "period-1")).resolves.toMatchObject({
      blockerCount: 1,
      checks: expect.arrayContaining([
        expect.objectContaining({ key: "fx.error", severity: "BLOCKER", status: "ERROR", code: "FX_READINESS_UNAVAILABLE", canAcknowledge: false }),
      ]),
    });
  });

  it("creates one tenant-scoped cycle with the standard required manual tasks and an audit event", async () => {
    const { service, prisma, auditLog } = createService();
    const tx = {
      fiscalPeriod: { findFirst: jest.fn().mockResolvedValue(period) },
      accountingCloseCycle: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: "cycle-1", organizationId: "org-1", fiscalPeriodId: "period-1", status: "IN_PROGRESS" }),
      },
    };
    Object.assign(prisma, { $transaction: jest.fn((callback) => callback(tx)) });

    await expect(service.createCycle("org-1", "user-1", "period-1")).resolves.toMatchObject({ id: "cycle-1" });

    expect(tx.accountingCloseCycle.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        organizationId: "org-1",
        fiscalPeriodId: "period-1",
        startedByUserId: "user-1",
        tasks: { create: expect.arrayContaining([
          expect.objectContaining({ taskType: "BANK_RECONCILIATION", isRequired: true, source: "STANDARD_TEMPLATE" }),
          expect.objectContaining({ taskType: "REVIEWER_SIGN_OFF", isRequired: true, source: "STANDARD_TEMPLATE" }),
        ]) },
      }),
    }));
    expect(auditLog.log).toHaveBeenCalledWith(expect.objectContaining({ organizationId: "org-1", actorUserId: "user-1", action: "START", entityType: "AccountingCloseCycle", entityId: "cycle-1" }), tx);
  });

  it("rejects a cycle for a closed or locked fiscal period", async () => {
    const { service, prisma } = createService();
    Object.assign(prisma, { $transaction: jest.fn((callback) => callback({ fiscalPeriod: { findFirst: jest.fn().mockResolvedValue({ ...period, status: FiscalPeriodStatus.LOCKED }) } })) });

    await expect(service.createCycle("org-1", "user-1", "period-1")).rejects.toBeInstanceOf(BadRequestException);
  });

  it("replays the existing cycle when a concurrent unique claim wins", async () => {
    const { service, prisma } = createService();
    const existing = { id: "cycle-existing", organizationId: "org-1", fiscalPeriodId: "period-1", status: "IN_PROGRESS" };
    Object.assign(prisma, {
      $transaction: jest.fn().mockRejectedValue({ code: "P2002" }),
      accountingCloseCycle: { findFirst: jest.fn().mockResolvedValue(existing) },
    });

    await expect(service.createCycle("org-1", "user-1", "period-1")).resolves.toEqual(existing);
  });

  it("replays the existing cycle when serializable retries are exhausted", async () => {
    const { service, prisma } = createService();
    const existing = { id: "cycle-existing", organizationId: "org-1", fiscalPeriodId: "period-1", status: "IN_PROGRESS" };
    Object.assign(prisma, {
      $transaction: jest.fn().mockRejectedValue({ code: "P2034" }),
      accountingCloseCycle: { findFirst: jest.fn().mockResolvedValue(existing) },
    });

    await expect(service.createCycle("org-1", "user-1", "period-1")).resolves.toEqual(existing);
  });
});
