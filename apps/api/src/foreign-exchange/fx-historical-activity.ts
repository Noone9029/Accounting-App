import { FxRevaluationStatus, Prisma, PurchaseBillStatus, SalesInvoiceStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

type FxHistoricalExecutor = PrismaService | Prisma.TransactionClient;

export interface FxHistoricalActivityScope {
  transactionCurrency?: string;
  branchId?: string;
  includeReceivables?: boolean;
  includePayables?: boolean;
  foreignOnly?: boolean;
}

export interface FxHistoricalActivityCounts {
  receivables: number;
  payables: number;
  total: number;
  lateFinalizedReceivables: number;
  lateFinalizedPayables: number;
  lateFinalized: number;
}

export async function countFxSourceActivityAfter(
  executor: FxHistoricalExecutor,
  organizationId: string,
  baseCurrency: string,
  asOf: Date,
  scope: FxHistoricalActivityScope = {},
): Promise<FxHistoricalActivityCounts> {
  const nextDate = dayAfter(asOf);
  const currencyFilter = scope.transactionCurrency
    ? { currency: scope.transactionCurrency }
    : scope.foreignOnly === false
      ? {}
      : { currency: { not: baseCurrency } };
  const invoice = {
    organizationId,
    baseCurrency,
    ...currencyFilter,
    status: { in: [SalesInvoiceStatus.FINALIZED, SalesInvoiceStatus.VOIDED] },
    issueDate: { lte: asOf },
    finalizedAt: { lt: nextDate },
    ...(scope.branchId ? { branchId: scope.branchId } : {}),
  };
  const bill = {
    organizationId,
    baseCurrency,
    ...currencyFilter,
    status: { in: [PurchaseBillStatus.FINALIZED, PurchaseBillStatus.VOIDED] },
    billDate: { lte: asOf },
    finalizedAt: { lt: nextDate },
    ...(scope.branchId ? { branchId: scope.branchId } : {}),
  };
  const includeReceivables = scope.includeReceivables !== false;
  const includePayables = scope.includePayables !== false;
  const lateInvoice = { ...invoice, finalizedAt: { gte: nextDate } };
  const lateBill = { ...bill, finalizedAt: { gte: nextDate } };

  const [lateFinalizedReceivables, invoiceVoid, customerDirect, customerUnapplied, customerCredits, laterReceivableRevaluation, lateFinalizedPayables, billVoid, supplierDirect, supplierUnapplied, supplierDebits, laterPayableRevaluation] = await Promise.all([
    includeReceivables ? executor.salesInvoice.count({ where: lateInvoice }) : 0,
    includeReceivables ? executor.salesInvoice.count({
      where: {
        ...invoice,
        status: SalesInvoiceStatus.VOIDED,
        OR: [
          { reversalJournalEntryId: null },
          { reversalJournalEntry: { entryDate: { gte: nextDate } } },
          { reversalJournalEntry: { postedAt: { gte: nextDate } } },
        ],
      },
    }) : 0,
    includeReceivables ? executor.customerPaymentAllocation.count({ where: {
      organizationId,
      invoice,
      OR: [{ createdAt: { gte: nextDate } }, { payment: { paymentDate: { gte: nextDate } } }, { payment: { voidedAt: { gte: nextDate } } }],
    } }) : 0,
    includeReceivables ? executor.customerPaymentUnappliedAllocation.count({ where: {
      organizationId,
      invoice,
      OR: [
        { createdAt: { gte: nextDate } },
        { reversedAt: { gte: nextDate } },
        { payment: { paymentDate: { gte: nextDate } } },
        { payment: { voidedAt: { gte: nextDate } } },
      ],
    } }) : 0,
    includeReceivables ? executor.creditNoteAllocation.count({ where: {
      organizationId,
      invoice,
      OR: [{ createdAt: { gte: nextDate } }, { reversedAt: { gte: nextDate } }, { creditNote: { issueDate: { gte: nextDate } } }],
    } }) : 0,
    includeReceivables ? executor.fxRevaluationLine.count({ where: {
      organizationId,
      salesInvoice: invoice,
      revaluationRun: { status: { in: [FxRevaluationStatus.POSTED, FxRevaluationStatus.REVERSED] }, revaluationDate: { gte: nextDate } },
    } }) : 0,
    includePayables ? executor.purchaseBill.count({ where: lateBill }) : 0,
    includePayables ? executor.purchaseBill.count({
      where: {
        ...bill,
        status: PurchaseBillStatus.VOIDED,
        OR: [
          { reversalJournalEntryId: null },
          { reversalJournalEntry: { entryDate: { gte: nextDate } } },
          { reversalJournalEntry: { postedAt: { gte: nextDate } } },
        ],
      },
    }) : 0,
    includePayables ? executor.supplierPaymentAllocation.count({ where: {
      organizationId,
      bill,
      OR: [{ createdAt: { gte: nextDate } }, { payment: { paymentDate: { gte: nextDate } } }, { payment: { voidedAt: { gte: nextDate } } }],
    } }) : 0,
    includePayables ? executor.supplierPaymentUnappliedAllocation.count({ where: {
      organizationId,
      bill,
      OR: [
        { createdAt: { gte: nextDate } },
        { reversedAt: { gte: nextDate } },
        { payment: { paymentDate: { gte: nextDate } } },
        { payment: { voidedAt: { gte: nextDate } } },
      ],
    } }) : 0,
    includePayables ? executor.purchaseDebitNoteAllocation.count({ where: {
      organizationId,
      bill,
      OR: [{ createdAt: { gte: nextDate } }, { reversedAt: { gte: nextDate } }, { debitNote: { issueDate: { gte: nextDate } } }],
    } }) : 0,
    includePayables ? executor.fxRevaluationLine.count({ where: {
      organizationId,
      purchaseBill: bill,
      revaluationRun: { status: { in: [FxRevaluationStatus.POSTED, FxRevaluationStatus.REVERSED] }, revaluationDate: { gte: nextDate } },
    } }) : 0,
  ]);
  const receivables = lateFinalizedReceivables + invoiceVoid + customerDirect + customerUnapplied + customerCredits + laterReceivableRevaluation;
  const payables = lateFinalizedPayables + billVoid + supplierDirect + supplierUnapplied + supplierDebits + laterPayableRevaluation;
  const lateFinalized = lateFinalizedReceivables + lateFinalizedPayables;
  return { receivables, payables, total: receivables + payables, lateFinalizedReceivables, lateFinalizedPayables, lateFinalized };
}

function dayAfter(value: Date) {
  const nextDate = new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
  nextDate.setUTCDate(nextDate.getUTCDate() + 1);
  return nextDate;
}
