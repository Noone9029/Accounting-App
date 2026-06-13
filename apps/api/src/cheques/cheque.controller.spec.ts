import { PERMISSIONS } from "@ledgerbyte/shared";
import { REQUIRED_PERMISSIONS_KEY } from "../auth/decorators/require-permissions.decorator";
import { ChequeController } from "./cheque.controller";

describe("ChequeController permissions", () => {
  it("requires bank statement view permission for read endpoints", () => {
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, ChequeController.prototype.list)).toEqual([PERMISSIONS.bankStatements.view]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, ChequeController.prototype.get)).toEqual([PERMISSIONS.bankStatements.view]);
  });

  it("requires bank statement manage permission for create/update/open/deposit endpoints", () => {
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, ChequeController.prototype.create)).toEqual([PERMISSIONS.bankStatements.manage]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, ChequeController.prototype.update)).toEqual([PERMISSIONS.bankStatements.manage]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, ChequeController.prototype.markReceived)).toEqual([PERMISSIONS.bankStatements.manage]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, ChequeController.prototype.markIssued)).toEqual([PERMISSIONS.bankStatements.manage]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, ChequeController.prototype.deposit)).toEqual([PERMISSIONS.bankStatements.manage]);
  });

  it("requires reconcile permission for clearing and statement matching endpoints", () => {
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, ChequeController.prototype.clear)).toEqual([PERMISSIONS.bankStatements.reconcile]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, ChequeController.prototype.bounce)).toEqual([PERMISSIONS.bankStatements.reconcile]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, ChequeController.prototype.void)).toEqual([PERMISSIONS.bankStatements.reconcile]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, ChequeController.prototype.matchCandidates)).toEqual([PERMISSIONS.bankStatements.reconcile]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, ChequeController.prototype.match)).toEqual([PERMISSIONS.bankStatements.reconcile]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, ChequeController.prototype.unmatch)).toEqual([PERMISSIONS.bankStatements.reconcile]);
  });
});
