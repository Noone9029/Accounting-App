import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import {
  AccountingRuleError,
  assertFinalizableSalesInvoice,
  calculateSalesInvoiceTotals,
  createReversalLines,
  getJournalTotals,
  JournalLineInput,
  toMoney,
} from "@ledgerbyte/accounting-core";
import { CreditNotePdfData, renderCreditNotePdf } from "@ledgerbyte/pdf-core";
import {
  AccountType,
  ContactType,
  CreditNoteStatus,
  DocumentType,
  ItemStatus,
  JournalEntryStatus,
  NumberSequenceScope,
  Prisma,
  SalesInvoiceStatus,
  TaxRateScope,
} from "@prisma/client";
import { AuditLogService } from "../audit-log/audit-log.service";
import { GeneratedDocumentService, sanitizeFilename } from "../generated-documents/generated-document.service";
import { NumberSequenceService } from "../number-sequences/number-sequence.service";
import { OrganizationDocumentSettingsService } from "../document-settings/organization-document-settings.service";
import { PrismaService } from "../prisma/prisma.service";
import { buildCreditNoteJournalLines } from "./credit-note-accounting";
import { ApplyCreditNoteDto } from "./dto/apply-credit-note.dto";
import { CreditNoteLineDto } from "./dto/credit-note-line.dto";
import { CreateCreditNoteDto } from "./dto/create-credit-note.dto";
import { UpdateCreditNoteDto } from "./dto/update-credit-note.dto";

const creditNoteInclude = {
  customer: { select: { id: true, name: true, displayName: true, type: true, taxNumber: true } },
  originalInvoice: { select: { id: true, invoiceNumber: true, issueDate: true, total: true, status: true, customerId: true } },
  branch: { select: { id: true, name: true, displayName: true, taxNumber: true } },
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
  reversalJournalEntry: { select: { id: true, entryNumber: true, status: true } },
  lines: {
    orderBy: { sortOrder: "asc" as const },
    include: {
      item: { select: { id: true, name: true, sku: true } },
      account: { select: { id: true, code: true, name: true, type: true } },
      taxRate: { select: { id: true, name: true, rate: true } },
    },
  },
  allocations: {
    orderBy: { createdAt: "asc" as const },
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
  },
};

interface PreparedLine {
  itemId?: string;
  description: string;
  accountId: string;
  quantity: string;
  unitPrice: string;
  discountRate: string;
  taxRateId?: string;
  taxRate: string;
  lineGrossAmount: string;
  discountAmount: string;
  taxableAmount: string;
  taxAmount: string;
  lineTotal: string;
  sortOrder: number;
}

interface PreparedCreditNote {
  subtotal: string;
  discountTotal: string;
  taxableTotal: string;
  taxTotal: string;
  total: string;
  lines: PreparedLine[];
}

type PrismaExecutor = PrismaService | Prisma.TransactionClient;

