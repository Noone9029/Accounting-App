import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { createReversalLines, getJournalTotals, JournalLineInput } from "@ledgerbyte/accounting-core";
import {
  JournalEntryStatus,
  ItemStatus,
  NumberSequenceScope,
  Prisma,
  SalesInvoiceStatus,
  SalesStockIssueStatus,
  StockMovementType,
  WarehouseStatus,
} from "@prisma/client";
import { AuditLogService } from "../audit-log/audit-log.service";
import {
  COGS_NOT_ENABLED_WARNING,
  InventoryAccountingService,
  MOVING_AVERAGE_REVIEW_WARNING,
  NO_FINANCIAL_POSTING_WARNING,
} from "../inventory/inventory-accounting.service";
import { NumberSequenceService } from "../number-sequences/number-sequence.service";
import { PrismaService } from "../prisma/prisma.service";
import { stockMovementDirection } from "../stock-movements/stock-movement-rules";
import { CreateSalesStockIssueDto, SalesStockIssueLineDto } from "./dto/create-sales-stock-issue.dto";
import { ReverseSalesStockIssueCogsDto } from "./dto/reverse-sales-stock-issue-cogs.dto";
import { FiscalPeriodGuardService } from "../fiscal-periods/fiscal-period-guard.service";

const salesStockIssueInclude = {
  customer: { select: { id: true, name: true, displayName: true, type: true, taxNumber: true } },
  warehouse: { select: { id: true, code: true, name: true, status: true, isDefault: true } },
  salesInvoice: { select: { id: true, invoiceNumber: true, status: true, issueDate: true, total: true } },
  createdBy: { select: { id: true, name: true, email: true } },
  cogsJournalEntry: { select: { id: true, entryNumber: true, entryDate: true, status: true } },
  cogsReversalJournalEntry: { select: { id: true, entryNumber: true, entryDate: true, status: true } },
  cogsPostedBy: { select: { id: true, name: true, email: true } },
  cogsReversedBy: { select: { id: true, name: true, email: true } },
  lines: {
    orderBy: { createdAt: "asc" as const },
    include: {
      item: { select: { id: true, name: true, sku: true, type: true, status: true, inventoryTracking: true } },
      salesInvoiceLine: { select: { id: true, description: true, quantity: true, unitPrice: true } },
      stockMovement: { select: { id: true, type: true, movementDate: true, quantity: true, referenceType: true, referenceId: true } },
      voidStockMovement: { select: { id: true, type: true, movementDate: true, quantity: true, referenceType: true, referenceId: true } },
    },
  },
};

type PrismaExecutor = PrismaService | Prisma.TransactionClient;

type PreparedIssueLine = {
  itemId: string;
  salesInvoiceLineId: string;
  quantity: Prisma.Decimal;
  unitCost: Prisma.Decimal | null;
};

type SalesStockIssueWithPreviewLines = Prisma.SalesStockIssueGetPayload<{
  include: typeof salesStockIssueInclude;
}>;

