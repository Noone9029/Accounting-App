import { PERMISSIONS } from "@ledgerbyte/shared";
import { REQUIRED_PERMISSIONS_KEY } from "../auth/decorators/require-permissions.decorator";
import { PurchaseBillController } from "./purchase-bill.controller";

describe("PurchaseBillController permissions", () => {
  it("requires purchase bill view permission for accounting preview", () => {
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, PurchaseBillController.prototype.accountingPreview)).toEqual([
      PERMISSIONS.purchaseBills.view,
    ]);
  });
});
