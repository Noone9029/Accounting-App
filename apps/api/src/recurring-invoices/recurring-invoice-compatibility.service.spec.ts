import {
  RecurringCatchUpPolicy,
  RecurringExchangeRatePolicy,
  RecurringFrequency,
  RecurringInvoiceFrequency,
  RecurringRunStatus,
  RecurringTransactionType,
} from "@prisma/client";
import { RecurringInvoiceCompatibilityService } from "./recurring-invoice-compatibility.service";

function makeHarness() {
  const generalized = {
    id: "template-1",
    templateCode: "REC-000001",
    transactionType: RecurringTransactionType.SALES_INVOICE,
    name: "Monthly support",
    status: "DRAFT",
    timezone: "Asia/Dubai",
    frequency: RecurringFrequency.MONTHLY,
    interval: 1,
    dayOfMonth: 31,
    dayOfWeek: null,
    monthOfYear: null,
    startDate: new Date("2026-07-31T00:00:00.000Z"),
    endDate: null,
    nextRunAt: new Date("2026-07-30T20:00:00.000Z"),
    lastRunAt: null,
    paymentTermsDays: 30,
    partyId: "customer-1",
    party: { id: "customer-1", name: "Customer", displayName: "Customer" },
    branchId: null,
    branch: null,
    currencyCode: "AED",
    taxMode: "TAX_EXCLUSIVE",
    subtotal: "100.0000",
    discountTotal: "0.0000",
    taxableTotal: "100.0000",
    taxTotal: "15.0000",
    total: "115.0000",
    notes: null,
    terms: "Net 30",
    reference: null,
    templateVersion: 1,
    lines: [{ accountId: "revenue-1", description: "Support", quantity: "1", unitPrice: "100", discountRate: "0", taxableAmount: "100", taxAmount: "15", lineTotal: "115", sortOrder: 0 }],
    runs: [],
  };
  const templates = {
    create: jest.fn().mockResolvedValue(generalized),
    list: jest.fn().mockResolvedValue({ items: [generalized], page: 1, limit: 100, total: 1, totalPages: 1 }),
    get: jest.fn().mockResolvedValue(generalized),
    update: jest.fn().mockResolvedValue(generalized),
    activate: jest.fn().mockResolvedValue({ ...generalized, status: "ACTIVE" }),
    pause: jest.fn(), resume: jest.fn(), archive: jest.fn(), advanceAfterLegacyRun: jest.fn().mockResolvedValue({ ...generalized, nextRunAt: new Date("2026-08-30T20:00:00.000Z"), lastRunAt: generalized.nextRunAt }),
  };
  const runs = { runNow: jest.fn().mockResolvedValue({ id: "run-1", status: RecurringRunStatus.GENERATED, generatedSalesInvoice: { id: "invoice-1", status: "DRAFT" }, template: generalized }) };
  const numbers = { preview: jest.fn().mockResolvedValue({ exampleNextNumber: "REC-000001" }) };
  const prisma = { organization: { findUnique: jest.fn().mockResolvedValue({ baseCurrency: "AED" }) }, item: { findMany: jest.fn().mockResolvedValue([{ id: "item-1", name: "Consulting", description: "Consulting service", revenueAccountId: "revenue-1", salesTaxRateId: "sales-tax-1" }]) } };
  const service = new RecurringInvoiceCompatibilityService(templates as never, runs as never, numbers as never, prisma as never);
  return { service, templates, runs, generalized };
}

