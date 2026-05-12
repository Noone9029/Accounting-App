import { Injectable } from "@nestjs/common";
import { AccountType, JournalEntryStatus, PurchaseBillStatus, SalesInvoiceStatus } from "@prisma/client";
import { Decimal } from "decimal.js";
import { PrismaService } from "../prisma/prisma.service";

const POSTED_REPORT_STATUSES = [JournalEntryStatus.POSTED, JournalEntryStatus.REVERSED];
const ZERO = new Decimal(0);

export interface ReportDateQuery {
  from?: string;
  to?: string;
  asOf?: string;
  accountId?: string;
  includeZero?: string | boolean;
}

export interface ReportAccountInput {
  id: string;
  code: string;
  name: string;
  type: AccountType;
}

export interface ReportJournalLineInput {
  id?: string;
  accountId: string;
  debit: unknown;
  credit: unknown;
  description?: string | null;
  lineNumber?: number;
  journalEntry: {
    id: string;
    entryNumber: string;
    entryDate: string | Date;
    description: string;
    reference?: string | null;
  };
}

interface AgingDocumentInput {
  id: string;
  number: string;
  contact: { id: string; name: string; displayName?: string | null };
  issueDate: string | Date;
  dueDate?: string | Date | null;
  total: unknown;
  balanceDue: unknown;
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async generalLedger(organizationId: string, query: ReportDateQuery) {
    const range = parseRange(query);
    const accounts = await this.prisma.account.findMany({
      where: { organizationId, ...(query.accountId ? { id: query.accountId } : {}) },
      orderBy: [{ code: "asc" }],
      select: { id: true, code: true, name: true, type: true },
    });
    const openingLines = range.from
      ? await this.findJournalLines(organizationId, { before: range.from, accountId: query.accountId })
      : [];
    const periodLines = await this.findJournalLines(organizationId, { from: range.from, to: range.to, accountId: query.accountId });

    return buildGeneralLedgerReport(accounts, openingLines, periodLines, {
      from: range.fromLabel,
      to: range.toLabel,
      includeZero: boolQuery(query.includeZero),
    });
  }

  async trialBalance(organizationId: string, query: ReportDateQuery) {
    const range = parseRange(query);
    const accounts = await this.prisma.account.findMany({
      where: { organizationId },
      orderBy: [{ code: "asc" }],
      select: { id: true, code: true, name: true, type: true },
    });
    const openingLines = range.from ? await this.findJournalLines(organizationId, { before: range.from }) : [];
    const periodLines = await this.findJournalLines(organizationId, { from: range.from, to: range.to });

    return buildTrialBalanceReport(accounts, openingLines, periodLines, {
      from: range.fromLabel,
      to: range.toLabel,
      includeZero: boolQuery(query.includeZero),
    });
  }

  async profitAndLoss(organizationId: string, query: ReportDateQuery) {
    const range = parseRange(query);
    const accounts = await this.prisma.account.findMany({
      where: { organizationId, type: { in: [AccountType.REVENUE, AccountType.COST_OF_SALES, AccountType.EXPENSE] } },
      orderBy: [{ code: "asc" }],
      select: { id: true, code: true, name: true, type: true },
    });
    const lines = await this.findJournalLines(organizationId, { from: range.from, to: range.to });
    return buildProfitAndLossReport(accounts, lines, { from: range.fromLabel, to: range.toLabel });
  }

  async balanceSheet(organizationId: string, query: ReportDateQuery) {
    const asOf = parseEndDate(query.asOf);
    const accounts = await this.prisma.account.findMany({
      where: { organizationId },
      orderBy: [{ code: "asc" }],
      select: { id: true, code: true, name: true, type: true },
    });
    const lines = await this.findJournalLines(organizationId, { to: asOf });
    return buildBalanceSheetReport(accounts, lines, { asOf: dateLabel(query.asOf, asOf) });
  }

  async vatSummary(organizationId: string, query: ReportDateQuery) {
    const range = parseRange(query);
    const vatAccounts = await this.prisma.account.findMany({
      where: { organizationId, code: { in: ["220", "230"] } },
      orderBy: [{ code: "asc" }],
      select: { id: true, code: true, name: true, type: true },
    });
    const lines = await this.findJournalLines(organizationId, { from: range.from, to: range.to });
    return buildVatSummaryReport(vatAccounts, lines, { from: range.fromLabel, to: range.toLabel });
  }

