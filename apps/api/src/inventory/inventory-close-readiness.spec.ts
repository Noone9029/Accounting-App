import { Prisma } from "@prisma/client";
import { assertInventoryReadyForPeriodClose } from "./inventory-close-readiness";

describe("inventory fiscal close readiness", () => {
  function fixture() {
    return {
      stockMovement: { count: jest.fn().mockResolvedValueOnce(4).mockResolvedValue(0) },
      purchaseReceipt: { count: jest.fn().mockResolvedValue(0) },
      salesStockIssue: { count: jest.fn().mockResolvedValue(0) },
      inventorySettings: { findUnique: jest.fn().mockResolvedValue({ inventoryAssetAccountId: "inventory-asset" }) },
      $queryRaw: jest.fn().mockResolvedValue([{ value: new Prisma.Decimal("220") }]),
      journalLine: { aggregate: jest.fn().mockResolvedValue({ _sum: { debit: new Prisma.Decimal(300), credit: new Prisma.Decimal(80) } }) },
    };
  }

  it("allows an organization with no inventory without requiring inventory account mappings", async () => {
    const tx = fixture();
    tx.stockMovement.count.mockReset().mockResolvedValue(0);
    tx.inventorySettings.findUnique.mockResolvedValue(null);
    await assertInventoryReadyForPeriodClose("org", new Date("2026-09-30"), tx as never);
    expect(tx.journalLine.aggregate).not.toHaveBeenCalled();
  });

  it("blocks a nonzero configured asset GL balance even when no stock movements exist", async () => {
    const tx = fixture();
    tx.stockMovement.count.mockReset().mockResolvedValue(0);
    tx.$queryRaw.mockResolvedValue([{ value: new Prisma.Decimal(0) }]);
    await expect(assertInventoryReadyForPeriodClose("org", new Date("2026-09-30"), tx as never)).rejects.toThrow("differ by -220.0000");
    expect(tx.journalLine.aggregate).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({
      organizationId: "org", accountId: "inventory-asset", journalEntry: expect.objectContaining({ entryDate: { lte: new Date("2026-09-30T23:59:59.999Z") } }),
    }) }));
  });

  it.each(["legacy", "review", "receipt", "issue"])("blocks unresolved %s activity before a fiscal state claim", async (kind) => {
    const tx = fixture();
    if (kind === "legacy" || kind === "review") tx.stockMovement.count.mockReset().mockResolvedValueOnce(4).mockResolvedValueOnce(kind === "legacy" ? 1 : 0).mockResolvedValueOnce(kind === "review" ? 1 : 0);
    if (kind === "receipt") tx.purchaseReceipt.count.mockResolvedValue(1);
    if (kind === "issue") tx.salesStockIssue.count.mockResolvedValue(1);
    await expect(assertInventoryReadyForPeriodClose("org", new Date("2026-09-30"), tx as never)).rejects.toThrow("Inventory must be reconciled");
    expect(tx.journalLine.aggregate).not.toHaveBeenCalled();
  });

  it("compares immutable historical value and GL through the end of the closing day", async () => {
    const tx = fixture();
    await assertInventoryReadyForPeriodClose("org", new Date("2026-09-30"), tx as never);
    expect(tx.stockMovement.count).toHaveBeenCalledWith({ where: { organizationId: "org", movementDate: { lte: new Date("2026-09-30T23:59:59.999Z") } } });
    expect(tx.journalLine.aggregate).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({
      accountId: "inventory-asset", journalEntry: expect.objectContaining({ entryDate: { lte: new Date("2026-09-30T23:59:59.999Z") } }),
    }) }));
    tx.$queryRaw.mockResolvedValue([{ value: new Prisma.Decimal("221") }]);
    tx.stockMovement.count.mockReset().mockResolvedValueOnce(4).mockResolvedValue(0);
    await expect(assertInventoryReadyForPeriodClose("org", new Date("2026-09-30"), tx as never)).rejects.toThrow("differ by 1.0000");
  });
});
