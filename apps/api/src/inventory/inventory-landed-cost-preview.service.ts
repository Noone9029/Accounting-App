import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { ContactType, Prisma, PurchaseReturnStatus } from "@prisma/client";
import { resolveOrganizationBaseCurrency } from "../foreign-exchange/base-currency-posting-guard.service";
import { PrismaService } from "../prisma/prisma.service";
import type { LandedCostAllocationMethod, LandedCostCategory, LandedCostLineDto, LandedCostPreviewDto, LandedCostSourceType } from "./dto/landed-cost-preview.dto";

interface LandedCostSupplierSummary {
  id: string;
  name: string;
  displayName: string | null;
}

export interface LandedCostSourceSummary {
  sourceType: LandedCostSourceType;
  sourceId: string;
  sourceNumber: string;
  supplier: LandedCostSupplierSummary;
  date: string;
  currency: string;
}

export interface LandedCostBaseLine {
  sourceLineId: string;
  itemId: string;
  itemName: string;
  itemSku: string | null;
  quantity: string;
  returnedQuantity: string;
  baseUnitCost: string;
  baseLineValue: string;
  warnings: string[];
}

export interface LandedCostPreviewCostLine {
  category: LandedCostCategory;
  description: string | null;
  amount: string;
  currency: string | null;
  supplierId: string | null;
}

export interface LandedCostLineAllocation {
  sourceLineId: string;
  allocatedLandedCost: string;
  landedUnitCostIncrease: string;
  previewLandedUnitCost: string;
  previewLandedLineValue: string;
  allocationPercent: string;
}

export interface LandedCostPreviewTotals {
  baseInventoryValue: string;
  totalLandedCosts: string;
  previewLandedInventoryValue: string;
}

export interface LandedCostPreviewResponse {
  readOnly: true;
  previewOnly: true;
  noMutation: true;
  noPostingEffect: true;
  noInventoryEffect: true;
  noApEffect: true;
  noVatEffect: true;
  noZatcaEffect: true;
  noEmailEffect: true;
  generatedAt: string;
  source: LandedCostSourceSummary | null;
  allocationMethod: LandedCostAllocationMethod;
  baseLines: LandedCostBaseLine[];
  costLines: LandedCostPreviewCostLine[];
  allocation: LandedCostLineAllocation[];
  totals: LandedCostPreviewTotals;
  blockers: string[];
  warnings: string[];
}

interface InternalBaseLine extends LandedCostBaseLine {
  quantityDecimal: Prisma.Decimal;
  baseUnitCostDecimal: Prisma.Decimal;
  baseLineValueDecimal: Prisma.Decimal;
}

interface LoadedSource {
  source: LandedCostSourceSummary;
  lines: InternalBaseLine[];
}

const ZERO = new Prisma.Decimal(0);
const contactSelect = { id: true, name: true, displayName: true } as const;
const itemSelect = { id: true, name: true, sku: true, inventoryTracking: true } as const;

const receiptSelect = {
  id: true,
  receiptNumber: true,
  receiptDate: true,
  supplier: { select: contactSelect },
  purchaseBill: { select: { currency: true } },
  lines: {
    orderBy: { createdAt: "asc" as const },
    select: {
      id: true,
      itemId: true,
      quantity: true,
      unitCost: true,
      item: { select: itemSelect },
      purchaseBillLine: { select: { unitPrice: true } },
      purchaseOrderLine: { select: { unitPrice: true } },
    },
  },
} satisfies Prisma.PurchaseReceiptSelect;

const billSelect = {
  id: true,
  billNumber: true,
  billDate: true,
  currency: true,
  supplier: { select: contactSelect },
  lines: {
    orderBy: { sortOrder: "asc" as const },
    select: {
      id: true,
      itemId: true,
      description: true,
      quantity: true,
      unitPrice: true,
      item: { select: itemSelect },
    },
  },
} satisfies Prisma.PurchaseBillSelect;

