import { PERMISSIONS } from "@ledgerbyte/shared";
import { REQUIRED_PERMISSIONS_KEY } from "../auth/decorators/require-permissions.decorator";
import { InventoryAdjustmentController } from "./inventory-adjustment.controller";

describe("InventoryAdjustmentController permissions", () => {
  it("requires adjustment view permission for list/detail", () => {
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, InventoryAdjustmentController.prototype.list)).toEqual([
      PERMISSIONS.inventoryAdjustments.view,
    ]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, InventoryAdjustmentController.prototype.get)).toEqual([
      PERMISSIONS.inventoryAdjustments.view,
    ]);
  });

  it("requires adjustment create/approve/void permissions for lifecycle actions", () => {
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, InventoryAdjustmentController.prototype.create)).toEqual([
      PERMISSIONS.inventoryAdjustments.create,
    ]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, InventoryAdjustmentController.prototype.update)).toEqual([
      PERMISSIONS.inventoryAdjustments.create,
    ]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, InventoryAdjustmentController.prototype.remove)).toEqual([
      PERMISSIONS.inventoryAdjustments.create,
    ]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, InventoryAdjustmentController.prototype.approve)).toEqual([
      PERMISSIONS.inventoryAdjustments.approve,
    ]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, InventoryAdjustmentController.prototype.void)).toEqual([
      PERMISSIONS.inventoryAdjustments.void,
    ]);
  });
});
