import { PERMISSIONS } from "@ledgerbyte/shared";
import { REQUIRED_PERMISSIONS_KEY } from "../auth/decorators/require-permissions.decorator";
import { WarehouseTransferController } from "./warehouse-transfer.controller";

describe("WarehouseTransferController permissions", () => {
  it("requires warehouse transfer view permission for list/detail", () => {
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, WarehouseTransferController.prototype.list)).toEqual([
      PERMISSIONS.warehouseTransfers.view,
    ]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, WarehouseTransferController.prototype.get)).toEqual([
      PERMISSIONS.warehouseTransfers.view,
    ]);
  });

  it("requires warehouse transfer create and void permissions for write actions", () => {
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, WarehouseTransferController.prototype.create)).toEqual([
      PERMISSIONS.warehouseTransfers.create,
    ]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, WarehouseTransferController.prototype.void)).toEqual([
      PERMISSIONS.warehouseTransfers.void,
    ]);
  });
});
