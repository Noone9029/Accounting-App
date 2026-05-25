import { PERMISSIONS } from "@ledgerbyte/shared";
import { REQUIRED_PERMISSIONS_KEY } from "../auth/decorators/require-permissions.decorator";
import { SearchController } from "./search.controller";

describe("SearchController permissions", () => {
  it("requires dashboard access for the global search endpoint", () => {
    expect(Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, SearchController.prototype.search)).toEqual([
      PERMISSIONS.dashboard.view,
    ]);
  });
});
