import { PERMISSIONS } from "@ledgerbyte/shared";
import { ForbiddenException } from "@nestjs/common";
import { REQUIRED_PERMISSIONS_KEY } from "../auth/decorators/require-permissions.decorator";
import { DeliveryNoteController } from "./delivery-note.controller";

describe("DeliveryNoteController permissions", () => {
  it("uses existing sales invoice permissions for delivery note workflow access", () => {
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, DeliveryNoteController.prototype.list)).toEqual([PERMISSIONS.salesInvoices.view]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, DeliveryNoteController.prototype.nextNumberPreview)).toEqual([PERMISSIONS.salesInvoices.create]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, DeliveryNoteController.prototype.create)).toEqual([PERMISSIONS.salesInvoices.create]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, DeliveryNoteController.prototype.get)).toEqual([PERMISSIONS.salesInvoices.view]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, DeliveryNoteController.prototype.pdfData)).toEqual([PERMISSIONS.salesInvoices.view]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, DeliveryNoteController.prototype.pdf)).toEqual([PERMISSIONS.salesInvoices.view]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, DeliveryNoteController.prototype.generatePdf)).toEqual([PERMISSIONS.salesInvoices.view]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, DeliveryNoteController.prototype.update)).toEqual([PERMISSIONS.salesInvoices.update]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, DeliveryNoteController.prototype.issue)).toEqual([PERMISSIONS.salesInvoices.update]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, DeliveryNoteController.prototype.markDelivered)).toEqual([PERMISSIONS.salesInvoices.update]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, DeliveryNoteController.prototype.cancel)).toEqual([PERMISSIONS.salesInvoices.update]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, DeliveryNoteController.prototype.void)).toEqual([PERMISSIONS.salesInvoices.update]);
  });

  it("requires generated-document download permission before returning delivery note PDFs", async () => {
    const controller = new DeliveryNoteController({ pdf: jest.fn() } as never);
    await expect(
      controller.pdf(
        "org-1",
        { id: "user-1" } as never,
        "dn-1",
        { membership: { role: { permissions: [PERMISSIONS.salesInvoices.view] } } } as never,
        { set: jest.fn() } as never,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