const returnLineSelect = {
  sourcePurchaseBillLineId: true,
  sourcePurchaseReceiptLineId: true,
  quantity: true,
  purchaseReturn: {
    select: {
      purchaseReturnNumber: true,
      status: true,
      inventoryReturnPostedAt: true,
    },
  },
} satisfies Prisma.PurchaseReturnLineSelect;

type ReceiptSource = Prisma.PurchaseReceiptGetPayload<{ select: typeof receiptSelect }>;
type BillSource = Prisma.PurchaseBillGetPayload<{ select: typeof billSelect }>;
type ReturnLine = Prisma.PurchaseReturnLineGetPayload<{ select: typeof returnLineSelect }>;

@Injectable()
export class InventoryLandedCostPreviewService {
  constructor(private readonly prisma: PrismaService) {}

  async preview(organizationId: string, dto: LandedCostPreviewDto): Promise<LandedCostPreviewResponse> {
    const costLines = this.normalizeCostLines(dto.costLines);
    await this.validateCostLineSuppliers(organizationId, costLines);
    const totalLandedCosts = costLines.reduce((sum, line) => sum.plus(line.amountDecimal), ZERO);

    if (dto.sourceType === "PURCHASE_ORDER") {
      return this.emptyPreview(dto, costLines, [
        "Purchase order landed cost preview is not supported in this sprint. Use a purchase receipt or purchase bill source.",
      ]);
    }

    const loadedSource = dto.sourceType === "PURCHASE_RECEIPT"
      ? await this.loadPurchaseReceiptSource(organizationId, dto.sourceId)
      : await this.loadPurchaseBillSource(organizationId, dto.sourceId);

    const returnedQuantityByLine = await this.returnedQuantities(organizationId, dto.sourceType, loadedSource.lines.map((line) => line.sourceLineId));
    const baseLines = loadedSource.lines.map((line) => this.attachReturnContext(line, returnedQuantityByLine));
    const blockers = this.validateAllocationBases(dto, baseLines, totalLandedCosts);
    const allocation = blockers.length === 0 ? this.allocate(baseLines, totalLandedCosts, dto) : [];
    const baseInventoryValue = baseLines.reduce((sum, line) => sum.plus(line.baseLineValueDecimal), ZERO);

    return {
      readOnly: true,
      previewOnly: true,
      noMutation: true,
      noPostingEffect: true,
      noInventoryEffect: true,
      noApEffect: true,
      noVatEffect: true,
      noZatcaEffect: true,
      noEmailEffect: true,
      generatedAt: new Date().toISOString(),
      source: loadedSource.source,
      allocationMethod: dto.allocationMethod,
      baseLines: baseLines.map((line) => this.publicBaseLine(line)),
      costLines: costLines.map((line) => line.output),
      allocation,
      totals: {
        baseInventoryValue: this.decimalString(baseInventoryValue),
        totalLandedCosts: this.decimalString(totalLandedCosts),
        previewLandedInventoryValue: this.decimalString(baseInventoryValue.plus(totalLandedCosts)),
      },
      blockers,
      warnings: this.responseWarnings(baseLines),
    };
  }

  private async loadPurchaseReceiptSource(organizationId: string, sourceId: string): Promise<LoadedSource> {
    const receipt = await this.prisma.purchaseReceipt.findFirst({
      where: { id: sourceId, organizationId },
      select: receiptSelect,
    });
    if (!receipt) {
      throw new NotFoundException("Landed cost source not found.");
    }
    const currency =
      receipt.purchaseBill?.currency ??
      await resolveOrganizationBaseCurrency(organizationId, this.prisma);

    const source: LandedCostSourceSummary = {
      sourceType: "PURCHASE_RECEIPT",
      sourceId: receipt.id,
      sourceNumber: receipt.receiptNumber,
      supplier: receipt.supplier,
      date: receipt.receiptDate.toISOString(),
      currency,
    };

    return {
      source,
      lines: receipt.lines.flatMap((line) => this.receiptBaseLine(line)),
    };
  }

