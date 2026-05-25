import { toMoney } from "@ledgerbyte/accounting-core";

export interface SalesStockIssueCogsAccountInput {
  id: string;
  code: string;
  name: string;
}

export interface SalesStockIssueCogsLineInput {
  inventoryTracking: boolean;
  estimatedCogs: string | null;
}

export interface SalesStockIssueCogsJournalLine {
  lineNumber: number;
  side: "DEBIT" | "CREDIT";
  accountId: string;
  accountCode: string;
  accountName: string;
  amount: string;
  description: string;
}

export function buildSalesStockIssueCogsJournal(input: {
  issueNumber: string;
  cogsAccount: SalesStockIssueCogsAccountInput | null;
  inventoryAssetAccount: SalesStockIssueCogsAccountInput | null;
  lines: SalesStockIssueCogsLineInput[];
}): { totalCogs: string; lines: SalesStockIssueCogsJournalLine[] } {
  const totalCogs = input.lines.reduce((sum, line) => {
    if (!line.inventoryTracking || !line.estimatedCogs) {
      return sum;
    }
    return sum.plus(line.estimatedCogs);
  }, toMoney("0"));

  if (!input.cogsAccount || !input.inventoryAssetAccount || totalCogs.lte(0)) {
    return { totalCogs: totalCogs.toFixed(4), lines: [] };
  }

  const amount = totalCogs.toFixed(4);
  return {
    totalCogs: amount,
    lines: [
      {
        lineNumber: 1,
        side: "DEBIT",
        accountId: input.cogsAccount.id,
        accountCode: input.cogsAccount.code,
        accountName: input.cogsAccount.name,
        amount,
        description: `Sales stock issue ${input.issueNumber} COGS`,
      },
      {
        lineNumber: 2,
        side: "CREDIT",
        accountId: input.inventoryAssetAccount.id,
        accountCode: input.inventoryAssetAccount.code,
        accountName: input.inventoryAssetAccount.name,
        amount,
        description: `Sales stock issue ${input.issueNumber} inventory asset`,
      },
    ],
  };
}
