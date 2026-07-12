import { BadRequestException, Injectable, NotFoundException, Optional } from "@nestjs/common";
import { createHash } from "node:crypto";
import {
  allocateForeignSettlement,
  convertTransactionToBaseAmount,
  createReversalLines,
  getJournalTotals,
  JournalLineInput,
  toMoney,
} from "@ledgerbyte/accounting-core";
import { SupplierPaymentReceiptPdfData, renderSupplierPaymentReceiptPdf } from "@ledgerbyte/pdf-core";
import {
  AccountType,
  ContactType,
  CurrencyRateSource,
  DocumentType,
  JournalEntryStatus,
  NumberSequenceScope,
  Prisma,
  PurchaseBillStatus,
  SupplierPaymentStatus,
  SupplierRefundStatus,
} from "@prisma/client";
import {
  AUDIT_ENTITY_TYPES,
  documentFxAuditEvidence,
  isForeignDocumentFxContext,
} from "../audit-log/audit-events";
import { AuditLogService } from "../audit-log/audit-log.service";
import { OrganizationDocumentSettingsService } from "../document-settings/organization-document-settings.service";
import { GeneratedDocumentService, sanitizeFilename } from "../generated-documents/generated-document.service";
import { FiscalPeriodGuardService } from "../fiscal-periods/fiscal-period-guard.service";
import {
  BaseCurrencyPostingGuardService,
  resolveOrganizationBaseCurrency,
} from "../foreign-exchange/base-currency-posting-guard.service";
import {
  assertStoredDocumentFxPostingContext,
  DocumentFxContextService,
  ResolvedDocumentFxContext,
} from "../foreign-exchange/document-fx-context.service";
import { FxCarryingBalanceService, FxCarryingSettlementBasis } from "../foreign-exchange/fx-carrying-balance.service";
import { buildRealizedFxAdjustmentJournalLines } from "../foreign-exchange/realized-fx-adjustment";
import { NumberSequenceService } from "../number-sequences/number-sequence.service";
import { PrismaService } from "../prisma/prisma.service";
import { ApplyUnappliedSupplierPaymentDto } from "./dto/apply-unapplied-supplier-payment.dto";
import { CreateSupplierPaymentDto } from "./dto/create-supplier-payment.dto";
import { ReverseUnappliedSupplierPaymentAllocationDto } from "./dto/reverse-unapplied-supplier-payment-allocation.dto";
import { SupplierPaymentAllocationDto } from "./dto/supplier-payment-allocation.dto";
import { buildSupplierPaymentJournalLines } from "./supplier-payment-accounting";

const supplierPaymentInclude = {
  supplier: { select: { id: true, name: true, displayName: true, type: true } },
  account: { select: { id: true, code: true, name: true, type: true } },
  journalEntry: {
    select: {
      id: true,
      entryNumber: true,
      status: true,
      totalDebit: true,
      totalCredit: true,
      reversedBy: { select: { id: true, entryNumber: true } },
    },
  },
  voidReversalJournalEntry: { select: { id: true, entryNumber: true, status: true } },
  allocations: {
    include: {
      bill: {
        select: {
          id: true,
          billNumber: true,
          billDate: true,
          dueDate: true,
          total: true,
          balanceDue: true,
          transactionTotal: true,
          transactionBalanceDue: true,
          currency: true,
          exchangeRate: true,
          rateSnapshotId: true,
          status: true,
        },
      },
    },
    orderBy: { createdAt: "asc" as const },
  },
  unappliedAllocations: {
    include: {
      bill: {
        select: {
          id: true,
          billNumber: true,
          billDate: true,
          dueDate: true,
          total: true,
          balanceDue: true,
          transactionTotal: true,
          transactionBalanceDue: true,
          currency: true,
          exchangeRate: true,
          rateSnapshotId: true,
          status: true,
        },
      },
      reversedBy: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "asc" as const },
  },
};

type PrismaExecutor = PrismaService | Prisma.TransactionClient;

