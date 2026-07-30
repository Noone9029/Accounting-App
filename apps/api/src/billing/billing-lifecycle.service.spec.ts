import { ConflictException, NotFoundException } from "@nestjs/common";
import { BillingSubscriptionStatus } from "@prisma/client";
import { BillingLifecycleService } from "./billing-lifecycle.service";

describe("BillingLifecycleService", () => {
  function harness(
    status: BillingSubscriptionStatus = BillingSubscriptionStatus.PENDING,
    version = 1,
    dates: { currentPeriodEndsAt?: Date | null; graceDeadline?: Date | null } = {},
  ) {
    const subscription = {
      id: "sub-1",
      organizationId: "org-1",
      status,
      version,
      planVersionId: "plan-1",
      currentPeriodEndsAt: dates.currentPeriodEndsAt ?? null,
      graceDeadline: dates.graceDeadline ?? null,
    };
    const tx = {
      organizationSubscription: {
        findFirst: jest.fn().mockResolvedValue(subscription),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: jest.fn().mockImplementation(() => Promise.resolve({ ...subscription, status: nextStatus(status), version: version + 1 })),
      },
      billingLifecycleEvent: { findFirst: jest.fn().mockResolvedValue(null), create: jest.fn() },
      subscriptionScheduledChange: { findFirst: jest.fn(), updateMany: jest.fn(), create: jest.fn().mockResolvedValue({ id: "change-1" }) },
      billingPlanVersion: { findFirst: jest.fn().mockResolvedValue({ id: "plan-2" }) },
      auditLog: { create: jest.fn() },
    };
    const prisma = {
      $transaction: jest.fn((callback: (transaction: typeof tx) => unknown) => callback(tx)),
      organizationSubscription: { findMany: jest.fn().mockResolvedValue([]) },
      subscriptionScheduledChange: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const auditLog = { log: jest.fn().mockResolvedValue(undefined) };
    return { service: new BillingLifecycleService(prisma as never, auditLog as never), tx, auditLog, prisma };
  }

  it("starts an explicit trial with an immutable lifecycle record and audit event", async () => {
    const { service, tx, auditLog } = harness();
    const now = new Date("2026-07-30T00:00:00.000Z");
    const ends = new Date("2026-08-01T00:00:00.000Z");

    await service.transition({ organizationId: "org-1", subscriptionId: "sub-1", expectedVersion: 1, transition: "START_TRIAL", correlationId: "trial-1", trialEndsAt: ends, now });

    expect(tx.organizationSubscription.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ organizationId: "org-1", version: 1, status: "PENDING" }),
      data: expect.objectContaining({ status: "TRIALING", trialStartedAt: now, trialEndsAt: ends }),
    }));
    expect(tx.billingLifecycleEvent.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ eventType: "TRIAL_STARTED", correlationId: "trial-1" }) }));
    expect(auditLog.log).toHaveBeenCalledWith(expect.objectContaining({ entityType: "OrganizationSubscription", action: "START_TRIAL" }), tx);
  });

  it("rejects a duplicate correlation before it can mutate state", async () => {
    const { service, tx } = harness();
    tx.billingLifecycleEvent.findFirst.mockResolvedValue({ id: "event-1" });

    await expect(service.transition({ organizationId: "org-1", subscriptionId: "sub-1", expectedVersion: 1, transition: "START_TRIAL", correlationId: "trial-1", trialEndsAt: new Date("2026-08-01T00:00:00.000Z"), now: new Date("2026-07-30T00:00:00.000Z") })).rejects.toBeInstanceOf(ConflictException);
    expect(tx.organizationSubscription.updateMany).not.toHaveBeenCalled();
  });

  it("rejects stale versions and invalid terminal transitions", async () => {
    const stale = harness();
    stale.tx.organizationSubscription.updateMany.mockResolvedValue({ count: 0 });
    await expect(stale.service.transition({ organizationId: "org-1", subscriptionId: "sub-1", expectedVersion: 4, transition: "START_TRIAL", correlationId: "trial", trialEndsAt: new Date("2026-08-01T00:00:00.000Z"), now: new Date("2026-07-30T00:00:00.000Z") })).rejects.toBeInstanceOf(ConflictException);

    const invalid = harness(BillingSubscriptionStatus.CANCELED);
    await expect(invalid.service.transition({ organizationId: "org-1", subscriptionId: "sub-1", expectedVersion: 1, transition: "ACTIVATE", correlationId: "activate" })).rejects.toBeInstanceOf(ConflictException);
  });

  it("keeps a cancel-at-period-end subscription active until the paid period has ended", async () => {
    const now = new Date("2026-07-30T00:00:00.000Z");
    const periodEnd = new Date("2026-08-30T00:00:00.000Z");
    const scheduled = harness(BillingSubscriptionStatus.ACTIVE);

    await scheduled.service.transition({ organizationId: "org-1", subscriptionId: "sub-1", expectedVersion: 1, transition: "SCHEDULE_CANCELLATION", correlationId: "cancel-1", currentPeriodEndsAt: periodEnd, now });
    expect(scheduled.tx.organizationSubscription.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "CANCEL_AT_PERIOD_END", cancelAtPeriodEnd: true, currentPeriodEndsAt: periodEnd }) }));

    const beforeEnd = harness(BillingSubscriptionStatus.CANCEL_AT_PERIOD_END, 2, { currentPeriodEndsAt: periodEnd });
    await expect(beforeEnd.service.transition({ organizationId: "org-1", subscriptionId: "sub-1", expectedVersion: 2, transition: "CANCEL", correlationId: "cancel-final", now })).rejects.toBeInstanceOf(ConflictException);

    const afterEnd = harness(BillingSubscriptionStatus.CANCEL_AT_PERIOD_END, 2, { currentPeriodEndsAt: periodEnd });
    await afterEnd.service.transition({ organizationId: "org-1", subscriptionId: "sub-1", expectedVersion: 2, transition: "CANCEL", correlationId: "cancel-final", now: new Date("2026-08-31T00:00:00.000Z") });
    expect(afterEnd.tx.organizationSubscription.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "CANCELED" }) }));

    const grace = harness(BillingSubscriptionStatus.GRACE, 1, { graceDeadline: periodEnd });
    await expect(grace.service.transition({ organizationId: "org-1", subscriptionId: "sub-1", expectedVersion: 1, transition: "SCHEDULE_CANCELLATION", correlationId: "cancel-grace", currentPeriodEndsAt: periodEnd, now })).rejects.toBeInstanceOf(ConflictException);
  });

  it("enters read-only suspension only after grace expires", async () => {
    const deadline = new Date("2026-07-31T00:00:00.000Z");
    const beforeExpiry = harness(BillingSubscriptionStatus.GRACE, 1, { graceDeadline: deadline });
    await expect(beforeExpiry.service.transition({ organizationId: "org-1", subscriptionId: "sub-1", expectedVersion: 1, transition: "EXPIRE_GRACE", correlationId: "grace", now: new Date("2026-07-30T00:00:00.000Z") })).rejects.toBeInstanceOf(ConflictException);

    const afterExpiry = harness(BillingSubscriptionStatus.GRACE, 1, { graceDeadline: deadline });
    await afterExpiry.service.transition({ organizationId: "org-1", subscriptionId: "sub-1", expectedVersion: 1, transition: "EXPIRE_GRACE", correlationId: "grace", now: new Date("2026-08-01T00:00:00.000Z") });
    expect(afterExpiry.tx.organizationSubscription.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "SUSPENDED" }) }));
  });

  it("reactivates only before cancellation becomes final", async () => {
    const periodEnd = new Date("2026-08-30T00:00:00.000Z");
    const reactivated = harness(BillingSubscriptionStatus.CANCEL_AT_PERIOD_END, 2, { currentPeriodEndsAt: periodEnd });
    await reactivated.service.transition({ organizationId: "org-1", subscriptionId: "sub-1", expectedVersion: 2, transition: "REACTIVATE", correlationId: "reactivate", now: new Date("2026-08-01T00:00:00.000Z") });
    expect(reactivated.tx.organizationSubscription.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "ACTIVE", cancelAtPeriodEnd: false }) }));

    const tooLate = harness(BillingSubscriptionStatus.CANCEL_AT_PERIOD_END, 2, { currentPeriodEndsAt: periodEnd });
    await expect(tooLate.service.transition({ organizationId: "org-1", subscriptionId: "sub-1", expectedVersion: 2, transition: "REACTIVATE", correlationId: "reactivate", now: new Date("2026-09-01T00:00:00.000Z") })).rejects.toBeInstanceOf(ConflictException);
  });

  it("scopes transitions to the requesting organization", async () => {
    const { service, tx } = harness();
    tx.organizationSubscription.findFirst.mockResolvedValue(null);
    await expect(service.transition({ organizationId: "org-2", subscriptionId: "sub-1", expectedVersion: 1, transition: "START_TRIAL", correlationId: "foreign", trialEndsAt: new Date("2026-08-01T00:00:00.000Z"), now: new Date("2026-07-30T00:00:00.000Z") })).rejects.toBeInstanceOf(NotFoundException);
  });

  it("schedules a plan change once and records a lifecycle audit event", async () => {
    const { service, tx, auditLog } = harness(BillingSubscriptionStatus.ACTIVE);
    await service.schedulePlanChange({ organizationId: "org-1", subscriptionId: "sub-1", expectedVersion: 1, targetPlanVersionId: "plan-2", effectiveAt: new Date("2026-08-30T00:00:00.000Z"), correlationId: "change-1" });
    expect(tx.organizationSubscription.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ organizationId: "org-1", version: 1 }) }));
    expect(tx.billingLifecycleEvent.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ eventType: "PLAN_CHANGE_SCHEDULED" }) }));
    expect(auditLog.log).toHaveBeenCalledWith(expect.objectContaining({ action: "SCHEDULE_PLAN_CHANGE" }), tx);
  });

  it("processes due transitions sequentially and treats a competing worker as a safe skip", async () => {
    const { service, prisma } = harness();
    prisma.organizationSubscription.findMany.mockResolvedValue([
      { id: "grace-sub", organizationId: "org-1", version: 3, status: BillingSubscriptionStatus.GRACE },
      { id: "cancel-sub", organizationId: "org-2", version: 7, status: BillingSubscriptionStatus.CANCEL_AT_PERIOD_END },
    ]);
    jest.spyOn(service, "transition")
      .mockResolvedValueOnce({ id: "grace-sub" } as never)
      .mockRejectedValueOnce(new ConflictException("another worker won"));

    await expect(service.processDueTransitions({ now: new Date("2026-08-01T00:00:00.000Z"), batchSize: 10 })).resolves.toEqual({ processed: 1, skipped: 1 });
    expect(service.transition).toHaveBeenNthCalledWith(1, expect.objectContaining({ transition: "EXPIRE_GRACE", expectedVersion: 3 }));
    expect(service.transition).toHaveBeenNthCalledWith(2, expect.objectContaining({ transition: "CANCEL", expectedVersion: 7 }));
  });

  it("applies a due scheduled plan change once with an immutable lifecycle event and audit record", async () => {
    const { service, prisma, tx, auditLog } = harness(BillingSubscriptionStatus.ACTIVE);
    prisma.subscriptionScheduledChange.findMany.mockResolvedValue([{ id: "change-1" }]);
    tx.subscriptionScheduledChange.findFirst.mockResolvedValue({
      id: "change-1",
      organizationId: "org-1",
      subscriptionId: "sub-1",
      currentPlanVersionId: "plan-1",
      targetPlanVersionId: "plan-2",
      reasonCode: "PLAN_CHANGE",
    });
    tx.subscriptionScheduledChange.updateMany.mockResolvedValue({ count: 1 });

    await expect(service.processDuePlanChanges({ now: new Date("2026-08-01T00:00:00.000Z") })).resolves.toEqual({ processed: 1, skipped: 0 });
    expect(tx.organizationSubscription.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ planVersionId: "plan-2" }) }));
    expect(tx.billingLifecycleEvent.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ eventType: "PLAN_CHANGE_APPLIED", correlationId: "billing-plan-change:change-1" }) }));
    expect(auditLog.log).toHaveBeenCalledWith(expect.objectContaining({ action: "APPLY_PLAN_CHANGE" }), tx);
  });

  it("marks an obsolete scheduled plan change as superseded instead of retrying it forever", async () => {
    const { service, prisma, tx } = harness(BillingSubscriptionStatus.ACTIVE);
    prisma.subscriptionScheduledChange.findMany.mockResolvedValue([{ id: "stale-change" }]);
    tx.subscriptionScheduledChange.findFirst.mockResolvedValue({
      id: "stale-change",
      organizationId: "org-1",
      subscriptionId: "sub-1",
      currentPlanVersionId: "old-plan",
      targetPlanVersionId: "plan-2",
      reasonCode: "PLAN_CHANGE",
    });

    await expect(service.processDuePlanChanges({ now: new Date("2026-08-01T00:00:00.000Z") })).resolves.toEqual({ processed: 0, skipped: 1 });
    expect(tx.subscriptionScheduledChange.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: { status: "SUPERSEDED" } }));
    expect(tx.organizationSubscription.updateMany).not.toHaveBeenCalled();
  });
});

function nextStatus(status: BillingSubscriptionStatus): BillingSubscriptionStatus {
  if (status === BillingSubscriptionStatus.PENDING) return BillingSubscriptionStatus.TRIALING;
  if (status === BillingSubscriptionStatus.GRACE) return BillingSubscriptionStatus.SUSPENDED;
  if (status === BillingSubscriptionStatus.CANCEL_AT_PERIOD_END) return BillingSubscriptionStatus.CANCELED;
  return BillingSubscriptionStatus.ACTIVE;
}
