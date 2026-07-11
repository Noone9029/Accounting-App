import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { toMoney } from "@ledgerbyte/accounting-core";
import { PurchaseBillStatus, SalesInvoiceStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

export interface FxReportQuery {
  from?: string;
  to?: string;
  transactionCurrency?: string;
  format?: string;
  page?: string | number;
  limit?: string | number;
}

const MAX_FX_EXPORT_ROWS = 10_000;
const MAX_FX_REVALUATION_RUNS = 1_000;

interface RealizedActivityRow {
  id: string;
  allocationId: string;
  eventType: "ORIGINAL" | "REVERSAL";
  allocationType: string;
  date: string;
  paymentNumber: string | null;
  documentId: string | null;
  documentNumber: string | null;
  counterparty: { id: string; name: string; displayName: string | null } | null;
  currency: string;
  transactionAmount: string;
  sourceBaseAmount: string;
  carryingBaseAmount: string;
  settlementBaseAmount: string;
  carryingRate: string;
  settlementRate: string;
  grossGain: string;
  grossLoss: string;
  reversedGain: string;
  reversedLoss: string;
  netGain: string;
  netLoss: string;
  realizedFxJournalEntryId: string | null;
  realizedFxReversalJournalEntryId: string | null;
  reversed: boolean;
  missingJournal: boolean;
}

interface UnrealizedActivityRow {
  id: string;
  revaluationRunId: string;
  revaluationDate: string;
  status: string;
  sourceType: string;
  documentId: string | null;
  documentNumber: string | null;
  currency: string;
  baseCurrency: string;
  openTransactionAmount: string;
  carryingBaseAmount: string;
  revaluedBaseAmount: string;
  closingRate: string;
  grossGain: string;
  grossLoss: string;
  previewGain: string;
  previewLoss: string;
  reversedGain: string;
  reversedLoss: string;
  netGain: string;
  netLoss: string;
  rateSnapshotId: string;
  postedJournalEntryId: string | null;
  reversalJournalEntryId: string | null;
  recognition: "POSTED" | "REVERSED" | "UNPOSTED_PREVIEW";
}

@Injectable()
export class FxReportingService {
  constructor(private readonly prisma: PrismaService) {}

  async realizedActivity(organizationId: string, query: FxReportQuery) {
    this.assertJsonOrCsv(query.format);
    const window = reportWindow(query);
    const context = await this.accountingContext(organizationId);
    const currency = normalizeCurrency(query.transactionCurrency);
    const activityDate = dateRange(query.from, query.to);
    const directDateFilter = activityDate ? { OR: [{ payment: { paymentDate: activityDate } }, { payment: { voidedAt: activityDate } }] } : {};
    const unappliedDateFilter = activityDate ? { OR: [{ createdAt: activityDate }, { reversedAt: activityDate }] } : {};
    const [customerApplied, customerUnapplied, supplierApplied, supplierUnapplied] = await Promise.all([
      this.prisma.customerPaymentAllocation.findMany({
        where: { organizationId, ...directDateFilter, ...(currency ? { invoice: { currency } } : {}) },
        include: {
          payment: { select: { paymentNumber: true, paymentDate: true, currency: true, baseCurrency: true, status: true, voidedAt: true, voidReversalJournalEntryId: true } },
          invoice: { select: { id: true, invoiceNumber: true, currency: true, customer: { select: { id: true, name: true, displayName: true } } } },
        },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        take: MAX_FX_EXPORT_ROWS + 1,
      }),
      this.prisma.customerPaymentUnappliedAllocation.findMany({
        where: { organizationId, ...unappliedDateFilter, ...(currency ? { invoice: { currency } } : {}) },
        include: {
          payment: { select: { paymentNumber: true, paymentDate: true, currency: true, baseCurrency: true } },
          invoice: { select: { id: true, invoiceNumber: true, currency: true, customer: { select: { id: true, name: true, displayName: true } } } },
        },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        take: MAX_FX_EXPORT_ROWS + 1,
      }),
      this.prisma.supplierPaymentAllocation.findMany({
        where: { organizationId, ...directDateFilter, ...(currency ? { bill: { currency } } : {}) },
        include: {
          payment: { select: { paymentNumber: true, paymentDate: true, currency: true, baseCurrency: true, status: true, voidedAt: true, voidReversalJournalEntryId: true } },
          bill: { select: { id: true, billNumber: true, currency: true, supplier: { select: { id: true, name: true, displayName: true } } } },
        },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        take: MAX_FX_EXPORT_ROWS + 1,
      }),
      this.prisma.supplierPaymentUnappliedAllocation.findMany({
        where: { organizationId, ...unappliedDateFilter, ...(currency ? { bill: { currency } } : {}) },
        include: {
          payment: { select: { paymentNumber: true, paymentDate: true, currency: true, baseCurrency: true } },
          bill: { select: { id: true, billNumber: true, currency: true, supplier: { select: { id: true, name: true, displayName: true } } } },
        },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        take: MAX_FX_EXPORT_ROWS + 1,
      }),
    ]);
    if ([customerApplied, customerUnapplied, supplierApplied, supplierUnapplied].some((rows) => rows.length > MAX_FX_EXPORT_ROWS)) {
      throw new BadRequestException("Realized FX activity exceeds the safe report scope. Narrow the date or currency filters.");
    }
    const allRows: RealizedActivityRow[] = [
      ...customerApplied.flatMap((row) => realizedEvents(row, "CUSTOMER_PAYMENT_ALLOCATION")),
      ...customerUnapplied.flatMap((row) => realizedEvents(row, "CUSTOMER_UNAPPLIED_ALLOCATION")),
      ...supplierApplied.flatMap((row) => realizedEvents(row, "SUPPLIER_PAYMENT_ALLOCATION")),
      ...supplierUnapplied.flatMap((row) => realizedEvents(row, "SUPPLIER_UNAPPLIED_ALLOCATION")),
    ].filter((row) => eventInRange(row.date, activityDate)).sort((left, right) => left.date.localeCompare(right.date) || left.id.localeCompare(right.id));
    if (allRows.length > MAX_FX_EXPORT_ROWS) {
      throw new BadRequestException("Realized FX activity exceeds 10,000 events. Narrow the date or currency filters.");
    }
    const { rows, pagination } = pageRows(allRows, window);
    return {
      accountingContext: context,
      from: query.from ?? null,
      to: query.to ?? null,
      filters: { transactionCurrency: currency },
      rows,
      totals: realizedTotals(rows),
      totalsScope: window.csv ? "FILTERED_EXPORT" : "PAGE",
      pagination,
      notes: [
        "Realized FX activity is read from frozen payment-allocation accounting evidence.",
        "Gross and reversed effects are shown separately; missing-journal rows are close exceptions.",
      ],
    };
  }

  async unrealizedActivity(organizationId: string, query: FxReportQuery) {
    this.assertJsonOrCsv(query.format);
    const window = reportWindow(query);
    const context = await this.accountingContext(organizationId);
    const currency = normalizeCurrency(query.transactionCurrency);
    const revaluationDate = dateRange(query.from, query.to);
    const runs = await this.prisma.fxRevaluationRun.findMany({
      where: { organizationId, ...(revaluationDate ? { revaluationDate } : {}) },
      select: { id: true, revaluationDate: true, status: true, postedJournalEntryId: true, reversalJournalEntryId: true },
      orderBy: [{ revaluationDate: "asc" }, { id: "asc" }],
      take: MAX_FX_REVALUATION_RUNS + 1,
    });
    if (runs.length > MAX_FX_REVALUATION_RUNS) throw new BadRequestException("FX revaluation activity exceeds the safe report scope. Narrow the date range.");
    const runById = new Map(runs.map((run) => [run.id, run]));
    const lines = runs.length
      ? await this.prisma.fxRevaluationLine.findMany({
          where: { organizationId, revaluationRunId: { in: runs.map((run) => run.id) }, ...(currency ? { currencyCode: currency } : {}) },
          include: {
            salesInvoice: { select: { id: true, invoiceNumber: true } },
            purchaseBill: { select: { id: true, billNumber: true } },
          },
          orderBy: [{ revaluationRun: { revaluationDate: "asc" } }, { id: "asc" }],
          ...(window.csv ? { take: window.fetchTake } : { skip: window.offset, take: window.limit + 1 }),
        })
      : [];
    const allRows: UnrealizedActivityRow[] = lines.map((line) => {
      const run = runById.get(line.revaluationRunId)!;
      const recognized = run.status === "POSTED";
      const reversed = run.status === "REVERSED";
      const preview = !recognized && !reversed;
      const gain = fixed(line.unrealizedGainAmount);
      const loss = fixed(line.unrealizedLossAmount);
      return {
        id: line.id,
        revaluationRunId: run.id,
        revaluationDate: dateOnly(run.revaluationDate),
        status: run.status,
        sourceType: line.sourceType,
        documentId: line.salesInvoiceId ?? line.purchaseBillId ?? null,
        documentNumber: line.salesInvoice?.invoiceNumber ?? line.purchaseBill?.billNumber ?? null,
        currency: line.currencyCode,
        baseCurrency: line.baseCurrencyCode,
        openTransactionAmount: fixed(line.openTransactionAmount),
        carryingBaseAmount: fixed(line.carryingBaseAmount),
        revaluedBaseAmount: fixed(line.revaluedBaseAmount),
        closingRate: rate(line.closingRate),
        grossGain: preview ? "0.0000" : gain,
        grossLoss: preview ? "0.0000" : loss,
        previewGain: preview ? gain : "0.0000",
        previewLoss: preview ? loss : "0.0000",
        reversedGain: reversed ? gain : "0.0000",
        reversedLoss: reversed ? loss : "0.0000",
        netGain: recognized ? gain : "0.0000",
        netLoss: recognized ? loss : "0.0000",
        rateSnapshotId: line.rateSnapshotId,
        postedJournalEntryId: run.postedJournalEntryId,
        reversalJournalEntryId: run.reversalJournalEntryId,
        recognition: recognized ? "POSTED" : reversed ? "REVERSED" : "UNPOSTED_PREVIEW",
      };
    });
    const { rows, pagination } = window.csv ? pageRows(allRows, window) : pageFetchedRows(allRows, window);
    return {
      accountingContext: context,
      from: query.from ?? null,
      to: query.to ?? null,
      filters: { transactionCurrency: currency },
      rows,
      totals: unrealizedTotals(rows),
      totalsScope: window.csv ? "FILTERED_EXPORT" : "PAGE",
      pagination,
      notes: ["Unrealized FX activity comes only from controlled revaluation runs.", "Reversed runs retain gross evidence and have zero net effect."],
    };
  }

  async rateSnapshots(organizationId: string, query: FxReportQuery) {
    this.assertJsonOrCsv(query.format);
    const window = reportWindow(query);
    const context = await this.accountingContext(organizationId);
    const currency = normalizeCurrency(query.transactionCurrency);
    const rateDate = dateRange(query.from, query.to);
    const snapshots = await this.prisma.currencyRateSnapshot.findMany({
      where: { organizationId, ...(currency ? { transactionCurrency: currency } : {}), ...(rateDate ? { rateDate } : {}) },
      orderBy: [{ rateDate: "asc" }, { transactionCurrency: "asc" }, { id: "asc" }],
      ...(window.csv ? { take: window.fetchTake } : { skip: window.offset, take: window.limit + 1 }),
    });
    const snapshotPage = window.csv ? pageRows(snapshots, window) : pageFetchedRows(snapshots, window);
    const ids = snapshotPage.rows.map((snapshot) => snapshot.id);
    const usageWhere = { organizationId, rateSnapshotId: { in: ids } };
    const [invoices, bills, journalLines, revaluationLines] = await Promise.all([
      this.prisma.salesInvoice.groupBy({ by: ["rateSnapshotId"], where: usageWhere, _count: { _all: true } }),
      this.prisma.purchaseBill.groupBy({ by: ["rateSnapshotId"], where: usageWhere, _count: { _all: true } }),
      this.prisma.journalLine.groupBy({ by: ["rateSnapshotId"], where: usageWhere, _count: { _all: true } }),
      this.prisma.fxRevaluationLine.groupBy({ by: ["rateSnapshotId"], where: usageWhere, _count: { _all: true } }),
    ]);
    const documentUsage = addUsageCounts(groupedUsage(invoices), groupedUsage(bills));
    const journalUsage = groupedUsage(journalLines);
    const revaluationUsage = groupedUsage(revaluationLines);
    return {
      accountingContext: context,
      from: query.from ?? null,
      to: query.to ?? null,
      filters: { transactionCurrency: currency },
      rows: snapshotPage.rows.map((snapshot) => {
        const documents = documentUsage.get(snapshot.id) ?? 0;
        const journals = journalUsage.get(snapshot.id) ?? 0;
        const revaluations = revaluationUsage.get(snapshot.id) ?? 0;
        return {
          id: snapshot.id,
          transactionCurrency: snapshot.transactionCurrency,
          baseCurrency: snapshot.baseCurrency,
          rate: rate(snapshot.rate),
          rateDate: dateOnly(snapshot.rateDate),
          source: snapshot.source,
          sourceReference: snapshot.sourceReference,
          usage: { documents, journalLines: journals, revaluationLines: revaluations, total: documents + journals + revaluations },
        };
      }),
      pagination: snapshotPage.pagination,
      notes: ["Rate snapshots are immutable audit evidence. No live provider is queried by this report."],
    };
  }

  async openExposure(organizationId: string, query: FxReportQuery) {
    this.assertJsonOrCsv(query.format);
    if (queryText(query.from, "from") || queryText(query.to, "to")) {
      throw new BadRequestException("Current open exposure does not support date filters. Remove from/to and rerun the report.");
    }
    const window = reportWindow(query);
    const context = await this.accountingContext(organizationId);
    const currency = normalizeCurrency(query.transactionCurrency);
    const documentCurrency = currency ? { equals: currency } : { not: context.baseCurrency };
    const [invoices, bills] = await Promise.all([
      this.prisma.salesInvoice.findMany({
        where: { organizationId, status: SalesInvoiceStatus.FINALIZED, currency: documentCurrency, transactionBalanceDue: { gt: 0 } },
        include: {
          customer: { select: { id: true, name: true, displayName: true } },
          fxMonetaryBalance: { select: { openTransactionAmount: true, sourceBaseOpenAmount: true, carryingBaseAmount: true, carryingRate: true, rateSnapshotId: true, lastRevaluationLineId: true } },
        },
        orderBy: [{ currency: "asc" }, { issueDate: "asc" }, { id: "asc" }],
        take: MAX_FX_EXPORT_ROWS + 1,
      }),
      this.prisma.purchaseBill.findMany({
        where: { organizationId, status: PurchaseBillStatus.FINALIZED, currency: documentCurrency, transactionBalanceDue: { gt: 0 } },
        include: {
          supplier: { select: { id: true, name: true, displayName: true } },
          fxMonetaryBalance: { select: { openTransactionAmount: true, sourceBaseOpenAmount: true, carryingBaseAmount: true, carryingRate: true, rateSnapshotId: true, lastRevaluationLineId: true } },
        },
        orderBy: [{ currency: "asc" }, { billDate: "asc" }, { id: "asc" }],
        take: MAX_FX_EXPORT_ROWS + 1,
      }),
    ]);
    const allRows = [
      ...invoices.filter((row) => row.currency !== row.baseCurrency).map((row) => exposureRow(row, "RECEIVABLE")),
      ...bills.filter((row) => row.currency !== row.baseCurrency).map((row) => exposureRow(row, "PAYABLE")),
    ];
    if (allRows.length > MAX_FX_EXPORT_ROWS) throw new BadRequestException("Open FX exposure exceeds the safe report scope. Narrow by transaction currency.");
    const groups = [...allRows.reduce((map, row) => {
      const current = map.get(row.currency) ?? exposureAccumulator(row.currency);
      if (row.sourceType === "RECEIVABLE") {
        current.receivableOpenTransactionAmount = current.receivableOpenTransactionAmount.plus(row.openTransactionAmount);
        current.receivableSourceBaseOpenAmount = current.receivableSourceBaseOpenAmount.plus(row.sourceBaseOpenAmount);
        current.receivableCarryingBaseAmount = current.receivableCarryingBaseAmount.plus(row.carryingBaseAmount);
        current.receivableCount += 1;
      } else {
        current.payableOpenTransactionAmount = current.payableOpenTransactionAmount.plus(row.openTransactionAmount);
        current.payableSourceBaseOpenAmount = current.payableSourceBaseOpenAmount.plus(row.sourceBaseOpenAmount);
        current.payableCarryingBaseAmount = current.payableCarryingBaseAmount.plus(row.carryingBaseAmount);
        current.payableCount += 1;
      }
      map.set(row.currency, current);
      return map;
    }, new Map<string, ReturnType<typeof exposureAccumulator>>()).values()]
      .sort((left, right) => left.currency.localeCompare(right.currency))
      .map(exposureGroup);
    const receivables = allRows.filter((row) => row.sourceType === "RECEIVABLE");
    const payables = allRows.filter((row) => row.sourceType === "PAYABLE");
    const receivableSourceBaseAmount = sum(receivables, "sourceBaseOpenAmount");
    const payableSourceBaseAmount = sum(payables, "sourceBaseOpenAmount");
    const receivableCarryingBaseAmount = sum(receivables, "carryingBaseAmount");
    const payableCarryingBaseAmount = sum(payables, "carryingBaseAmount");
    const { rows, pagination } = pageRows(allRows, window);
    return {
      accountingContext: context,
      filters: { transactionCurrency: currency },
      rows,
      groups,
      pagination,
      totals: {
        receivableSourceBaseAmount,
        payableSourceBaseAmount,
        grossSourceBaseAmount: subtractOrAdd(receivableSourceBaseAmount, payableSourceBaseAmount, "add"),
        netSourceBaseAmount: subtractOrAdd(receivableSourceBaseAmount, payableSourceBaseAmount, "subtract"),
        receivableCarryingBaseAmount,
        payableCarryingBaseAmount,
        grossCarryingBaseAmount: subtractOrAdd(receivableCarryingBaseAmount, payableCarryingBaseAmount, "add"),
        netCarryingBaseAmount: subtractOrAdd(receivableCarryingBaseAmount, payableCarryingBaseAmount, "subtract"),
        documentCount: allRows.length,
      },
      notes: ["Receivables and payables are shown separately per transaction currency; transaction amounts are never combined across currencies.", "Gross and signed net carrying exposure remain in base currency."],
    };
  }

  private async accountingContext(organizationId: string) {
    const organization = await this.prisma.organization.findFirst({ where: { id: organizationId }, select: { baseCurrency: true } });
    if (!organization) throw new NotFoundException("Organization not found.");
    return { baseCurrency: organization.baseCurrency, amountBasis: "BASE_CURRENCY" as const };
  }

  private assertJsonOrCsv(format?: unknown) {
    if (format !== undefined && typeof format !== "string") throw new BadRequestException("FX report format must be json or csv.");
    const normalized = format?.trim().toLowerCase();
    if (normalized && normalized !== "json" && normalized !== "csv") {
      throw new BadRequestException("FX reports support JSON and CSV only. PDF export is not implemented.");
    }
  }
}

function realizedEvents(input: any, allocationType: string): RealizedActivityRow[] {
  const supplier = allocationType.startsWith("SUPPLIER");
  const unapplied = allocationType.includes("UNAPPLIED");
  const document = supplier ? input.bill : input.invoice;
  const counterparty = document?.customer ?? document?.supplier ?? null;
  const gain = fixed(input.realizedGainAmount);
  const loss = fixed(input.realizedLossAmount);
  const hasFx = toMoney(gain).gt(0) || toMoney(loss).gt(0);
  const originalDate = unapplied ? input.createdAt : input.payment?.paymentDate ?? input.createdAt;
  const reversalDate = unapplied
    ? input.reversedAt
    : input.payment?.status === "VOIDED"
      ? input.payment?.voidedAt
      : null;
  const reversalJournalEntryId = unapplied ? input.realizedFxReversalJournalEntryId : input.payment?.voidReversalJournalEntryId;
  const base = {
    allocationId: input.id,
    allocationType,
    paymentNumber: input.payment?.paymentNumber ?? null,
    documentId: document?.id ?? null,
    documentNumber: document?.invoiceNumber ?? document?.billNumber ?? null,
    counterparty,
    currency: document?.currency ?? input.payment?.currency ?? "",
    transactionAmount: fixed(input.transactionAmountApplied),
    sourceBaseAmount: fixed(input.sourceBaseAmountApplied),
    carryingBaseAmount: fixed(input.documentBaseAmountApplied ?? input.carryingBaseAmount ?? input.sourceBaseAmountApplied),
    settlementBaseAmount: fixed(input.settlementBaseAmountApplied),
    carryingRate: rate(input.carryingRate),
    settlementRate: rate(input.settlementRate),
  };
  const original: RealizedActivityRow = {
    ...base,
    id: `${input.id}:original`,
    eventType: "ORIGINAL",
    date: dateOnly(originalDate),
    grossGain: gain,
    grossLoss: loss,
    reversedGain: "0.0000",
    reversedLoss: "0.0000",
    netGain: gain,
    netLoss: loss,
    realizedFxJournalEntryId: input.realizedFxJournalEntryId ?? null,
    realizedFxReversalJournalEntryId: null,
    reversed: false,
    missingJournal: hasFx && !input.realizedFxJournalEntryId,
  };
  if (!reversalDate) return [original];
  return [
    original,
    {
      ...base,
      id: `${input.id}:reversal`,
      eventType: "REVERSAL",
      date: dateOnly(reversalDate),
      transactionAmount: negate(base.transactionAmount),
      sourceBaseAmount: negate(base.sourceBaseAmount),
      carryingBaseAmount: negate(base.carryingBaseAmount),
      settlementBaseAmount: negate(base.settlementBaseAmount),
      grossGain: "0.0000",
      grossLoss: "0.0000",
      reversedGain: gain,
      reversedLoss: loss,
      netGain: negate(gain),
      netLoss: negate(loss),
      realizedFxJournalEntryId: input.realizedFxJournalEntryId ?? null,
      realizedFxReversalJournalEntryId: reversalJournalEntryId ?? null,
      reversed: true,
      missingJournal: hasFx && !reversalJournalEntryId,
    },
  ];
}

function exposureRow(input: any, sourceType: "RECEIVABLE" | "PAYABLE") {
  const balance = input.fxMonetaryBalance;
  const contact = input.customer ?? input.supplier ?? null;
  return {
    id: input.id,
    sourceType,
    documentNumber: input.invoiceNumber ?? input.billNumber ?? input.id,
    documentDate: dateOnly(input.issueDate ?? input.billDate ?? new Date(0)),
    counterparty: contact,
    currency: input.currency,
    baseCurrency: input.baseCurrency,
    openTransactionAmount: fixed(balance?.openTransactionAmount ?? input.transactionBalanceDue),
    sourceBaseOpenAmount: fixed(balance?.sourceBaseOpenAmount ?? input.balanceDue),
    carryingBaseAmount: fixed(balance?.carryingBaseAmount ?? input.balanceDue),
    carryingRate: rate(balance?.carryingRate ?? input.exchangeRate ?? 1),
    rateSnapshotId: balance?.rateSnapshotId ?? input.rateSnapshotId ?? null,
    lastRevaluationLineId: balance?.lastRevaluationLineId ?? null,
  };
}

function realizedTotals(rows: RealizedActivityRow[]) {
  return {
    grossGain: sum(rows, "grossGain"), grossLoss: sum(rows, "grossLoss"),
    reversedGain: sum(rows, "reversedGain"), reversedLoss: sum(rows, "reversedLoss"),
    netGain: sum(rows, "netGain"), netLoss: sum(rows, "netLoss"),
    missingJournalCount: rows.filter((row) => row.missingJournal).length,
    rowCount: rows.length,
  };
}

function unrealizedTotals(rows: UnrealizedActivityRow[]) {
  return {
    grossGain: sum(rows, "grossGain"), grossLoss: sum(rows, "grossLoss"),
    previewGain: sum(rows, "previewGain"), previewLoss: sum(rows, "previewLoss"),
    reversedGain: sum(rows, "reversedGain"), reversedLoss: sum(rows, "reversedLoss"),
    netGain: sum(rows, "netGain"), netLoss: sum(rows, "netLoss"), rowCount: rows.length,
  };
}

function eventInRange(value: string, range?: { gte?: Date; lte?: Date }) {
  if (!range) return true;
  const date = new Date(`${value}T00:00:00.000Z`);
  return (!range.gte || date >= range.gte) && (!range.lte || date <= range.lte);
}

function negate(value: string) { return toMoney(value).negated().toFixed(4); }

function exposureAccumulator(currencyCode: string) {
  return {
    currency: currencyCode,
    receivableOpenTransactionAmount: toMoney(0),
    payableOpenTransactionAmount: toMoney(0),
    receivableSourceBaseOpenAmount: toMoney(0),
    payableSourceBaseOpenAmount: toMoney(0),
    receivableCarryingBaseAmount: toMoney(0),
    payableCarryingBaseAmount: toMoney(0),
    receivableCount: 0,
    payableCount: 0,
  };
}

function exposureGroup(group: ReturnType<typeof exposureAccumulator>) {
  return {
    currency: group.currency,
    receivableOpenTransactionAmount: group.receivableOpenTransactionAmount.toFixed(4),
    payableOpenTransactionAmount: group.payableOpenTransactionAmount.toFixed(4),
    grossOpenTransactionAmount: group.receivableOpenTransactionAmount.plus(group.payableOpenTransactionAmount).toFixed(4),
    netOpenTransactionAmount: group.receivableOpenTransactionAmount.minus(group.payableOpenTransactionAmount).toFixed(4),
    receivableSourceBaseOpenAmount: group.receivableSourceBaseOpenAmount.toFixed(4),
    payableSourceBaseOpenAmount: group.payableSourceBaseOpenAmount.toFixed(4),
    grossSourceBaseOpenAmount: group.receivableSourceBaseOpenAmount.plus(group.payableSourceBaseOpenAmount).toFixed(4),
    netSourceBaseOpenAmount: group.receivableSourceBaseOpenAmount.minus(group.payableSourceBaseOpenAmount).toFixed(4),
    receivableCarryingBaseAmount: group.receivableCarryingBaseAmount.toFixed(4),
    payableCarryingBaseAmount: group.payableCarryingBaseAmount.toFixed(4),
    grossCarryingBaseAmount: group.receivableCarryingBaseAmount.plus(group.payableCarryingBaseAmount).toFixed(4),
    netCarryingBaseAmount: group.receivableCarryingBaseAmount.minus(group.payableCarryingBaseAmount).toFixed(4),
    receivableCount: group.receivableCount,
    payableCount: group.payableCount,
    documentCount: group.receivableCount + group.payableCount,
  };
}

function subtractOrAdd(left: string, right: string, operation: "add" | "subtract") {
  const amount = operation === "add" ? toMoney(left).plus(right) : toMoney(left).minus(right);
  return amount.toFixed(4);
}

function groupedUsage(rows: Array<{ rateSnapshotId: string | null; _count: { _all: number } }>) {
  const counts = new Map<string, number>();
  for (const row of rows) if (row.rateSnapshotId) counts.set(row.rateSnapshotId, row._count._all);
  return counts;
}

function addUsageCounts(...groups: Array<Map<string, number>>) {
  const counts = new Map<string, number>();
  for (const group of groups) for (const [id, count] of group) counts.set(id, (counts.get(id) ?? 0) + count);
  return counts;
}

function normalizeCurrency(value?: unknown): string | undefined {
  if (value !== undefined && typeof value !== "string") throw new BadRequestException("Transaction currency must be a three-letter ISO currency code.");
  const currency = value?.trim().toUpperCase();
  if (!currency) return undefined;
  if (!/^[A-Z]{3}$/.test(currency)) throw new BadRequestException("Transaction currency must be a three-letter ISO currency code.");
  return currency;
}

function dateRange(from?: unknown, to?: unknown) {
  if (!from && !to) return undefined;
  if ((from !== undefined && typeof from !== "string") || (to !== undefined && typeof to !== "string")) {
    throw new BadRequestException("Report dates must use YYYY-MM-DD.");
  }
  const start = from ? parseDate(from, false) : undefined;
  const end = to ? parseDate(to, true) : undefined;
  if (start && end && start > end) throw new BadRequestException("Report start date cannot be after end date.");
  return { ...(start ? { gte: start } : {}), ...(end ? { lte: end } : {}) };
}

function parseDate(value: string, endOfDay: boolean) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new BadRequestException("Report dates must use YYYY-MM-DD.");
  const date = new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new BadRequestException("Report date is invalid.");
  return date;
}

