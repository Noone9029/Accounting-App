import { PERMISSIONS } from "@ledgerbyte/shared";
import { REQUIRED_PERMISSIONS_KEY } from "../auth/decorators/require-permissions.decorator";
import { SalesInventoryReturnController } from "./sales-inventory-return.controller";

describe("SalesInventoryReturnController permissions", () => {
  it("uses existing Sales/AR permissions for document visibility, creation, and lifecycle actions", () => {
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, SalesInventoryReturnController.prototype.list)).toEqual([
      PERMISSIONS.salesInvoices.view,
    ]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, SalesInventoryReturnController.prototype.get)).toEqual([
      PERMISSIONS.salesInvoices.view,
    ]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, SalesInventoryReturnController.prototype.nextNumberPreview)).toEqual([
      PERMISSIONS.salesInvoices.create,
    ]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, SalesInventoryReturnController.prototype.create)).toEqual([
      PERMISSIONS.salesInvoices.create,
    ]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, SalesInventoryReturnController.prototype.update)).toEqual([
      PERMISSIONS.salesInvoices.update,
    ]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, SalesInventoryReturnController.prototype.submit)).toEqual([
      PERMISSIONS.salesInvoices.update,
    ]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, SalesInventoryReturnController.prototype.approve)).toEqual([
      PERMISSIONS.salesInvoices.update,
    ]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, SalesInventoryReturnController.prototype.receive)).toEqual([
      PERMISSIONS.salesInvoices.update,
    ]);
  });

  it("uses inventory permissions for movement preview and posting", () => {
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, SalesInventoryReturnController.prototype.inventoryReturnPreview)).toEqual([
      PERMISSIONS.inventory.view,
    ]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, SalesInventoryReturnController.prototype.postInventoryReturnMovement)).toEqual([
      PERMISSIONS.stockMovements.create,
    ]);
  });
});
