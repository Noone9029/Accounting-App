import { BadRequestException, NotFoundException } from "@nestjs/common";
import {
  RecurringCatchUpPolicy,
  RecurringExchangeRatePolicy,
  RecurringFrequency,
  RecurringTransactionStatus,
  RecurringTransactionType,
  SalesInvoiceTaxMode,
} from "@prisma/client";
import type { CreateRecurringTransactionDto } from "./dto/create-recurring-transaction.dto";
import { RecurringTemplateService } from "./recurring-template.service";

const salesDto: CreateRecurringTransactionDto = {
  transactionType: RecurringTransactionType.SALES_INVOICE,
  name: "Monthly support",
  frequency: RecurringFrequency.MONTHLY,
  interval: 1,
  startDate: "2026-01-31",
  endDate: null,
  dayOfMonth: 31,
  dayOfWeek: null,
  monthOfYear: null,
  catchUpPolicy: RecurringCatchUpPolicy.SKIP_MISSED,
  currencyCode: "AED",
  exchangeRatePolicy: RecurringExchangeRatePolicy.BASE_CURRENCY_ONLY,
  partyId: "customer-1",
  paymentTermsDays: 30,
  taxMode: SalesInvoiceTaxMode.TAX_EXCLUSIVE,
  lines: [
    {
      accountId: "revenue-1",
      description: "Support retainer",
      quantity: "1.0000",
      unitPrice: "100.0000",
      discountRate: "0.0000",
      sortOrder: 0,
    },
  ],
};

function makeHarness() {
  const created = {
    id: "template-1",
    organizationId: "org-1",
    templateCode: "REC-000001",
    status: RecurringTransactionStatus.DRAFT,
    templateVersion: 1,
    transactionType: RecurringTransactionType.SALES_INVOICE,
    name: salesDto.name,
    timezone: "Asia/Dubai",
    frequency: RecurringFrequency.MONTHLY,
    interval: 1,
    startDate: new Date("2026-01-31T00:00:00.000Z"),
    endDate: null,
    nextRunAt: new Date("2026-01-30T20:00:00.000Z"),
    updatedAt: new Date("2026-07-12T00:00:00.000Z"),
    lines: [
      {
        itemId: null,
        accountId: "revenue-1",
        taxRateId: null,
        costCenterId: null,
        projectId: null,
        description: "Support retainer",
        quantity: "1.0000",
        unitPrice: "100.0000",
        discountRate: "0.0000",
        debit: "0.0000",
        credit: "0.0000",
        sortOrder: 0,
      },
    ],
    runs: [],
  };
  const tx = {
    organization: {
      findUnique: jest.fn().mockResolvedValue({ id: "org-1", timezone: "Asia/Dubai", baseCurrency: "AED" }),
    },
    contact: {
      findFirst: jest.fn().mockResolvedValue({ id: "customer-1", type: "CUSTOMER", isActive: true }),
    },
    branch: { findFirst: jest.fn().mockResolvedValue({ id: "branch-1" }) },
    account: {
      findMany: jest.fn().mockImplementation(({ where }: { where: { id: { in: string[] } } }) =>
        Promise.resolve(where.id.in.map((id) => ({ id, isActive: true, allowPosting: true }))),
      ),
    },
    item: { findMany: jest.fn().mockResolvedValue([]) },
    taxRate: { findMany: jest.fn().mockResolvedValue([]) },
    costCenter: {
      findMany: jest.fn().mockImplementation(({ where }: { where: { id: { in: string[] } } }) =>
        Promise.resolve(where.id.in.map((id) => ({ id, status: "ACTIVE" }))),
      ),
    },
    project: {
      findMany: jest.fn().mockImplementation(({ where }: { where: { id: { in: string[] } } }) =>
        Promise.resolve(where.id.in.map((id) => ({ id, status: "ACTIVE" }))),
      ),
    },
    currencyRateSnapshot: { findFirst: jest.fn() },
    recurringTransactionTemplate: {
      create: jest.fn().mockResolvedValue(created),
      findFirst: jest.fn(),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      update: jest.fn(),
    },
  };
  const prisma = {
    $transaction: jest.fn(async (callback: (executor: typeof tx) => unknown) => callback(tx)),
    recurringTransactionTemplate: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
    },
  };
  const auditLog = { log: jest.fn().mockResolvedValue(undefined) };
  const numberSequence = { next: jest.fn().mockResolvedValue("REC-000001") };
  const service = new RecurringTemplateService(prisma as never, auditLog as never, numberSequence as never);
  return { service, prisma, tx, auditLog, numberSequence, created };
}

