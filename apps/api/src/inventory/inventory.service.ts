import { BadRequestException, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { STOCK_MOVEMENT_IN_TYPES, stockMovementDirection } from "../stock-movements/stock-movement-rules";
import { InventoryBalanceQueryDto } from "./dto/inventory-balance-query.dto";

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  async balances(organizationId: string, query: InventoryBalanceQueryDto) {
    const items = await this.prisma.item.findMany({
      where: {
        organizationId,
        inventoryTracking: true,
        ...(query.itemId ? { id: query.itemId } : {}),
      },
      select: { id: true, name: true, sku: true, type: true, status: true, inventoryTracking: true },
      orderBy: { name: "asc" },
    });
    if (query.itemId && items.length === 0) {
      throw new BadRequestException("Item must be inventory-tracked and belong to this organization.");
    }

    const warehouses = await this.prisma.warehouse.findMany({
      where: {
        organizationId,
        ...(query.warehouseId ? { id: query.warehouseId } : {}),
      },
      select: { id: true, code: true, name: true, status: true, isDefault: true },
      orderBy: [{ isDefault: "desc" }, { code: "asc" }],
    });
    if (query.warehouseId && warehouses.length === 0) {
      throw new BadRequestException("Warehouse must belong to this organization.");
    }

    if (items.length === 0 || warehouses.length === 0) {
      return [];
    }

    const movements = await this.prisma.stockMovement.findMany({
      where: {
        organizationId,
        itemId: { in: items.map((item) => item.id) },
        warehouseId: { in: warehouses.map((warehouse) => warehouse.id) },
      },
      select: { itemId: true, warehouseId: true, type: true, quantity: true, unitCost: true, totalCost: true },
    });
    const grouped = new Map<string, typeof movements>();

    for (const movement of movements) {
      const key = this.balanceKey(movement.itemId, movement.warehouseId);
      grouped.set(key, [...(grouped.get(key) ?? []), movement]);
    }

    return items.flatMap((item) =>
      warehouses.map((warehouse) => {
        const group = grouped.get(this.balanceKey(item.id, warehouse.id)) ?? [];
        const summary = this.summarize(group);
        return {
          item,
          warehouse,
          quantityOnHand: summary.quantityOnHand.toFixed(4),
          averageUnitCost: summary.averageUnitCost?.toFixed(4) ?? null,
          inventoryValue: summary.inventoryValue?.toFixed(4) ?? null,
        };
      }),
    );
  }

  private summarize(
    movements: Array<{
      type: Parameters<typeof stockMovementDirection>[0];
      quantity: Prisma.Decimal.Value;
      unitCost: Prisma.Decimal.Value | null;
      totalCost: Prisma.Decimal.Value | null;
    }>,
  ): { quantityOnHand: Prisma.Decimal; averageUnitCost: Prisma.Decimal | null; inventoryValue: Prisma.Decimal | null } {
    let quantityOnHand = new Prisma.Decimal(0);
    let costedInQuantity = new Prisma.Decimal(0);
    let costedInValue = new Prisma.Decimal(0);

    for (const movement of movements) {
      const quantity = new Prisma.Decimal(movement.quantity);
      if (stockMovementDirection(movement.type) === "IN") {
        quantityOnHand = quantityOnHand.plus(quantity);
      } else {
        quantityOnHand = quantityOnHand.minus(quantity);
      }

      if (STOCK_MOVEMENT_IN_TYPES.has(movement.type) && movement.unitCost) {
        costedInQuantity = costedInQuantity.plus(quantity);
        costedInValue = costedInValue.plus(movement.totalCost ? new Prisma.Decimal(movement.totalCost) : quantity.mul(movement.unitCost));
      }
    }

    const averageUnitCost = costedInQuantity.gt(0) ? costedInValue.div(costedInQuantity) : null;
    return {
      quantityOnHand,
      averageUnitCost,
      inventoryValue: averageUnitCost ? averageUnitCost.mul(quantityOnHand) : null,
    };
  }

  private balanceKey(itemId: string, warehouseId: string): string {
    return `${itemId}:${warehouseId}`;
  }
}
