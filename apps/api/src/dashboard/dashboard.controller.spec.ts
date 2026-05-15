import { PERMISSIONS } from "@ledgerbyte/shared";
import { REQUIRED_PERMISSIONS_KEY } from "../auth/decorators/require-permissions.decorator";
import { DashboardController } from "./dashboard.controller";

describe("DashboardController permissions", () => {
  it("requires dashboard view permission for the summary endpoint", () => {
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, DashboardController.prototype.summary)).toEqual([
      PERMISSIONS.dashboard.view,
    ]);
  });
});
