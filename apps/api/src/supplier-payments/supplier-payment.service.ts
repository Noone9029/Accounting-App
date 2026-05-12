import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { createReversalLines, getJournalTotals, JournalLineInput, toMoney } from "@ledgerbyte/accounting-core";
import { SupplierPaymentReceiptPdfData, renderSupplierPaymentReceiptPdf } from "@ledgerbyte/pdf-core";
import {
  AccountType,
  ContactType,
  DocumentType,
  JournalEntryStatus,
  NumberSequenceScope,
  Prisma,
  PurchaseBillStatus,
  SupplierPaymentStatus,
} from "@prisma/client";
import { AuditLogService } from "../audit-log/audit-log.service";
import { OrganizationDocumentSettingsService } from "../document-settings/organization-document-settings.service";
import { GeneratedDocumentService, sanitizeFilename } from "../generated-documents/generated-document.service";
import { NumberSequenceService } from "../number-sequences/number-sequence.service";
import { PrismaService } from "../prisma/prisma.service";
import { CreateSupplierPaymentDto } from "./dto/create-supplier-payment.dto";
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
          status: true,
        },
      },
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
      amountPaid: payment.amountPaid,
      unappliedAmount: payment.unappliedAmount,
      currency: payment.currency,
      paidThroughAccount: payment.account,
      allocations: payment.allocations.map((allocation) => ({
        billId: allocation.billId,
        billNumber: allocation.bill.billNumber,
        billDate: allocation.bill.billDate,
        billDueDate: allocation.bill.dueDate,
        billTotal: allocation.bill.total,
        amountApplied: allocation.amountApplied,
        billBalanceDue: allocation.bill.balanceDue,
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
        amountPaid: moneyString(payment.amountPaid),
        unappliedAmount: moneyString(payment.unappliedAmount),
        description: payment.description,
      },
      paidThroughAccount: payment.account,
      allocations: payment.allocations.map((allocation) => ({
        billId: allocation.billId,
        billNumber: allocation.bill.billNumber,
        billDate: allocation.bill.billDate,
        billDueDate: allocation.bill.dueDate,
        billTotal: moneyString(allocation.bill.total),
        amountApplied: moneyString(allocation.amountApplied),
        billBalanceDue: moneyString(allocation.bill.balanceDue),
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
    const amountPaid = this.assertPositiveMoney(dto.amountPaid, "Amount paid");
    const allocations = dto.allocations ?? [];
    this.assertAllocations(allocations);

    const totalAllocated = allocations.reduce((sum, allocation) => sum.plus(allocation.amountApplied), toMoney(0));
    if (totalAllocated.gt(amountPaid)) {
      throw new BadRequestException("Total allocations cannot exceed amount paid.");
    }

    const currency = (dto.currency ?? "SAR").toUpperCase();
    const unappliedAmount = amountPaid.minus(totalAllocated).toFixed(4);

    const payment = await this.prisma.$transaction(async (tx) => {
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

      await this.validateBillsForAllocation(organizationId, supplier.id, allocations, tx);
      const accountsPayableAccount = await this.findPostingAccountByCode(organizationId, "210", tx);
      const paymentNumber = await this.numberSequenceService.next(organizationId, NumberSequenceScope.PAYMENT, tx);
      const journalLines = buildSupplierPaymentJournalLines({
        paidThroughAccountId: paidThroughAccount.id,
        accountsPayableAccountId: accountsPayableAccount.id,
        paymentNumber,
        supplierName: supplier.displayName ?? supplier.name,
        currency,
        amountPaid: amountPaid.toFixed(4),
      });
      const totals = getJournalTotals(journalLines);
      const entryNumber = await this.numberSequenceService.next(organizationId, NumberSequenceScope.JOURNAL_ENTRY, tx);
      const journalEntry = await tx.journalEntry.create({
        data: {
          organizationId,
          entryNumber,
          status: JournalEntryStatus.POSTED,
          entryDate: new Date(dto.paymentDate),
          description: `Supplier payment ${paymentNumber} - ${supplier.displayName ?? supplier.name}`,
          reference: paymentNumber,
          currency,
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
          paymentDate: new Date(dto.paymentDate),
          currency,
          amountPaid: amountPaid.toFixed(4),
          unappliedAmount,
          accountId: paidThroughAccount.id,
          description: this.cleanOptional(dto.description),
          journalEntryId: journalEntry.id,
          createdById: actorUserId,
          postedAt: new Date(),
        },
        select: { id: true },
      });

      for (const allocation of allocations) {
        const amount = toMoney(allocation.amountApplied).toFixed(4);
        const billClaim = await tx.purchaseBill.updateMany({
          where: {
            id: allocation.billId,
            organizationId,
            supplierId: supplier.id,
            status: PurchaseBillStatus.FINALIZED,
            balanceDue: { gte: amount },
          },
          data: { balanceDue: { decrement: amount } },
        });
        if (billClaim.count !== 1) {
          throw new BadRequestException("Bill balance due is no longer sufficient for this supplier payment.");
        }

        await tx.supplierPaymentAllocation.create({
          data: {
            organization: { connect: { id: organizationId } },
            payment: { connect: { id: created.id } },
            bill: { connect: { id: allocation.billId } },
            amountApplied: amount,
          },
        });
      }

      return tx.supplierPayment.findUniqueOrThrow({ where: { id: created.id }, include: supplierPaymentInclude });
    });

    await this.auditLogService.log({ organizationId, actorUserId, action: "CREATE", entityType: "SupplierPayment", entityId: payment.id, after: payment });
    return payment;
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
              bill: { select: { id: true, status: true, total: true, balanceDue: true } },
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
        const amount = toMoney(allocation.amountApplied).toFixed(4);
        const balanceLimit = toMoney(allocation.bill.total).minus(amount).toFixed(4);
        const restore = await tx.purchaseBill.updateMany({
          where: {
            id: allocation.billId,
            organizationId,
            status: PurchaseBillStatus.FINALIZED,
            balanceDue: { lte: balanceLimit },
          },
          data: { balanceDue: { increment: amount } },
        });
        if (restore.count !== 1) {
          throw new BadRequestException("Bill balance due could not be restored without exceeding bill total.");
        }
      }

      const reversalJournalEntryId = await this.createOrReuseReversalJournal(organizationId, actorUserId, payment.journalEntryId, tx);
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
    allocations: SupplierPaymentAllocationDto[],
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    if (allocations.length === 0) {
      return;
    }

    const billIds = allocations.map((allocation) => allocation.billId);
    if (new Set(billIds).size !== billIds.length) {
      throw new BadRequestException("Each purchase bill can appear only once in a supplier payment.");
    }

    const bills = await tx.purchaseBill.findMany({
      where: { organizationId, id: { in: billIds } },
      select: { id: true, supplierId: true, status: true, balanceDue: true },
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
      if (bill.status !== PurchaseBillStatus.FINALIZED) {
        throw new BadRequestException("Supplier payments can only be allocated to finalized, non-voided bills.");
      }
      if (amount.gt(bill.balanceDue)) {
        throw new BadRequestException("Supplier payment allocation cannot exceed bill balance due.");
      }
    }
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

  private async createOrReuseReversalJournal(
    organizationId: string,
    actorUserId: string,
    journalEntryId: string,
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
          entryDate: new Date(),
          description: `Reversal of ${journalEntry.entryNumber}`,
          reference: journalEntry.reference,
          currency: journalEntry.currency,
          totalDebit: totals.debit,
          totalCredit: totals.credit,
          postedAt: new Date(),
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
    }));
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
  return String(value ?? "0");
}
