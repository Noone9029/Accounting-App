import {
  attachmentDownloadPath,
  attachmentListPath,
  attachmentTypeLabel,
  canDeleteAttachment,
  canManageAttachmentNotes,
  canUploadAttachment,
  formatAttachmentSize,
} from "./attachments";

describe("attachment helpers", () => {
  it("formats attachment sizes", () => {
    expect(formatAttachmentSize(0)).toBe("0 B");
    expect(formatAttachmentSize(512)).toBe("512 B");
    expect(formatAttachmentSize(2048)).toBe("2 KB");
    expect(formatAttachmentSize(1_572_864)).toBe("1.5 MB");
    expect(formatAttachmentSize(-1)).toBe("-");
  });

  it("labels known attachment MIME types", () => {
    expect(attachmentTypeLabel("application/pdf")).toBe("PDF");
    expect(attachmentTypeLabel("image/jpeg")).toBe("JPEG image");
    expect(attachmentTypeLabel("text/csv")).toBe("CSV");
    expect(attachmentTypeLabel("application/octet-stream")).toBe("application/octet-stream");
  });

  it("builds attachment URLs", () => {
    expect(attachmentDownloadPath("att 1")).toBe("/attachments/att%201/download");
    expect(attachmentListPath("PURCHASE_BILL", "bill-1")).toBe("/attachments?linkedEntityType=PURCHASE_BILL&linkedEntityId=bill-1");
  });

  it("evaluates attachment action visibility", () => {
    expect(canUploadAttachment(true, true)).toBe(true);
    expect(canUploadAttachment(false, true)).toBe(false);
    expect(canUploadAttachment(true, false)).toBe(false);
    expect(canDeleteAttachment({ status: "ACTIVE" }, true, true)).toBe(true);
    expect(canDeleteAttachment({ status: "DELETED" }, true, true)).toBe(false);
    expect(canManageAttachmentNotes(true)).toBe(true);
    expect(canManageAttachmentNotes(false)).toBe(false);
  });
});
