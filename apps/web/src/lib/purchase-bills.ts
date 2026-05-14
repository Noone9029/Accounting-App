import { formatInventoryQuantity } from "./inventory";
import type { InventoryAccountingPreviewJournalLine, PurchaseBillAccountingPreview, PurchaseBillInventoryPostingMode } from "./types";

export function purchaseBillInventoryPostingModeLabel(mode: PurchaseBillInventoryPostingMode): string {
  switch (mode) {
    case "DIRECT_EXPENSE_OR_ASSET":
      return "Direct Expense/Asset";
    case "INVENTORY_CLEARING":
      return "Inventory Clearing";
  }
}

export function purchaseBillInventoryClearingModeWarning(): string {
  return "Inventory Clearing mode is preparation for future receipt GL posting.";
}

export function purchaseBillAccountantReviewWarning(): string {
  return "Use only after accountant review.";
}

export function purchaseBillAccountingPreviewLineDisplay(line: InventoryAccountingPreviewJournalLine): string {
  const side = line.side === "DEBIT" ? "Dr" : "Cr";
  const account = line.accountCode ? `${line.accountCode} ${line.accountName}` : line.accountName;
  return `${side} ${account} ${formatInventoryQuantity(line.amount)}`;
}

export function purchaseBillCanFinalizeFromPreview(preview: Pick<PurchaseBillAccountingPreview, "canFinalize"> | null | undefined): boolean {
  return preview?.canFinalize === true;
}

export function purchaseBillReadinessWarningDisplay(warnings: string[]): string {
  return warnings.length > 0 ? warnings.join("; ") : "No warnings.";
}