function queryText(value: unknown, field: string) {
  if (value === undefined || value === null || value === "") return "";
  if (typeof value !== "string") throw new BadRequestException(`FX report ${field} must be a YYYY-MM-DD string.`);
  return value.trim();
}

function sum<T extends object>(rows: T[], key: keyof T): string {
  return rows.reduce((total, row) => total.plus(String(row[key] ?? 0)), toMoney(0)).toFixed(4);
}

function fixed(value: unknown): string { return toMoney(value == null ? 0 : String(value)).toFixed(4); }
function rate(value: unknown): string { return toMoney(value == null ? 1 : String(value)).toFixed(8); }
function dateOnly(value: string | Date): string { return (value instanceof Date ? value : new Date(value)).toISOString().slice(0, 10); }

interface ReportWindow {
  csv: boolean;
  page: number;
  limit: number;
  offset: number;
  fetchTake: number;
}

function reportWindow(query: FxReportQuery): ReportWindow {
  const csv = typeof query.format === "string" && query.format.trim().toLowerCase() === "csv";
  if (csv) return { csv: true, page: 1, limit: MAX_FX_EXPORT_ROWS, offset: 0, fetchTake: MAX_FX_EXPORT_ROWS + 1 };
  const page = boundedPositiveInteger(query.page, "page", MAX_FX_EXPORT_ROWS, 1);
  const limit = boundedPositiveInteger(query.limit, "limit", 250, 100);
  const offset = (page - 1) * limit;
  if (offset >= MAX_FX_EXPORT_ROWS) {
    throw new BadRequestException("FX report page and limit exceed the 10,000-row safe navigation scope.");
  }
  return { csv: false, page, limit, offset, fetchTake: offset + limit + 1 };
}

