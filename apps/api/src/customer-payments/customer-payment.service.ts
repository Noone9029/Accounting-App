import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { createReversalLines, getJournalTotals, JournalLineInput, toMoney } from "@ledgerbyte/accounting-core";
import { PaymentReceiptPdfData, renderPaymentReceiptPdf } from "@ledgerbyte/pdf-core";
import {
  AccountType,
  ContactType,
  CustomerPaymentStatus,
  DocumentType,
  JournalEntryStatus,
  NumberSequenceScope,
  Prisma,
  SalesInvoiceStatus,
} from "@prisma/client";
import { AuditLogService } from "../audit-log/audit-log.service";
import { GeneratedDocumentService, sanitizeFilename } from "../generated-documents/generated-document.service";
import { NumberSequenceService } from "../number-sequences/number-sequence.service";
import { OrganizationDocumentSettingsService } from "../document-settings/organization-document-settings.service";
import { PrismaService } from "../prisma/prisma.service";
import { buildCustomerPaymentJournalLines } from "./customer-payment-accounting";
import { CreateCustomerPaymentDto } from "./dto/create-customer-payment.dto";

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
          status: true,
        },
      },
    },
    orderBy: { createdAt: "asc" as const },
  },
};

type PrismaExecutor = PrismaService | Prisma.TransactionClient;

