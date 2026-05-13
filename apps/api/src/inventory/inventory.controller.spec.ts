import { PERMISSIONS } from "@ledgerbyte/shared";
import { REQUIRED_PERMISSIONS_KEY } from "../auth/decorators/require-permissions.decorator";
import { InventoryController } from "./inventory.controller";

describe("InventoryController permissions", () => {
  it("requires inventory view permission for balances", () => {
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, InventoryController.prototype.balances)).toEqual([
      PERMISSIONS.inventory.view,
    ]);
  });
});
