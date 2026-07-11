import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { createHash } from "node:crypto";
import {
  createReversalLines,
  getJournalTotals,
  revalueMonetaryBalance,
  toMoney,
} from "@ledgerbyte/accounting-core";
import {
  AccountType,
  CurrencyRateSource,
  FxMonetarySourceType,
  FxRevaluationStatus,
  JournalEntryStatus,
  NumberSequenceScope,
  Prisma,
  PurchaseBillStatus,
  SalesInvoiceStatus,
} from "@prisma/client";
import { AuditLogService } from "../audit-log/audit-log.service";
import { FiscalPeriodGuardService } from "../fiscal-periods/fiscal-period-guard.service";
import { NumberSequenceService } from "../number-sequences/number-sequence.service";
import { PrismaService } from "../prisma/prisma.service";
import { FxRevaluationMutationDto } from "./dto/fx-revaluation-mutation.dto";
import { FxRevaluationQueryDto } from "./dto/fx-revaluation-query.dto";
import { PreviewFxRevaluationDto } from "./dto/preview-fx-revaluation.dto";
import { buildFxRevaluationJournalLines } from "./fx-revaluation-accounting";

type PrismaExecutor = PrismaService | Prisma.TransactionClient;

const RUN_INCLUDE = {
  requestedBy: { select: { id: true, name: true } },
  reviewedBy: { select: { id: true, name: true } },
  postedBy: { select: { id: true, name: true } },
  reversedBy: { select: { id: true, name: true } },
  postedJournalEntry: { select: { id: true, entryNumber: true, status: true } },
  reversalJournalEntry: { select: { id: true, entryNumber: true, status: true } },
  lines: {
    include: {
      salesInvoice: { select: { id: true, invoiceNumber: true } },
      purchaseBill: { select: { id: true, billNumber: true } },
      counterparty: { select: { id: true, name: true, displayName: true } },
      rateSnapshot: { select: { id: true, rate: true, rateDate: true, source: true, sourceReference: true } },
      priorRevaluationLine: { select: { id: true, closingRate: true, rateSnapshotId: true } },
    },
    orderBy: [{ currencyCode: "asc" }, { sourceType: "asc" }, { id: "asc" }],
  },
} satisfies Prisma.FxRevaluationRunInclude;

type RevaluationRunDetail = Prisma.FxRevaluationRunGetPayload<{ include: typeof RUN_INCLUDE }>;

