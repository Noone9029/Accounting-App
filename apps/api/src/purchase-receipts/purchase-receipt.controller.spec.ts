import { PERMISSIONS } from "@ledgerbyte/shared";
import { REQUIRED_PERMISSIONS_KEY } from "../auth/decorators/require-permissions.decorator";
import { PurchaseReceivingStatusController } from "./purchase-receiving-status.controller";
import { PurchaseReceiptController } from "./purchase-receipt.controller";

describe("PurchaseReceiptController permissions", () => {
  it("requires inventory view permission for accounting preview", () => {
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, PurchaseReceiptController.prototype.accountingPreview)).toEqual([
      PERMISSIONS.inventory.view,
    ]);
  });

  it("requires receipt asset posting permissions for manual posting and reversal", () => {
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, PurchaseReceiptController.prototype.postInventoryAsset)).toEqual([
      PERMISSIONS.inventory.receiptsPostAsset,
    ]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, PurchaseReceiptController.prototype.reverseInventoryAsset)).toEqual([
      PERMISSIONS.inventory.receiptsReverseAsset,
    ]);
  });

  it("uses purchase document view permissions for receipt matching status", () => {
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, PurchaseReceivingStatusController.prototype.purchaseBillReceiptMatchingStatus)).toEqual([
      PERMISSIONS.purchaseBills.view,
    ]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, PurchaseReceivingStatusController.prototype.purchaseOrderReceiptMatchingStatus)).toEqual([
      PERMISSIONS.purchaseOrders.view,
    ]);
  });
});
