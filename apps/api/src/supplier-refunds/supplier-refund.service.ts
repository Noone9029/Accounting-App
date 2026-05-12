import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { createReversalLines, getJournalTotals, JournalLineInput, toMoney } from "@ledgerbyte/accounting-core";
import { SupplierRefundPdfData, renderSupplierRefundPdf } from "@ledgerbyte/pdf-core";
import {
  AccountType,
  ContactType,
  DocumentType,
  JournalEntryStatus,
  NumberSequenceScope,
  Prisma,
  PurchaseDebitNoteStatus,
  SupplierPaymentStatus,
  SupplierRefundSourceType,
  SupplierRefundStatus,
} from "@prisma/client";
import { AuditLogService } from "../audit-log/audit-log.service";
import { OrganizationDocumentSettingsService } from "../document-settings/organization-document-settings.service";
import { GeneratedDocumentService, sanitizeFilename } from "../generated-documents/generated-document.service";
import { FiscalPeriodGuardService } from "../fiscal-periods/fiscal-period-guard.service";
import { NumberSequenceService } from "../number-sequences/number-sequence.service";
import { PrismaService } from "../prisma/prisma.service";
import { CreateSupplierRefundDto } from "./dto/create-supplier-refund.dto";
import { buildSupplierRefundJournalLines } from "./supplier-refund-accounting";