@Injectable()
export class SalesStockIssueService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
    private readonly numberSequenceService: NumberSequenceService,
    private readonly inventoryAccountingService: InventoryAccountingService,
    private readonly fiscalPeriodGuardService?: FiscalPeriodGuardService,
  ) {}

  list(organizationId: string) {
    return this.prisma.salesStockIssue.findMany({
      where: { organizationId },
      orderBy: [{ issueDate: "desc" }, { createdAt: "desc" }],
      include: salesStockIssueInclude,
    });
  }

  async get(organizationId: string, id: string) {
    const issue = await this.prisma.salesStockIssue.findFirst({
      where: { id, organizationId },
      include: salesStockIssueInclude,
    });
    if (!issue) {
      throw new NotFoundException("Sales stock issue not found.");
    }
    return issue;
  }

  async accountingPreview(organizationId: string, id: string) {
    const issue = await this.prisma.salesStockIssue.findFirst({
      where: { id, organizationId },
      include: salesStockIssueInclude,
    });
    if (!issue) {
      throw new NotFoundException("Sales stock issue not found.");
    }

    return this.buildAccountingPreview(organizationId, issue);
  }

  async postCogs(organizationId: string, actorUserId: string, id: string) {
    const existing = await this.get(organizationId, id);

    const posted = await this.prisma.$transaction(async (tx) => {
      const issue = await tx.salesStockIssue.findFirst({
        where: { id, organizationId },
        include: salesStockIssueInclude,
      });
      if (!issue) {
        throw new NotFoundException("Sales stock issue not found.");
      }
      if (issue.status !== SalesStockIssueStatus.POSTED) {
        throw new BadRequestException("COGS can only be posted for a posted stock issue.");
      }
      if (issue.cogsJournalEntryId) {
        throw new BadRequestException("COGS has already been posted for this stock issue.");
      }

      const preview = await this.buildAccountingPreview(organizationId, issue, tx);
      if (!preview.canPost) {
        throw new BadRequestException(preview.blockingReasons.length > 0 ? preview.blockingReasons : preview.canPostReason);
      }
      const totalCogs = new Prisma.Decimal(preview.journal.totalDebit);
      if (totalCogs.lte(0)) {
        throw new BadRequestException("Estimated COGS total must be greater than zero.");
      }

      await this.assertPostingDateAllowed(organizationId, issue.issueDate, tx);
      const postedAt = new Date();
      const entryNumber = await this.numberSequenceService.next(organizationId, NumberSequenceScope.JOURNAL_ENTRY, tx);
      const journalLines = this.previewJournalToCoreLines(preview.journal.lines);
      const totals = getJournalTotals(journalLines);
      const journalEntry = await tx.journalEntry.create({
        data: {
          organizationId,
          entryNumber,
          status: JournalEntryStatus.POSTED,
          entryDate: issue.issueDate,
          description: `COGS for sales stock issue ${issue.issueNumber}`,
          reference: issue.issueNumber,
          currency: "SAR",
          totalDebit: totals.debit,
          totalCredit: totals.credit,
          postedAt,
          postedById: actorUserId,
          createdById: actorUserId,
          lines: { create: this.toJournalLineCreateMany(organizationId, journalLines) },
        },
      });

      const claim = await tx.salesStockIssue.updateMany({
        where: { id, organizationId, status: SalesStockIssueStatus.POSTED, cogsJournalEntryId: null },
        data: { cogsJournalEntryId: journalEntry.id, cogsPostedAt: postedAt, cogsPostedById: actorUserId },
      });
      if (claim.count !== 1) {
        throw new BadRequestException("COGS has already been posted for this stock issue.");
      }

      return tx.salesStockIssue.findUniqueOrThrow({ where: { id }, include: salesStockIssueInclude });
    });

    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: "POST_COGS",
      entityType: "SalesStockIssue",
      entityId: id,
      before: existing,
      after: posted,
    });
    return posted;
  }

  async reverseCogs(organizationId: string, actorUserId: string, id: string, dto: ReverseSalesStockIssueCogsDto = {}) {
    const existing = await this.get(organizationId, id);

    const reversed = await this.prisma.$transaction(async (tx) => {
      const issue = await tx.salesStockIssue.findFirst({
        where: { id, organizationId },
        include: {
          ...salesStockIssueInclude,
          cogsJournalEntry: {
            include: {
              lines: { orderBy: { lineNumber: "asc" }, include: { account: { select: { id: true, code: true, name: true } } } },
              reversedBy: { select: { id: true, entryNumber: true } },
            },
          },
        },
      });
      if (!issue) {
        throw new NotFoundException("Sales stock issue not found.");
      }
      if (!issue.cogsJournalEntryId || !issue.cogsJournalEntry) {
        throw new BadRequestException("COGS has not been posted for this stock issue.");
      }
      if (issue.cogsReversalJournalEntryId || issue.cogsJournalEntry.reversedBy) {
        throw new BadRequestException("COGS has already been reversed for this stock issue.");
      }
      if (issue.cogsJournalEntry.status !== JournalEntryStatus.POSTED) {
        throw new BadRequestException("Only an active posted COGS journal can be reversed.");
      }

      const reversalDate = new Date();
      await this.assertPostingDateAllowed(organizationId, reversalDate, tx);
      const reversalLines = createReversalLines(this.toCoreLines(issue.cogsJournalEntry.lines));
      const totals = getJournalTotals(reversalLines);
      const entryNumber = await this.numberSequenceService.next(organizationId, NumberSequenceScope.JOURNAL_ENTRY, tx);
      const reason = this.cleanOptional(dto.reason);
      const reversalJournalEntry = await tx.journalEntry
        .create({
          data: {
            organizationId,
            entryNumber,
            status: JournalEntryStatus.POSTED,
            entryDate: reversalDate,
            description: reason
              ? `Reversal of COGS for sales stock issue ${issue.issueNumber}: ${reason}`
              : `Reversal of COGS for sales stock issue ${issue.issueNumber}`,
            reference: issue.cogsJournalEntry.entryNumber,
            currency: issue.cogsJournalEntry.currency,
            totalDebit: totals.debit,
            totalCredit: totals.credit,
            postedAt: reversalDate,
            postedById: actorUserId,
            createdById: actorUserId,
            reversalOfId: issue.cogsJournalEntry.id,
            lines: { create: this.toJournalLineCreateMany(organizationId, reversalLines) },
          },
        })
        .catch((error: unknown) => {
          if (isUniqueConstraintError(error)) {
            throw new BadRequestException("COGS has already been reversed for this stock issue.");
          }
          throw error;
        });

      await tx.journalEntry.update({
        where: { id: issue.cogsJournalEntry.id },
        data: { status: JournalEntryStatus.REVERSED },
      });
      const claim = await tx.salesStockIssue.updateMany({
        where: { id, organizationId, cogsJournalEntryId: issue.cogsJournalEntry.id, cogsReversalJournalEntryId: null },
        data: {
          cogsReversalJournalEntryId: reversalJournalEntry.id,
          cogsReversedAt: reversalDate,
          cogsReversedById: actorUserId,
        },
      });
      if (claim.count !== 1) {
        throw new BadRequestException("COGS has already been reversed for this stock issue.");
      }

      return tx.salesStockIssue.findUniqueOrThrow({ where: { id }, include: salesStockIssueInclude });
    });

    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: "REVERSE_COGS",
      entityType: "SalesStockIssue",
      entityId: id,
      before: existing,
      after: reversed,
    });
    return reversed;
  }

  async create(organizationId: string, actorUserId: string, dto: CreateSalesStockIssueDto) {
    const created = await this.prisma.$transaction(async (tx) => {
      const warehouse = await this.findActiveWarehouse(organizationId, dto.warehouseId, tx);
      const issueDate = this.requiredDate(dto.issueDate, "Issue date");
      const invoice = await tx.salesInvoice.findFirst({
        where: { id: dto.salesInvoiceId, organizationId },
        include: { lines: { include: { item: true } } },
      });
      if (!invoice) {
        throw new BadRequestException("Sales invoice must belong to this organization.");
      }
      if (invoice.status !== SalesInvoiceStatus.FINALIZED) {
        throw new BadRequestException("Sales stock issue requires a finalized sales invoice.");
      }
      if (dto.customerId && dto.customerId !== invoice.customerId) {
        throw new BadRequestException("Issue customer must match the sales invoice customer.");
      }

      const preparedLines = await this.prepareLines(invoice.lines, dto.lines, tx);
      if (preparedLines.length === 0) {
        throw new BadRequestException("Sales stock issue requires at least one inventory-tracked line.");
      }
      await this.assertStockAvailable(organizationId, warehouse.id, preparedLines, tx);

      const issueNumber = await this.numberSequenceService.next(organizationId, NumberSequenceScope.SALES_STOCK_ISSUE, tx);
      const postedAt = new Date();
      const issue = await tx.salesStockIssue.create({
        data: {
          organizationId,
          issueNumber,
          salesInvoiceId: invoice.id,
          customerId: invoice.customerId,
          warehouseId: warehouse.id,
          issueDate,
          status: SalesStockIssueStatus.POSTED,
          notes: this.cleanOptional(dto.notes),
          createdById: actorUserId,
          postedAt,
        },
        select: { id: true },
      });

      for (const line of preparedLines) {
        const movement = await this.createStockMovement(tx, {
          organizationId,
          actorUserId,
          itemId: line.itemId,
          warehouseId: warehouse.id,
          movementDate: issueDate,
          type: StockMovementType.SALES_ISSUE_PLACEHOLDER,
          quantity: line.quantity,
          unitCost: line.unitCost,
          referenceType: "SalesStockIssue",
          referenceId: issue.id,
          description: `Sales stock issue ${issueNumber}`,
        });
        await tx.salesStockIssueLine.create({
          data: {
            organizationId,
            issueId: issue.id,
            itemId: line.itemId,
            salesInvoiceLineId: line.salesInvoiceLineId,
            quantity: line.quantity.toFixed(4),
            unitCost: line.unitCost?.toFixed(4) ?? null,
            stockMovementId: movement.id,
          },
        });
      }

      return tx.salesStockIssue.findUniqueOrThrow({ where: { id: issue.id }, include: salesStockIssueInclude });
    });

    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: "CREATE",
      entityType: "SalesStockIssue",
      entityId: created.id,
      after: created,
    });
    return created;
  }

  async void(organizationId: string, actorUserId: string, id: string) {
    const existing = await this.get(organizationId, id);
    if (existing.status === SalesStockIssueStatus.VOIDED) {
      throw new BadRequestException("Sales stock issue is already voided.");
    }
    if (existing.cogsJournalEntryId && !existing.cogsReversalJournalEntryId) {
      throw new BadRequestException("Reverse COGS posting before voiding this stock issue.");
    }

    const voided = await this.prisma.$transaction(async (tx) => {
      const issue = await tx.salesStockIssue.findFirst({
        where: { id, organizationId },
        include: { lines: true },
      });
      if (!issue) {
        throw new NotFoundException("Sales stock issue not found.");
      }
      if (issue.status === SalesStockIssueStatus.VOIDED) {
        throw new BadRequestException("Sales stock issue is already voided.");
      }
      if (issue.cogsJournalEntryId && !issue.cogsReversalJournalEntryId) {
        throw new BadRequestException("Reverse COGS posting before voiding this stock issue.");
      }

      const voidedAt = new Date();
      const claim = await tx.salesStockIssue.updateMany({
        where: { id, organizationId, status: SalesStockIssueStatus.POSTED },
        data: { status: SalesStockIssueStatus.VOIDED, voidedAt },
      });
      if (claim.count !== 1) {
        throw new BadRequestException("Sales stock issue is no longer posted.");
      }

      for (const line of issue.lines) {
        const quantity = new Prisma.Decimal(line.quantity);
        const unitCost = line.unitCost === null ? null : new Prisma.Decimal(line.unitCost);
        const movement = await this.createStockMovement(tx, {
          organizationId,
          actorUserId,
          itemId: line.itemId,
          warehouseId: issue.warehouseId,
          movementDate: voidedAt,
          type: StockMovementType.ADJUSTMENT_IN,
          quantity,
          unitCost,
          referenceType: "SalesStockIssueVoid",
          referenceId: issue.id,
          description: `Void sales stock issue ${issue.issueNumber}`,
        });
        await tx.salesStockIssueLine.update({
          where: { id: line.id },
          data: { voidStockMovementId: movement.id },
        });
      }

      return tx.salesStockIssue.findUniqueOrThrow({ where: { id }, include: salesStockIssueInclude });
    });

    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: "VOID",
      entityType: "SalesStockIssue",
      entityId: id,
      before: existing,
      after: voided,
    });
    return voided;
  }

  async salesInvoiceIssueStatus(organizationId: string, salesInvoiceId: string) {
    const invoice = await this.prisma.salesInvoice.findFirst({
      where: { id: salesInvoiceId, organizationId },
      include: {
        lines: {
          orderBy: { sortOrder: "asc" },
          include: { item: { select: { id: true, name: true, sku: true, type: true, status: true, inventoryTracking: true } } },
        },
      },
    });
    if (!invoice) {
      throw new NotFoundException("Sales invoice not found.");
    }

    const lineIds = invoice.lines.map((line) => line.id);
    const issueLines = await this.prisma.salesStockIssueLine.findMany({
      where: {
        salesInvoiceLineId: { in: lineIds },
        issue: {
          salesInvoiceId: invoice.id,
          status: { not: SalesStockIssueStatus.VOIDED },
        },
      },
      select: { salesInvoiceLineId: true, quantity: true },
    });
    const issuedByLine = new Map<string, Prisma.Decimal>();
    for (const issueLine of issueLines) {
      if (!issueLine.salesInvoiceLineId) continue;
      issuedByLine.set(issueLine.salesInvoiceLineId, (issuedByLine.get(issueLine.salesInvoiceLineId) ?? new Prisma.Decimal(0)).plus(issueLine.quantity));
    }

    const lines = invoice.lines.map((line) => {
      const issuedQuantity = issuedByLine.get(line.id) ?? new Prisma.Decimal(0);
      const inventoryTracking = Boolean(line.item?.inventoryTracking);
      const invoicedQuantity = new Prisma.Decimal(line.quantity);
      const remainingQuantity = inventoryTracking ? Prisma.Decimal.max(invoicedQuantity.minus(issuedQuantity), 0) : new Prisma.Decimal(0);
      return {
        lineId: line.id,
        item: line.item,
        inventoryTracking,
        invoicedQuantity: invoicedQuantity.toFixed(4),
        issuedQuantity: issuedQuantity.toFixed(4),
        remainingQuantity: remainingQuantity.toFixed(4),
      };
    });
    const trackedLines = lines.filter((line) => line.inventoryTracking);
    const anyIssued = trackedLines.some((line) => new Prisma.Decimal(line.issuedQuantity).gt(0));
    const anyRemaining = trackedLines.some((line) => new Prisma.Decimal(line.remainingQuantity).gt(0));
    const status = trackedLines.length === 0 || !anyIssued ? "NOT_STARTED" : anyRemaining ? "PARTIAL" : "COMPLETE";

    return {
      sourceId: invoice.id,
      sourceType: "salesInvoice",
      status,
      lines,
    };
  }

  private async buildAccountingPreview(
    organizationId: string,
    issue: SalesStockIssueWithPreviewLines,
    executor: PrismaExecutor = this.prisma,
  ) {
    const readiness = await this.inventoryAccountingService.previewReadiness(organizationId, ["inventoryAsset", "cogs"], executor);
    const blockingReasons = [...readiness.blockingReasons];
    const warnings = [
      MOVING_AVERAGE_REVIEW_WARNING,
      "This creates accounting journal entries and affects financial reports.",
      NO_FINANCIAL_POSTING_WARNING,
      ...readiness.warnings,
    ];
    if (!readiness.settings.enableInventoryAccounting) {
      blockingReasons.push("Inventory accounting must be enabled before COGS can be posted.");
      warnings.unshift(COGS_NOT_ENABLED_WARNING);
    }
    if (issue.status !== SalesStockIssueStatus.POSTED) {
      blockingReasons.push("COGS can only be posted for a posted stock issue.");
    }
    if (issue.cogsJournalEntryId) {
      blockingReasons.push("COGS has already been posted for this stock issue.");
    }

    let totalEstimatedCogs = new Prisma.Decimal(0);
    const lines = [];
    for (const [index, line] of issue.lines.entries()) {
      const quantity = new Prisma.Decimal(line.quantity);
      const averageCost = await this.inventoryAccountingService.movingAverageUnitCost(
        organizationId,
        line.itemId,
        issue.warehouseId,
        issue.issueDate,
        executor,
      );
      const lineWarnings: string[] = [];
      let estimatedCogs: Prisma.Decimal | null = null;
      if (averageCost.averageUnitCost === null) {
        const reason = `Sales stock issue line ${index + 1} does not have enough moving-average cost data.`;
        lineWarnings.push(reason);
        blockingReasons.push(reason);
      } else {
        estimatedCogs = quantity.mul(averageCost.averageUnitCost);
        totalEstimatedCogs = totalEstimatedCogs.plus(estimatedCogs);
      }
      if (averageCost.missingCostData) {
        lineWarnings.push("Some inbound stock movements are missing cost data.");
      }

      lines.push({
        lineId: line.id,
        item: line.item,
        quantity: this.decimalString(quantity),
        estimatedUnitCost: averageCost.averageUnitCost === null ? null : this.decimalString(averageCost.averageUnitCost),
        estimatedCOGS: estimatedCogs === null ? null : this.decimalString(estimatedCogs),
        warnings: lineWarnings,
      });
    }

    if (totalEstimatedCogs.lte(0)) {
      blockingReasons.push("Estimated COGS total must be greater than zero.");
    }

    const cogsAccount = readiness.settings.cogsAccount;
    const assetAccount = readiness.settings.inventoryAssetAccount;
    const journalLines =
      cogsAccount && assetAccount && totalEstimatedCogs.gt(0)
        ? [
            {
              lineNumber: 1,
              side: "DEBIT" as const,
              accountId: cogsAccount.id,
              accountCode: cogsAccount.code,
              accountName: cogsAccount.name,
              amount: this.decimalString(totalEstimatedCogs),
              description: `Sales stock issue ${issue.issueNumber} COGS`,
            },
            {
              lineNumber: 2,
              side: "CREDIT" as const,
              accountId: assetAccount.id,
              accountCode: assetAccount.code,
              accountName: assetAccount.name,
              amount: this.decimalString(totalEstimatedCogs),
              description: `Sales stock issue ${issue.issueNumber} inventory asset`,
            },
          ]
        : [];
    const uniqueBlockingReasons = this.uniqueStrings(blockingReasons);
    const canPost = uniqueBlockingReasons.length === 0;
    const alreadyPosted = Boolean(issue.cogsJournalEntryId);
    const alreadyReversed = Boolean(issue.cogsReversalJournalEntryId);

    return {
      sourceType: "SalesStockIssue",
      sourceId: issue.id,
      sourceNumber: issue.issueNumber,
      previewOnly: true,
      postingStatus: alreadyReversed ? "REVERSED" : alreadyPosted ? "POSTED" : canPost ? "POSTABLE" : "DESIGN_ONLY",
      canPost,
      canPostReason: canPost ? "COGS can be posted manually after review." : "Resolve blocking reasons before posting COGS.",
      alreadyPosted,
      alreadyReversed,
      journalEntryId: issue.cogsJournalEntryId,
      reversalJournalEntryId: issue.cogsReversalJournalEntryId,
      valuationMethod: readiness.settings.valuationMethod,
      blockingReasons: uniqueBlockingReasons,
      warnings: this.uniqueStrings(warnings),
      lines,
      journal: {
        description: `Sales stock issue ${issue.issueNumber} COGS preview`,
        entryDate: issue.issueDate.toISOString(),
        totalDebit: this.decimalString(totalEstimatedCogs),
        totalCredit: this.decimalString(totalEstimatedCogs),
        lines: journalLines,
      },
    };
  }

  private async prepareLines(
    invoiceLines: Array<{
      id: string;
      itemId: string | null;
      quantity: Prisma.Decimal;
      item: { inventoryTracking: boolean; status: ItemStatus } | null;
    }>,
    lineDtos: SalesStockIssueLineDto[],
    tx: Prisma.TransactionClient,
  ): Promise<PreparedIssueLine[]> {
    const sourceLines = new Map(invoiceLines.map((line) => [line.id, line]));
    const remainingByLine = await this.remainingIssueQuantity([...sourceLines.keys()], tx);
    const requestedBySourceLine = new Map<string, Prisma.Decimal>();
    return lineDtos.map((dto) => {
      const quantity = this.positiveDecimal(dto.quantity, "Issue quantity");
      const unitCost = this.optionalNonNegativeDecimal(dto.unitCost, "Unit cost");
      const sourceLine = sourceLines.get(dto.salesInvoiceLineId);
      if (!sourceLine || !sourceLine.itemId) {
        throw new BadRequestException("Issue line must reference an inventory item on the sales invoice.");
      }
      if (!sourceLine.item?.inventoryTracking) {
        throw new BadRequestException("Sales stock issues can only issue inventory-tracked items.");
      }
      if (sourceLine.item.status !== ItemStatus.ACTIVE) {
        throw new BadRequestException("Sales stock issues can only issue active items.");
      }
      const remaining = remainingByLine.get(sourceLine.id) ?? new Prisma.Decimal(sourceLine.quantity);
      const requested = (requestedBySourceLine.get(sourceLine.id) ?? new Prisma.Decimal(0)).plus(quantity);
      if (requested.gt(remaining)) {
        throw new BadRequestException("Issue quantity cannot exceed the remaining sales invoice quantity.");
      }
      requestedBySourceLine.set(sourceLine.id, requested);
      return {
        itemId: sourceLine.itemId,
        salesInvoiceLineId: sourceLine.id,
        quantity,
        unitCost,
      };
    });
  }

  private async remainingIssueQuantity(lineIds: string[], tx: Prisma.TransactionClient) {
    const sourceLines = await tx.salesInvoiceLine.findMany({ where: { id: { in: lineIds } }, select: { id: true, quantity: true } });
    const remaining = new Map(sourceLines.map((line) => [line.id, new Prisma.Decimal(line.quantity)]));
    const issueLines = await tx.salesStockIssueLine.findMany({
      where: {
        salesInvoiceLineId: { in: lineIds },
        issue: { status: { not: SalesStockIssueStatus.VOIDED } },
      },
      select: { salesInvoiceLineId: true, quantity: true },
    });
    for (const issueLine of issueLines) {
      if (!issueLine.salesInvoiceLineId) continue;
      remaining.set(issueLine.salesInvoiceLineId, (remaining.get(issueLine.salesInvoiceLineId) ?? new Prisma.Decimal(0)).minus(issueLine.quantity));
    }
    return remaining;
  }

  private async assertStockAvailable(
    organizationId: string,
    warehouseId: string,
    lines: PreparedIssueLine[],
    executor: PrismaExecutor,
  ): Promise<void> {
    const requiredByItem = new Map<string, Prisma.Decimal>();
    for (const line of lines) {
      requiredByItem.set(line.itemId, (requiredByItem.get(line.itemId) ?? new Prisma.Decimal(0)).plus(line.quantity));
    }
    for (const [itemId, requiredQuantity] of requiredByItem) {
      const currentQuantity = await this.quantityOnHand(organizationId, itemId, warehouseId, executor);
      if (currentQuantity.minus(requiredQuantity).lt(0)) {
        throw new BadRequestException("Sales stock issue cannot make warehouse stock negative.");
      }
    }
  }

  private async findActiveWarehouse(organizationId: string, warehouseId: string, executor: PrismaExecutor) {
    const warehouse = await executor.warehouse.findFirst({
      where: { id: warehouseId, organizationId },
      select: { id: true, status: true },
    });
    if (!warehouse) {
      throw new BadRequestException("Warehouse must belong to this organization.");
    }
    if (warehouse.status !== WarehouseStatus.ACTIVE) {
      throw new BadRequestException("Warehouse must be active.");
    }
    return warehouse;
  }

  private async quantityOnHand(organizationId: string, itemId: string, warehouseId: string, executor: PrismaExecutor): Promise<Prisma.Decimal> {
    const movements = await executor.stockMovement.findMany({
      where: { organizationId, itemId, warehouseId },
      select: { type: true, quantity: true },
    });
    return movements.reduce((quantity, movement) => {
      const value = new Prisma.Decimal(movement.quantity);
      return stockMovementDirection(movement.type) === "IN" ? quantity.plus(value) : quantity.minus(value);
    }, new Prisma.Decimal(0));
  }

  private createStockMovement(
    tx: Prisma.TransactionClient,
    input: {
      organizationId: string;
      actorUserId: string;
      itemId: string;
      warehouseId: string;
      movementDate: Date;
      type: StockMovementType;
      quantity: Prisma.Decimal;
      unitCost: Prisma.Decimal | null;
      referenceType: string;
      referenceId: string;
      description: string;
    },
  ) {
    return tx.stockMovement.create({
      data: {
        organizationId: input.organizationId,
        itemId: input.itemId,
        warehouseId: input.warehouseId,
        movementDate: input.movementDate,
        type: input.type,
        quantity: input.quantity.toFixed(4),
        unitCost: input.unitCost?.toFixed(4) ?? null,
        totalCost: input.unitCost ? input.quantity.mul(input.unitCost).toFixed(4) : null,
        referenceType: input.referenceType,
        referenceId: input.referenceId,
        description: input.description,
        createdById: input.actorUserId,
      },
    });
  }

  private requiredDate(value: string, label: string): Date {
    const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
    const date = new Date(dateOnly ? `${value}T00:00:00.000Z` : value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`${label} must be a valid date.`);
    }
    return date;
  }

  private positiveDecimal(value: Prisma.Decimal.Value, label: string): Prisma.Decimal {
    const decimal = this.decimal(value);
    if (decimal.lte(0)) {
      throw new BadRequestException(`${label} must be greater than zero.`);
    }
    return decimal;
  }

  private optionalNonNegativeDecimal(value: Prisma.Decimal.Value | null | undefined, label: string): Prisma.Decimal | null {
    if (value === undefined || value === null || value === "") {
      return null;
    }
    const decimal = this.decimal(value);
    if (decimal.lt(0)) {
      throw new BadRequestException(`${label} cannot be negative.`);
    }
    return decimal;
  }

  private decimal(value: Prisma.Decimal.Value): Prisma.Decimal {
    try {
      return new Prisma.Decimal(value);
    } catch {
      throw new BadRequestException("Quantity and cost values must be valid decimals.");
    }
  }

  private cleanOptional(value?: string | null): string | null {
    const cleaned = value?.trim();
    return cleaned ? cleaned : null;
  }

  private decimalString(value: Prisma.Decimal): string {
    return value.toFixed(4);
  }

  private uniqueStrings(values: string[]): string[] {
    return [...new Set(values)];
  }

  private previewJournalToCoreLines(
    lines: Array<{
      side: "DEBIT" | "CREDIT";
      accountId: string | null;
      amount: string;
      description: string;
    }>,
  ): JournalLineInput[] {
    return lines.map((line) => {
      if (!line.accountId) {
        throw new BadRequestException("COGS preview journal lines require mapped posting accounts.");
      }
      return {
        accountId: line.accountId,
        debit: line.side === "DEBIT" ? line.amount : "0",
        credit: line.side === "CREDIT" ? line.amount : "0",
        description: line.description,
        currency: "SAR",
      };
    });
  }

  private toCoreLines(
    lines: Array<{ accountId: string; debit: unknown; credit: unknown; description: string | null; currency: string; exchangeRate: unknown }>,
  ): JournalLineInput[] {
    return lines.map((line) => ({
      accountId: line.accountId,
      debit: String(line.debit),
      credit: String(line.credit),
      description: line.description ?? undefined,
      currency: line.currency,
      exchangeRate: line.exchangeRate === undefined ? "1" : String(line.exchangeRate),
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
      currency: line.currency ?? "SAR",
      exchangeRate: line.exchangeRate === undefined ? "1" : String(line.exchangeRate),
    }));
  }

  private async assertPostingDateAllowed(organizationId: string, postingDate: string | Date, tx?: Prisma.TransactionClient): Promise<void> {
    await this.fiscalPeriodGuardService?.assertPostingDateAllowed(organizationId, postingDate, tx);
  }
}

function isUniqueConstraintError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}
