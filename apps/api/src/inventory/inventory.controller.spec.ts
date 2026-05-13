import { PERMISSIONS } from "@ledgerbyte/shared";
import { REQUIRED_PERMISSIONS_KEY } from "../auth/decorators/require-permissions.decorator";
import { InventoryController } from "./inventory.controller";

describe("InventoryController permissions", () => {
  it("requires inventory view permission for settings", () => {
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, InventoryController.prototype.settings)).toEqual([
      PERMISSIONS.inventory.view,
    ]);
  });

  it("requires inventory manage permission for settings updates", () => {
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, InventoryController.prototype.updateSettings)).toEqual([
      PERMISSIONS.inventory.manage,
    ]);
  });

  it("requires inventory view permission for balances", () => {
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, InventoryController.prototype.balances)).toEqual([
      PERMISSIONS.inventory.view,
    ]);
  });

  it("requires inventory view permission for inventory reports", () => {
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, InventoryController.prototype.stockValuationReport)).toEqual([
      PERMISSIONS.inventory.view,
    ]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, InventoryController.prototype.movementSummaryReport)).toEqual([
      PERMISSIONS.inventory.view,
    ]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, InventoryController.prototype.lowStockReport)).toEqual([
      PERMISSIONS.inventory.view,
    ]);
  });
});
