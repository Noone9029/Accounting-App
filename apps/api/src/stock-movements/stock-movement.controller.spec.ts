import { PERMISSIONS } from "@ledgerbyte/shared";
import { REQUIRED_PERMISSIONS_KEY } from "../auth/decorators/require-permissions.decorator";
import { StockMovementController } from "./stock-movement.controller";

describe("StockMovementController permissions", () => {
  it("requires stock movement view permissions for list/detail", () => {
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, StockMovementController.prototype.list)).toEqual([
      PERMISSIONS.stockMovements.view,
    ]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, StockMovementController.prototype.get)).toEqual([
      PERMISSIONS.stockMovements.view,
    ]);
  });

  it("requires stock movement create permission for manual movements", () => {
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, StockMovementController.prototype.create)).toEqual([
      PERMISSIONS.stockMovements.create,
    ]);
  });
});
