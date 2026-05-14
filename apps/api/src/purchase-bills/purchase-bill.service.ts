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
import { PurchaseBillPdfData, renderPurchaseBillPdf } from "@ledgerbyte/pdf-core";
import {
  AccountType,
  ContactType,
  DocumentType,
  ItemStatus,
  JournalEntryStatus,
  NumberSequenceScope,
  Prisma,
  PurchaseBillInventoryPostingMode,
  PurchaseBillStatus,
  PurchaseDebitNoteStatus,
  SupplierPaymentStatus,
  TaxRateScope,
  InventoryPurchasePostingMode,
  InventoryValuationMethod,
} from "@prisma/client";
import { AuditLogService } from "../audit-log/audit-log.service";
import { OrganizationDocumentSettingsService } from "../document-settings/organization-document-settings.service";
import { GeneratedDocumentService, sanitizeFilename } from "../generated-documents/generated-document.service";
import { FiscalPeriodGuardService } from "../fiscal-periods/fiscal-period-guard.service";
import { NumberSequenceService } from "../number-sequences/number-sequence.service";
import { PrismaService } from "../prisma/prisma.service";
import { CreatePurchaseBillDto } from "./dto/create-purchase-bill.dto";
import { PurchaseBillLineDto } from "./dto/purchase-bill-line.dto";
import { UpdatePurchaseBillDto } from "./dto/update-purchase-bill.dto";
import { buildPurchaseBillJournalLines, PurchaseBillPostingLine } from "./purchase-bill-accounting";

const accountPreviewSelect = {
  id: true,
  code: true,
  name: true,
  type: true,
  allowPosting: true,
  isActive: true,
} satisfies Prisma.AccountSelect;

const purchaseBillInclude = {
  supplier: { select: { id: true, name: true, displayName: true, type: true, taxNumber: true } },
  branch: { select: { id: true, name: true, displayName: true, taxNumber: true } },
  purchaseOrder: { select: { id: true, purchaseOrderNumber: true, status: true, orderDate: true, total: true } },
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
      item: { select: { id: true, name: true, sku: true, inventoryTracking: true } },
      account: { select: { id: true, code: true, name: true, type: true } },
      taxRate: { select: { id: true, name: true, rate: true } },
    },
  },
  paymentAllocations: {
    orderBy: { createdAt: "asc" as const },
    include: {
      payment: {
        select: {
          id: true,
          paymentNumber: true,
          paymentDate: true,
          amountPaid: true,
          unappliedAmount: true,
          status: true,
        },
      },
    },
  },
  supplierPaymentUnappliedAllocations: {
    orderBy: { createdAt: "asc" as const },
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
  },
  debitNotes: {
    orderBy: { issueDate: "desc" as const },
    include: {
      journalEntry: { select: { id: true, entryNumber: true, status: true } },
      reversalJournalEntry: { select: { id: true, entryNumber: true, status: true } },
    },
  },
  debitNoteAllocations: {
    orderBy: { createdAt: "asc" as const },
    include: {
      debitNote: {
        select: {
          id: true,
          debitNoteNumber: true,
          issueDate: true,
          currency: true,
          status: true,
          total: true,
          unappliedAmount: true,
        },
      },
      reversedBy: { select: { id: true, name: true, email: true } },
    },
  },
};

