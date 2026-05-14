import { BadRequestException, Injectable } from "@nestjs/common";
import { JournalEntryStatus, Prisma, PurchaseBillInventoryPostingMode, PurchaseBillStatus, PurchaseReceiptStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import type { CsvFile } from "../reports/report-csv";
import { toCsv } from "../reports/report-csv";
import type { InventoryClearingReportQueryDto, InventoryClearingReportStatus } from "./dto/inventory-clearing-report-query.dto";

const REVIEW_ONLY_WARNING = "Inventory clearing reconciliation is review-only; no variance or adjustment journals are created.";

const accountSelect = { id: true, code: true, name: true, type: true, allowPosting: true, isActive: true } as const;
const contactSelect = { id: true, name: true, displayName: true } as const;
const itemSelect = { id: true, name: true, sku: true, type: true, status: true, inventoryTracking: true } as const;
const journalEntrySelect = { id: true, entryNumber: true, status: true } as const;

const billInclude = {
  supplier: { select: contactSelect },
  journalEntry: { select: journalEntrySelect },
  lines: {
    orderBy: { sortOrder: "asc" as const },
    include: {
      item: { select: itemSelect },
      account: { select: accountSelect },
    },
  },
  purchaseReceipts: {
    orderBy: { receiptDate: "asc" as const },
    include: {
      supplier: { select: contactSelect },
      inventoryAssetJournalEntry: { select: journalEntrySelect },
      inventoryAssetReversalJournalEntry: { select: journalEntrySelect },
      lines: {
        orderBy: { createdAt: "asc" as const },
        include: {
          item: { select: itemSelect },
          purchaseBillLine: { select: { id: true, description: true } },
        },
      },
    },
  },
} satisfies Prisma.PurchaseBillInclude;

const receiptInclude = {
  supplier: { select: contactSelect },
  inventoryAssetJournalEntry: { select: journalEntrySelect },
  inventoryAssetReversalJournalEntry: { select: journalEntrySelect },
  purchaseBill: {
    select: {
      id: true,
      billNumber: true,
      billDate: true,
      status: true,
      inventoryPostingMode: true,
      total: true,
      currency: true,
      journalEntryId: true,
      supplier: { select: contactSelect },
    },
  },
  lines: {
    orderBy: { createdAt: "asc" as const },
    include: {
      item: { select: itemSelect },
      purchaseBillLine: { select: { id: true, description: true, taxableAmount: true, quantity: true, unitPrice: true } },
    },
  },
} satisfies Prisma.PurchaseReceiptInclude;

type ReportBill = Prisma.PurchaseBillGetPayload<{ include: typeof billInclude }>;
type ReportReceipt = Prisma.PurchaseReceiptGetPayload<{ include: typeof receiptInclude }>;
type BillReceipt = ReportBill["purchaseReceipts"][number];
type BillLine = ReportBill["lines"][number];
type ClearingStatus = InventoryClearingReportStatus;
type NormalizedInventoryClearingReportQuery = InventoryClearingReportQueryDto & { fromDate: Date | null; toDate: Date | null };

interface ClearingReceiptSummary {
  id: string;
  receiptNumber: string;
  receiptDate: string;
  status: PurchaseReceiptStatus;
  receiptValue: string;
  activeClearingCredit: string;
  inventoryAssetJournalEntryId: string | null;
  inventoryAssetReversalJournalEntryId: string | null;
  assetPostingStatus: "NOT_POSTED" | "POSTED" | "REVERSED";
  warnings: string[];
}

interface ClearingReportRow {
  status: ClearingStatus;
  purchaseBill: {
    id: string;
    billNumber: string;
    status: PurchaseBillStatus;
    inventoryPostingMode: PurchaseBillInventoryPostingMode;
    billDate: string;
    total: string;
    currency: string;
    journalEntryId: string | null;
  } | null;
  supplier: { id: string; name: string; displayName: string | null } | null;
  billDate: string | null;
  billClearingDebit: string;
  receiptClearingCredit: string;
  netClearingDifference: string;
  billedQuantity: string;
  receivedQuantity: string;
  matchedQuantity: string;
  unmatchedQuantity: string;
  vatAmount: string;
  apAmount: string;
  journalEntryId: string | null;
  receipts: ClearingReceiptSummary[];
  lines: Array<{
    lineId: string;
    item: BillLine["item"] | null;
    description: string;
    billedQuantity: string;
    unitPrice: string;
    billClearingDebit: string;
    receivedQuantity: string;
    postedReceiptValue: string;
    valueDifference: string;
  }>;
  warnings: string[];
}

@Injectable()
export class InventoryClearingReportService {
  constructor(private readonly prisma: PrismaService) {}

  async clearingReconciliationReport(organizationId: string, query: InventoryClearingReportQueryDto = {}) {
    const normalizedQuery = this.validateDateRange(query);
    const settings = await this.inventorySettings(organizationId);
    const clearingAccount = settings?.inventoryClearingAccount ?? null;
    const includeDirectExcluded = normalizedQuery.status === "DIRECT_MODE_EXCLUDED";
    const includeReceiptWithoutClearingBill =
      normalizedQuery.status === "RECEIPT_WITHOUT_CLEARING_BILL" || Boolean(normalizedQuery.purchaseReceiptId);
    const rows = await this.reconciliationRows(organizationId, normalizedQuery, {
      includeDirectExcluded,
      includeReceiptWithoutClearingBill,
    });
    const filteredRows = normalizedQuery.status ? rows.filter((row) => row.status === normalizedQuery.status) : rows;
    const glSummary = await this.clearingGlSummary(organizationId, clearingAccount?.id ?? null, normalizedQuery);
    const reportComputedOpenDifference = filteredRows.reduce(
      (sum, row) => sum.plus(row.netClearingDifference),
      new Prisma.Decimal(0),
    );

    return {
      generatedAt: new Date().toISOString(),
      from: query.from ?? null,
      to: query.to ?? null,
      supplierId: query.supplierId ?? null,
      purchaseBillId: query.purchaseBillId ?? null,
      purchaseReceiptId: query.purchaseReceiptId ?? null,
      status: query.status ?? null,
      clearingAccount,
      clearingAccountPeriodDebit: this.decimalString(glSummary.debit),
      clearingAccountPeriodCredit: this.decimalString(glSummary.credit),
      clearingAccountBalance: this.decimalString(glSummary.balance),
      reportComputedOpenDifference: this.decimalString(reportComputedOpenDifference),
      differenceBetweenGLAndReport: this.decimalString(glSummary.balance.minus(reportComputedOpenDifference)),
      warnings: this.reportWarnings(clearingAccount),
      summary: this.reconciliationSummary(filteredRows),
      rows: filteredRows,
    };
  }

  async clearingVarianceReport(organizationId: string, query: InventoryClearingReportQueryDto = {}) {
    const normalizedQuery = this.validateDateRange(query);
    const settings = await this.inventorySettings(organizationId);
    const clearingAccount = settings?.inventoryClearingAccount ?? null;
    const rows = await this.reconciliationRows(organizationId, normalizedQuery, {
      includeDirectExcluded: false,
      includeReceiptWithoutClearingBill: true,
    });
    const problemRows = rows.filter((row) => row.status !== "MATCHED" && row.status !== "DIRECT_MODE_EXCLUDED");
    const varianceRows = problemRows.flatMap((row) => this.varianceRowsForReconciliationRow(row));
    const filteredVarianceRows = normalizedQuery.status
      ? varianceRows.filter((row) => row.status === normalizedQuery.status)
      : varianceRows;
    const glSummary = await this.clearingGlSummary(organizationId, clearingAccount?.id ?? null, normalizedQuery);
    const totalVarianceAmount = filteredVarianceRows.reduce(
      (sum, row) => sum.plus(row.varianceAmount),
      new Prisma.Decimal(0),
    );

    return {
      generatedAt: new Date().toISOString(),
      from: query.from ?? null,
      to: query.to ?? null,
      supplierId: query.supplierId ?? null,
      purchaseBillId: query.purchaseBillId ?? null,
      purchaseReceiptId: query.purchaseReceiptId ?? null,
      status: query.status ?? null,
      clearingAccount,
      clearingAccountBalance: this.decimalString(glSummary.balance),
      summary: {
        rowCount: filteredVarianceRows.length,
        totalVarianceAmount: this.decimalString(totalVarianceAmount),
      },
      warnings: this.reportWarnings(clearingAccount),
      rows: filteredVarianceRows.map((row) => ({
        ...row,
        varianceAmount: this.decimalString(row.varianceAmount),
      })),
    };
  }

  async clearingReconciliationCsvFile(organizationId: string, query: InventoryClearingReportQueryDto): Promise<CsvFile> {
    const report = await this.clearingReconciliationReport(organizationId, query);
    const rows: unknown[][] = [
      ["Inventory Clearing Reconciliation"],
      ["Generated At", report.generatedAt],
      ["From", report.from ?? ""],
      ["To", report.to ?? ""],
      ["Clearing Account", report.clearingAccount ? `${report.clearingAccount.code} ${report.clearingAccount.name}` : "Not mapped"],
      ["Clearing Account Balance", report.clearingAccountBalance],
      ["Report Computed Open Difference", report.reportComputedOpenDifference],
      ["Difference Between GL And Report", report.differenceBetweenGLAndReport],
      [],
      [
        "Status",
        "Bill Number",
        "Supplier",
        "Bill Date",
        "Bill Clearing Debit",
        "Receipt Clearing Credit",
        "Net Difference",
        "Billed Quantity",
        "Received Quantity",
        "Receipts",
        "Warnings",
      ],
      ...report.rows.map((row) => [
        row.status,
        row.purchaseBill?.billNumber ?? "",
        row.supplier?.displayName ?? row.supplier?.name ?? "",
        row.billDate ? dateOnly(row.billDate) : "",
        row.billClearingDebit,
        row.receiptClearingCredit,
        row.netClearingDifference,
        row.billedQuantity,
        row.receivedQuantity,
        row.receipts.map((receipt) => `${receipt.receiptNumber} ${receipt.assetPostingStatus}`).join("; "),
        row.warnings.join("; "),
      ]),
    ];
    return { filename: `inventory-clearing-reconciliation-${filenameDate()}.csv`, content: toCsv(rows) };
  }

  async clearingVarianceCsvFile(organizationId: string, query: InventoryClearingReportQueryDto): Promise<CsvFile> {
    const report = await this.clearingVarianceReport(organizationId, query);
    const rows: unknown[][] = [
      ["Inventory Clearing Variance"],
      ["Generated At", report.generatedAt],
      ["From", report.from ?? ""],
      ["To", report.to ?? ""],
      ["Clearing Account", report.clearingAccount ? `${report.clearingAccount.code} ${report.clearingAccount.name}` : "Not mapped"],
      ["Clearing Account Balance", report.clearingAccountBalance],
      [],
      ["Status", "Bill Number", "Receipt Number", "Supplier", "Variance Amount", "Reason", "Recommended Action", "Warnings"],
      ...report.rows.map((row) => [
        row.status,
        row.purchaseBill?.billNumber ?? "",
        row.receipt?.receiptNumber ?? "",
        row.supplier?.displayName ?? row.supplier?.name ?? "",
        row.varianceAmount,
        row.varianceReason,
        row.recommendedAction,
        row.warnings.join("; "),
      ]),
    ];
    return { filename: `inventory-clearing-variance-${filenameDate()}.csv`, content: toCsv(rows) };
  }

  private async reconciliationRows(
    organizationId: string,
    query: NormalizedInventoryClearingReportQuery,
    options: { includeDirectExcluded: boolean; includeReceiptWithoutClearingBill: boolean },
  ): Promise<ClearingReportRow[]> {
    const bills = await this.loadBills(organizationId, query, options.includeDirectExcluded);
    const rows = bills.map((bill) => this.reconciliationRowForBill(bill));
    if (!options.includeReceiptWithoutClearingBill) {
      return rows;
    }
    const existingReceiptIds = new Set(rows.flatMap((row) => row.receipts.map((receipt) => receipt.id)));
    const receipts = await this.loadReceiptsWithoutCompatibleClearingBill(organizationId, query);
    rows.push(
      ...receipts
        .filter((receipt) => !existingReceiptIds.has(receipt.id))
        .map((receipt) => this.reconciliationRowForReceiptWithoutClearingBill(receipt)),
    );
    return rows;
  }

  private async loadBills(organizationId: string, query: NormalizedInventoryClearingReportQuery, includeDirectExcluded: boolean) {
    const dateRange = this.dateRange(query.fromDate, query.toDate);
    return this.prisma.purchaseBill.findMany({
      where: {
        organizationId,
        status: PurchaseBillStatus.FINALIZED,
        inventoryPostingMode: includeDirectExcluded
          ? PurchaseBillInventoryPostingMode.DIRECT_EXPENSE_OR_ASSET
          : PurchaseBillInventoryPostingMode.INVENTORY_CLEARING,
        ...(query.supplierId ? { supplierId: query.supplierId } : {}),
        ...(query.purchaseBillId ? { id: query.purchaseBillId } : {}),
        ...(dateRange ? { billDate: dateRange } : {}),
        ...(query.purchaseReceiptId ? { purchaseReceipts: { some: { id: query.purchaseReceiptId, organizationId } } } : {}),
      },
      orderBy: { billDate: "asc" },
      include: billInclude,
    });
  }

  private async loadReceiptsWithoutCompatibleClearingBill(organizationId: string, query: NormalizedInventoryClearingReportQuery) {
    const dateRange = this.dateRange(query.fromDate, query.toDate);
    const receipts = await this.prisma.purchaseReceipt.findMany({
      where: {
        organizationId,
        inventoryAssetJournalEntryId: { not: null },
        ...(query.supplierId ? { supplierId: query.supplierId } : {}),
        ...(query.purchaseReceiptId ? { id: query.purchaseReceiptId } : {}),
        ...(query.purchaseBillId ? { purchaseBillId: query.purchaseBillId } : {}),
        ...(dateRange ? { receiptDate: dateRange } : {}),
      },
      orderBy: { receiptDate: "asc" },
      include: receiptInclude,
    });
    return receipts.filter(
      (receipt) =>
        !receipt.purchaseBill ||
        receipt.purchaseBill.status !== PurchaseBillStatus.FINALIZED ||
        receipt.purchaseBill.inventoryPostingMode !== PurchaseBillInventoryPostingMode.INVENTORY_CLEARING,
    );
  }

  private reconciliationRowForBill(bill: ReportBill): ClearingReportRow {
    const warnings: string[] = [];
    if (bill.inventoryPostingMode === PurchaseBillInventoryPostingMode.DIRECT_EXPENSE_OR_ASSET) {
      warnings.push("This bill uses direct expense/asset posting and is excluded from inventory clearing reconciliation.");
    }
    const trackedLines = bill.lines.filter((line) => line.item?.inventoryTracking === true);
    const trackedLineIds = new Set(trackedLines.map((line) => line.id));
    const lineSummaries = new Map<
      string,
      {
        line: BillLine;
        receivedQuantity: Prisma.Decimal;
        postedReceiptValue: Prisma.Decimal;
      }
    >(
      trackedLines.map((line) => [
        line.id,
        {
          line,
          receivedQuantity: new Prisma.Decimal(0),
          postedReceiptValue: new Prisma.Decimal(0),
        },
      ]),
    );
    const receiptSummaries = bill.purchaseReceipts.map((receipt) => {
      const summary = this.receiptSummary(receipt, trackedLineIds);
      if (summary.assetPostingStatus === "REVERSED") {
        warnings.push(`Receipt ${receipt.receiptNumber} asset posting was reversed.`);
      }
      if (summary.assetPostingStatus === "NOT_POSTED" && receipt.status !== PurchaseReceiptStatus.VOIDED) {
        warnings.push(`Receipt ${receipt.receiptNumber} does not have an active inventory asset posting.`);
      }
      if (receipt.status === PurchaseReceiptStatus.VOIDED) {
        warnings.push(`Receipt ${receipt.receiptNumber} is voided and excluded from active clearing credit.`);
      }

      if (receipt.status !== PurchaseReceiptStatus.VOIDED) {
        for (const line of receipt.lines) {
          if (!line.purchaseBillLineId || !trackedLineIds.has(line.purchaseBillLineId)) {
            continue;
          }
          const lineSummary = lineSummaries.get(line.purchaseBillLineId);
          if (!lineSummary) {
            continue;
          }
          const quantity = new Prisma.Decimal(line.quantity);
          lineSummary.receivedQuantity = lineSummary.receivedQuantity.plus(quantity);
          if (summary.assetPostingStatus === "POSTED" && line.unitCost !== null) {
            lineSummary.postedReceiptValue = lineSummary.postedReceiptValue.plus(quantity.mul(line.unitCost));
          }
        }
      }
      return summary;
    });

    const billClearingDebit =
      bill.inventoryPostingMode === PurchaseBillInventoryPostingMode.INVENTORY_CLEARING
        ? trackedLines.reduce((sum, line) => sum.plus(line.taxableAmount), new Prisma.Decimal(0))
        : new Prisma.Decimal(0);
    const receiptClearingCredit = receiptSummaries.reduce((sum, receipt) => sum.plus(receipt.activeClearingCredit), new Prisma.Decimal(0));
    const billedQuantity = trackedLines.reduce((sum, line) => sum.plus(line.quantity), new Prisma.Decimal(0));
    const receivedQuantity = [...lineSummaries.values()].reduce((sum, line) => sum.plus(line.receivedQuantity), new Prisma.Decimal(0));
    const matchedQuantity = this.decimalMin(billedQuantity, receivedQuantity);
    const unmatchedQuantity = Prisma.Decimal.max(billedQuantity.minus(receivedQuantity), new Prisma.Decimal(0));
    const netClearingDifference = billClearingDebit.minus(receiptClearingCredit);
    const status = this.rowStatus({
      bill,
      billClearingDebit,
      receiptClearingCredit,
      netClearingDifference,
      billedQuantity,
      receivedQuantity,
    });

    if (status === "PARTIAL") {
      warnings.push("Receipt quantity is partial or receipt asset posting does not yet cover the full billed quantity.");
    }
    if (status === "VARIANCE") {
      warnings.push("Inventory clearing debit and active receipt clearing credit do not match.");
    }
    if (status === "BILL_WITHOUT_RECEIPT_POSTING") {
      warnings.push("Inventory clearing bill has no active receipt inventory asset posting.");
    }

    return {
      status,
      purchaseBill: {
        id: bill.id,
        billNumber: bill.billNumber,
        status: bill.status,
        inventoryPostingMode: bill.inventoryPostingMode,
        billDate: bill.billDate.toISOString(),
        total: this.decimalString(new Prisma.Decimal(bill.total)),
        currency: bill.currency,
        journalEntryId: bill.journalEntryId,
      },
      supplier: bill.supplier,
      billDate: bill.billDate.toISOString(),
      billClearingDebit: this.decimalString(billClearingDebit),
      receiptClearingCredit: this.decimalString(receiptClearingCredit),
      netClearingDifference: this.decimalString(netClearingDifference),
      billedQuantity: this.decimalString(billedQuantity),
      receivedQuantity: this.decimalString(receivedQuantity),
      matchedQuantity: this.decimalString(matchedQuantity),
      unmatchedQuantity: this.decimalString(unmatchedQuantity),
      vatAmount: this.decimalString(new Prisma.Decimal(bill.taxTotal)),
      apAmount: this.decimalString(new Prisma.Decimal(bill.total)),
      journalEntryId: bill.journalEntryId,
      receipts: receiptSummaries,
      lines: [...lineSummaries.values()].map(({ line, receivedQuantity: lineReceivedQuantity, postedReceiptValue }) => {
        const lineClearingDebit =
          bill.inventoryPostingMode === PurchaseBillInventoryPostingMode.INVENTORY_CLEARING ? new Prisma.Decimal(line.taxableAmount) : new Prisma.Decimal(0);
        return {
          lineId: line.id,
          item: line.item,
          description: line.description,
          billedQuantity: this.decimalString(new Prisma.Decimal(line.quantity)),
          unitPrice: this.decimalString(new Prisma.Decimal(line.unitPrice)),
          billClearingDebit: this.decimalString(lineClearingDebit),
          receivedQuantity: this.decimalString(lineReceivedQuantity),
          postedReceiptValue: this.decimalString(postedReceiptValue),
          valueDifference: this.decimalString(lineClearingDebit.minus(postedReceiptValue)),
        };
      }),
      warnings: this.uniqueStrings(warnings),
    };
  }

  private reconciliationRowForReceiptWithoutClearingBill(receipt: ReportReceipt): ClearingReportRow {
    const summary = this.receiptSummary(receipt, null);
    const receiptValue = new Prisma.Decimal(summary.receiptValue);
    const activeCredit = new Prisma.Decimal(summary.activeClearingCredit);
    const warnings = [...summary.warnings];
    if (!receipt.purchaseBill) {
      warnings.push("Receipt has asset posting but is not linked to a purchase bill.");
    } else if (receipt.purchaseBill.inventoryPostingMode === PurchaseBillInventoryPostingMode.DIRECT_EXPENSE_OR_ASSET) {
      warnings.push("Receipt is linked to direct-mode bill; asset posting should not be used.");
    } else if (receipt.purchaseBill.status !== PurchaseBillStatus.FINALIZED) {
      warnings.push("Receipt is linked to a purchase bill that is not finalized.");
    }
    return {
      status: "RECEIPT_WITHOUT_CLEARING_BILL",
      purchaseBill: receipt.purchaseBill
        ? {
            id: receipt.purchaseBill.id,
            billNumber: receipt.purchaseBill.billNumber,
            status: receipt.purchaseBill.status,
            inventoryPostingMode: receipt.purchaseBill.inventoryPostingMode,
            billDate: receipt.purchaseBill.billDate.toISOString(),
            total: this.decimalString(new Prisma.Decimal(receipt.purchaseBill.total)),
            currency: receipt.purchaseBill.currency,
            journalEntryId: receipt.purchaseBill.journalEntryId,
          }
        : null,
      supplier: receipt.supplier,
      billDate: receipt.purchaseBill?.billDate.toISOString() ?? null,
      billClearingDebit: "0.0000",
      receiptClearingCredit: this.decimalString(activeCredit),
      netClearingDifference: this.decimalString(activeCredit.neg()),
      billedQuantity: "0.0000",
      receivedQuantity: this.decimalString(this.receiptQuantity(receipt, null)),
      matchedQuantity: "0.0000",
      unmatchedQuantity: "0.0000",
      vatAmount: "0.0000",
      apAmount: "0.0000",
      journalEntryId: null,
      receipts: [{ ...summary, receiptValue: this.decimalString(receiptValue) }],
      lines: [],
      warnings: this.uniqueStrings(warnings),
    };
  }

  private receiptSummary(receipt: BillReceipt | ReportReceipt, trackedLineIds: Set<string> | null): ClearingReceiptSummary {
    const receiptValue = this.receiptValue(receipt, trackedLineIds);
    const activeClearingCredit =
      receipt.status !== PurchaseReceiptStatus.VOIDED &&
      receipt.inventoryAssetJournalEntryId &&
      !receipt.inventoryAssetReversalJournalEntryId
        ? receiptValue
        : new Prisma.Decimal(0);
    const warnings: string[] = [];
    if (receipt.lines.some((line) => line.unitCost === null)) {
      warnings.push("Receipt has a line without unit cost.");
    }
    if (!receipt.inventoryAssetJournalEntryId) {
      warnings.push("Receipt inventory asset posting has not been posted.");
    }
    if (receipt.inventoryAssetReversalJournalEntryId) {
      warnings.push("Receipt asset posting was reversed.");
    }
    if (receipt.status === PurchaseReceiptStatus.VOIDED) {
      warnings.push("Receipt is voided.");
    }

    return {
      id: receipt.id,
      receiptNumber: receipt.receiptNumber,
      receiptDate: receipt.receiptDate.toISOString(),
      status: receipt.status,
      receiptValue: this.decimalString(receiptValue),
      activeClearingCredit: this.decimalString(activeClearingCredit),
      inventoryAssetJournalEntryId: receipt.inventoryAssetJournalEntryId,
      inventoryAssetReversalJournalEntryId: receipt.inventoryAssetReversalJournalEntryId,
      assetPostingStatus: receipt.inventoryAssetReversalJournalEntryId
        ? "REVERSED"
        : receipt.inventoryAssetJournalEntryId
          ? "POSTED"
          : "NOT_POSTED",
      warnings: this.uniqueStrings(warnings),
    };
  }

  private rowStatus(input: {
    bill: ReportBill;
    billClearingDebit: Prisma.Decimal;
    receiptClearingCredit: Prisma.Decimal;
    netClearingDifference: Prisma.Decimal;
    billedQuantity: Prisma.Decimal;
    receivedQuantity: Prisma.Decimal;
  }): ClearingStatus {
    if (input.bill.inventoryPostingMode === PurchaseBillInventoryPostingMode.DIRECT_EXPENSE_OR_ASSET) {
      return "DIRECT_MODE_EXCLUDED";
    }
    if (input.billClearingDebit.gt(0) && input.receiptClearingCredit.eq(0)) {
      return "BILL_WITHOUT_RECEIPT_POSTING";
    }
    if (input.receivedQuantity.lt(input.billedQuantity)) {
      return "PARTIAL";
    }
    if (!input.netClearingDifference.eq(0)) {
      return "VARIANCE";
    }
    return "MATCHED";
  }

  private varianceRowsForReconciliationRow(row: ClearingReportRow) {
    const rows = [
      {
        status: row.status,
        purchaseBill: row.purchaseBill,
        receipt: row.receipts[0] ?? null,
        supplier: row.supplier,
        varianceAmount: new Prisma.Decimal(row.netClearingDifference).abs(),
        varianceReason: this.varianceReason(row),
        recommendedAction: this.recommendedAction(row),
        warnings: row.warnings,
      },
    ];
    for (const receipt of row.receipts) {
      if (receipt.assetPostingStatus === "REVERSED") {
        rows.push({
          status: row.status,
          purchaseBill: row.purchaseBill,
          receipt,
          supplier: row.supplier,
          varianceAmount: new Prisma.Decimal(receipt.receiptValue).abs(),
          varianceReason: "Receipt asset posting was reversed.",
          recommendedAction: "Review whether the receipt asset journal should be reposted or the receipt should remain reversed.",
          warnings: this.uniqueStrings([...row.warnings, ...receipt.warnings]),
        });
      }
    }
    return rows.filter((varianceRow) => varianceRow.varianceAmount.gt(0) || varianceRow.warnings.length > 0);
  }

  private varianceReason(row: ClearingReportRow): string {
    if (row.status === "BILL_WITHOUT_RECEIPT_POSTING") {
      return "Clearing-mode bill has no active receipt asset posting.";
    }
    if (row.status === "PARTIAL") {
      return "Linked receipt quantity or posted receipt value is partial.";
    }
    if (row.status === "RECEIPT_WITHOUT_CLEARING_BILL") {
      return row.purchaseBill?.inventoryPostingMode === PurchaseBillInventoryPostingMode.DIRECT_EXPENSE_OR_ASSET
        ? "Receipt is linked to direct-mode bill; asset posting should not be used."
        : "Receipt has asset posting without a compatible inventory-clearing purchase bill.";
    }
    return "Inventory clearing debit and receipt clearing credit do not match.";
  }

  private recommendedAction(row: ClearingReportRow): string {
    if (row.status === "BILL_WITHOUT_RECEIPT_POSTING") {
      return "Post inventory asset journal for linked receipt.";
    }
    if (row.status === "PARTIAL") {
      return "Review remaining receipt quantity and post receipt asset journals after receiving.";
    }
    if (row.status === "RECEIPT_WITHOUT_CLEARING_BILL") {
      return row.purchaseBill?.inventoryPostingMode === PurchaseBillInventoryPostingMode.DIRECT_EXPENSE_OR_ASSET
        ? "Receipt is linked to direct-mode bill; asset posting should not be used."
        : "Create or link a finalized INVENTORY_CLEARING purchase bill before reviewing receipt asset posting.";
    }
    return "Review unit cost difference between bill and receipt.";
  }

  private reconciliationSummary(rows: ClearingReportRow[]) {
    const billClearingDebit = rows.reduce((sum, row) => sum.plus(row.billClearingDebit), new Prisma.Decimal(0));
    const receiptClearingCredit = rows.reduce((sum, row) => sum.plus(row.receiptClearingCredit), new Prisma.Decimal(0));
    const statusCount = (status: ClearingStatus) => rows.filter((row) => row.status === status).length;
    return {
      rowCount: rows.length,
      matchedCount: statusCount("MATCHED"),
      partialCount: statusCount("PARTIAL"),
      varianceCount: statusCount("VARIANCE"),
      billWithoutReceiptPostingCount: statusCount("BILL_WITHOUT_RECEIPT_POSTING"),
      receiptWithoutClearingBillCount: statusCount("RECEIPT_WITHOUT_CLEARING_BILL"),
      directModeExcludedCount: statusCount("DIRECT_MODE_EXCLUDED"),
      billClearingDebit: this.decimalString(billClearingDebit),
      receiptClearingCredit: this.decimalString(receiptClearingCredit),
      netClearingDifference: this.decimalString(billClearingDebit.minus(receiptClearingCredit)),
    };
  }

  private async clearingGlSummary(organizationId: string, clearingAccountId: string | null, query: NormalizedInventoryClearingReportQuery) {
    if (!clearingAccountId) {
      return { debit: new Prisma.Decimal(0), credit: new Prisma.Decimal(0), balance: new Prisma.Decimal(0) };
    }
    const entryDate = this.dateRange(query.fromDate, query.toDate);
    const lines = await this.prisma.journalLine.findMany({
      where: {
        organizationId,
        accountId: clearingAccountId,
        journalEntry: {
          status: { in: [JournalEntryStatus.POSTED, JournalEntryStatus.REVERSED] },
          ...(entryDate ? { entryDate } : {}),
        },
      },
      select: { debit: true, credit: true },
    });
    const debit = lines.reduce((sum, line) => sum.plus(line.debit), new Prisma.Decimal(0));
    const credit = lines.reduce((sum, line) => sum.plus(line.credit), new Prisma.Decimal(0));
    return { debit, credit, balance: debit.minus(credit) };
  }

  private async inventorySettings(organizationId: string) {
    return this.prisma.inventorySettings.findUnique({
      where: { organizationId },
      include: { inventoryClearingAccount: { select: accountSelect } },
    });
  }

  private reportWarnings(clearingAccount: { id: string } | null): string[] {
    const warnings = [REVIEW_ONLY_WARNING, "No automatic variance journals are created from these reports."];
    if (!clearingAccount) {
      warnings.push("Inventory clearing account is not mapped.");
    }
    return warnings;
  }

  private receiptValue(receipt: BillReceipt | ReportReceipt, trackedLineIds: Set<string> | null): Prisma.Decimal {
    return receipt.lines.reduce((sum, line) => {
      if (trackedLineIds && (!line.purchaseBillLineId || !trackedLineIds.has(line.purchaseBillLineId))) {
        return sum;
      }
      if (line.unitCost === null) {
        return sum;
      }
      return sum.plus(new Prisma.Decimal(line.quantity).mul(line.unitCost));
    }, new Prisma.Decimal(0));
  }

  private receiptQuantity(receipt: BillReceipt | ReportReceipt, trackedLineIds: Set<string> | null): Prisma.Decimal {
    if (receipt.status === PurchaseReceiptStatus.VOIDED) {
      return new Prisma.Decimal(0);
    }
    return receipt.lines.reduce((sum, line) => {
      if (trackedLineIds && (!line.purchaseBillLineId || !trackedLineIds.has(line.purchaseBillLineId))) {
        return sum;
      }
      return sum.plus(line.quantity);
    }, new Prisma.Decimal(0));
  }

  private validateDateRange(query: InventoryClearingReportQueryDto): NormalizedInventoryClearingReportQuery {
    const fromDate = this.parseOptionalDate(query.from, "from", "start");
    const toDate = this.parseOptionalDate(query.to, "to", "end");
    if (fromDate && toDate && fromDate > toDate) {
      throw new BadRequestException("Report from date must be before or equal to to date.");
    }
    return { ...query, fromDate, toDate };
  }

  private parseOptionalDate(value: string | undefined, label: string, boundary: "start" | "end"): Date | null {
    if (!value) {
      return null;
    }
    const normalized =
      /^\d{4}-\d{2}-\d{2}$/.test(value) && boundary === "start"
        ? `${value}T00:00:00.000Z`
        : /^\d{4}-\d{2}-\d{2}$/.test(value)
          ? `${value}T23:59:59.999Z`
          : value;
    const date = new Date(normalized);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`Invalid ${label} date.`);
    }
    return date;
  }

  private dateRange(fromDate: Date | null | undefined, toDate: Date | null | undefined): Prisma.DateTimeFilter | null {
    if (!fromDate && !toDate) {
      return null;
    }
    return {
      ...(fromDate ? { gte: fromDate } : {}),
      ...(toDate ? { lte: toDate } : {}),
    };
  }

  private decimalMin(left: Prisma.Decimal, right: Prisma.Decimal): Prisma.Decimal {
    return left.lte(right) ? left : right;
  }

  private decimalString(value: Prisma.Decimal): string {
    return value.toFixed(4);
  }

  private uniqueStrings(values: string[]): string[] {
    return [...new Set(values.filter(Boolean))];
  }
}

function filenameDate(value = new Date()): string {
  return value.toISOString().slice(0, 10);
}

function dateOnly(value: string | Date | null | undefined): string {
  if (!value) {
    return "";
  }
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toISOString().slice(0, 10);
}
