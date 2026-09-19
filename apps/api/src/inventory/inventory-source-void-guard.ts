import { BadRequestException } from "@nestjs/common";
import { Prisma } from "@prisma/client";

/** Caller holds the tenant inventory lock before loading the financial source. */
export async function assertInventorySourceCanVoid(organizationId: string, source: "PURCHASE_BILL" | "SALES_INVOICE", id: string, tx: Prisma.TransactionClient) {
  const [stockDocuments, returns] = source === "PURCHASE_BILL"
    ? await Promise.all([
      tx.purchaseReceipt.count({ where: { organizationId, purchaseBillId: id, status: { not: "VOIDED" } } }),
      tx.purchaseReturn.count({ where: { organizationId, inventoryReturnPostedAt: { not: null }, OR: [
        { sourcePurchaseBillId: id }, { sourcePurchaseReceipt: { purchaseBillId: id } },
        { lines: { some: { OR: [{ sourcePurchaseBillLine: { billId: id } }, { sourcePurchaseReceiptLine: { receipt: { purchaseBillId: id } } }] } } },
      ] } }),
    ])
    : await Promise.all([
      tx.salesStockIssue.count({ where: { organizationId, salesInvoiceId: id, status: { not: "VOIDED" } } }),
      tx.salesInventoryReturn.count({ where: { organizationId, inventoryReturnPostedAt: { not: null }, OR: [
        { sourceSalesInvoiceId: id }, { sourceSalesStockIssue: { salesInvoiceId: id } },
        { lines: { some: { OR: [{ sourceSalesInvoiceLine: { invoiceId: id } }, { sourceSalesStockIssueLine: { issue: { salesInvoiceId: id } } }] } } },
      ] } }),
    ]);
  if (stockDocuments || returns) throw new BadRequestException("Cannot void a financial document with active inventory receipts, issues or posted returns. Resolve the linked inventory workflow first, or use the reviewed credit/debit note workflow for returned goods.");
}
