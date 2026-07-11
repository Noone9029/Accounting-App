import { BadRequestException, ConflictException, Injectable, InternalServerErrorException, NotFoundException, Optional } from "@nestjs/common";
import { createHash } from "node:crypto";
import {
  allocateForeignSettlement,
  convertTransactionToBaseAmount,
  createReversalLines,
  getJournalTotals,
  JournalLineInput,
  toMoney,
} from "@ledgerbyte/accounting-core";
import { PaymentReceiptPdfData, renderPaymentReceiptPdf } from "@ledgerbyte/pdf-core";
import {
  AccountType,
  ContactType,
  CustomerPaymentStatus,
  CurrencyRateSource,
  CustomerRefundStatus,
  DocumentType,
  JournalEntryStatus,
  NumberSequenceScope,
  Prisma,
  SalesInvoiceStatus,
} from "@prisma/client";
import { AUDIT_ENTITY_TYPES, AUDIT_EVENTS } from "../audit-log/audit-events";
import { AuditLogService } from "../audit-log/audit-log.service";
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
import { OrganizationDocumentSettingsService } from "../document-settings/organization-document-settings.service";
import { PrismaService } from "../prisma/prisma.service";
import { buildCustomerPaymentJournalLines } from "./customer-payment-accounting";
import { ApplyUnappliedPaymentDto } from "./dto/apply-unapplied-payment.dto";
import { CreateCustomerPaymentDto } from "./dto/create-customer-payment.dto";
import { ReverseUnappliedPaymentAllocationDto } from "./dto/reverse-unapplied-payment-allocation.dto";

