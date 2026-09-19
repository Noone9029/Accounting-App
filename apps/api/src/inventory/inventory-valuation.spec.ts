import { Prisma } from "@prisma/client";
import { allocateInventorySourceCost, valueInventoryMovement } from "./inventory-valuation";
import { inventoryCommandIdentity, readInventoryCommand } from "./inventory-command";

describe("perpetual inventory valuation", () => {
  it("uses remaining quantity and value, not the average of historical receipts", () => {
    const first = valueInventoryMovement({ quantityBefore: 0, valueBefore: 0, quantity: 10, direction: "IN", incomingValue: 100 });
    const issue = valueInventoryMovement({ quantityBefore: first.quantityAfter, valueBefore: first.valueAfter, quantity: 8, direction: "OUT" });
    const second = valueInventoryMovement({ quantityBefore: issue.quantityAfter, valueBefore: issue.valueAfter, quantity: 10, direction: "IN", incomingValue: 200 });
    expect(issue.totalCost).toBe("80.0000");
    expect(second).toMatchObject({ quantityAfter: "12.0000", valueAfter: "220.0000" });
    const next = valueInventoryMovement({ quantityBefore: second.quantityAfter, valueBefore: second.valueAfter, quantity: 3, direction: "OUT" });
    expect(next).toMatchObject({ totalCost: "55.0000", unitCost: "18.3333", quantityAfter: "9.0000", valueAfter: "165.0000" });
  });

  it("restores original issue value on a return after a later price change", () => {
    const returned = valueInventoryMovement({ quantityBefore: 12, valueBefore: 220, quantity: 2, direction: "IN", incomingValue: 20 });
    expect(returned).toMatchObject({ totalCost: "20.0000", quantityAfter: "14.0000", valueAfter: "240.0000" });
  });

  it("fully depletes exact stored value, including fractional-cost residue", () => {
    const partial = valueInventoryMovement({ quantityBefore: 3, valueBefore: 10, quantity: 1, direction: "OUT" });
    const final = valueInventoryMovement({ quantityBefore: partial.quantityAfter, valueBefore: partial.valueAfter, quantity: 2, direction: "OUT" });
    expect(partial.totalCost).toBe("3.3333");
    expect(final).toMatchObject({ totalCost: "6.6667", quantityAfter: "0.0000", valueAfter: "0.0000" });
    expect(valueInventoryMovement({ quantityBefore: 0, valueBefore: 0, quantity: 1, direction: "IN", incomingValue: 25 }).valueAfter).toBe("25.0000");
  });

  it("distinguishes known zero cost from missing cost", () => {
    expect(valueInventoryMovement({ quantityBefore: 0, valueBefore: 0, quantity: 1, direction: "IN", incomingValue: 0 }).totalCost).toBe("0.0000");
    expect(() => valueInventoryMovement({ quantityBefore: 0, valueBefore: 0, quantity: 1, direction: "IN" })).toThrow("reviewed base-currency cost");
  });

  it("rejects overselling, negative values, and corrections leaving value without quantity", () => {
    expect(() => valueInventoryMovement({ quantityBefore: 1, valueBefore: 10, quantity: 2, direction: "OUT" })).toThrow("negative");
    expect(() => valueInventoryMovement({ quantityBefore: 1, valueBefore: 10, quantity: 1, direction: "OUT", reversalValue: 9 })).toThrow("inconsistent");
    expect(() => valueInventoryMovement({ quantityBefore: 0, valueBefore: 0, quantity: 1, direction: "IN", incomingValue: -1 })).toThrow("non-negative");
  });

  it("allocates discounted foreign-currency bill net base value and assigns the final rounding residue once", () => {
    // USD 10.01 less 0.01 discount, converted once at SAR 3.75 = SAR 37.5.
    const baseNet = new Prisma.Decimal("10.01").minus("0.01").mul("3.75");
    let quantity = new Prisma.Decimal(0);
    let value = new Prisma.Decimal(0);
    const costs = [1, 1, 1, 4].map((receiptQuantity) => {
      const allocated = allocateInventorySourceCost({ sourceQuantity: 7, sourceValue: baseNet, previouslyAllocatedQuantity: quantity, previouslyAllocatedValue: value, quantity: receiptQuantity });
      quantity = quantity.plus(receiptQuantity);
      value = value.plus(allocated);
      return allocated;
    });
    expect(costs).toEqual(["5.3571", "5.3572", "5.3571", "21.4286"]);
    expect(value.toFixed(4)).toBe("37.5000");
    expect(() => allocateInventorySourceCost({ sourceQuantity: 7, sourceValue: baseNet, previouslyAllocatedQuantity: quantity, previouslyAllocatedValue: value, quantity: 1 })).toThrow("exceeds");
  });

  it("binds retry keys to canonical input and tenant and rejects conflicting replays", async () => {
    const first = inventoryCommandIdentity("tenant-a", "receipts", "request-0001", { quantity: 1, itemId: "item" });
    const retry = inventoryCommandIdentity("tenant-a", "receipts", "request-0001", { itemId: "item", quantity: 1 });
    expect(retry).toEqual(first);
    expect(first.keyHash).not.toContain("request-0001");
    const tx = { apiIdempotencyRecord: { findUnique: jest.fn().mockResolvedValue({ requestHash: first.requestHash, responseJson: { id: "receipt-1" } }) } };
    await expect(readInventoryCommand(tx as never, retry)).resolves.toBe("receipt-1");
    await expect(readInventoryCommand(tx as never, inventoryCommandIdentity("tenant-a", "receipts", "request-0001", { quantity: 2 }))).rejects.toThrow("different");
    expect(() => inventoryCommandIdentity("tenant-a", "receipts", undefined, {})).toThrow("Idempotency-Key");
  });
});
