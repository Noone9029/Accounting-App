import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { PERMISSIONS } from "@ledgerbyte/shared";
import { OrganizationService } from "./organization.service";

describe("organization base currency safeguards", () => {
  function makeService(permissions: string[] = [PERMISSIONS.organization.update, PERMISSIONS.currencies.manage]) {
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
        findFirst: jest.fn().mockResolvedValue({ role: { permissions } }),
      },
      $transaction: jest.fn(async (callback: (executor: typeof tx) => Promise<unknown>) => callback(tx)),
    };
    const audit = { log: jest.fn() };
    return { service: new OrganizationService(prisma, audit as never), prisma, tx, audit };
  }

  it.each([
    [[PERMISSIONS.organization.update], "currency management"],
    [[PERMISSIONS.currencies.manage], "organization update"],
  ])("requires both permissions for base-currency changes: %s", async (permissions, _label) => {
    const { service, prisma, tx } = makeService(permissions);

    await expect(service.updateForUser("user-1", "org-1", { baseCurrency: "SAR" })).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(tx.organization.update).not.toHaveBeenCalled();
  });

  it("keeps ordinary organization updates available without currencies.manage", async () => {
    const { service, tx } = makeService([PERMISSIONS.organization.update]);

    await service.updateForUser("user-1", "org-1", { name: "Updated organization" });

    expect(tx.organization.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ name: "Updated organization", baseCurrency: undefined }) }),
    );
  });

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
