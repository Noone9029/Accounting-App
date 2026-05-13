import { PERMISSIONS } from "@ledgerbyte/shared";
import { REQUIRED_PERMISSIONS_KEY } from "../auth/decorators/require-permissions.decorator";
import { WarehouseController } from "./warehouse.controller";

describe("WarehouseController permissions", () => {
  it("requires warehouse view permissions for list/detail", () => {
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, WarehouseController.prototype.list)).toEqual([PERMISSIONS.warehouses.view]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, WarehouseController.prototype.get)).toEqual([PERMISSIONS.warehouses.view]);
  });

  it("requires warehouse manage permissions for changes", () => {
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, WarehouseController.prototype.create)).toEqual([PERMISSIONS.warehouses.manage]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, WarehouseController.prototype.update)).toEqual([PERMISSIONS.warehouses.manage]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, WarehouseController.prototype.archive)).toEqual([PERMISSIONS.warehouses.manage]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, WarehouseController.prototype.reactivate)).toEqual([PERMISSIONS.warehouses.manage]);
  });
});
