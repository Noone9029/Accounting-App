import { BadRequestException } from "@nestjs/common";
import { ChartOfAccountsService } from "./chart-of-accounts.service";

describe("chart of accounts rules", () => {
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
  counts: { journalLines?: number; children?: number; invoiceLines?: number; items?: number; payments?: number } = {},
) {
  return {
    account: {
      findFirst: jest.fn().mockResolvedValue({ id: "account-1", organizationId: "org-1", isSystem: false }),
      count: jest.fn().mockResolvedValue(counts.children ?? 0),
      delete: jest.fn().mockResolvedValue({}),
    },
    journalLine: { count: jest.fn().mockResolvedValue(counts.journalLines ?? 0) },
    salesInvoiceLine: { count: jest.fn().mockResolvedValue(counts.invoiceLines ?? 0) },
    item: { count: jest.fn().mockResolvedValue(counts.items ?? 0) },
    customerPayment: { count: jest.fn().mockResolvedValue(counts.payments ?? 0) },
  };
}
