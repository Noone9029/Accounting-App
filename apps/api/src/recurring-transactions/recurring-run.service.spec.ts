import { BadRequestException, ConflictException } from "@nestjs/common";
import { RecurringRunStatus, RecurringTransactionStatus, RecurringTransactionType } from "@prisma/client";
import { RecurringRunService } from "./recurring-run.service";

function makeHarness() {
  const template = {
    id: "template-1",
    organizationId: "org-1",
    transactionType: RecurringTransactionType.SALES_INVOICE,
    status: RecurringTransactionStatus.ACTIVE,
    templateVersion: 2,
    timezone: "Asia/Dubai",
    frequency: "MONTHLY",
    interval: 1,
    dayOfMonth: 31,
    dayOfWeek: null,
    monthOfYear: null,
    startDate: new Date("2026-01-31T00:00:00.000Z"),
    endDate: null,
    nextRunAt: new Date("2026-07-30T20:00:00.000Z"),
    catchUpPolicy: "SKIP_MISSED",
    currencyCode: "AED",
    exchangeRatePolicy: "BASE_CURRENCY_ONLY",
    fixedExchangeRate: null,
    rateSnapshotId: null,
    lines: [],
  };
  const pendingRun = {
    id: "run-1",
    organizationId: "org-1",
    templateId: "template-1",
    templateVersion: 2,
    scheduledFor: new Date("2026-07-12T08:00:00.000Z"),
    scheduledLocalDate: new Date("2026-07-12T00:00:00.000Z"),
    timezone: "Asia/Dubai",
    trigger: "MANUAL",
    status: RecurringRunStatus.PENDING,
    attemptCount: 0,
    idempotencyKey: "manual-1",
    sourceSnapshot: {},
    template,
  };
  const tx = {
    recurringTransactionTemplate: {
      findFirst: jest.fn().mockResolvedValue(template),
      update: jest.fn(),
    },
    recurringTransactionRun: {
      findFirst: jest.fn(),
      create: jest.fn().mockResolvedValue(pendingRun),
      update: jest.fn().mockImplementation(({ data }: { data: object }) => Promise.resolve({ ...pendingRun, ...data })),
    },
    $queryRaw: jest.fn().mockResolvedValue([]),
  };
  const prisma = {
    recurringTransactionRun: { findFirst: jest.fn() },
    $transaction: jest.fn(async (callback: (executor: typeof tx) => unknown) => callback(tx)),
  };
  const auditLog = { log: jest.fn().mockResolvedValue(undefined) };
  const dispatcher = {
    generate: jest.fn().mockResolvedValue({ generatedEntityType: "SALES_INVOICE", generatedEntityId: "invoice-1", link: { generatedSalesInvoiceId: "invoice-1" } }),
  };
  const fiscalPeriodGuard = { assertPostingDateAllowed: jest.fn().mockResolvedValue(undefined) };
  const service = new RecurringRunService(prisma as never, auditLog as never, dispatcher as never, fiscalPeriodGuard as never);
  return { service, prisma, tx, auditLog, dispatcher, fiscalPeriodGuard, template, pendingRun };
}

