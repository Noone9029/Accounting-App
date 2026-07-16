import { METHOD_METADATA, PATH_METADATA } from "@nestjs/common/constants";
import { RequestMethod } from "@nestjs/common";
import { PERMISSIONS } from "@ledgerbyte/shared";
import { REQUIRED_PERMISSIONS_KEY } from "../auth/decorators/require-permissions.decorator";
import { ContactController } from "./contact.controller";

describe("ContactController customer statement email routes", () => {
  it("maps queue and history to contact email-delivery endpoints", () => {
    expect(Reflect.getMetadata(PATH_METADATA, ContactController)).toBe("contacts");
    expect(Reflect.getMetadata(PATH_METADATA, ContactController.prototype.emailDelivery)).toBe(":id/email-deliveries");
    expect(Reflect.getMetadata(METHOD_METADATA, ContactController.prototype.emailDelivery)).toBe(RequestMethod.POST);
    expect(Reflect.getMetadata(PATH_METADATA, ContactController.prototype.emailDeliveryHistory)).toBe(":id/email-deliveries");
    expect(Reflect.getMetadata(METHOD_METADATA, ContactController.prototype.emailDeliveryHistory)).toBe(RequestMethod.GET);
  });

  it("requires the dedicated statement-send permission for queue and contact view for history", () => {
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, ContactController.prototype.emailDelivery)).toEqual([
      PERMISSIONS.contacts.sendCustomerStatements,
    ]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, ContactController.prototype.emailDeliveryHistory)).toEqual([
      PERMISSIONS.contacts.view,
    ]);
  });
});
