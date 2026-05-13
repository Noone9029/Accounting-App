import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { ItemStatus, NumberSequenceScope, Prisma, StockMovementType, WarehouseStatus, WarehouseTransferStatus } from "@prisma/client";
import { AuditLogService } from "../audit-log/audit-log.service";
import { NumberSequenceService } from "../number-sequences/number-sequence.service";
import { PrismaService } from "../prisma/prisma.service";
import { stockMovementDirection } from "../stock-movements/stock-movement-rules";
import { CreateWarehouseTransferDto } from "./dto/create-warehouse-transfer.dto";

const warehouseTransferInclude = {
  item: { select: { id: true, name: true, sku: true, type: true, status: true, inventoryTracking: true } },
  fromWarehouse: { select: { id: true, code: true, name: true, status: true, isDefault: true } },
  toWarehouse: { select: { id: true, code: true, name: true, status: true, isDefault: true } },
  fromStockMovement: { select: { id: true, type: true, movementDate: true, quantity: true, referenceType: true, referenceId: true } },
  toStockMovement: { select: { id: true, type: true, movementDate: true, quantity: true, referenceType: true, referenceId: true } },
  voidFromStockMovement: { select: { id: true, type: true, movementDate: true, quantity: true, referenceType: true, referenceId: true } },
  voidToStockMovement: { select: { id: true, type: true, movementDate: true, quantity: true, referenceType: true, referenceId: true } },
  createdBy: { select: { id: true, name: true, email: true } },
};

type PrismaExecutor = PrismaService | Prisma.TransactionClient;