interface PreparedLine {
  itemId?: string;
  inventoryTracking: boolean;
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

interface PreparedPurchaseBill {
  subtotal: string;
  discountTotal: string;
  taxableTotal: string;
  taxTotal: string;
  total: string;
  lines: PreparedLine[];
}

type PrismaExecutor = PrismaService | Prisma.TransactionClient;

interface PurchaseBillPreviewLine {
  side: "DEBIT" | "CREDIT";
  accountId: string | null;
  accountCode: string | null;
  accountName: string;
  amount: string;
  description: string;
}

@Injectable()
export class PurchaseBillService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
    private readonly numberSequenceService: NumberSequenceService,
    private readonly documentSettingsService?: OrganizationDocumentSettingsService,
    private readonly generatedDocumentService?: GeneratedDocumentService,
    private readonly fiscalPeriodGuardService?: FiscalPeriodGuardService,
  ) {}

  list(organizationId: string) {
    return this.prisma.purchaseBill.findMany({
      where: { organizationId },
      orderBy: { billDate: "desc" },
      include: {
        supplier: { select: { id: true, name: true, displayName: true } },
        branch: { select: { id: true, name: true, displayName: true } },
        purchaseOrder: { select: { id: true, purchaseOrderNumber: true, status: true, orderDate: true, total: true } },
        journalEntry: { select: { id: true, entryNumber: true, status: true } },
        reversalJournalEntry: { select: { id: true, entryNumber: true, status: true } },
      },
    });
  }

  async listOpen(organizationId: string, supplierId?: string) {
    if (supplierId) {
      await this.validateSupplier(organizationId, supplierId);
    }

    return this.prisma.purchaseBill.findMany({
      where: {
        organizationId,
        supplierId,
        status: PurchaseBillStatus.FINALIZED,
        balanceDue: { gt: 0 },
      },
      orderBy: { billDate: "asc" },
      include: {
        supplier: { select: { id: true, name: true, displayName: true } },
        journalEntry: { select: { id: true, entryNumber: true, status: true } },
      },
    });
  }

  async get(organizationId: string, id: string) {
    const bill = await this.prisma.purchaseBill.findFirst({
      where: { id, organizationId },
      include: purchaseBillInclude,
    });

    if (!bill) {
      throw new NotFoundException("Purchase bill not found.");
    }

    return bill;
  }

  async accountingPreview(organizationId: string, id: string) {
    const bill = await this.prisma.purchaseBill.findFirst({
      where: { id, organizationId },
      include: {
        supplier: { select: { id: true, name: true, displayName: true } },
        lines: {
          orderBy: { sortOrder: "asc" },
          include: {
            item: { select: { id: true, name: true, sku: true, inventoryTracking: true } },
            account: { select: accountPreviewSelect },
          },
        },
      },
    });

    if (!bill) {
      throw new NotFoundException("Purchase bill not found.");
    }

    const inventoryTrackedLineCount = bill.lines.filter((line) => line.item?.inventoryTracking === true).length;
    const directLineCount = bill.lines.length - inventoryTrackedLineCount;
    const clearingReadiness = await this.inventoryClearingModeReadiness(organizationId, bill.lines);
    const blockingReasons: string[] = [];
    const warnings = ["Purchase bill accounting preview does not create journals."];

    const accountsPayableAccount = await this.findPreviewPostingAccountByCode(organizationId, "210");
    const vatReceivableAccount = await this.findPreviewPostingAccountByCode(organizationId, "230");
    if (!accountsPayableAccount) {
      blockingReasons.push("Accounts Payable account code 210 is required for purchase bill posting preview.");
    }
    if (!vatReceivableAccount && toMoney(String(bill.taxTotal)).gt(0)) {
      blockingReasons.push("VAT Receivable account code 230 is required for purchase bill posting preview.");
    }

    if (bill.inventoryPostingMode === PurchaseBillInventoryPostingMode.INVENTORY_CLEARING) {
      blockingReasons.push(...clearingReadiness.blockingReasons);
      if (!toMoney(String(bill.total)).gt(0)) {
        blockingReasons.push("Inventory clearing purchase bills must have a positive total before finalization.");
      }
      warnings.push("Inventory clearing mode does not post inventory asset entries from receipts yet.");
      warnings.push("Purchase receipt GL posting remains disabled.");
      warnings.push("Use only after accountant review.");
    }

    const previewLines =
      accountsPayableAccount &&
      (vatReceivableAccount || toMoney(String(bill.taxTotal)).eq(0)) &&
      (bill.inventoryPostingMode !== PurchaseBillInventoryPostingMode.INVENTORY_CLEARING || clearingReadiness.clearingAccount)
        ? this.purchaseBillPreviewJournalLines({
            bill,
            accountsPayableAccount,
            vatReceivableAccount,
            clearingAccount: clearingReadiness.clearingAccount,
          })
        : [];
    const totals = getJournalTotals(
      previewLines.map((line) => ({
        accountId: line.accountId ?? "missing-account",
        debit: line.side === "DEBIT" ? line.amount : "0.0000",
        credit: line.side === "CREDIT" ? line.amount : "0.0000",
        description: line.description,
        currency: bill.currency,
        exchangeRate: "1",
      })),
    );

    const canFinalize =
      bill.status === PurchaseBillStatus.DRAFT &&
      (bill.inventoryPostingMode !== PurchaseBillInventoryPostingMode.INVENTORY_CLEARING || toMoney(String(bill.total)).gt(0)) &&
      blockingReasons.length === 0;

    return {
      sourceType: "PurchaseBill",
      sourceId: bill.id,
      sourceNumber: bill.billNumber,
      previewOnly: true,
      inventoryPostingMode: bill.inventoryPostingMode,
      canFinalize,
      canUseInventoryClearingMode: clearingReadiness.blockingReasons.length === 0,
      blockingReasons: [...new Set(blockingReasons)],
      warnings: [...new Set(warnings)],
      inventoryTrackedLineCount,
      directLineCount,
      clearingAccount: clearingReadiness.clearingAccount,
      vatReceivableAccount,
      accountsPayableAccount,
      journal: {
        description: `Purchase bill ${bill.billNumber} - ${bill.supplier.displayName ?? bill.supplier.name}`,
        entryDate: bill.billDate.toISOString(),
        totalDebit: totals.debit,
        totalCredit: totals.credit,
        lines: previewLines.map((line, index) => ({ lineNumber: index + 1, ...line })),
      },
      journalPreview: previewLines.map((line, index) => ({ lineNumber: index + 1, ...line })),
    };
  }

  async debitNotes(organizationId: string, id: string) {
    const bill = await this.prisma.purchaseBill.findFirst({ where: { id, organizationId }, select: { id: true } });
    if (!bill) {
      throw new NotFoundException("Purchase bill not found.");
    }

    return this.prisma.purchaseDebitNote.findMany({
      where: { organizationId, originalBillId: id },
      orderBy: { issueDate: "desc" },
      include: {
        supplier: { select: { id: true, name: true, displayName: true } },
        journalEntry: { select: { id: true, entryNumber: true, status: true } },
        reversalJournalEntry: { select: { id: true, entryNumber: true, status: true } },
      },
    });
  }

  async debitNoteAllocations(organizationId: string, id: string) {
    const bill = await this.prisma.purchaseBill.findFirst({ where: { id, organizationId }, select: { id: true } });
    if (!bill) {
      throw new NotFoundException("Purchase bill not found.");
    }

    return this.prisma.purchaseDebitNoteAllocation.findMany({
      where: { organizationId, billId: id },
      orderBy: { createdAt: "asc" },
      include: {
        debitNote: {
          select: {
            id: true,
            debitNoteNumber: true,
            issueDate: true,
            currency: true,
            status: true,
            total: true,
            unappliedAmount: true,
          },
        },
        reversedBy: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async supplierPaymentUnappliedAllocations(organizationId: string, id: string) {
    const bill = await this.prisma.purchaseBill.findFirst({ where: { id, organizationId }, select: { id: true } });
    if (!bill) {
      throw new NotFoundException("Purchase bill not found.");
    }

    return this.prisma.supplierPaymentUnappliedAllocation.findMany({
      where: { organizationId, billId: id },
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

  async pdfData(organizationId: string, id: string): Promise<PurchaseBillPdfData> {
    const bill = await this.prisma.purchaseBill.findFirst({
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
        journalEntry: { select: { id: true, entryNumber: true, status: true } },
        paymentAllocations: {
          orderBy: { createdAt: "asc" },
          include: {
            payment: {
              select: {
                id: true,
                paymentNumber: true,
                paymentDate: true,
                amountPaid: true,
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

    if (!bill) {
      throw new NotFoundException("Purchase bill not found.");
    }

    return {
      organization: bill.organization,
      supplier: bill.supplier,
      bill: {
        id: bill.id,
        billNumber: bill.billNumber,
        status: bill.status,
        billDate: bill.billDate,
        dueDate: bill.dueDate,
        currency: bill.currency,
        notes: bill.notes,
        terms: bill.terms,
        subtotal: moneyString(bill.subtotal),
        discountTotal: moneyString(bill.discountTotal),
        taxableTotal: moneyString(bill.taxableTotal),
        taxTotal: moneyString(bill.taxTotal),
        total: moneyString(bill.total),
        balanceDue: moneyString(bill.balanceDue),
      },
      lines: bill.lines.map((line) => ({
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
      allocations: bill.paymentAllocations.map((allocation) => ({
        paymentId: allocation.paymentId,
        paymentNumber: allocation.payment.paymentNumber,
        paymentDate: allocation.payment.paymentDate,
        amountPaid: moneyString(allocation.payment.amountPaid),
        amountApplied: moneyString(allocation.amountApplied),
        status: allocation.payment.status,
      })),
      journalEntry: bill.journalEntry,
      generatedAt: new Date(),
    };
  }

  async pdf(
    organizationId: string,
    actorUserId: string,
    id: string,
  ): Promise<{ data: PurchaseBillPdfData; buffer: Buffer; filename: string; document: unknown | null }> {
    const data = await this.pdfData(organizationId, id);
    const settings = await this.documentSettingsService?.invoiceRenderSettings(organizationId);
    const buffer = await renderPurchaseBillPdf(data, { ...settings, title: "Purchase Bill" });
    const filename = sanitizeFilename(`purchase-bill-${data.bill.billNumber}.pdf`);
    const document = await this.generatedDocumentService?.archivePdf({
      organizationId,
      documentType: DocumentType.PURCHASE_BILL,
      sourceType: "PurchaseBill",
      sourceId: data.bill.id,
      documentNumber: data.bill.billNumber,
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

  async create(organizationId: string, actorUserId: string, dto: CreatePurchaseBillDto) {
    const prepared = await this.preparePurchaseBill(organizationId, dto.lines);
    await this.validateHeaderReferences(organizationId, dto.supplierId, dto.branchId ?? undefined);
    const inventoryPostingMode = dto.inventoryPostingMode ?? PurchaseBillInventoryPostingMode.DIRECT_EXPENSE_OR_ASSET;
    await this.validateInventoryPostingMode(organizationId, inventoryPostingMode, prepared.lines);

    const currency = (dto.currency ?? "SAR").toUpperCase();
    const bill = await this.prisma.$transaction(async (tx) => {
      const billNumber = await this.numberSequenceService.next(organizationId, NumberSequenceScope.BILL, tx);

      return tx.purchaseBill.create({
        data: {
          organizationId,
          billNumber,
          supplierId: dto.supplierId,
          branchId: this.cleanOptional(dto.branchId ?? undefined),
          billDate: new Date(dto.billDate),
          dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
          currency,
          subtotal: prepared.subtotal,
          inventoryPostingMode,
          discountTotal: prepared.discountTotal,
          taxableTotal: prepared.taxableTotal,
          taxTotal: prepared.taxTotal,
          total: prepared.total,
          balanceDue: prepared.total,
          notes: this.cleanOptional(dto.notes),
          terms: this.cleanOptional(dto.terms),
          createdById: actorUserId,
          lines: { create: this.toLineCreateMany(organizationId, prepared.lines) },
        },
        include: purchaseBillInclude,
      });
    });

    await this.auditLogService.log({ organizationId, actorUserId, action: "CREATE", entityType: "PurchaseBill", entityId: bill.id, after: bill });
    return bill;
  }

  async update(organizationId: string, actorUserId: string, id: string, dto: UpdatePurchaseBillDto) {
    const existing = await this.get(organizationId, id);
    this.assertDraft(existing.status);

    const nextSupplierId = dto.supplierId ?? existing.supplierId;
    const nextBranchId = Object.prototype.hasOwnProperty.call(dto, "branchId")
      ? this.cleanOptional(dto.branchId ?? undefined)
      : existing.branchId ?? undefined;

    if (dto.supplierId || Object.prototype.hasOwnProperty.call(dto, "branchId")) {
      await this.validateHeaderReferences(organizationId, nextSupplierId, nextBranchId);
    }

    const prepared = dto.lines ? await this.preparePurchaseBill(organizationId, dto.lines) : null;
    const nextInventoryPostingMode = dto.inventoryPostingMode ?? existing.inventoryPostingMode;
    await this.validateInventoryPostingMode(
      organizationId,
      nextInventoryPostingMode,
      prepared?.lines ?? existing.lines?.map((line) => ({ itemId: line.itemId, inventoryTracking: line.item?.inventoryTracking === true })) ?? [],
    );
    const updated = await this.prisma.$transaction(async (tx) => {
      if (prepared) {
        await tx.purchaseBillLine.deleteMany({ where: { organizationId, billId: id } });
      }

      return tx.purchaseBill.update({
        where: { id },
        data: {
          supplierId: dto.supplierId,
          branchId: Object.prototype.hasOwnProperty.call(dto, "branchId") ? nextBranchId ?? null : undefined,
          billDate: dto.billDate ? new Date(dto.billDate) : undefined,
          dueDate: Object.prototype.hasOwnProperty.call(dto, "dueDate") ? (dto.dueDate ? new Date(dto.dueDate) : null) : undefined,
          currency: dto.currency?.toUpperCase(),
          inventoryPostingMode: dto.inventoryPostingMode,
          subtotal: prepared?.subtotal,
          discountTotal: prepared?.discountTotal,
          taxableTotal: prepared?.taxableTotal,
          taxTotal: prepared?.taxTotal,
          total: prepared?.total,
          balanceDue: prepared?.total,
          notes: dto.notes === undefined ? undefined : this.cleanOptional(dto.notes),
          terms: dto.terms === undefined ? undefined : this.cleanOptional(dto.terms),
          lines: prepared ? { create: this.toLineCreateMany(organizationId, prepared.lines) } : undefined,
        },
        include: purchaseBillInclude,
      });
    });

    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: "UPDATE",
      entityType: "PurchaseBill",
      entityId: id,
      before: existing,
      after: updated,
    });
    return updated;
  }

  async finalize(organizationId: string, actorUserId: string, id: string) {
    const existing = await this.get(organizationId, id);
    if (existing.status === PurchaseBillStatus.FINALIZED && existing.journalEntryId) {
      return existing;
    }
    if (existing.status === PurchaseBillStatus.FINALIZED) {
      throw new BadRequestException("Finalized purchase bill is missing its journal entry.");
    }
    if (existing.status === PurchaseBillStatus.VOIDED) {
      throw new BadRequestException("Voided purchase bills cannot be finalized.");
    }

    const finalized = await this.prisma.$transaction(async (tx) => {
      const bill = await tx.purchaseBill.findFirst({
        where: { id, organizationId },
        include: {
          supplier: { select: { id: true, name: true, displayName: true } },
          lines: {
            orderBy: { sortOrder: "asc" },
            include: {
              item: { select: { id: true, inventoryTracking: true } },
              account: true,
            },
          },
        },
      });

      if (!bill) {
        throw new NotFoundException("Purchase bill not found.");
      }
      if (bill.status === PurchaseBillStatus.FINALIZED && bill.journalEntryId) {
        return tx.purchaseBill.findUniqueOrThrow({ where: { id }, include: purchaseBillInclude });
      }
      if (bill.status === PurchaseBillStatus.FINALIZED) {
        throw new BadRequestException("Finalized purchase bill is missing its journal entry.");
      }
      if (bill.status === PurchaseBillStatus.VOIDED) {
        throw new BadRequestException("Voided purchase bills cannot be finalized.");
      }
      if (bill.status !== PurchaseBillStatus.DRAFT) {
        throw new BadRequestException("Only draft purchase bills can be finalized.");
      }
      await this.assertPostingDateAllowed(organizationId, bill.billDate, tx);

      this.assertFinalizablePurchaseBill({
        subtotal: String(bill.subtotal),
        discountTotal: String(bill.discountTotal),
        taxableTotal: String(bill.taxableTotal),
        taxTotal: String(bill.taxTotal),
        total: String(bill.total),
        lines: bill.lines.map((line) => ({
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

      const clearingReadiness =
        bill.inventoryPostingMode === PurchaseBillInventoryPostingMode.INVENTORY_CLEARING
          ? await this.inventoryClearingModeReadiness(organizationId, bill.lines, tx)
          : { clearingAccount: null, blockingReasons: [] };
      if (bill.inventoryPostingMode === PurchaseBillInventoryPostingMode.INVENTORY_CLEARING) {
        const clearingBlockingReasons = [...clearingReadiness.blockingReasons];
        if (!toMoney(String(bill.total)).gt(0)) {
          clearingBlockingReasons.push("Inventory clearing purchase bills must have a positive total before finalization.");
        }
        if (clearingBlockingReasons.length > 0) {
          throw new BadRequestException([...new Set(clearingBlockingReasons)]);
        }
      }

      const claim = await tx.purchaseBill.updateMany({
        where: {
          id,
          organizationId,
          status: PurchaseBillStatus.DRAFT,
          journalEntryId: null,
        },
        data: {
          status: PurchaseBillStatus.FINALIZED,
          finalizedAt: new Date(),
          balanceDue: bill.total,
        },
      });
      if (claim.count !== 1) {
        return tx.purchaseBill.findUniqueOrThrow({ where: { id }, include: purchaseBillInclude });
      }

      const accountsPayableAccount = await this.findPostingAccountByCode(organizationId, "210", tx);
      const vatReceivableAccount = await this.findPostingAccountByCode(organizationId, "230", tx);
      const journalLines = buildPurchaseBillJournalLines({
        accountsPayableAccountId: accountsPayableAccount.id,
        vatReceivableAccountId: vatReceivableAccount.id,
        billNumber: bill.billNumber,
        supplierName: bill.supplier.displayName ?? bill.supplier.name,
        currency: bill.currency,
        total: String(bill.total),
        taxTotal: String(bill.taxTotal),
        lines: this.purchaseBillPostingLinesForMode(bill.inventoryPostingMode, bill.lines, clearingReadiness.clearingAccount?.id ?? null),
      });

      const entryNumber = await this.numberSequenceService.next(organizationId, NumberSequenceScope.JOURNAL_ENTRY, tx);
      const journalEntry = await tx.journalEntry.create({
        data: {
          organizationId,
          entryNumber,
          status: JournalEntryStatus.POSTED,
          entryDate: bill.billDate,
          description: `Purchase bill ${bill.billNumber} - ${bill.supplier.displayName ?? bill.supplier.name}`,
          reference: bill.billNumber,
          currency: bill.currency,
          totalDebit: bill.total,
          totalCredit: bill.total,
          postedAt: new Date(),
          postedById: actorUserId,
          createdById: actorUserId,
          lines: { create: this.toJournalLineCreateMany(organizationId, journalLines) },
        },
      });

      return tx.purchaseBill.update({
        where: { id },
        data: { journalEntryId: journalEntry.id },
        include: purchaseBillInclude,
      });
    });

    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: "FINALIZE",
      entityType: "PurchaseBill",
      entityId: id,
      before: existing,
      after: finalized,
    });
    return finalized;
  }

  async void(organizationId: string, actorUserId: string, id: string) {
    const existing = await this.get(organizationId, id);
    if (existing.status === PurchaseBillStatus.VOIDED) {
      return existing;
    }

    const voided = await this.prisma.$transaction(async (tx) => {
      const bill = await tx.purchaseBill.findFirst({ where: { id, organizationId } });
      if (!bill) {
        throw new NotFoundException("Purchase bill not found.");
      }
      if (bill.status === PurchaseBillStatus.VOIDED) {
        return tx.purchaseBill.findUniqueOrThrow({ where: { id }, include: purchaseBillInclude });
      }
      if (bill.status === PurchaseBillStatus.DRAFT) {
        await tx.purchaseBill.updateMany({
          where: { id, organizationId, status: PurchaseBillStatus.DRAFT },
          data: { status: PurchaseBillStatus.VOIDED, balanceDue: "0.0000" },
        });
        return tx.purchaseBill.findUniqueOrThrow({ where: { id }, include: purchaseBillInclude });
      }
      if (bill.status !== PurchaseBillStatus.FINALIZED) {
        throw new BadRequestException("Only draft or finalized purchase bills can be voided.");
      }
      if (!bill.journalEntryId) {
        throw new BadRequestException("Finalized purchase bill is missing its journal entry.");
      }
      const reversalDate = new Date();
      await this.assertPostingDateAllowed(organizationId, reversalDate, tx);

      const activePaymentCount = await tx.supplierPaymentAllocation.count({
        where: {
          billId: id,
          organizationId,
          payment: { status: { not: SupplierPaymentStatus.VOIDED } },
        },
      });
      if (activePaymentCount > 0) {
        throw new BadRequestException("Cannot void purchase bill with active supplier payment allocations. Void payments first.");
      }

      const activeDebitNoteAllocationCount = await tx.purchaseDebitNoteAllocation.count({
        where: {
          billId: id,
          organizationId,
          reversedAt: null,
          debitNote: { status: PurchaseDebitNoteStatus.FINALIZED },
        },
      });
      if (activeDebitNoteAllocationCount > 0) {
        throw new BadRequestException("Cannot void purchase bill with active purchase debit note allocations. Reverse allocations first.");
      }

      const activeSupplierPaymentUnappliedAllocationCount = await tx.supplierPaymentUnappliedAllocation.count({
        where: {
          billId: id,
          organizationId,
          reversedAt: null,
          payment: { status: SupplierPaymentStatus.POSTED },
        },
      });
      if (activeSupplierPaymentUnappliedAllocationCount > 0) {
        throw new BadRequestException("Cannot void purchase bill with active supplier payment unapplied allocations. Reverse allocations first.");
      }

      const claim = await tx.purchaseBill.updateMany({
        where: { id, organizationId, status: PurchaseBillStatus.FINALIZED },
        data: { status: PurchaseBillStatus.VOIDED, balanceDue: "0.0000" },
      });
      if (claim.count !== 1) {
        return tx.purchaseBill.findUniqueOrThrow({ where: { id }, include: purchaseBillInclude });
      }

      const reversalJournalEntryId = await this.createOrReuseReversalJournal(organizationId, actorUserId, bill.journalEntryId, reversalDate, tx);
      return tx.purchaseBill.update({
        where: { id },
        data: { reversalJournalEntryId },
        include: purchaseBillInclude,
      });
    });

    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: "VOID",
      entityType: "PurchaseBill",
      entityId: id,
      before: existing,
      after: voided,
    });
    return voided;
  }

  async remove(organizationId: string, actorUserId: string, id: string) {
    const existing = await this.get(organizationId, id);
    if (existing.status !== PurchaseBillStatus.DRAFT || existing.journalEntryId) {
      throw new BadRequestException("Only draft purchase bills without journal entries can be deleted.");
    }

    await this.prisma.purchaseBill.delete({ where: { id } });
    await this.auditLogService.log({ organizationId, actorUserId, action: "DELETE", entityType: "PurchaseBill", entityId: id, before: existing });
    return { deleted: true };
  }

  private purchaseBillPreviewJournalLines({
    bill,
    accountsPayableAccount,
    vatReceivableAccount,
    clearingAccount,
  }: {
    bill: {
      billNumber: string;
      supplier: { name: string; displayName: string | null };
      currency: string;
      total: Prisma.Decimal | string;
      taxTotal: Prisma.Decimal | string;
      inventoryPostingMode: PurchaseBillInventoryPostingMode;
      lines: Array<{
        description: string;
        accountId: string;
        taxableAmount: Prisma.Decimal | string;
        item: { inventoryTracking: boolean } | null;
        account: { id: string; code: string; name: string };
      }>;
    };
    accountsPayableAccount: { id: string; code: string; name: string };
    vatReceivableAccount: { id: string; code: string; name: string } | null;
    clearingAccount: { id: string; code: string; name: string } | null;
  }): PurchaseBillPreviewLine[] {
    const previewAccounts = new Map<string, { id: string; code: string; name: string }>();
    previewAccounts.set(accountsPayableAccount.id, accountsPayableAccount);
    if (vatReceivableAccount) {
      previewAccounts.set(vatReceivableAccount.id, vatReceivableAccount);
    }
    if (clearingAccount) {
      previewAccounts.set(clearingAccount.id, clearingAccount);
    }
    for (const line of bill.lines) {
      previewAccounts.set(line.account.id, line.account);
    }

    const journalLines = buildPurchaseBillJournalLines({
      accountsPayableAccountId: accountsPayableAccount.id,
      vatReceivableAccountId: vatReceivableAccount?.id ?? accountsPayableAccount.id,
      billNumber: bill.billNumber,
      supplierName: bill.supplier.displayName ?? bill.supplier.name,
      currency: bill.currency,
      total: String(bill.total),
      taxTotal: String(bill.taxTotal),
      lines: this.purchaseBillPostingLinesForMode(bill.inventoryPostingMode, bill.lines, clearingAccount?.id ?? null),
    });

    return journalLines.reduce<PurchaseBillPreviewLine[]>((preview, line) => {
      const account = previewAccounts.get(line.accountId);
      const debit = toMoney(line.debit);
      const credit = toMoney(line.credit);
      if (debit.gt(0)) {
        preview.push({
          side: "DEBIT",
          accountId: line.accountId,
          accountCode: account?.code ?? null,
          accountName: account?.name ?? "Unknown account",
          amount: debit.toFixed(4),
          description: line.description ?? "",
        });
        return preview;
      }
      if (credit.gt(0)) {
        preview.push({
          side: "CREDIT",
          accountId: line.accountId,
          accountCode: account?.code ?? null,
          accountName: account?.name ?? "Unknown account",
          amount: credit.toFixed(4),
          description: line.description ?? "",
        });
        return preview;
      }
      return preview;
    }, []);
  }

  private async validateInventoryPostingMode(
    organizationId: string,
    mode: PurchaseBillInventoryPostingMode,
    lines: Array<{ itemId?: string | null; inventoryTracking?: boolean; item?: { inventoryTracking: boolean } | null }>,
  ): Promise<void> {
    if (mode === PurchaseBillInventoryPostingMode.DIRECT_EXPENSE_OR_ASSET) {
      return;
    }
    const readiness = await this.inventoryClearingModeReadiness(organizationId, lines);
    if (readiness.blockingReasons.length > 0) {
      throw new BadRequestException(readiness.blockingReasons);
    }
  }

  private purchaseBillPostingLinesForMode(
    mode: PurchaseBillInventoryPostingMode,
    lines: Array<{
      description: string;
      accountId: string;
      taxableAmount: Prisma.Decimal | string;
      item?: { inventoryTracking: boolean } | null;
    }>,
    clearingAccountId: string | null,
  ): PurchaseBillPostingLine[] {
    return lines.map((line) => {
      const useClearing = mode === PurchaseBillInventoryPostingMode.INVENTORY_CLEARING && line.item?.inventoryTracking === true && clearingAccountId;
      return {
        accountId: useClearing ? clearingAccountId : line.accountId,
        description: line.description,
        taxableAmount: String(line.taxableAmount),
      };
    });
  }

  private async inventoryClearingModeReadiness(
    organizationId: string,
    lines: Array<{ itemId?: string | null; inventoryTracking?: boolean; item?: { inventoryTracking: boolean } | null }>,
    executor: PrismaExecutor = this.prisma,
  ) {
    const settings = await executor.inventorySettings.findUnique({
      where: { organizationId },
      include: {
        inventoryAssetAccount: { select: accountPreviewSelect },
        inventoryClearingAccount: { select: accountPreviewSelect },
      },
    });
    const blockingReasons: string[] = [];
    const inventoryTrackedLines = lines.filter((line) => line.inventoryTracking === true || line.item?.inventoryTracking === true);
    const inventoryTrackedLineCount = inventoryTrackedLines.length;
    if (inventoryTrackedLineCount <= 0) {
      blockingReasons.push("Inventory clearing mode requires at least one inventory-tracked purchase bill line.");
    }
    if (inventoryTrackedLines.some((line) => !line.itemId)) {
      blockingReasons.push("Inventory clearing mode requires inventory-tracked lines to retain their item reference.");
    }
    if (!settings?.enableInventoryAccounting) {
      blockingReasons.push("Inventory accounting must be enabled before purchase bills can use inventory clearing mode.");
    }
    if (settings && settings.valuationMethod !== InventoryValuationMethod.MOVING_AVERAGE) {
      blockingReasons.push("Inventory clearing mode requires MOVING_AVERAGE valuation.");
    }
    if (settings && settings.purchaseReceiptPostingMode !== InventoryPurchasePostingMode.PREVIEW_ONLY) {
      blockingReasons.push("Purchase receipt posting mode must be PREVIEW_ONLY before purchase bills can use inventory clearing mode.");
    }
    const clearingAccount = settings?.inventoryClearingAccountId
      ? await executor.account.findFirst({
          where: { id: settings.inventoryClearingAccountId, organizationId },
          select: accountPreviewSelect,
        })
      : null;
    if (settings?.inventoryClearingAccountId && !clearingAccount) {
      blockingReasons.push("Inventory clearing account must belong to this organization.");
    } else if (!clearingAccount) {
      blockingReasons.push("Inventory clearing account mapping is required before purchase bills can use inventory clearing mode.");
    } else {
      if (!clearingAccount.isActive) {
        blockingReasons.push("Inventory clearing account must be active.");
      }
      if (!clearingAccount.allowPosting) {
        blockingReasons.push("Inventory clearing account must allow posting.");
      }
      if (clearingAccount.type !== AccountType.LIABILITY && clearingAccount.type !== AccountType.ASSET) {
        blockingReasons.push("Inventory clearing account must be LIABILITY or ASSET.");
      }
      if (clearingAccount.code === "210") {
        blockingReasons.push("Inventory clearing account must be separate from Accounts Payable account code 210.");
      }
    }
    if (settings?.inventoryAssetAccountId && settings.inventoryClearingAccountId === settings.inventoryAssetAccountId) {
      blockingReasons.push("Inventory clearing account must be separate from inventory asset account.");
    }

    return {
      clearingAccount,
      blockingReasons: [...new Set(blockingReasons)],
    };
  }

  private async findPreviewPostingAccountByCode(organizationId: string, code: string) {
    return this.prisma.account.findFirst({
      where: { organizationId, code, isActive: true, allowPosting: true },
      select: accountPreviewSelect,
    });
  }

  private async preparePurchaseBill(organizationId: string, lines: PurchaseBillLineDto[]): Promise<PreparedPurchaseBill> {
    const itemIds = lines.map((line) => this.cleanOptional(line.itemId ?? undefined)).filter((itemId): itemId is string => Boolean(itemId));
    const items = itemIds.length
      ? await this.prisma.item.findMany({
          where: { organizationId, id: { in: [...new Set(itemIds)] }, status: ItemStatus.ACTIVE },
          select: { id: true, name: true, description: true, expenseAccountId: true, purchaseTaxRateId: true, inventoryTracking: true },
        })
      : [];
    const itemsById = new Map(items.map((item) => [item.id, item]));

    if (items.length !== new Set(itemIds).size) {
      throw new BadRequestException("Purchase bill line items must be active items in this organization.");
    }

    const baseLines = lines.map((line, index) => {
      const itemId = this.cleanOptional(line.itemId ?? undefined);
      const item = itemId ? itemsById.get(itemId) : undefined;
      const accountId = this.cleanOptional(line.accountId ?? undefined) ?? item?.expenseAccountId ?? undefined;
      if (!accountId) {
        throw new BadRequestException(`Purchase bill line ${index + 1} requires an account.`);
      }
      const taxRateId = this.cleanOptional(line.taxRateId ?? undefined) ?? item?.purchaseTaxRateId ?? undefined;

      return {
        itemId,
        inventoryTracking: item?.inventoryTracking === true,
        description: this.cleanOptional(line.description) ?? item?.description ?? item?.name ?? `Line ${index + 1}`,
        accountId,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        discountRate: line.discountRate ?? "0",
        taxRateId,
        sortOrder: line.sortOrder ?? index,
      };
    });

    await this.validateLineAccounts(
      organizationId,
      baseLines.map((line) => line.accountId),
    );
    const taxRatesById = await this.getTaxRatesById(
      organizationId,
      baseLines.map((line) => line.taxRateId).filter((taxRateId): taxRateId is string => Boolean(taxRateId)),
    );

    const totals = this.calculateTotals(
      baseLines.map((line) => ({
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        discountRate: line.discountRate,
        taxRate: line.taxRateId ? String(taxRatesById.get(line.taxRateId)?.rate ?? "0") : "0",
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
          throw new BadRequestException("Unable to calculate purchase bill line totals.");
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

  private async validateHeaderReferences(organizationId: string, supplierId: string, branchId?: string): Promise<void> {
    await this.validateSupplier(organizationId, supplierId);

    if (!branchId) {
      return;
    }

    const branch = await this.prisma.branch.findFirst({ where: { id: branchId, organizationId }, select: { id: true } });
    if (!branch) {
      throw new BadRequestException("Branch does not exist in this organization.");
    }
  }

  private async validateSupplier(organizationId: string, supplierId: string): Promise<void> {
    const supplier = await this.prisma.contact.findFirst({
      where: {
        id: supplierId,
        organizationId,
        isActive: true,
        type: { in: [ContactType.SUPPLIER, ContactType.BOTH] },
      },
      select: { id: true },
    });

    if (!supplier) {
      throw new BadRequestException("Supplier must be an active supplier contact in this organization.");
    }
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

  private assertFinalizablePurchaseBill(totals: ReturnType<typeof calculateSalesInvoiceTotals>): void {
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
        type: { in: [AccountType.EXPENSE, AccountType.COST_OF_SALES, AccountType.ASSET] },
        isActive: true,
        allowPosting: true,
      },
      select: { id: true },
    });

    if (accounts.length !== uniqueAccountIds.length) {
      throw new BadRequestException("Purchase bill line accounts must be active posting expense, cost of sales, or asset accounts in this organization.");
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
        scope: { in: [TaxRateScope.PURCHASES, TaxRateScope.BOTH] },
      },
      select: { id: true, rate: true },
    });

    if (taxRates.length !== uniqueTaxRateIds.length) {
      throw new BadRequestException("Purchase bill tax rates must be active purchase tax rates in this organization.");
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

  private async assertPostingDateAllowed(organizationId: string, postingDate: string | Date, tx?: Prisma.TransactionClient): Promise<void> {
    await this.fiscalPeriodGuardService?.assertPostingDateAllowed(organizationId, postingDate, tx);
  }

  private assertDraft(status: PurchaseBillStatus): void {
    if (status !== PurchaseBillStatus.DRAFT) {
      throw new BadRequestException("Only draft purchase bills can be edited.");
    }
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

  private toLineCreateMany(organizationId: string, lines: PreparedLine[]): Prisma.PurchaseBillLineCreateWithoutBillInput[] {
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
