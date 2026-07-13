import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import {
  CurrencyRateSource,
  CustomerPaymentStatus,
  FxRevaluationStatus,
  Prisma,
  PurchaseBillStatus,
  SalesInvoiceStatus,
  SupplierPaymentStatus,
} from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import {
  evaluateFxAccountReadiness,
  FX_ACCOUNT_READINESS_CONFIG_INCLUDE,
} from "./fx-account-readiness";
import { countFxSourceActivityAfter } from "./fx-historical-activity";

export type FxCloseStatus = "NOT_APPLICABLE" | "READY" | "BLOCKED";
export interface FxCloseBlocker {
  code: string;
  count: number;
  message: string;
  actionHref: string;
}
export interface FxCloseReadiness {
  status: FxCloseStatus;
  asOf: string;
  blockers: FxCloseBlocker[];
  counts: {
    foreignDocuments: number;
    openForeignDocuments: number;
    foreignCurrencies: number;
    missingClosingRates: number;
    draftManualRateDocuments: number;
    unpostedRevaluationRuns: number;
    missingRealizedFxJournals: number;
    historicalSourceChangesAfterClose: number;
  };
  actions: Array<{ code: string; label: string; href: string }>;
  sourceUpdatedAt?: string;
}

type FxCloseExecutor = PrismaService | Prisma.TransactionClient;

@Injectable()
export class FxCloseReadinessService {
  constructor(private readonly prisma: PrismaService) {}

