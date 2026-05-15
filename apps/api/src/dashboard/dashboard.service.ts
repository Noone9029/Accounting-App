import { Injectable } from "@nestjs/common";
import {
  BankAccountStatus,
  BankReconciliationStatus,
  BankStatementTransactionStatus,
  CustomerPaymentStatus,
  FiscalPeriodStatus,
  ItemStatus,
  JournalEntryStatus,
  Prisma,
  PurchaseBillStatus,
  SalesInvoiceStatus,
  StockMovementType,
  SupplierPaymentStatus,
  ZatcaRegistrationStatus,
} from "@prisma/client";
import { InventoryClearingReportService } from "../inventory/inventory-clearing-report.service";
import { PrismaService } from "../prisma/prisma.service";
import { ReportsService } from "../reports/reports.service";
import { stockMovementDirection } from "../stock-movements/stock-movement-rules";
import { StorageService } from "../storage/storage.service";
import { getZatcaProfileReadiness } from "../zatca/zatca.service";

const REPORT_LEDGER_STATUSES = [JournalEntryStatus.POSTED, JournalEntryStatus.REVERSED];
const AGING_BUCKET_LABELS = {
  CURRENT: "Current",
  "1_30": "1-30",
  "31_60": "31-60",
  "61_90": "61-90",
  "90_PLUS": "90+",
} as const;

type AttentionSeverity = "info" | "warning" | "critical";

interface AttentionItem {
  type: string;
  severity: AttentionSeverity;
  title: string;
  description: string;
  href: string;
}