const customerPaymentInclude = {
  customer: { select: { id: true, name: true, displayName: true, type: true } },
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
      invoice: {
        select: {
          id: true,
          invoiceNumber: true,
          issueDate: true,
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
      invoice: {
        select: {
          id: true,
          invoiceNumber: true,
          issueDate: true,
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

const CUSTOMER_PAYMENT_MUTATION_ERRORS = {
  PAYMENT_NOT_FOUND: "Customer payment not found.",
  INVOICE_NOT_FOUND: "Sales invoice not found.",
  CUSTOMER_MISMATCH: "Customer payment and invoice must belong to the same customer.",
  INVOICE_NOT_FINALIZED: "Unapplied customer payments can only be applied to finalized invoices.",
  AMOUNT_EXCEEDS_UNAPPLIED: "Amount applied cannot exceed customer payment unapplied amount.",
  AMOUNT_EXCEEDS_INVOICE_BALANCE: "Amount applied cannot exceed invoice balance due.",
  ALLOCATION_NOT_FOUND: "Customer payment unapplied allocation not found.",
  ALLOCATION_ALREADY_REVERSED: "Customer payment unapplied allocation has already been reversed.",
  PAYMENT_VOIDED: "Voided customer payments cannot have unapplied allocation changes.",
} as const;

@Injectable()
export class CustomerPaymentService {
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

  list(organizationId: string, branchId?: string) {
    const targetBranchId = cleanOptionalFilterId(branchId);
    return this.prisma.customerPayment.findMany({
      where: {
        organizationId,
        ...(targetBranchId
          ? {
              OR: [
                { allocations: { some: { organizationId, invoice: { is: { organizationId, branchId: targetBranchId } } } } },
                { unappliedAllocations: { some: { organizationId, invoice: { is: { organizationId, branchId: targetBranchId } } } } },
              ],
            }
          : {}),
      },
      orderBy: { paymentDate: "desc" },
      include: {
        customer: { select: { id: true, name: true, displayName: true } },
        account: { select: { id: true, code: true, name: true } },
        journalEntry: { select: { id: true, entryNumber: true, status: true } },
        voidReversalJournalEntry: { select: { id: true, entryNumber: true, status: true } },
      },
    });
  }

  async get(organizationId: string, id: string) {
    const payment = await this.prisma.customerPayment.findFirst({
      where: { id, organizationId },
      include: customerPaymentInclude,
    });

    if (!payment) {
      throw new NotFoundException(CUSTOMER_PAYMENT_MUTATION_ERRORS.PAYMENT_NOT_FOUND);
    }

    return payment;
  }

  async listUnappliedAllocations(organizationId: string, id: string) {
    const payment = await this.prisma.customerPayment.findFirst({
      where: { id, organizationId },
      select: { id: true },
    });
    if (!payment) {
      throw new NotFoundException(CUSTOMER_PAYMENT_MUTATION_ERRORS.PAYMENT_NOT_FOUND);
    }

    return this.prisma.customerPaymentUnappliedAllocation.findMany({
      where: { organizationId, paymentId: id },
      orderBy: { createdAt: "asc" },
      include: {
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            issueDate: true,
            total: true,
            balanceDue: true,
            status: true,
          },
        },
        reversedBy: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async listUnappliedAllocationsForInvoice(organizationId: string, invoiceId: string) {
    const invoice = await this.prisma.salesInvoice.findFirst({
      where: { id: invoiceId, organizationId },
      select: { id: true },
    });
    if (!invoice) {
      throw new NotFoundException("Sales invoice not found.");
    }

    return this.prisma.customerPaymentUnappliedAllocation.findMany({
      where: { organizationId, invoiceId },
      orderBy: { createdAt: "asc" },
      include: {
        payment: {
          select: {
            id: true,
            paymentNumber: true,
            paymentDate: true,
            currency: true,
            status: true,
            amountReceived: true,
            unappliedAmount: true,
          },
        },
        reversedBy: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async applyUnapplied(organizationId: string, actorUserId: string, id: string, dto: ApplyUnappliedPaymentDto) {
    const amountApplied = this.assertPositiveMoney(dto.amountApplied, "Amount applied");
    const existing = await this.get(organizationId, id);

    const updated = await this.prisma.$transaction(async (tx) => {
      const idempotencyKey = this.cleanOptional(dto.idempotencyKey);
      if (idempotencyKey) {
        const prior = await tx.customerPaymentUnappliedAllocation.findUnique({
          where: { organizationId_idempotencyKey: { organizationId, idempotencyKey } },
        });
        if (prior) {
          if (
            prior.paymentId !== id || prior.invoiceId !== dto.invoiceId || prior.reversedAt ||
            !toMoney(prior.transactionAmountApplied).eq(amountApplied)
          ) {
            throw new BadRequestException("Idempotency key was already used for a different customer payment allocation.");
          }
          return tx.customerPayment.findUniqueOrThrow({ where: { id }, include: customerPaymentInclude });
        }
      }
      const payment = await tx.customerPayment.findFirst({
        where: { id, organizationId },
        select: {
          id: true,
          customerId: true,
          currency: true,
          baseCurrency: true,
          exchangeRate: true,
          rateSnapshotId: true,
          paymentNumber: true,
          status: true,
          amountReceived: true,
          unappliedAmount: true,
          transactionAmountReceived: true,
          transactionUnappliedAmount: true,
          voidReversalJournalEntryId: true,
        },
      });
      if (!payment) {
        throw new NotFoundException(CUSTOMER_PAYMENT_MUTATION_ERRORS.PAYMENT_NOT_FOUND);
      }
      if (payment.status === CustomerPaymentStatus.VOIDED) {
        throw new BadRequestException(CUSTOMER_PAYMENT_MUTATION_ERRORS.PAYMENT_VOIDED);
      }
      if (payment.voidReversalJournalEntryId) {
        throw new BadRequestException(CUSTOMER_PAYMENT_MUTATION_ERRORS.PAYMENT_VOIDED);
      }
      if (payment.status !== CustomerPaymentStatus.POSTED) {
        throw new BadRequestException(
          `Only posted customer payments can have unapplied amounts applied to invoices. Current payment status: ${payment.status}.`,
        );
      }
      if (amountApplied.gt(payment.transactionUnappliedAmount ?? payment.unappliedAmount)) {
        throw new BadRequestException(CUSTOMER_PAYMENT_MUTATION_ERRORS.AMOUNT_EXCEEDS_UNAPPLIED);
      }

      const invoice = await tx.salesInvoice.findFirst({
        where: { id: dto.invoiceId, organizationId },
        select: {
          id: true,
          customerId: true,
          currency: true,
          baseCurrency: true,
          exchangeRate: true,
          rateSnapshotId: true,
          invoiceNumber: true,
          status: true,
          balanceDue: true,
          transactionBalanceDue: true,
        },
      });
      if (!invoice) {
        throw new NotFoundException(CUSTOMER_PAYMENT_MUTATION_ERRORS.INVOICE_NOT_FOUND);
      }
      if (invoice.customerId !== payment.customerId) {
        throw new BadRequestException(CUSTOMER_PAYMENT_MUTATION_ERRORS.CUSTOMER_MISMATCH);
      }
      if (invoice.currency !== payment.currency || (invoice.baseCurrency ?? invoice.currency) !== (payment.baseCurrency ?? payment.currency)) {
        throw new BadRequestException("Customer payment and invoice transaction/base currencies must match.");
      }
      if (invoice.status !== SalesInvoiceStatus.FINALIZED) {
        throw new BadRequestException(CUSTOMER_PAYMENT_MUTATION_ERRORS.INVOICE_NOT_FINALIZED);
      }
      if (amountApplied.gt(invoice.transactionBalanceDue ?? invoice.balanceDue)) {
        throw new BadRequestException(CUSTOMER_PAYMENT_MUTATION_ERRORS.AMOUNT_EXCEEDS_INVOICE_BALANCE);
      }

      const recognitionRate = String(invoice.exchangeRate ?? "1");
      const settlementRate = String(payment.exchangeRate ?? "1");
      const carryingBasis = await this.resolveCarryingBasis(organizationId, invoice, tx);
      const calculated = allocateForeignSettlement({
        direction: "CUSTOMER",
        transactionAmount: amountApplied.toFixed(4),
        transactionOpenAmount: String(invoice.transactionBalanceDue ?? invoice.balanceDue),
        baseOpenAmount: carryingBasis.carryingBaseOpenAmount,
        sourceBaseOpenAmount: carryingBasis.sourceBaseOpenAmount,
        recognitionRate,
        settlementRate,
        settlementTransactionOpenAmount: String(payment.transactionUnappliedAmount ?? payment.unappliedAmount),
        settlementBaseOpenAmount: String(payment.unappliedAmount),
        useProportionalCarryingBasis: carryingBasis.useProportionalCarryingBasis,
      });
      const fxAccounts = await this.resolveRealizedFxAccounts(
        organizationId, calculated.realizedGainAmount, calculated.realizedLossAmount, tx,
      );
      const hasRealizedFx = toMoney(calculated.realizedGainAmount).gt(0) || toMoney(calculated.realizedLossAmount).gt(0);
      const accountsReceivableAccount = hasRealizedFx
        ? await this.findPostingAccountByCode(organizationId, "120", tx)
        : { id: "" };
      const adjustmentDate = new Date();
      if (hasRealizedFx) {
        await this.assertPostingDateAllowed(organizationId, adjustmentDate, tx);
      }
      const paymentClaim = await tx.customerPayment.updateMany({
        where: {
          id,
          organizationId,
          status: CustomerPaymentStatus.POSTED,
          voidReversalJournalEntryId: null,
          unappliedAmount: { gte: calculated.settlementBaseAmount },
          transactionUnappliedAmount: { gte: calculated.transactionAmount },
        },
        data: {
          unappliedAmount: { decrement: calculated.settlementBaseAmount },
          transactionUnappliedAmount: { decrement: calculated.transactionAmount },
        },
      });
      if (paymentClaim.count !== 1) {
        throw new BadRequestException(CUSTOMER_PAYMENT_MUTATION_ERRORS.AMOUNT_EXCEEDS_UNAPPLIED);
      }

      const invoiceClaim = await tx.salesInvoice.updateMany({
        where: {
          id: dto.invoiceId,
          organizationId,
          customerId: payment.customerId,
          status: SalesInvoiceStatus.FINALIZED,
          balanceDue: { gte: calculated.sourceBaseAmount! },
          transactionBalanceDue: { gte: calculated.transactionAmount },
        },
        data: {
          balanceDue: { decrement: calculated.sourceBaseAmount! },
          transactionBalanceDue: { decrement: calculated.transactionAmount },
        },
      });
      if (invoiceClaim.count !== 1) {
        throw new BadRequestException(CUSTOMER_PAYMENT_MUTATION_ERRORS.AMOUNT_EXCEEDS_INVOICE_BALANCE);
      }
      await this.fxCarryingBalanceService?.applySettlement(organizationId, carryingBasis, {
        transactionAmount: calculated.transactionAmount,
        carryingBaseAmount: calculated.documentBaseAmount,
        sourceBaseAmount: calculated.sourceBaseAmount!,
      }, tx);

      const realizedFxJournalEntryId = await this.createRealizedFxAdjustmentJournal({
        organizationId,
        actorUserId,
        reference: `${payment.paymentNumber ?? id}/${invoice.invoiceNumber ?? dto.invoiceId}`,
        baseCurrency: payment.baseCurrency ?? payment.currency,
        clearingAccountId: accountsReceivableAccount.id,
        realizedGainAccountId: fxAccounts.realizedGainAccountId,
        realizedLossAccountId: fxAccounts.realizedLossAccountId,
        realizedGainAmount: calculated.realizedGainAmount,
        realizedLossAmount: calculated.realizedLossAmount,
        adjustmentDate,
      }, tx);

      const createdAllocation = await tx.customerPaymentUnappliedAllocation.create({
        data: {
          organization: { connect: { id: organizationId } },
          payment: { connect: { organizationId_id: { organizationId, id } } },
          invoice: { connect: { organizationId_id: { organizationId, id: dto.invoiceId } } },
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
            documentId: dto.invoiceId,
            realizedGainAmount: calculated.realizedGainAmount,
            realizedLossAmount: calculated.realizedLossAmount,
            journalEntryId: realizedFxJournalEntryId,
          },
        }, tx);
      }

      return tx.customerPayment.findUniqueOrThrow({ where: { id }, include: customerPaymentInclude });
    });

    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: AUDIT_EVENTS.CUSTOMER_PAYMENT_UNAPPLIED_APPLIED,
      entityType: AUDIT_ENTITY_TYPES.CUSTOMER_PAYMENT,
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
    dto: ReverseUnappliedPaymentAllocationDto,
  ) {
    const updated = await this.prisma.$transaction(async (tx) => {
      const allocation = await tx.customerPaymentUnappliedAllocation.findFirst({
        where: { id: allocationId, paymentId: id, organizationId },
        include: {
          payment: {
            select: {
              id: true,
              status: true,
              amountReceived: true,
              unappliedAmount: true,
              transactionAmountReceived: true,
              transactionUnappliedAmount: true,
              voidReversalJournalEntryId: true,
            },
          },
          invoice: {
            select: {
              id: true,
              status: true,
              total: true,
              balanceDue: true,
              transactionTotal: true,
              transactionBalanceDue: true,
              exchangeRate: true,
              rateSnapshotId: true,
            },
          },
        },
      });

      if (!allocation) {
        throw new NotFoundException(CUSTOMER_PAYMENT_MUTATION_ERRORS.ALLOCATION_NOT_FOUND);
      }
      if (allocation.reversedAt) {
        if (dto.idempotencyKey && allocation.reversalIdempotencyKey === this.cleanOptional(dto.idempotencyKey)) {
          return tx.customerPayment.findUniqueOrThrow({ where: { id }, include: customerPaymentInclude });
        }
        throw new BadRequestException(CUSTOMER_PAYMENT_MUTATION_ERRORS.ALLOCATION_ALREADY_REVERSED);
      }
      if (allocation.payment.status === CustomerPaymentStatus.VOIDED) {
        throw new BadRequestException(CUSTOMER_PAYMENT_MUTATION_ERRORS.PAYMENT_VOIDED);
      }
      if (allocation.payment.voidReversalJournalEntryId) {
        throw new BadRequestException(CUSTOMER_PAYMENT_MUTATION_ERRORS.PAYMENT_VOIDED);
      }
      if (allocation.payment.status !== CustomerPaymentStatus.POSTED) {
        throw new BadRequestException("Only posted, non-voided customer payments can have unapplied allocations reversed.");
      }
      if (allocation.invoice.status !== SalesInvoiceStatus.FINALIZED) {
        throw new BadRequestException("Only finalized, non-voided invoices can have unapplied payment allocations reversed.");
      }

      const documentBaseAmount = toMoney(allocation.documentBaseAmountApplied ?? allocation.amountApplied).toFixed(4);
      const sourceBaseAmount = toMoney(allocation.sourceBaseAmountApplied ?? allocation.documentBaseAmountApplied ?? allocation.amountApplied).toFixed(4);
      const settlementBaseAmount = toMoney(allocation.settlementBaseAmountApplied ?? allocation.amountApplied).toFixed(4);
      const transactionAmount = toMoney(allocation.transactionAmountApplied ?? allocation.amountApplied).toFixed(4);
      const paymentUnappliedLimit = toMoney(allocation.payment.amountReceived).minus(settlementBaseAmount).toFixed(4);
      const paymentTransactionUnappliedLimit = toMoney(allocation.payment.transactionAmountReceived ?? allocation.payment.amountReceived)
        .minus(transactionAmount).toFixed(4);
      const invoiceBalanceLimit = toMoney(allocation.invoice.total).minus(sourceBaseAmount).toFixed(4);
      const invoiceTransactionBalanceLimit = toMoney(allocation.invoice.transactionTotal ?? allocation.invoice.total)
        .minus(transactionAmount).toFixed(4);

      if (toMoney(allocation.payment.unappliedAmount).gt(paymentUnappliedLimit)) {
        throw new BadRequestException("Payment unapplied amount cannot exceed amount received after reversal.");
      }
      if (toMoney(allocation.invoice.balanceDue).gt(invoiceBalanceLimit)) {
        throw new BadRequestException("Invoice balance due cannot exceed invoice total after reversal.");
      }
      if (toMoney(allocation.payment.transactionUnappliedAmount ?? allocation.payment.unappliedAmount).gt(paymentTransactionUnappliedLimit)) {
        throw new BadRequestException("Payment transaction unapplied amount cannot exceed transaction amount received after reversal.");
      }
      if (toMoney(allocation.invoice.transactionBalanceDue ?? allocation.invoice.balanceDue).gt(invoiceTransactionBalanceLimit)) {
        throw new BadRequestException("Invoice transaction balance due cannot exceed transaction total after reversal.");
      }

      const now = new Date();
      const carryingBasis = await this.resolveCarryingBasis(organizationId, allocation.invoice, tx);
      this.assertAllocationCarryingLine(allocation.carryingRevaluationLineId, carryingBasis);
      const claim = await tx.customerPaymentUnappliedAllocation.updateMany({
        where: { id: allocationId, paymentId: id, organizationId, reversedAt: null },
        data: {
          reversedAt: now,
          reversedById: actorUserId,
          reversalReason: this.cleanOptional(dto.reason) ?? null,
          reversalIdempotencyKey: this.cleanOptional(dto.idempotencyKey) ?? null,
        },
      });
      if (claim.count !== 1) {
        throw new BadRequestException(CUSTOMER_PAYMENT_MUTATION_ERRORS.ALLOCATION_ALREADY_REVERSED);
      }

      let realizedFxReversalJournalEntryId: string | null = null;
      if (allocation.realizedFxJournalEntryId) {
        await this.assertPostingDateAllowed(organizationId, now, tx);
        realizedFxReversalJournalEntryId = await this.reverseRealizedFxAdjustmentJournal(
          organizationId, actorUserId, allocation.realizedFxJournalEntryId, now, tx,
        );
      }

      const paymentRestore = await tx.customerPayment.updateMany({
        where: {
          id,
          organizationId,
          status: CustomerPaymentStatus.POSTED,
          voidReversalJournalEntryId: null,
          unappliedAmount: { lte: paymentUnappliedLimit },
          transactionUnappliedAmount: { lte: paymentTransactionUnappliedLimit },
        },
        data: {
          unappliedAmount: { increment: settlementBaseAmount },
          transactionUnappliedAmount: { increment: transactionAmount },
        },
      });
      if (paymentRestore.count !== 1) {
        throw new BadRequestException("Payment unapplied amount could not be restored without exceeding amount received.");
      }

      const invoiceRestore = await tx.salesInvoice.updateMany({
        where: {
          id: allocation.invoiceId,
          organizationId,
          status: SalesInvoiceStatus.FINALIZED,
          balanceDue: { lte: invoiceBalanceLimit },
          transactionBalanceDue: { lte: invoiceTransactionBalanceLimit },
        },
        data: {
          balanceDue: { increment: sourceBaseAmount },
          transactionBalanceDue: { increment: transactionAmount },
        },
      });
      if (invoiceRestore.count !== 1) {
        throw new BadRequestException("Invoice balance due could not be restored without exceeding invoice total.");
      }
      await this.fxCarryingBalanceService?.restoreSettlement(organizationId, carryingBasis, {
        transactionAmount,
        carryingBaseAmount: documentBaseAmount,
        sourceBaseAmount,
      }, tx);

      if (realizedFxReversalJournalEntryId) {
        await tx.customerPaymentUnappliedAllocation.update({
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
            documentId: allocation.invoiceId,
            journalEntryId: realizedFxReversalJournalEntryId,
            reversedJournalEntryId: allocation.realizedFxJournalEntryId,
          },
        }, tx);
      }
      return tx.customerPayment.findUniqueOrThrow({ where: { id }, include: customerPaymentInclude });
    });

    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: AUDIT_EVENTS.CUSTOMER_PAYMENT_UNAPPLIED_ALLOCATION_REVERSED,
      entityType: AUDIT_ENTITY_TYPES.CUSTOMER_PAYMENT_UNAPPLIED_ALLOCATION,
      entityId: allocationId,
      after: updated,
    });

    return updated;
  }

  async receiptData(organizationId: string, id: string) {
    const payment = await this.prisma.customerPayment.findFirst({
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
        customer: {
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
            invoice: {
              select: {
                id: true,
                invoiceNumber: true,
                issueDate: true,
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
            invoice: {
              select: {
                id: true,
                invoiceNumber: true,
                issueDate: true,
                total: true,
                balanceDue: true,
                transactionTotal: true,
                transactionBalanceDue: true,
                status: true,
              },
            },
            reversedBy: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException("Customer payment not found.");
    }

    return {
      receiptNumber: payment.paymentNumber,
      paymentDate: payment.paymentDate,
      customer: payment.customer,
      organization: payment.organization,
      amountReceived: payment.transactionAmountReceived ?? payment.amountReceived,
      unappliedAmount: payment.transactionUnappliedAmount ?? payment.unappliedAmount,
      currency: payment.currency,
      paidThroughAccount: payment.account,
      allocations: payment.allocations.map((allocation) => ({
        invoiceId: allocation.invoiceId,
        invoiceNumber: allocation.invoice.invoiceNumber,
        invoiceDate: allocation.invoice.issueDate,
        invoiceTotal: allocation.invoice.transactionTotal ?? allocation.invoice.total,
        amountApplied: allocation.transactionAmountApplied ?? allocation.amountApplied,
        invoiceBalanceDue: allocation.invoice.transactionBalanceDue ?? allocation.invoice.balanceDue,
      })),
      unappliedAllocations: payment.unappliedAllocations.map((allocation) => ({
        id: allocation.id,
        invoiceId: allocation.invoiceId,
        invoiceNumber: allocation.invoice.invoiceNumber,
        invoiceDate: allocation.invoice.issueDate,
        invoiceTotal: allocation.invoice.transactionTotal ?? allocation.invoice.total,
        amountApplied: allocation.transactionAmountApplied ?? allocation.amountApplied,
        invoiceBalanceDue: allocation.invoice.transactionBalanceDue ?? allocation.invoice.balanceDue,
        status: allocation.reversedAt ? "Reversed" : "Active",
        reversedAt: allocation.reversedAt,
        reversalReason: allocation.reversalReason,
      })),
      journalEntry: payment.journalEntry,
      status: payment.status,
    };
  }

  async receiptPdfData(organizationId: string, id: string): Promise<PaymentReceiptPdfData> {
    const payment = await this.prisma.customerPayment.findFirst({
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
        customer: {
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
            invoice: {
              select: {
                id: true,
                invoiceNumber: true,
                issueDate: true,
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
            invoice: {
              select: {
                id: true,
                invoiceNumber: true,
                issueDate: true,
                total: true,
                balanceDue: true,
                transactionTotal: true,
                transactionBalanceDue: true,
                status: true,
              },
            },
            reversedBy: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException("Customer payment not found.");
    }

    return {
      organization: payment.organization,
      customer: payment.customer,
      payment: {
        id: payment.id,
        paymentNumber: payment.paymentNumber,
        paymentDate: payment.paymentDate,
        status: payment.status,
        currency: payment.currency,
        amountReceived: moneyString(payment.transactionAmountReceived ?? payment.amountReceived),
        unappliedAmount: moneyString(payment.transactionUnappliedAmount ?? payment.unappliedAmount),
        description: payment.description,
      },
      paidThroughAccount: payment.account,
      allocations: payment.allocations.map((allocation) => ({
        invoiceId: allocation.invoiceId,
        invoiceNumber: allocation.invoice.invoiceNumber,
        invoiceDate: allocation.invoice.issueDate,
        invoiceTotal: moneyString(allocation.invoice.transactionTotal ?? allocation.invoice.total),
        amountApplied: moneyString(allocation.transactionAmountApplied ?? allocation.amountApplied),
        invoiceBalanceDue: moneyString(allocation.invoice.transactionBalanceDue ?? allocation.invoice.balanceDue),
      })),
      unappliedAllocations: payment.unappliedAllocations.map((allocation) => ({
        invoiceId: allocation.invoiceId,
        invoiceNumber: allocation.invoice.invoiceNumber,
        invoiceDate: allocation.invoice.issueDate,
        invoiceTotal: moneyString(allocation.invoice.transactionTotal ?? allocation.invoice.total),
        amountApplied: moneyString(allocation.transactionAmountApplied ?? allocation.amountApplied),
        invoiceBalanceDue: moneyString(allocation.invoice.transactionBalanceDue ?? allocation.invoice.balanceDue),
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
  ): Promise<{ data: PaymentReceiptPdfData; buffer: Buffer; filename: string; document: unknown | null }> {
    const data = await this.receiptPdfData(organizationId, id);
    const settings = await this.documentSettingsService?.receiptRenderSettings(organizationId);
    const buffer = await renderPaymentReceiptPdf(data, settings);
    const filename = sanitizeFilename(`receipt-${data.payment.paymentNumber}.pdf`);
    const document = await this.generatedDocumentService?.archivePdf({
      organizationId,
      documentType: DocumentType.CUSTOMER_PAYMENT_RECEIPT,
      sourceType: "CustomerPayment",
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

  async create(organizationId: string, actorUserId: string, dto: CreateCustomerPaymentDto) {
    const transactionAmountReceived = this.assertPositiveMoney(dto.amountReceived, "Amount received");
    this.assertAllocations(dto.allocations);

    const totalAllocated = dto.allocations.reduce((sum, allocation) => sum.plus(allocation.amountApplied), toMoney(0));

    if (totalAllocated.gt(transactionAmountReceived)) {
      throw new BadRequestException("Total allocations cannot exceed amount received.");
    }

    const transactionUnappliedAmount = transactionAmountReceived.minus(totalAllocated).toFixed(4);
    const idempotencyKey = this.cleanOptional(dto.idempotencyKey);
    const requestHash = idempotencyKey ? this.requestFingerprint(dto) : null;
    if (idempotencyKey) {
      const prior = await this.prisma.customerPayment.findUnique({
        where: { organizationId_idempotencyKey: { organizationId, idempotencyKey } },
      });
      if (prior) {
        if (prior.requestHash !== requestHash) {
          throw new BadRequestException("Idempotency key was already used for a different customer payment request.");
        }
        return this.get(organizationId, prior.id);
      }
    }
    const payment = await this.prisma.$transaction(async (tx) => {
      const paymentDate = new Date(dto.paymentDate);
      await this.assertPostingDateAllowed(organizationId, paymentDate, tx);
      const fx = await this.resolvePaymentFxContext(organizationId, dto, tx);
      const [customer, paidThroughAccount] = await Promise.all([
        this.findCustomer(organizationId, dto.customerId, tx),
        this.findPaidThroughAccount(organizationId, dto.accountId, tx),
      ]);
      const invoices = await this.findAndValidateInvoices(organizationId, dto.customerId, fx.currency, fx.baseCurrency, dto.allocations, tx);
      const invoiceById = new Map(invoices.map((invoice) => [invoice.id, invoice]));
      const settlementBaseAmountReceived = convertTransactionToBaseAmount(transactionAmountReceived.toFixed(4), String(fx.exchangeRate));
      let settlementTransactionOpen = transactionAmountReceived;
      let settlementBaseOpen = toMoney(settlementBaseAmountReceived);
      const allocationPlans: Array<{
        allocation: CreateCustomerPaymentDto["allocations"][number];
        invoice: (typeof invoices)[number];
        recognitionRate: string;
        carryingBasis: FxCarryingSettlementBasis;
        calculated: ReturnType<typeof allocateForeignSettlement>;
      }> = [];
      for (const allocation of dto.allocations) {
        const invoice = invoiceById.get(allocation.invoiceId)!;
        const recognitionRate = String(invoice.exchangeRate ?? "1");
        assertStoredDocumentFxPostingContext({
          currency: invoice.currency,
          baseCurrency: invoice.baseCurrency ?? fx.baseCurrency,
          exchangeRate: recognitionRate,
          rateDate: invoice.rateDate ?? paymentDate,
          rateSource: invoice.rateSource ?? CurrencyRateSource.SYSTEM_RATE_1,
        });
        const carryingBasis = await this.resolveCarryingBasis(organizationId, invoice, tx);
        const calculated = allocateForeignSettlement({
          direction: "CUSTOMER",
          transactionAmount: allocation.amountApplied,
          transactionOpenAmount: String(invoice.transactionBalanceDue ?? invoice.balanceDue),
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
        allocationPlans.push({ allocation, invoice, recognitionRate, carryingBasis, calculated });
      }

      const realizedGainAmount = allocationPlans.reduce((sum, plan) => sum.plus(plan.calculated.realizedGainAmount), toMoney(0)).toFixed(4);
      const realizedLossAmount = allocationPlans.reduce((sum, plan) => sum.plus(plan.calculated.realizedLossAmount), toMoney(0)).toFixed(4);
      if (!settlementTransactionOpen.eq(transactionUnappliedAmount) || settlementBaseOpen.lt(0)) {
        throw new BadRequestException("Payment allocation components do not reconcile to the payment total.");
      }
      const fxAccounts = await this.resolveRealizedFxAccounts(organizationId, realizedGainAmount, realizedLossAmount, tx);
      const unappliedAmount = settlementBaseOpen.toFixed(4);

      // Conditional balance updates are the allocation concurrency boundary.
      // Both stored open balances must still cover the frozen allocation.
      for (const plan of allocationPlans) {
        const updatedInvoice = await tx.salesInvoice.updateMany({
          where: {
            id: plan.allocation.invoiceId,
            organizationId,
            customerId: dto.customerId,
            status: SalesInvoiceStatus.FINALIZED,
            balanceDue: { gte: plan.calculated.sourceBaseAmount! },
            transactionBalanceDue: { gte: plan.calculated.transactionAmount },
          },
          data: {
            balanceDue: { decrement: plan.calculated.sourceBaseAmount! },
            transactionBalanceDue: { decrement: plan.calculated.transactionAmount },
          },
        });
        if (updatedInvoice.count !== 1) {
          throw new BadRequestException("Allocation amount cannot exceed invoice balance due.");
        }
        await this.fxCarryingBalanceService?.applySettlement(organizationId, plan.carryingBasis, {
          transactionAmount: plan.calculated.transactionAmount,
          carryingBaseAmount: plan.calculated.documentBaseAmount,
          sourceBaseAmount: plan.calculated.sourceBaseAmount!,
        }, tx);
      }

      const paymentNumber = await this.numberSequenceService.next(organizationId, NumberSequenceScope.PAYMENT, tx);
      const accountsReceivableAccount = await this.findPostingAccountByCode(organizationId, "120", tx);
      const journalLines = buildCustomerPaymentJournalLines({
        paidThroughAccountId: paidThroughAccount.id,
        accountsReceivableAccountId: accountsReceivableAccount.id,
        paymentNumber,
        customerName: customer.displayName ?? customer.name,
        currency: fx.currency,
        baseCurrency: fx.baseCurrency,
        exchangeRate: String(fx.exchangeRate),
        rateSnapshotId: fx.rateSnapshotId,
        transactionAmountReceived: transactionAmountReceived.toFixed(4),
        settlementBaseAmountReceived,
        allocations: allocationPlans.map((plan) => ({
          transactionAmountApplied: plan.calculated.transactionAmount,
          documentBaseAmountApplied: plan.calculated.documentBaseAmount,
          recognitionRate: plan.recognitionRate,
          rateSnapshotId: plan.invoice.rateSnapshotId ?? null,
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
      const journalTotals = getJournalTotals(journalLines);

      const journalEntry = await tx.journalEntry.create({
        data: {
          organizationId,
          entryNumber: await this.numberSequenceService.next(organizationId, NumberSequenceScope.JOURNAL_ENTRY, tx),
          status: JournalEntryStatus.POSTED,
          entryDate: paymentDate,
          description: `Customer payment ${paymentNumber} - ${customer.displayName ?? customer.name}`,
          reference: paymentNumber,
          currency: fx.baseCurrency,
          totalDebit: journalTotals.debit,
          totalCredit: journalTotals.credit,
          postedAt: new Date(),
          postedById: actorUserId,
          createdById: actorUserId,
          lines: { create: this.toJournalLineCreateMany(organizationId, journalLines) },
        },
      });

      const created = await tx.customerPayment.create({
        data: {
          organizationId,
          paymentNumber,
          customerId: dto.customerId,
          paymentDate,
          currency: fx.currency,
          baseCurrency: fx.baseCurrency,
          exchangeRate: fx.exchangeRate,
          rateDate: fx.rateDate,
          rateSource: fx.rateSource,
          rateSnapshotId: fx.rateSnapshotId,
          status: CustomerPaymentStatus.POSTED,
          amountReceived: settlementBaseAmountReceived,
          unappliedAmount,
          transactionAmountReceived: transactionAmountReceived.toFixed(4),
          transactionUnappliedAmount,
          idempotencyKey,
          requestHash,
          description: this.cleanOptional(dto.description),
          accountId: dto.accountId,
          journalEntryId: journalEntry.id,
          createdById: actorUserId,
          postedAt: new Date(),
          allocations: {
            create: allocationPlans.map((plan) => ({
              organization: { connect: { id: organizationId } },
              invoice: { connect: { organizationId_id: { organizationId, id: plan.allocation.invoiceId } } },
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
              realizedFxJournalEntryId:
                toMoney(plan.calculated.realizedGainAmount).gt(0) || toMoney(plan.calculated.realizedLossAmount).gt(0)
                  ? journalEntry.id
                  : null,
            })),
          },
        },
        include: customerPaymentInclude,
      });

      if (!Array.isArray(created.allocations) || created.allocations.length !== allocationPlans.length) {
        throw new InternalServerErrorException("Created customer payment is missing allocation evidence required for FX audit.");
      }
      for (const allocation of created.allocations) {
        const hasRealizedFx = toMoney(allocation.realizedGainAmount).gt(0) || toMoney(allocation.realizedLossAmount).gt(0);
        if (!hasRealizedFx || !allocation.realizedFxJournalEntryId) continue;
        await this.auditLogService.log({
          organizationId,
          actorUserId,
          action: "POST",
          entityType: AUDIT_ENTITY_TYPES.REALIZED_FX_SETTLEMENT,
          entityId: allocation.id,
          after: {
            paymentId: created.id,
            documentId: allocation.invoiceId,
            realizedGainAmount: moneyString(allocation.realizedGainAmount),
            realizedLossAmount: moneyString(allocation.realizedLossAmount),
            journalEntryId: allocation.realizedFxJournalEntryId,
          },
        }, tx);
      }

      return created;
    });

    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: "CREATE",
      entityType: "CustomerPayment",
      entityId: payment.id,
      after: payment,
    });

    return payment;
  }

  async void(organizationId: string, actorUserId: string, id: string) {
    const existing = await this.get(organizationId, id);
    if (existing.status === CustomerPaymentStatus.VOIDED) {
      return existing;
    }

    if (existing.status !== CustomerPaymentStatus.POSTED || !existing.journalEntryId) {
      throw new BadRequestException("Only posted customer payments can be voided.");
    }

    const voided = await this.prisma.$transaction(async (tx) => {
      const payment = await tx.customerPayment.findFirst({
        where: { id, organizationId },
        include: {
          allocations: {
            include: {
              invoice: {
                select: {
                  id: true,
                  transactionBalanceDue: true,
                  balanceDue: true,
                  exchangeRate: true,
                  rateSnapshotId: true,
                },
              },
            },
          },
          journalEntry: {
            include: {
              lines: { orderBy: { lineNumber: "asc" } },
              reversedBy: { select: { id: true } },
            },
          },
        },
      });

      if (!payment) {
        throw new NotFoundException("Customer payment not found.");
      }
      if (payment.status === CustomerPaymentStatus.VOIDED) {
        return tx.customerPayment.findUniqueOrThrow({ where: { id }, include: customerPaymentInclude });
      }
      if (payment.status !== CustomerPaymentStatus.POSTED) {
        throw new BadRequestException("Only posted customer payments can be voided.");
      }

      const postedRefundCount = await tx.customerRefund.count({
        where: { organizationId, sourcePaymentId: id, status: CustomerRefundStatus.POSTED },
      });
      if (postedRefundCount > 0) {
        throw new BadRequestException("Cannot void customer payment with posted refunds. Void refunds first.");
      }

      const activeUnappliedAllocationCount = await tx.customerPaymentUnappliedAllocation.count({
        where: { organizationId, paymentId: id, reversedAt: null },
      });
      if (activeUnappliedAllocationCount > 0) {
        throw new BadRequestException("Cannot void customer payment with active unapplied allocations. Reverse unapplied allocations first.");
      }

      const journalEntry = payment.journalEntry;
      if (!journalEntry) {
        throw new BadRequestException("Customer payment has no journal entry to reverse.");
      }
      const reversalDate = new Date();
      await this.assertPostingDateAllowed(organizationId, reversalDate, tx);

      // Claim the payment before restoring invoice balances. A competing void
      // waits on this row update and then becomes a no-op.
      const claim = await tx.customerPayment.updateMany({
        where: { id, organizationId, status: CustomerPaymentStatus.POSTED },
        data: {
          status: CustomerPaymentStatus.VOIDED,
          voidedAt: new Date(),
        },
      });
      if (claim.count !== 1) {
        return tx.customerPayment.findUniqueOrThrow({ where: { id }, include: customerPaymentInclude });
      }

      const reversalJournalEntryId =
        journalEntry.reversedBy?.id ??
        (await this.createReversalJournal(
          organizationId,
          actorUserId,
          {
            paymentNumber: payment.paymentNumber,
            paymentDate: payment.paymentDate,
            currency: payment.baseCurrency ?? payment.currency,
            reversalDate,
            journalEntry,
          },
          tx,
        ));

      for (const allocation of payment.allocations) {
        const carryingBasis = this.fxCarryingBalanceService
          ? await this.resolveCarryingBasis(organizationId, allocation.invoice, tx)
          : this.legacyAllocationCarryingBasis(allocation);
        this.assertAllocationCarryingLine(allocation.carryingRevaluationLineId, carryingBasis);
        const sourceBaseAmount = String(allocation.sourceBaseAmountApplied ?? allocation.documentBaseAmountApplied ?? allocation.amountApplied);
        const restored = await tx.salesInvoice.updateMany({
          where: { id: allocation.invoiceId, organizationId, status: SalesInvoiceStatus.FINALIZED },
          data: {
            balanceDue: { increment: sourceBaseAmount },
            transactionBalanceDue: { increment: allocation.transactionAmountApplied ?? allocation.amountApplied },
          },
        });
        if (restored?.count !== undefined && restored.count !== 1) {
          throw new ConflictException("Invoice balance changed while voiding the payment.");
        }
        await this.fxCarryingBalanceService?.restoreSettlement(organizationId, carryingBasis, {
          transactionAmount: String(allocation.transactionAmountApplied ?? allocation.amountApplied),
          carryingBaseAmount: String(allocation.documentBaseAmountApplied ?? allocation.amountApplied),
          sourceBaseAmount,
        }, tx);
        const hasRealizedFx = toMoney(allocation.realizedGainAmount).gt(0) || toMoney(allocation.realizedLossAmount).gt(0);
        if (hasRealizedFx && allocation.realizedFxJournalEntryId) {
          await this.auditLogService.log({
            organizationId,
            actorUserId,
            action: "REVERSE",
            entityType: AUDIT_ENTITY_TYPES.REALIZED_FX_SETTLEMENT,
            entityId: allocation.id,
            after: {
              paymentId: id,
              documentId: allocation.invoiceId,
              journalEntryId: reversalJournalEntryId,
              reversedJournalEntryId: allocation.realizedFxJournalEntryId,
              realizedGainAmount: moneyString(allocation.realizedGainAmount),
              realizedLossAmount: moneyString(allocation.realizedLossAmount),
            },
          }, tx);
        }
      }

      return tx.customerPayment.update({
        where: { id },
        data: {
          voidReversalJournalEntryId: reversalJournalEntryId,
        },
        include: customerPaymentInclude,
      });
    });

    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: AUDIT_EVENTS.CUSTOMER_PAYMENT_VOIDED,
      entityType: AUDIT_ENTITY_TYPES.CUSTOMER_PAYMENT,
      entityId: id,
      before: existing,
      after: voided,
    });

    return voided;
  }

  async remove(organizationId: string, actorUserId: string, id: string) {
    const existing = await this.get(organizationId, id);
    if (existing.status !== CustomerPaymentStatus.DRAFT || existing.journalEntryId) {
      throw new BadRequestException("Only draft payments without journal entries can be deleted.");
    }

    await this.prisma.customerPayment.delete({ where: { id } });
    await this.auditLogService.log({ organizationId, actorUserId, action: "DELETE", entityType: "CustomerPayment", entityId: id, before: existing });
    return { deleted: true };
  }

  private async findCustomer(organizationId: string, customerId: string, executor: PrismaExecutor = this.prisma) {
    const customer = await executor.contact.findFirst({
      where: {
        id: customerId,
        organizationId,
        isActive: true,
        type: { in: [ContactType.CUSTOMER, ContactType.BOTH] },
      },
      select: { id: true, name: true, displayName: true },
    });

    if (!customer) {
      throw new BadRequestException("Customer must be an active customer contact in this organization.");
    }

    return customer;
  }

  private async findPaidThroughAccount(organizationId: string, accountId: string, executor: PrismaExecutor = this.prisma) {
    const account = await executor.account.findFirst({
      where: {
        id: accountId,
        organizationId,
        isActive: true,
        allowPosting: true,
        type: AccountType.ASSET,
      },
      select: { id: true },
    });

    if (!account) {
      throw new BadRequestException("Paid-through account must be an active posting asset account in this organization.");
    }

    return account;
  }

  private async findAndValidateInvoices(
    organizationId: string,
    customerId: string,
    paymentCurrency: string,
    paymentBaseCurrency: string,
    allocations: CreateCustomerPaymentDto["allocations"],
    executor: PrismaExecutor = this.prisma,
  ) {
    const invoiceIds = allocations.map((allocation) => allocation.invoiceId);
    if (new Set(invoiceIds).size !== invoiceIds.length) {
      throw new BadRequestException("Each invoice can only appear once in a payment.");
    }

    const invoices = await executor.salesInvoice.findMany({
      where: {
        organizationId,
        id: { in: invoiceIds },
        customerId,
        status: SalesInvoiceStatus.FINALIZED,
      },
      select: {
        id: true,
        balanceDue: true,
        transactionBalanceDue: true,
        currency: true,
        baseCurrency: true,
        exchangeRate: true,
        rateDate: true,
        rateSource: true,
        rateSnapshotId: true,
      },
    });

    if (invoices.length !== invoiceIds.length) {
      throw new BadRequestException("Allocations must reference finalized, non-voided invoices for the selected customer.");
    }

    const invoicesById = new Map(invoices.map((invoice) => [invoice.id, invoice]));
    for (const allocation of allocations) {
      const invoice = invoicesById.get(allocation.invoiceId);
      const amountApplied = this.assertPositiveMoney(allocation.amountApplied, "Allocation amount");
      if (invoice && (invoice.currency !== paymentCurrency || (invoice.baseCurrency ?? invoice.currency) !== paymentBaseCurrency)) {
        throw new BadRequestException(
          "Customer payment and invoice transaction/base currencies must match.",
        );
      }
      if (!invoice) {
        throw new BadRequestException("Allocation amount cannot exceed invoice balance due.");
      }
      const transactionBalanceDue = invoice.transactionBalanceDue ?? invoice.balanceDue;
      if (amountApplied.gt(transactionBalanceDue)) {
        throw new BadRequestException("Allocation amount cannot exceed invoice balance due.");
      }
    }

    return invoices;
  }

  private assertAllocations(allocations: CreateCustomerPaymentDto["allocations"]): void {
    if (allocations.length === 0) {
      throw new BadRequestException("At least one invoice allocation is required.");
    }

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
    invoice: {
      id: string;
      transactionBalanceDue: Prisma.Decimal | string;
      balanceDue: Prisma.Decimal | string;
      exchangeRate: Prisma.Decimal | string | null;
      rateSnapshotId: string | null;
    },
    tx: Prisma.TransactionClient,
  ): Promise<FxCarryingSettlementBasis> {
    if (this.fxCarryingBalanceService) {
      return this.fxCarryingBalanceService.resolveCustomerBasis(organizationId, invoice, tx);
    }
    return {
      monetaryBalanceId: null,
      carryingBaseOpenAmount: toMoney(invoice.balanceDue).toFixed(4),
      sourceBaseOpenAmount: toMoney(invoice.balanceDue).toFixed(4),
      carryingRate: new Prisma.Decimal(String(invoice.exchangeRate ?? "1")).toFixed(8),
      carryingRateSnapshotId: invoice.rateSnapshotId,
      carryingRevaluationLineId: null,
      useProportionalCarryingBasis: false,
    };
  }

  private assertAllocationCarryingLine(expectedLineId: string | null | undefined, basis: FxCarryingSettlementBasis) {
    if ((expectedLineId ?? null) !== basis.carryingRevaluationLineId) {
      throw new BadRequestException("FX carrying basis changed after this allocation. Reverse the later revaluation first.");
    }
  }

  private legacyAllocationCarryingBasis(allocation: {
    documentBaseAmountApplied?: Prisma.Decimal | string;
    amountApplied: Prisma.Decimal | string;
    recognitionRate?: Prisma.Decimal | string;
    carryingRate?: Prisma.Decimal | string;
    carryingRateSnapshotId?: string | null;
    carryingRevaluationLineId?: string | null;
  }): FxCarryingSettlementBasis {
    const carryingBase = String(allocation.documentBaseAmountApplied ?? allocation.amountApplied);
    return {
      monetaryBalanceId: null,
      carryingBaseOpenAmount: toMoney(carryingBase).toFixed(4),
      sourceBaseOpenAmount: toMoney(carryingBase).toFixed(4),
      carryingRate: new Prisma.Decimal(String(allocation.carryingRate ?? allocation.recognitionRate ?? "1")).toFixed(8),
      carryingRateSnapshotId: allocation.carryingRateSnapshotId ?? null,
      carryingRevaluationLineId: allocation.carryingRevaluationLineId ?? null,
      useProportionalCarryingBasis: false,
    };
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
    dto: CreateCustomerPaymentDto,
    tx: Prisma.TransactionClient,
  ): Promise<ResolvedDocumentFxContext> {
    if (this.documentFxContextService) {
      return this.documentFxContextService.resolve(organizationId, {
        currency: dto.currency,
        documentDate: dto.paymentDate,
        exchangeRate: dto.exchangeRate,
        rateDate: dto.rateDate,
        rateSource: dto.rateSource,
        rateSnapshotId: dto.rateSnapshotId,
      }, tx);
    }

    // Compatibility for isolated unit construction. The application module
    // always injects DocumentFxContextService before foreign posting is allowed.
    const guardedCurrency = await this.baseCurrencyPostingGuardService?.assertPostingAllowed(organizationId, dto.currency, tx);
    const currency = guardedCurrency ?? (dto.currency === undefined
      ? await resolveOrganizationBaseCurrency(organizationId, tx)
      : dto.currency.toUpperCase());
    const paymentDate = new Date(dto.paymentDate);
    return {
      currency,
      baseCurrency: currency,
      exchangeRate: new Prisma.Decimal(1),
      rateDate: paymentDate,
      rateSource: CurrencyRateSource.SYSTEM_RATE_1,
      rateSnapshotId: null,
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
      where: { organizationId },
      select: { realizedGainAccountId: true, realizedLossAccountId: true },
    });
    const required = [
      ...(toMoney(realizedGainAmount).gt(0) ? [{ id: configuration?.realizedGainAccountId, type: AccountType.REVENUE, label: "gain" }] : []),
      ...(toMoney(realizedLossAmount).gt(0) ? [{ id: configuration?.realizedLossAccountId, type: AccountType.EXPENSE, label: "loss" }] : []),
    ];
    for (const account of required) {
      if (!account.id || !(await tx.account.findFirst({
        where: { id: account.id, organizationId, type: account.type, isActive: true, allowPosting: true },
        select: { id: true },
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
      organizationId: string;
      actorUserId: string;
      reference: string;
      baseCurrency: string;
      clearingAccountId: string;
      realizedGainAccountId: string | null;
      realizedLossAccountId: string | null;
      realizedGainAmount: string;
      realizedLossAmount: string;
      adjustmentDate: Date;
    },
    tx: Prisma.TransactionClient,
  ): Promise<string | null> {
    if (toMoney(input.realizedGainAmount).eq(0) && toMoney(input.realizedLossAmount).eq(0)) return null;
    const lines = buildRealizedFxAdjustmentJournalLines(input);
    const totals = getJournalTotals(lines);
    const journal = await tx.journalEntry.create({
      data: {
        organizationId: input.organizationId,
        entryNumber: await this.numberSequenceService.next(input.organizationId, NumberSequenceScope.JOURNAL_ENTRY, tx),
        status: JournalEntryStatus.POSTED,
        entryDate: input.adjustmentDate,
        description: `Realized FX adjustment ${input.reference}`,
        reference: input.reference,
        currency: input.baseCurrency,
        totalDebit: totals.debit,
        totalCredit: totals.credit,
        postedAt: input.adjustmentDate,
        postedById: input.actorUserId,
        createdById: input.actorUserId,
        lines: { create: this.toJournalLineCreateMany(input.organizationId, lines) },
      },
    });
    return journal.id;
  }

  private async reverseRealizedFxAdjustmentJournal(
    organizationId: string,
    actorUserId: string,
    journalEntryId: string,
    reversalDate: Date,
    tx: Prisma.TransactionClient,
  ): Promise<string> {
    const journalEntry = await tx.journalEntry.findFirst({
      where: { id: journalEntryId, organizationId },
      include: { lines: { orderBy: { lineNumber: "asc" } }, reversedBy: { select: { id: true } } },
    });
    if (!journalEntry) throw new NotFoundException("Realized FX adjustment journal not found.");
    if (journalEntry.reversedBy) return journalEntry.reversedBy.id;
    const reversalLines = createReversalLines(journalEntry.lines.map((line) => ({
      accountId: line.accountId,
      debit: String(line.debit),
      credit: String(line.credit),
      transactionDebit: line.transactionDebit == null ? undefined : String(line.transactionDebit),
      transactionCredit: line.transactionCredit == null ? undefined : String(line.transactionCredit),
      description: line.description ?? undefined,
      currency: line.currency,
      exchangeRate: String(line.exchangeRate),
      rateSnapshotId: line.rateSnapshotId,
      fxRoundingComponentCount: line.fxRoundingComponentCount,
      functionalCurrencyOnly: line.functionalCurrencyOnly,
      taxRateId: line.taxRateId,
    })));
    const totals = getJournalTotals(reversalLines);
    const reversal = await tx.journalEntry.create({
      data: {
        organizationId,
        entryNumber: await this.numberSequenceService.next(organizationId, NumberSequenceScope.JOURNAL_ENTRY, tx),
        status: JournalEntryStatus.POSTED,
        entryDate: reversalDate,
        description: `Reversal of realized FX adjustment ${journalEntry.entryNumber}`,
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
    await tx.journalEntry.update({ where: { id: journalEntry.id }, data: { status: JournalEntryStatus.REVERSED } });
    return reversal.id;
  }

  private async createReversalJournal(
    organizationId: string,
    actorUserId: string,
    payment: {
      paymentNumber: string;
      paymentDate: Date;
      currency: string;
      reversalDate: Date;
      journalEntry: {
        id: string;
        entryNumber: string;
        description: string;
        lines: Array<{
          accountId: string;
          debit: Prisma.Decimal;
          credit: Prisma.Decimal;
          description: string | null;
          currency: string;
          exchangeRate: Prisma.Decimal;
          transactionDebit: Prisma.Decimal | null;
          transactionCredit: Prisma.Decimal | null;
          rateSnapshotId: string | null;
          fxRoundingComponentCount: number;
          functionalCurrencyOnly: boolean;
          taxRateId: string | null;
        }>;
      };
    },
    tx: Prisma.TransactionClient,
  ): Promise<string> {
    const reversalLines = createReversalLines(
      payment.journalEntry.lines.map((line) => ({
        accountId: line.accountId,
        debit: String(line.debit),
        credit: String(line.credit),
        description: line.description ?? undefined,
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
          entryDate: payment.reversalDate,
          description: `Void customer payment ${payment.paymentNumber}: ${payment.journalEntry.description}`,
          reference: payment.paymentNumber,
          currency: payment.currency,
          totalDebit: totals.debit,
          totalCredit: totals.credit,
          postedAt: payment.reversalDate,
          postedById: actorUserId,
          createdById: actorUserId,
          reversalOfId: payment.journalEntry.id,
          lines: { create: this.toJournalLineCreateMany(organizationId, reversalLines) },
        },
      });

      await tx.journalEntry.update({
        where: { id: payment.journalEntry.id },
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

function cleanOptionalFilterId(value?: string): string | undefined {
  const trimmed = value?.trim();
  return trimmed || undefined;
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