@Injectable()
export class SupplierPaymentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
    private readonly numberSequenceService: NumberSequenceService,
    private readonly documentSettingsService?: OrganizationDocumentSettingsService,
    private readonly generatedDocumentService?: GeneratedDocumentService,
    private readonly fiscalPeriodGuardService?: FiscalPeriodGuardService,
    @Optional() private readonly baseCurrencyPostingGuardService?: BaseCurrencyPostingGuardService,
    @Optional() private readonly documentFxContextService?: DocumentFxContextService,
    @Optional() private readonly fxCarryingBalanceService?: FxCarryingBalanceService,
  ) {}

  list(organizationId: string) {
    return this.prisma.supplierPayment.findMany({
      where: { organizationId },
      orderBy: { paymentDate: "desc" },
      include: {
        supplier: { select: { id: true, name: true, displayName: true } },
        account: { select: { id: true, code: true, name: true } },
        journalEntry: { select: { id: true, entryNumber: true, status: true } },
        voidReversalJournalEntry: { select: { id: true, entryNumber: true, status: true } },
      },
    });
  }

  async get(organizationId: string, id: string) {
    const payment = await this.prisma.supplierPayment.findFirst({
      where: { id, organizationId },
      include: supplierPaymentInclude,
    });

    if (!payment) {
      throw new NotFoundException("Supplier payment not found.");
    }

    return payment;
  }

  async allocations(organizationId: string, id: string) {
    const payment = await this.prisma.supplierPayment.findFirst({
      where: { id, organizationId },
      select: { id: true },
    });
    if (!payment) {
      throw new NotFoundException("Supplier payment not found.");
    }

    return this.prisma.supplierPaymentAllocation.findMany({
      where: { organizationId, paymentId: id },
      orderBy: { createdAt: "asc" },
      include: {
        bill: {
          select: {
            id: true,
            billNumber: true,
            billDate: true,
            dueDate: true,
            total: true,
            balanceDue: true,
            status: true,
          },
        },
      },
    });
  }

  async unappliedAllocations(organizationId: string, id: string) {
    const payment = await this.prisma.supplierPayment.findFirst({
      where: { id, organizationId },
      select: { id: true },
    });
    if (!payment) {
      throw new NotFoundException("Supplier payment not found.");
    }

    return this.prisma.supplierPaymentUnappliedAllocation.findMany({
      where: { organizationId, paymentId: id },
      orderBy: { createdAt: "asc" },
      include: {
        bill: {
          select: {
            id: true,
            billNumber: true,
            billDate: true,
            dueDate: true,
            total: true,
            balanceDue: true,
            status: true,
          },
        },
        reversedBy: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async unappliedAllocationsForBill(organizationId: string, billId: string) {
    const bill = await this.prisma.purchaseBill.findFirst({
      where: { id: billId, organizationId },
      select: { id: true },
    });
    if (!bill) {
      throw new NotFoundException("Purchase bill not found.");
    }

    return this.prisma.supplierPaymentUnappliedAllocation.findMany({
      where: { organizationId, billId },
      orderBy: { createdAt: "asc" },
      include: {
        payment: {
          select: {
            id: true,
            paymentNumber: true,
            paymentDate: true,
            currency: true,
            status: true,
            amountPaid: true,
            unappliedAmount: true,
          },
        },
        reversedBy: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async receiptData(organizationId: string, id: string) {
    const payment = await this.prisma.supplierPayment.findFirst({
      where: { id, organizationId },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            legalName: true,
            taxNumber: true,
            countryCode: true,
            baseCurrency: true,
            timezone: true,
          },
        },
        supplier: {
          select: {
            id: true,
            name: true,
            displayName: true,
            email: true,
            phone: true,
            taxNumber: true,
          },
        },
        account: { select: { id: true, code: true, name: true, type: true } },
        journalEntry: { select: { id: true, entryNumber: true, status: true, totalDebit: true, totalCredit: true } },
        allocations: {
          orderBy: { createdAt: "asc" },
          include: {
            bill: {
              select: {
                id: true,
                billNumber: true,
                billDate: true,
                dueDate: true,
                total: true,
                balanceDue: true,
                transactionTotal: true,
                transactionBalanceDue: true,
              },
            },
          },
        },
        unappliedAllocations: {
          orderBy: { createdAt: "asc" },
          include: {
            bill: {
              select: {
                id: true,
                billNumber: true,
                billDate: true,
                dueDate: true,
                total: true,
                balanceDue: true,
                transactionTotal: true,
                transactionBalanceDue: true,
              },
            },
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException("Supplier payment not found.");
    }

    return {
      receiptNumber: payment.paymentNumber,
      paymentDate: payment.paymentDate,
      supplier: payment.supplier,
      organization: payment.organization,
      amountPaid: payment.transactionAmountPaid ?? payment.amountPaid,
      unappliedAmount: payment.transactionUnappliedAmount ?? payment.unappliedAmount,
      currency: payment.currency,
      paidThroughAccount: payment.account,
      allocations: payment.allocations.map((allocation) => ({
        billId: allocation.billId,
        billNumber: allocation.bill.billNumber,
        billDate: allocation.bill.billDate,
        billDueDate: allocation.bill.dueDate,
        billTotal: allocation.bill.transactionTotal ?? allocation.bill.total,
        amountApplied: allocation.transactionAmountApplied ?? allocation.amountApplied,
        billBalanceDue: allocation.bill.transactionBalanceDue ?? allocation.bill.balanceDue,
      })),
      unappliedAllocations: payment.unappliedAllocations.map((allocation) => ({
        billId: allocation.billId,
        billNumber: allocation.bill.billNumber,
        billDate: allocation.bill.billDate,
        billDueDate: allocation.bill.dueDate,
        billTotal: allocation.bill.transactionTotal ?? allocation.bill.total,
        amountApplied: allocation.transactionAmountApplied ?? allocation.amountApplied,
        billBalanceDue: allocation.bill.transactionBalanceDue ?? allocation.bill.balanceDue,
        status: allocation.reversedAt ? "Reversed" : "Active",
        reversedAt: allocation.reversedAt,
        reversalReason: allocation.reversalReason,
      })),
      journalEntry: payment.journalEntry,
      status: payment.status,
    };
  }

  async receiptPdfData(organizationId: string, id: string): Promise<SupplierPaymentReceiptPdfData> {
    const payment = await this.prisma.supplierPayment.findFirst({
      where: { id, organizationId },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            legalName: true,
            taxNumber: true,
            countryCode: true,
          },
        },
        supplier: {
          select: {
            id: true,
            name: true,
            displayName: true,
            email: true,
            phone: true,
            taxNumber: true,
            addressLine1: true,
            addressLine2: true,
            city: true,
            postalCode: true,
            countryCode: true,
          },
        },
        account: { select: { id: true, code: true, name: true } },
        journalEntry: { select: { id: true, entryNumber: true, status: true } },
        allocations: {
          orderBy: { createdAt: "asc" },
          include: {
            bill: {
              select: {
                id: true,
                billNumber: true,
                billDate: true,
                dueDate: true,
                total: true,
                balanceDue: true,
                transactionTotal: true,
                transactionBalanceDue: true,
              },
            },
          },
        },
        unappliedAllocations: {
          orderBy: { createdAt: "asc" },
          include: {
            bill: {
              select: {
                id: true,
                billNumber: true,
                billDate: true,
                dueDate: true,
                total: true,
                balanceDue: true,
                transactionTotal: true,
                transactionBalanceDue: true,
              },
            },
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException("Supplier payment not found.");
    }

    return {
      organization: payment.organization,
      supplier: payment.supplier,
      payment: {
        id: payment.id,
        paymentNumber: payment.paymentNumber,
        paymentDate: payment.paymentDate,
        status: payment.status,
        currency: payment.currency,
        amountPaid: moneyString(payment.transactionAmountPaid ?? payment.amountPaid),
        unappliedAmount: moneyString(payment.transactionUnappliedAmount ?? payment.unappliedAmount),
        description: payment.description,
      },
      paidThroughAccount: payment.account,
      allocations: payment.allocations.map((allocation) => ({
        billId: allocation.billId,
        billNumber: allocation.bill.billNumber,
        billDate: allocation.bill.billDate,
        billDueDate: allocation.bill.dueDate,
        billTotal: moneyString(allocation.bill.transactionTotal ?? allocation.bill.total),
        amountApplied: moneyString(allocation.transactionAmountApplied ?? allocation.amountApplied),
        billBalanceDue: moneyString(allocation.bill.transactionBalanceDue ?? allocation.bill.balanceDue),
      })),
      unappliedAllocations: payment.unappliedAllocations.map((allocation) => ({
        billId: allocation.billId,
        billNumber: allocation.bill.billNumber,
        billDate: allocation.bill.billDate,
        billDueDate: allocation.bill.dueDate,
        billTotal: moneyString(allocation.bill.transactionTotal ?? allocation.bill.total),
        amountApplied: moneyString(allocation.transactionAmountApplied ?? allocation.amountApplied),
        billBalanceDue: moneyString(allocation.bill.transactionBalanceDue ?? allocation.bill.balanceDue),
        status: allocation.reversedAt ? "Reversed" : "Active",
        reversedAt: allocation.reversedAt,
        reversalReason: allocation.reversalReason,
      })),
      journalEntry: payment.journalEntry,
      generatedAt: new Date(),
    };
  }

  async receiptPdf(
    organizationId: string,
    actorUserId: string,
    id: string,
  ): Promise<{ data: SupplierPaymentReceiptPdfData; buffer: Buffer; filename: string; document: unknown | null }> {
    const data = await this.receiptPdfData(organizationId, id);
    const settings = await this.documentSettingsService?.receiptRenderSettings(organizationId);
    const buffer = await renderSupplierPaymentReceiptPdf(data, { ...settings, title: "Supplier Payment Receipt" });
    const filename = sanitizeFilename(`supplier-payment-${data.payment.paymentNumber}.pdf`);
    const document = await this.generatedDocumentService?.archivePdf({
      organizationId,
      documentType: DocumentType.SUPPLIER_PAYMENT_RECEIPT,
      sourceType: "SupplierPayment",
      sourceId: data.payment.id,
      documentNumber: data.payment.paymentNumber,
      filename,
      buffer,
      generatedById: actorUserId,
    });
    return { data, buffer, filename, document: document ?? null };
  }

  async generateReceiptPdf(organizationId: string, actorUserId: string, id: string) {
    const { document } = await this.receiptPdf(organizationId, actorUserId, id);
    return document;
  }

  async create(organizationId: string, actorUserId: string, dto: CreateSupplierPaymentDto) {
    const transactionAmountPaid = this.assertPositiveMoney(dto.amountPaid, "Amount paid");
    const allocations = dto.allocations ?? [];
    this.assertAllocations(allocations);

    const totalAllocated = allocations.reduce((sum, allocation) => sum.plus(allocation.amountApplied), toMoney(0));
    if (totalAllocated.gt(transactionAmountPaid)) {
      throw new BadRequestException("Total allocations cannot exceed amount paid.");
    }

    const transactionUnappliedAmount = transactionAmountPaid.minus(totalAllocated).toFixed(4);
    const idempotencyKey = this.cleanOptional(dto.idempotencyKey);
    const requestHash = idempotencyKey ? this.requestFingerprint(dto) : null;
    if (idempotencyKey) {
      const prior = await this.prisma.supplierPayment.findUnique({
        where: { organizationId_idempotencyKey: { organizationId, idempotencyKey } },
      });
      if (prior) {
        if (prior.requestHash !== requestHash) {
          throw new BadRequestException("Idempotency key was already used for a different supplier payment request.");
        }
        return this.get(organizationId, prior.id);
      }
    }

    const payment = await this.prisma.$transaction(async (tx) => {
      const paymentDate = new Date(dto.paymentDate);
      await this.assertPostingDateAllowed(organizationId, paymentDate, tx);
      const fx = await this.resolvePaymentFxContext(organizationId, dto, tx);
      const supplier = await tx.contact.findFirst({
        where: {
          id: dto.supplierId,
          organizationId,
          isActive: true,
          type: { in: [ContactType.SUPPLIER, ContactType.BOTH] },
        },
        select: { id: true, name: true, displayName: true },
      });
      if (!supplier) {
        throw new BadRequestException("Supplier must be an active supplier contact in this organization.");
      }

      const paidThroughAccount = await tx.account.findFirst({
        where: {
          id: dto.accountId,
          organizationId,
          isActive: true,
          allowPosting: true,
          type: AccountType.ASSET,
        },
        select: { id: true },
      });
      if (!paidThroughAccount) {
        throw new BadRequestException("Paid-through account must be an active posting asset account in this organization.");
      }

      const bills = await this.validateBillsForAllocation(organizationId, supplier.id, fx.currency, fx.baseCurrency, allocations, tx);
      const billById = new Map(bills.map((bill) => [bill.id, bill]));
      const settlementBaseAmountPaid = convertTransactionToBaseAmount(transactionAmountPaid.toFixed(4), String(fx.exchangeRate));
      let settlementTransactionOpen = transactionAmountPaid;
      let settlementBaseOpen = toMoney(settlementBaseAmountPaid);
      const allocationPlans: Array<{
        allocation: SupplierPaymentAllocationDto;
        bill: (typeof bills)[number];
        recognitionRate: string;
        carryingBasis: FxCarryingSettlementBasis;
        calculated: ReturnType<typeof allocateForeignSettlement>;
      }> = [];
      for (const allocation of allocations) {
        const bill = billById.get(allocation.billId)!;
        const recognitionRate = String(bill.exchangeRate ?? "1");
        assertStoredDocumentFxPostingContext({
          currency: bill.currency,
          baseCurrency: bill.baseCurrency ?? fx.baseCurrency,
          exchangeRate: recognitionRate,
          rateDate: bill.rateDate ?? paymentDate,
          rateSource: bill.rateSource ?? CurrencyRateSource.SYSTEM_RATE_1,
        });
        const carryingBasis = await this.resolveCarryingBasis(organizationId, bill, tx);
        const calculated = allocateForeignSettlement({
          direction: "SUPPLIER",
          transactionAmount: allocation.amountApplied,
          transactionOpenAmount: String(bill.transactionBalanceDue ?? bill.balanceDue),
          baseOpenAmount: carryingBasis.carryingBaseOpenAmount,
          sourceBaseOpenAmount: carryingBasis.sourceBaseOpenAmount,
          recognitionRate,
          settlementRate: String(fx.exchangeRate),
          settlementTransactionOpenAmount: settlementTransactionOpen.toFixed(4),
          settlementBaseOpenAmount: settlementBaseOpen.toFixed(4),
          useProportionalCarryingBasis: carryingBasis.useProportionalCarryingBasis,
        });
        settlementTransactionOpen = settlementTransactionOpen.minus(calculated.transactionAmount);
        settlementBaseOpen = settlementBaseOpen.minus(calculated.settlementBaseAmount);
        allocationPlans.push({ allocation, bill, recognitionRate, carryingBasis, calculated });
      }
      const realizedGainAmount = allocationPlans.reduce((sum, plan) => sum.plus(plan.calculated.realizedGainAmount), toMoney(0)).toFixed(4);
      const realizedLossAmount = allocationPlans.reduce((sum, plan) => sum.plus(plan.calculated.realizedLossAmount), toMoney(0)).toFixed(4);
      if (!settlementTransactionOpen.eq(transactionUnappliedAmount) || settlementBaseOpen.lt(0)) {
        throw new BadRequestException("Supplier payment allocation components do not reconcile to the payment total.");
      }
      const fxAccounts = await this.resolveRealizedFxAccounts(organizationId, realizedGainAmount, realizedLossAmount, tx);
      const unappliedAmount = settlementBaseOpen.toFixed(4);
      const accountsPayableAccount = await this.findPostingAccountByCode(organizationId, "210", tx);
      const paymentNumber = await this.numberSequenceService.next(organizationId, NumberSequenceScope.PAYMENT, tx);
      const journalLines = buildSupplierPaymentJournalLines({
        paidThroughAccountId: paidThroughAccount.id,
        accountsPayableAccountId: accountsPayableAccount.id,
        paymentNumber,
        supplierName: supplier.displayName ?? supplier.name,
        currency: fx.currency,
        baseCurrency: fx.baseCurrency,
        exchangeRate: String(fx.exchangeRate),
        rateSnapshotId: fx.rateSnapshotId,
        transactionAmountPaid: transactionAmountPaid.toFixed(4),
        settlementBaseAmountPaid,
        allocations: allocationPlans.map((plan) => ({
          transactionAmountApplied: plan.calculated.transactionAmount,
          documentBaseAmountApplied: plan.calculated.documentBaseAmount,
          recognitionRate: plan.recognitionRate,
          rateSnapshotId: plan.bill.rateSnapshotId ?? null,
          carryingRate: plan.carryingBasis.carryingRate,
          carryingRateSnapshotId: plan.carryingBasis.carryingRateSnapshotId,
        })),
        transactionUnappliedAmount,
        unappliedBaseAmount: unappliedAmount,
        realizedGainAmount,
        realizedLossAmount,
        realizedGainAccountId: fxAccounts.realizedGainAccountId,
        realizedLossAccountId: fxAccounts.realizedLossAccountId,
      });
      const totals = getJournalTotals(journalLines);
      const entryNumber = await this.numberSequenceService.next(organizationId, NumberSequenceScope.JOURNAL_ENTRY, tx);
      const journalEntry = await tx.journalEntry.create({
        data: {
          organizationId,
          entryNumber,
          status: JournalEntryStatus.POSTED,
          entryDate: paymentDate,
          description: `Supplier payment ${paymentNumber} - ${supplier.displayName ?? supplier.name}`,
          reference: paymentNumber,
          currency: fx.baseCurrency,
          totalDebit: totals.debit,
          totalCredit: totals.credit,
          postedAt: new Date(),
          postedById: actorUserId,
          createdById: actorUserId,
          lines: { create: this.toJournalLineCreateMany(organizationId, journalLines) },
        },
      });

      const created = await tx.supplierPayment.create({
        data: {
          organizationId,
          paymentNumber,
          supplierId: supplier.id,
          paymentDate,
          currency: fx.currency,
          baseCurrency: fx.baseCurrency,
          exchangeRate: fx.exchangeRate,
          rateDate: fx.rateDate,
          rateSource: fx.rateSource,
          rateSnapshotId: fx.rateSnapshotId,
          amountPaid: settlementBaseAmountPaid,
          unappliedAmount,
          transactionAmountPaid: transactionAmountPaid.toFixed(4),
          transactionUnappliedAmount,
          idempotencyKey,
          requestHash,
          accountId: paidThroughAccount.id,
          description: this.cleanOptional(dto.description),
          journalEntryId: journalEntry.id,
          createdById: actorUserId,
          postedAt: new Date(),
        },
        select: { id: true },
      });

      for (const plan of allocationPlans) {
        const billClaim = await tx.purchaseBill.updateMany({
          where: {
            id: plan.allocation.billId,
            organizationId,
            supplierId: supplier.id,
            status: PurchaseBillStatus.FINALIZED,
            balanceDue: { gte: plan.calculated.sourceBaseAmount! },
            transactionBalanceDue: { gte: plan.calculated.transactionAmount },
          },
          data: {
            balanceDue: { decrement: plan.calculated.sourceBaseAmount! },
            transactionBalanceDue: { decrement: plan.calculated.transactionAmount },
          },
        });
        if (billClaim.count !== 1) {
          throw new BadRequestException("Bill balance due is no longer sufficient for this supplier payment.");
        }
        await this.fxCarryingBalanceService?.applySettlement(organizationId, plan.carryingBasis, {
          transactionAmount: plan.calculated.transactionAmount,
          carryingBaseAmount: plan.calculated.documentBaseAmount,
          sourceBaseAmount: plan.calculated.sourceBaseAmount!,
        }, tx);

        const createdAllocation = await tx.supplierPaymentAllocation.create({
          data: {
            organization: { connect: { id: organizationId } },
            payment: { connect: { organizationId_id: { organizationId, id: created.id } } },
            bill: { connect: { organizationId_id: { organizationId, id: plan.allocation.billId } } },
            amountApplied: plan.calculated.documentBaseAmount,
            transactionAmountApplied: plan.calculated.transactionAmount,
            documentBaseAmountApplied: plan.calculated.documentBaseAmount,
            sourceBaseAmountApplied: plan.calculated.sourceBaseAmount!,
            settlementBaseAmountApplied: plan.calculated.settlementBaseAmount,
            recognitionRate: plan.recognitionRate,
            carryingRate: plan.carryingBasis.carryingRate,
            carryingRateSnapshot: plan.carryingBasis.carryingRateSnapshotId
              ? { connect: { organizationId_id: { organizationId, id: plan.carryingBasis.carryingRateSnapshotId } } }
              : undefined,
            carryingRevaluationLine: plan.carryingBasis.carryingRevaluationLineId
              ? { connect: { organizationId_id: { organizationId, id: plan.carryingBasis.carryingRevaluationLineId } } }
              : undefined,
            settlementRate: String(fx.exchangeRate),
            realizedGainAmount: plan.calculated.realizedGainAmount,
            realizedLossAmount: plan.calculated.realizedLossAmount,
            realizedFxJournalEntry:
              toMoney(plan.calculated.realizedGainAmount).gt(0) || toMoney(plan.calculated.realizedLossAmount).gt(0)
                ? { connect: { organizationId_id: { organizationId, id: journalEntry.id } } }
                : undefined,
          },
        });
        const hasRealizedFx = toMoney(plan.calculated.realizedGainAmount).gt(0) || toMoney(plan.calculated.realizedLossAmount).gt(0);
        if (hasRealizedFx) {
          await this.auditLogService.log({
            organizationId,
            actorUserId,
            action: "POST",
            entityType: AUDIT_ENTITY_TYPES.REALIZED_FX_SETTLEMENT,
            entityId: createdAllocation.id,
            after: {
              paymentId: created.id,
              documentId: plan.allocation.billId,
              realizedGainAmount: plan.calculated.realizedGainAmount,
              realizedLossAmount: plan.calculated.realizedLossAmount,
              journalEntryId: journalEntry.id,
            },
          }, tx);
        }
      }

      if (isForeignDocumentFxContext(fx)) {
        await this.auditLogService.log({
          organizationId,
          actorUserId,
          action: "FREEZE_FX_RATE",
          entityType: AUDIT_ENTITY_TYPES.SUPPLIER_PAYMENT,
          entityId: created.id,
          after: {
            ...documentFxAuditEvidence(fx),
            journalEntryId: journalEntry.id,
            paymentNumber,
          },
        }, tx);
      }

      return tx.supplierPayment.findUniqueOrThrow({ where: { id: created.id }, include: supplierPaymentInclude });
    });

    await this.auditLogService.log({ organizationId, actorUserId, action: "CREATE", entityType: "SupplierPayment", entityId: payment.id, after: payment });
    return payment;
  }

  async applyUnapplied(organizationId: string, actorUserId: string, id: string, dto: ApplyUnappliedSupplierPaymentDto) {
    const amountApplied = this.assertPositiveMoney(dto.amountApplied, "Amount applied");
    const existing = await this.get(organizationId, id);

    const updated = await this.prisma.$transaction(async (tx) => {
      const idempotencyKey = this.cleanOptional(dto.idempotencyKey);
      if (idempotencyKey) {
        const prior = await tx.supplierPaymentUnappliedAllocation.findUnique({
          where: { organizationId_idempotencyKey: { organizationId, idempotencyKey } },
        });
        if (prior) {
          if (
            prior.paymentId !== id || prior.billId !== dto.billId || prior.reversedAt ||
            !toMoney(prior.transactionAmountApplied).eq(amountApplied)
          ) {
            throw new BadRequestException("Idempotency key was already used for a different supplier payment allocation.");
          }
          return tx.supplierPayment.findUniqueOrThrow({ where: { id }, include: supplierPaymentInclude });
        }
      }
      const payment = await tx.supplierPayment.findFirst({
        where: { id, organizationId },
        select: {
          id: true,
          supplierId: true,
          currency: true,
          baseCurrency: true,
          exchangeRate: true,
          paymentNumber: true,
          status: true,
          amountPaid: true,
          unappliedAmount: true,
          transactionAmountPaid: true,
          transactionUnappliedAmount: true,
        },
      });
      if (!payment) {
        throw new NotFoundException("Supplier payment not found.");
      }
      if (payment.status !== SupplierPaymentStatus.POSTED) {
        throw new BadRequestException("Only posted supplier payments can have unapplied amounts allocated.");
      }
      if (amountApplied.gt(payment.transactionUnappliedAmount ?? payment.unappliedAmount)) {
        throw new BadRequestException("Amount applied cannot exceed the supplier payment unapplied amount.");
      }

      const bill = await tx.purchaseBill.findFirst({
        where: { id: dto.billId, organizationId },
        select: {
          id: true, billNumber: true, supplierId: true, currency: true, baseCurrency: true, exchangeRate: true, rateSnapshotId: true,
          status: true, total: true, balanceDue: true, transactionTotal: true, transactionBalanceDue: true,
        },
      });
      if (!bill) {
        throw new BadRequestException("Purchase bill must belong to this organization.");
      }
      if (bill.supplierId !== payment.supplierId) {
        throw new BadRequestException("Supplier payment and bill must belong to the same supplier.");
      }
      if (bill.currency !== payment.currency || (bill.baseCurrency ?? bill.currency) !== (payment.baseCurrency ?? payment.currency)) {
        throw new BadRequestException("Supplier payment and bill transaction/base currencies must match.");
      }
      if (bill.status !== PurchaseBillStatus.FINALIZED) {
        throw new BadRequestException("Supplier payment unapplied amounts can only be applied to finalized, non-voided bills.");
      }
      if (amountApplied.gt(bill.transactionBalanceDue ?? bill.balanceDue)) {
        throw new BadRequestException("Amount applied cannot exceed bill balance due.");
      }

      const recognitionRate = String(bill.exchangeRate ?? "1");
      const settlementRate = String(payment.exchangeRate ?? "1");
      const carryingBasis = await this.resolveCarryingBasis(organizationId, bill, tx);
      const calculated = allocateForeignSettlement({
        direction: "SUPPLIER", transactionAmount: amountApplied.toFixed(4),
        transactionOpenAmount: String(bill.transactionBalanceDue ?? bill.balanceDue), baseOpenAmount: carryingBasis.carryingBaseOpenAmount,
        sourceBaseOpenAmount: carryingBasis.sourceBaseOpenAmount,
        recognitionRate, settlementRate,
        settlementTransactionOpenAmount: String(payment.transactionUnappliedAmount ?? payment.unappliedAmount),
        settlementBaseOpenAmount: String(payment.unappliedAmount),
        useProportionalCarryingBasis: carryingBasis.useProportionalCarryingBasis,
      });
      const fxAccounts = await this.resolveRealizedFxAccounts(
        organizationId, calculated.realizedGainAmount, calculated.realizedLossAmount, tx,
      );
      const hasRealizedFx = toMoney(calculated.realizedGainAmount).gt(0) || toMoney(calculated.realizedLossAmount).gt(0);
      const accountsPayableAccount = hasRealizedFx ? await this.findPostingAccountByCode(organizationId, "210", tx) : { id: "" };
      const adjustmentDate = new Date();
      if (hasRealizedFx) await this.assertPostingDateAllowed(organizationId, adjustmentDate, tx);
      const paymentClaim = await tx.supplierPayment.updateMany({
        where: {
          id,
          organizationId,
          status: SupplierPaymentStatus.POSTED,
          unappliedAmount: { gte: calculated.settlementBaseAmount },
          transactionUnappliedAmount: { gte: calculated.transactionAmount },
        },
        data: {
          unappliedAmount: { decrement: calculated.settlementBaseAmount },
          transactionUnappliedAmount: { decrement: calculated.transactionAmount },
        },
      });
      if (paymentClaim.count !== 1) {
        throw new BadRequestException("Supplier payment unapplied amount is no longer sufficient.");
      }

      const billClaim = await tx.purchaseBill.updateMany({
        where: {
          id: dto.billId,
          organizationId,
          supplierId: payment.supplierId,
          status: PurchaseBillStatus.FINALIZED,
          balanceDue: { gte: calculated.sourceBaseAmount! },
          transactionBalanceDue: { gte: calculated.transactionAmount },
        },
        data: {
          balanceDue: { decrement: calculated.sourceBaseAmount! },
          transactionBalanceDue: { decrement: calculated.transactionAmount },
        },
      });
      if (billClaim.count !== 1) {
        throw new BadRequestException("Bill balance due is no longer sufficient.");
      }
      await this.fxCarryingBalanceService?.applySettlement(organizationId, carryingBasis, {
        transactionAmount: calculated.transactionAmount,
        carryingBaseAmount: calculated.documentBaseAmount,
        sourceBaseAmount: calculated.sourceBaseAmount!,
      }, tx);

      const realizedFxJournalEntryId = await this.createRealizedFxAdjustmentJournal({
        organizationId, actorUserId,
        reference: `${payment.paymentNumber ?? id}/${bill.billNumber ?? dto.billId}`,
        baseCurrency: payment.baseCurrency ?? payment.currency,
        clearingAccountId: accountsPayableAccount.id,
        realizedGainAccountId: fxAccounts.realizedGainAccountId,
        realizedLossAccountId: fxAccounts.realizedLossAccountId,
        realizedGainAmount: calculated.realizedGainAmount,
        realizedLossAmount: calculated.realizedLossAmount,
        adjustmentDate,
      }, tx);
      const createdAllocation = await tx.supplierPaymentUnappliedAllocation.create({
        data: {
          organization: { connect: { id: organizationId } },
          payment: { connect: { organizationId_id: { organizationId, id } } },
          bill: { connect: { organizationId_id: { organizationId, id: dto.billId } } },
          amountApplied: calculated.documentBaseAmount,
          transactionAmountApplied: calculated.transactionAmount,
          documentBaseAmountApplied: calculated.documentBaseAmount,
          sourceBaseAmountApplied: calculated.sourceBaseAmount!,
          settlementBaseAmountApplied: calculated.settlementBaseAmount,
          recognitionRate,
          carryingRate: carryingBasis.carryingRate,
          carryingRateSnapshot: carryingBasis.carryingRateSnapshotId
            ? { connect: { organizationId_id: { organizationId, id: carryingBasis.carryingRateSnapshotId } } }
            : undefined,
          carryingRevaluationLine: carryingBasis.carryingRevaluationLineId
            ? { connect: { organizationId_id: { organizationId, id: carryingBasis.carryingRevaluationLineId } } }
            : undefined,
          settlementRate,
          realizedGainAmount: calculated.realizedGainAmount,
          realizedLossAmount: calculated.realizedLossAmount,
          realizedFxJournalEntry: realizedFxJournalEntryId
            ? { connect: { organizationId_id: { organizationId, id: realizedFxJournalEntryId } } }
            : undefined,
          idempotencyKey,
        },
      });
      if (realizedFxJournalEntryId) {
        await this.auditLogService.log({
          organizationId,
          actorUserId,
          action: "POST",
          entityType: AUDIT_ENTITY_TYPES.REALIZED_FX_SETTLEMENT,
          entityId: createdAllocation.id,
          after: {
            paymentId: id,
            documentId: dto.billId,
            realizedGainAmount: calculated.realizedGainAmount,
            realizedLossAmount: calculated.realizedLossAmount,
            journalEntryId: realizedFxJournalEntryId,
          },
        }, tx);
      }
      return tx.supplierPayment.findUniqueOrThrow({ where: { id }, include: supplierPaymentInclude });
    });

    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: "APPLY_UNAPPLIED",
      entityType: "SupplierPayment",
      entityId: id,
      before: existing,
      after: updated,
    });
    return updated;
  }

  async reverseUnappliedAllocation(
    organizationId: string,
    actorUserId: string,
    id: string,
    allocationId: string,
    dto: ReverseUnappliedSupplierPaymentAllocationDto,
  ) {
    const updated = await this.prisma.$transaction(async (tx) => {
      const allocation = await tx.supplierPaymentUnappliedAllocation.findFirst({
        where: { id: allocationId, organizationId, paymentId: id },
        include: {
          payment: { select: { id: true, status: true, amountPaid: true, unappliedAmount: true, transactionAmountPaid: true, transactionUnappliedAmount: true } },
          bill: { select: { id: true, status: true, total: true, balanceDue: true, transactionTotal: true, transactionBalanceDue: true, exchangeRate: true, rateSnapshotId: true } },
        },
      });
      if (!allocation) {
        throw new NotFoundException("Supplier payment unapplied allocation not found.");
      }
      if (allocation.reversedAt) {
        if (dto.idempotencyKey && allocation.reversalIdempotencyKey === this.cleanOptional(dto.idempotencyKey)) {
          return tx.supplierPayment.findUniqueOrThrow({ where: { id }, include: supplierPaymentInclude });
        }
        throw new BadRequestException("Supplier payment unapplied allocation has already been reversed.");
      }
      if (allocation.payment.status !== SupplierPaymentStatus.POSTED) {
        throw new BadRequestException("Only posted, non-voided supplier payments can have unapplied allocations reversed.");
      }
      if (allocation.bill.status !== PurchaseBillStatus.FINALIZED) {
        throw new BadRequestException("Only finalized, non-voided bills can have supplier payment unapplied allocations reversed.");
      }

      const documentBaseAmount = toMoney(allocation.documentBaseAmountApplied ?? allocation.amountApplied).toFixed(4);
      const sourceBaseAmount = toMoney(allocation.sourceBaseAmountApplied ?? allocation.documentBaseAmountApplied ?? allocation.amountApplied).toFixed(4);
      const settlementBaseAmount = toMoney(allocation.settlementBaseAmountApplied ?? allocation.amountApplied).toFixed(4);
      const transactionAmount = toMoney(allocation.transactionAmountApplied ?? allocation.amountApplied).toFixed(4);
      const paymentUnappliedLimit = toMoney(allocation.payment.amountPaid).minus(settlementBaseAmount).toFixed(4);
      const paymentTransactionUnappliedLimit = toMoney(allocation.payment.transactionAmountPaid ?? allocation.payment.amountPaid)
        .minus(transactionAmount).toFixed(4);
      const billBalanceLimit = toMoney(allocation.bill.total).minus(sourceBaseAmount).toFixed(4);
      const billTransactionBalanceLimit = toMoney(allocation.bill.transactionTotal ?? allocation.bill.total)
        .minus(transactionAmount).toFixed(4);

      if (toMoney(allocation.payment.unappliedAmount).gt(paymentUnappliedLimit)) {
        throw new BadRequestException("Supplier payment unapplied amount cannot exceed amount paid after reversal.");
      }
      if (toMoney(allocation.bill.balanceDue).gt(billBalanceLimit)) {
        throw new BadRequestException("Bill balance due cannot exceed bill total after reversal.");
      }
      if (toMoney(allocation.payment.transactionUnappliedAmount ?? allocation.payment.unappliedAmount).gt(paymentTransactionUnappliedLimit)) {
        throw new BadRequestException("Supplier payment transaction unapplied amount cannot exceed transaction amount paid after reversal.");
      }
      if (toMoney(allocation.bill.transactionBalanceDue ?? allocation.bill.balanceDue).gt(billTransactionBalanceLimit)) {
        throw new BadRequestException("Bill transaction balance due cannot exceed transaction total after reversal.");
      }

      const now = new Date();
      const carryingBasis = await this.resolveCarryingBasis(organizationId, allocation.bill, tx);
      this.assertAllocationCarryingLine(allocation.carryingRevaluationLineId, carryingBasis);
      const claim = await tx.supplierPaymentUnappliedAllocation.updateMany({
        where: { id: allocationId, paymentId: id, organizationId, reversedAt: null },
        data: {
          reversedAt: now,
          reversedById: actorUserId,
          reversalReason: this.cleanOptional(dto.reason) ?? null,
          reversalIdempotencyKey: this.cleanOptional(dto.idempotencyKey) ?? null,
        },
      });
      if (claim.count !== 1) {
        throw new BadRequestException("Supplier payment unapplied allocation has already been reversed.");
      }

      let realizedFxReversalJournalEntryId: string | null = null;
      if (allocation.realizedFxJournalEntryId) {
        await this.assertPostingDateAllowed(organizationId, now, tx);
        realizedFxReversalJournalEntryId = await this.reverseRealizedFxAdjustmentJournal(
          organizationId, actorUserId, allocation.realizedFxJournalEntryId, now, tx,
        );
      }

      const paymentRestore = await tx.supplierPayment.updateMany({
        where: {
          id,
          organizationId,
          status: SupplierPaymentStatus.POSTED,
          unappliedAmount: { lte: paymentUnappliedLimit },
          transactionUnappliedAmount: { lte: paymentTransactionUnappliedLimit },
        },
        data: {
          unappliedAmount: { increment: settlementBaseAmount },
          transactionUnappliedAmount: { increment: transactionAmount },
        },
      });
      if (paymentRestore.count !== 1) {
        throw new BadRequestException("Supplier payment unapplied amount could not be restored without exceeding amount paid.");
      }

      const billRestore = await tx.purchaseBill.updateMany({
        where: {
          id: allocation.billId,
          organizationId,
          status: PurchaseBillStatus.FINALIZED,
          balanceDue: { lte: billBalanceLimit },
          transactionBalanceDue: { lte: billTransactionBalanceLimit },
        },
        data: {
          balanceDue: { increment: sourceBaseAmount },
          transactionBalanceDue: { increment: transactionAmount },
        },
      });
      if (billRestore.count !== 1) {
        throw new BadRequestException("Bill balance due could not be restored without exceeding bill total.");
      }
      await this.fxCarryingBalanceService?.restoreSettlement(organizationId, carryingBasis, {
        transactionAmount,
        carryingBaseAmount: documentBaseAmount,
        sourceBaseAmount,
      }, tx);

      if (realizedFxReversalJournalEntryId) {
        await tx.supplierPaymentUnappliedAllocation.update({
          where: { id: allocationId },
          data: {
            realizedFxReversalJournalEntry: {
              connect: { organizationId_id: { organizationId, id: realizedFxReversalJournalEntryId } },
            },
          },
        });
        await this.auditLogService.log({
          organizationId,
          actorUserId,
          action: "REVERSE",
          entityType: AUDIT_ENTITY_TYPES.REALIZED_FX_SETTLEMENT,
          entityId: allocationId,
          after: {
            paymentId: id,
            documentId: allocation.billId,
            journalEntryId: realizedFxReversalJournalEntryId,
            reversedJournalEntryId: allocation.realizedFxJournalEntryId,
          },
        }, tx);
      }
      return tx.supplierPayment.findUniqueOrThrow({ where: { id }, include: supplierPaymentInclude });
    });

    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: "REVERSE_UNAPPLIED_ALLOCATION",
      entityType: "SupplierPaymentUnappliedAllocation",
      entityId: allocationId,
      after: updated,
    });

    return updated;
  }

  async void(organizationId: string, actorUserId: string, id: string) {
    const existing = await this.get(organizationId, id);
    if (existing.status === SupplierPaymentStatus.VOIDED) {
      return existing;
    }

    const voided = await this.prisma.$transaction(async (tx) => {
      const payment = await tx.supplierPayment.findFirst({
        where: { id, organizationId },
        include: {
          allocations: {
            include: {
              bill: { select: { id: true, status: true, total: true, balanceDue: true, transactionTotal: true, transactionBalanceDue: true, exchangeRate: true, rateSnapshotId: true } },
            },
          },
        },
      });
      if (!payment) {
        throw new NotFoundException("Supplier payment not found.");
      }
      if (payment.status === SupplierPaymentStatus.VOIDED) {
        return tx.supplierPayment.findUniqueOrThrow({ where: { id }, include: supplierPaymentInclude });
      }
      if (payment.status !== SupplierPaymentStatus.POSTED) {
        throw new BadRequestException("Only posted supplier payments can be voided.");
      }
      if (!payment.journalEntryId) {
        throw new BadRequestException("Posted supplier payment is missing its journal entry.");
      }
      const reversalDate = new Date();
      await this.assertPostingDateAllowed(organizationId, reversalDate, tx);

      const activeUnappliedAllocationCount = await tx.supplierPaymentUnappliedAllocation.count({
        where: { organizationId, paymentId: id, reversedAt: null },
      });
      if (activeUnappliedAllocationCount > 0) {
        throw new BadRequestException("Cannot void supplier payment with active unapplied allocations. Reverse allocations first.");
      }

      const activeRefundCount = await tx.supplierRefund.count({
        where: { organizationId, sourcePaymentId: id, status: SupplierRefundStatus.POSTED },
      });
      if (activeRefundCount > 0) {
        throw new BadRequestException("Cannot void supplier payment with posted supplier refunds. Void refunds first.");
      }

      const claim = await tx.supplierPayment.updateMany({
        where: { id, organizationId, status: SupplierPaymentStatus.POSTED },
        data: { status: SupplierPaymentStatus.VOIDED, voidedAt: new Date() },
      });
      if (claim.count !== 1) {
        return tx.supplierPayment.findUniqueOrThrow({ where: { id }, include: supplierPaymentInclude });
      }

      for (const allocation of payment.allocations) {
        if (allocation.bill.status !== PurchaseBillStatus.FINALIZED) {
          throw new BadRequestException("Supplier payment can only be voided while allocated bills are finalized.");
        }
        const amount = toMoney(allocation.documentBaseAmountApplied ?? allocation.amountApplied).toFixed(4);
        const sourceBaseAmount = toMoney(allocation.sourceBaseAmountApplied ?? allocation.documentBaseAmountApplied ?? allocation.amountApplied).toFixed(4);
        const transactionAmount = toMoney(allocation.transactionAmountApplied ?? allocation.amountApplied).toFixed(4);
        const balanceLimit = toMoney(allocation.bill.total).minus(sourceBaseAmount).toFixed(4);
        const transactionBalanceLimit = toMoney(allocation.bill.transactionTotal ?? allocation.bill.total).minus(transactionAmount).toFixed(4);
        const carryingBasis = await this.resolveCarryingBasis(organizationId, allocation.bill, tx);
        this.assertAllocationCarryingLine(allocation.carryingRevaluationLineId, carryingBasis);
        const restore = await tx.purchaseBill.updateMany({
          where: {
            id: allocation.billId,
            organizationId,
            status: PurchaseBillStatus.FINALIZED,
            balanceDue: { lte: balanceLimit },
            transactionBalanceDue: { lte: transactionBalanceLimit },
          },
          data: {
            balanceDue: { increment: sourceBaseAmount },
            transactionBalanceDue: { increment: transactionAmount },
          },
        });
        if (restore.count !== 1) {
          throw new BadRequestException("Bill balance due could not be restored without exceeding bill total.");
        }
        await this.fxCarryingBalanceService?.restoreSettlement(organizationId, carryingBasis, {
          transactionAmount,
          carryingBaseAmount: amount,
          sourceBaseAmount,
        }, tx);
      }

      const reversalJournalEntryId = await this.createOrReuseReversalJournal(organizationId, actorUserId, payment.journalEntryId, reversalDate, tx);
      for (const allocation of payment.allocations) {
        const hasRealizedFx = toMoney(allocation.realizedGainAmount).gt(0) || toMoney(allocation.realizedLossAmount).gt(0);
        if (!hasRealizedFx || !allocation.realizedFxJournalEntryId) continue;
        await this.auditLogService.log({
          organizationId,
          actorUserId,
          action: "REVERSE",
          entityType: AUDIT_ENTITY_TYPES.REALIZED_FX_SETTLEMENT,
          entityId: allocation.id,
          after: {
            paymentId: id,
            documentId: allocation.billId,
            journalEntryId: reversalJournalEntryId,
            reversedJournalEntryId: allocation.realizedFxJournalEntryId,
            realizedGainAmount: moneyString(allocation.realizedGainAmount),
            realizedLossAmount: moneyString(allocation.realizedLossAmount),
          },
        }, tx);
      }
      return tx.supplierPayment.update({
        where: { id },
        data: { voidReversalJournalEntryId: reversalJournalEntryId },
        include: supplierPaymentInclude,
      });
    });

    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: "VOID",
      entityType: "SupplierPayment",
      entityId: id,
      before: existing,
      after: voided,
    });
    return voided;
  }

  async remove(organizationId: string, actorUserId: string, id: string) {
    const existing = await this.get(organizationId, id);
    if (existing.status !== SupplierPaymentStatus.DRAFT || existing.journalEntryId) {
      throw new BadRequestException("Only draft supplier payments without journal entries can be deleted.");
    }

    await this.prisma.supplierPayment.delete({ where: { id } });
    await this.auditLogService.log({ organizationId, actorUserId, action: "DELETE", entityType: "SupplierPayment", entityId: id, before: existing });
    return { deleted: true };
  }

  private async validateBillsForAllocation(
    organizationId: string,
    supplierId: string,
    paymentCurrency: string,
    paymentBaseCurrency: string,
    allocations: SupplierPaymentAllocationDto[],
    tx: Prisma.TransactionClient,
  ) {
    if (allocations.length === 0) {
      return [];
    }

    const billIds = allocations.map((allocation) => allocation.billId);
    if (new Set(billIds).size !== billIds.length) {
      throw new BadRequestException("Each purchase bill can appear only once in a supplier payment.");
    }

    const bills = await tx.purchaseBill.findMany({
      where: { organizationId, id: { in: billIds } },
      select: {
        id: true, supplierId: true, currency: true, baseCurrency: true, status: true,
        balanceDue: true, transactionBalanceDue: true, exchangeRate: true,
        rateDate: true, rateSource: true, rateSnapshotId: true,
      },
    });
    if (bills.length !== billIds.length) {
      throw new BadRequestException("Supplier payment bills must belong to this organization.");
    }

    const billById = new Map(bills.map((bill) => [bill.id, bill]));
    for (const allocation of allocations) {
      const bill = billById.get(allocation.billId);
      const amount = toMoney(allocation.amountApplied);
      if (amount.lte(0)) {
        throw new BadRequestException("Supplier payment allocation amounts must be greater than zero.");
      }
      if (!bill) {
        throw new BadRequestException("Supplier payment bills must belong to this organization.");
      }
      if (bill.supplierId !== supplierId) {
        throw new BadRequestException("Supplier payment bills must belong to the same supplier.");
      }
      if (bill.currency !== paymentCurrency || (bill.baseCurrency ?? bill.currency) !== paymentBaseCurrency) {
        throw new BadRequestException(
          "Supplier payment and bill transaction/base currencies must match.",
        );
      }
      if (bill.status !== PurchaseBillStatus.FINALIZED) {
        throw new BadRequestException("Supplier payments can only be allocated to finalized, non-voided bills.");
      }
      if (amount.gt(bill.transactionBalanceDue ?? bill.balanceDue)) {
        throw new BadRequestException("Supplier payment allocation cannot exceed bill balance due.");
      }
    }
    return bills;
  }

  private assertAllocations(allocations: SupplierPaymentAllocationDto[]): void {
    for (const allocation of allocations) {
      this.assertPositiveMoney(allocation.amountApplied, "Allocation amount");
    }
  }

  private assertPositiveMoney(value: string, label: string) {
    const amount = toMoney(value);
    if (amount.lte(0)) {
      throw new BadRequestException(`${label} must be greater than zero.`);
    }
    return amount;
  }

  private async resolveCarryingBasis(
    organizationId: string,
    bill: {
      id: string;
      transactionBalanceDue: Prisma.Decimal | string;
      balanceDue: Prisma.Decimal | string;
      exchangeRate: Prisma.Decimal | string | null;
      rateSnapshotId: string | null;
    },
    tx: Prisma.TransactionClient,
  ): Promise<FxCarryingSettlementBasis> {
    if (this.fxCarryingBalanceService) {
      return this.fxCarryingBalanceService.resolveSupplierBasis(organizationId, bill, tx);
    }
    return {
      monetaryBalanceId: null,
      carryingBaseOpenAmount: toMoney(bill.balanceDue).toFixed(4),
      sourceBaseOpenAmount: toMoney(bill.balanceDue).toFixed(4),
      carryingRate: new Prisma.Decimal(String(bill.exchangeRate ?? "1")).toFixed(8),
      carryingRateSnapshotId: bill.rateSnapshotId,
      carryingRevaluationLineId: null,
      useProportionalCarryingBasis: false,
    };
  }

  private assertAllocationCarryingLine(expectedLineId: string | null | undefined, basis: FxCarryingSettlementBasis) {
    if ((expectedLineId ?? null) !== basis.carryingRevaluationLineId) {
      throw new BadRequestException("FX carrying basis changed after this allocation. Reverse the later revaluation first.");
    }
  }

  private async findPostingAccountByCode(organizationId: string, code: string, executor: PrismaExecutor) {
    const account = await executor.account.findFirst({
      where: { organizationId, code, isActive: true, allowPosting: true },
      select: { id: true },
    });
    if (!account) {
      throw new BadRequestException(`Required posting account ${code} was not found.`);
    }
    return account;
  }

  private async resolvePaymentFxContext(
    organizationId: string,
    dto: CreateSupplierPaymentDto,
    tx: Prisma.TransactionClient,
  ): Promise<ResolvedDocumentFxContext> {
    if (this.documentFxContextService) {
      return this.documentFxContextService.resolve(organizationId, {
        currency: dto.currency, documentDate: dto.paymentDate, exchangeRate: dto.exchangeRate,
        rateDate: dto.rateDate, rateSource: dto.rateSource, rateSnapshotId: dto.rateSnapshotId,
      }, tx);
    }
    const guardedCurrency = await this.baseCurrencyPostingGuardService?.assertPostingAllowed(organizationId, dto.currency, tx);
    const currency = guardedCurrency ?? (dto.currency === undefined
      ? await resolveOrganizationBaseCurrency(organizationId, tx)
      : dto.currency.toUpperCase());
    return {
      currency, baseCurrency: currency, exchangeRate: new Prisma.Decimal(1),
      rateDate: new Date(dto.paymentDate), rateSource: CurrencyRateSource.SYSTEM_RATE_1, rateSnapshotId: null,
    };
  }

  private async resolveRealizedFxAccounts(
    organizationId: string,
    realizedGainAmount: string,
    realizedLossAmount: string,
    tx: Prisma.TransactionClient,
  ): Promise<{ realizedGainAccountId: string | null; realizedLossAccountId: string | null }> {
    if (toMoney(realizedGainAmount).eq(0) && toMoney(realizedLossAmount).eq(0)) {
      return { realizedGainAccountId: null, realizedLossAccountId: null };
    }
    const configuration = await tx.fxAccountConfiguration.findUnique({
      where: { organizationId }, select: { realizedGainAccountId: true, realizedLossAccountId: true },
    });
    const required = [
      ...(toMoney(realizedGainAmount).gt(0) ? [{ id: configuration?.realizedGainAccountId, type: AccountType.REVENUE, label: "gain" }] : []),
      ...(toMoney(realizedLossAmount).gt(0) ? [{ id: configuration?.realizedLossAccountId, type: AccountType.EXPENSE, label: "loss" }] : []),
    ];
    for (const account of required) {
      if (!account.id || !(await tx.account.findFirst({
        where: { id: account.id, organizationId, type: account.type, isActive: true, allowPosting: true }, select: { id: true },
      }))) {
        throw new BadRequestException(`Configure an active posting account for realized FX ${account.label} before posting this payment.`);
      }
    }
    return {
      realizedGainAccountId: configuration?.realizedGainAccountId ?? null,
      realizedLossAccountId: configuration?.realizedLossAccountId ?? null,
    };
  }

  private async createRealizedFxAdjustmentJournal(
    input: {
      organizationId: string; actorUserId: string; reference: string; baseCurrency: string; clearingAccountId: string;
      realizedGainAccountId: string | null; realizedLossAccountId: string | null;
      realizedGainAmount: string; realizedLossAmount: string; adjustmentDate: Date;
    },
    tx: Prisma.TransactionClient,
  ): Promise<string | null> {
    if (toMoney(input.realizedGainAmount).eq(0) && toMoney(input.realizedLossAmount).eq(0)) return null;
    const lines = buildRealizedFxAdjustmentJournalLines(input);
    const totals = getJournalTotals(lines);
    const journal = await tx.journalEntry.create({ data: {
      organizationId: input.organizationId,
      entryNumber: await this.numberSequenceService.next(input.organizationId, NumberSequenceScope.JOURNAL_ENTRY, tx),
      status: JournalEntryStatus.POSTED, entryDate: input.adjustmentDate,
      description: `Realized FX adjustment ${input.reference}`, reference: input.reference,
      currency: input.baseCurrency, totalDebit: totals.debit, totalCredit: totals.credit,
      postedAt: input.adjustmentDate, postedById: input.actorUserId, createdById: input.actorUserId,
      lines: { create: this.toJournalLineCreateMany(input.organizationId, lines) },
    } });
    return journal.id;
  }

  private async reverseRealizedFxAdjustmentJournal(
    organizationId: string, actorUserId: string, journalEntryId: string, reversalDate: Date, tx: Prisma.TransactionClient,
  ): Promise<string> {
    const journalEntry = await tx.journalEntry.findFirst({
      where: { id: journalEntryId, organizationId },
      include: { lines: { orderBy: { lineNumber: "asc" } }, reversedBy: { select: { id: true } } },
    });
    if (!journalEntry) throw new NotFoundException("Realized FX adjustment journal not found.");
    if (journalEntry.reversedBy) return journalEntry.reversedBy.id;
    const reversalLines = createReversalLines(journalEntry.lines.map((line) => ({
      accountId: line.accountId, debit: String(line.debit), credit: String(line.credit),
      transactionDebit: line.transactionDebit == null ? undefined : String(line.transactionDebit),
      transactionCredit: line.transactionCredit == null ? undefined : String(line.transactionCredit),
      description: line.description ?? undefined, currency: line.currency, exchangeRate: String(line.exchangeRate),
      rateSnapshotId: line.rateSnapshotId, fxRoundingComponentCount: line.fxRoundingComponentCount,
      functionalCurrencyOnly: line.functionalCurrencyOnly, taxRateId: line.taxRateId,
    })));
    const totals = getJournalTotals(reversalLines);
    const reversal = await tx.journalEntry.create({ data: {
      organizationId, entryNumber: await this.numberSequenceService.next(organizationId, NumberSequenceScope.JOURNAL_ENTRY, tx),
      status: JournalEntryStatus.POSTED, entryDate: reversalDate,
      description: `Reversal of realized FX adjustment ${journalEntry.entryNumber}`, reference: journalEntry.reference,
      currency: journalEntry.currency, totalDebit: totals.debit, totalCredit: totals.credit,
      postedAt: reversalDate, postedById: actorUserId, createdById: actorUserId, reversalOfId: journalEntry.id,
      lines: { create: this.toJournalLineCreateMany(organizationId, reversalLines) },
    } });
    await tx.journalEntry.update({ where: { id: journalEntry.id }, data: { status: JournalEntryStatus.REVERSED } });
    return reversal.id;
  }

  private async createOrReuseReversalJournal(
    organizationId: string,
    actorUserId: string,
    journalEntryId: string,
    reversalDate: Date,
    tx: Prisma.TransactionClient,
  ): Promise<string> {
    const journalEntry = await tx.journalEntry.findFirst({
      where: { id: journalEntryId, organizationId },
      include: {
        lines: { orderBy: { createdAt: "asc" } },
        reversedBy: { select: { id: true } },
      },
    });
    if (!journalEntry) {
      throw new NotFoundException("Journal entry not found.");
    }
    if (journalEntry.reversedBy) {
      return journalEntry.reversedBy.id;
    }

    const reversalLines = createReversalLines(
      journalEntry.lines.map((line) => ({
        accountId: line.accountId,
        debit: String(line.debit),
        credit: String(line.credit),
        description: `Reversal: ${line.description ?? journalEntry.description ?? ""}`.trim(),
        currency: line.currency,
        exchangeRate: String(line.exchangeRate),
        transactionDebit: line.transactionDebit == null ? undefined : String(line.transactionDebit),
        transactionCredit: line.transactionCredit == null ? undefined : String(line.transactionCredit),
        rateSnapshotId: line.rateSnapshotId ?? null,
        fxRoundingComponentCount: line.fxRoundingComponentCount ?? 1,
        functionalCurrencyOnly: line.functionalCurrencyOnly ?? false,
        taxRateId: line.taxRateId,
      })),
    );
    const totals = getJournalTotals(reversalLines);
    const entryNumber = await this.numberSequenceService.next(organizationId, NumberSequenceScope.JOURNAL_ENTRY, tx);

    try {
      const reversal = await tx.journalEntry.create({
        data: {
          organizationId,
          entryNumber,
          status: JournalEntryStatus.POSTED,
          entryDate: reversalDate,
          description: `Reversal of ${journalEntry.entryNumber}`,
          reference: journalEntry.reference,
          currency: journalEntry.currency,
          totalDebit: totals.debit,
          totalCredit: totals.credit,
          postedAt: reversalDate,
          postedById: actorUserId,
          createdById: actorUserId,
          reversalOfId: journalEntry.id,
          lines: { create: this.toJournalLineCreateMany(organizationId, reversalLines) },
        },
      });
      await tx.journalEntry.update({
        where: { id: journalEntry.id },
        data: { status: JournalEntryStatus.REVERSED },
      });
      return reversal.id;
    } catch (error) {
      if (!isUniqueConstraintError(error)) {
        throw error;
      }
      throw new BadRequestException("Journal entry has already been reversed.");
    }
  }

  private toJournalLineCreateMany(organizationId: string, lines: JournalLineInput[]): Prisma.JournalLineCreateWithoutJournalEntryInput[] {
    return lines.map((line, index) => ({
      organization: { connect: { id: organizationId } },
      account: { connect: { id: line.accountId } },
      lineNumber: index + 1,
      description: line.description,
      debit: String(line.debit),
      credit: String(line.credit),
      currency: line.currency,
      exchangeRate: line.exchangeRate === undefined ? "1" : String(line.exchangeRate),
      transactionDebit: line.transactionDebit === undefined ? undefined : String(line.transactionDebit),
      transactionCredit: line.transactionCredit === undefined ? undefined : String(line.transactionCredit),
      rateSnapshot: line.rateSnapshotId ? { connect: { organizationId_id: { organizationId, id: line.rateSnapshotId } } } : undefined,
      fxRoundingComponentCount: line.fxRoundingComponentCount ?? 1,
      functionalCurrencyOnly: line.functionalCurrencyOnly ?? false,
    }));
  }

  private cleanOptional(value: string | undefined): string | undefined {
    const trimmed = value?.trim();
    return trimmed || undefined;
  }

  private requestFingerprint(value: unknown): string {
    return createHash("sha256").update(stableJson(value)).digest("hex");
  }

  private async assertPostingDateAllowed(organizationId: string, postingDate: string | Date, tx?: Prisma.TransactionClient): Promise<void> {
    await this.fiscalPeriodGuardService?.assertPostingDateAllowed(organizationId, postingDate, tx);
  }
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2002"
  );
}

function moneyString(value: unknown): string {
  return String(value ?? "0");
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map((item) => stableJson(item)).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableJson(entry)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}
