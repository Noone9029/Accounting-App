import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import {
  InventoryAdjustmentStatus,
  InventoryAdjustmentType,
  ItemStatus,
  NumberSequenceScope,
  Prisma,
  StockMovementType,
  WarehouseStatus,
} from "@prisma/client";
import { AuditLogService } from "../audit-log/audit-log.service";
import { NumberSequenceService } from "../number-sequences/number-sequence.service";
import { PrismaService } from "../prisma/prisma.service";
import { stockMovementDirection } from "../stock-movements/stock-movement-rules";
import { CreateInventoryAdjustmentDto } from "./dto/create-inventory-adjustment.dto";
import { UpdateInventoryAdjustmentDto } from "./dto/update-inventory-adjustment.dto";

const inventoryAdjustmentInclude = {
  item: { select: { id: true, name: true, sku: true, type: true, status: true, inventoryTracking: true } },
  warehouse: { select: { id: true, code: true, name: true, status: true, isDefault: true } },
  stockMovement: { select: { id: true, type: true, movementDate: true, quantity: true, referenceType: true, referenceId: true } },
  voidStockMovement: { select: { id: true, type: true, movementDate: true, quantity: true, referenceType: true, referenceId: true } },
  createdBy: { select: { id: true, name: true, email: true } },
  approvedBy: { select: { id: true, name: true, email: true } },
  voidedBy: { select: { id: true, name: true, email: true } },
};

type PrismaExecutor = PrismaService | Prisma.TransactionClient;

