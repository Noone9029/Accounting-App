import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { createReversalLines, getJournalTotals, JournalLineInput, toMoney } from "@ledgerbyte/accounting-core";
import { CustomerRefundPdfData, renderCustomerRefundPdf } from "@ledgerbyte/pdf-core";
import {
  AccountType,
  ContactType,
  CreditNoteStatus,
  CustomerPaymentStatus,
  CustomerRefundSourceType,
  CustomerRefundStatus,
  DocumentType,
  JournalEntryStatus,
  NumberSequenceScope,
  Prisma,
} from "@prisma/client";
import { AuditLogService } from "../audit-log/audit-log.service";
import { GeneratedDocumentService, sanitizeFilename } from "../generated-documents/generated-document.service";
import { NumberSequenceService } from "../number-sequences/number-sequence.service";
import { OrganizationDocumentSettingsService } from "../document-settings/organization-document-settings.service";
import { FiscalPeriodGuardService } from "../fiscal-periods/fiscal-period-guard.service";
import { PrismaService } from "../prisma/prisma.service";
import { buildCustomerRefundJournalLines } from "./customer-refund-accounting";
import { CreateCustomerRefundDto } from "./dto/create-customer-refund.dto";

const customerRefundInclude = {
  customer: { select: { id: true, name: true, displayName: true, type: true } },
  account: { select: { id: true, code: true, name: true, type: true } },
  sourcePayment: {
    select: {
      id: true,
      paymentNumber: true,
      paymentDate: true,
      status: true,
      amountReceived: true,
      unappliedAmount: true,
      currency: true,
    },
  },
  sourceCreditNote: {
    select: {
      id: true,
      creditNoteNumber: true,
      issueDate: true,
      status: true,
      total: true,
      unappliedAmount: true,
      currency: true,
    },
  },
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
};

type PrismaExecutor = PrismaService | Prisma.TransactionClient;

