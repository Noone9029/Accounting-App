import { PERMISSIONS } from "@ledgerbyte/shared";
import { REQUIRED_PERMISSIONS_KEY } from "../auth/decorators/require-permissions.decorator";
import { CardSettlementController } from "./card-settlement.controller";

describe("CardSettlementController permissions", () => {
  it("requires statement view permissions for read-only settlement routes", () => {
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, CardSettlementController.prototype.list)).toEqual([
      PERMISSIONS.bankStatements.view,
    ]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, CardSettlementController.prototype.get)).toEqual([
      PERMISSIONS.bankStatements.view,
    ]);
  });

  it("requires statement manage permissions for draft settlement maintenance", () => {
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, CardSettlementController.prototype.create)).toEqual([
      PERMISSIONS.bankStatements.manage,
    ]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, CardSettlementController.prototype.update)).toEqual([
      PERMISSIONS.bankStatements.manage,
    ]);
  });

  it("requires reconcile permissions for post, void, match, and unmatch actions", () => {
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, CardSettlementController.prototype.post)).toEqual([
      PERMISSIONS.bankStatements.reconcile,
    ]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, CardSettlementController.prototype.void)).toEqual([
      PERMISSIONS.bankStatements.reconcile,
    ]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, CardSettlementController.prototype.matchCandidates)).toEqual([
      PERMISSIONS.bankStatements.reconcile,
    ]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, CardSettlementController.prototype.match)).toEqual([
      PERMISSIONS.bankStatements.reconcile,
    ]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, CardSettlementController.prototype.unmatch)).toEqual([
      PERMISSIONS.bankStatements.reconcile,
    ]);
  });
});
