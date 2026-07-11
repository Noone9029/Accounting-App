import { CurrencyRateSource, Prisma } from "@prisma/client";
import { DocumentFxContextService } from "../foreign-exchange/document-fx-context.service";
import { PurchaseBillService } from "./purchase-bill.service";

describe("PurchaseBillService document FX drafts", () => {
  it("persists transaction totals and line-rounded base totals from a tenant-owned snapshot", async () => {
    const prisma: any = {
      organization: { findUnique: jest.fn().mockResolvedValue({ baseCurrency: "SAR" }) },
      currencyRateSnapshot: {
        findFirst: jest.fn().mockResolvedValue({
          id: "11111111-1111-4111-8111-111111111111",
          organizationId: "org-1",
          transactionCurrency: "USD",
          baseCurrency: "SAR",
          rate: new Prisma.Decimal("3.75000000"),
          rateDate: new Date("2026-07-10T00:00:00.000Z"),
          source: CurrencyRateSource.MANUAL,
        }),
      },
      contact: { findFirst: jest.fn().mockResolvedValue({ id: "supplier-1" }) },
      branch: { findFirst: jest.fn() },
      item: { findMany: jest.fn().mockResolvedValue([]) },
      account: { findMany: jest.fn().mockResolvedValue([{ id: "expense-1", type: "EXPENSE" }]) },
      taxRate: {
        findMany: jest.fn().mockResolvedValue([
          { id: "tax-1", rate: new Prisma.Decimal("15"), scope: "BOTH", isActive: true },
        ]),
      },
      purchaseBill: {
        create: jest.fn().mockImplementation(({ data }: { data: object }) => ({ id: "bill-1", ...data })),
      },
    };
    prisma.$transaction = jest.fn((callback: (tx: typeof prisma) => Promise<unknown>) => callback(prisma));
    const service = new PurchaseBillService(
      prisma,
      { log: jest.fn() } as never,
      { next: jest.fn().mockResolvedValue("BILL-000001") } as never,
      undefined,
      undefined,
      undefined,
      undefined,
      new DocumentFxContextService(prisma),
    );

    await service.create("org-1", "user-1", {
      supplierId: "supplier-1",
      billDate: "2026-07-11",
      currency: "USD",
      rateSnapshotId: "11111111-1111-4111-8111-111111111111",
      lines: [
        {
          description: "Services",
          accountId: "expense-1",
          quantity: "1",
          unitPrice: "100",
          taxRateId: "tax-1",
        },
      ],
    });

    expect(prisma.purchaseBill.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        currency: "USD",
        baseCurrency: "SAR",
        exchangeRate: new Prisma.Decimal("3.75000000"),
        transactionSubtotal: "100.0000",
        transactionTaxTotal: "15.0000",
        transactionTotal: "115.0000",
        subtotal: "375.0000",
        taxTotal: "56.2500",
        total: "431.2500",
        lines: {
          create: [
            expect.objectContaining({
              lineGrossAmount: "375.0000",
              taxAmount: "56.2500",
              lineTotal: "431.2500",
              transactionLineGrossAmount: "100.0000",
              transactionTaxAmount: "15.0000",
              transactionLineTotal: "115.0000",
            }),
          ],
        },
      }),
      include: expect.any(Object),
    });
  });
});