@Injectable()
export class FxRevaluationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
    private readonly fiscalPeriodGuardService: FiscalPeriodGuardService,
    private readonly numberSequenceService: NumberSequenceService,
  ) {}

  async list(organizationId: string, query: FxRevaluationQueryDto) {
    const page = this.boundedInteger(query.page, 1, 1_000_000, 1);
    const limit = this.boundedInteger(query.limit, 1, 100, 25);
    const rows = await this.prisma.fxRevaluationRun.findMany({
      where: { organizationId, status: query.status },
      orderBy: [{ revaluationDate: "desc" }, { createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * limit,
      take: limit + 1,
      include: {
        postedJournalEntry: { select: { id: true, entryNumber: true, status: true } },
        reversalJournalEntry: { select: { id: true, entryNumber: true, status: true } },
        _count: { select: { lines: true } },
      },
    });
    return { data: rows.slice(0, limit), pagination: { page, limit, hasMore: rows.length > limit } };
  }

  async get(organizationId: string, id: string, executor: PrismaExecutor = this.prisma): Promise<RevaluationRunDetail> {
    const run = await executor.fxRevaluationRun.findFirst({ where: { id, organizationId }, include: RUN_INCLUDE });
    if (!run) throw new NotFoundException("FX revaluation run not found.");
    return run;
  }

  async preview(organizationId: string, actorUserId: string, dto: PreviewFxRevaluationDto) {
    const revaluationDate = this.dateOnly(dto.revaluationDate, "Revaluation date");
    const rateDate = this.dateOnly(dto.rateDate, "Rate date");
    const nextRevaluationDate = this.dayAfter(revaluationDate);
    if (rateDate.getTime() > revaluationDate.getTime()) {
      throw new BadRequestException("Rate date cannot be later than the revaluation date.");
    }
    const idempotencyKey = this.idempotencyKey(dto.idempotencyKey);
    const requestHash = this.requestHash(dto);

    try {
      return await this.prisma.$transaction(async (tx) => {
        const replay = await tx.fxRevaluationRun.findUnique({
          where: { organizationId_idempotencyKey: { organizationId, idempotencyKey } },
          include: RUN_INCLUDE,
        });
        if (replay) {
          if (replay.requestHash !== requestHash) {
            throw new ConflictException("Idempotency key was already used for a different FX revaluation preview.");
          }
          return replay;
        }

        const organization = await tx.organization.findUnique({ where: { id: organizationId }, select: { baseCurrency: true } });
        if (!organization) throw new NotFoundException("Organization not found.");
        const baseCurrency = organization.baseCurrency.trim().toUpperCase();
        const [invoices, bills] = await Promise.all([
          tx.salesInvoice.findMany({
            where: {
              organizationId,
              status: { in: [SalesInvoiceStatus.FINALIZED, SalesInvoiceStatus.VOIDED] },
              baseCurrency,
              issueDate: { lte: revaluationDate },
              finalizedAt: { lt: nextRevaluationDate },
            },
            select: {
              id: true, invoiceNumber: true, customerId: true, currency: true, baseCurrency: true, status: true,
              exchangeRate: true, balanceDue: true, transactionBalanceDue: true,
              customer: { select: { id: true, name: true } },
              reversalJournalEntry: { select: { entryDate: true, postedAt: true } },
            },
          }),
          tx.purchaseBill.findMany({
            where: {
              organizationId,
              status: { in: [PurchaseBillStatus.FINALIZED, PurchaseBillStatus.VOIDED] },
              baseCurrency,
              billDate: { lte: revaluationDate },
              finalizedAt: { lt: nextRevaluationDate },
            },
            select: {
              id: true, billNumber: true, supplierId: true, currency: true, baseCurrency: true, status: true,
              exchangeRate: true, balanceDue: true, transactionBalanceDue: true,
              supplier: { select: { id: true, name: true } },
              reversalJournalEntry: { select: { entryDate: true, postedAt: true } },
            },
          }),
        ]);
        const allForeignInvoices = invoices.filter((row) => row.currency.trim().toUpperCase() !== baseCurrency);
        const allForeignBills = bills.filter((row) => row.currency.trim().toUpperCase() !== baseCurrency);
        this.assertNoLaterSourceLifecycle(allForeignInvoices, allForeignBills, revaluationDate);
        await this.assertNoLaterSourceActivity(
          tx,
          organizationId,
          allForeignInvoices.map((row) => row.id),
          allForeignBills.map((row) => row.id),
          revaluationDate,
        );
        const foreignInvoices = allForeignInvoices.filter((row) => row.status !== SalesInvoiceStatus.VOIDED && toMoney(row.transactionBalanceDue).gt(0));
        const foreignBills = allForeignBills.filter((row) => row.status !== PurchaseBillStatus.VOIDED && toMoney(row.transactionBalanceDue).gt(0));
        if (foreignInvoices.length + foreignBills.length === 0) {
          throw new BadRequestException("No eligible open foreign receivables or payables were found.");
        }

        const eligibleCurrencies = new Set([
          ...foreignInvoices.map((row) => row.currency.trim().toUpperCase()),
          ...foreignBills.map((row) => row.currency.trim().toUpperCase()),
        ]);
        const selectionByCurrency = new Map<string, string>();
        for (const selection of dto.rates) {
          const currency = selection.currencyCode.trim().toUpperCase();
          if (selectionByCurrency.has(currency)) throw new BadRequestException("Each revaluation currency can have only one selected rate snapshot.");
          selectionByCurrency.set(currency, selection.rateSnapshotId);
        }
        if (
          selectionByCurrency.size !== eligibleCurrencies.size ||
          [...eligibleCurrencies].some((currency) => !selectionByCurrency.has(currency)) ||
          [...selectionByCurrency].some(([currency]) => !eligibleCurrencies.has(currency))
        ) {
          throw new BadRequestException("A selected rate snapshot is required for every eligible foreign currency.");
        }

        const rateIds = [...selectionByCurrency.values()];
        const rates = await tx.currencyRateSnapshot.findMany({ where: { organizationId, id: { in: rateIds } } });
        const rateById = new Map(rates.map((snapshot) => [snapshot.id, snapshot]));
        for (const [currency, rateId] of selectionByCurrency) {
          const snapshot = rateById.get(rateId);
          if (
            !snapshot || snapshot.transactionCurrency !== currency || snapshot.baseCurrency !== baseCurrency ||
            snapshot.rateDate.toISOString().slice(0, 10) !== dto.rateDate ||
            (snapshot.source !== CurrencyRateSource.MANUAL && snapshot.source !== CurrencyRateSource.IMPORT)
          ) {
            throw new BadRequestException("One or more selected FX rate snapshots are invalid for this revaluation scope.");
          }
        }

        const invoiceIds = foreignInvoices.map((row) => row.id);
        const billIds = foreignBills.map((row) => row.id);
        const balances = await tx.fxMonetaryBalance.findMany({
          where: {
            organizationId,
            OR: [
              ...(invoiceIds.length ? [{ salesInvoiceId: { in: invoiceIds } }] : []),
              ...(billIds.length ? [{ purchaseBillId: { in: billIds } }] : []),
            ],
          },
          include: {
            lastRevaluationLine: {
              select: { revaluationRun: { select: { revaluationDate: true } } },
            },
          },
        });
        const invoiceBalance = new Map(balances.filter((row) => row.salesInvoiceId).map((row) => [row.salesInvoiceId!, row]));
        const billBalance = new Map(balances.filter((row) => row.purchaseBillId).map((row) => [row.purchaseBillId!, row]));

        const lines: Prisma.FxRevaluationLineUncheckedCreateWithoutRevaluationRunInput[] = [];
        for (const invoice of foreignInvoices) {
          const current = invoiceBalance.get(invoice.id);
          this.assertCarryingMatchesSource(current, invoice.transactionBalanceDue, invoice.balanceDue);
          this.assertChronologicalCarrying(current, revaluationDate);
          const snapshot = rateById.get(selectionByCurrency.get(invoice.currency.trim().toUpperCase())!)!;
          const calculation = revalueMonetaryBalance({
            direction: "CUSTOMER",
            transactionOpenAmount: String(invoice.transactionBalanceDue),
            carryingBaseAmount: String(current?.carryingBaseAmount ?? invoice.balanceDue),
            closingRate: String(snapshot.rate),
          });
          lines.push({
            sourceType: FxMonetarySourceType.CUSTOMER_RECEIVABLE,
            salesInvoiceId: invoice.id,
            purchaseBillId: null,
            counterpartyId: invoice.customerId,
            currencyCode: invoice.currency.trim().toUpperCase(),
            baseCurrencyCode: baseCurrency,
            openTransactionAmount: calculation.transactionOpenAmount,
            sourceBaseOpenAmount: String(invoice.balanceDue),
            carryingBaseAmount: calculation.carryingBaseAmount,
            closingRate: calculation.closingRate,
            revaluedBaseAmount: calculation.revaluedBaseAmount,
            unrealizedGainAmount: calculation.unrealizedGainAmount,
            unrealizedLossAmount: calculation.unrealizedLossAmount,
            rateSnapshotId: snapshot.id,
            priorRevaluationLineId: current?.lastRevaluationLineId ?? null,
          });
        }
        for (const bill of foreignBills) {
          const current = billBalance.get(bill.id);
          this.assertCarryingMatchesSource(current, bill.transactionBalanceDue, bill.balanceDue);
          this.assertChronologicalCarrying(current, revaluationDate);
          const snapshot = rateById.get(selectionByCurrency.get(bill.currency.trim().toUpperCase())!)!;
          const calculation = revalueMonetaryBalance({
            direction: "SUPPLIER",
            transactionOpenAmount: String(bill.transactionBalanceDue),
            carryingBaseAmount: String(current?.carryingBaseAmount ?? bill.balanceDue),
            closingRate: String(snapshot.rate),
          });
          lines.push({
            sourceType: FxMonetarySourceType.SUPPLIER_PAYABLE,
            salesInvoiceId: null,
            purchaseBillId: bill.id,
            counterpartyId: bill.supplierId,
            currencyCode: bill.currency.trim().toUpperCase(),
            baseCurrencyCode: baseCurrency,
            openTransactionAmount: calculation.transactionOpenAmount,
            sourceBaseOpenAmount: String(bill.balanceDue),
            carryingBaseAmount: calculation.carryingBaseAmount,
            closingRate: calculation.closingRate,
            revaluedBaseAmount: calculation.revaluedBaseAmount,
            unrealizedGainAmount: calculation.unrealizedGainAmount,
            unrealizedLossAmount: calculation.unrealizedLossAmount,
            rateSnapshotId: snapshot.id,
            priorRevaluationLineId: current?.lastRevaluationLineId ?? null,
          });
        }

        const active = await tx.fxRevaluationRun.findFirst({
          where: { organizationId, activeScopeKey: dto.revaluationDate },
        });
        if (active) {
          if (active.status !== FxRevaluationStatus.DRAFT && active.status !== FxRevaluationStatus.REVIEWED) {
            throw new ConflictException("A posted FX revaluation already exists for this date.");
          }
          const superseded = await tx.fxRevaluationRun.updateMany({
            where: {
              id: active.id,
              organizationId,
              status: { in: [FxRevaluationStatus.DRAFT, FxRevaluationStatus.REVIEWED] },
              activeScopeKey: dto.revaluationDate,
            },
            data: { status: FxRevaluationStatus.FAILED, activeScopeKey: null },
          });
          if (superseded.count !== 1) throw new ConflictException("FX revaluation scope changed. Reload and retry.");
          await this.auditLogService.log({
            organizationId, actorUserId, action: "SUPERSEDE", entityType: "FxRevaluationRun", entityId: active.id,
            before: this.auditRun(active), after: { status: FxRevaluationStatus.FAILED, activeScopeKey: null },
          }, tx);
        }

        const run = await tx.fxRevaluationRun.create({
          data: {
            organizationId,
            revaluationDate,
            status: FxRevaluationStatus.DRAFT,
            rateDate,
            requestedByUserId: actorUserId,
            idempotencyKey,
            requestHash,
            activeScopeKey: dto.revaluationDate,
            lines: { create: lines },
          },
          include: RUN_INCLUDE,
        });
        await this.auditLogService.log({
          organizationId, actorUserId, action: "CREATE", entityType: "FxRevaluationRun", entityId: run.id,
          after: this.auditRun(run),
        }, tx);
        return run;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (this.isUniqueConstraintError(error)) throw new ConflictException("An active FX revaluation already exists for this date or idempotency key.");
      throw error;
    }
  }

  async review(organizationId: string, actorUserId: string, id: string, dto: FxRevaluationMutationDto) {
    const key = this.idempotencyKey(dto.idempotencyKey);
    const current = await this.get(organizationId, id);
    if (current.status === FxRevaluationStatus.REVIEWED && current.reviewIdempotencyKey === key) return current;
    if (current.status !== FxRevaluationStatus.DRAFT) throw new BadRequestException("Only draft FX revaluation runs can be reviewed.");

    await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.fxRevaluationRun.updateMany({
        where: { id, organizationId, status: FxRevaluationStatus.DRAFT, reviewIdempotencyKey: null },
        data: { status: FxRevaluationStatus.REVIEWED, reviewedByUserId: actorUserId, reviewedAt: new Date(), reviewIdempotencyKey: key },
      });
      if (claimed.count !== 1) throw new ConflictException("FX revaluation review state changed. Reload and retry.");
      await this.auditLogService.log({
        organizationId, actorUserId, action: "REVIEW", entityType: "FxRevaluationRun", entityId: id,
        before: this.auditRun(current), after: { status: FxRevaluationStatus.REVIEWED, reviewIdempotencyKey: key },
      }, tx);
    });
    return this.get(organizationId, id);
  }

  async post(organizationId: string, actorUserId: string, id: string, dto: FxRevaluationMutationDto) {
    const key = this.idempotencyKey(dto.idempotencyKey);
    const current = await this.get(organizationId, id);
    if (current.status === FxRevaluationStatus.POSTED && current.postIdempotencyKey === key) return current;
    if (current.status !== FxRevaluationStatus.REVIEWED) throw new BadRequestException("Only reviewed FX revaluation runs can be posted.");

    await this.prisma.$transaction(async (tx) => {
      await this.fiscalPeriodGuardService.assertPostingDateAllowed(organizationId, current.revaluationDate, tx);
      const [configuration, accounts] = await Promise.all([
        tx.fxAccountConfiguration.findUnique({
          where: { organizationId },
          include: {
            unrealizedGainAccount: true,
            unrealizedLossAccount: true,
          },
        }),
        tx.account.findMany({ where: { organizationId, code: { in: ["120", "210"] }, isActive: true, allowPosting: true } }),
      ]);
      const receivable = accounts.find((account) => account.code === "120");
      const payable = accounts.find((account) => account.code === "210");
      if (!receivable || !payable) throw new BadRequestException("Active AR and AP control accounts are required for FX revaluation posting.");
      if (
        !configuration?.unrealizedGainAccount || configuration.unrealizedGainAccount.type !== AccountType.REVENUE ||
        !configuration.unrealizedGainAccount.isActive || !configuration.unrealizedGainAccount.allowPosting ||
        !configuration.unrealizedLossAccount || configuration.unrealizedLossAccount.type !== AccountType.EXPENSE ||
        !configuration.unrealizedLossAccount.isActive || !configuration.unrealizedLossAccount.allowPosting
      ) {
        throw new BadRequestException("Configured unrealized FX gain and loss accounts are required for revaluation posting.");
      }

      const invoiceIds = current.lines.flatMap((line) => line.salesInvoiceId ? [line.salesInvoiceId] : []);
      const billIds = current.lines.flatMap((line) => line.purchaseBillId ? [line.purchaseBillId] : []);
      const baseCurrency = current.lines[0]?.baseCurrencyCode;
      if (!baseCurrency) throw new BadRequestException("FX revaluation run has no monetary evidence to post.");
      const nextRevaluationDate = this.dayAfter(current.revaluationDate);
      await this.lockMonetarySources(tx, organizationId, invoiceIds, billIds);
      const [invoices, bills, balances] = await Promise.all([
        tx.salesInvoice.findMany({
          where: {
            organizationId, status: { in: [SalesInvoiceStatus.FINALIZED, SalesInvoiceStatus.VOIDED] }, baseCurrency,
            issueDate: { lte: current.revaluationDate }, finalizedAt: { lt: nextRevaluationDate },
          },
          include: { reversalJournalEntry: { select: { entryDate: true, postedAt: true } } },
        }),
        tx.purchaseBill.findMany({
          where: {
            organizationId, status: { in: [PurchaseBillStatus.FINALIZED, PurchaseBillStatus.VOIDED] }, baseCurrency,
            billDate: { lte: current.revaluationDate }, finalizedAt: { lt: nextRevaluationDate },
          },
          include: { reversalJournalEntry: { select: { entryDate: true, postedAt: true } } },
        }),
        tx.fxMonetaryBalance.findMany({ where: { organizationId, OR: [
          ...(invoiceIds.length ? [{ salesInvoiceId: { in: invoiceIds } }] : []),
          ...(billIds.length ? [{ purchaseBillId: { in: billIds } }] : []),
        ] } }),
      ]);
      const allForeignInvoices = invoices.filter((row) => row.currency.trim().toUpperCase() !== baseCurrency);
      const allForeignBills = bills.filter((row) => row.currency.trim().toUpperCase() !== baseCurrency);
      this.assertNoLaterSourceLifecycle(allForeignInvoices, allForeignBills, current.revaluationDate);
      await this.assertNoLaterSourceActivity(
        tx,
        organizationId,
        allForeignInvoices.map((row) => row.id),
        allForeignBills.map((row) => row.id),
        current.revaluationDate,
      );
      const foreignInvoices = allForeignInvoices.filter((row) => row.status !== SalesInvoiceStatus.VOIDED && toMoney(row.transactionBalanceDue).gt(0));
      const foreignBills = allForeignBills.filter((row) => row.status !== PurchaseBillStatus.VOIDED && toMoney(row.transactionBalanceDue).gt(0));
      this.assertSameSourceSet(invoiceIds, foreignInvoices.map((row) => row.id));
      this.assertSameSourceSet(billIds, foreignBills.map((row) => row.id));
      const invoiceById = new Map(foreignInvoices.map((row) => [row.id, row]));
      const billById = new Map(foreignBills.map((row) => [row.id, row]));
      const balanceBySource = this.balanceMap(balances);
      for (const line of current.lines) {
        const source = line.salesInvoiceId ? invoiceById.get(line.salesInvoiceId) : billById.get(line.purchaseBillId!);
        if (!source || !toMoney(source.transactionBalanceDue).eq(line.openTransactionAmount) || !toMoney(source.balanceDue).eq(line.sourceBaseOpenAmount)) {
          throw new BadRequestException("An eligible balance changed after preview. Create a new FX revaluation run.");
        }
        const existing = balanceBySource.get(this.sourceKey(line.salesInvoiceId, line.purchaseBillId));
        if (line.priorRevaluationLineId) {
          if (!existing || existing.lastRevaluationLineId !== line.priorRevaluationLineId || !toMoney(existing.carryingBaseAmount).eq(line.carryingBaseAmount)) {
            throw new BadRequestException("An eligible carrying basis changed after preview. Create a new FX revaluation run.");
          }
        } else if (existing) {
          throw new BadRequestException("An eligible carrying basis changed after preview. Create a new FX revaluation run.");
        }
      }

      const journalLines = buildFxRevaluationJournalLines({
        baseCurrency: current.lines[0]?.baseCurrencyCode ?? "",
        receivableAccountId: receivable.id,
        payableAccountId: payable.id,
        unrealizedGainAccountId: configuration.unrealizedGainAccount.id,
        unrealizedLossAccountId: configuration.unrealizedLossAccount.id,
        lines: current.lines.map((line) => ({
          sourceType: line.sourceType,
          reference: line.salesInvoice?.invoiceNumber ?? line.purchaseBill?.billNumber ?? line.id,
          unrealizedGainAmount: String(line.unrealizedGainAmount),
          unrealizedLossAmount: String(line.unrealizedLossAmount),
        })),
      });
      let postedJournalEntryId: string | null = null;
      if (journalLines.length > 0) {
        const totals = getJournalTotals(journalLines);
        const entryNumber = await this.numberSequenceService.next(organizationId, NumberSequenceScope.JOURNAL_ENTRY, tx);
        const journal = await tx.journalEntry.create({
          data: {
            organizationId,
            entryNumber,
            status: JournalEntryStatus.POSTED,
            entryDate: current.revaluationDate,
            description: `Period-end FX revaluation ${current.revaluationDate.toISOString().slice(0, 10)}`,
            reference: `FX-REVAL/${current.id}`,
            currency: current.lines[0]!.baseCurrencyCode,
            totalDebit: totals.debit,
            totalCredit: totals.credit,
            postedAt: new Date(),
            postedById: actorUserId,
            createdById: actorUserId,
            lines: { create: journalLines.map((line, index) => ({
              organizationId,
              lineNumber: index + 1,
              accountId: line.accountId,
              description: line.description,
              debit: line.debit,
              credit: line.credit,
              transactionDebit: line.transactionDebit ?? null,
              transactionCredit: line.transactionCredit ?? null,
              currency: line.currency,
              exchangeRate: line.exchangeRate ?? "1",
              rateSnapshotId: line.rateSnapshotId ?? null,
              fxRoundingComponentCount: line.fxRoundingComponentCount ?? 1,
              functionalCurrencyOnly: line.functionalCurrencyOnly ?? false,
            })) },
          },
        });
        postedJournalEntryId = journal.id;
      }

      for (const line of current.lines) {
        const sourceKey = this.sourceKey(line.salesInvoiceId, line.purchaseBillId);
        const existing = balanceBySource.get(sourceKey);
        const data = {
          openTransactionAmount: line.openTransactionAmount,
          sourceBaseOpenAmount: line.sourceBaseOpenAmount,
          carryingBaseAmount: line.revaluedBaseAmount,
          carryingRate: line.closingRate,
          rateSnapshotId: line.rateSnapshotId,
          lastRevaluationLineId: line.id,
        };
        if (existing) {
          const updated = await tx.fxMonetaryBalance.updateMany({
            where: {
              id: existing.id, organizationId, lastRevaluationLineId: line.priorRevaluationLineId!,
              openTransactionAmount: line.openTransactionAmount,
              sourceBaseOpenAmount: line.sourceBaseOpenAmount,
              carryingBaseAmount: line.carryingBaseAmount,
            },
            data,
          });
          if (updated.count !== 1) throw new ConflictException("FX carrying basis changed while posting. Reload and retry.");
        } else {
          await tx.fxMonetaryBalance.create({
            data: {
              organizationId,
              sourceType: line.sourceType,
              salesInvoiceId: line.salesInvoiceId,
              purchaseBillId: line.purchaseBillId,
              currencyCode: line.currencyCode,
              baseCurrencyCode: line.baseCurrencyCode,
              ...data,
            },
          });
        }
      }
      const claimed = await tx.fxRevaluationRun.updateMany({
        where: { id, organizationId, status: FxRevaluationStatus.REVIEWED, postIdempotencyKey: null },
        data: { status: FxRevaluationStatus.POSTED, postedByUserId: actorUserId, postedAt: new Date(), postIdempotencyKey: key, postedJournalEntryId },
      });
      if (claimed.count !== 1) throw new ConflictException("FX revaluation posting state changed. Reload and retry.");
      await this.auditLogService.log({
        organizationId, actorUserId, action: "POST", entityType: "FxRevaluationRun", entityId: id,
        before: this.auditRun(current), after: { status: FxRevaluationStatus.POSTED, postedJournalEntryId },
      }, tx);
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return this.get(organizationId, id);
  }

  async reverse(organizationId: string, actorUserId: string, id: string, dto: FxRevaluationMutationDto) {
    const key = this.idempotencyKey(dto.idempotencyKey);
    const current = await this.get(organizationId, id);
    if (current.status === FxRevaluationStatus.REVERSED && current.reversalIdempotencyKey === key) return current;
    if (current.status !== FxRevaluationStatus.POSTED) throw new BadRequestException("Only posted FX revaluation runs can be reversed.");

    await this.prisma.$transaction(async (tx) => {
      const reversalDate = new Date();
      await this.fiscalPeriodGuardService.assertPostingDateAllowed(organizationId, reversalDate, tx);
      const balances = await tx.fxMonetaryBalance.findMany({
        where: { organizationId, OR: [
          ...current.lines.flatMap((line) => line.salesInvoiceId ? [{ salesInvoiceId: line.salesInvoiceId }] : []),
          ...current.lines.flatMap((line) => line.purchaseBillId ? [{ purchaseBillId: line.purchaseBillId }] : []),
        ] },
      });
      const balanceBySource = this.balanceMap(balances);
      for (const line of current.lines) {
        const balance = balanceBySource.get(this.sourceKey(line.salesInvoiceId, line.purchaseBillId));
        if (
          !balance || balance.lastRevaluationLineId !== line.id ||
          !toMoney(balance.openTransactionAmount).eq(line.openTransactionAmount) ||
          !toMoney(balance.sourceBaseOpenAmount).eq(line.sourceBaseOpenAmount) ||
          !toMoney(balance.carryingBaseAmount).eq(line.revaluedBaseAmount)
        ) {
          throw new BadRequestException("FX revaluation cannot be reversed after a later revaluation or settlement changed its carrying basis.");
        }
      }
      let reversalJournalEntryId: string | null = null;
      if (current.postedJournalEntryId) {
        const original = await tx.journalEntry.findFirst({
          where: { id: current.postedJournalEntryId, organizationId, status: JournalEntryStatus.POSTED },
          include: { lines: { orderBy: { lineNumber: "asc" } }, reversedBy: { select: { id: true } } },
        });
        if (!original || original.reversedBy) throw new BadRequestException("Posted FX revaluation journal is unavailable for reversal.");
        const reversalLines = createReversalLines(original.lines.map((line) => ({
          accountId: line.accountId,
          debit: String(line.debit),
          credit: String(line.credit),
          transactionDebit: line.transactionDebit === null ? undefined : String(line.transactionDebit),
          transactionCredit: line.transactionCredit === null ? undefined : String(line.transactionCredit),
          description: line.description ?? undefined,
          currency: line.currency,
          exchangeRate: String(line.exchangeRate),
          rateSnapshotId: line.rateSnapshotId,
          fxRoundingComponentCount: line.fxRoundingComponentCount,
          functionalCurrencyOnly: line.functionalCurrencyOnly,
        })));
        const totals = getJournalTotals(reversalLines);
        const entryNumber = await this.numberSequenceService.next(organizationId, NumberSequenceScope.JOURNAL_ENTRY, tx);
        const reversal = await tx.journalEntry.create({
          data: {
            organizationId, entryNumber, status: JournalEntryStatus.POSTED, entryDate: reversalDate,
            description: `Reversal of ${original.entryNumber}: ${original.description}`,
            reference: original.entryNumber, currency: original.currency,
            totalDebit: totals.debit, totalCredit: totals.credit,
            postedAt: reversalDate, postedById: actorUserId, createdById: actorUserId, reversalOfId: original.id,
            lines: { create: reversalLines.map((line, index) => ({
              organizationId, lineNumber: index + 1, accountId: line.accountId, description: line.description,
              debit: line.debit, credit: line.credit,
              transactionDebit: line.transactionDebit ?? null, transactionCredit: line.transactionCredit ?? null,
              currency: line.currency, exchangeRate: line.exchangeRate ?? "1", rateSnapshotId: line.rateSnapshotId ?? null,
              fxRoundingComponentCount: line.fxRoundingComponentCount ?? 1,
              functionalCurrencyOnly: line.functionalCurrencyOnly ?? false,
            })) },
          },
        });
        reversalJournalEntryId = reversal.id;
        const reversed = await tx.journalEntry.updateMany({
          where: { id: original.id, organizationId, status: JournalEntryStatus.POSTED },
          data: { status: JournalEntryStatus.REVERSED },
        });
        if (reversed.count !== 1) throw new ConflictException("FX revaluation journal changed while reversing.");
      }

      for (const line of current.lines) {
        const balance = balanceBySource.get(this.sourceKey(line.salesInvoiceId, line.purchaseBillId))!;
        if (line.priorRevaluationLineId && line.priorRevaluationLine) {
          const restored = await tx.fxMonetaryBalance.updateMany({
            where: {
              id: balance.id, organizationId, lastRevaluationLineId: line.id,
              openTransactionAmount: line.openTransactionAmount,
              sourceBaseOpenAmount: line.sourceBaseOpenAmount,
              carryingBaseAmount: line.revaluedBaseAmount,
            },
            data: {
              carryingBaseAmount: line.carryingBaseAmount,
              carryingRate: line.priorRevaluationLine.closingRate,
              rateSnapshotId: line.priorRevaluationLine.rateSnapshotId,
              lastRevaluationLineId: line.priorRevaluationLineId,
            },
          });
          if (restored.count !== 1) throw new ConflictException("FX carrying basis changed while reversing.");
        } else {
          const deleted = await tx.fxMonetaryBalance.deleteMany({
            where: {
              id: balance.id, organizationId, lastRevaluationLineId: line.id,
              openTransactionAmount: line.openTransactionAmount,
              sourceBaseOpenAmount: line.sourceBaseOpenAmount,
              carryingBaseAmount: line.revaluedBaseAmount,
            },
          });
          if (deleted.count !== 1) throw new ConflictException("FX carrying basis changed while reversing.");
        }
      }
      const claimed = await tx.fxRevaluationRun.updateMany({
        where: { id, organizationId, status: FxRevaluationStatus.POSTED, reversalIdempotencyKey: null },
        data: {
          status: FxRevaluationStatus.REVERSED, reversedByUserId: actorUserId, reversedAt: reversalDate,
          reversalIdempotencyKey: key, reversalJournalEntryId, activeScopeKey: null,
        },
      });
      if (claimed.count !== 1) throw new ConflictException("FX revaluation reversal state changed. Reload and retry.");
      await this.auditLogService.log({
        organizationId, actorUserId, action: "REVERSE", entityType: "FxRevaluationRun", entityId: id,
        before: this.auditRun(current), after: { status: FxRevaluationStatus.REVERSED, reversalJournalEntryId },
      }, tx);
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return this.get(organizationId, id);
  }

  private assertCarryingMatchesSource(
    balance: { openTransactionAmount: Prisma.Decimal; sourceBaseOpenAmount: Prisma.Decimal } | undefined,
    transactionOpen: Prisma.Decimal,
    sourceBaseOpen: Prisma.Decimal,
  ) {
    if (balance && (!toMoney(balance.openTransactionAmount).eq(transactionOpen) || !toMoney(balance.sourceBaseOpenAmount).eq(sourceBaseOpen))) {
      throw new BadRequestException("Stored FX carrying evidence does not match the source open balance.");
    }
  }

  private assertChronologicalCarrying(
    balance: { lastRevaluationLine?: { revaluationRun: { revaluationDate: Date } } } | undefined,
    revaluationDate: Date,
  ) {
    const priorDate = balance?.lastRevaluationLine?.revaluationRun.revaluationDate;
    if (priorDate && priorDate.getTime() > revaluationDate.getTime()) {
      throw new BadRequestException("Revaluation date cannot be earlier than the active monetary carrying layer.");
    }
  }

  private assertSameSourceSet(frozenIds: string[], currentIds: string[]) {
    const frozen = [...frozenIds].sort();
    const current = [...currentIds].sort();
    if (frozen.length !== current.length || frozen.some((id, index) => id !== current[index])) {
      throw new BadRequestException("Eligible foreign monetary balances changed after preview. Create a new FX revaluation run.");
    }
  }

  private assertNoLaterSourceLifecycle(
    invoices: Array<{ status?: SalesInvoiceStatus; reversalJournalEntry?: { entryDate: Date; postedAt: Date | null } | null }>,
    bills: Array<{ status?: PurchaseBillStatus; reversalJournalEntry?: { entryDate: Date; postedAt: Date | null } | null }>,
    revaluationDate: Date,
  ) {
    const nextDate = this.dayAfter(revaluationDate);
    const laterVoid = [
      ...invoices.filter((row) => row.status === SalesInvoiceStatus.VOIDED),
      ...bills.filter((row) => row.status === PurchaseBillStatus.VOIDED),
    ].some((row) => {
      const reversalDate = row.reversalJournalEntry?.entryDate ?? row.reversalJournalEntry?.postedAt;
      return !reversalDate || reversalDate.getTime() >= nextDate.getTime();
    });
    if (laterVoid) {
      throw new BadRequestException("A foreign source document was voided after the revaluation date. Revalue the current open state instead.");
    }
  }

  private async assertNoLaterSourceActivity(
    executor: Prisma.TransactionClient,
    organizationId: string,
    invoiceIds: string[],
    billIds: string[],
    revaluationDate: Date,
  ) {
    const nextDate = this.dayAfter(revaluationDate);
    const [customerDirect, customerUnapplied, customerCredits, supplierDirect, supplierUnapplied, supplierDebits] = await Promise.all([
      invoiceIds.length ? executor.customerPaymentAllocation.count({ where: {
        organizationId, invoiceId: { in: invoiceIds }, OR: [
          { createdAt: { gte: nextDate } }, { payment: { paymentDate: { gte: nextDate } } }, { payment: { voidedAt: { gte: nextDate } } },
        ],
      } }) : 0,
      invoiceIds.length ? executor.customerPaymentUnappliedAllocation.count({ where: {
        organizationId, invoiceId: { in: invoiceIds }, OR: [
          { createdAt: { gte: nextDate } }, { reversedAt: { gte: nextDate } },
          { payment: { paymentDate: { gte: nextDate } } }, { payment: { voidedAt: { gte: nextDate } } },
        ],
      } }) : 0,
      invoiceIds.length ? executor.creditNoteAllocation.count({ where: {
        organizationId, invoiceId: { in: invoiceIds }, OR: [
          { createdAt: { gte: nextDate } }, { reversedAt: { gte: nextDate } }, { creditNote: { issueDate: { gte: nextDate } } },
        ],
      } }) : 0,
      billIds.length ? executor.supplierPaymentAllocation.count({ where: {
        organizationId, billId: { in: billIds }, OR: [
          { createdAt: { gte: nextDate } }, { payment: { paymentDate: { gte: nextDate } } }, { payment: { voidedAt: { gte: nextDate } } },
        ],
      } }) : 0,
      billIds.length ? executor.supplierPaymentUnappliedAllocation.count({ where: {
        organizationId, billId: { in: billIds }, OR: [
          { createdAt: { gte: nextDate } }, { reversedAt: { gte: nextDate } },
          { payment: { paymentDate: { gte: nextDate } } }, { payment: { voidedAt: { gte: nextDate } } },
        ],
      } }) : 0,
      billIds.length ? executor.purchaseDebitNoteAllocation.count({ where: {
        organizationId, billId: { in: billIds }, OR: [
          { createdAt: { gte: nextDate } }, { reversedAt: { gte: nextDate } }, { debitNote: { issueDate: { gte: nextDate } } },
        ],
      } }) : 0,
    ]);
    if (customerDirect + customerUnapplied + customerCredits + supplierDirect + supplierUnapplied + supplierDebits > 0) {
      throw new BadRequestException("A foreign balance has settlement or correction activity after the revaluation date. Revalue the current open state instead.");
    }
  }

  private async lockMonetarySources(
    executor: Prisma.TransactionClient,
    organizationId: string,
    invoiceIds: string[],
    billIds: string[],
  ) {
    if (invoiceIds.length) {
      const ids = [...new Set(invoiceIds)].sort().map((id) => Prisma.sql`${id}::uuid`);
      await executor.$queryRaw(Prisma.sql`
        SELECT "id" FROM "SalesInvoice"
        WHERE "organizationId" = ${organizationId}::uuid AND "id" IN (${Prisma.join(ids)})
        ORDER BY "id" FOR UPDATE
      `);
    }
    if (billIds.length) {
      const ids = [...new Set(billIds)].sort().map((id) => Prisma.sql`${id}::uuid`);
      await executor.$queryRaw(Prisma.sql`
        SELECT "id" FROM "PurchaseBill"
        WHERE "organizationId" = ${organizationId}::uuid AND "id" IN (${Prisma.join(ids)})
        ORDER BY "id" FOR UPDATE
      `);
    }
  }

  private dayAfter(date: Date) {
    const nextDate = new Date(date);
    nextDate.setUTCDate(nextDate.getUTCDate() + 1);
    return nextDate;
  }

  private balanceMap<T extends { salesInvoiceId: string | null; purchaseBillId: string | null }>(balances: T[]) {
    return new Map(balances.map((balance) => [this.sourceKey(balance.salesInvoiceId, balance.purchaseBillId), balance]));
  }

  private sourceKey(salesInvoiceId: string | null, purchaseBillId: string | null) {
    return salesInvoiceId ? `invoice:${salesInvoiceId}` : `bill:${purchaseBillId}`;
  }

  private auditRun(run: { id: string; status: FxRevaluationStatus; revaluationDate?: Date; lines?: unknown[] }) {
    return {
      id: run.id,
      status: run.status,
      revaluationDate: run.revaluationDate?.toISOString().slice(0, 10),
      lineCount: run.lines?.length,
    };
  }

  private requestHash(dto: PreviewFxRevaluationDto) {
    return createHash("sha256").update(JSON.stringify({
      revaluationDate: dto.revaluationDate,
      rateDate: dto.rateDate,
      rates: [...dto.rates].map((row) => ({ currencyCode: row.currencyCode.trim().toUpperCase(), rateSnapshotId: row.rateSnapshotId })).sort((a, b) => a.currencyCode.localeCompare(b.currencyCode)),
    })).digest("hex");
  }

  private dateOnly(value: string, label: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new BadRequestException(`${label} must use YYYY-MM-DD.`);
    const date = new Date(`${value}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new BadRequestException(`${label} must be a valid calendar date.`);
    return date;
  }

  private idempotencyKey(value: string) {
    const key = value?.trim();
    if (!key || !/^[A-Za-z0-9._:-]{8,128}$/.test(key)) throw new BadRequestException("Idempotency key must be 8-128 safe characters.");
    return key;
  }

  private boundedInteger(value: number | undefined, min: number, max: number, fallback: number) {
    return Number.isInteger(value) ? Math.min(Math.max(value as number, min), max) : fallback;
  }

  private isUniqueConstraintError(error: unknown) {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
  }
}
