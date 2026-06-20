import { PERMISSIONS } from "@ledgerbyte/shared";
import { REQUIRED_PERMISSIONS_KEY } from "../auth/decorators/require-permissions.decorator";
import { CollectionController } from "./collection.controller";

describe("CollectionController permissions", () => {
  it("uses the existing Sales/AR permission boundary for collection workflow access", () => {
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, CollectionController.prototype.list)).toEqual([PERMISSIONS.salesInvoices.view]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, CollectionController.prototype.summary)).toEqual([PERMISSIONS.salesInvoices.view]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, CollectionController.prototype.reminderCandidates)).toEqual([PERMISSIONS.salesInvoices.view]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, CollectionController.prototype.nextNumberPreview)).toEqual([PERMISSIONS.salesInvoices.create]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, CollectionController.prototype.byCustomer)).toEqual([PERMISSIONS.salesInvoices.view]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, CollectionController.prototype.byInvoice)).toEqual([PERMISSIONS.salesInvoices.view]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, CollectionController.prototype.create)).toEqual([PERMISSIONS.salesInvoices.create]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, CollectionController.prototype.get)).toEqual([PERMISSIONS.salesInvoices.view]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, CollectionController.prototype.update)).toEqual([PERMISSIONS.salesInvoices.update]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, CollectionController.prototype.start)).toEqual([PERMISSIONS.salesInvoices.update]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, CollectionController.prototype.markPromised)).toEqual([PERMISSIONS.salesInvoices.update]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, CollectionController.prototype.markDisputed)).toEqual([PERMISSIONS.salesInvoices.update]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, CollectionController.prototype.hold)).toEqual([PERMISSIONS.salesInvoices.update]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, CollectionController.prototype.close)).toEqual([PERMISSIONS.salesInvoices.update]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, CollectionController.prototype.cancel)).toEqual([PERMISSIONS.salesInvoices.update]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, CollectionController.prototype.addActivity)).toEqual([PERMISSIONS.salesInvoices.update]);
  });
});