function boundedPositiveInteger(value: string | number | undefined, label: string, max: number, fallback: number) {
  if (value === undefined || value === "") return fallback;
  if ((typeof value !== "string" && typeof value !== "number") || !/^\d+$/.test(String(value))) {
    throw new BadRequestException(`FX report ${label} must be a positive integer.`);
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > max) {
    throw new BadRequestException(`FX report ${label} must be between 1 and ${max}.`);
  }
  return parsed;
}

function pageRows<T>(rows: T[], window: ReportWindow): { rows: T[]; pagination: { page: number; limit: number; hasMore: boolean } | null } {
  if (window.csv) {
    if (rows.length > MAX_FX_EXPORT_ROWS) throw new BadRequestException("FX report export exceeds 10,000 rows. Narrow the date or currency filters.");
    return { rows, pagination: null };
  }
  return {
    rows: rows.slice(window.offset, window.offset + window.limit),
    pagination: { page: window.page, limit: window.limit, hasMore: rows.length > window.offset + window.limit && window.offset + window.limit < MAX_FX_EXPORT_ROWS },
  };
}

function pageFetchedRows<T>(rows: T[], window: ReportWindow): { rows: T[]; pagination: { page: number; limit: number; hasMore: boolean } } {
  return {
    rows: rows.slice(0, window.limit),
    pagination: {
      page: window.page,
      limit: window.limit,
      hasMore: rows.length > window.limit && window.offset + window.limit < MAX_FX_EXPORT_ROWS,
    },
  };
}