const supplierRefundInclude = {
  supplier: { select: { id: true, name: true, displayName: true, type: true } },
  account: { select: { id: true, code: true, name: true, type: true } },
  sourcePayment: {
    select: {
      id: true,
      paymentNumber: true,
      paymentDate: true,
      status: true,
      amountPaid: true,
      unappliedAmount: true,
      currency: true,
    },
  },
  sourceDebitNote: {
    select: {
      id: true,
      debitNoteNumber: true,
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
export class SupplierRefundService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
    private readonly numberSequenceService: NumberSequenceService,
    private readonly documentSettingsService?: OrganizationDocumentSettingsService,
    private readonly generatedDocumentService?: GeneratedDocumentService,
    private readonly fiscalPeriodGuardService?: FiscalPeriodGuardService,
  ) {}

  list(organizationId: string) {
    return this.prisma.supplierRefund.findMany({
      where: { organizationId },
      orderBy: { refundDate: "desc" },
      include: supplierRefundInclude,
    });
  }

  async get(organizationId: string, id: string) {
    const refund = await this.prisma.supplierRefund.findFirst({
      where: { id, organizationId },
      include: supplierRefundInclude,
    });

    if (!refund) {
      throw new NotFoundException("Supplier refund not found.");
    }

    return refund;
  }

  async refundableSources(organizationId: string, supplierId: string) {
    if (!supplierId) {
      throw new BadRequestException("supplierId is required.");
    }
    const supplier = await this.findSupplier(organizationId, supplierId);
    const [payments, debitNotes] = await Promise.all([
      this.prisma.supplierPayment.findMany({
        where: {
          organizationId,
          supplierId,
          status: SupplierPaymentStatus.POSTED,
          unappliedAmount: { gt: "0.0000" },
        },
        orderBy: { paymentDate: "desc" },
        select: {
          id: true,
          paymentNumber: true,
          paymentDate: true,
          currency: true,
          status: true,
          amountPaid: true,
          unappliedAmount: true,
        },
      }),
      this.prisma.purchaseDebitNote.findMany({
        where: {
          organizationId,
          supplierId,
          status: PurchaseDebitNoteStatus.FINALIZED,
          unappliedAmount: { gt: "0.0000" },
        },
        orderBy: { issueDate: "desc" },
        select: {
          id: true,
          debitNoteNumber: true,
          issueDate: true,
          currency: true,
          status: true,
          total: true,
          unappliedAmount: true,
        },
      }),
    ]);

    return { supplier, payments, debitNotes };
  }

  async create(organizationId: string, actorUserId: string, dto: CreateSupplierRefundDto) {
    const amountRefunded = this.assertPositiveMoney(dto.amountRefunded, "Amount refunded");
    this.assertSourceShape(dto);

    const refund = await this.prisma.$transaction(async (tx) => {
      const refundDate = new Date(dto.refundDate);
      await this.assertPostingDateAllowed(organizationId, refundDate, tx);
      const supplier = await this.findSupplier(organizationId, dto.supplierId, tx);
      const receivedIntoAccount = await this.findReceivedIntoAccount(organizationId, dto.accountId, tx);
      const source = await this.claimRefundSource(organizationId, dto, amountRefunded.toFixed(4), tx);
      const currency = this.resolveCurrency(dto.currency, source.currency);
      const refundNumber = await this.numberSequenceService.next(organizationId, NumberSequenceScope.SUPPLIER_REFUND, tx);
      const accountsPayableAccount = await this.findPostingAccountByCode(organizationId, "210", tx);
      const journalLines = buildSupplierRefundJournalLines({
        accountsPayableAccountId: accountsPayableAccount.id,
        receivedIntoAccountId: receivedIntoAccount.id,
        refundNumber,
        supplierName: supplier.displayName ?? supplier.name,
        currency,
        amountRefunded: amountRefunded.toFixed(4),
      });
      const totals = getJournalTotals(journalLines);

      const journalEntry = await tx.journalEntry.create({
        data: {
          organizationId,
          entryNumber: await this.numberSequenceService.next(organizationId, NumberSequenceScope.JOURNAL_ENTRY, tx),
          status: JournalEntryStatus.POSTED,
          entryDate: refundDate,
          description: `Supplier refund ${refundNumber} - ${supplier.displayName ?? supplier.name}`,
          reference: refundNumber,
          currency,
          totalDebit: totals.debit,
          totalCredit: totals.credit,
          postedAt: new Date(),
          postedById: actorUserId,
          createdById: actorUserId,
          lines: { create: this.toJournalLineCreateMany(organizationId, journalLines) },
        },
      });

      return tx.supplierRefund.create({
        data: {
          organizationId,
          refundNumber,
          supplierId: dto.supplierId,
          sourceType: dto.sourceType,
          sourcePaymentId: dto.sourceType === SupplierRefundSourceType.SUPPLIER_PAYMENT ? dto.sourcePaymentId : null,
          sourceDebitNoteId: dto.sourceType === SupplierRefundSourceType.PURCHASE_DEBIT_NOTE ? dto.sourceDebitNoteId : null,
          refundDate,
          currency,
          status: SupplierRefundStatus.POSTED,
          amountRefunded: amountRefunded.toFixed(4),
          accountId: dto.accountId,
          description: this.cleanOptional(dto.description),
          journalEntryId: journalEntry.id,
          createdById: actorUserId,
          postedAt: new Date(),
        },
        include: supplierRefundInclude,
      });
    });

    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: "CREATE",
      entityType: "SupplierRefund",
      entityId: refund.id,
      after: refund,
    });

    return refund;
  }

  async void(organizationId: string, actorUserId: string, id: string) {
    const existing = await this.get(organizationId, id);
    if (existing.status === SupplierRefundStatus.VOIDED) {
      return existing;
    }
    if (existing.status !== SupplierRefundStatus.POSTED || !existing.journalEntryId) {
      throw new BadRequestException("Only posted supplier refunds can be voided.");
    }

    const voided = await this.prisma.$transaction(async (tx) => {
      const refund = await tx.supplierRefund.findFirst({
        where: { id, organizationId },
        include: {
          sourcePayment: { select: { id: true, status: true, amountPaid: true, unappliedAmount: true } },
          sourceDebitNote: { select: { id: true, status: true, total: true, unappliedAmount: true } },
          journalEntry: {
            include: {
              lines: { orderBy: { lineNumber: "asc" } },
              reversedBy: { select: { id: true } },
            },
          },
        },
      });

      if (!refund) {
        throw new NotFoundException("Supplier refund not found.");
      }
      if (refund.status === SupplierRefundStatus.VOIDED) {
        return tx.supplierRefund.findUniqueOrThrow({ where: { id }, include: supplierRefundInclude });
      }
      if (refund.status !== SupplierRefundStatus.POSTED) {
        throw new BadRequestException("Only posted supplier refunds can be voided.");
      }
      if (!refund.journalEntry) {
        throw new BadRequestException("Supplier refund has no journal entry to reverse.");
      }
      const reversalDate = new Date();
      await this.assertPostingDateAllowed(organizationId, reversalDate, tx);

      const claim = await tx.supplierRefund.updateMany({
        where: { id, organizationId, status: SupplierRefundStatus.POSTED },
        data: {
          status: SupplierRefundStatus.VOIDED,
          voidedAt: new Date(),
        },
      });
      if (claim.count !== 1) {
        return tx.supplierRefund.findUniqueOrThrow({ where: { id }, include: supplierRefundInclude });
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

      return tx.supplierRefund.update({
        where: { id },
        data: { voidReversalJournalEntryId: reversalJournalEntryId },
        include: supplierRefundInclude,
      });
    });

    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: "VOID",
      entityType: "SupplierRefund",
      entityId: id,
      before: existing,
      after: voided,
    });

    return voided;
  }

  async remove(organizationId: string, actorUserId: string, id: string) {
    const existing = await this.get(organizationId, id);
    if (existing.status !== SupplierRefundStatus.DRAFT || existing.journalEntryId) {
      throw new BadRequestException("Only draft supplier refunds without journal entries can be deleted.");
    }

    await this.prisma.supplierRefund.delete({ where: { id } });
    await this.auditLogService.log({ organizationId, actorUserId, action: "DELETE", entityType: "SupplierRefund", entityId: id, before: existing });
    return { deleted: true };
  }

  async pdfData(organizationId: string, id: string): Promise<SupplierRefundPdfData> {
    const refund = await this.prisma.supplierRefund.findFirst({
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
        sourcePayment: {
          select: {
            id: true,
            paymentNumber: true,
            paymentDate: true,
            status: true,
            amountPaid: true,
            unappliedAmount: true,
          },
        },
        sourceDebitNote: {
          select: {
            id: true,
            debitNoteNumber: true,
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
      throw new NotFoundException("Supplier refund not found.");
    }

    return {
      organization: refund.organization,
      supplier: refund.supplier,
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
      receivedIntoAccount: refund.account,
      journalEntry: refund.journalEntry,
      voidReversalJournalEntry: refund.voidReversalJournalEntry,
      generatedAt: new Date(),
    };
  }

  async pdf(
    organizationId: string,
    actorUserId: string,
    id: string,
  ): Promise<{ data: SupplierRefundPdfData; buffer: Buffer; filename: string; document: unknown | null }> {
    const data = await this.pdfData(organizationId, id);
    const settings = await this.documentSettingsService?.receiptRenderSettings(organizationId);
    const buffer = await renderSupplierRefundPdf(data, { ...settings, title: "Supplier Refund" });
    const filename = sanitizeFilename(`supplier-refund-${data.refund.refundNumber}.pdf`);
    const document = await this.generatedDocumentService?.archivePdf({
      organizationId,
      documentType: DocumentType.SUPPLIER_REFUND,
      sourceType: "SupplierRefund",
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

  private assertSourceShape(dto: CreateSupplierRefundDto): void {
    if (dto.sourceType === SupplierRefundSourceType.SUPPLIER_PAYMENT) {
      if (!dto.sourcePaymentId || dto.sourceDebitNoteId) {
        throw new BadRequestException("Supplier payment refunds require sourcePaymentId only.");
      }
      return;
    }

    if (!dto.sourceDebitNoteId || dto.sourcePaymentId) {
      throw new BadRequestException("Purchase debit note refunds require sourceDebitNoteId only.");
    }
  }

  private async claimRefundSource(
    organizationId: string,
    dto: CreateSupplierRefundDto,
    amountRefunded: string,
    tx: Prisma.TransactionClient,
  ): Promise<{ currency: string }> {
    if (dto.sourceType === SupplierRefundSourceType.SUPPLIER_PAYMENT) {
      const payment = await tx.supplierPayment.findFirst({
        where: { id: dto.sourcePaymentId, organizationId },
        select: { id: true, supplierId: true, status: true, unappliedAmount: true, currency: true },
      });
      if (!payment) {
        throw new BadRequestException("Refund source supplier payment was not found in this organization.");
      }
      if (payment.supplierId !== dto.supplierId) {
        throw new BadRequestException("Refund source supplier payment must belong to the selected supplier.");
      }
      if (payment.status !== SupplierPaymentStatus.POSTED) {
        throw new BadRequestException("Refund source supplier payment must be posted and not voided.");
      }
      if (toMoney(amountRefunded).gt(payment.unappliedAmount)) {
        throw new BadRequestException("Amount refunded cannot exceed the supplier payment unapplied amount.");
      }
      this.resolveCurrency(dto.currency, payment.currency);

      const claim = await tx.supplierPayment.updateMany({
        where: {
          id: payment.id,
          organizationId,
          supplierId: dto.supplierId,
          status: SupplierPaymentStatus.POSTED,
          unappliedAmount: { gte: amountRefunded },
        },
        data: { unappliedAmount: { decrement: amountRefunded } },
      });
      if (claim.count !== 1) {
        throw new BadRequestException("Refund source supplier payment unapplied amount is no longer sufficient.");
      }
      return { currency: payment.currency };
    }

    const debitNote = await tx.purchaseDebitNote.findFirst({
      where: { id: dto.sourceDebitNoteId, organizationId },
      select: { id: true, supplierId: true, status: true, unappliedAmount: true, currency: true },
    });
    if (!debitNote) {
      throw new BadRequestException("Refund source purchase debit note was not found in this organization.");
    }
    if (debitNote.supplierId !== dto.supplierId) {
      throw new BadRequestException("Refund source purchase debit note must belong to the selected supplier.");
    }
    if (debitNote.status !== PurchaseDebitNoteStatus.FINALIZED) {
      throw new BadRequestException("Refund source purchase debit note must be finalized and not voided.");
    }
    if (toMoney(amountRefunded).gt(debitNote.unappliedAmount)) {
      throw new BadRequestException("Amount refunded cannot exceed the purchase debit note unapplied amount.");
    }
    this.resolveCurrency(dto.currency, debitNote.currency);

    const claim = await tx.purchaseDebitNote.updateMany({
      where: {
        id: debitNote.id,
        organizationId,
        supplierId: dto.supplierId,
        status: PurchaseDebitNoteStatus.FINALIZED,
        unappliedAmount: { gte: amountRefunded },
      },
      data: { unappliedAmount: { decrement: amountRefunded } },
    });
    if (claim.count !== 1) {
      throw new BadRequestException("Refund source purchase debit note unapplied amount is no longer sufficient.");
    }
    return { currency: debitNote.currency };
  }

  private async restoreRefundSource(
    organizationId: string,
    refund: {
      sourceType: SupplierRefundSourceType;
      sourcePaymentId: string | null;
      sourceDebitNoteId: string | null;
      amountRefunded: Prisma.Decimal;
      sourcePayment: { id: string; status: SupplierPaymentStatus; amountPaid: Prisma.Decimal; unappliedAmount: Prisma.Decimal } | null;
      sourceDebitNote: { id: string; status: PurchaseDebitNoteStatus; total: Prisma.Decimal; unappliedAmount: Prisma.Decimal } | null;
    },
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    const amountRefunded = moneyString(refund.amountRefunded);

    if (refund.sourceType === SupplierRefundSourceType.SUPPLIER_PAYMENT) {
      if (!refund.sourcePayment || !refund.sourcePaymentId || refund.sourcePayment.status !== SupplierPaymentStatus.POSTED) {
        throw new BadRequestException("Refund source supplier payment must be posted before the refund can be voided.");
      }
      const limit = toMoney(refund.sourcePayment.amountPaid).minus(amountRefunded).toFixed(4);
      if (toMoney(refund.sourcePayment.unappliedAmount).gt(limit)) {
        throw new BadRequestException("Supplier payment unapplied amount cannot exceed amount paid after refund void.");
      }
      const restored = await tx.supplierPayment.updateMany({
        where: {
          id: refund.sourcePaymentId,
          organizationId,
          status: SupplierPaymentStatus.POSTED,
          unappliedAmount: { lte: limit },
        },
        data: { unappliedAmount: { increment: amountRefunded } },
      });
      if (restored.count !== 1) {
        throw new BadRequestException("Supplier payment unapplied amount could not be restored safely.");
      }
      return;
    }

    if (!refund.sourceDebitNote || !refund.sourceDebitNoteId || refund.sourceDebitNote.status !== PurchaseDebitNoteStatus.FINALIZED) {
      throw new BadRequestException("Refund source purchase debit note must be finalized before the refund can be voided.");
    }
    const limit = toMoney(refund.sourceDebitNote.total).minus(amountRefunded).toFixed(4);
    if (toMoney(refund.sourceDebitNote.unappliedAmount).gt(limit)) {
      throw new BadRequestException("Purchase debit note unapplied amount cannot exceed debit note total after refund void.");
    }
    const restored = await tx.purchaseDebitNote.updateMany({
      where: {
        id: refund.sourceDebitNoteId,
        organizationId,
        status: PurchaseDebitNoteStatus.FINALIZED,
        unappliedAmount: { lte: limit },
      },
      data: { unappliedAmount: { increment: amountRefunded } },
    });
    if (restored.count !== 1) {
      throw new BadRequestException("Purchase debit note unapplied amount could not be restored safely.");
    }
  }

  private async findSupplier(organizationId: string, supplierId: string, executor: PrismaExecutor = this.prisma) {
    const supplier = await executor.contact.findFirst({
      where: {
        id: supplierId,
        organizationId,
        isActive: true,
        type: { in: [ContactType.SUPPLIER, ContactType.BOTH] },
      },
      select: { id: true, name: true, displayName: true },
    });

    if (!supplier) {
      throw new BadRequestException("Supplier must be an active supplier contact in this organization.");
    }

    return supplier;
  }

  private async findReceivedIntoAccount(organizationId: string, accountId: string, executor: PrismaExecutor = this.prisma) {
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
      throw new BadRequestException("Received-into account must be an active posting asset account in this organization.");
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
          description: `Void supplier refund ${refund.refundNumber}: ${refund.journalEntry.description}`,
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

  private toPdfSource(refund: {
    sourceType: SupplierRefundSourceType;
    sourcePayment: {
      id: string;
      paymentNumber: string;
      paymentDate: Date;
      status: SupplierPaymentStatus;
      amountPaid: Prisma.Decimal;
      unappliedAmount: Prisma.Decimal;
    } | null;
    sourceDebitNote: {
      id: string;
      debitNoteNumber: string;
      issueDate: Date;
      status: PurchaseDebitNoteStatus;
      total: Prisma.Decimal;
      unappliedAmount: Prisma.Decimal;
    } | null;
  }): SupplierRefundPdfData["source"] {
    if (refund.sourceType === SupplierRefundSourceType.SUPPLIER_PAYMENT && refund.sourcePayment) {
      return {
        type: "SUPPLIER_PAYMENT",
        id: refund.sourcePayment.id,
        number: refund.sourcePayment.paymentNumber,
        date: refund.sourcePayment.paymentDate,
        status: refund.sourcePayment.status,
        originalAmount: moneyString(refund.sourcePayment.amountPaid),
        remainingUnappliedAmount: moneyString(refund.sourcePayment.unappliedAmount),
      };
    }

    if (refund.sourceType === SupplierRefundSourceType.PURCHASE_DEBIT_NOTE && refund.sourceDebitNote) {
      return {
        type: "PURCHASE_DEBIT_NOTE",
        id: refund.sourceDebitNote.id,
        number: refund.sourceDebitNote.debitNoteNumber,
        date: refund.sourceDebitNote.issueDate,
        status: refund.sourceDebitNote.status,
        originalAmount: moneyString(refund.sourceDebitNote.total),
        remainingUnappliedAmount: moneyString(refund.sourceDebitNote.unappliedAmount),
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
  return toMoney(value === null || value === undefined ? 0 : String(value)).toFixed(4);
}
