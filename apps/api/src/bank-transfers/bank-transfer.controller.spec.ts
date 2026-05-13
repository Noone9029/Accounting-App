import { PERMISSIONS } from "@ledgerbyte/shared";
import { REQUIRED_PERMISSIONS_KEY } from "../auth/decorators/require-permissions.decorator";
import { BankTransferController } from "./bank-transfer.controller";

describe("BankTransferController permissions", () => {
  it("requires transfer view permissions for list/detail", () => {
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, BankTransferController.prototype.list)).toEqual([
      PERMISSIONS.bankTransfers.view,
    ]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, BankTransferController.prototype.get)).toEqual([
      PERMISSIONS.bankTransfers.view,
    ]);
  });

  it("requires transfer create and void permissions for write actions", () => {
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, BankTransferController.prototype.create)).toEqual([
      PERMISSIONS.bankTransfers.create,
    ]);
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, BankTransferController.prototype.void)).toEqual([
      PERMISSIONS.bankTransfers.void,
    ]);
  });
});