@Injectable()
export class CreditNoteService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
    private readonly numberSequenceService: NumberSequenceService,
    private readonly documentSettingsService?: OrganizationDocumentSettingsService,
    private readonly generatedDocumentService?: GeneratedDocumentService,
  ) {}

  list(organizationId: string) {
    return this.prisma.creditNote.findMany({
      where: { organizationId },
      orderBy: { issueDate: "desc" },
      include: {
        customer: { select: { id: true, name: true, displayName: true } },
        originalInvoice: { select: { id: true, invoiceNumber: true, status: true, total: true } },
        branch: { select: { id: true, name: true, displayName: true } },
        journalEntry: { select: { id: true, entryNumber: true, status: true } },
        reversalJournalEntry: { select: { id: true, entryNumber: true, status: true } },
      },
    });
  }

  async listForInvoice(organizationId: string, invoiceId: string) {
    const invoice = await this.prisma.salesInvoice.findFirst({
      where: { id: invoiceId, organizationId },
      select: { id: true },
    });
    if (!invoice) {
      throw new NotFoundException("Sales invoice not found.");
    }

    return this.prisma.creditNote.findMany({
      where: { organizationId, originalInvoiceId: invoiceId },
      orderBy: { issueDate: "desc" },
      include: {
        customer: { select: { id: true, name: true, displayName: true } },
        journalEntry: { select: { id: true, entryNumber: true, status: true } },
        reversalJournalEntry: { select: { id: true, entryNumber: true, status: true } },
      },
    });
  }

  async get(organizationId: string, id: string) {
    const creditNote = await this.prisma.creditNote.findFirst({
      where: { id, organizationId },
      include: creditNoteInclude,
    });

    if (!creditNote) {
      throw new NotFoundException("Credit note not found.");
    }

    return creditNote;
  }

  async allocations(organizationId: string, id: string) {
    const creditNote = await this.prisma.creditNote.findFirst({
      where: { id, organizationId },
      select: { id: true },
    });
    if (!creditNote) {
      throw new NotFoundException("Credit note not found.");
    }

    return this.prisma.creditNoteAllocation.findMany({
      where: { organizationId, creditNoteId: id },
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
      },
    });
  }

  async allocationsForInvoice(organizationId: string, invoiceId: string) {
    const invoice = await this.prisma.salesInvoice.findFirst({
      where: { id: invoiceId, organizationId },
      select: { id: true },
    });
    if (!invoice) {
      throw new NotFoundException("Sales invoice not found.");
    }

    return this.prisma.creditNoteAllocation.findMany({
      where: { organizationId, invoiceId },
      orderBy: { createdAt: "asc" },
      include: {
        creditNote: {
          select: {
            id: true,
            creditNoteNumber: true,
            issueDate: true,
            currency: true,
            status: true,
            total: true,
            unappliedAmount: true,
          },
        },
      },
    });
  }

  async apply(organizationId: string, actorUserId: string, id: string, dto: ApplyCreditNoteDto) {
    const amountApplied = this.assertPositiveMoney(dto.amountApplied, "Amount applied");
    const existing = await this.get(organizationId, id);

    const updated = await this.prisma.$transaction(async (tx) => {
      const creditNote = await tx.creditNote.findFirst({
        where: { id, organizationId },
        select: {
          id: true,
          customerId: true,
          status: true,
          total: true,
          unappliedAmount: true,
        },
      });
      if (!creditNote) {
        throw new NotFoundException("Credit note not found.");
      }
      if (creditNote.status !== CreditNoteStatus.FINALIZED) {
        throw new BadRequestException("Only finalized credit notes can be applied to invoices.");
      }
      if (amountApplied.gt(creditNote.unappliedAmount)) {
        throw new BadRequestException("Amount applied cannot exceed credit note unapplied amount.");
      }

      const invoice = await tx.salesInvoice.findFirst({
        where: { id: dto.invoiceId, organizationId },
        select: {
          id: true,
          customerId: true,
          status: true,
          balanceDue: true,
        },
      });
      if (!invoice) {
        throw new BadRequestException("Invoice must belong to this organization.");
      }
      if (invoice.customerId !== creditNote.customerId) {
        throw new BadRequestException("Credit note and invoice must belong to the same customer.");
      }
      if (invoice.status !== SalesInvoiceStatus.FINALIZED) {
        throw new BadRequestException("Credit notes can only be applied to finalized, non-voided invoices.");
      }
      if (amountApplied.gt(invoice.balanceDue)) {
        throw new BadRequestException("Amount applied cannot exceed invoice balance due.");
      }

      const amount = amountApplied.toFixed(4);
      const creditClaim = await tx.creditNote.updateMany({
        where: {
          id,
          organizationId,
          status: CreditNoteStatus.FINALIZED,
          unappliedAmount: { gte: amount },
        },
        data: { unappliedAmount: { decrement: amount } },
      });
      if (creditClaim.count !== 1) {
        throw new BadRequestException("Credit note unapplied amount is no longer sufficient for this allocation.");
      }

      const invoiceClaim = await tx.salesInvoice.updateMany({
        where: {
          id: dto.invoiceId,
          organizationId,
          customerId: creditNote.customerId,
          status: SalesInvoiceStatus.FINALIZED,
          balanceDue: { gte: amount },
        },
        data: { balanceDue: { decrement: amount } },
      });
      if (invoiceClaim.count !== 1) {
        throw new BadRequestException("Invoice balance due is no longer sufficient for this allocation.");
      }

      // Credit note allocation only matches an existing AR reduction to an invoice
      // balance. The credit note finalization journal already posted the AR credit.
      await tx.creditNoteAllocation.create({
        data: {
          organization: { connect: { id: organizationId } },
          creditNote: { connect: { id } },
          invoice: { connect: { id: dto.invoiceId } },
          amountApplied: amount,
        },
      });

      return tx.creditNote.findUniqueOrThrow({ where: { id }, include: creditNoteInclude });
    });

    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: "APPLY",
      entityType: "CreditNote",
      entityId: id,
      before: existing,
      after: updated,
    });

    return updated;
  }

  async pdfData(organizationId: string, id: string): Promise<CreditNotePdfData> {
    const creditNote = await this.prisma.creditNote.findFirst({
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
            taxNumber: true,
            email: true,
            phone: true,
            addressLine1: true,
            addressLine2: true,
            city: true,
            postalCode: true,
            countryCode: true,
          },
        },
        originalInvoice: { select: { id: true, invoiceNumber: true, issueDate: true, total: true } },
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
                status: true,
              },
            },
          },
        },
        lines: {
          orderBy: { sortOrder: "asc" },
          include: {
            taxRate: { select: { name: true } },
          },
        },
      },
    });

    if (!creditNote) {
      throw new NotFoundException("Credit note not found.");
    }

    return {
      organization: creditNote.organization,
      customer: creditNote.customer,
      originalInvoice: creditNote.originalInvoice
        ? {
            id: creditNote.originalInvoice.id,
            invoiceNumber: creditNote.originalInvoice.invoiceNumber,
            issueDate: creditNote.originalInvoice.issueDate,
            total: moneyString(creditNote.originalInvoice.total),
          }
        : null,
      creditNote: {
        id: creditNote.id,
        creditNoteNumber: creditNote.creditNoteNumber,
        status: creditNote.status,
        issueDate: creditNote.issueDate,
        currency: creditNote.currency,
        notes: creditNote.notes,
        reason: creditNote.reason,
        subtotal: moneyString(creditNote.subtotal),
        discountTotal: moneyString(creditNote.discountTotal),
        taxableTotal: moneyString(creditNote.taxableTotal),
        taxTotal: moneyString(creditNote.taxTotal),
        total: moneyString(creditNote.total),
        unappliedAmount: moneyString(creditNote.unappliedAmount),
      },
      lines: creditNote.lines.map((line) => ({
        description: line.description,
        quantity: moneyString(line.quantity),
        unitPrice: moneyString(line.unitPrice),
        discountRate: moneyString(line.discountRate),
        lineGrossAmount: moneyString(line.lineGrossAmount),
        discountAmount: moneyString(line.discountAmount),
        taxableAmount: moneyString(line.taxableAmount),
        taxAmount: moneyString(line.taxAmount),
        lineTotal: moneyString(line.lineTotal),
        taxRateName: line.taxRate?.name ?? null,
      })),
      allocations: creditNote.allocations.map((allocation) => ({
        invoiceId: allocation.invoiceId,
        invoiceNumber: allocation.invoice.invoiceNumber,
        invoiceDate: allocation.invoice.issueDate,
        invoiceTotal: moneyString(allocation.invoice.total),
        amountApplied: moneyString(allocation.amountApplied),
        invoiceBalanceDue: moneyString(allocation.invoice.balanceDue),
      })),
      journalEntry: creditNote.journalEntry,
      generatedAt: new Date(),
    };
  }

  async pdf(
    organizationId: string,
    actorUserId: string,
    id: string,
  ): Promise<{ data: CreditNotePdfData; buffer: Buffer; filename: string; document: unknown | null }> {
    const data = await this.pdfData(organizationId, id);
    const settings = await this.documentSettingsService?.invoiceRenderSettings(organizationId);
    const buffer = await renderCreditNotePdf(data, { ...settings, title: "Credit Note" });
    const filename = sanitizeFilename(`credit-note-${data.creditNote.creditNoteNumber}.pdf`);
    const document = await this.generatedDocumentService?.archivePdf({
      organizationId,
      documentType: DocumentType.CREDIT_NOTE,
      sourceType: "CreditNote",
      sourceId: data.creditNote.id,
      documentNumber: data.creditNote.creditNoteNumber,
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

  async create(organizationId: string, actorUserId: string, dto: CreateCreditNoteDto) {
    const prepared = await this.prepareCreditNote(organizationId, dto.lines);
    await this.validateHeaderReferences(organizationId, dto.customerId, dto.branchId ?? undefined);
    await this.validateOriginalInvoiceReference(
      organizationId,
      dto.customerId,
      dto.originalInvoiceId ?? undefined,
      prepared.total,
      undefined,
      this.prisma,
    );

    const currency = (dto.currency ?? "SAR").toUpperCase();
    const creditNote = await this.prisma.$transaction(async (tx) => {
      const creditNoteNumber = await this.numberSequenceService.next(organizationId, NumberSequenceScope.CREDIT_NOTE, tx);

      return tx.creditNote.create({
        data: {
          organizationId,
          creditNoteNumber,
          customerId: dto.customerId,
          originalInvoiceId: this.cleanOptional(dto.originalInvoiceId ?? undefined),
          branchId: this.cleanOptional(dto.branchId ?? undefined),
          issueDate: new Date(dto.issueDate),
          currency,
          subtotal: prepared.subtotal,
          discountTotal: prepared.discountTotal,
          taxableTotal: prepared.taxableTotal,
          taxTotal: prepared.taxTotal,
          total: prepared.total,
          unappliedAmount: prepared.total,
          notes: this.cleanOptional(dto.notes),
          reason: this.cleanOptional(dto.reason),
          createdById: actorUserId,
          lines: { create: this.toLineCreateMany(organizationId, prepared.lines) },
        },
        include: creditNoteInclude,
      });
    });

    await this.auditLogService.log({ organizationId, actorUserId, action: "CREATE", entityType: "CreditNote", entityId: creditNote.id, after: creditNote });
    return creditNote;
  }

  async update(organizationId: string, actorUserId: string, id: string, dto: UpdateCreditNoteDto) {
    const existing = await this.get(organizationId, id);
    this.assertDraft(existing.status);

    const nextCustomerId = dto.customerId ?? existing.customerId;
    const nextBranchId = Object.prototype.hasOwnProperty.call(dto, "branchId")
      ? this.cleanOptional(dto.branchId ?? undefined)
      : existing.branchId ?? undefined;
    const nextOriginalInvoiceId = Object.prototype.hasOwnProperty.call(dto, "originalInvoiceId")
      ? this.cleanOptional(dto.originalInvoiceId ?? undefined)
      : existing.originalInvoiceId ?? undefined;

    if (dto.customerId || Object.prototype.hasOwnProperty.call(dto, "branchId")) {
      await this.validateHeaderReferences(organizationId, nextCustomerId, nextBranchId);
    }

    const prepared = dto.lines ? await this.prepareCreditNote(organizationId, dto.lines) : null;
    await this.validateOriginalInvoiceReference(
      organizationId,
      nextCustomerId,
      nextOriginalInvoiceId,
      prepared?.total ?? moneyString(existing.total),
      id,
      this.prisma,
    );

    const updated = await this.prisma.$transaction(async (tx) => {
      if (prepared) {
        await tx.creditNoteLine.deleteMany({ where: { organizationId, creditNoteId: id } });
      }

      return tx.creditNote.update({
        where: { id },
        data: {
          customerId: dto.customerId,
          originalInvoiceId: Object.prototype.hasOwnProperty.call(dto, "originalInvoiceId") ? nextOriginalInvoiceId ?? null : undefined,
          branchId: Object.prototype.hasOwnProperty.call(dto, "branchId") ? nextBranchId ?? null : undefined,
          issueDate: dto.issueDate ? new Date(dto.issueDate) : undefined,
          currency: dto.currency?.toUpperCase(),
          subtotal: prepared?.subtotal,
          discountTotal: prepared?.discountTotal,
          taxableTotal: prepared?.taxableTotal,
          taxTotal: prepared?.taxTotal,
          total: prepared?.total,
          unappliedAmount: prepared?.total,
          notes: dto.notes === undefined ? undefined : this.cleanOptional(dto.notes),
          reason: dto.reason === undefined ? undefined : this.cleanOptional(dto.reason),
          lines: prepared ? { create: this.toLineCreateMany(organizationId, prepared.lines) } : undefined,
        },
        include: creditNoteInclude,
      });
    });

    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: "UPDATE",
      entityType: "CreditNote",
      entityId: id,
      before: existing,
      after: updated,
    });
    return updated;
  }

  async finalize(organizationId: string, actorUserId: string, id: string) {
    const existing = await this.get(organizationId, id);
    if (existing.status === CreditNoteStatus.FINALIZED && existing.journalEntryId) {
      return existing;
    }
    if (existing.status === CreditNoteStatus.FINALIZED) {
      throw new BadRequestException("Finalized credit note is missing its journal entry.");
    }
    if (existing.status === CreditNoteStatus.VOIDED) {
      throw new BadRequestException("Voided credit notes cannot be finalized.");
    }

    const finalized = await this.prisma.$transaction(async (tx) => {
      const creditNote = await tx.creditNote.findFirst({
        where: { id, organizationId },
        include: {
          customer: { select: { id: true, name: true, displayName: true } },
          lines: { orderBy: { sortOrder: "asc" }, include: { account: true } },
        },
      });

      if (!creditNote) {
        throw new NotFoundException("Credit note not found.");
      }
      if (creditNote.status === CreditNoteStatus.FINALIZED && creditNote.journalEntryId) {
        return tx.creditNote.findUniqueOrThrow({ where: { id }, include: creditNoteInclude });
      }
      if (creditNote.status === CreditNoteStatus.FINALIZED) {
        throw new BadRequestException("Finalized credit note is missing its journal entry.");
      }
      if (creditNote.status === CreditNoteStatus.VOIDED) {
        throw new BadRequestException("Voided credit notes cannot be finalized.");
      }
      if (creditNote.status !== CreditNoteStatus.DRAFT) {
        throw new BadRequestException("Only draft credit notes can be finalized.");
      }

      this.assertFinalizableCreditNote({
        subtotal: String(creditNote.subtotal),
        discountTotal: String(creditNote.discountTotal),
        taxableTotal: String(creditNote.taxableTotal),
        taxTotal: String(creditNote.taxTotal),
        total: String(creditNote.total),
        lines: creditNote.lines.map((line) => ({
          quantity: String(line.quantity),
          unitPrice: String(line.unitPrice),
          discountRate: String(line.discountRate),
          lineGrossAmount: String(line.lineGrossAmount),
          discountAmount: String(line.discountAmount),
          taxRate: "0.0000",
          taxableAmount: String(line.taxableAmount),
          taxAmount: String(line.taxAmount),
          lineTotal: String(line.lineTotal),
        })),
      });
      await this.validateOriginalInvoiceReference(
        organizationId,
        creditNote.customerId,
        creditNote.originalInvoiceId ?? undefined,
        String(creditNote.total),
        id,
        tx,
      );

      const claim = await tx.creditNote.updateMany({
        where: {
          id,
          organizationId,
          status: CreditNoteStatus.DRAFT,
          journalEntryId: null,
        },
        data: {
          status: CreditNoteStatus.FINALIZED,
          finalizedAt: new Date(),
          unappliedAmount: creditNote.total,
        },
      });
      if (claim.count !== 1) {
        return tx.creditNote.findUniqueOrThrow({ where: { id }, include: creditNoteInclude });
      }

      const accountsReceivableAccount = await this.findPostingAccountByCode(organizationId, "120", tx);
      const vatPayableAccount = await this.findPostingAccountByCode(organizationId, "220", tx);
      const journalLines = buildCreditNoteJournalLines({
        accountsReceivableAccountId: accountsReceivableAccount.id,
        vatPayableAccountId: vatPayableAccount.id,
        creditNoteNumber: creditNote.creditNoteNumber,
        customerName: creditNote.customer.displayName ?? creditNote.customer.name,
        currency: creditNote.currency,
        total: String(creditNote.total),
        taxTotal: String(creditNote.taxTotal),
        lines: creditNote.lines.map((line) => ({
          accountId: line.accountId,
          description: line.description,
          taxableAmount: String(line.taxableAmount),
        })),
      });

      const entryNumber = await this.numberSequenceService.next(organizationId, NumberSequenceScope.JOURNAL_ENTRY, tx);
      const journalEntry = await tx.journalEntry.create({
        data: {
          organizationId,
          entryNumber,
          status: JournalEntryStatus.POSTED,
          entryDate: creditNote.issueDate,
          description: `Sales credit note ${creditNote.creditNoteNumber} - ${creditNote.customer.displayName ?? creditNote.customer.name}`,
          reference: creditNote.creditNoteNumber,
          currency: creditNote.currency,
          totalDebit: creditNote.total,
          totalCredit: creditNote.total,
          postedAt: new Date(),
          postedById: actorUserId,
          createdById: actorUserId,
          lines: { create: this.toJournalLineCreateMany(organizationId, journalLines) },
        },
      });

      return tx.creditNote.update({
        where: { id },
        data: {
          journalEntryId: journalEntry.id,
        },
        include: creditNoteInclude,
      });
    });

    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: "FINALIZE",
      entityType: "CreditNote",
      entityId: id,
      before: existing,
      after: finalized,
    });
    return finalized;
  }

  async void(organizationId: string, actorUserId: string, id: string) {
    const existing = await this.get(organizationId, id);
    if (existing.status === CreditNoteStatus.VOIDED) {
      return existing;
    }

    const voided = await this.prisma.$transaction(async (tx) => {
      const creditNote = await tx.creditNote.findFirst({
        where: { id, organizationId },
      });

      if (!creditNote) {
        throw new NotFoundException("Credit note not found.");
      }
      if (creditNote.status === CreditNoteStatus.VOIDED) {
        return tx.creditNote.findUniqueOrThrow({ where: { id }, include: creditNoteInclude });
      }
      if (creditNote.status === CreditNoteStatus.DRAFT) {
        const claim = await tx.creditNote.updateMany({
          where: { id, organizationId, status: CreditNoteStatus.DRAFT },
          data: {
            status: CreditNoteStatus.VOIDED,
          },
        });
        if (claim.count !== 1) {
          return tx.creditNote.findUniqueOrThrow({ where: { id }, include: creditNoteInclude });
        }
        return tx.creditNote.findUniqueOrThrow({ where: { id }, include: creditNoteInclude });
      }
      if (creditNote.status !== CreditNoteStatus.FINALIZED) {
        throw new BadRequestException("Only draft or finalized credit notes can be voided.");
      }
      if (!creditNote.journalEntryId) {
        throw new BadRequestException("Finalized credit note is missing its journal entry.");
      }

      const claim = await tx.creditNote.updateMany({
        where: { id, organizationId, status: CreditNoteStatus.FINALIZED },
        data: {
          status: CreditNoteStatus.VOIDED,
        },
      });
      if (claim.count !== 1) {
        return tx.creditNote.findUniqueOrThrow({ where: { id }, include: creditNoteInclude });
      }

      const allocationCount = await tx.creditNoteAllocation.count({
        where: { organizationId, creditNoteId: id },
      });
      if (allocationCount > 0) {
        throw new BadRequestException("Cannot void credit note with active allocations. Reverse allocations first.");
      }

      const reversalJournalEntryId = await this.createOrReuseReversalJournal(organizationId, actorUserId, creditNote.journalEntryId, tx);

      return tx.creditNote.update({
        where: { id },
        data: { reversalJournalEntryId },
        include: creditNoteInclude,
      });
    });

    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: "VOID",
      entityType: "CreditNote",
      entityId: id,
      before: existing,
      after: voided,
    });
    return voided;
  }

  async remove(organizationId: string, actorUserId: string, id: string) {
    const existing = await this.get(organizationId, id);
    if (existing.status !== CreditNoteStatus.DRAFT || existing.journalEntryId) {
      throw new BadRequestException("Only draft credit notes without journal entries can be deleted.");
    }

    await this.prisma.creditNote.delete({ where: { id } });
    await this.auditLogService.log({ organizationId, actorUserId, action: "DELETE", entityType: "CreditNote", entityId: id, before: existing });
    return { deleted: true };
  }

  private async validateHeaderReferences(organizationId: string, customerId: string, branchId?: string): Promise<void> {
    const customer = await this.prisma.contact.findFirst({
      where: {
        id: customerId,
        organizationId,
        isActive: true,
        type: { in: [ContactType.CUSTOMER, ContactType.BOTH] },
      },
      select: { id: true },
    });

    if (!customer) {
      throw new BadRequestException("Customer must be an active customer contact in this organization.");
    }

    if (!branchId) {
      return;
    }

    const branch = await this.prisma.branch.findFirst({ where: { id: branchId, organizationId }, select: { id: true } });
    if (!branch) {
      throw new BadRequestException("Branch does not exist in this organization.");
    }
  }

  private async validateOriginalInvoiceReference(
    organizationId: string,
    customerId: string,
    originalInvoiceId: string | undefined,
    creditNoteTotal: string,
    excludeCreditNoteId: string | undefined,
    executor: PrismaExecutor,
  ): Promise<void> {
    if (!originalInvoiceId) {
      return;
    }

    const invoice = await executor.salesInvoice.findFirst({
      where: { id: originalInvoiceId, organizationId },
      select: { id: true, customerId: true, status: true, total: true },
    });

    if (!invoice) {
      throw new BadRequestException("Original invoice must belong to this organization.");
    }
    if (invoice.customerId !== customerId) {
      throw new BadRequestException("Original invoice must belong to the selected customer.");
    }
    if (invoice.status !== SalesInvoiceStatus.FINALIZED) {
      throw new BadRequestException("Original invoice must be finalized and not voided.");
    }

    const where: Prisma.CreditNoteWhereInput = {
      organizationId,
      originalInvoiceId,
      status: { not: CreditNoteStatus.VOIDED },
    };
    if (excludeCreditNoteId) {
      where.id = { not: excludeCreditNoteId };
    }

    const existing = await executor.creditNote.aggregate({
      where,
      _sum: { total: true },
    });
    const totalCredits = toMoney(existing._sum.total).plus(creditNoteTotal);
    if (totalCredits.gt(invoice.total)) {
      throw new BadRequestException("Total non-voided credit notes cannot exceed the original invoice total.");
    }
  }

  private async prepareCreditNote(organizationId: string, lines: CreditNoteLineDto[]): Promise<PreparedCreditNote> {
    const itemIds = [...new Set(lines.map((line) => line.itemId).filter((value): value is string => Boolean(value)))];
    const items = await this.prisma.item.findMany({
      where: { organizationId, id: { in: itemIds }, status: ItemStatus.ACTIVE },
      select: { id: true, name: true, description: true, revenueAccountId: true, salesTaxRateId: true },
    });

    if (items.length !== itemIds.length) {
      throw new BadRequestException("One or more items do not exist or are disabled.");
    }

    const itemsById = new Map(items.map((item) => [item.id, item]));
    const baseLines = lines.map((line, index) => {
      const item = line.itemId ? itemsById.get(line.itemId) : undefined;
      const accountId = this.cleanOptional(line.accountId ?? undefined) ?? item?.revenueAccountId;
      const taxRateId =
        line.taxRateId === undefined ? item?.salesTaxRateId ?? undefined : this.cleanOptional(line.taxRateId ?? undefined);
      const description = this.cleanOptional(line.description) ?? item?.description ?? item?.name;

      if (!accountId) {
        throw new BadRequestException(`Credit note line ${index + 1} requires a revenue account.`);
      }

      if (!description) {
        throw new BadRequestException(`Credit note line ${index + 1} requires a description.`);
      }

      return {
        itemId: this.cleanOptional(line.itemId ?? undefined),
        description,
        accountId,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        discountRate: line.discountRate ?? "0.0000",
        taxRateId,
        sortOrder: line.sortOrder ?? index,
      };
    });

    await this.validateLineAccounts(organizationId, baseLines.map((line) => line.accountId));
    const taxRatesById = await this.getTaxRatesById(
      organizationId,
      baseLines.map((line) => line.taxRateId).filter((value): value is string => Boolean(value)),
    );

    const totals = this.calculateTotals(
      baseLines.map((line) => ({
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        discountRate: line.discountRate,
        taxRate: line.taxRateId ? String(taxRatesById.get(line.taxRateId)?.rate ?? "0.0000") : "0.0000",
      })),
    );

    return {
      subtotal: totals.subtotal,
      discountTotal: totals.discountTotal,
      taxableTotal: totals.taxableTotal,
      taxTotal: totals.taxTotal,
      total: totals.total,
      lines: baseLines.map((line, index) => {
        const calculated = totals.lines[index];
        if (!calculated) {
          throw new BadRequestException("Unable to calculate credit note line totals.");
        }

        return {
          ...line,
          quantity: calculated.quantity,
          unitPrice: calculated.unitPrice,
          discountRate: calculated.discountRate,
          taxRate: calculated.taxRate,
          lineGrossAmount: calculated.lineGrossAmount,
          discountAmount: calculated.discountAmount,
          taxableAmount: calculated.taxableAmount,
          taxAmount: calculated.taxAmount,
          lineTotal: calculated.lineTotal,
        };
      }),
    };
  }

  private calculateTotals(lines: Parameters<typeof calculateSalesInvoiceTotals>[0]) {
    try {
      return calculateSalesInvoiceTotals(lines);
    } catch (error) {
      if (error instanceof AccountingRuleError) {
        throw new BadRequestException({ code: error.code, message: error.message });
      }
      throw error;
    }
  }

  private assertFinalizableCreditNote(totals: ReturnType<typeof calculateSalesInvoiceTotals>): void {
    try {
      assertFinalizableSalesInvoice(totals);
    } catch (error) {
      if (error instanceof AccountingRuleError) {
        throw new BadRequestException({ code: error.code, message: error.message });
      }
      throw error;
    }
  }

  private async validateLineAccounts(organizationId: string, accountIds: string[]): Promise<void> {
    const uniqueAccountIds = [...new Set(accountIds)];
    const accounts = await this.prisma.account.findMany({
      where: {
        organizationId,
        id: { in: uniqueAccountIds },
        type: AccountType.REVENUE,
        isActive: true,
        allowPosting: true,
      },
      select: { id: true },
    });

    if (accounts.length !== uniqueAccountIds.length) {
      throw new BadRequestException("Credit note line accounts must be active posting revenue accounts in this organization.");
    }
  }

  private async getTaxRatesById(organizationId: string, taxRateIds: string[]) {
    const uniqueTaxRateIds = [...new Set(taxRateIds)];
    if (uniqueTaxRateIds.length === 0) {
      return new Map<string, { id: string; rate: Prisma.Decimal }>();
    }

    const taxRates = await this.prisma.taxRate.findMany({
      where: {
        organizationId,
        id: { in: uniqueTaxRateIds },
        isActive: true,
        scope: { in: [TaxRateScope.SALES, TaxRateScope.BOTH] },
      },
      select: { id: true, rate: true },
    });

    if (taxRates.length !== uniqueTaxRateIds.length) {
      throw new BadRequestException("Credit note tax rates must be active sales tax rates in this organization.");
    }

    return new Map(taxRates.map((taxRate) => [taxRate.id, taxRate]));
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

  private assertDraft(status: CreditNoteStatus): void {
    if (status !== CreditNoteStatus.DRAFT) {
      throw new BadRequestException("Only draft credit notes can be edited.");
    }
  }

  private assertPositiveMoney(value: string, label: string) {
    const amount = toMoney(value);
    if (amount.lte(0)) {
      throw new BadRequestException(`${label} must be greater than zero.`);
    }
    return amount;
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

  private toLineCreateMany(organizationId: string, lines: PreparedLine[]): Prisma.CreditNoteLineCreateWithoutCreditNoteInput[] {
    return lines.map((line) => ({
      organization: { connect: { id: organizationId } },
      item: line.itemId ? { connect: { id: line.itemId } } : undefined,
      account: { connect: { id: line.accountId } },
      taxRate: line.taxRateId ? { connect: { id: line.taxRateId } } : undefined,
      description: line.description,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      discountRate: line.discountRate,
      lineGrossAmount: line.lineGrossAmount,
      discountAmount: line.discountAmount,
      taxableAmount: line.taxableAmount,
      taxAmount: line.taxAmount,
      lineTotal: line.lineTotal,
      sortOrder: line.sortOrder,
    }));
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