interface DashboardMonth {
  key: string;
  start: Date;
  end: Date;
}

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reportsService: ReportsService,
    private readonly inventoryClearingReportService: InventoryClearingReportService,
    private readonly storageService: StorageService,
  ) {}

  async summary(organizationId: string) {
    const now = new Date();
    const todayStart = startOfUtcDay(now);
    const monthStart = startOfUtcMonth(now);
    const monthStartLabel = dateOnly(monthStart);
    const asOfLabel = dateOnly(now);
    const trendMonths = lastSixUtcMonths(now);
    const organization = await this.prisma.organization.findFirst({
      where: { id: organizationId },
      select: { id: true, baseCurrency: true },
    });
    const currency = organization?.baseCurrency ?? "SAR";

    const [sales, purchases, banking, inventory, reports, trends, aging, compliance, storageReadiness] = await Promise.all([
      this.salesSummary(organizationId, monthStart, todayStart),
      this.purchaseSummary(organizationId, monthStart, todayStart),
      this.bankingSummary(organizationId),
      this.inventorySummary(organizationId),
      this.reportSummary(organizationId, monthStartLabel, asOfLabel),
      this.trendSummary(organizationId, trendMonths),
      this.agingSummary(organizationId, asOfLabel),
      this.complianceSummary(organizationId, monthStart, now),
      Promise.resolve(this.storageService.readiness()),
    ]);

    return {
      asOf: now.toISOString(),
      currency,
      sales,
      purchases,
      banking,
      inventory,
      reports,
      trends,
      aging,
      compliance: {
        zatcaProductionReady: compliance.zatcaProductionReady,
        zatcaBlockingReasonCount: compliance.zatcaBlockingReasonCount,
        fiscalPeriodsLockedCount: compliance.fiscalPeriodsLockedCount,
        auditLogCountThisMonth: compliance.auditLogCountThisMonth,
      },
      attentionItems: this.attentionItems({
        sales,
        purchases,
        banking,
        inventory,
        compliance,
        storageDatabaseActive:
          storageReadiness.attachmentStorage.activeProvider === "database" ||
          storageReadiness.generatedDocumentStorage.activeProvider === "database",
      }),
    };
  }

  private async salesSummary(organizationId: string, monthStart: Date, todayStart: Date) {
    const invoices = await this.prisma.salesInvoice.findMany({
      where: { organizationId, status: SalesInvoiceStatus.FINALIZED },
      select: { issueDate: true, dueDate: true, total: true, balanceDue: true },
    });
    const unpaid = invoices.filter((invoice) => this.decimal(invoice.balanceDue).gt(0));
    const overdue = unpaid.filter((invoice) => (invoice.dueDate ?? invoice.issueDate) < todayStart);
    const payments = await this.prisma.customerPayment.findMany({
      where: { organizationId, status: CustomerPaymentStatus.POSTED, paymentDate: { gte: monthStart } },
      select: { amountReceived: true },
    });

    return {
      unpaidInvoiceCount: unpaid.length,
      unpaidInvoiceBalance: this.decimalString(sum(unpaid.map((invoice) => invoice.balanceDue))),
      overdueInvoiceCount: overdue.length,
      overdueInvoiceBalance: this.decimalString(sum(overdue.map((invoice) => invoice.balanceDue))),
      salesThisMonth: this.decimalString(sum(invoices.filter((invoice) => invoice.issueDate >= monthStart).map((invoice) => invoice.total))),
      customerPaymentThisMonth: this.decimalString(sum(payments.map((payment) => payment.amountReceived))),
    };
  }

  private async purchaseSummary(organizationId: string, monthStart: Date, todayStart: Date) {
    const bills = await this.prisma.purchaseBill.findMany({
      where: { organizationId, status: PurchaseBillStatus.FINALIZED },
      select: { billDate: true, dueDate: true, total: true, balanceDue: true },
    });
    const unpaid = bills.filter((bill) => this.decimal(bill.balanceDue).gt(0));
    const overdue = unpaid.filter((bill) => (bill.dueDate ?? bill.billDate) < todayStart);
    const payments = await this.prisma.supplierPayment.findMany({
      where: { organizationId, status: SupplierPaymentStatus.POSTED, paymentDate: { gte: monthStart } },
      select: { amountPaid: true },
    });

    return {
      unpaidBillCount: unpaid.length,
      unpaidBillBalance: this.decimalString(sum(unpaid.map((bill) => bill.balanceDue))),
      overdueBillCount: overdue.length,
      overdueBillBalance: this.decimalString(sum(overdue.map((bill) => bill.balanceDue))),
      purchasesThisMonth: this.decimalString(sum(bills.filter((bill) => bill.billDate >= monthStart).map((bill) => bill.total))),
      supplierPaymentThisMonth: this.decimalString(sum(payments.map((payment) => payment.amountPaid))),
    };
  }

  private async bankingSummary(organizationId: string) {
    const [profiles, unreconciledTransactionCount, latestReconciliation] = await Promise.all([
      this.prisma.bankAccountProfile.findMany({
        where: { organizationId, status: BankAccountStatus.ACTIVE },
        select: { accountId: true },
      }),
      this.prisma.bankStatementTransaction.count({
        where: { organizationId, status: BankStatementTransactionStatus.UNMATCHED },
      }),
      this.prisma.bankReconciliation.findFirst({
        where: { organizationId, status: BankReconciliationStatus.CLOSED },
        orderBy: [{ closedAt: "desc" }, { periodEnd: "desc" }],
        select: { closedAt: true, periodEnd: true },
      }),
    ]);
    const accountIds = profiles.map((profile) => profile.accountId);
    const lines =
      accountIds.length === 0
        ? []
        : await this.prisma.journalLine.findMany({
            where: {
              organizationId,
              accountId: { in: accountIds },
              journalEntry: { status: { in: REPORT_LEDGER_STATUSES } },
            },
            select: { debit: true, credit: true },
          });
    const totalBankBalance = lines.reduce(
      (balance, line) => balance.plus(this.decimal(line.debit)).minus(this.decimal(line.credit)),
      new Prisma.Decimal(0),
    );

    return {
      bankAccountCount: profiles.length,
      totalBankBalance: this.decimalString(totalBankBalance),
      unreconciledTransactionCount,
      latestReconciliationDate: latestReconciliation ? (latestReconciliation.closedAt ?? latestReconciliation.periodEnd).toISOString() : null,
    };
  }

  private async trendSummary(organizationId: string, months: DashboardMonth[]) {
    const firstMonth = months[0];
    const lastMonth = months[months.length - 1];
    if (!firstMonth || !lastMonth) {
      return { monthlySales: [], monthlyPurchases: [], monthlyNetProfit: [], cashBalanceTrend: [] };
    }

    const [invoices, bills, profitAndLossReports, cashBalanceTrend] = await Promise.all([
      this.prisma.salesInvoice.findMany({
        where: {
          organizationId,
          status: SalesInvoiceStatus.FINALIZED,
          issueDate: { gte: firstMonth.start, lte: lastMonth.end },
        },
        select: { issueDate: true, total: true },
      }),
      this.prisma.purchaseBill.findMany({
        where: {
          organizationId,
          status: PurchaseBillStatus.FINALIZED,
          billDate: { gte: firstMonth.start, lte: lastMonth.end },
        },
        select: { billDate: true, total: true },
      }),
      Promise.all(
        months.map((month) =>
          this.reportsService.profitAndLoss(organizationId, {
            from: dateOnly(month.start),
            to: dateOnly(month.end),
          }),
        ),
      ),
      this.cashBalanceTrend(organizationId, months),
    ]);

    const salesByMonth = monthlyTotals(
      months,
      invoices,
      (invoice) => invoice.issueDate,
      (invoice) => invoice.total,
    );
    const purchasesByMonth = monthlyTotals(
      months,
      bills,
      (bill) => bill.billDate,
      (bill) => bill.total,
    );

    return {
      monthlySales: months.map((month) => ({ month: month.key, amount: this.decimalString(salesByMonth.get(month.key) ?? 0) })),
      monthlyPurchases: months.map((month) => ({ month: month.key, amount: this.decimalString(purchasesByMonth.get(month.key) ?? 0) })),
      monthlyNetProfit: months.map((month, index) => ({
        month: month.key,
        amount: this.decimalString(profitAndLossReports[index]?.netProfit ?? 0),
      })),
      cashBalanceTrend,
    };
  }

  private async cashBalanceTrend(organizationId: string, months: DashboardMonth[]) {
    const accountIds = (
      await this.prisma.bankAccountProfile.findMany({
        where: { organizationId, status: BankAccountStatus.ACTIVE },
        select: { accountId: true },
      })
    ).map((profile) => profile.accountId);

    if (accountIds.length === 0) {
      return months.map((month) => ({ date: dateOnly(month.start), balance: "0.0000" }));
    }

    const latestEnd = months[months.length - 1]?.end;
    const lines = await this.prisma.journalLine.findMany({
      where: {
        organizationId,
        accountId: { in: accountIds },
        journalEntry: {
          status: { in: REPORT_LEDGER_STATUSES },
          ...(latestEnd ? { entryDate: { lte: latestEnd } } : {}),
        },
      },
      select: {
        debit: true,
        credit: true,
        journalEntry: { select: { entryDate: true } },
      },
    });

    return months.map((month) => {
      const balance = lines.reduce((total, line) => {
        const entryDate = line.journalEntry?.entryDate ? new Date(line.journalEntry.entryDate) : null;
        if (entryDate && entryDate > month.end) {
          return total;
        }
        return total.plus(this.decimal(line.debit)).minus(this.decimal(line.credit));
      }, new Prisma.Decimal(0));
      return { date: dateOnly(month.start), balance: this.decimalString(balance) };
    });
  }

  private async inventorySummary(organizationId: string) {
    const [items, movements, varianceReport] = await Promise.all([
      this.prisma.item.findMany({
        where: { organizationId, inventoryTracking: true, status: ItemStatus.ACTIVE },
        orderBy: [{ name: "asc" }],
        select: { id: true, name: true, reorderPoint: true },
      }),
      this.prisma.stockMovement.findMany({
        where: { organizationId },
        select: { itemId: true, type: true, quantity: true, unitCost: true, totalCost: true },
      }),
      this.inventoryClearingReportService.clearingVarianceReport(organizationId),
    ]);
    const movementsByItem = new Map<string, typeof movements>();
    for (const movement of movements) {
      movementsByItem.set(movement.itemId, [...(movementsByItem.get(movement.itemId) ?? []), movement]);
    }

    let lowStockCount = 0;
    let negativeStockCount = 0;
    let inventoryEstimatedValue = new Prisma.Decimal(0);
    const lowStockItems: Array<{ itemId: string; name: string; quantityOnHand: string; reorderPoint: string }> = [];
    for (const item of items) {
      const summary = this.stockSummary(movementsByItem.get(item.id) ?? []);
      if (summary.quantityOnHand.lt(0)) {
        negativeStockCount += 1;
      }
      if (item.reorderPoint && summary.quantityOnHand.lte(item.reorderPoint)) {
        lowStockCount += 1;
        lowStockItems.push({
          itemId: item.id,
          name: item.name,
          quantityOnHand: this.decimalString(summary.quantityOnHand),
          reorderPoint: this.decimalString(item.reorderPoint),
        });
      }
      if (summary.inventoryValue) {
        inventoryEstimatedValue = inventoryEstimatedValue.plus(summary.inventoryValue);
      }
    }

    return {
      trackedItemCount: items.length,
      lowStockCount,
      negativeStockCount,
      inventoryEstimatedValue: this.decimalString(inventoryEstimatedValue),
      clearingVarianceCount: varianceReport.summary.rowCount,
      lowStockItems: lowStockItems
        .sort((a, b) => new Prisma.Decimal(a.quantityOnHand).cmp(new Prisma.Decimal(b.quantityOnHand)))
        .slice(0, 5),
    };
  }

  private async agingSummary(organizationId: string, asOf: string) {
    const [receivables, payables] = await Promise.all([
      this.reportsService.agedReceivables(organizationId, { asOf }),
      this.reportsService.agedPayables(organizationId, { asOf }),
    ]);

    return {
      receivablesBuckets: agingBuckets(receivables.bucketTotals),
      payablesBuckets: agingBuckets(payables.bucketTotals),
    };
  }

  private async reportSummary(organizationId: string, monthStart: string, asOf: string) {
    const [trialBalance, profitAndLoss, balanceSheet] = await Promise.all([
      this.reportsService.trialBalance(organizationId, { to: asOf }),
      this.reportsService.profitAndLoss(organizationId, { from: monthStart, to: asOf }),
      this.reportsService.balanceSheet(organizationId, { asOf }),
    ]);

    return {
      trialBalanceBalanced: trialBalance.totals.balanced,
      profitAndLossNetProfit: profitAndLoss.netProfit,
      balanceSheetBalanced: balanceSheet.balanced,
    };
  }

  private async complianceSummary(organizationId: string, monthStart: Date, now: Date) {
    const [zatca, fiscalPeriodsLockedCount, auditLogCountThisMonth, currentPeriod] = await Promise.all([
      this.zatcaSummary(organizationId),
      this.prisma.fiscalPeriod.count({ where: { organizationId, status: FiscalPeriodStatus.LOCKED } }),
      this.prisma.auditLog.count({ where: { organizationId, createdAt: { gte: monthStart } } }),
      this.prisma.fiscalPeriod.findFirst({
        where: { organizationId, startsOn: { lte: now }, endsOn: { gte: now } },
        select: { status: true },
      }),
    ]);

    return {
      ...zatca,
      fiscalPeriodsLockedCount,
      auditLogCountThisMonth,
      currentFiscalPeriodStatus: currentPeriod?.status ?? null,
    };
  }

  private async zatcaSummary(organizationId: string) {
    const [profile, activeEgs, localXmlCount] = await Promise.all([
      this.prisma.zatcaOrganizationProfile.findUnique({
        where: { organizationId },
        select: { sellerName: true, vatNumber: true, city: true, countryCode: true },
      }),
      this.prisma.zatcaEgsUnit.findFirst({
        where: { organizationId, isActive: true, status: ZatcaRegistrationStatus.ACTIVE },
        select: { id: true, csrPem: true, complianceCsidPem: true },
      }),
      this.prisma.zatcaInvoiceMetadata.count({ where: { organizationId, xmlBase64: { not: null } } }),
    ]);
    const profileReadiness = getZatcaProfileReadiness(profile ?? {});
    const blockingReasons: string[] = [];
    if (!profileReadiness.ready) {
      blockingReasons.push(`ZATCA profile is missing: ${profileReadiness.missingFields.join(", ")}.`);
    }
    if (!activeEgs) {
      blockingReasons.push("No active development EGS unit is configured.");
    }
    if (activeEgs && !activeEgs.csrPem) {
      blockingReasons.push("Active EGS unit does not have a CSR yet.");
    }
    if (!activeEgs?.complianceCsidPem) {
      blockingReasons.push("No active EGS unit has a local mock compliance CSID.");
    }
    if (localXmlCount === 0) {
      blockingReasons.push("No local ZATCA XML has been generated for an invoice yet.");
    }
    blockingReasons.push("Production readiness is intentionally false until official validation, signing, API integration, and PDF/A-3 are complete.");

    return {
      zatcaProductionReady: false,
      zatcaBlockingReasonCount: blockingReasons.length,
    };
  }

  private attentionItems(input: {
    sales: Awaited<ReturnType<DashboardService["salesSummary"]>>;
    purchases: Awaited<ReturnType<DashboardService["purchaseSummary"]>>;
    banking: Awaited<ReturnType<DashboardService["bankingSummary"]>>;
    inventory: Awaited<ReturnType<DashboardService["inventorySummary"]>>;
    compliance: Awaited<ReturnType<DashboardService["complianceSummary"]>>;
    storageDatabaseActive: boolean;
  }): AttentionItem[] {
    const items: AttentionItem[] = [];
    if (input.sales.overdueInvoiceCount > 0) {
      items.push({
        type: "OVERDUE_INVOICES",
        severity: "warning",
        title: "Overdue invoices need follow-up",
        description: `${input.sales.overdueInvoiceCount} invoices are overdue with ${input.sales.overdueInvoiceBalance} still outstanding.`,
        href: "/reports/aged-receivables",
      });
    }
    if (input.purchases.overdueBillCount > 0) {
      items.push({
        type: "OVERDUE_BILLS",
        severity: "warning",
        title: "Overdue supplier bills",
        description: `${input.purchases.overdueBillCount} bills are overdue with ${input.purchases.overdueBillBalance} still unpaid.`,
        href: "/reports/aged-payables",
      });
    }
    if (input.banking.unreconciledTransactionCount > 0) {
      items.push({
        type: "UNRECONCILED_BANK_TRANSACTIONS",
        severity: "warning",
        title: "Bank transactions are unreconciled",
        description: `${input.banking.unreconciledTransactionCount} imported bank transactions are still unmatched.`,
        href: "/bank-accounts",
      });
    }
    if (input.inventory.lowStockCount > 0) {
      items.push({
        type: "LOW_STOCK",
        severity: "warning",
        title: "Inventory below reorder point",
        description: `${input.inventory.lowStockCount} tracked items are at or below their reorder point.`,
        href: "/inventory/reports/low-stock",
      });
    }
    if (input.inventory.clearingVarianceCount > 0) {
      items.push({
        type: "INVENTORY_CLEARING_VARIANCE",
        severity: "critical",
        title: "Inventory clearing variance exists",
        description: `${input.inventory.clearingVarianceCount} clearing variance rows need accountant review.`,
        href: "/inventory/reports/clearing-variance",
      });
    }
    if (!input.compliance.zatcaProductionReady) {
      items.push({
        type: "ZATCA_NOT_READY",
        severity: "info",
        title: "ZATCA production readiness is incomplete",
        description: `${input.compliance.zatcaBlockingReasonCount} readiness blockers remain in the local ZATCA checklist.`,
        href: "/settings/zatca",
      });
    }
    if (!input.compliance.currentFiscalPeriodStatus) {
      items.push({
        type: "FISCAL_PERIOD_MISSING",
        severity: "warning",
        title: "No current fiscal period found",
        description: "Create or review fiscal periods so posting-date controls have current-period coverage.",
        href: "/fiscal-periods",
      });
    } else if (input.compliance.currentFiscalPeriodStatus !== FiscalPeriodStatus.OPEN) {
      items.push({
        type: "FISCAL_PERIOD_NOT_OPEN",
        severity: "critical",
        title: "Current fiscal period is not open",
        description: `The current fiscal period is ${input.compliance.currentFiscalPeriodStatus.toLowerCase()}. Posting workflows may be blocked.`,
        href: "/fiscal-periods",
      });
    }
    if (input.storageDatabaseActive) {
      items.push({
        type: "DATABASE_STORAGE_ACTIVE",
        severity: "info",
        title: "Document storage is database-backed",
        description: "Database/base64 storage is acceptable for testing but should be reviewed before production scale.",
        href: "/settings/storage",
      });
    }
    return items;
  }

  private stockSummary(
    movements: Array<{
      type: StockMovementType;
      quantity: Prisma.Decimal.Value;
      unitCost: Prisma.Decimal.Value | null;
      totalCost: Prisma.Decimal.Value | null;
    }>,
  ) {
    let quantityOnHand = new Prisma.Decimal(0);
    let costedInQuantity = new Prisma.Decimal(0);
    let costedInValue = new Prisma.Decimal(0);

    for (const movement of movements) {
      const quantity = this.decimal(movement.quantity);
      if (stockMovementDirection(movement.type) === "IN") {
        quantityOnHand = quantityOnHand.plus(quantity);
        const movementValue = movement.totalCost
          ? this.decimal(movement.totalCost)
          : movement.unitCost
            ? quantity.mul(movement.unitCost)
            : null;
        if (movementValue && quantity.gt(0)) {
          costedInQuantity = costedInQuantity.plus(quantity);
          costedInValue = costedInValue.plus(movementValue);
        }
      } else {
        quantityOnHand = quantityOnHand.minus(quantity);
      }
    }

    const averageUnitCost = costedInQuantity.gt(0) ? costedInValue.div(costedInQuantity) : null;
    return {
      quantityOnHand,
      inventoryValue: averageUnitCost ? averageUnitCost.mul(quantityOnHand) : null,
    };
  }

  private decimal(value: Prisma.Decimal.Value): Prisma.Decimal {
    return new Prisma.Decimal(value);
  }

  private decimalString(value: Prisma.Decimal.Value): string {
    return this.decimal(value).toFixed(4);
  }
}

