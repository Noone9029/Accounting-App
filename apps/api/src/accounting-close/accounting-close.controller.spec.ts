import { PERMISSIONS } from "@ledgerbyte/shared";
import { REQUIRED_PERMISSIONS_KEY } from "../auth/decorators/require-permissions.decorator";
import { AccountingCloseController } from "./accounting-close.controller";

describe("AccountingCloseController permissions", () => {
  it("reserves returning a reviewed cycle to an authorized reviewer", () => {
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, AccountingCloseController.prototype.returnCycleToPreparer)).toEqual([
      PERMISSIONS.accountingClose.review,
    ]);
  });

  it("forwards the required Idempotency-Key header for terminal close mutations", () => {
    const closeCycle = jest.fn();
    const lockCycle = jest.fn();
    const controller = new AccountingCloseController({ closeCycle, lockCycle } as never);
    const user = { id: "user-1" } as never;

    controller.closeCycle("org-1", user, "cycle-1", "close-cycle-0001", { expectedVersion: 7 });
    controller.lockCycle("org-1", user, "cycle-1", "lock-cycle-0001", { expectedVersion: 8 });

    expect(closeCycle).toHaveBeenCalledWith("org-1", "user-1", "cycle-1", 7, "close-cycle-0001");
    expect(lockCycle).toHaveBeenCalledWith("org-1", "user-1", "cycle-1", 8, "lock-cycle-0001");
  });
});