  async agedReceivables(organizationId: string, query: ReportDateQuery) {
    const asOf = parseEndDate(query.asOf) ?? endOfToday();
    const invoices = await this.prisma.salesInvoice.findMany({
      where: {
        organizationId,
        status: SalesInvoiceStatus.FINALIZED,
        balanceDue: { gt: "0.0000" },
        issueDate: { lte: asOf },
      },
      orderBy: [{ dueDate: "asc" }, { issueDate: "asc" }],
      include: { customer: { select: { id: true, name: true, displayName: true } } },
    });

    return buildAgingReport(
      invoices.map((invoice) => ({
        id: invoice.id,
        number: invoice.invoiceNumber,
        contact: invoice.customer,
        issueDate: invoice.issueDate,
        dueDate: invoice.dueDate,
        total: invoice.total,
        balanceDue: invoice.balanceDue,
      })),
      { asOf: dateLabel(query.asOf, asOf), kind: "receivables" },
    );
  }

  async agedPayables(organizationId: string, query: ReportDateQuery) {
    const asOf = parseEndDate(query.asOf) ?? endOfToday();
    const bills = await this.prisma.purchaseBill.findMany({
      where: {
        organizationId,
        status: PurchaseBillStatus.FINALIZED,
        balanceDue: { gt: "0.0000" },
        billDate: { lte: asOf },
      },
      orderBy: [{ dueDate: "asc" }, { billDate: "asc" }],
      include: { supplier: { select: { id: true, name: true, displayName: true } } },
    });

    return buildAgingReport(
      bills.map((bill) => ({
        id: bill.id,
        number: bill.billNumber,
        contact: bill.supplier,
        issueDate: bill.billDate,
        dueDate: bill.dueDate,
        total: bill.total,
        balanceDue: bill.balanceDue,
      })),
      { asOf: dateLabel(query.asOf, asOf), kind: "payables" },
    );
  }

  private async findJournalLines(
    organizationId: string,
    filters: { from?: Date | null; to?: Date | null; before?: Date | null; accountId?: string },
  ) {
    const entryDate: { gte?: Date; lte?: Date; lt?: Date } = {};
    if (filters.before) {
      entryDate.lt = filters.before;
    }
    if (filters.from) {
      entryDate.gte = filters.from;
    }
    if (filters.to) {
      entryDate.lte = filters.to;
    }

    return this.prisma.journalLine.findMany({
      where: {
        organizationId,
        ...(filters.accountId ? { accountId: filters.accountId } : {}),
        journalEntry: {
          status: { in: POSTED_REPORT_STATUSES },
          ...(Object.keys(entryDate).length ? { entryDate } : {}),
        },
      },
      include: {
        account: { select: { id: true, code: true, name: true, type: true } },
        journalEntry: {
          select: {
            id: true,
            entryNumber: true,
            entryDate: true,
            description: true,
            reference: true,
          },
        },
      },
      orderBy: [{ journalEntry: { entryDate: "asc" } }, { lineNumber: "asc" }],
    });
  }
}

export function buildGeneralLedgerReport(
  accounts: ReportAccountInput[],
  openingLines: ReportJournalLineInput[],
  periodLines: ReportJournalLineInput[],
  options: { from: string | null; to: string | null; includeZero?: boolean },
) {
  const openingByAccount = aggregateLines(openingLines);
  const periodByAccount = aggregateLines(periodLines);
  const periodLinesByAccount = groupLines(periodLines);

  return {
    from: options.from,
    to: options.to,
    accounts: accounts
      .map((account) => {
        const opening = openingByAccount.get(account.id) ?? emptyAggregate();
        const period = periodByAccount.get(account.id) ?? emptyAggregate();
        const closingNet = opening.net.plus(period.net);
        const openingPair = debitCreditPair(opening.net);
        const closingPair = debitCreditPair(closingNet);
        let runningNet = opening.net;
        const lines = (periodLinesByAccount.get(account.id) ?? [])
          .sort(compareJournalLines)
          .map((line) => {
            runningNet = runningNet.plus(money(line.debit)).minus(money(line.credit));
            return {
              date: toIso(line.journalEntry.entryDate),
              journalEntryId: line.journalEntry.id,
              entryNumber: line.journalEntry.entryNumber,
              description: line.description ?? line.journalEntry.description,
              reference: line.journalEntry.reference ?? null,
              debit: fixed(line.debit),
              credit: fixed(line.credit),
              runningBalance: fixed(naturalBalance(account.type, runningNet)),
            };
          });

        return {
          accountId: account.id,
          code: account.code,
          name: account.name,
          type: account.type,
          openingDebit: openingPair.debit,
          openingCredit: openingPair.credit,
          periodDebit: fixed(period.debit),
          periodCredit: fixed(period.credit),
          closingDebit: closingPair.debit,
          closingCredit: closingPair.credit,
          lines,
          isZero: opening.net.eq(0) && period.debit.eq(0) && period.credit.eq(0),
        };
      })
      .filter((account) => options.includeZero || !account.isZero)
      .map(({ isZero: _isZero, ...account }) => account),
  };
}