describe("RecurringTemplateService", () => {
  it("returns a bounded tenant-scoped template page with filters", async () => {
    const { service, prisma, created } = makeHarness();
    prisma.recurringTransactionTemplate.findMany.mockResolvedValue([created]);
    prisma.recurringTransactionTemplate.count.mockResolvedValue(1);

    await expect(service.list("org-1", {
      transactionType: RecurringTransactionType.SALES_INVOICE,
      status: RecurringTransactionStatus.ACTIVE,
      currency: "aed",
      page: 2,
      limit: 25,
      hasFailedOrBlockedRun: true,
    })).resolves.toEqual({ items: [created], page: 2, limit: 25, total: 1, totalPages: 1 });
    expect(prisma.recurringTransactionTemplate.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        organizationId: "org-1",
        transactionType: RecurringTransactionType.SALES_INVOICE,
        status: RecurringTransactionStatus.ACTIVE,
        currencyCode: "AED",
        runs: { some: { status: { in: ["BLOCKED", "FAILED"] } } },
      }),
      skip: 25,
      take: 25,
    }));
  });

  it("gets templates only inside the active tenant", async () => {
    const { service, prisma, created } = makeHarness();
    prisma.recurringTransactionTemplate.findFirst.mockResolvedValueOnce(created).mockResolvedValueOnce(null);
    await expect(service.get("org-1", "template-1")).resolves.toBe(created);
    await expect(service.get("org-other", "template-1")).rejects.toBeInstanceOf(NotFoundException);
  });

  it("creates a tenant-scoped draft using the organization timezone and audits inside the transaction", async () => {
    const { service, tx, auditLog, numberSequence, created } = makeHarness();

    await expect(service.create("org-1", "user-1", salesDto)).resolves.toBe(created);

    expect(numberSequence.next).toHaveBeenCalledWith("org-1", expect.anything(), tx);
    expect(tx.recurringTransactionTemplate.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: "org-1",
        transactionType: RecurringTransactionType.SALES_INVOICE,
        templateCode: "REC-000001",
        status: RecurringTransactionStatus.DRAFT,
        timezone: "Asia/Dubai",
        nextRunAt: new Date("2026-01-30T20:00:00.000Z"),
        templateVersion: 1,
        generationMode: "DRAFT_ONLY",
        exchangeRatePolicy: RecurringExchangeRatePolicy.BASE_CURRENCY_ONLY,
        currencyCode: "AED",
        lines: {
          create: [
            expect.objectContaining({
              organizationId: "org-1",
              accountId: "revenue-1",
              description: "Support retainer",
              sortOrder: 0,
            }),
          ],
        },
      }),
      include: expect.any(Object),
    });
    expect(auditLog.log).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-1",
        actorUserId: "user-1",
        action: "CREATE",
        entityType: "RecurringTransactionTemplate",
        entityId: "template-1",
      }),
      tx,
    );
  });

  it("rejects invalid IANA timezones before persistence", async () => {
    const { service, tx } = makeHarness();

    await expect(service.create("org-1", "user-1", { ...salesDto, timezone: "server-local" })).rejects.toThrow("valid IANA timezone");
    expect(tx.recurringTransactionTemplate.create).not.toHaveBeenCalled();
  });

  it("rejects unbalanced manual journal templates", async () => {
    const { service, tx } = makeHarness();
    const dto: CreateRecurringTransactionDto = {
      ...salesDto,
      transactionType: RecurringTransactionType.MANUAL_JOURNAL,
      partyId: null,
      taxMode: undefined,
      lines: [
        { accountId: "expense-1", description: "Debit", debit: "100.0000", credit: "0.0000", sortOrder: 0 },
        { accountId: "liability-1", description: "Credit", debit: "0.0000", credit: "90.0000", sortOrder: 1 },
      ],
    };

    await expect(service.create("org-1", "user-1", dto)).rejects.toThrow("must balance");
    expect(tx.recurringTransactionTemplate.create).not.toHaveBeenCalled();
  });

  it("keeps manual journals fail-closed for foreign currency", async () => {
    const { service } = makeHarness();
    const dto: CreateRecurringTransactionDto = {
      ...salesDto,
      transactionType: RecurringTransactionType.MANUAL_JOURNAL,
      partyId: null,
      taxMode: undefined,
      currencyCode: "USD",
      exchangeRatePolicy: RecurringExchangeRatePolicy.REQUIRE_RATE_AT_RUN,
      lines: [
        { accountId: "expense-1", description: "Debit", debit: "100.0000", credit: "0.0000", sortOrder: 0 },
        { accountId: "liability-1", description: "Credit", debit: "0.0000", credit: "100.0000", sortOrder: 1 },
      ],
    };

    await expect(service.create("org-1", "user-1", dto)).rejects.toThrow("Foreign-currency recurring journals are not enabled");
  });

  it("rejects archived or cross-tenant dimensions", async () => {
    const { service, tx } = makeHarness();
    tx.costCenter.findMany.mockResolvedValue([]);

    await expect(
      service.create("org-1", "user-1", {
        ...salesDto,
        lines: [{ ...salesDto.lines[0]!, costCenterId: "cost-center-other" }],
      }),
    ).rejects.toThrow("cost center");
  });

  it("increments the version for future runs without rewriting historical runs", async () => {
    const { service, tx, auditLog } = makeHarness();
    const existing = {
      ...makeHarness().created,
      status: RecurringTransactionStatus.ACTIVE,
      templateVersion: 3,
      name: "Old name",
      updatedAt: new Date("2026-07-12T00:00:00.000Z"),
      currencyCode: "AED",
      exchangeRatePolicy: RecurringExchangeRatePolicy.BASE_CURRENCY_ONLY,
      partyId: "customer-1",
      branchId: null,
      paidThroughAccountId: null,
      paymentTermsDays: 30,
      taxMode: SalesInvoiceTaxMode.TAX_EXCLUSIVE,
      inventoryPostingMode: null,
      catchUpPolicy: RecurringCatchUpPolicy.SKIP_MISSED,
      dayOfWeek: null,
      dayOfMonth: 31,
      monthOfYear: null,
      description: null,
      reference: null,
      notes: null,
      terms: null,
      fixedExchangeRate: null,
      rateSnapshotId: null,
    };
    tx.recurringTransactionTemplate.findFirst.mockResolvedValue(existing);
    tx.recurringTransactionTemplate.update.mockResolvedValue({ ...existing, name: "Future name", templateVersion: 4 });

    const updated = await service.update("org-1", "user-1", "template-1", { name: "Future name", startDate: "2026-01-31", timezone: "Asia/Dubai", expectedVersion: 3 });

    expect(updated.templateVersion).toBe(4);
    expect(tx.recurringTransactionTemplate.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ name: "Future name", templateVersion: { increment: 1 }, nextRunAt: undefined }),
      }),
    );
    expect(tx).not.toHaveProperty("recurringTransactionRun.updateMany");
    expect(auditLog.log).toHaveBeenCalledWith(expect.objectContaining({ action: "UPDATE" }), tx);
    expect(auditLog.log).not.toHaveBeenCalledWith(expect.objectContaining({ action: "SCHEDULE_CHANGE" }), tx);
  });

  it("records schedule changes separately without changing prior run evidence", async () => {
    const { service, tx, auditLog, created } = makeHarness();
    const existing = {
      ...created,
      nextRunAt: new Date("2026-07-30T20:00:00.000Z"),
      status: RecurringTransactionStatus.ACTIVE,
      templateVersion: 1,
      currencyCode: "AED",
      exchangeRatePolicy: RecurringExchangeRatePolicy.BASE_CURRENCY_ONLY,
      partyId: "customer-1",
      branchId: null,
      paidThroughAccountId: null,
      paymentTermsDays: 30,
      taxMode: SalesInvoiceTaxMode.TAX_EXCLUSIVE,
      inventoryPostingMode: null,
      catchUpPolicy: RecurringCatchUpPolicy.SKIP_MISSED,
      dayOfWeek: null,
      dayOfMonth: 31,
      monthOfYear: null,
      description: null,
      reference: null,
      notes: null,
      terms: null,
      fixedExchangeRate: null,
      rateSnapshotId: null,
    };
    tx.recurringTransactionTemplate.findFirst.mockResolvedValue(existing);
    tx.recurringTransactionTemplate.update.mockResolvedValue({ ...created, interval: 2, templateVersion: 2 });

    await service.update("org-1", "user-1", "template-1", { interval: 2, expectedVersion: 1 });

    expect(tx.recurringTransactionTemplate.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ nextRunAt: new Date("2026-07-30T20:00:00.000Z") }),
    }));
    expect(auditLog.log).toHaveBeenCalledWith(expect.objectContaining({ action: "SCHEDULE_CHANGE" }), tx);
  });

  it.each([
    ["activate", RecurringTransactionStatus.DRAFT],
    ["resume", RecurringTransactionStatus.PAUSED],
  ] as const)("revalidates all references before %s", async (action, status) => {
    const { service, tx, created } = makeHarness();
    tx.recurringTransactionTemplate.findFirst.mockResolvedValue({
      ...created,
      status,
      currencyCode: "AED",
      exchangeRatePolicy: RecurringExchangeRatePolicy.BASE_CURRENCY_ONLY,
      fixedExchangeRate: null,
      rateSnapshotId: null,
      partyId: "customer-1",
      branchId: null,
      paidThroughAccountId: null,
      paymentTermsDays: 30,
      reference: null,
      notes: null,
      terms: null,
      taxMode: SalesInvoiceTaxMode.TAX_EXCLUSIVE,
      inventoryPostingMode: null,
      catchUpPolicy: RecurringCatchUpPolicy.SKIP_MISSED,
      dayOfWeek: null,
      dayOfMonth: 31,
      monthOfYear: null,
      description: null,
      lines: [{ ...created.lines[0], costCenterId: "archived-cost" }],
    });
    tx.costCenter.findMany.mockResolvedValue([]);

    await expect(service[action]("org-1", "user-1", "template-1")).rejects.toThrow("cost center");
    expect(tx.recurringTransactionTemplate.update).not.toHaveBeenCalled();
  });

  it("archives historically visible templates and blocks missing tenant IDs", async () => {
    const { service, tx, auditLog, created } = makeHarness();
    tx.recurringTransactionTemplate.findFirst.mockResolvedValueOnce({ ...created, status: RecurringTransactionStatus.PAUSED });
    tx.recurringTransactionTemplate.update.mockResolvedValue({ ...created, status: RecurringTransactionStatus.ARCHIVED, archivedAt: new Date() });

    await expect(service.archive("org-1", "user-1", "template-1")).resolves.toEqual(
      expect.objectContaining({ status: RecurringTransactionStatus.ARCHIVED }),
    );
    expect(auditLog.log).toHaveBeenCalledWith(expect.objectContaining({ action: "ARCHIVE" }), tx);

    tx.recurringTransactionTemplate.findFirst.mockResolvedValueOnce(null);
    await expect(service.archive("org-other", "user-1", "template-1")).rejects.toBeInstanceOf(NotFoundException);
  });

  it("requires a positive fixed rate and matching tenant snapshot evidence", async () => {
    const { service, tx } = makeHarness();
    await expect(
      service.create("org-1", "user-1", {
        ...salesDto,
        currencyCode: "USD",
        exchangeRatePolicy: RecurringExchangeRatePolicy.FIXED_TEMPLATE_RATE,
        fixedExchangeRate: "0",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    tx.currencyRateSnapshot.findFirst.mockResolvedValue(null);
    await expect(
      service.create("org-1", "user-1", {
        ...salesDto,
        currencyCode: "USD",
        exchangeRatePolicy: RecurringExchangeRatePolicy.RATE_SNAPSHOT,
        rateSnapshotId: "snapshot-other",
      }),
    ).rejects.toThrow("rate snapshot");
  });
});
