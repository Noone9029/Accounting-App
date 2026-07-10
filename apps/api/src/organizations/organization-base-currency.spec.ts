import { BadRequestException } from "@nestjs/common";
import { OrganizationService } from "./organization.service";

describe("organization base currency safeguards", () => {
  function makeService() {
    const tx: any = {
      organization: {
        findUnique: jest.fn().mockResolvedValue({ id: "org-1", baseCurrency: "AED" }),
        update: jest.fn().mockResolvedValue({ id: "org-1", baseCurrency: "SAR" }),
      },
      journalEntry: { count: jest.fn().mockResolvedValue(0) },
      currencyRateSnapshot: { count: jest.fn().mockResolvedValue(0) },
      auditLog: { create: jest.fn() },
    };
    const prisma: any = {
      organizationMember: {
        findFirst: jest.fn().mockResolvedValue({ role: { permissions: ["organization.update"] } }),
      },
      $transaction: jest.fn(async (callback: (executor: typeof tx) => Promise<unknown>) => callback(tx)),
    };
    const audit = { log: jest.fn() };
    return { service: new OrganizationService(prisma, audit as never), prisma, tx, audit };
  }

  it("rejects unsupported base currencies even when called outside controller validation", async () => {
    const { service, tx } = makeService();
    await expect(service.updateForUser("user-1", "org-1", { baseCurrency: "btc" })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(tx.organization.update).not.toHaveBeenCalled();
  });

  it.each([
    [1, 0],
    [0, 1],
  ])("blocks a base-currency change after journal or FX activity", async (journalCount, rateCount) => {
    const { service, tx } = makeService();
    tx.journalEntry.count.mockResolvedValue(journalCount);
    tx.currencyRateSnapshot.count.mockResolvedValue(rateCount);

    await expect(service.updateForUser("user-1", "org-1", { baseCurrency: "SAR" })).rejects.toEqual(
      new BadRequestException("Base currency cannot change after financial or FX activity exists."),
    );
    expect(tx.organization.update).not.toHaveBeenCalled();
  });

  it("normalizes and atomically audits an allowed pre-activity change", async () => {
    const { service, prisma, tx, audit } = makeService();
    await service.updateForUser("user-1", "org-1", { baseCurrency: " sar " });

    expect(tx.organization.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "org-1" },
      data: expect.objectContaining({ baseCurrency: "SAR" }),
    }));
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ before: { id: "org-1", baseCurrency: "AED" }, after: { id: "org-1", baseCurrency: "SAR" } }),
      tx,
    );
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });
});
