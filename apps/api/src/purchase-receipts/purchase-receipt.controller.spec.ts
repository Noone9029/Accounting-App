import { PERMISSIONS } from "@ledgerbyte/shared";
import { REQUIRED_PERMISSIONS_KEY } from "../auth/decorators/require-permissions.decorator";
import { PurchaseReceiptController } from "./purchase-receipt.controller";

describe("PurchaseReceiptController permissions", () => {
  it("requires inventory view permission for accounting preview", () => {
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, PurchaseReceiptController.prototype.accountingPreview)).toEqual([
      PERMISSIONS.inventory.view,
    ]);
  });
});
