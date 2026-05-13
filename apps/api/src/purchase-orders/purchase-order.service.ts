import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import {
  AccountingRuleError,
  assertFinalizableSalesInvoice,
  calculateSalesInvoiceTotals,
} from "@ledgerbyte/accounting-core";
import { PurchaseOrderPdfData, renderPurchaseOrderPdf } from "@ledgerbyte/pdf-core";
import {
  AccountType,
  ContactType,
  DocumentType,
  ItemStatus,
  NumberSequenceScope,
  Prisma,
  PurchaseBillStatus,
  PurchaseOrderStatus,
  TaxRateScope,
} from "@prisma/client";
import { AuditLogService } from "../audit-log/audit-log.service";
import { OrganizationDocumentSettingsService } from "../document-settings/organization-document-settings.service";
import { GeneratedDocumentService, sanitizeFilename } from "../generated-documents/generated-document.service";
import { NumberSequenceService } from "../number-sequences/number-sequence.service";
import { PrismaService } from "../prisma/prisma.service";
import { CreatePurchaseOrderDto } from "./dto/create-purchase-order.dto";
import { PurchaseOrderLineDto } from "./dto/purchase-order-line.dto";
import { UpdatePurchaseOrderDto } from "./dto/update-purchase-order.dto";

const purchaseOrderInclude = {
  supplier: { select: { id: true, name: true, displayName: true, type: true, taxNumber: true, isActive: true } },
  branch: { select: { id: true, name: true, displayName: true, taxNumber: true } },
  convertedBill: { select: { id: true, billNumber: true, status: true, billDate: true, total: true } },
  lines: {
    orderBy: { sortOrder: "asc" as const },
    include: {
      item: { select: { id: true, name: true, sku: true, expenseAccountId: true } },
      account: { select: { id: true, code: true, name: true, type: true } },
      taxRate: { select: { id: true, name: true, rate: true } },
    },
  },
};

const convertedPurchaseBillInclude = {
  supplier: { select: { id: true, name: true, displayName: true, type: true, taxNumber: true } },
  branch: { select: { id: true, name: true, displayName: true, taxNumber: true } },
  purchaseOrder: { select: { id: true, purchaseOrderNumber: true, status: true, orderDate: true, total: true } },
  lines: {
    orderBy: { sortOrder: "asc" as const },
    include: {
      item: { select: { id: true, name: true, sku: true } },
      account: { select: { id: true, code: true, name: true, type: true } },
      taxRate: { select: { id: true, name: true, rate: true } },
    },
  },
};