  private async loadPurchaseBillSource(organizationId: string, sourceId: string): Promise<LoadedSource> {
    const bill = await this.prisma.purchaseBill.findFirst({
      where: { id: sourceId, organizationId },
      select: billSelect,
    });
    if (!bill) {
      throw new NotFoundException("Landed cost source not found.");
    }

    const source: LandedCostSourceSummary = {
      sourceType: "PURCHASE_BILL",
      sourceId: bill.id,
      sourceNumber: bill.billNumber,
      supplier: bill.supplier,
      date: bill.billDate.toISOString(),
      currency: bill.currency,
    };

    return {
      source,
      lines: bill.lines.flatMap((line) => this.billBaseLine(line)),
    };
  }

  private receiptBaseLine(line: ReceiptSource["lines"][number]): InternalBaseLine[] {
    if (!line.item.inventoryTracking) return [];
    const quantity = this.decimal(line.quantity);
    const baseUnitCost = this.receiptUnitCost(line);
    const baseLineValue = quantity.mul(baseUnitCost);
    return [
      {
        sourceLineId: line.id,
        itemId: line.itemId,
        itemName: line.item.name,
        itemSku: line.item.sku,
        quantity: this.decimalString(quantity),
        returnedQuantity: "0.0000",
        baseUnitCost: this.decimalString(baseUnitCost),
        baseLineValue: this.decimalString(baseLineValue),
        warnings: line.unitCost === null ? ["Receipt line has no direct unit cost; preview used linked bill/order cost when available."] : [],
        quantityDecimal: quantity,
        baseUnitCostDecimal: baseUnitCost,
        baseLineValueDecimal: baseLineValue,
      },
    ];
  }

  private billBaseLine(line: BillSource["lines"][number]): InternalBaseLine[] {
    if (!line.itemId || !line.item?.inventoryTracking) return [];
    const quantity = this.decimal(line.quantity);
    const baseUnitCost = this.decimal(line.unitPrice);
    const baseLineValue = quantity.mul(baseUnitCost);
    return [
      {
        sourceLineId: line.id,
        itemId: line.itemId,
        itemName: line.item.name,
        itemSku: line.item.sku,
        quantity: this.decimalString(quantity),
        returnedQuantity: "0.0000",
        baseUnitCost: this.decimalString(baseUnitCost),
        baseLineValue: this.decimalString(baseLineValue),
        warnings: [],
        quantityDecimal: quantity,
        baseUnitCostDecimal: baseUnitCost,
        baseLineValueDecimal: baseLineValue,
      },
    ];
  }

  private receiptUnitCost(line: ReceiptSource["lines"][number]): Prisma.Decimal {
    if (line.unitCost !== null) return this.decimal(line.unitCost);
    if (line.purchaseBillLine?.unitPrice !== undefined) return this.decimal(line.purchaseBillLine.unitPrice);
    if (line.purchaseOrderLine?.unitPrice !== undefined) return this.decimal(line.purchaseOrderLine.unitPrice);
    return ZERO;
  }

  private async returnedQuantities(
    organizationId: string,
    sourceType: "PURCHASE_RECEIPT" | "PURCHASE_BILL",
    sourceLineIds: string[],
  ): Promise<Map<string, { quantity: Prisma.Decimal; postedReturnNumbers: Set<string>; returnNumbers: Set<string> }>> {
    if (sourceLineIds.length === 0) return new Map();
    const sourceLineFilter = sourceType === "PURCHASE_RECEIPT"
      ? { sourcePurchaseReceiptLineId: { in: sourceLineIds } }
      : { sourcePurchaseBillLineId: { in: sourceLineIds } };
    const returnLines = await this.prisma.purchaseReturnLine.findMany({
      where: {
        organizationId,
        purchaseReturn: { status: { notIn: [PurchaseReturnStatus.CANCELLED, PurchaseReturnStatus.VOIDED] } },
        ...sourceLineFilter,
      },
      select: returnLineSelect,
    });

    const quantities = new Map<string, { quantity: Prisma.Decimal; postedReturnNumbers: Set<string>; returnNumbers: Set<string> }>();
    for (const returnLine of returnLines as ReturnLine[]) {
      const sourceLineId = sourceType === "PURCHASE_RECEIPT" ? returnLine.sourcePurchaseReceiptLineId : returnLine.sourcePurchaseBillLineId;
      if (!sourceLineId) continue;
      const existing = quantities.get(sourceLineId) ?? { quantity: ZERO, postedReturnNumbers: new Set<string>(), returnNumbers: new Set<string>() };
      existing.quantity = existing.quantity.plus(returnLine.quantity);
      existing.returnNumbers.add(returnLine.purchaseReturn.purchaseReturnNumber);
      if (returnLine.purchaseReturn.inventoryReturnPostedAt) {
        existing.postedReturnNumbers.add(returnLine.purchaseReturn.purchaseReturnNumber);
      }
      quantities.set(sourceLineId, existing);
    }
    return quantities;
  }