  async readiness(organizationId: string, asOfInput?: string | Date, executor: FxCloseExecutor = this.prisma): Promise<FxCloseReadiness> {
    const asOf = closeDate(asOfInput);
    const asOfLabel = asOf.toISOString().slice(0, 10);
    const closeDay = { gte: new Date(`${asOfLabel}T00:00:00.000Z`), lte: asOf };
    const organization = await executor.organization.findFirst({ where: { id: organizationId }, select: { baseCurrency: true } });
    if (!organization) throw new NotFoundException("Organization not found.");
    const baseCurrency = organization.baseCurrency.trim().toUpperCase();
    const foreignCurrency = { not: baseCurrency };
    const gainOrLoss = { OR: [{ realizedGainAmount: { gt: 0 } }, { realizedLossAmount: { gt: 0 } }] };

    const [
      foreignInvoiceCount,
      foreignBillCount,
      foreignCustomerPaymentCount,
      foreignSupplierPaymentCount,
      openInvoiceCount,
      openBillCount,
      draftManualInvoices,
      draftManualBills,
      missingRealizedFxJournals,
      latestInvoice,
      latestBill,
      latestCustomerPayment,
      latestSupplierPayment,
    ] = await Promise.all([
      executor.salesInvoice.count({ where: { organizationId, currency: foreignCurrency, issueDate: { lte: asOf } } }),
      executor.purchaseBill.count({ where: { organizationId, currency: foreignCurrency, billDate: { lte: asOf } } }),
      executor.customerPayment.count({ where: { organizationId, currency: foreignCurrency, paymentDate: { lte: asOf } } }),
      executor.supplierPayment.count({ where: { organizationId, currency: foreignCurrency, paymentDate: { lte: asOf } } }),
      executor.salesInvoice.count({
        where: { organizationId, currency: foreignCurrency, status: SalesInvoiceStatus.FINALIZED, transactionBalanceDue: { gt: 0 }, issueDate: { lte: asOf } },
      }),
      executor.purchaseBill.count({
        where: { organizationId, currency: foreignCurrency, status: PurchaseBillStatus.FINALIZED, transactionBalanceDue: { gt: 0 }, billDate: { lte: asOf } },
      }),
      executor.salesInvoice.count({
        where: { organizationId, currency: foreignCurrency, status: SalesInvoiceStatus.DRAFT, rateSource: CurrencyRateSource.MANUAL, issueDate: { lte: asOf } },
      }),
      executor.purchaseBill.count({
        where: { organizationId, currency: foreignCurrency, status: PurchaseBillStatus.DRAFT, rateSource: CurrencyRateSource.MANUAL, billDate: { lte: asOf } },
      }),
      this.missingRealizedJournalCount(organizationId, asOf, executor, gainOrLoss),
      executor.salesInvoice.findFirst({ where: { organizationId, currency: foreignCurrency, issueDate: { lte: asOf } }, orderBy: { updatedAt: "desc" }, select: { updatedAt: true } }),
      executor.purchaseBill.findFirst({ where: { organizationId, currency: foreignCurrency, billDate: { lte: asOf } }, orderBy: { updatedAt: "desc" }, select: { updatedAt: true } }),
      executor.customerPayment.findFirst({ where: { organizationId, currency: foreignCurrency, paymentDate: { lte: asOf } }, orderBy: { updatedAt: "desc" }, select: { updatedAt: true } }),
      executor.supplierPayment.findFirst({ where: { organizationId, currency: foreignCurrency, paymentDate: { lte: asOf } }, orderBy: { updatedAt: "desc" }, select: { updatedAt: true } }),
    ]);

    const documentSourceUpdatedAt = latestUpdatedAt([latestInvoice?.updatedAt, latestBill?.updatedAt, latestCustomerPayment?.updatedAt, latestSupplierPayment?.updatedAt]);

    const foreignDocuments = foreignInvoiceCount + foreignBillCount;
    if (foreignDocuments === 0 && foreignCustomerPaymentCount + foreignSupplierPaymentCount === 0 && missingRealizedFxJournals === 0) {
      return { status: "NOT_APPLICABLE", asOf: asOfLabel, blockers: [], counts: emptyCounts(), actions: [], sourceUpdatedAt: documentSourceUpdatedAt };
    }

    const openForeignDocumentCount = openInvoiceCount + openBillCount;
    const [configuration, controlAccounts, invoiceCurrencies, billCurrencies, unpostedRevaluationRuns, postedCloseRun, historicalActivity] = await Promise.all([
      executor.fxAccountConfiguration.findFirst({ where: { organizationId }, include: FX_ACCOUNT_READINESS_CONFIG_INCLUDE }),
      executor.account.findMany({
        where: { organizationId, code: { in: ["120", "210"] } },
        select: { code: true, type: true, isActive: true, allowPosting: true },
      }),
      executor.salesInvoice.groupBy({
        by: ["currency"],
        where: { organizationId, currency: foreignCurrency, status: SalesInvoiceStatus.FINALIZED, transactionBalanceDue: { gt: 0 }, issueDate: { lte: asOf } },
      }),
      executor.purchaseBill.groupBy({
        by: ["currency"],
        where: { organizationId, currency: foreignCurrency, status: PurchaseBillStatus.FINALIZED, transactionBalanceDue: { gt: 0 }, billDate: { lte: asOf } },
      }),
      executor.fxRevaluationRun.count({
        where: { organizationId, revaluationDate: closeDay, status: { in: [FxRevaluationStatus.DRAFT, FxRevaluationStatus.REVIEWED] } },
      }),
      executor.fxRevaluationRun.findFirst({
        where: { organizationId, revaluationDate: closeDay, status: FxRevaluationStatus.POSTED },
        select: { id: true, updatedAt: true },
      }),
      countFxSourceActivityAfter(executor, organizationId, baseCurrency, asOf),
    ]);

    const { accountConfigurationComplete, controlAccountsComplete } = evaluateFxAccountReadiness({ configuration, controlAccounts });
    const foreignCurrencies = [...new Set([...invoiceCurrencies, ...billCurrencies].map((row) => currency(row.currency)))].sort();
    const rates = foreignCurrencies.length
      ? await executor.currencyRateSnapshot.groupBy({
          by: ["transactionCurrency"],
          where: {
            organizationId,
            baseCurrency,
            transactionCurrency: { in: foreignCurrencies },
            rateDate: closeDay,
            source: { in: [CurrencyRateSource.MANUAL, CurrencyRateSource.IMPORT] },
          },
          _max: { createdAt: true },
        })
      : [];
    const availableRates = new Set(rates.map((row) => currency(row.transactionCurrency)));
    const missingCurrencies = foreignCurrencies.filter((code) => !availableRates.has(code));
    const [coveredOpenInvoices, coveredOpenBills] = postedCloseRun
      ? await Promise.all([
          executor.fxRevaluationLine.count({
            where: {
              organizationId,
              revaluationRunId: postedCloseRun.id,
              salesInvoice: { organizationId, baseCurrency, currency: foreignCurrency, status: SalesInvoiceStatus.FINALIZED, transactionBalanceDue: { gt: 0 }, issueDate: { lte: asOf } },
            },
          }),
          executor.fxRevaluationLine.count({
            where: {
              organizationId,
              revaluationRunId: postedCloseRun.id,
              purchaseBill: { organizationId, baseCurrency, currency: foreignCurrency, status: PurchaseBillStatus.FINALIZED, transactionBalanceDue: { gt: 0 }, billDate: { lte: asOf } },
            },
          }),
        ])
      : [0, 0];
    const uncoveredRevaluationSources = Math.max(0, openForeignDocumentCount - coveredOpenInvoices - coveredOpenBills);
    const historicalSourceChangesAfterClose = postedCloseRun ? historicalActivity.lateFinalized : historicalActivity.total;
    const draftManualRateDocuments = draftManualInvoices + draftManualBills;
    const blockers: FxCloseBlocker[] = [];
    if (!accountConfigurationComplete) blockers.push(blocker("MISSING_FX_ACCOUNT_CONFIGURATION", 1, "Configure active posting accounts for realized and unrealized FX gains and losses.", "/settings/currencies-fx"));
    if (!controlAccountsComplete && openForeignDocumentCount) blockers.push(blocker("MISSING_FX_CONTROL_ACCOUNTS", 1, "Configure active posting AR (120) and AP (210) control accounts.", "/settings/currencies-fx"));
    if (missingCurrencies.length) blockers.push(blocker("MISSING_CLOSING_RATE", missingCurrencies.length, `Capture a closing rate dated ${asOfLabel} for: ${missingCurrencies.join(", ")}.`, "/settings/currencies-fx"));
    if (draftManualRateDocuments) blockers.push(blocker("DRAFT_MANUAL_RATE_DOCUMENT", draftManualRateDocuments, "Review and finalize or remove draft foreign documents using manual rates.", "/fx-close"));
    if (uncoveredRevaluationSources) blockers.push(blocker("REVALUATION_NOT_POSTED", uncoveredRevaluationSources, "Post a close-date FX revaluation covering every current open foreign balance.", "/fx-revaluations"));
    if (historicalSourceChangesAfterClose) blockers.push(blocker("HISTORICAL_FX_ACTIVITY_AFTER_CLOSE", historicalSourceChangesAfterClose, "Foreign source activity occurred after this close date and no posted close-date revaluation proves the historical open scope. Review the later activity or close a current period instead.", "/reports/fx-activity"));
    if (missingRealizedFxJournals) blockers.push(blocker("REALIZED_FX_JOURNAL_MISSING", missingRealizedFxJournals, "Resolve realized FX or reversal evidence that has no journal.", "/reports/fx-activity"));
    const counts = {
      foreignDocuments,
      openForeignDocuments: openForeignDocumentCount,
      foreignCurrencies: foreignCurrencies.length,
      missingClosingRates: missingCurrencies.length,
      draftManualRateDocuments,
      unpostedRevaluationRuns: uncoveredRevaluationSources ? Math.max(uncoveredRevaluationSources, unpostedRevaluationRuns) : 0,
      missingRealizedFxJournals,
      historicalSourceChangesAfterClose,
    };
    return {
      status: blockers.length ? "BLOCKED" : "READY",
      asOf: asOfLabel,
      blockers,
      counts,
      actions: blockers.map((item) => ({ code: item.code, label: item.message, href: item.actionHref })),
      sourceUpdatedAt: latestUpdatedAt([documentSourceUpdatedAt, configuration?.updatedAt, postedCloseRun?.updatedAt, ...rates.map((rate) => rate._max.createdAt)]),
    };
  }