export function buildTrialBalanceReport(
  accounts: ReportAccountInput[],
  openingLines: ReportJournalLineInput[],
  periodLines: ReportJournalLineInput[],
  options: { from: string | null; to: string | null; includeZero?: boolean },
) {
  const openingByAccount = aggregateLines(openingLines);
  const periodByAccount = aggregateLines(periodLines);
  const rows = accounts
    .map((account) => {
      const opening = openingByAccount.get(account.id) ?? emptyAggregate();
      const period = periodByAccount.get(account.id) ?? emptyAggregate();
      const closingNet = opening.net.plus(period.net);
      const openingPair = debitCreditPair(opening.net);
      const closingPair = debitCreditPair(closingNet);
      return {
        accountId: account.id,
        code: account.code,
        name: account.name,
        type: account.type,
        openingDebit: openingPair.debit,
        openingCredit: openingPair.credit,
        periodDebit: fixed(period.debit),
        periodCredit: fixed(period.credit),
        closingDebit: closingPair.debit,
        closingCredit: closingPair.credit,
        isZero: opening.net.eq(0) && period.debit.eq(0) && period.credit.eq(0),
      };
    })
    .filter((account) => options.includeZero || !account.isZero)
    .map(({ isZero: _isZero, ...account }) => account);

  const totals = rows.reduce(
    (sum, row) => ({
      openingDebit: sum.openingDebit.plus(row.openingDebit),
      openingCredit: sum.openingCredit.plus(row.openingCredit),
      periodDebit: sum.periodDebit.plus(row.periodDebit),
      periodCredit: sum.periodCredit.plus(row.periodCredit),
      closingDebit: sum.closingDebit.plus(row.closingDebit),
      closingCredit: sum.closingCredit.plus(row.closingCredit),
    }),
    {
      openingDebit: ZERO,
      openingCredit: ZERO,
      periodDebit: ZERO,
      periodCredit: ZERO,
      closingDebit: ZERO,
      closingCredit: ZERO,
    },
  );

  return {
    from: options.from,
    to: options.to,
    accounts: rows,
    totals: {
      openingDebit: fixed(totals.openingDebit),
      openingCredit: fixed(totals.openingCredit),
      periodDebit: fixed(totals.periodDebit),
      periodCredit: fixed(totals.periodCredit),
      closingDebit: fixed(totals.closingDebit),
      closingCredit: fixed(totals.closingCredit),
      balanced: totals.closingDebit.eq(totals.closingCredit),
    },
  };
}

export function buildProfitAndLossReport(
  accounts: ReportAccountInput[],
  periodLines: ReportJournalLineInput[],
  options: { from: string | null; to: string | null },
) {
  const periodByAccount = aggregateLines(periodLines);
  const sectionTypes = [AccountType.REVENUE, AccountType.COST_OF_SALES, AccountType.EXPENSE] as const;
  const sections = sectionTypes.map((type) => {
    const rows = accounts
      .filter((account) => account.type === type)
      .map((account) => {
        const period = periodByAccount.get(account.id) ?? emptyAggregate();
        const amount = type === AccountType.REVENUE ? period.credit.minus(period.debit) : period.debit.minus(period.credit);
        return {
          accountId: account.id,
          code: account.code,
          name: account.name,
          type: account.type,
          amount: fixed(amount),
          isZero: amount.eq(0),
        };
      })
      .filter((account) => !account.isZero)
      .map(({ isZero: _isZero, ...account }) => account);
    const total = rows.reduce((sum, row) => sum.plus(row.amount), ZERO);
    return { type, total: fixed(total), accounts: rows };
  });
  const revenue = decimalSection(sections, AccountType.REVENUE);
  const costOfSales = decimalSection(sections, AccountType.COST_OF_SALES);
  const expenses = decimalSection(sections, AccountType.EXPENSE);
  const grossProfit = revenue.minus(costOfSales);
  const netProfit = grossProfit.minus(expenses);

  return {
    from: options.from,
    to: options.to,
    revenue: fixed(revenue),
    costOfSales: fixed(costOfSales),
    grossProfit: fixed(grossProfit),
    expenses: fixed(expenses),
    netProfit: fixed(netProfit),
    sections,
  };
}

