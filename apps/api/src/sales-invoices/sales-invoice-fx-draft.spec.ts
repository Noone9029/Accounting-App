import { CurrencyRateSource, Prisma } from "@prisma/client";
import { DocumentFxContextService } from "../foreign-exchange/document-fx-context.service";
import { SalesInvoiceService } from "./sales-invoice.service";

describe("SalesInvoiceService document FX drafts", () => {
  it("persists transaction totals and line-rounded base totals from a tenant-owned snapshot", async () => {
    const prisma: any = {
      organization: { findUnique: jest.fn().mockResolvedValue({ baseCurrency: "AED" }) },
      currencyRateSnapshot: {
        findFirst: jest.fn().mockResolvedValue({
          id: "11111111-1111-4111-8111-111111111111",
          organizationId: "org-1",
          transactionCurrency: "USD",
          baseCurrency: "AED",
          rate: new Prisma.Decimal("3.67250000"),
          rateDate: new Date("2026-07-10T00:00:00.000Z"),
          source: CurrencyRateSource.MANUAL,
        }),
      },
      contact: { findFirst: jest.fn().mockResolvedValue({ id: "customer-1" }) },
      branch: { findFirst: jest.fn() },
      item: { findMany: jest.fn().mockResolvedValue([]) },
      account: { findMany: jest.fn().mockResolvedValue([{ id: "revenue-1" }]) },
      taxRate: {
        findMany: jest.fn().mockResolvedValue([
          { id: "tax-1", rate: new Prisma.Decimal("5"), scope: "BOTH", isActive: true },
        ]),
      },
      salesInvoice: {
        create: jest.fn().mockImplementation(({ data }: { data: object }) => ({ id: "invoice-1", ...data })),
      },
    };
    prisma.$transaction = jest.fn((callback: (tx: typeof prisma) => Promise<unknown>) => callback(prisma));
    const service = new SalesInvoiceService(
      prisma,
      { log: jest.fn() } as never,
      { next: jest.fn().mockResolvedValue("INV-000001") } as never,
      {} as never,
      undefined,
      undefined,
      undefined,
      undefined,
      new DocumentFxContextService(prisma),
    );

    await service.create("org-1", "user-1", {
      customerId: "customer-1",
      issueDate: "2026-07-11",
      currency: "USD",
      rateSnapshotId: "11111111-1111-4111-8111-111111111111",
      lines: [
        {
          description: "Consulting",
          accountId: "revenue-1",
          quantity: "1",
          unitPrice: "100",
          taxRateId: "tax-1",
        },
      ],
    });

    expect(prisma.salesInvoice.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        currency: "USD",
        baseCurrency: "AED",
        exchangeRate: new Prisma.Decimal("3.67250000"),
        rateDate: new Date("2026-07-10T00:00:00.000Z"),
        rateSource: CurrencyRateSource.MANUAL,
        rateSnapshotId: "11111111-1111-4111-8111-111111111111",
        transactionSubtotal: "100.0000",
        transactionTaxTotal: "5.0000",
        transactionTotal: "105.0000",
        subtotal: "367.2500",
        taxTotal: "18.3625",
        total: "385.6125",
        balanceDue: "385.6125",
        lines: {
          create: [
            expect.objectContaining({
              lineGrossAmount: "367.2500",
              taxAmount: "18.3625",
              lineTotal: "385.6125",
              transactionLineGrossAmount: "100.0000",
              transactionTaxAmount: "5.0000",
              transactionLineTotal: "105.0000",
            }),
          ],
        },
      }),
      include: expect.any(Object),
    });
  });
});