@Injectable()
export class CustomerRefundService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
    private readonly numberSequenceService: NumberSequenceService,
    private readonly documentSettingsService?: OrganizationDocumentSettingsService,
    private readonly generatedDocumentService?: GeneratedDocumentService,
    private readonly fiscalPeriodGuardService?: FiscalPeriodGuardService,
  ) {}

  list(organizationId: string) {
    return this.prisma.customerRefund.findMany({
      where: { organizationId },
      orderBy: { refundDate: "desc" },
      include: customerRefundInclude,
    });
  }

  async get(organizationId: string, id: string) {
    const refund = await this.prisma.customerRefund.findFirst({
      where: { id, organizationId },
      include: customerRefundInclude,
    });

    if (!refund) {
      throw new NotFoundException("Customer refund not found.");
    }

    return refund;
  }

  async refundableSources(organizationId: string, customerId: string) {
    if (!customerId) {
      throw new BadRequestException("customerId is required.");
    }
    const customer = await this.findCustomer(organizationId, customerId);
    const [payments, creditNotes] = await Promise.all([
      this.prisma.customerPayment.findMany({
        where: {
          organizationId,
          customerId,
          status: CustomerPaymentStatus.POSTED,
          unappliedAmount: { gt: "0.0000" },
        },
        orderBy: { paymentDate: "desc" },
        select: {
          id: true,
          paymentNumber: true,
          paymentDate: true,
          currency: true,
          status: true,
          amountReceived: true,
          unappliedAmount: true,
        },
      }),
      this.prisma.creditNote.findMany({
        where: {
          organizationId,
          customerId,
          status: CreditNoteStatus.FINALIZED,
          unappliedAmount: { gt: "0.0000" },
        },
        orderBy: { issueDate: "desc" },
        select: {
          id: true,
          creditNoteNumber: true,
          issueDate: true,
          currency: true,
          status: true,
          total: true,
          unappliedAmount: true,
        },
      }),
    ]);

    return { customer, payments, creditNotes };
  }

  async create(organizationId: string, actorUserId: string, dto: CreateCustomerRefundDto) {
    const amountRefunded = this.assertPositiveMoney(dto.amountRefunded, "Amount refunded");
    this.assertSourceShape(dto);

    const refund = await this.prisma.$transaction(async (tx) => {
      const refundDate = new Date(dto.refundDate);
      await this.assertPostingDateAllowed(organizationId, refundDate, tx);
      const customer = await this.findCustomer(organizationId, dto.customerId, tx);
      const paidFromAccount = await this.findPaidFromAccount(organizationId, dto.accountId, tx);
      const source = await this.claimRefundSource(organizationId, dto, amountRefunded.toFixed(4), tx);
      const currency = this.resolveCurrency(dto.currency, source.currency);
      const refundNumber = await this.numberSequenceService.next(organizationId, NumberSequenceScope.CUSTOMER_REFUND, tx);
      const accountsReceivableAccount = await this.findPostingAccountByCode(organizationId, "120", tx);
      const journalLines = buildCustomerRefundJournalLines({
        accountsReceivableAccountId: accountsReceivableAccount.id,
        paidFromAccountId: paidFromAccount.id,
        refundNumber,
        customerName: customer.displayName ?? customer.name,
        currency,
        amountRefunded: amountRefunded.toFixed(4),
      });

      const journalEntry = await tx.journalEntry.create({
        data: {
          organizationId,
          entryNumber: await this.numberSequenceService.next(organizationId, NumberSequenceScope.JOURNAL_ENTRY, tx),
          status: JournalEntryStatus.POSTED,
          entryDate: refundDate,
          description: `Customer refund ${refundNumber} - ${customer.displayName ?? customer.name}`,
          reference: refundNumber,
          currency,
          totalDebit: amountRefunded.toFixed(4),
          totalCredit: amountRefunded.toFixed(4),
          postedAt: new Date(),
          postedById: actorUserId,
          createdById: actorUserId,
          lines: { create: this.toJournalLineCreateMany(organizationId, journalLines) },
        },
      });

      return tx.customerRefund.create({
        data: {
          organizationId,
          refundNumber,
          customerId: dto.customerId,
          sourceType: dto.sourceType,
          sourcePaymentId: dto.sourceType === CustomerRefundSourceType.CUSTOMER_PAYMENT ? dto.sourcePaymentId : null,
          sourceCreditNoteId: dto.sourceType === CustomerRefundSourceType.CREDIT_NOTE ? dto.sourceCreditNoteId : null,
          refundDate,
          currency,
          status: CustomerRefundStatus.POSTED,
          amountRefunded: amountRefunded.toFixed(4),
          accountId: dto.accountId,
          description: this.cleanOptional(dto.description),
          journalEntryId: journalEntry.id,
          createdById: actorUserId,
          postedAt: new Date(),
        },
        include: customerRefundInclude,
      });
    });

    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: "CREATE",
      entityType: "CustomerRefund",
      entityId: refund.id,
      after: refund,
    });

    return refund;
  }

  async void(organizationId: string, actorUserId: string, id: string) {
    const existing = await this.get(organizationId, id);
    if (existing.status === CustomerRefundStatus.VOIDED) {
      return existing;
    }
    if (existing.status !== CustomerRefundStatus.POSTED || !existing.journalEntryId) {
      throw new BadRequestException("Only posted customer refunds can be voided.");
    }

    const voided = await this.prisma.$transaction(async (tx) => {
      const refund = await tx.customerRefund.findFirst({
        where: { id, organizationId },
        include: {
          sourcePayment: { select: { id: true, status: true, amountReceived: true, unappliedAmount: true } },
          sourceCreditNote: { select: { id: true, status: true, total: true, unappliedAmount: true } },
          journalEntry: {
            include: {
              lines: { orderBy: { lineNumber: "asc" } },
              reversedBy: { select: { id: true } },
            },
          },
        },
      });

      if (!refund) {
        throw new NotFoundException("Customer refund not found.");
      }
      if (refund.status === CustomerRefundStatus.VOIDED) {
        return tx.customerRefund.findUniqueOrThrow({ where: { id }, include: customerRefundInclude });
      }
      if (refund.status !== CustomerRefundStatus.POSTED) {
        throw new BadRequestException("Only posted customer refunds can be voided.");
      }
      if (!refund.journalEntry) {
        throw new BadRequestException("Customer refund has no journal entry to reverse.");
      }
      const reversalDate = new Date();
      await this.assertPostingDateAllowed(organizationId, reversalDate, tx);

      const claim = await tx.customerRefund.updateMany({
        where: { id, organizationId, status: CustomerRefundStatus.POSTED },
        data: {
          status: CustomerRefundStatus.VOIDED,
          voidedAt: new Date(),
        },
      });
      if (claim.count !== 1) {
        return tx.customerRefund.findUniqueOrThrow({ where: { id }, include: customerRefundInclude });
      }

      const reversalJournalEntryId =
        refund.journalEntry.reversedBy?.id ??
        (await this.createReversalJournal(
          organizationId,
          actorUserId,
          {
            refundNumber: refund.refundNumber,
            refundDate: refund.refundDate,
            currency: refund.currency,
            reversalDate,
            journalEntry: refund.journalEntry,
          },
          tx,
        ));

      await this.restoreRefundSource(organizationId, refund, tx);

      return tx.customerRefund.update({
        where: { id },
        data: { voidReversalJournalEntryId: reversalJournalEntryId },
        include: customerRefundInclude,
      });
    });

    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: "VOID",
      entityType: "CustomerRefund",
      entityId: id,
      before: existing,
      after: voided,
    });

    return voided;
  }

  async remove(organizationId: string, actorUserId: string, id: string) {
    const existing = await this.get(organizationId, id);
    if (existing.status !== CustomerRefundStatus.DRAFT || existing.journalEntryId) {
      throw new BadRequestException("Only draft refunds without journal entries can be deleted.");
    }

    await this.prisma.customerRefund.delete({ where: { id } });
    await this.auditLogService.log({ organizationId, actorUserId, action: "DELETE", entityType: "CustomerRefund", entityId: id, before: existing });
    return { deleted: true };
  }

  async pdfData(organizationId: string, id: string): Promise<CustomerRefundPdfData> {
    const refund = await this.prisma.customerRefund.findFirst({
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
        sourcePayment: {
          select: {
            id: true,
            paymentNumber: true,
            paymentDate: true,
            status: true,
            amountReceived: true,
            unappliedAmount: true,
          },
        },
        sourceCreditNote: {
          select: {
            id: true,
            creditNoteNumber: true,
            issueDate: true,
            status: true,
            total: true,
            unappliedAmount: true,
          },
        },
        journalEntry: { select: { id: true, entryNumber: true, status: true } },
        voidReversalJournalEntry: { select: { id: true, entryNumber: true, status: true } },
      },
    });

    if (!refund) {
      throw new NotFoundException("Customer refund not found.");
    }

    return {
      organization: refund.organization,
      customer: refund.customer,
      refund: {
        id: refund.id,
        refundNumber: refund.refundNumber,
        refundDate: refund.refundDate,
        status: refund.status,
        currency: refund.currency,
        amountRefunded: moneyString(refund.amountRefunded),
        description: refund.description,
      },
      source: this.toPdfSource(refund),
      paidFromAccount: refund.account,
      journalEntry: refund.journalEntry,
      voidReversalJournalEntry: refund.voidReversalJournalEntry,
      generatedAt: new Date(),
    };
  }

  async pdf(
    organizationId: string,
    actorUserId: string,
    id: string,
  ): Promise<{ data: CustomerRefundPdfData; buffer: Buffer; filename: string; document: unknown | null }> {
    const data = await this.pdfData(organizationId, id);
    const settings = await this.documentSettingsService?.receiptRenderSettings(organizationId);
    const buffer = await renderCustomerRefundPdf(data, { ...settings, title: "Customer Refund" });
    const filename = sanitizeFilename(`customer-refund-${data.refund.refundNumber}.pdf`);
    const document = await this.generatedDocumentService?.archivePdf({
      organizationId,
      documentType: DocumentType.CUSTOMER_REFUND,
      sourceType: "CustomerRefund",
      sourceId: data.refund.id,
      documentNumber: data.refund.refundNumber,
      filename,
      buffer,
      generatedById: actorUserId,
    });
    return { data, buffer, filename, document: document ?? null };
  }

  async generatePdf(organizationId: string, actorUserId: string, id: string) {
    const { document } = await this.pdf(organizationId, actorUserId, id);
    return document;
  }

  private assertSourceShape(dto: CreateCustomerRefundDto): void {
    if (dto.sourceType === CustomerRefundSourceType.CUSTOMER_PAYMENT) {
      if (!dto.sourcePaymentId || dto.sourceCreditNoteId) {
        throw new BadRequestException("Customer payment refunds require sourcePaymentId only.");
      }
      return;
    }

    if (!dto.sourceCreditNoteId || dto.sourcePaymentId) {
      throw new BadRequestException("Credit note refunds require sourceCreditNoteId only.");
    }
  }

  private async claimRefundSource(
    organizationId: string,
    dto: CreateCustomerRefundDto,
    amountRefunded: string,
    tx: Prisma.TransactionClient,
  ): Promise<{ currency: string }> {
    if (dto.sourceType === CustomerRefundSourceType.CUSTOMER_PAYMENT) {
      const payment = await tx.customerPayment.findFirst({
        where: { id: dto.sourcePaymentId, organizationId },
        select: { id: true, customerId: true, status: true, unappliedAmount: true, currency: true },
      });
      if (!payment) {
        throw new BadRequestException("Refund source payment was not found in this organization.");
      }
      if (payment.customerId !== dto.customerId) {
        throw new BadRequestException("Refund source payment must belong to the selected customer.");
      }
      if (payment.status !== CustomerPaymentStatus.POSTED) {
        throw new BadRequestException("Refund source payment must be posted and not voided.");
      }
      if (toMoney(amountRefunded).gt(payment.unappliedAmount)) {
        throw new BadRequestException("Amount refunded cannot exceed the payment unapplied amount.");
      }
      this.resolveCurrency(dto.currency, payment.currency);

      const claim = await tx.customerPayment.updateMany({
        where: {
          id: payment.id,
          organizationId,
          customerId: dto.customerId,
          status: CustomerPaymentStatus.POSTED,
          unappliedAmount: { gte: amountRefunded },
        },
        data: { unappliedAmount: { decrement: amountRefunded } },
      });
      if (claim.count !== 1) {
        throw new BadRequestException("Refund source payment unapplied amount is no longer sufficient.");
      }
      return { currency: payment.currency };
    }

    const creditNote = await tx.creditNote.findFirst({
      where: { id: dto.sourceCreditNoteId, organizationId },
      select: { id: true, customerId: true, status: true, unappliedAmount: true, currency: true },
    });
    if (!creditNote) {
      throw new BadRequestException("Refund source credit note was not found in this organization.");
    }
    if (creditNote.customerId !== dto.customerId) {
      throw new BadRequestException("Refund source credit note must belong to the selected customer.");
    }
    if (creditNote.status !== CreditNoteStatus.FINALIZED) {
      throw new BadRequestException("Refund source credit note must be finalized and not voided.");
    }
    if (toMoney(amountRefunded).gt(creditNote.unappliedAmount)) {
      throw new BadRequestException("Amount refunded cannot exceed the credit note unapplied amount.");
    }
    this.resolveCurrency(dto.currency, creditNote.currency);

    const claim = await tx.creditNote.updateMany({
      where: {
        id: creditNote.id,
        organizationId,
        customerId: dto.customerId,
        status: CreditNoteStatus.FINALIZED,
        unappliedAmount: { gte: amountRefunded },
      },
      data: { unappliedAmount: { decrement: amountRefunded } },
    });
    if (claim.count !== 1) {
      throw new BadRequestException("Refund source credit note unapplied amount is no longer sufficient.");
    }
    return { currency: creditNote.currency };
  }

  private async restoreRefundSource(
    organizationId: string,
    refund: {
      sourceType: CustomerRefundSourceType;
      sourcePaymentId: string | null;
      sourceCreditNoteId: string | null;
      amountRefunded: Prisma.Decimal;
      sourcePayment: { id: string; status: CustomerPaymentStatus; amountReceived: Prisma.Decimal; unappliedAmount: Prisma.Decimal } | null;
      sourceCreditNote: { id: string; status: CreditNoteStatus; total: Prisma.Decimal; unappliedAmount: Prisma.Decimal } | null;
    },
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    const amountRefunded = moneyString(refund.amountRefunded);

    if (refund.sourceType === CustomerRefundSourceType.CUSTOMER_PAYMENT) {
      if (!refund.sourcePayment || !refund.sourcePaymentId || refund.sourcePayment.status !== CustomerPaymentStatus.POSTED) {
        throw new BadRequestException("Refund source payment must be posted before the refund can be voided.");
      }
      const limit = toMoney(refund.sourcePayment.amountReceived).minus(amountRefunded).toFixed(4);
      if (toMoney(refund.sourcePayment.unappliedAmount).gt(limit)) {
        throw new BadRequestException("Payment unapplied amount cannot exceed amount received after refund void.");
      }
      const restored = await tx.customerPayment.updateMany({
        where: {
          id: refund.sourcePaymentId,
          organizationId,
          status: CustomerPaymentStatus.POSTED,
          unappliedAmount: { lte: limit },
        },
        data: { unappliedAmount: { increment: amountRefunded } },
      });
      if (restored.count !== 1) {
        throw new BadRequestException("Payment unapplied amount could not be restored safely.");
      }
      return;
    }

    if (!refund.sourceCreditNote || !refund.sourceCreditNoteId || refund.sourceCreditNote.status !== CreditNoteStatus.FINALIZED) {
      throw new BadRequestException("Refund source credit note must be finalized before the refund can be voided.");
    }
    const limit = toMoney(refund.sourceCreditNote.total).minus(amountRefunded).toFixed(4);
    if (toMoney(refund.sourceCreditNote.unappliedAmount).gt(limit)) {
      throw new BadRequestException("Credit note unapplied amount cannot exceed credit note total after refund void.");
    }
    const restored = await tx.creditNote.updateMany({
      where: {
        id: refund.sourceCreditNoteId,
        organizationId,
        status: CreditNoteStatus.FINALIZED,
        unappliedAmount: { lte: limit },
      },
      data: { unappliedAmount: { increment: amountRefunded } },
    });
    if (restored.count !== 1) {
      throw new BadRequestException("Credit note unapplied amount could not be restored safely.");
    }
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

  private async findPaidFromAccount(organizationId: string, accountId: string, executor: PrismaExecutor = this.prisma) {
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
      throw new BadRequestException("Paid-from account must be an active posting asset account in this organization.");
    }

    return account;
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

  private async createReversalJournal(
    organizationId: string,
    actorUserId: string,
    refund: {
      refundNumber: string;
      refundDate: Date;
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
          taxRateId: string | null;
        }>;
      };
    },
    tx: Prisma.TransactionClient,
  ): Promise<string> {
    const reversalLines = createReversalLines(
      refund.journalEntry.lines.map((line) => ({
        accountId: line.accountId,
        debit: String(line.debit),
        credit: String(line.credit),
        description: line.description ?? undefined,
        currency: line.currency,
        exchangeRate: String(line.exchangeRate),
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
          entryDate: refund.reversalDate,
          description: `Void customer refund ${refund.refundNumber}: ${refund.journalEntry.description}`,
          reference: refund.refundNumber,
          currency: refund.currency,
          totalDebit: totals.debit,
          totalCredit: totals.credit,
          postedAt: refund.reversalDate,
          postedById: actorUserId,
          createdById: actorUserId,
          reversalOfId: refund.journalEntry.id,
          lines: { create: this.toJournalLineCreateMany(organizationId, reversalLines) },
        },
      });

      await tx.journalEntry.update({
        where: { id: refund.journalEntry.id },
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
    }));
  }

  private async assertPostingDateAllowed(organizationId: string, postingDate: string | Date, tx?: Prisma.TransactionClient): Promise<void> {
    await this.fiscalPeriodGuardService?.assertPostingDateAllowed(organizationId, postingDate, tx);
  }

  private toPdfSource(refund: {
    sourceType: CustomerRefundSourceType;
    sourcePayment: {
      id: string;
      paymentNumber: string;
      paymentDate: Date;
      status: CustomerPaymentStatus;
      amountReceived: Prisma.Decimal;
      unappliedAmount: Prisma.Decimal;
    } | null;
    sourceCreditNote: {
      id: string;
      creditNoteNumber: string;
      issueDate: Date;
      status: CreditNoteStatus;
      total: Prisma.Decimal;
      unappliedAmount: Prisma.Decimal;
    } | null;
  }): CustomerRefundPdfData["source"] {
    if (refund.sourceType === CustomerRefundSourceType.CUSTOMER_PAYMENT && refund.sourcePayment) {
      return {
        type: "CUSTOMER_PAYMENT",
        id: refund.sourcePayment.id,
        number: refund.sourcePayment.paymentNumber,
        date: refund.sourcePayment.paymentDate,
        status: refund.sourcePayment.status,
        originalAmount: moneyString(refund.sourcePayment.amountReceived),
        remainingUnappliedAmount: moneyString(refund.sourcePayment.unappliedAmount),
      };
    }

    if (refund.sourceType === CustomerRefundSourceType.CREDIT_NOTE && refund.sourceCreditNote) {
      return {
        type: "CREDIT_NOTE",
        id: refund.sourceCreditNote.id,
        number: refund.sourceCreditNote.creditNoteNumber,
        date: refund.sourceCreditNote.issueDate,
        status: refund.sourceCreditNote.status,
        originalAmount: moneyString(refund.sourceCreditNote.total),
        remainingUnappliedAmount: moneyString(refund.sourceCreditNote.unappliedAmount),
      };
    }

    return {
      type: refund.sourceType,
      id: "",
      number: "-",
      date: new Date(),
      status: "MISSING",
      originalAmount: "0.0000",
      remainingUnappliedAmount: "0.0000",
    };
  }

  private resolveCurrency(requestedCurrency: string | undefined, sourceCurrency: string): string {
    const currency = (requestedCurrency ?? sourceCurrency ?? "SAR").toUpperCase();
    if (currency !== sourceCurrency.toUpperCase()) {
      throw new BadRequestException("Refund currency must match the source currency.");
    }
    return currency;
  }

  private assertPositiveMoney(value: string, label: string) {
    const amount = toMoney(value);
    if (amount.lte(0)) {
      throw new BadRequestException(`${label} must be greater than zero.`);
    }
    return amount;
  }

  private cleanOptional(value: string | undefined): string | undefined {
    const trimmed = value?.trim();
    return trimmed || undefined;
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
  return toMoney(value === null || value === undefined ? 0 : String(value)).toFixed(4);
}
