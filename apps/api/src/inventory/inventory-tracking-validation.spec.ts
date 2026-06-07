import { BadRequestException } from "@nestjs/common";
import { InventoryBatchStatus, ItemTrackingMode } from "@prisma/client";
import {
  assertCurrentFlowSupportsTracking,
  validateBatchRequired,
  validateBinRequired,
  validateExpiryRequired,
  validateSerialsRequired,
} from "./inventory-tracking-validation";

describe("inventory tracking validation helpers", () => {
  it("requires batch, serial, bin, and expiry metadata when item settings require them", () => {
    const trackedItem = {
      trackingMode: ItemTrackingMode.SERIAL_AND_BATCH,
      expiryTrackingEnabled: true,
      binTrackingEnabled: true,
    };

    expect(validateBatchRequired(trackedItem, null)).toBe("Batch-tracked items require a batch for this movement.");
    expect(validateSerialsRequired(trackedItem, ["serial-1"], "2.0000")).toBe("Serial-tracked movements require one serial number per unit.");
    expect(validateSerialsRequired(trackedItem, ["serial-1"], "1.5000")).toBe("Serial-tracked quantities must be whole numbers.");
    expect(validateBinRequired(trackedItem, null)).toBe("Bin-tracked items require a bin/location for this movement.");
    expect(validateExpiryRequired(trackedItem, null)).toBe("Expiry-tracked items require a batch with an expiry date.");
    expect(
      validateExpiryRequired(trackedItem, {
        id: "batch-1",
        itemId: "item-1",
        expiryDate: null,
        status: InventoryBatchStatus.ACTIVE,
      }),
    ).toBe("Expiry-tracked items require an expiry date on the selected batch.");
  });

  it("does not block non-advanced tracking settings", () => {
    const item = { trackingMode: ItemTrackingMode.NONE, expiryTrackingEnabled: false, binTrackingEnabled: false };

    expect(validateBatchRequired(item, null)).toBeNull();
    expect(validateSerialsRequired(item, [], "1.0000")).toBeNull();
    expect(validateBinRequired(item, null)).toBeNull();
    expect(validateExpiryRequired(item, null)).toBeNull();
    expect(() => assertCurrentFlowSupportsTracking(item, "Purchase receipts")).not.toThrow();
  });

  it("blocks legacy movement flows for advanced-tracked items", () => {
    expect(() => assertCurrentFlowSupportsTracking({ trackingMode: ItemTrackingMode.SERIAL }, "Warehouse transfers")).toThrow(
      BadRequestException,
    );
    expect(() => assertCurrentFlowSupportsTracking({ trackingMode: ItemTrackingMode.SERIAL }, "Warehouse transfers")).toThrow(
      /does not capture serial, batch, expiry, or bin metadata yet/i,
    );
  });
});