@Injectable()
export class CustomerPaymentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
    private readonly numberSequenceService: NumberSequenceService,
    private readonly documentSettingsService?: OrganizationDocumentSettingsService,
    private readonly generatedDocumentService?: GeneratedDocumentService,
  ) {}

  list(organizationId: string) {
    return this.prisma.customerPayment.findMany({
      where: { organizationId },
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
      throw new NotFoundException("Customer payment not found.");
    }

    return payment;
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
              },
            },
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
      amountReceived: payment.amountReceived,
      unappliedAmount: payment.unappliedAmount,
      currency: payment.currency,
      paidThroughAccount: payment.account,
      allocations: payment.allocations.map((allocation) => ({
        invoiceId: allocation.invoiceId,
        invoiceNumber: allocation.invoice.invoiceNumber,
        invoiceDate: allocation.invoice.issueDate,
        invoiceTotal: allocation.invoice.total,
        amountApplied: allocation.amountApplied,
        invoiceBalanceDue: allocation.invoice.balanceDue,
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
              },
            },
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
        amountReceived: moneyString(payment.amountReceived),
        unappliedAmount: moneyString(payment.unappliedAmount),
        description: payment.description,
      },
      paidThroughAccount: payment.account,
      allocations: payment.allocations.map((allocation) => ({
        invoiceId: allocation.invoiceId,
        invoiceNumber: allocation.invoice.invoiceNumber,
        invoiceDate: allocation.invoice.issueDate,
        invoiceTotal: moneyString(allocation.invoice.total),
        amountApplied: moneyString(allocation.amountApplied),
        invoiceBalanceDue: moneyString(allocation.invoice.balanceDue),
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
    const amountReceived = this.assertPositiveMoney(dto.amountReceived, "Amount received");
    this.assertAllocations(dto.allocations);

    const totalAllocated = dto.allocations.reduce((sum, allocation) => sum.plus(allocation.amountApplied), toMoney(0));

    if (totalAllocated.gt(amountReceived)) {
      throw new BadRequestException("Total allocations cannot exceed amount received.");
    }

    const unappliedAmount = amountReceived.minus(totalAllocated).toFixed(4);
    const currency = (dto.currency ?? "SAR").toUpperCase();

    const payment = await this.prisma.$transaction(async (tx) => {
      const [customer, paidThroughAccount] = await Promise.all([
        this.findCustomer(organizationId, dto.customerId, tx),
        this.findPaidThroughAccount(organizationId, dto.accountId, tx),
      ]);
      await this.findAndValidateInvoices(organizationId, dto.customerId, dto.allocations, tx);

      // Conditional balance updates are the allocation concurrency boundary.
      // The row update locks each invoice and only succeeds while balanceDue
      // can still cover the allocation, preventing negative balances.
      for (const allocation of dto.allocations) {
        const updatedInvoice = await tx.salesInvoice.updateMany({
          where: {
            id: allocation.invoiceId,
            organizationId,
            customerId: dto.customerId,
            status: SalesInvoiceStatus.FINALIZED,
            balanceDue: { gte: allocation.amountApplied },
          },
          data: { balanceDue: { decrement: allocation.amountApplied } },
        });
        if (updatedInvoice.count !== 1) {
          throw new BadRequestException("Allocation amount cannot exceed invoice balance due.");
        }
      }

      const paymentNumber = await this.numberSequenceService.next(organizationId, NumberSequenceScope.PAYMENT, tx);
      const accountsReceivableAccount = await this.findPostingAccountByCode(organizationId, "120", tx);
      const journalLines = buildCustomerPaymentJournalLines({
        paidThroughAccountId: paidThroughAccount.id,
        accountsReceivableAccountId: accountsReceivableAccount.id,
        paymentNumber,
        customerName: customer.displayName ?? customer.name,
        currency,
        amountReceived: amountReceived.toFixed(4),
      });

      const journalEntry = await tx.journalEntry.create({
        data: {
          organizationId,
          entryNumber: await this.numberSequenceService.next(organizationId, NumberSequenceScope.JOURNAL_ENTRY, tx),
          status: JournalEntryStatus.POSTED,
          entryDate: new Date(dto.paymentDate),
          description: `Customer payment ${paymentNumber} - ${customer.displayName ?? customer.name}`,
          reference: paymentNumber,
          currency,
          totalDebit: amountReceived.toFixed(4),
          totalCredit: amountReceived.toFixed(4),
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
          paymentDate: new Date(dto.paymentDate),
          currency,
          status: CustomerPaymentStatus.POSTED,
          amountReceived: amountReceived.toFixed(4),
          unappliedAmount,
          description: this.cleanOptional(dto.description),
          accountId: dto.accountId,
          journalEntryId: journalEntry.id,
          createdById: actorUserId,
          postedAt: new Date(),
          allocations: {
            create: dto.allocations.map((allocation) => ({
              organization: { connect: { id: organizationId } },
              invoice: { connect: { id: allocation.invoiceId } },
              amountApplied: allocation.amountApplied,
            })),
          },
        },
        include: customerPaymentInclude,
      });

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
          allocations: true,
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

      const journalEntry = payment.journalEntry;
      if (!journalEntry) {
        throw new BadRequestException("Customer payment has no journal entry to reverse.");
      }

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
            currency: payment.currency,
            journalEntry,
          },
          tx,
        ));

      for (const allocation of payment.allocations) {
        await tx.salesInvoice.updateMany({
          where: { id: allocation.invoiceId, organizationId, status: SalesInvoiceStatus.FINALIZED },
          data: { balanceDue: { increment: allocation.amountApplied } },
        });
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
      action: "VOID",
      entityType: "CustomerPayment",
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
      select: { id: true, balanceDue: true },
    });

    if (invoices.length !== invoiceIds.length) {
      throw new BadRequestException("Allocations must reference finalized, non-voided invoices for the selected customer.");
    }

    const invoicesById = new Map(invoices.map((invoice) => [invoice.id, invoice]));
    for (const allocation of allocations) {
      const invoice = invoicesById.get(allocation.invoiceId);
      const amountApplied = this.assertPositiveMoney(allocation.amountApplied, "Allocation amount");
      if (!invoice || amountApplied.gt(invoice.balanceDue)) {
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
    payment: {
      paymentNumber: string;
      paymentDate: Date;
      currency: string;
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
      payment.journalEntry.lines.map((line) => ({
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
          entryDate: new Date(),
          description: `Void customer payment ${payment.paymentNumber}: ${payment.journalEntry.description}`,
          reference: payment.paymentNumber,
          currency: payment.currency,
          totalDebit: totals.debit,
          totalCredit: totals.credit,
          postedAt: new Date(),
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
