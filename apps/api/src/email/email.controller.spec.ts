import { PERMISSIONS } from "@ledgerbyte/shared";
import { REQUIRED_PERMISSIONS_KEY } from "../auth/decorators/require-permissions.decorator";
import { EmailController } from "./email.controller";

describe("EmailController permissions", () => {
  it("requires email outbox view permission", () => {
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, EmailController.prototype.listOutbox)).toEqual([PERMISSIONS.emailOutbox.view]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, EmailController.prototype.getOutbox)).toEqual([PERMISSIONS.emailOutbox.view]);
  });
});