export function buildBalanceSheetReport(
  accounts: ReportAccountInput[],
  lines: ReportJournalLineInput[],
  options: { asOf: string | null },
) {
  const byAccount = aggregateLines(lines);
  const section = (type: AccountType) => {
    const rows = accounts
      .filter((account) => account.type === type)
      .map((account) => {
        const aggregate = byAccount.get(account.id) ?? emptyAggregate();
        const amount = type === AccountType.ASSET ? aggregate.debit.minus(aggregate.credit) : aggregate.credit.minus(aggregate.debit);
        return { accountId: account.id, code: account.code, name: account.name, type, amount: fixed(amount), isZero: amount.eq(0) };
      })
      .filter((row) => !row.isZero)
      .map(({ isZero: _isZero, ...row }) => row);
    return { total: fixed(rows.reduce((sum, row) => sum.plus(row.amount), ZERO)), accounts: rows };
  };
  const assets = section(AccountType.ASSET);
  const liabilities = section(AccountType.LIABILITY);
  const equity = section(AccountType.EQUITY);
  const profitAndLoss = buildProfitAndLossReport(
    accounts.filter((account) => isProfitAndLossAccountType(account.type)),
    lines,
    { from: null, to: options.asOf },
  );
  const retainedEarnings = money(profitAndLoss.netProfit);
  const totalAssets = money(assets.total);
  const totalLiabilitiesAndEquity = money(liabilities.total).plus(equity.total).plus(retainedEarnings);
  const difference = totalAssets.minus(totalLiabilitiesAndEquity);

  return {
    asOf: options.asOf,
    assets,
    liabilities,
    equity,
    retainedEarnings: fixed(retainedEarnings),
    totalAssets: fixed(totalAssets),
    totalLiabilitiesAndEquity: fixed(totalLiabilitiesAndEquity),
    difference: fixed(difference),
    balanced: difference.eq(0),
  };
}

export function buildVatSummaryReport(
  vatAccounts: ReportAccountInput[],
  periodLines: ReportJournalLineInput[],
  options: { from: string | null; to: string | null },
) {
  const byAccount = aggregateLines(periodLines);
  const vatPayable = vatAccounts.find((account) => account.code === "220");
  const vatReceivable = vatAccounts.find((account) => account.code === "230");
  const payable = vatPayable ? byAccount.get(vatPayable.id) ?? emptyAggregate() : emptyAggregate();
  const receivable = vatReceivable ? byAccount.get(vatReceivable.id) ?? emptyAggregate() : emptyAggregate();
  const salesVat = payable.credit.minus(payable.debit);
  const purchaseVat = receivable.debit.minus(receivable.credit);
  const netVatPayable = salesVat.minus(purchaseVat);

  return {
    from: options.from,
    to: options.to,
    salesVat: fixed(salesVat),
    purchaseVat: fixed(purchaseVat),
    netVatPayable: fixed(netVatPayable),
    sections: [
      { category: "SALES_VAT_PAYABLE", accountCode: "220", amount: "0.0000", taxAmount: fixed(salesVat) },
      { category: "PURCHASE_VAT_RECEIVABLE", accountCode: "230", amount: "0.0000", taxAmount: fixed(purchaseVat) },
    ],
    notes: [
      "This is not an official VAT return filing report yet.",
      "VAT summary is derived from posted journal activity in VAT Payable 220 and VAT Receivable 230.",
    ],
  };
}

export function buildAgingReport(documents: AgingDocumentInput[], options: { asOf: string | null; kind: "receivables" | "payables" }) {
  const asOf = parseEndDate(options.asOf) ?? endOfToday();
  const rows = documents.map((document) => {
    const dueDate = document.dueDate ?? document.issueDate;
    const daysOverdue = daysBetween(endOfDay(dueDate), asOf);
    const bucket = agingBucket(daysOverdue);
    return {
      id: document.id,
      contact: document.contact,
      number: document.number,
      issueDate: toIso(document.issueDate),
      dueDate: document.dueDate ? toIso(document.dueDate) : null,
      total: fixed(document.total),
      balanceDue: fixed(document.balanceDue),
      daysOverdue,
      bucket,
    };
  });
  const bucketTotals = emptyBucketTotals();
  for (const row of rows) {
    bucketTotals[row.bucket] = fixed(money(bucketTotals[row.bucket]).plus(row.balanceDue));
  }
  const grandTotal = rows.reduce((sum, row) => sum.plus(row.balanceDue), ZERO);
  return { asOf: dateLabel(options.asOf, asOf), kind: options.kind, rows, bucketTotals, grandTotal: fixed(grandTotal) };
}

