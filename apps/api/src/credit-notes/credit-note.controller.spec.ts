import { METHOD_METADATA, PATH_METADATA } from "@nestjs/common/constants";
import { RequestMethod } from "@nestjs/common";
import { PERMISSIONS } from "@ledgerbyte/shared";
import { REQUIRED_PERMISSIONS_KEY } from "../auth/decorators/require-permissions.decorator";
import { CreditNoteController } from "./credit-note.controller";

describe("CreditNoteController email delivery routes", () => {
  it("maps queue and history to tenant-scoped email-delivery endpoints", () => {
    expect(Reflect.getMetadata(PATH_METADATA, CreditNoteController)).toBe("credit-notes");
    expect(Reflect.getMetadata(PATH_METADATA, CreditNoteController.prototype.emailDelivery)).toBe(":id/email-deliveries");
    expect(Reflect.getMetadata(METHOD_METADATA, CreditNoteController.prototype.emailDelivery)).toBe(RequestMethod.POST);
    expect(Reflect.getMetadata(PATH_METADATA, CreditNoteController.prototype.emailDeliveryHistory)).toBe(":id/email-deliveries");
    expect(Reflect.getMetadata(METHOD_METADATA, CreditNoteController.prototype.emailDeliveryHistory)).toBe(RequestMethod.GET);
  });

  it("uses send for queue and view for history", () => {
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, CreditNoteController.prototype.emailDelivery)).toEqual([PERMISSIONS.creditNotes.send]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, CreditNoteController.prototype.emailDeliveryHistory)).toEqual([PERMISSIONS.creditNotes.view]);
  });
});