function sum(values: Prisma.Decimal.Value[]): Prisma.Decimal {
  return values.reduce<Prisma.Decimal>((total, value) => total.plus(value), new Prisma.Decimal(0));
}

function monthlyTotals<T>(
  months: DashboardMonth[],
  records: T[],
  getDate: (record: T) => Date,
  getAmount: (record: T) => Prisma.Decimal.Value,
): Map<string, Prisma.Decimal> {
  const totals = new Map(months.map((month) => [month.key, new Prisma.Decimal(0)]));
  for (const record of records) {
    const key = monthKey(getDate(record));
    const current = totals.get(key);
    if (current) {
      totals.set(key, current.plus(getAmount(record)));
    }
  }
  return totals;
}

function agingBuckets(bucketTotals: Record<string, Prisma.Decimal.Value>) {
  return Object.entries(AGING_BUCKET_LABELS).map(([key, label]) => ({
    bucket: label,
    amount: new Prisma.Decimal(bucketTotals[key] ?? 0).toFixed(4),
  }));
}

function lastSixUtcMonths(now: Date): DashboardMonth[] {
  const currentMonth = startOfUtcMonth(now);
  return Array.from({ length: 6 }, (_, index) => {
    const start = addUtcMonths(currentMonth, index - 5);
    return {
      key: monthKey(start),
      start,
      end: endOfUtcMonth(start),
    };
  });
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function startOfUtcMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function addUtcMonths(date: Date, delta: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + delta, 1));
}

function endOfUtcMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0, 23, 59, 59, 999));
}

function monthKey(date: Date): string {
  return date.toISOString().slice(0, 7);
}

function dateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}
