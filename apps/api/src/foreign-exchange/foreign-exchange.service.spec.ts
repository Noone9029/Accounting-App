import { BadRequestException } from "@nestjs/common";
import { AccountType, CurrencyRateSource, Prisma } from "@prisma/client";
import { ForeignExchangeService } from "./foreign-exchange.service";

describe("ForeignExchangeService", () => {
  function makeService() {
    const prisma = {
      organization: { findUnique: jest.fn() },
      currencyRateSnapshot: { findMany: jest.fn(), create: jest.fn() },
      fxAccountConfiguration: { findUnique: jest.fn(), upsert: jest.fn() },
      account: { findMany: jest.fn() },
    };
    const audit = { log: jest.fn() };
    return { service: new ForeignExchangeService(prisma as never, audit as never), prisma, audit };
  }

  it("creates an exact manual snapshot using the tenant base currency and audit trail", async () => {
    const { service, prisma, audit } = makeService();
    prisma.organization.findUnique.mockResolvedValue({ baseCurrency: "AED" });
    prisma.currencyRateSnapshot.create.mockImplementation(({ data }: { data: Record<string, unknown> }) => Promise.resolve({ id: "rate-1", ...data }));

    await service.createRate("org-1", "user-1", {
      transactionCurrency: "USD",
      rate: "3.67250000",
      rateDate: "2026-07-10",
      sourceReference: " Treasury sheet ",
    });

    expect(prisma.currencyRateSnapshot.create).toHaveBeenCalledWith({
      data: {
        organizationId: "org-1",
        transactionCurrency: "USD",
        baseCurrency: "AED",
        rate: new Prisma.Decimal("3.67250000"),
        rateDate: new Date("2026-07-10T00:00:00.000Z"),
        source: CurrencyRateSource.MANUAL,
        sourceReference: "Treasury sheet",
      },
    });
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({
      organizationId: "org-1",
      actorUserId: "user-1",
      action: "CREATE",
      entityType: "CurrencyRateSnapshot",
      entityId: "rate-1",
    }));
  });

  it("rejects unsupported, same-currency, zero, and non-decimal rates before writes", async () => {
    const { service, prisma } = makeService();
    prisma.organization.findUnique.mockResolvedValue({ baseCurrency: "AED" });

    for (const input of [
      { transactionCurrency: "AED", rate: "1" },
      { transactionCurrency: "ZZZ", rate: "1" },
      { transactionCurrency: "USD", rate: "0" },
      { transactionCurrency: "USD", rate: "1e3" },
    ]) {
      await expect(
        service.createRate("org-1", "user-1", { ...input, rateDate: "2026-07-10" }),
      ).rejects.toBeInstanceOf(BadRequestException);
    }
    expect(prisma.currencyRateSnapshot.create).not.toHaveBeenCalled();
  });

  it("scopes rate listing to the organization and current base currency", async () => {
    const { service, prisma } = makeService();
    prisma.organization.findUnique.mockResolvedValue({ baseCurrency: "SAR" });
    prisma.currencyRateSnapshot.findMany.mockResolvedValue([]);

    await service.listRates("org-2", { transactionCurrency: "USD", rateDate: "2026-07-10" });

    expect(prisma.currencyRateSnapshot.findMany).toHaveBeenCalledWith({
      where: {
        organizationId: "org-2",
        baseCurrency: "SAR",
        transactionCurrency: "USD",
        rateDate: new Date("2026-07-10T00:00:00.000Z"),
      },
      orderBy: [{ rateDate: "desc" }, { createdAt: "desc" }],
    });
  });

  it("rejects cross-tenant or invalid account mappings with one generic result", async () => {
    const { service, prisma, audit } = makeService();
    prisma.account.findMany.mockResolvedValue([]);
    await expect(
      service.updateAccountConfiguration("org-2", "user-2", {
        realizedGainAccountId: "11111111-1111-4111-8111-111111111111",
        realizedLossAccountId: null,
        unrealizedGainAccountId: null,
        unrealizedLossAccountId: null,
      }),
    ).rejects.toEqual(new BadRequestException("One or more FX accounts are invalid for this organization."));
    expect(prisma.account.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ organizationId: "org-2" }) }));
    expect(prisma.fxAccountConfiguration.upsert).not.toHaveBeenCalled();
    expect(audit.log).not.toHaveBeenCalled();
  });

  it("validates gain/loss account types and upserts partial configuration with before/after audit", async () => {
    const { service, prisma, audit } = makeService();
    const dto = {
      realizedGainAccountId: "11111111-1111-4111-8111-111111111111",
      realizedLossAccountId: "22222222-2222-4222-8222-222222222222",
      unrealizedGainAccountId: null,
      unrealizedLossAccountId: null,
    };
    prisma.account.findMany.mockResolvedValue([
      { id: dto.realizedGainAccountId, type: AccountType.REVENUE, isActive: true, allowPosting: true },
      { id: dto.realizedLossAccountId, type: AccountType.EXPENSE, isActive: true, allowPosting: true },
    ]);
    prisma.fxAccountConfiguration.findUnique.mockResolvedValue({ id: "config-1", organizationId: "org-1" });
    prisma.fxAccountConfiguration.upsert.mockResolvedValue({ id: "config-1", organizationId: "org-1", ...dto });

    await service.updateAccountConfiguration("org-1", "user-1", dto);

    expect(prisma.fxAccountConfiguration.upsert).toHaveBeenCalledWith({
      where: { organizationId: "org-1" },
      create: { organizationId: "org-1", ...dto },
      update: dto,
      include: expect.any(Object),
    });
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ before: expect.any(Object), after: expect.any(Object) }));
  });

  it("reports manual-only readiness honestly and never enables foreign posting", async () => {
    const { service, prisma } = makeService();
    prisma.organization.findUnique.mockResolvedValue({ baseCurrency: "AED" });
    prisma.fxAccountConfiguration.findUnique.mockResolvedValue(null);

    await expect(service.readiness("org-1")).resolves.toMatchObject({
      baseCurrency: "AED",
      manualRateEntryEnabled: true,
      liveRateProviderEnabled: false,
      providerState: "DISABLED",
      accountConfigurationComplete: false,
      foreignDocumentPostingEnabled: false,
      status: "BLOCKED",
    });
  });
});