  private attachReturnContext(
    line: InternalBaseLine,
    returnedQuantityByLine: Map<string, { quantity: Prisma.Decimal; postedReturnNumbers: Set<string>; returnNumbers: Set<string> }>,
  ): InternalBaseLine {
    const returnContext = returnedQuantityByLine.get(line.sourceLineId);
    if (!returnContext) return line;
    const returnNumbers = [...returnContext.returnNumbers].sort();
    const postedReturnNumbers = [...returnContext.postedReturnNumbers].sort();
    const warnings = [
      ...line.warnings,
      `Already returned quantity context: ${this.decimalString(returnContext.quantity)} from ${returnNumbers.join(", ")}. Preview does not adjust the source line or remaining quantity.`,
    ];
    if (postedReturnNumbers.length > 0) {
      warnings.push(`Operational return stock-out already posted for ${postedReturnNumbers.join(", ")}; landed cost preview remains non-posting.`);
    }
    return {
      ...line,
      returnedQuantity: this.decimalString(returnContext.quantity),
      warnings,
    };
  }

  private validateAllocationBases(dto: LandedCostPreviewDto, baseLines: InternalBaseLine[], totalLandedCosts: Prisma.Decimal): string[] {
    const blockers: string[] = [];
    if (baseLines.length === 0) {
      blockers.push("No inventory lines are available for landed cost allocation.");
      return blockers;
    }

    const zeroQuantityLines = baseLines.filter((line) => line.quantityDecimal.lte(0));
    for (const line of zeroQuantityLines) {
      blockers.push(`Line ${line.sourceLineId} has zero quantity and cannot receive landed unit cost.`);
    }

    if (dto.allocationMethod === "BY_QUANTITY") {
      const totalQuantity = baseLines.reduce((sum, line) => sum.plus(line.quantityDecimal), ZERO);
      if (totalQuantity.lte(0)) blockers.push("Quantity allocation requires non-zero inventory quantity.");
    }

    if (dto.allocationMethod === "BY_VALUE") {
      const zeroValueLines = baseLines.filter((line) => line.baseLineValueDecimal.lte(0));
      for (const line of zeroValueLines) {
        blockers.push(`Line ${line.sourceLineId} has zero base value and cannot receive value-based landed cost.`);
      }
      const totalValue = baseLines.reduce((sum, line) => sum.plus(line.baseLineValueDecimal), ZERO);
      if (totalValue.lte(0)) blockers.push("Value allocation requires non-zero base inventory value.");
    }

    if (dto.allocationMethod === "MANUAL") {
      blockers.push(...this.validateManualAllocations(dto, baseLines, totalLandedCosts));
    }

    return blockers;
  }

