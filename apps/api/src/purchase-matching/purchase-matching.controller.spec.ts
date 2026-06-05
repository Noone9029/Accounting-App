import { PERMISSIONS } from "@ledgerbyte/shared";
import { REQUIRED_PERMISSIONS_KEY } from "../auth/decorators/require-permissions.decorator";
import { PurchaseMatchingController } from "./purchase-matching.controller";

describe("PurchaseMatchingController permissions", () => {
  it("allows purchase matching visibility for any matching source view permission", () => {
    const viewPermissions = [PERMISSIONS.purchaseOrders.view, PERMISSIONS.purchaseBills.view, PERMISSIONS.purchaseReceiving.view];
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, PurchaseMatchingController.prototype.purchaseMatchingExceptions)).toEqual(viewPermissions);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, PurchaseMatchingController.prototype.listReviews)).toEqual(viewPermissions);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, PurchaseMatchingController.prototype.getReview)).toEqual(viewPermissions);
  });

  it("requires purchase or receiving management permissions for review actions", () => {
    const managePermissions = [PERMISSIONS.purchaseOrders.update, PERMISSIONS.purchaseBills.update, PERMISSIONS.purchaseReceiving.create];
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, PurchaseMatchingController.prototype.createReview)).toEqual(managePermissions);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, PurchaseMatchingController.prototype.updateReview)).toEqual(managePermissions);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, PurchaseMatchingController.prototype.startReview)).toEqual(managePermissions);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, PurchaseMatchingController.prototype.markWaitingForSupplier)).toEqual(managePermissions);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, PurchaseMatchingController.prototype.markTimingDifference)).toEqual(managePermissions);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, PurchaseMatchingController.prototype.markNeedsVarianceReview)).toEqual(managePermissions);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, PurchaseMatchingController.prototype.markNeedsReturnReview)).toEqual(managePermissions);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, PurchaseMatchingController.prototype.resolveReview)).toEqual(managePermissions);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, PurchaseMatchingController.prototype.cancelReview)).toEqual(managePermissions);
  });
});