describe("RecurringRunService", () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date("2026-07-12T08:00:00.000Z"));
  });

  afterEach(() => jest.useRealTimers());

  it("requires a bounded idempotency key for manual run-now", async () => {
    const { service, tx } = makeHarness();
    await expect(service.runNow("org-1", "user-1", "template-1", "")).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.recurringTransactionRun.create).not.toHaveBeenCalled();
  });

  it("returns the existing successful manual result on retry", async () => {
    const { service, prisma, dispatcher } = makeHarness();
    const generated = { id: "run-existing", status: RecurringRunStatus.GENERATED, generatedSalesInvoiceId: "invoice-existing" };
    prisma.recurringTransactionRun.findFirst.mockResolvedValue(generated);

    await expect(service.runNow("org-1", "user-1", "template-1", "manual-1")).resolves.toBe(generated);
    expect(dispatcher.generate).not.toHaveBeenCalled();
  });

  it("resumes an existing pending manual run after a process interruption", async () => {
    const { service, prisma, pendingRun, dispatcher } = makeHarness();
    prisma.recurringTransactionRun.findFirst.mockResolvedValue(pendingRun);

    await expect(service.runNow("org-1", "user-1", "template-1", "manual-1")).resolves.toEqual(
      expect.objectContaining({ status: RecurringRunStatus.GENERATED }),
    );
    expect(dispatcher.generate).toHaveBeenCalledTimes(1);
  });

  it("creates and generates one manual draft run with same-transaction audit evidence", async () => {
    const { service, tx, dispatcher, fiscalPeriodGuard, auditLog } = makeHarness();

    const result = await service.runNow("org-1", "user-1", "template-1", "manual-1", "request-1");

    expect(tx.recurringTransactionRun.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: "org-1",
        templateId: "template-1",
        templateVersion: 2,
        scheduledFor: new Date("2026-07-12T08:00:00.000Z"),
        scheduledLocalDate: new Date("2026-07-12T00:00:00.000Z"),
        trigger: "MANUAL",
        status: RecurringRunStatus.PENDING,
        idempotencyKey: "manual-1",
        requestId: "request-1",
      }),
      include: expect.any(Object),
    });
    expect(fiscalPeriodGuard.assertPostingDateAllowed).toHaveBeenCalledWith("org-1", new Date("2026-07-12T00:00:00.000Z"), tx);
    expect(dispatcher.generate).toHaveBeenCalledWith(
      RecurringTransactionType.SALES_INVOICE,
      expect.objectContaining({ runId: "run-1", templateId: "template-1" }),
      tx,
    );
    expect(tx.recurringTransactionRun.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: RecurringRunStatus.GENERATED, generatedSalesInvoiceId: "invoice-1", completedAt: expect.any(Date) }),
    }));
    expect(auditLog.log).toHaveBeenCalledWith(expect.objectContaining({ action: "REQUEST_MANUAL", request: expect.objectContaining({ requestId: "request-1" }) }), tx);
    expect(auditLog.log).toHaveBeenCalledWith(expect.objectContaining({ action: "GENERATE" }), tx);
    expect(result).toEqual(expect.objectContaining({ status: RecurringRunStatus.GENERATED }));
  });

  it("records a locked-period occurrence as blocked without dispatching", async () => {
    const { service, tx, dispatcher, fiscalPeriodGuard, auditLog } = makeHarness();
    fiscalPeriodGuard.assertPostingDateAllowed.mockRejectedValue(new BadRequestException("Posting date falls in a locked fiscal period."));

    const result = await service.runNow("org-1", "user-1", "template-1", "manual-locked");

    expect(dispatcher.generate).not.toHaveBeenCalled();
    expect(tx.recurringTransactionRun.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        status: RecurringRunStatus.BLOCKED,
        failureCode: "FISCAL_PERIOD_BLOCKED",
        failureMessageSafe: "Posting date falls in a locked fiscal period.",
        failureRetriable: false,
      }),
    }));
    expect(auditLog.log).toHaveBeenCalledWith(expect.objectContaining({ action: "BLOCK" }), tx);
    expect(result.status).toBe(RecurringRunStatus.BLOCKED);
  });

  it("records safe retriable failure evidence without leaking raw database text", async () => {
    const { service, tx, dispatcher, auditLog } = makeHarness();
    dispatcher.generate.mockRejectedValue(Object.assign(new Error("postgresql://secret@host internal relation"), { code: "P1001" }));

    const result = await service.runNow("org-1", "user-1", "template-1", "manual-failed");

    expect(tx.recurringTransactionRun.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: RecurringRunStatus.FAILED, failureCode: "GENERATION_RETRIABLE", failureMessageSafe: "Draft generation failed and can be retried.", failureRetriable: true }),
    }));
    expect(auditLog.log).toHaveBeenCalledWith(expect.objectContaining({ action: "FAIL" }), tx);
    expect(JSON.stringify(result)).not.toContain("secret@host");
  });

  it("retries Prisma serialization conflicts and maps exhaustion to a safe conflict", async () => {
    const { service, prisma, tx } = makeHarness();
    const conflict = Object.assign(new Error("serialization"), { code: "P2034" });
    prisma.$transaction.mockRejectedValueOnce(conflict).mockRejectedValueOnce(conflict).mockImplementationOnce(async (callback: (executor: typeof tx) => unknown) => callback(tx));

    await expect(service.runNow("org-1", "user-1", "template-1", "manual-retry")).resolves.toEqual(expect.objectContaining({ status: RecurringRunStatus.GENERATED }));
    expect(prisma.$transaction).toHaveBeenCalledTimes(4);

    const blocked = makeHarness();
    blocked.prisma.$transaction.mockRejectedValue(conflict);
    await expect(blocked.service.runNow("org-1", "user-1", "template-1", "manual-conflict")).rejects.toBeInstanceOf(ConflictException);
  });

  it("retries a serialization conflict during draft generation without creating a second run", async () => {
    const { service, prisma, tx, dispatcher } = makeHarness();
    const conflict = Object.assign(new Error("serialization"), { code: "P2034" });
    let transactionNumber = 0;
    prisma.$transaction.mockImplementation(async (callback: (executor: typeof tx) => unknown) => {
      transactionNumber += 1;
      if (transactionNumber === 2) throw conflict;
      return callback(tx);
    });

    await expect(service.runNow("org-1", "user-1", "template-1", "manual-generation-retry")).resolves.toEqual(
      expect.objectContaining({ status: RecurringRunStatus.GENERATED }),
    );
    expect(tx.recurringTransactionRun.create).toHaveBeenCalledTimes(1);
    expect(dispatcher.generate).toHaveBeenCalledTimes(1);
  });

  it("claims due templates with SKIP LOCKED instead of blocking peer workers", async () => {
    const { service, tx } = makeHarness();
    tx.$queryRaw.mockResolvedValue([{ id: "template-1" }]);
    tx.recurringTransactionTemplate.findFirst.mockResolvedValue(null);

    await service.processDue({ workerClaimId: "worker-1", limit: 10, now: new Date("2026-07-31T00:00:00.000Z") });

    const query = tx.$queryRaw.mock.calls[0]?.[0] as { strings?: readonly string[] };
    const sql = query.strings?.join("?") ?? "";
    expect(sql).toContain("FOR UPDATE SKIP LOCKED");
    expect(sql).toContain('"nextRunAt" <=');
  });
});