  private validateManualAllocations(dto: LandedCostPreviewDto, baseLines: InternalBaseLine[], totalLandedCosts: Prisma.Decimal): string[] {
    const blockers: string[] = [];
    const sourceLineIds = new Set(baseLines.map((line) => line.sourceLineId));
    const seenLineIds = new Set<string>();
    let manualTotal = ZERO;

    for (const allocation of dto.manualAllocations ?? []) {
      const amount = this.decimal(allocation.amount);
      if (amount.lt(0)) {
        throw new BadRequestException("Manual allocation amounts must be non-negative.");
      }
      manualTotal = manualTotal.plus(amount);
      if (!sourceLineIds.has(allocation.sourceLineId)) {
        blockers.push(`Manual allocation references unknown source line ${allocation.sourceLineId}.`);
      }
      if (seenLineIds.has(allocation.sourceLineId)) {
        blockers.push(`Manual allocation source line ${allocation.sourceLineId} is duplicated.`);
      }
      seenLineIds.add(allocation.sourceLineId);
    }

    if (!this.round(manualTotal).eq(this.round(totalLandedCosts))) {
      blockers.push("Manual allocation total must equal total landed costs.");
    }

    return blockers;
  }

  private allocate(baseLines: InternalBaseLine[], totalLandedCosts: Prisma.Decimal, dto: LandedCostPreviewDto): LandedCostLineAllocation[] {
    if (dto.allocationMethod === "MANUAL") {
      const manualAmounts = new Map((dto.manualAllocations ?? []).map((allocation) => [allocation.sourceLineId, this.round(allocation.amount)]));
      return this.allocationsFromAmounts(baseLines, totalLandedCosts, baseLines.map((line) => manualAmounts.get(line.sourceLineId) ?? ZERO));
    }

    if (dto.allocationMethod === "EQUAL") {
      return this.allocateByWeight(baseLines, totalLandedCosts, () => new Prisma.Decimal(1));
    }

    if (dto.allocationMethod === "BY_QUANTITY") {
      return this.allocateByWeight(baseLines, totalLandedCosts, (line) => line.quantityDecimal);
    }

    return this.allocateByWeight(baseLines, totalLandedCosts, (line) => line.baseLineValueDecimal);
  }

  private allocateByWeight(
    baseLines: InternalBaseLine[],
    totalLandedCosts: Prisma.Decimal,
    weight: (line: InternalBaseLine) => Prisma.Decimal,
  ): LandedCostLineAllocation[] {
    const totalWeight = baseLines.reduce((sum, line) => sum.plus(weight(line)), ZERO);
    let allocatedSoFar = ZERO;
    const amounts = baseLines.map((line, index) => {
      if (index === baseLines.length - 1) return this.round(totalLandedCosts.minus(allocatedSoFar));
      const amount = this.round(totalWeight.eq(0) ? ZERO : totalLandedCosts.mul(weight(line)).div(totalWeight));
      allocatedSoFar = allocatedSoFar.plus(amount);
      return amount;
    });
    return this.allocationsFromAmounts(baseLines, totalLandedCosts, amounts);
  }

  private allocationsFromAmounts(baseLines: InternalBaseLine[], totalLandedCosts: Prisma.Decimal, amounts: Prisma.Decimal[]): LandedCostLineAllocation[] {
    return baseLines.map((line, index) => {
      const allocatedLandedCost = amounts[index] ?? ZERO;
      const landedUnitCostIncrease = line.quantityDecimal.eq(0) ? ZERO : allocatedLandedCost.div(line.quantityDecimal);
      const previewLandedLineValue = line.baseLineValueDecimal.plus(allocatedLandedCost);
      const previewLandedUnitCost = line.baseUnitCostDecimal.plus(landedUnitCostIncrease);
      const allocationPercent = totalLandedCosts.eq(0) ? ZERO : allocatedLandedCost.div(totalLandedCosts).mul(100);
      return {
        sourceLineId: line.sourceLineId,
        allocatedLandedCost: this.decimalString(allocatedLandedCost),
        landedUnitCostIncrease: this.decimalString(landedUnitCostIncrease),
        previewLandedUnitCost: this.decimalString(previewLandedUnitCost),
        previewLandedLineValue: this.decimalString(previewLandedLineValue),
        allocationPercent: this.decimalString(allocationPercent),
      };
    });
  }

