import { BadRequestException } from "@nestjs/common";
import { CurrencyRateSource, Prisma } from "@prisma/client";
import { assertStoredDocumentFxPostingContext, DocumentFxContextService } from "./document-fx-context.service";

describe("DocumentFxContextService", () => {
  function makeService() {
    const prisma: any = {
      organization: { findUnique: jest.fn() },
      currencyRateSnapshot: { findFirst: jest.fn() },
    };
    return { service: new DocumentFxContextService(prisma), prisma };
  }

  it("uses an exact identity rate and system source for a same-currency document", async () => {
    const { service, prisma } = makeService();
    prisma.organization.findUnique.mockResolvedValue({ baseCurrency: "AED" });

    await expect(
      service.resolve("org-1", {
        currency: "aed",
        documentDate: "2026-07-11",
        rateDate: "2026-07-01",
      }),
    ).resolves.toEqual({
      currency: "AED",
      baseCurrency: "AED",
      exchangeRate: new Prisma.Decimal("1"),
      rateDate: new Date("2026-07-11T00:00:00.000Z"),
      rateSource: CurrencyRateSource.SYSTEM_RATE_1,
      rateSnapshotId: null,
    });
    expect(prisma.currencyRateSnapshot.findFirst).not.toHaveBeenCalled();
  });

  it("captures the immutable values from a tenant-owned manual rate snapshot", async () => {
    const { service, prisma } = makeService();
    prisma.organization.findUnique.mockResolvedValue({ baseCurrency: "AED" });
    prisma.currencyRateSnapshot.findFirst.mockResolvedValue({
      id: "11111111-1111-4111-8111-111111111111",
      organizationId: "org-1",
      transactionCurrency: "USD",
      baseCurrency: "AED",
      rate: new Prisma.Decimal("3.67250000"),
      rateDate: new Date("2026-07-10T00:00:00.000Z"),
      source: CurrencyRateSource.MANUAL,
    });

    await expect(
      service.resolve("org-1", {
        currency: "USD",
        documentDate: "2026-07-11",
        rateSnapshotId: "11111111-1111-4111-8111-111111111111",
      }),
    ).resolves.toEqual({
      currency: "USD",
      baseCurrency: "AED",
      exchangeRate: new Prisma.Decimal("3.67250000"),
      rateDate: new Date("2026-07-10T00:00:00.000Z"),
      rateSource: CurrencyRateSource.MANUAL,
      rateSnapshotId: "11111111-1111-4111-8111-111111111111",
    });
    expect(prisma.currencyRateSnapshot.findFirst).toHaveBeenCalledWith({
      where: {
        id: "11111111-1111-4111-8111-111111111111",
        organizationId: "org-1",
      },
    });
  });

  it("accepts an explicit manual draft rate without calling a provider", async () => {
    const { service, prisma } = makeService();
    prisma.organization.findUnique.mockResolvedValue({ baseCurrency: "SAR" });

    await expect(
      service.resolve("org-2", {
        currency: "USD",
        documentDate: "2026-07-11",
        exchangeRate: "3.75000000",
        rateDate: "2026-07-10",
        rateSource: CurrencyRateSource.MANUAL,
      }),
    ).resolves.toMatchObject({
      currency: "USD",
      baseCurrency: "SAR",
      exchangeRate: new Prisma.Decimal("3.75000000"),
      rateDate: new Date("2026-07-10T00:00:00.000Z"),
      rateSource: CurrencyRateSource.MANUAL,
      rateSnapshotId: null,
    });
    expect(prisma.currencyRateSnapshot.findFirst).not.toHaveBeenCalled();
  });

  it.each([
    { currency: "USD", documentDate: "2026-07-11" },
    { currency: "USD", documentDate: "2026-07-11", exchangeRate: "0", rateDate: "2026-07-10", rateSource: CurrencyRateSource.MANUAL },
    { currency: "USD", documentDate: "2026-07-11", exchangeRate: "3.67", rateDate: "2026-07-10", rateSource: CurrencyRateSource.FUTURE_PROVIDER_DISABLED },
  ])("fails closed for an incomplete or disallowed foreign draft context", async (input) => {
    const { service, prisma } = makeService();
    prisma.organization.findUnique.mockResolvedValue({ baseCurrency: "AED" });
    await expect(service.resolve("org-1", input)).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects a missing, cross-tenant, or currency-mismatched snapshot", async () => {
    const { service, prisma } = makeService();
    prisma.organization.findUnique.mockResolvedValue({ baseCurrency: "AED" });
    prisma.currencyRateSnapshot.findFirst.mockResolvedValue({
      id: "11111111-1111-4111-8111-111111111111",
      transactionCurrency: "EUR",
      baseCurrency: "AED",
      rate: new Prisma.Decimal("4"),
      rateDate: new Date("2026-07-10T00:00:00.000Z"),
      source: CurrencyRateSource.MANUAL,
    });

    await expect(
      service.resolve("org-1", {
        currency: "USD",
        documentDate: "2026-07-11",
        rateSnapshotId: "11111111-1111-4111-8111-111111111111",
      }),
    ).rejects.toEqual(new BadRequestException("The selected FX rate is not valid for this document."));
  });
});

describe("stored document FX posting context", () => {
  it("accepts complete foreign context and identity-rate base context", () => {
    expect(() => assertStoredDocumentFxPostingContext({
      currency: "USD", baseCurrency: "AED", exchangeRate: "3.6725", rateDate: new Date("2026-07-11"), rateSource: CurrencyRateSource.MANUAL,
    })).not.toThrow();
    expect(() => assertStoredDocumentFxPostingContext({
      currency: "AED", baseCurrency: "AED", exchangeRate: "1", rateDate: new Date("2026-07-11"), rateSource: CurrencyRateSource.SYSTEM_RATE_1,
    })).not.toThrow();
  });

  it.each([
    { currency: "USD", baseCurrency: "AED", exchangeRate: null, rateDate: null, rateSource: null },
    { currency: "USD", baseCurrency: "AED", exchangeRate: "3.6725", rateDate: new Date("2026-07-11"), rateSource: CurrencyRateSource.FUTURE_PROVIDER_DISABLED },
    { currency: "AED", baseCurrency: "AED", exchangeRate: "1.1", rateDate: new Date("2026-07-11"), rateSource: CurrencyRateSource.SYSTEM_RATE_1 },
  ])("rejects incomplete or inconsistent stored posting context", (context) => {
    expect(() => assertStoredDocumentFxPostingContext(context)).toThrow(BadRequestException);
  });
});