describe("RecurringInvoiceCompatibilityService", () => {
  it("maps legacy recurring invoice creation into the generalized engine", async () => {
    const { service, templates } = makeHarness();
    await service.create("org-1", "user-1", {
      customerId: "11111111-1111-4111-8111-111111111111",
      name: "Monthly support",
      startDate: "2026-01-31",
      nextRunDate: "2026-07-31",
      frequency: RecurringInvoiceFrequency.MONTHLY,
      dayOfMonth: 31,
      lines: [{ accountId: "22222222-2222-4222-8222-222222222222", description: "Support", quantity: "1", unitPrice: "100" }],
    });
    expect(templates.create).toHaveBeenCalledWith("org-1", "user-1", expect.objectContaining({
      transactionType: RecurringTransactionType.SALES_INVOICE,
      frequency: RecurringFrequency.MONTHLY,
      startDate: "2026-07-31",
      catchUpPolicy: RecurringCatchUpPolicy.SKIP_MISSED,
      currencyCode: "AED",
      exchangeRatePolicy: RecurringExchangeRatePolicy.BASE_CURRENCY_ONLY,
    }));
  });

  it("returns the legacy shape while Run Now uses a deterministic idempotency key", async () => {
    const { service, runs, templates } = makeHarness();
    const result = await service.generateNow("org-1", "user-1", "template-1");
    expect(runs.runNow).toHaveBeenCalledWith("org-1", "user-1", "template-1", "legacy:template-1:2026-07-30T20:00:00.000Z", undefined, new Date("2026-07-30T20:00:00.000Z"));
    expect(templates.advanceAfterLegacyRun).toHaveBeenCalledWith("org-1", "user-1", "template-1", new Date("2026-07-30T20:00:00.000Z"));
    expect(result).toEqual(expect.objectContaining({ invoice: expect.objectContaining({ id: "invoice-1", status: "DRAFT" }), run: expect.objectContaining({ id: "run-1" }) }));
  });

  it("rejects non-sales generalized IDs on every legacy lookup", async () => {
    const { service, templates, generalized } = makeHarness();
    templates.get.mockResolvedValue({ ...generalized, transactionType: RecurringTransactionType.MANUAL_JOURNAL });
    await expect(service.get("org-1", "template-1")).rejects.toThrow("sales invoice");
    await expect(service.generateNow("org-1", "user-1", "template-1")).rejects.toThrow("sales invoice");
  });

  it("preserves legacy item-only lines by resolving the tenant item account", async () => {
    const { service, templates } = makeHarness();
    await service.create("org-1", "user-1", { customerId: "11111111-1111-4111-8111-111111111111", name: "Item template", startDate: "2026-07-31", nextRunDate: "2026-07-31", frequency: RecurringInvoiceFrequency.MONTHLY, lines: [{ itemId: "item-1", quantity: "1", unitPrice: "100" }] });
    expect(templates.create).toHaveBeenCalledWith("org-1", "user-1", expect.objectContaining({ lines: [expect.objectContaining({ accountId: "revenue-1", taxRateId: "sales-tax-1", description: "Consulting service" })] }));
  });

  it("preserves an explicit legacy no-tax override instead of restoring the item default", async () => {
    const { service, templates } = makeHarness();
    await service.create("org-1", "user-1", { customerId: "11111111-1111-4111-8111-111111111111", name: "No-tax item template", startDate: "2026-07-31", nextRunDate: "2026-07-31", frequency: RecurringInvoiceFrequency.MONTHLY, lines: [{ itemId: "item-1", taxRateId: null, quantity: "1", unitPrice: "100" }] });
    expect(templates.create).toHaveBeenCalledWith("org-1", "user-1", expect.objectContaining({ lines: [expect.objectContaining({ taxRateId: null })] }));
  });

  it("does not advance the legacy schedule when draft generation is blocked", async () => {
    const { service, runs, templates, generalized } = makeHarness();
    runs.runNow.mockResolvedValue({ id: "run-blocked", status: "BLOCKED", generatedSalesInvoice: null, template: generalized });

    const result = await service.generateNow("org-1", "user-1", "template-1");

    expect(templates.advanceAfterLegacyRun).not.toHaveBeenCalled();
    expect(result.newNextRunDate).toEqual(generalized.nextRunAt);
  });

  it("retries a previously blocked legacy occurrence with the same occurrence identity", async () => {
    const { service, runs, generalized } = makeHarness();
    runs.runNow.mockResolvedValue({ id: "run-retried", status: RecurringRunStatus.GENERATED, generatedSalesInvoice: { id: "invoice-retried", status: "DRAFT" }, template: generalized });

    await service.generateNow("org-1", "user-1", "template-1");

    expect(runs.runNow).toHaveBeenCalledWith("org-1", "user-1", "template-1", expect.any(String), undefined, generalized.nextRunAt);
  });
});