  async assertReadyForPeriodClose(organizationId: string, endsOn: string | Date, executor: FxCloseExecutor = this.prisma): Promise<void> {
    const result = await this.readiness(organizationId, endsOn, executor);
    if (result.status === "BLOCKED") {
      throw new BadRequestException(`FX close readiness is blocked: ${result.blockers.map((item) => item.code).join(", ")}.`);
    }
  }

  private async missingRealizedJournalCount(
    organizationId: string,
    asOf: Date,
    executor: FxCloseExecutor,
    gainOrLoss: { OR: Array<Record<string, unknown>> },
  ): Promise<number> {
    const [customerOriginal, customerUnappliedOriginal, supplierOriginal, supplierUnappliedOriginal, customerVoid, supplierVoid, customerUnappliedReversal, supplierUnappliedReversal] = await Promise.all([
      executor.customerPaymentAllocation.count({
        where: { organizationId, ...gainOrLoss, realizedFxJournalEntryId: null, payment: { paymentDate: { lte: asOf } } },
      }),
      executor.customerPaymentUnappliedAllocation.count({
        where: { organizationId, ...gainOrLoss, realizedFxJournalEntryId: null, createdAt: { lte: asOf } },
      }),
      executor.supplierPaymentAllocation.count({
        where: { organizationId, ...gainOrLoss, realizedFxJournalEntryId: null, payment: { paymentDate: { lte: asOf } } },
      }),
      executor.supplierPaymentUnappliedAllocation.count({
        where: { organizationId, ...gainOrLoss, realizedFxJournalEntryId: null, createdAt: { lte: asOf } },
      }),
      executor.customerPaymentAllocation.count({
        where: {
          organizationId,
          ...gainOrLoss,
          payment: { status: CustomerPaymentStatus.VOIDED, voidedAt: { lte: asOf }, voidReversalJournalEntryId: null },
        },
      }),
      executor.supplierPaymentAllocation.count({
        where: {
          organizationId,
          ...gainOrLoss,
          payment: { status: SupplierPaymentStatus.VOIDED, voidedAt: { lte: asOf }, voidReversalJournalEntryId: null },
        },
      }),
      executor.customerPaymentUnappliedAllocation.count({
        where: { organizationId, ...gainOrLoss, reversedAt: { lte: asOf }, realizedFxReversalJournalEntryId: null },
      }),
      executor.supplierPaymentUnappliedAllocation.count({
        where: { organizationId, ...gainOrLoss, reversedAt: { lte: asOf }, realizedFxReversalJournalEntryId: null },
      }),
    ]);
    return customerOriginal + customerUnappliedOriginal + supplierOriginal + supplierUnappliedOriginal + customerVoid + supplierVoid + customerUnappliedReversal + supplierUnappliedReversal;
  }
}

function latestUpdatedAt(values: Array<Date | string | null | undefined>): string | undefined {
  const timestamps = values.map((value) => value instanceof Date ? value.getTime() : typeof value === "string" ? new Date(value).getTime() : Number.NaN).filter(Number.isFinite);
  return timestamps.length ? new Date(Math.max(...timestamps)).toISOString() : undefined;
}

function blocker(code: string, count: number, message: string, actionHref: string): FxCloseBlocker { return { code, count, message, actionHref }; }
function currency(value: string): string { return value.trim().toUpperCase(); }
function emptyCounts() { return { foreignDocuments: 0, openForeignDocuments: 0, foreignCurrencies: 0, missingClosingRates: 0, draftManualRateDocuments: 0, unpostedRevaluationRuns: 0, missingRealizedFxJournals: 0, historicalSourceChangesAfterClose: 0 }; }
function closeDate(value?: string | Date): Date {
  const input = value ?? new Date();
  const label = input instanceof Date ? input.toISOString().slice(0, 10) : input;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(label)) throw new BadRequestException("FX close as-of date must use YYYY-MM-DD.");
  const date = new Date(`${label}T23:59:59.999Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== label) throw new BadRequestException("FX close as-of date is invalid.");
  return date;
}
