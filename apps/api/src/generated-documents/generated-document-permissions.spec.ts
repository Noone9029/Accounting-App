import { ForbiddenException } from "@nestjs/common";
import { PERMISSIONS } from "@ledgerbyte/shared";
import { assertGeneratedDocumentDownloadPermission } from "./generated-document-permissions";

describe("generated document output permissions", () => {
  function request(permissions: string[]) {
    return { membership: { role: { permissions } } };
  }

  it("allows generated document download permission", () => {
    expect(() =>
      assertGeneratedDocumentDownloadPermission(request([PERMISSIONS.generatedDocuments.download]) as never),
    ).not.toThrow();
  });

  it("allows admin full access", () => {
    expect(() => assertGeneratedDocumentDownloadPermission(request([PERMISSIONS.admin.fullAccess]) as never)).not.toThrow();
  });

  it("rejects source view permission alone", () => {
    expect(() => assertGeneratedDocumentDownloadPermission(request([PERMISSIONS.purchaseBills.view]) as never)).toThrow(
      ForbiddenException,
    );
  });
});
