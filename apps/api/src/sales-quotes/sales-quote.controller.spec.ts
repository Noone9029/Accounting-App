import { PERMISSIONS } from "@ledgerbyte/shared";
import { ForbiddenException } from "@nestjs/common";
import { REQUIRED_PERMISSIONS_KEY } from "../auth/decorators/require-permissions.decorator";
import { SalesQuoteController } from "./sales-quote.controller";

describe("SalesQuoteController permissions", () => {
  it("uses existing sales invoice permissions for quote/proforma workflow access", () => {
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, SalesQuoteController.prototype.list)).toEqual([PERMISSIONS.salesInvoices.view]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, SalesQuoteController.prototype.nextNumberPreview)).toEqual([PERMISSIONS.salesInvoices.create]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, SalesQuoteController.prototype.create)).toEqual([PERMISSIONS.salesInvoices.create]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, SalesQuoteController.prototype.get)).toEqual([PERMISSIONS.salesInvoices.view]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, SalesQuoteController.prototype.pdfData)).toEqual([PERMISSIONS.salesInvoices.view]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, SalesQuoteController.prototype.pdf)).toEqual([PERMISSIONS.salesInvoices.view]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, SalesQuoteController.prototype.generatePdf)).toEqual([PERMISSIONS.salesInvoices.view]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, SalesQuoteController.prototype.update)).toEqual([PERMISSIONS.salesInvoices.update]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, SalesQuoteController.prototype.markSent)).toEqual([PERMISSIONS.salesInvoices.update]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, SalesQuoteController.prototype.accept)).toEqual([PERMISSIONS.salesInvoices.update]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, SalesQuoteController.prototype.reject)).toEqual([PERMISSIONS.salesInvoices.update]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, SalesQuoteController.prototype.expire)).toEqual([PERMISSIONS.salesInvoices.update]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, SalesQuoteController.prototype.cancel)).toEqual([PERMISSIONS.salesInvoices.update]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, SalesQuoteController.prototype.convertToInvoice)).toEqual([PERMISSIONS.salesInvoices.create]);
  });

  it("requires generated-document download permission before returning quote PDFs", async () => {
    const controller = new SalesQuoteController({ pdf: jest.fn() } as never);
    await expect(
      controller.pdf(
        "org-1",
        { id: "user-1" } as never,
        "quote-1",
        { membership: { role: { permissions: [PERMISSIONS.salesInvoices.view] } } } as never,
        { set: jest.fn() } as never,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
