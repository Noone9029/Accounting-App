import { PERMISSIONS } from "@ledgerbyte/shared";
import { REQUIRED_PERMISSIONS_KEY } from "../auth/decorators/require-permissions.decorator";
import { RecurringInvoiceController } from "./recurring-invoice.controller";

describe("RecurringInvoiceController permissions", () => {
  it("guards recurring invoice template routes with existing sales invoice permissions", () => {
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, RecurringInvoiceController.prototype.list)).toEqual([PERMISSIONS.salesInvoices.view]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, RecurringInvoiceController.prototype.nextNumberPreview)).toEqual([PERMISSIONS.salesInvoices.create]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, RecurringInvoiceController.prototype.create)).toEqual([PERMISSIONS.salesInvoices.create]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, RecurringInvoiceController.prototype.get)).toEqual([PERMISSIONS.salesInvoices.view]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, RecurringInvoiceController.prototype.preview)).toEqual([PERMISSIONS.salesInvoices.view]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, RecurringInvoiceController.prototype.update)).toEqual([PERMISSIONS.salesInvoices.update]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, RecurringInvoiceController.prototype.activate)).toEqual([PERMISSIONS.salesInvoices.update]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, RecurringInvoiceController.prototype.pause)).toEqual([PERMISSIONS.salesInvoices.update]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, RecurringInvoiceController.prototype.resume)).toEqual([PERMISSIONS.salesInvoices.update]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, RecurringInvoiceController.prototype.end)).toEqual([PERMISSIONS.salesInvoices.update]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, RecurringInvoiceController.prototype.cancel)).toEqual([PERMISSIONS.salesInvoices.update]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, RecurringInvoiceController.prototype.generateNow)).toEqual([PERMISSIONS.salesInvoices.create]);
  });
});