  private normalizeCostLines(costLines: LandedCostLineDto[]) {
    return costLines.map((line) => {
      const amountDecimal = this.decimal(line.amount);
      if (amountDecimal.lt(0)) {
        throw new BadRequestException("Landed cost amounts must be non-negative.");
      }
      return {
        amountDecimal,
        output: {
          category: line.category,
          description: line.description?.trim() ? line.description.trim() : null,
          amount: this.decimalString(amountDecimal),
          currency: line.currency ? line.currency.toUpperCase() : null,
          supplierId: line.supplierId ?? null,
        },
      };
    });
  }

  private async validateCostLineSuppliers(
    organizationId: string,
    costLines: { output: LandedCostPreviewCostLine; amountDecimal: Prisma.Decimal }[],
  ): Promise<void> {
    const supplierIds = [...new Set(costLines.map((line) => line.output.supplierId).filter((supplierId): supplierId is string => Boolean(supplierId)))];
    if (supplierIds.length === 0) return;
    const validSupplierCount = await this.prisma.contact.count({
      where: {
        organizationId,
        id: { in: supplierIds },
        type: { in: [ContactType.SUPPLIER, ContactType.BOTH] },
        isActive: true,
      },
    });
    if (validSupplierCount !== supplierIds.length) {
      throw new BadRequestException("Cost line supplier must belong to the organization and be an active supplier.");
    }
  }

  private emptyPreview(
    dto: Pick<LandedCostPreviewDto, "sourceType" | "allocationMethod">,
    costLines: { output: LandedCostPreviewCostLine; amountDecimal: Prisma.Decimal }[],
    blockers: string[],
  ): LandedCostPreviewResponse {
    const totalLandedCosts = costLines.reduce((sum, line) => sum.plus(line.amountDecimal), ZERO);
    return {
      readOnly: true,
      previewOnly: true,
      noMutation: true,
      noPostingEffect: true,
      noInventoryEffect: true,
      noApEffect: true,
      noVatEffect: true,
      noZatcaEffect: true,
      noEmailEffect: true,
      generatedAt: new Date().toISOString(),
      source: null,
      allocationMethod: dto.allocationMethod,
      baseLines: [],
      costLines: costLines.map((line) => line.output),
      allocation: [],
      totals: {
        baseInventoryValue: "0.0000",
        totalLandedCosts: this.decimalString(totalLandedCosts),
        previewLandedInventoryValue: "0.0000",
      },
      blockers,
      warnings: this.standardWarnings(dto.sourceType),
    };
  }

  private publicBaseLine(line: InternalBaseLine): LandedCostBaseLine {
    return {
      sourceLineId: line.sourceLineId,
      itemId: line.itemId,
      itemName: line.itemName,
      itemSku: line.itemSku,
      quantity: line.quantity,
      returnedQuantity: line.returnedQuantity,
      baseUnitCost: line.baseUnitCost,
      baseLineValue: line.baseLineValue,
      warnings: line.warnings,
    };
  }

  private responseWarnings(baseLines: InternalBaseLine[]): string[] {
    return [...this.standardWarnings(), ...baseLines.flatMap((line) => line.warnings)];
  }

  private standardWarnings(sourceType?: LandedCostSourceType): string[] {
    const unsupportedSourceWarning = sourceType === "PURCHASE_ORDER" ? ["Purchase order support is deferred until accountant-reviewed policy exists for open order cost modeling."] : [];
    return [
      "Landed cost preview is read-only and planning-only.",
      "No journals, inventory item costs, moving average, FIFO/cost layers, AP balances, purchase bill balances, VAT reports, financial statements, payments, debit notes, refunds, ZATCA calls, emails, or source documents are created or changed.",
      ...unsupportedSourceWarning,
    ];
  }

  private decimal(value: Prisma.Decimal | string | number): Prisma.Decimal {
    return new Prisma.Decimal(value);
  }

  private round(value: Prisma.Decimal | string | number): Prisma.Decimal {
    return this.decimal(value).toDecimalPlaces(4);
  }

  private decimalString(value: Prisma.Decimal | string | number): string {
    return this.round(value).toFixed(4);
  }
}
