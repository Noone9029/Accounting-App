import { PERMISSIONS } from "@ledgerbyte/shared";
import { REQUIRED_PERMISSIONS_KEY } from "../auth/decorators/require-permissions.decorator";
import { AttachmentController } from "./attachment.controller";

describe("AttachmentController permissions", () => {
  it("requires attachment permissions for the attachment workflow", () => {
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, AttachmentController.prototype.list)).toEqual([
      PERMISSIONS.attachments.view,
    ]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, AttachmentController.prototype.get)).toEqual([
      PERMISSIONS.attachments.view,
    ]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, AttachmentController.prototype.upload)).toEqual([
      PERMISSIONS.attachments.upload,
    ]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, AttachmentController.prototype.download)).toEqual([
      PERMISSIONS.attachments.download,
    ]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, AttachmentController.prototype.update)).toEqual([
      PERMISSIONS.attachments.manage,
    ]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, AttachmentController.prototype.softDelete)).toEqual([
      PERMISSIONS.attachments.delete,
    ]);
  });
});
