import { PERMISSIONS } from "@ledgerbyte/shared";
import { REQUIRED_PERMISSIONS_KEY } from "../auth/decorators/require-permissions.decorator";
import { PurchaseReturnController } from "./purchase-return.controller";

describe("PurchaseReturnController permissions", () => {
  const viewPermissions = [PERMISSIONS.purchaseBills.view, PERMISSIONS.purchaseOrders.view, PERMISSIONS.purchaseReceiving.view];
  const managePermissions = [PERMISSIONS.purchaseBills.create, PERMISSIONS.purchaseBills.update, PERMISSIONS.purchaseReceiving.create];

  it("allows purchase returns visibility for purchase, bill, or receiving view permissions", () => {
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, PurchaseReturnController.prototype.list)).toEqual(viewPermissions);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, PurchaseReturnController.prototype.get)).toEqual(viewPermissions);
  });

  it("uses inventory permissions for inventory return movement preview and posting", () => {
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, PurchaseReturnController.prototype.inventoryReturnPreview)).toEqual([PERMISSIONS.inventory.view]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, PurchaseReturnController.prototype.postInventoryReturnMovement)).toEqual([
      PERMISSIONS.stockMovements.create,
    ]);
  });

  it("requires existing purchase management permissions for create and lifecycle actions", () => {
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, PurchaseReturnController.prototype.nextNumber)).toEqual(managePermissions);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, PurchaseReturnController.prototype.create)).toEqual(managePermissions);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, PurchaseReturnController.prototype.update)).toEqual(managePermissions);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, PurchaseReturnController.prototype.submit)).toEqual(managePermissions);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, PurchaseReturnController.prototype.approve)).toEqual(managePermissions);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, PurchaseReturnController.prototype.complete)).toEqual(managePermissions);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, PurchaseReturnController.prototype.cancel)).toEqual(managePermissions);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, PurchaseReturnController.prototype.void)).toEqual(managePermissions);
  });
});