export function agingBucket(daysOverdue: number): "CURRENT" | "1_30" | "31_60" | "61_90" | "90_PLUS" {
  if (daysOverdue <= 0) {
    return "CURRENT";
  }
  if (daysOverdue <= 30) {
    return "1_30";
  }
  if (daysOverdue <= 60) {
    return "31_60";
  }
  if (daysOverdue <= 90) {
    return "61_90";
  }
  return "90_PLUS";
}

function aggregateLines(lines: ReportJournalLineInput[]) {
  const map = new Map<string, ReturnType<typeof emptyAggregate>>();
  for (const line of lines) {
    const aggregate = map.get(line.accountId) ?? emptyAggregate();
    aggregate.debit = aggregate.debit.plus(money(line.debit));
    aggregate.credit = aggregate.credit.plus(money(line.credit));
    aggregate.net = aggregate.debit.minus(aggregate.credit);
    map.set(line.accountId, aggregate);
  }
  return map;
}

function groupLines(lines: ReportJournalLineInput[]) {
  const map = new Map<string, ReportJournalLineInput[]>();
  for (const line of lines) {
    map.set(line.accountId, [...(map.get(line.accountId) ?? []), line]);
  }
  return map;
}

function emptyAggregate() {
  return { debit: ZERO, credit: ZERO, net: ZERO };
}

function debitCreditPair(net: Decimal) {
  return net.greaterThanOrEqualTo(0) ? { debit: fixed(net), credit: "0.0000" } : { debit: "0.0000", credit: fixed(net.abs()) };
}

function naturalBalance(type: AccountType, net: Decimal) {
  return isDebitPositiveType(type) ? net : net.negated();
}

function isDebitPositiveType(type: AccountType): boolean {
  return type === AccountType.ASSET || type === AccountType.EXPENSE || type === AccountType.COST_OF_SALES;
}

function isProfitAndLossAccountType(type: AccountType): boolean {
  return type === AccountType.REVENUE || type === AccountType.COST_OF_SALES || type === AccountType.EXPENSE;
}

function compareJournalLines(a: ReportJournalLineInput, b: ReportJournalLineInput) {
  const dateDelta = new Date(a.journalEntry.entryDate).getTime() - new Date(b.journalEntry.entryDate).getTime();
  if (dateDelta !== 0) {
    return dateDelta;
  }
  const entryDelta = a.journalEntry.entryNumber.localeCompare(b.journalEntry.entryNumber);
  if (entryDelta !== 0) {
    return entryDelta;
  }
  return (a.lineNumber ?? 0) - (b.lineNumber ?? 0);
}

function decimalSection(sections: Array<{ type: AccountType; total: string }>, type: AccountType): Decimal {
  return money(sections.find((section) => section.type === type)?.total ?? "0");
}

function parseRange(query: ReportDateQuery) {
  const from = parseStartDate(query.from);
  const to = parseEndDate(query.to);
  return {
    from,
    to,
    fromLabel: dateLabel(query.from, from),
    toLabel: dateLabel(query.to, to),
  };
}

function parseStartDate(value?: string): Date | null {
  if (!value) {
    return null;
  }
  return dateOnly(value) ? new Date(`${value}T00:00:00.000Z`) : new Date(value);
}

function parseEndDate(value?: string | null): Date | null {
  if (!value) {
    return null;
  }
  return dateOnly(value) ? new Date(`${value}T23:59:59.999Z`) : new Date(value);
}

function dateOnly(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function dateLabel(input: string | undefined | null, date: Date | null): string | null {
  if (input && dateOnly(input)) {
    return input;
  }
  return date ? date.toISOString().slice(0, 10) : null;
}

function endOfToday(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
}

function endOfDay(value: string | Date): Date {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999));
}

function daysBetween(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / 86_400_000);
}

function emptyBucketTotals(): Record<ReturnType<typeof agingBucket>, string> {
  return {
    CURRENT: "0.0000",
    "1_30": "0.0000",
    "31_60": "0.0000",
    "61_90": "0.0000",
    "90_PLUS": "0.0000",
  };
}

function boolQuery(value: string | boolean | undefined): boolean {
  return value === true || value === "true" || value === "1";
}

function fixed(value: unknown): string {
  return money(value).toFixed(4);
}

function money(value: unknown): Decimal {
  return new Decimal(value === undefined || value === null || value === "" ? 0 : String(value));
}

function toIso(value: string | Date): string {
  return new Date(value).toISOString();
}
