import { PERMISSIONS } from "@ledgerbyte/shared";
import { REQUIRED_PERMISSIONS_KEY } from "../auth/decorators/require-permissions.decorator";
import { ContactController } from "./contact.controller";

describe("ContactController supplier AP dashboard permissions", () => {
  const dashboardPermissions = [
    PERMISSIONS.contacts.view,
    PERMISSIONS.purchaseBills.view,
    PERMISSIONS.purchaseOrders.view,
    PERMISSIONS.purchaseReceiving.view,
    PERMISSIONS.inventory.view,
    PERMISSIONS.supplierPayments.view,
    PERMISSIONS.purchaseDebitNotes.view,
    PERMISSIONS.supplierRefunds.view,
  ];

  it("protects supplier AP dashboard reads with existing AP, supplier, matching, and inventory view permissions", () => {
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, ContactController.prototype.supplierApDashboard)).toEqual(dashboardPermissions);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, ContactController.prototype.supplierApSummary)).toEqual(dashboardPermissions);
  });
});