interface PreparedLine {
  itemId?: string;
  description: string;
  accountId?: string;
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

interface PreparedPurchaseOrder {
  subtotal: string;
  discountTotal: string;
  taxableTotal: string;
  taxTotal: string;
  total: string;
  lines: PreparedLine[];
}

type PrismaExecutor = PrismaService | Prisma.TransactionClient;

@Injectable()
export class PurchaseOrderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
    private readonly numberSequenceService: NumberSequenceService,
    private readonly documentSettingsService?: OrganizationDocumentSettingsService,
    private readonly generatedDocumentService?: GeneratedDocumentService,
  ) {}

  list(organizationId: string) {
    return this.prisma.purchaseOrder.findMany({
      where: { organizationId },
      orderBy: { orderDate: "desc" },
      include: {
        supplier: { select: { id: true, name: true, displayName: true } },
        branch: { select: { id: true, name: true, displayName: true } },
        convertedBill: { select: { id: true, billNumber: true, status: true, billDate: true, total: true } },
      },
    });
  }

  async get(organizationId: string, id: string) {
    const order = await this.prisma.purchaseOrder.findFirst({
      where: { id, organizationId },
      include: purchaseOrderInclude,
    });

    if (!order) {
      throw new NotFoundException("Purchase order not found.");
    }

    return order;
  }

  async pdfData(organizationId: string, id: string): Promise<PurchaseOrderPdfData> {
    const order = await this.prisma.purchaseOrder.findFirst({
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
        convertedBill: { select: { id: true, billNumber: true, status: true } },
        lines: {
          orderBy: { sortOrder: "asc" },
          include: {
            taxRate: { select: { name: true } },
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException("Purchase order not found.");
    }

    return {
      organization: order.organization,
      supplier: order.supplier,
      purchaseOrder: {
        id: order.id,
        purchaseOrderNumber: order.purchaseOrderNumber,
        status: order.status,
        orderDate: order.orderDate,
        expectedDeliveryDate: order.expectedDeliveryDate,
        currency: order.currency,
        notes: order.notes,
        terms: order.terms,
        subtotal: moneyString(order.subtotal),
        discountTotal: moneyString(order.discountTotal),
        taxableTotal: moneyString(order.taxableTotal),
        taxTotal: moneyString(order.taxTotal),
        total: moneyString(order.total),
      },
      lines: order.lines.map((line) => ({
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
      convertedBill: order.convertedBill,
      generatedAt: new Date(),
    };
  }

  async pdf(
    organizationId: string,
    actorUserId: string,
    id: string,
  ): Promise<{ data: PurchaseOrderPdfData; buffer: Buffer; filename: string; document: unknown | null }> {
    const data = await this.pdfData(organizationId, id);
    const settings = await this.documentSettingsService?.invoiceRenderSettings(organizationId);
    const buffer = await renderPurchaseOrderPdf(data, { ...settings, title: "Purchase Order" });
    const filename = sanitizeFilename(`purchase-order-${data.purchaseOrder.purchaseOrderNumber}.pdf`);
    const document = await this.generatedDocumentService?.archivePdf({
      organizationId,
      documentType: DocumentType.PURCHASE_ORDER,
      sourceType: "PurchaseOrder",
      sourceId: data.purchaseOrder.id,
      documentNumber: data.purchaseOrder.purchaseOrderNumber,
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

  async create(organizationId: string, actorUserId: string, dto: CreatePurchaseOrderDto) {
    const prepared = await this.preparePurchaseOrder(organizationId, dto.lines);
    await this.validateHeaderReferences(organizationId, dto.supplierId, dto.branchId ?? undefined);

    const currency = (dto.currency ?? "SAR").toUpperCase();
    const order = await this.prisma.$transaction(async (tx) => {
      const purchaseOrderNumber = await this.numberSequenceService.next(organizationId, NumberSequenceScope.PURCHASE_ORDER, tx);

      return tx.purchaseOrder.create({
        data: {
          organizationId,
          purchaseOrderNumber,
          supplierId: dto.supplierId,
          branchId: this.cleanOptional(dto.branchId ?? undefined),
          orderDate: new Date(dto.orderDate),
          expectedDeliveryDate: dto.expectedDeliveryDate ? new Date(dto.expectedDeliveryDate) : null,
          currency,
          subtotal: prepared.subtotal,
          discountTotal: prepared.discountTotal,
          taxableTotal: prepared.taxableTotal,
          taxTotal: prepared.taxTotal,
          total: prepared.total,
          notes: this.cleanOptional(dto.notes),
          terms: this.cleanOptional(dto.terms),
          createdById: actorUserId,
          lines: { create: this.toLineCreateMany(organizationId, prepared.lines) },
        },
        include: purchaseOrderInclude,
      });
    });

    await this.auditLogService.log({ organizationId, actorUserId, action: "CREATE", entityType: "PurchaseOrder", entityId: order.id, after: order });
    return order;
  }

  async update(organizationId: string, actorUserId: string, id: string, dto: UpdatePurchaseOrderDto) {
    const existing = await this.get(organizationId, id);
    this.assertDraft(existing.status);

    const nextSupplierId = dto.supplierId ?? existing.supplierId;
    const nextBranchId = Object.prototype.hasOwnProperty.call(dto, "branchId")
      ? this.cleanOptional(dto.branchId ?? undefined)
      : existing.branchId ?? undefined;

    if (dto.supplierId || Object.prototype.hasOwnProperty.call(dto, "branchId")) {
      await this.validateHeaderReferences(organizationId, nextSupplierId, nextBranchId);
    }

    const prepared = dto.lines ? await this.preparePurchaseOrder(organizationId, dto.lines) : null;
    const updated = await this.prisma.$transaction(async (tx) => {
      if (prepared) {
        await tx.purchaseOrderLine.deleteMany({ where: { organizationId, purchaseOrderId: id } });
      }

      return tx.purchaseOrder.update({
        where: { id },
        data: {
          supplierId: dto.supplierId,
          branchId: Object.prototype.hasOwnProperty.call(dto, "branchId") ? nextBranchId ?? null : undefined,
          orderDate: dto.orderDate ? new Date(dto.orderDate) : undefined,
          expectedDeliveryDate: Object.prototype.hasOwnProperty.call(dto, "expectedDeliveryDate")
            ? dto.expectedDeliveryDate
              ? new Date(dto.expectedDeliveryDate)
              : null
            : undefined,
          currency: dto.currency?.toUpperCase(),
          subtotal: prepared?.subtotal,
          discountTotal: prepared?.discountTotal,
          taxableTotal: prepared?.taxableTotal,
          taxTotal: prepared?.taxTotal,
          total: prepared?.total,
          notes: dto.notes === undefined ? undefined : this.cleanOptional(dto.notes),
          terms: dto.terms === undefined ? undefined : this.cleanOptional(dto.terms),
          lines: prepared ? { create: this.toLineCreateMany(organizationId, prepared.lines) } : undefined,
        },
        include: purchaseOrderInclude,
      });
    });

    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: "UPDATE",
      entityType: "PurchaseOrder",
      entityId: id,
      before: existing,
      after: updated,
    });
    return updated;
  }

  async approve(organizationId: string, actorUserId: string, id: string) {
    const existing = await this.get(organizationId, id);
    if (existing.status === PurchaseOrderStatus.APPROVED) {
      return existing;
    }
    if (existing.status !== PurchaseOrderStatus.DRAFT) {
      throw new BadRequestException("Only draft purchase orders can be approved.");
    }
    this.assertFinalizablePurchaseOrder({
      subtotal: moneyString(existing.subtotal),
      discountTotal: moneyString(existing.discountTotal),
      taxableTotal: moneyString(existing.taxableTotal),
      taxTotal: moneyString(existing.taxTotal),
      total: moneyString(existing.total),
      lines: existing.lines.map((line) => ({
        quantity: moneyString(line.quantity),
        unitPrice: moneyString(line.unitPrice),
        discountRate: moneyString(line.discountRate),
        lineGrossAmount: moneyString(line.lineGrossAmount),
        discountAmount: moneyString(line.discountAmount),
        taxRate: "0.0000",
        taxableAmount: moneyString(line.taxableAmount),
        taxAmount: moneyString(line.taxAmount),
        lineTotal: moneyString(line.lineTotal),
      })),
    });

    const approved = await this.prisma.purchaseOrder.update({
      where: { id },
      data: { status: PurchaseOrderStatus.APPROVED, approvedAt: new Date() },
      include: purchaseOrderInclude,
    });
    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: "APPROVE",
      entityType: "PurchaseOrder",
      entityId: id,
      before: existing,
      after: approved,
    });
    return approved;
  }

  async markSent(organizationId: string, actorUserId: string, id: string) {
    const existing = await this.get(organizationId, id);
    if (existing.status === PurchaseOrderStatus.SENT) {
      return existing;
    }
    if (existing.status !== PurchaseOrderStatus.APPROVED) {
      throw new BadRequestException("Only approved purchase orders can be marked as sent.");
    }

    const sent = await this.prisma.purchaseOrder.update({
      where: { id },
      data: { status: PurchaseOrderStatus.SENT, sentAt: new Date() },
      include: purchaseOrderInclude,
    });
    await this.auditLogService.log({ organizationId, actorUserId, action: "MARK_SENT", entityType: "PurchaseOrder", entityId: id, before: existing, after: sent });
    return sent;
  }

  async close(organizationId: string, actorUserId: string, id: string) {
    const existing = await this.get(organizationId, id);
    if (existing.status === PurchaseOrderStatus.CLOSED) {
      return existing;
    }
    if (
      existing.status !== PurchaseOrderStatus.APPROVED &&
      existing.status !== PurchaseOrderStatus.SENT &&
      existing.status !== PurchaseOrderStatus.PARTIALLY_BILLED
    ) {
      throw new BadRequestException("Only approved, sent, or partially billed purchase orders can be closed.");
    }

    const closed = await this.prisma.purchaseOrder.update({
      where: { id },
      data: { status: PurchaseOrderStatus.CLOSED, closedAt: new Date() },
      include: purchaseOrderInclude,
    });
    await this.auditLogService.log({ organizationId, actorUserId, action: "CLOSE", entityType: "PurchaseOrder", entityId: id, before: existing, after: closed });
    return closed;
  }

  async void(organizationId: string, actorUserId: string, id: string) {
    const existing = await this.get(organizationId, id);
    if (existing.status === PurchaseOrderStatus.VOIDED) {
      return existing;
    }
    if (
      existing.status !== PurchaseOrderStatus.DRAFT &&
      existing.status !== PurchaseOrderStatus.APPROVED &&
      existing.status !== PurchaseOrderStatus.SENT
    ) {
      throw new BadRequestException("Only draft, approved, or sent purchase orders can be voided.");
    }

    const voided = await this.prisma.purchaseOrder.update({
      where: { id },
      data: { status: PurchaseOrderStatus.VOIDED, voidedAt: new Date() },
      include: purchaseOrderInclude,
    });
    await this.auditLogService.log({ organizationId, actorUserId, action: "VOID", entityType: "PurchaseOrder", entityId: id, before: existing, after: voided });
    return voided;
  }

  async remove(organizationId: string, actorUserId: string, id: string) {
    const existing = await this.get(organizationId, id);
    this.assertDraft(existing.status);

    await this.prisma.purchaseOrder.delete({ where: { id } });
    await this.auditLogService.log({ organizationId, actorUserId, action: "DELETE", entityType: "PurchaseOrder", entityId: id, before: existing });
    return { deleted: true };
  }

  async convertToBill(organizationId: string, actorUserId: string, id: string) {
    const existing = await this.get(organizationId, id);
    if (existing.status !== PurchaseOrderStatus.APPROVED && existing.status !== PurchaseOrderStatus.SENT) {
      throw new BadRequestException("Only approved or sent purchase orders can be converted to purchase bills.");
    }
    if (existing.convertedBillId) {
      throw new BadRequestException("Purchase order has already been converted to a bill.");
    }

    const bill = await this.prisma.$transaction(async (tx) => {
      const order = await tx.purchaseOrder.findFirst({
        where: { id, organizationId },
        include: {
          supplier: { select: { id: true, name: true, displayName: true, type: true, isActive: true } },
          lines: {
            orderBy: { sortOrder: "asc" },
            include: {
              item: { select: { id: true, name: true, expenseAccountId: true } },
            },
          },
        },
      });

      if (!order) {
        throw new NotFoundException("Purchase order not found.");
      }
      if (order.status !== PurchaseOrderStatus.APPROVED && order.status !== PurchaseOrderStatus.SENT) {
        throw new BadRequestException("Only approved or sent purchase orders can be converted to purchase bills.");
      }
      if (order.convertedBillId) {
        throw new BadRequestException("Purchase order has already been converted to a bill.");
      }
      if (!order.supplier.isActive || (order.supplier.type !== ContactType.SUPPLIER && order.supplier.type !== ContactType.BOTH)) {
        throw new BadRequestException("Supplier must still be an active supplier contact before conversion.");
      }

      const accountIds = order.lines.map((line, index) => {
        const accountId = line.accountId ?? line.item?.expenseAccountId ?? undefined;
        if (!accountId) {
          throw new BadRequestException(`Purchase order line ${index + 1} requires an account before conversion.`);
        }
        return accountId;
      });
      await this.validateLineAccounts(organizationId, accountIds, tx);

      const billNumber = await this.numberSequenceService.next(organizationId, NumberSequenceScope.BILL, tx);
      const createdBill = await tx.purchaseBill.create({
        data: {
          organizationId,
          billNumber,
          purchaseOrderId: order.id,
          supplierId: order.supplierId,
          branchId: order.branchId,
          billDate: new Date(),
          dueDate: null,
          currency: order.currency,
          status: PurchaseBillStatus.DRAFT,
          subtotal: order.subtotal,
          discountTotal: order.discountTotal,
          taxableTotal: order.taxableTotal,
          taxTotal: order.taxTotal,
          total: order.total,
          balanceDue: order.total,
          notes: order.notes,
          terms: order.terms,
          createdById: actorUserId,
          lines: {
            create: order.lines.map((line, index) => {
              const accountId = accountIds[index];
              return {
                organization: { connect: { id: organizationId } },
                item: line.itemId ? { connect: { id: line.itemId } } : undefined,
                account: { connect: { id: accountId } },
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
              };
            }),
          },
        },
        include: convertedPurchaseBillInclude,
      });

      await tx.purchaseOrder.update({
        where: { id: order.id },
        data: { status: PurchaseOrderStatus.BILLED, convertedBillId: createdBill.id },
      });

      return createdBill;
    });

    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: "CONVERT_TO_BILL",
      entityType: "PurchaseOrder",
      entityId: id,
      before: existing,
      after: bill,
    });
    return bill;
  }

  private async preparePurchaseOrder(organizationId: string, lines: PurchaseOrderLineDto[]): Promise<PreparedPurchaseOrder> {
    const itemIds = lines.map((line) => this.cleanOptional(line.itemId ?? undefined)).filter((itemId): itemId is string => Boolean(itemId));
    const items = itemIds.length
      ? await this.prisma.item.findMany({
          where: { organizationId, id: { in: [...new Set(itemIds)] }, status: ItemStatus.ACTIVE },
          select: { id: true, name: true, description: true, expenseAccountId: true, purchaseTaxRateId: true },
        })
      : [];
    const itemsById = new Map(items.map((item) => [item.id, item]));

    if (items.length !== new Set(itemIds).size) {
      throw new BadRequestException("Purchase order line items must be active items in this organization.");
    }

    const baseLines = lines.map((line, index) => {
      const itemId = this.cleanOptional(line.itemId ?? undefined);
      const item = itemId ? itemsById.get(itemId) : undefined;
      const accountId = this.cleanOptional(line.accountId ?? undefined) ?? item?.expenseAccountId ?? undefined;
      const taxRateId = this.cleanOptional(line.taxRateId ?? undefined) ?? item?.purchaseTaxRateId ?? undefined;

      return {
        itemId,
        description: this.cleanOptional(line.description) ?? item?.description ?? item?.name ?? `Line ${index + 1}`,
        accountId,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        discountRate: line.discountRate ?? "0",
        taxRateId,
        sortOrder: line.sortOrder ?? index,
      };
    });

    const accountIds = baseLines.map((line) => line.accountId).filter((accountId): accountId is string => Boolean(accountId));
    if (accountIds.length) {
      await this.validateLineAccounts(organizationId, accountIds);
    }

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
          throw new BadRequestException("Unable to calculate purchase order line totals.");
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

  private assertFinalizablePurchaseOrder(totals: ReturnType<typeof calculateSalesInvoiceTotals>): void {
    try {
      assertFinalizableSalesInvoice(totals);
    } catch (error) {
      if (error instanceof AccountingRuleError) {
        throw new BadRequestException({ code: error.code, message: error.message });
      }
      throw error;
    }
  }

  private async validateLineAccounts(organizationId: string, accountIds: string[], executor: PrismaExecutor = this.prisma): Promise<void> {
    const uniqueAccountIds = [...new Set(accountIds)];
    const accounts = await executor.account.findMany({
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
      throw new BadRequestException("Purchase order line accounts must be active posting expense, cost of sales, or asset accounts in this organization.");
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
      throw new BadRequestException("Purchase order tax rates must be active purchase tax rates in this organization.");
    }

    return new Map(taxRates.map((taxRate) => [taxRate.id, taxRate]));
  }

  private assertDraft(status: PurchaseOrderStatus): void {
    if (status !== PurchaseOrderStatus.DRAFT) {
      throw new BadRequestException("Only draft purchase orders can be edited.");
    }
  }

  private toLineCreateMany(organizationId: string, lines: PreparedLine[]): Prisma.PurchaseOrderLineCreateWithoutPurchaseOrderInput[] {
    return lines.map((line) => ({
      organization: { connect: { id: organizationId } },
      item: line.itemId ? { connect: { id: line.itemId } } : undefined,
      account: line.accountId ? { connect: { id: line.accountId } } : undefined,
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

  private cleanOptional(value: string | undefined): string | undefined {
    const trimmed = value?.trim();
    return trimmed || undefined;
  }
}

function moneyString(value: unknown): string {
  return String(value ?? "0");
}
