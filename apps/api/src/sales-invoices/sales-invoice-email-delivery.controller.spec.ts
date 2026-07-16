import "reflect-metadata";
import { PERMISSIONS } from "@ledgerbyte/shared";
import { SalesInvoiceController } from "./sales-invoice.controller";
import { REQUIRED_PERMISSIONS_KEY } from "../auth/decorators/require-permissions.decorator";

describe("SalesInvoiceController email delivery permissions", () => {
  it("requires send permission to queue and view permission to read delivery history", () => {
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, SalesInvoiceController.prototype.emailDelivery)).toEqual([
      PERMISSIONS.salesInvoices.send,
    ]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, SalesInvoiceController.prototype.emailDeliveryHistory)).toEqual([
      PERMISSIONS.salesInvoices.view,
    ]);
  });
});
