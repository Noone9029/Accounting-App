import { buildSalesStockIssueCogsJournal } from "./sales-stock-issue-accounting";

describe("sales stock issue accounting", () => {
  it("generates COGS journal lines only from inventory-tracked invoice lines", () => {
    const result = buildSalesStockIssueCogsJournal({
      issueNumber: "SSI-000001",
      cogsAccount: { id: "cogs-1", code: "611", name: "Cost of Goods Sold" },
      inventoryAssetAccount: { id: "asset-1", code: "130", name: "Inventory" },
      lines: [
        { inventoryTracking: true, estimatedCogs: "24.0000" },
        { inventoryTracking: false, estimatedCogs: "999.0000" },
        { inventoryTracking: true, estimatedCogs: null },
      ],
    });

    expect(result.totalCogs).toBe("24.0000");
    expect(result.lines).toEqual([
      expect.objectContaining({ side: "DEBIT", accountId: "cogs-1", amount: "24.0000" }),
      expect.objectContaining({ side: "CREDIT", accountId: "asset-1", amount: "24.0000" }),
    ]);
  });

  it("does not generate journal lines without posting accounts or inventory COGS", () => {
    expect(
      buildSalesStockIssueCogsJournal({
        issueNumber: "SSI-000001",
        cogsAccount: null,
        inventoryAssetAccount: { id: "asset-1", code: "130", name: "Inventory" },
        lines: [{ inventoryTracking: true, estimatedCogs: "24.0000" }],
      }),
    ).toEqual({ totalCogs: "24.0000", lines: [] });

    expect(
      buildSalesStockIssueCogsJournal({
        issueNumber: "SSI-000001",
        cogsAccount: { id: "cogs-1", code: "611", name: "Cost of Goods Sold" },
        inventoryAssetAccount: { id: "asset-1", code: "130", name: "Inventory" },
        lines: [{ inventoryTracking: false, estimatedCogs: "24.0000" }],
      }),
    ).toEqual({ totalCogs: "0.0000", lines: [] });
  });
});