@Injectable()
export class WarehouseTransferService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
    private readonly numberSequenceService: NumberSequenceService,
  ) {}

  list(organizationId: string) {
    return this.prisma.warehouseTransfer.findMany({
      where: { organizationId },
      orderBy: [{ transferDate: "desc" }, { createdAt: "desc" }],
      include: warehouseTransferInclude,
    });
  }

  async get(organizationId: string, id: string) {
    const transfer = await this.prisma.warehouseTransfer.findFirst({
      where: { id, organizationId },
      include: warehouseTransferInclude,
    });
    if (!transfer) {
      throw new NotFoundException("Warehouse transfer not found.");
    }
    return transfer;
  }

  async create(organizationId: string, actorUserId: string, dto: CreateWarehouseTransferDto) {
    if (dto.fromWarehouseId === dto.toWarehouseId) {
      throw new BadRequestException("Transfer source and destination warehouses must be different.");
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const item = await this.findTrackedActiveItem(organizationId, dto.itemId, tx);
      const [fromWarehouse, toWarehouse] = await Promise.all([
        this.findActiveWarehouse(organizationId, dto.fromWarehouseId, "source", tx),
        this.findActiveWarehouse(organizationId, dto.toWarehouseId, "destination", tx),
      ]);
      const quantity = this.positiveDecimal(dto.quantity, "Quantity");
      const unitCost = this.optionalNonNegativeDecimal(dto.unitCost, "Unit cost");
      const transferDate = this.requiredDate(dto.transferDate, "Transfer date");

      const sourceQuantity = await this.quantityOnHand(organizationId, item.id, fromWarehouse.id, tx);
      if (sourceQuantity.minus(quantity).lt(0)) {
        throw new BadRequestException("Warehouse transfer cannot make source warehouse stock negative.");
      }

      const transferNumber = await this.numberSequenceService.next(organizationId, NumberSequenceScope.WAREHOUSE_TRANSFER, tx);
      const postedAt = new Date();
      const transfer = await tx.warehouseTransfer.create({
        data: {
          organizationId,
          transferNumber,
          itemId: item.id,
          fromWarehouseId: fromWarehouse.id,
          toWarehouseId: toWarehouse.id,
          status: WarehouseTransferStatus.POSTED,
          transferDate,
          quantity: quantity.toFixed(4),
          unitCost: unitCost?.toFixed(4) ?? null,
          totalCost: unitCost ? quantity.mul(unitCost).toFixed(4) : null,
          description: this.cleanOptional(dto.description),
          createdById: actorUserId,
          postedAt,
        },
        select: { id: true },
      });

      const fromMovement = await this.createStockMovement(tx, {
        organizationId,
        actorUserId,
        itemId: item.id,
        warehouseId: fromWarehouse.id,
        movementDate: transferDate,
        type: StockMovementType.TRANSFER_OUT,
        quantity,
        unitCost,
        referenceType: "WarehouseTransfer",
        referenceId: transfer.id,
        description: `Warehouse transfer ${transferNumber} out`,
      });
      const toMovement = await this.createStockMovement(tx, {
        organizationId,
        actorUserId,
        itemId: item.id,
        warehouseId: toWarehouse.id,
        movementDate: transferDate,
        type: StockMovementType.TRANSFER_IN,
        quantity,
        unitCost,
        referenceType: "WarehouseTransfer",
        referenceId: transfer.id,
        description: `Warehouse transfer ${transferNumber} in`,
      });

      await tx.warehouseTransfer.update({
        where: { id: transfer.id },
        data: {
          fromStockMovementId: fromMovement.id,
          toStockMovementId: toMovement.id,
        },
      });
      return tx.warehouseTransfer.findUniqueOrThrow({ where: { id: transfer.id }, include: warehouseTransferInclude });
    });

    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: "CREATE",
      entityType: "WarehouseTransfer",
      entityId: created.id,
      after: created,
    });
    return created;
  }

  async void(organizationId: string, actorUserId: string, id: string) {
    const existing = await this.get(organizationId, id);
    if (existing.status === WarehouseTransferStatus.VOIDED) {
      throw new BadRequestException("Warehouse transfer is already voided.");
    }

    const voided = await this.prisma.$transaction(async (tx) => {
      const transfer = await tx.warehouseTransfer.findFirst({ where: { id, organizationId } });
      if (!transfer) {
        throw new NotFoundException("Warehouse transfer not found.");
      }
      if (transfer.status === WarehouseTransferStatus.VOIDED) {
        throw new BadRequestException("Warehouse transfer is already voided.");
      }

      const quantity = new Prisma.Decimal(transfer.quantity);
      const destinationQuantity = await this.quantityOnHand(organizationId, transfer.itemId, transfer.toWarehouseId, tx);
      if (destinationQuantity.minus(quantity).lt(0)) {
        throw new BadRequestException("Voiding this warehouse transfer cannot make destination warehouse stock negative.");
      }

      const voidedAt = new Date();
      const claim = await tx.warehouseTransfer.updateMany({
        where: { id, organizationId, status: WarehouseTransferStatus.POSTED },
        data: { status: WarehouseTransferStatus.VOIDED, voidedAt },
      });
      if (claim.count !== 1) {
        throw new BadRequestException("Warehouse transfer is no longer posted.");
      }

      const unitCost = transfer.unitCost === null ? null : new Prisma.Decimal(transfer.unitCost);
      const voidFromMovement = await this.createStockMovement(tx, {
        organizationId,
        actorUserId,
        itemId: transfer.itemId,
        warehouseId: transfer.fromWarehouseId,
        movementDate: voidedAt,
        type: StockMovementType.TRANSFER_IN,
        quantity,
        unitCost,
        referenceType: "WarehouseTransferVoid",
        referenceId: transfer.id,
        description: `Void warehouse transfer ${transfer.transferNumber} back into source`,
      });
      const voidToMovement = await this.createStockMovement(tx, {
        organizationId,
        actorUserId,
        itemId: transfer.itemId,
        warehouseId: transfer.toWarehouseId,
        movementDate: voidedAt,
        type: StockMovementType.TRANSFER_OUT,
        quantity,
        unitCost,
        referenceType: "WarehouseTransferVoid",
        referenceId: transfer.id,
        description: `Void warehouse transfer ${transfer.transferNumber} out of destination`,
      });

      await tx.warehouseTransfer.update({
        where: { id },
        data: {
          voidFromStockMovementId: voidFromMovement.id,
          voidToStockMovementId: voidToMovement.id,
        },
      });
      return tx.warehouseTransfer.findUniqueOrThrow({ where: { id }, include: warehouseTransferInclude });
    });

    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: "VOID",
      entityType: "WarehouseTransfer",
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
      throw new BadRequestException("Warehouse transfers can only be created for inventory-tracked items.");
    }
    if (item.status !== ItemStatus.ACTIVE) {
      throw new BadRequestException("Warehouse transfers can only be created for active items.");
    }
    return item;
  }

  private async findActiveWarehouse(
    organizationId: string,
    warehouseId: string,
    label: "source" | "destination",
    executor: PrismaExecutor,
  ) {
    const warehouse = await executor.warehouse.findFirst({
      where: { id: warehouseId, organizationId },
      select: { id: true, status: true },
    });
    if (!warehouse) {
      throw new BadRequestException(`Transfer ${label} warehouse must belong to this organization.`);
    }
    if (warehouse.status !== WarehouseStatus.ACTIVE) {
      throw new BadRequestException(`Transfer ${label} warehouse must be active.`);
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
