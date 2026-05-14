import { PERMISSIONS } from "@ledgerbyte/shared";
import { REQUIRED_PERMISSIONS_KEY } from "../auth/decorators/require-permissions.decorator";
import { SalesStockIssueController } from "./sales-stock-issue.controller";

describe("SalesStockIssueController permissions", () => {
  it("requires inventory view permission for accounting preview", () => {
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, SalesStockIssueController.prototype.accountingPreview)).toEqual([
      PERMISSIONS.inventory.view,
    ]);
  });
});