@Injectable()
export class InventoryAdjustmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
    private readonly numberSequenceService: NumberSequenceService,
  ) {}

  list(organizationId: string) {
    return this.prisma.inventoryAdjustment.findMany({
      where: { organizationId },
      orderBy: [{ adjustmentDate: "desc" }, { createdAt: "desc" }],
      include: inventoryAdjustmentInclude,
    });
  }

  async get(organizationId: string, id: string) {
    const adjustment = await this.prisma.inventoryAdjustment.findFirst({
      where: { id, organizationId },
      include: inventoryAdjustmentInclude,
    });
    if (!adjustment) {
      throw new NotFoundException("Inventory adjustment not found.");
    }
    return adjustment;
  }

  async create(organizationId: string, actorUserId: string, dto: CreateInventoryAdjustmentDto) {
    const created = await this.prisma.$transaction(async (tx) => {
      const item = await this.findTrackedActiveItem(organizationId, dto.itemId, tx);
      const warehouse = await this.findActiveWarehouse(organizationId, dto.warehouseId, tx);
      const quantity = this.positiveDecimal(dto.quantity, "Quantity");
      const unitCost = this.optionalNonNegativeDecimal(dto.unitCost, "Unit cost");
      const adjustmentDate = this.requiredDate(dto.adjustmentDate, "Adjustment date");
      const adjustmentNumber = await this.numberSequenceService.next(organizationId, NumberSequenceScope.INVENTORY_ADJUSTMENT, tx);

      const adjustment = await tx.inventoryAdjustment.create({
        data: {
          organizationId,
          adjustmentNumber,
          itemId: item.id,
          warehouseId: warehouse.id,
          type: dto.type,
          adjustmentDate,
          quantity: quantity.toFixed(4),
          unitCost: unitCost?.toFixed(4) ?? null,
          totalCost: unitCost ? quantity.mul(unitCost).toFixed(4) : null,
          reason: this.cleanOptional(dto.reason),
          createdById: actorUserId,
        },
        select: { id: true },
      });

      return tx.inventoryAdjustment.findUniqueOrThrow({ where: { id: adjustment.id }, include: inventoryAdjustmentInclude });
    });

    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: "CREATE",
      entityType: "InventoryAdjustment",
      entityId: created.id,
      after: created,
    });
    return created;
  }

  async update(organizationId: string, actorUserId: string, id: string, dto: UpdateInventoryAdjustmentDto) {
    const existing = await this.get(organizationId, id);
    if (existing.status !== InventoryAdjustmentStatus.DRAFT) {
      throw new BadRequestException("Only draft inventory adjustments can be edited.");
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const data: Prisma.InventoryAdjustmentUncheckedUpdateInput = {};

      if (dto.itemId !== undefined) {
        const item = await this.findTrackedActiveItem(organizationId, dto.itemId, tx);
        data.itemId = item.id;
      }
      if (dto.warehouseId !== undefined) {
        const warehouse = await this.findActiveWarehouse(organizationId, dto.warehouseId, tx);
        data.warehouseId = warehouse.id;
      }
      if (dto.type !== undefined) {
        data.type = dto.type;
      }
      if (dto.adjustmentDate !== undefined) {
        data.adjustmentDate = this.requiredDate(dto.adjustmentDate, "Adjustment date");
      }
      if (dto.reason !== undefined) {
        data.reason = this.cleanOptional(dto.reason);
      }

      const quantity = dto.quantity === undefined ? new Prisma.Decimal(existing.quantity) : this.positiveDecimal(dto.quantity, "Quantity");
      const unitCost =
        dto.unitCost === undefined
          ? existing.unitCost === null
            ? null
            : new Prisma.Decimal(existing.unitCost)
          : this.optionalNonNegativeDecimal(dto.unitCost, "Unit cost");

      if (dto.quantity !== undefined) {
        data.quantity = quantity.toFixed(4);
      }
      if (dto.unitCost !== undefined) {
        data.unitCost = unitCost?.toFixed(4) ?? null;
      }
      if (dto.quantity !== undefined || dto.unitCost !== undefined) {
        data.totalCost = unitCost ? quantity.mul(unitCost).toFixed(4) : null;
      }

      await tx.inventoryAdjustment.update({
        where: { id },
        data,
      });

      return tx.inventoryAdjustment.findUniqueOrThrow({ where: { id }, include: inventoryAdjustmentInclude });
    });

    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: "UPDATE",
      entityType: "InventoryAdjustment",
      entityId: id,
      before: existing,
      after: updated,
    });
    return updated;
  }

  async remove(organizationId: string, actorUserId: string, id: string) {
    const existing = await this.get(organizationId, id);
    if (existing.status !== InventoryAdjustmentStatus.DRAFT) {
      throw new BadRequestException("Only draft inventory adjustments can be deleted.");
    }

    await this.prisma.inventoryAdjustment.delete({ where: { id } });
    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: "DELETE",
      entityType: "InventoryAdjustment",
      entityId: id,
      before: existing,
    });
    return { deleted: true };
  }

  async approve(organizationId: string, actorUserId: string, id: string) {
    const approved = await this.prisma.$transaction(async (tx) => {
      const adjustment = await tx.inventoryAdjustment.findFirst({ where: { id, organizationId } });
      if (!adjustment) {
        throw new NotFoundException("Inventory adjustment not found.");
      }
      if (adjustment.status === InventoryAdjustmentStatus.APPROVED) {
        throw new BadRequestException("Inventory adjustment is already approved.");
      }
      if (adjustment.status === InventoryAdjustmentStatus.VOIDED) {
        throw new BadRequestException("Voided inventory adjustments cannot be approved.");
      }

      const quantity = new Prisma.Decimal(adjustment.quantity);
      if (adjustment.type === InventoryAdjustmentType.DECREASE) {
        const currentQuantity = await this.quantityOnHand(organizationId, adjustment.itemId, adjustment.warehouseId, tx);
        if (currentQuantity.minus(quantity).lt(0)) {
          throw new BadRequestException("Decrease adjustment cannot make stock negative.");
        }
      }

      const approvedAt = new Date();
      const claim = await tx.inventoryAdjustment.updateMany({
        where: { id, organizationId, status: InventoryAdjustmentStatus.DRAFT },
        data: { status: InventoryAdjustmentStatus.APPROVED, approvedById: actorUserId, approvedAt },
      });
      if (claim.count !== 1) {
        throw new BadRequestException("Inventory adjustment is no longer draft.");
      }

      const movement = await this.createStockMovement(tx, {
        organizationId,
        actorUserId,
        itemId: adjustment.itemId,
        warehouseId: adjustment.warehouseId,
        movementDate: adjustment.adjustmentDate,
        type: adjustment.type === InventoryAdjustmentType.INCREASE ? StockMovementType.ADJUSTMENT_IN : StockMovementType.ADJUSTMENT_OUT,
        quantity,
        unitCost: adjustment.unitCost,
        referenceType: "InventoryAdjustment",
        referenceId: adjustment.id,
        description: `Inventory adjustment ${adjustment.adjustmentNumber}`,
      });

      await tx.inventoryAdjustment.update({
        where: { id },
        data: { stockMovementId: movement.id },
      });
      return tx.inventoryAdjustment.findUniqueOrThrow({ where: { id }, include: inventoryAdjustmentInclude });
    });

    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: "APPROVE",
      entityType: "InventoryAdjustment",
      entityId: id,
      after: approved,
    });
    return approved;
  }

  async void(organizationId: string, actorUserId: string, id: string) {
    const existing = await this.get(organizationId, id);
    if (existing.status === InventoryAdjustmentStatus.VOIDED) {
      throw new BadRequestException("Inventory adjustment is already voided.");
    }

    const voided = await this.prisma.$transaction(async (tx) => {
      const adjustment = await tx.inventoryAdjustment.findFirst({ where: { id, organizationId } });
      if (!adjustment) {
        throw new NotFoundException("Inventory adjustment not found.");
      }
      if (adjustment.status === InventoryAdjustmentStatus.VOIDED) {
        throw new BadRequestException("Inventory adjustment is already voided.");
      }

      const voidedAt = new Date();
      if (adjustment.status === InventoryAdjustmentStatus.DRAFT) {
        await tx.inventoryAdjustment.update({
          where: { id },
          data: { status: InventoryAdjustmentStatus.VOIDED, voidedById: actorUserId, voidedAt },
        });
        return tx.inventoryAdjustment.findUniqueOrThrow({ where: { id }, include: inventoryAdjustmentInclude });
      }

      const quantity = new Prisma.Decimal(adjustment.quantity);
      const reversalType =
        adjustment.type === InventoryAdjustmentType.INCREASE ? StockMovementType.ADJUSTMENT_OUT : StockMovementType.ADJUSTMENT_IN;

      if (reversalType === StockMovementType.ADJUSTMENT_OUT) {
        const currentQuantity = await this.quantityOnHand(organizationId, adjustment.itemId, adjustment.warehouseId, tx);
        if (currentQuantity.minus(quantity).lt(0)) {
          throw new BadRequestException("Voiding this inventory adjustment cannot make stock negative.");
        }
      }

      const claim = await tx.inventoryAdjustment.updateMany({
        where: { id, organizationId, status: InventoryAdjustmentStatus.APPROVED },
        data: { status: InventoryAdjustmentStatus.VOIDED, voidedById: actorUserId, voidedAt },
      });
      if (claim.count !== 1) {
        throw new BadRequestException("Only draft or approved inventory adjustments can be voided.");
      }

      const movement = await this.createStockMovement(tx, {
        organizationId,
        actorUserId,
        itemId: adjustment.itemId,
        warehouseId: adjustment.warehouseId,
        movementDate: voidedAt,
        type: reversalType,
        quantity,
        unitCost: adjustment.unitCost,
        referenceType: "InventoryAdjustmentVoid",
        referenceId: adjustment.id,
        description: `Void inventory adjustment ${adjustment.adjustmentNumber}`,
      });

      await tx.inventoryAdjustment.update({
        where: { id },
        data: { voidStockMovementId: movement.id },
      });
      return tx.inventoryAdjustment.findUniqueOrThrow({ where: { id }, include: inventoryAdjustmentInclude });
    });

    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: "VOID",
      entityType: "InventoryAdjustment",
      entityId: id,
      before: existing,
      after: voided,
    });
    return voided;
  }

  private async findTrackedActiveItem(organizationId: string, itemId: string, executor: PrismaExecutor) {
    const item = await executor.item.findFirst({
      where: { id: itemId, organizationId },
      select: { id: true, inventoryTracking: true, status: true },
    });
    if (!item) {
      throw new BadRequestException("Item must belong to this organization.");
    }
    if (!item.inventoryTracking) {
      throw new BadRequestException("Inventory adjustments can only be created for inventory-tracked items.");
    }
    if (item.status !== ItemStatus.ACTIVE) {
      throw new BadRequestException("Inventory adjustments can only be created for active items.");
    }
    return item;
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
      throw new BadRequestException("Inventory adjustments require an active warehouse.");
    }
    return warehouse;
  }

  private async quantityOnHand(
    organizationId: string,
    itemId: string,
    warehouseId: string,
    executor: PrismaExecutor,
  ): Promise<Prisma.Decimal> {
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
      unitCost: Prisma.Decimal.Value | null;
      referenceType: string;
      referenceId: string;
      description: string;
    },
  ) {
    const unitCost = input.unitCost === null ? null : new Prisma.Decimal(input.unitCost);
    return tx.stockMovement.create({
      data: {
        organizationId: input.organizationId,
        itemId: input.itemId,
        warehouseId: input.warehouseId,
        movementDate: input.movementDate,
        type: input.type,
        quantity: input.quantity.toFixed(4),
        unitCost: unitCost?.toFixed(4) ?? null,
        totalCost: unitCost ? input.quantity.mul(unitCost).toFixed(4) : null,
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
}
