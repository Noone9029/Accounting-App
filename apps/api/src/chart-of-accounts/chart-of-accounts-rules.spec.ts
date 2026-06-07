import { BadRequestException } from "@nestjs/common";
import { AccountType } from "@prisma/client";
import { ChartOfAccountsService } from "./chart-of-accounts.service";

describe("chart of accounts rules", () => {
  it("suggests the next code inside the account type range and ignores malformed codes", async () => {
    const prisma = makePrismaMock();
    prisma.account.findMany.mockResolvedValue([{ code: "400" }, { code: "411" }, { code: "411A" }, { code: "REV-X" }]);
    const service = new ChartOfAccountsService(prisma as never, { log: jest.fn() } as never);

    await expect(service.nextCode("org-1", AccountType.REVENUE)).resolves.toMatchObject({
      type: AccountType.REVENUE,
      code: "412",
      rangeStart: "400",
      rangeEnd: "499",
    });
    expect(prisma.account.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { organizationId: "org-1", type: AccountType.REVENUE } }));
  });

  it("rejects next-code generation when the account type range is full", async () => {
    const prisma = makePrismaMock();
    prisma.account.findMany.mockResolvedValue(Array.from({ length: 100 }, (_, index) => ({ code: String(400 + index) })));
    const service = new ChartOfAccountsService(prisma as never, { log: jest.fn() } as never);

    await expect(service.nextCode("org-1", AccountType.REVENUE)).rejects.toThrow(BadRequestException);
  });

  it("auto-generates account codes and prevents duplicate manual overrides", async () => {
    const prisma = makePrismaMock();
    prisma.account.findMany.mockResolvedValue([{ code: "500" }, { code: "511" }]);
    prisma.account.findFirst.mockResolvedValueOnce(null);
    prisma.account.create.mockImplementation(({ data }) => Promise.resolve({ id: "account-created", ...data }));
    const service = new ChartOfAccountsService(prisma as never, { log: jest.fn() } as never);

    await expect(service.create("org-1", "user-1", { name: "Utilities", type: AccountType.EXPENSE })).resolves.toMatchObject({
      code: "512",
      type: AccountType.EXPENSE,
    });

    prisma.account.findFirst.mockResolvedValueOnce({ id: "duplicate" });
    await expect(service.create("org-1", "user-1", { code: "512", name: "Duplicate", type: AccountType.EXPENSE })).rejects.toThrow(
      "Account code already exists",
    );
  });

  it("audit logs manual account-code overrides", async () => {
    const prisma = makePrismaMock();
    const auditLogService = { log: jest.fn() };
    prisma.account.findMany.mockResolvedValue([{ code: "400" }, { code: "411" }]);
    prisma.account.findFirst.mockResolvedValueOnce(null);
    prisma.account.create.mockImplementation(({ data }) => Promise.resolve({ id: "account-created", ...data }));
    const service = new ChartOfAccountsService(prisma as never, auditLogService as never);

    await service.create("org-1", "user-1", { code: "490", name: "Other Income", type: AccountType.REVENUE });

    expect(auditLogService.log).toHaveBeenCalledWith(expect.objectContaining({ action: "CREATE", entityType: "Account" }));
    expect(auditLogService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "MANUAL_CODE_OVERRIDE",
        entityType: "Account",
        after: expect.objectContaining({ accountCode: "490", suggestedCode: "412" }),
      }),
    );
  });

  it("rejects deleting accounts used by invoices, items, or payments", async () => {
    const prisma = makePrismaMock({
      journalLines: 0,
      children: 0,
      invoiceLines: 1,
      items: 0,
      payments: 0,
    });
    const service = new ChartOfAccountsService(prisma as never, { log: jest.fn() } as never);

    await expect(service.remove("org-1", "user-1", "account-1")).rejects.toThrow(BadRequestException);
    expect(prisma.salesInvoiceLine.count).toHaveBeenCalledWith({ where: { organizationId: "org-1", accountId: "account-1" } });
    expect(prisma.item.count).toHaveBeenCalledWith({
      where: { organizationId: "org-1", OR: [{ revenueAccountId: "account-1" }, { expenseAccountId: "account-1" }] },
    });
    expect(prisma.customerPayment.count).toHaveBeenCalledWith({ where: { organizationId: "org-1", accountId: "account-1" } });
    expect(prisma.bankAccountProfile.count).toHaveBeenCalledWith({ where: { organizationId: "org-1", accountId: "account-1" } });
    expect(prisma.account.delete).not.toHaveBeenCalled();
  });

  it("deletes unused non-system accounts", async () => {
    const prisma = makePrismaMock();
    const service = new ChartOfAccountsService(prisma as never, { log: jest.fn() } as never);

    await expect(service.remove("org-1", "user-1", "account-1")).resolves.toEqual({ deleted: true });
    expect(prisma.account.delete).toHaveBeenCalledWith({ where: { id: "account-1" } });
  });
});

function makePrismaMock(
  counts: { journalLines?: number; children?: number; invoiceLines?: number; items?: number; payments?: number; bankProfiles?: number } = {},
) {
  return {
    account: {
      findFirst: jest.fn().mockResolvedValue({ id: "account-1", organizationId: "org-1", isSystem: false }),
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(counts.children ?? 0),
      create: jest.fn().mockResolvedValue({}),
      delete: jest.fn().mockResolvedValue({}),
    },
    journalLine: { count: jest.fn().mockResolvedValue(counts.journalLines ?? 0) },
    salesInvoiceLine: { count: jest.fn().mockResolvedValue(counts.invoiceLines ?? 0) },
    item: { count: jest.fn().mockResolvedValue(counts.items ?? 0) },
    customerPayment: { count: jest.fn().mockResolvedValue(counts.payments ?? 0) },
    bankAccountProfile: { count: jest.fn().mockResolvedValue(counts.bankProfiles ?? 0) },
  };
}
