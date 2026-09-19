import { BadRequestException } from "@nestjs/common";
import { Prisma } from "@prisma/client";

const decimal = (value: Prisma.Decimal.Value) => new Prisma.Decimal(value);
const rounded = (value: Prisma.Decimal) => value.toDecimalPlaces(4, Prisma.Decimal.ROUND_HALF_UP);

/** The cost of an issue is fixed when goods leave, never recomputed at GL posting time. */
export function valueInventoryMovement(input: {
  quantityBefore: Prisma.Decimal.Value;
  valueBefore: Prisma.Decimal.Value;
  quantity: Prisma.Decimal.Value;
  direction: "IN" | "OUT";
  incomingValue?: Prisma.Decimal.Value | null;
  reversalValue?: Prisma.Decimal.Value | null;
}) {
  const beforeQuantity = decimal(input.quantityBefore);
  const beforeValue = decimal(input.valueBefore);
  const quantity = decimal(input.quantity);
  if (![beforeQuantity, beforeValue, quantity].every((value) => value.isFinite()) || quantity.lte(0) || !quantity.eq(rounded(quantity))) {
    throw new BadRequestException("Inventory quantity must be positive and have at most four decimal places.");
  }
  if (beforeQuantity.lt(0) || beforeValue.lt(0) || (beforeQuantity.eq(0) && !beforeValue.eq(0))) {
    throw new BadRequestException("Inventory opening quantity and value must reconcile before posting.");
  }
  let cost: Prisma.Decimal;
  if (input.direction === "IN") {
    if (input.incomingValue === undefined || input.incomingValue === null) {
      throw new BadRequestException("A reviewed base-currency cost is required for incoming inventory, including zero-cost goods.");
    }
    cost = rounded(decimal(input.incomingValue));
  } else {
    if (quantity.gt(beforeQuantity)) throw new BadRequestException("Inventory movement cannot make stock negative.");
    cost = input.reversalValue !== undefined && input.reversalValue !== null
      ? rounded(decimal(input.reversalValue))
      : quantity.eq(beforeQuantity) ? beforeValue : rounded(beforeValue.mul(quantity).div(beforeQuantity));
  }
  if (!cost.isFinite() || cost.lt(0)) throw new BadRequestException("Inventory cost must be a finite non-negative base-currency amount.");
  const quantityAfter = input.direction === "IN" ? beforeQuantity.plus(quantity) : beforeQuantity.minus(quantity);
  const valueAfter = input.direction === "IN" ? beforeValue.plus(cost) : beforeValue.minus(cost);
  if (valueAfter.lt(0) || (quantityAfter.eq(0) && !valueAfter.eq(0))) {
    throw new BadRequestException("This correction would leave inventory quantity and value inconsistent; accountant reconciliation is required.");
  }
  return {
    quantityAfter: quantityAfter.toFixed(4),
    valueAfter: valueAfter.toFixed(4),
    totalCost: cost.toFixed(4),
    unitCost: rounded(cost.div(quantity)).toFixed(4),
  };
}

/** Allocate net base value cumulatively so the final partial receipt consumes rounding residue. */
export function allocateInventorySourceCost(input: {
  sourceQuantity: Prisma.Decimal.Value;
  sourceValue: Prisma.Decimal.Value;
  previouslyAllocatedQuantity: Prisma.Decimal.Value;
  previouslyAllocatedValue: Prisma.Decimal.Value;
  quantity: Prisma.Decimal.Value;
}) {
  const sourceQuantity = decimal(input.sourceQuantity);
  const sourceValue = decimal(input.sourceValue);
  const quantity = decimal(input.quantity);
  const usedQuantity = decimal(input.previouslyAllocatedQuantity);
  const usedValue = decimal(input.previouslyAllocatedValue);
  if (sourceQuantity.lte(0) || quantity.lte(0) || usedQuantity.lt(0) || sourceValue.lt(0) || usedValue.lt(0) || usedQuantity.plus(quantity).gt(sourceQuantity)) {
    throw new BadRequestException("Inventory allocation exceeds the source quantity or has invalid cost data.");
  }
  const cumulative = usedQuantity.plus(quantity).eq(sourceQuantity)
    ? sourceValue : rounded(sourceValue.mul(usedQuantity.plus(quantity)).div(sourceQuantity));
  const allocated = cumulative.minus(usedValue);
  if (allocated.lt(0)) throw new BadRequestException("Previously allocated inventory cost requires accountant reconciliation.");
  return allocated.toFixed(4);
}
