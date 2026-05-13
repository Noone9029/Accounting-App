import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { ItemStatus, Prisma, StockMovementType, WarehouseStatus } from "@prisma/client";
import { AuditLogService } from "../audit-log/audit-log.service";
import { PrismaService } from "../prisma/prisma.service";
import { CreateStockMovementDto } from "./dto/create-stock-movement.dto";
import { StockMovementQueryDto } from "./dto/stock-movement-query.dto";
import { STOCK_MOVEMENT_MVP_CREATE_TYPES, stockMovementDirection } from "./stock-movement-rules";

const stockMovementInclude = {
  item: { select: { id: true, name: true, sku: true, type: true, status: true, inventoryTracking: true } },
  warehouse: { select: { id: true, code: true, name: true, status: true, isDefault: true } },
  createdBy: { select: { id: true, name: true, email: true } },
};

@Injectable()
export class StockMovementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  list(organizationId: string, query: StockMovementQueryDto) {
    const dateFilter = this.dateFilter(query.from, query.to);
    return this.prisma.stockMovement.findMany({
      where: {
        organizationId,
        itemId: query.itemId,
        warehouseId: query.warehouseId,
        type: query.type,
        movementDate: dateFilter,
      },
      include: stockMovementInclude,
      orderBy: [{ movementDate: "desc" }, { createdAt: "desc" }],
    });
  }

  async get(organizationId: string, id: string) {
    const movement = await this.prisma.stockMovement.findFirst({
      where: { id, organizationId },
      include: stockMovementInclude,
    });
    if (!movement) {
      throw new NotFoundException("Stock movement not found.");
    }
    return movement;
  }

  async create(organizationId: string, actorUserId: string, dto: CreateStockMovementDto) {
    if (!STOCK_MOVEMENT_MVP_CREATE_TYPES.has(dto.type)) {
      throw new BadRequestException("Only opening balance and adjustment stock movement types can be created in this MVP.");
    }

    const item = await this.prisma.item.findFirst({
      where: { id: dto.itemId, organizationId },
      select: { id: true, inventoryTracking: true, status: true },
    });
    if (!item) {
      throw new BadRequestException("Item must belong to this organization.");
    }
    if (!item.inventoryTracking) {
      throw new BadRequestException("Stock movements can only be created for inventory-tracked items.");
    }
    if (item.status !== ItemStatus.ACTIVE) {
      throw new BadRequestException("Stock movements can only be created for active items.");
    }

    const warehouse = await this.prisma.warehouse.findFirst({
      where: { id: dto.warehouseId, organizationId },
      select: { id: true, status: true },
    });
    if (!warehouse) {
      throw new BadRequestException("Warehouse must belong to this organization.");
    }
    if (warehouse.status !== WarehouseStatus.ACTIVE) {
      throw new BadRequestException("Archived warehouses cannot receive stock movements.");
    }

    const quantity = this.positiveDecimal(dto.quantity, "Quantity");
    const unitCost = dto.unitCost === undefined ? null : this.nonNegativeDecimal(dto.unitCost, "Unit cost");
    const movementDate = this.requiredDate(dto.movementDate, "Movement date");

    if (dto.type === StockMovementType.OPENING_BALANCE) {
      const openingBalanceCount = await this.prisma.stockMovement.count({
        where: { organizationId, itemId: item.id, warehouseId: warehouse.id, type: StockMovementType.OPENING_BALANCE },
      });
      if (openingBalanceCount > 0) {
        throw new BadRequestException("Opening balance already exists for this item and warehouse.");
      }
    }

    if (dto.type === StockMovementType.ADJUSTMENT_OUT) {
      const currentQuantity = await this.quantityOnHand(organizationId, item.id, warehouse.id);
      if (currentQuantity.minus(quantity).lt(0)) {
        throw new BadRequestException("Adjustment out cannot make stock negative.");
      }
    }

    const movement = await this.prisma.stockMovement.create({
      data: {
        organizationId,
        itemId: item.id,
        warehouseId: warehouse.id,
        movementDate,
        type: dto.type,
        quantity: quantity.toFixed(4),
        unitCost: unitCost?.toFixed(4) ?? null,
        totalCost: unitCost ? quantity.mul(unitCost).toFixed(4) : null,
        description: this.cleanOptional(dto.description),
        createdById: actorUserId,
      },
      include: stockMovementInclude,
    });

    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: "CREATE",
      entityType: "StockMovement",
      entityId: movement.id,
      after: movement,
    });
    return movement;
  }

  async quantityOnHand(organizationId: string, itemId: string, warehouseId: string): Promise<Prisma.Decimal> {
    const movements = await this.prisma.stockMovement.findMany({
      where: { organizationId, itemId, warehouseId },
      select: { type: true, quantity: true },
    });

    return movements.reduce((quantity, movement) => {
      const value = this.decimal(movement.quantity);
      return stockMovementDirection(movement.type) === "IN" ? quantity.plus(value) : quantity.minus(value);
    }, new Prisma.Decimal(0));
  }

  private dateFilter(fromValue?: string, toValue?: string): Prisma.DateTimeFilter<"StockMovement"> | undefined {
    const from = fromValue ? this.requiredDate(fromValue, "From date") : null;
    const to = toValue ? this.requiredDate(toValue, "To date", true) : null;
    if (from && to && from > to) {
      throw new BadRequestException("From date cannot be after to date.");
    }
    if (!from && !to) {
      return undefined;
    }
    return { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) };
  }

  private requiredDate(value: string, label: string, endOfDay = false): Date {
    const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
    const date = new Date(dateOnly && endOfDay ? `${value}T23:59:59.999Z` : value);
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

  private nonNegativeDecimal(value: Prisma.Decimal.Value, label: string): Prisma.Decimal {
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
}
