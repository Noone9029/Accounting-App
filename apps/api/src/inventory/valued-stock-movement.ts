import { BadRequestException } from "@nestjs/common";
import { Prisma, StockMovementType, ItemStatus, WarehouseStatus } from "@prisma/client";
import { FiscalPeriodGuardService } from "../fiscal-periods/fiscal-period-guard.service";
import { stockMovementDirection } from "../stock-movements/stock-movement-rules";
import { allocateInventorySourceCost, valueInventoryMovement } from "./inventory-valuation";
import { assertCurrentFlowSupportsTracking } from "./inventory-tracking-validation";

/** Call before reading document quantities. A single tenant lock also avoids transfer deadlocks. */
export async function lockInventory(tx: Prisma.TransactionClient, organizationId: string) {
  await tx.$queryRaw(Prisma.sql`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtextextended(${`inventory:${organizationId}`}, 0))`);
}

export async function createValuedStockMovement(tx: Prisma.TransactionClient, args: { data: Prisma.StockMovementUncheckedCreateInput; select?: unknown }) {
  const { data } = args;
  const { organizationId, itemId, warehouseId } = data;
  await lockInventory(tx, organizationId);
  const [item, warehouse] = await Promise.all([
    tx.item.findFirst({ where: { id: itemId, organizationId, inventoryTracking: true, status: ItemStatus.ACTIVE } }),
    tx.warehouse.findFirst({ where: { id: warehouseId, organizationId, status: WarehouseStatus.ACTIVE } }),
  ]);
  if (!item || !warehouse) throw new BadRequestException("Valued inventory requires an active tracked item and warehouse belonging to this organization.");
  assertCurrentFlowSupportsTracking(item, "Perpetual inventory valuation");
  const date = data.movementDate instanceof Date ? data.movementDate : new Date(data.movementDate);
  if (!Number.isFinite(date.getTime())) throw new BadRequestException("Inventory movement date is invalid.");
  // Hold the period row until commit so a concurrent period close cannot pass the guard and race this write.
  await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "FiscalPeriod" WHERE "organizationId" = ${organizationId}::uuid FOR SHARE`);
  await new FiscalPeriodGuardService(tx as never).assertPostingDateAllowed(organizationId, date, tx);
  const key = { organizationId, itemId, warehouseId };
  const existing = await tx.inventoryValuationBalance.findUnique({ where: { organizationId_itemId_warehouseId: key } });
  if (!existing && await tx.stockMovement.count({ where: key })) {
    throw new BadRequestException("Legacy inventory requires an accountant-reviewed valuation cutover before additional movements can be posted.");
  }
  if (existing?.lastMovementDate && date < existing.lastMovementDate) {
    throw new BadRequestException("Inventory movements cannot precede the latest valued movement; use a correction in an open period.");
  }
  if (data.type === StockMovementType.OPENING_BALANCE && (existing?.sequence ?? 0) > 0) {
    throw new BadRequestException("Opening inventory must be the first movement for this item and warehouse.");
  }
  let incomingValue = data.totalCost ?? (data.unitCost === undefined || data.unitCost === null ? null : new Prisma.Decimal(data.quantity.toString()).mul(data.unitCost.toString()));
  let reversalValue: string | undefined;
  let sourceValue: string | undefined;
  if ([StockMovementType.SALES_RETURN_IN, StockMovementType.PURCHASE_RETURN_OUT].includes(data.type as never) && !data.valuationSourceMovementId) {
    throw new BadRequestException("Inventory returns require the original valued source movement.");
  }
  if (data.valuationSourceMovementId) {
    const source = await tx.stockMovement.findFirst({ where: { id: data.valuationSourceMovementId, organizationId, itemId, valuationVersion: 1 } });
    if (!source || source.totalCost === null) throw new BadRequestException("Inventory return or correction requires the original valued source movement.");
    if (stockMovementDirection(source.type) === stockMovementDirection(data.type)) {
      throw new BadRequestException("Inventory corrections must reverse the direction of their source movement.");
    }
    const previous = await tx.stockMovement.aggregate({
      where: { organizationId, valuationSourceMovementId: source.id },
      _sum: { quantity: true, valuationSourceValue: true },
    });
    const allocated = allocateInventorySourceCost({ sourceQuantity: source.quantity, sourceValue: source.totalCost,
      previouslyAllocatedQuantity: previous._sum.quantity ?? 0, previouslyAllocatedValue: previous._sum.valuationSourceValue ?? 0, quantity: data.quantity.toString() });
    sourceValue = allocated;
    if (stockMovementDirection(data.type) === "IN") incomingValue = allocated;
    else if (data.type !== StockMovementType.PURCHASE_RETURN_OUT) reversalValue = allocated;
  }
  const valued = valueInventoryMovement({
    quantityBefore: existing?.quantity ?? 0, valueBefore: existing?.value ?? 0,
    quantity: data.quantity.toString(), direction: stockMovementDirection(data.type),
    incomingValue: incomingValue?.toString(), reversalValue,
  });
  const sequence = (existing?.sequence ?? 0) + 1;
  const movement = await tx.stockMovement.create({ data: {
    ...data, unitCost: valued.unitCost, totalCost: valued.totalCost,
    valuationVersion: 1, valuationSequence: sequence,
    valuationQuantityAfter: valued.quantityAfter, valuationValueAfter: valued.valueAfter,
    valuationSourceValue: sourceValue,
  } });
  await tx.inventoryValuationBalance.upsert({
    where: { organizationId_itemId_warehouseId: key },
    create: { ...key, quantity: valued.quantityAfter, value: valued.valueAfter, sequence, lastMovementDate: date },
    update: { quantity: valued.quantityAfter, value: valued.valueAfter, sequence, lastMovementDate: date },
  });
  return movement;
}
